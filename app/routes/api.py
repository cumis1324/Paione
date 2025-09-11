# app/routes/api.py
import csv
import io
import os
import requests
import uuid
import decimal
from datetime import datetime, date, timedelta
from flask import Blueprint, jsonify, request, session
from functools import wraps
from app import mysql
from app.utils import calculate_ean13_checksum
from .auth import login_required
import openpyxl
import json
import crcmod

api_bp = Blueprint('api', __name__)

# --- Decorator untuk Izin Akses ---
def permission_required(permission):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            permissions = session.get('permissions', [])
            if permission not in permissions:
                return jsonify({"status": "error", "message": "Akses ditolak. Anda tidak memiliki izin."}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator

permission_map = {
    'items': {'R': 'RI', 'W': 'WI', 'D': 'DI'}, 
    'penjualan': {'R': 'RTk'},
    'materials': {'R': 'RM', 'W': 'WM', 'D': 'DM'}, 
    'sizes': {'R': 'RSz', 'W': 'WSz', 'D': 'DSz'},
    'brands': {'R': 'RB', 'W': 'WB', 'D': 'DB'}, 
    'models': {'R': 'RM', 'W': 'WM', 'D': 'DM'},
    # --- PERUBAHAN DI SINI ---
    'penerimaan': {'R': 'RTk'},
    'piutang': {'R': 'RTk'},
    'analytics': {'R': 'RA'},
    'multipayroll': {'R': 'RA'},
    'payroll-checksum': {'R': 'RA'},
    'packinglist-barcode': {'R': 'RPL', 'W': 'WPL'},
    'packinglist-riwayat': {'R': 'RPL'}
}

# --- Rute-rute API ---

@api_bp.route('/user/permissions')
@login_required
def get_user_permissions():
    return jsonify({"status": "success", "permissions": session.get('permissions', [])})

@api_bp.route('/data/<data_type>', methods=['GET'])
@login_required
def get_data(data_type):
    perm_code = permission_map.get(data_type, {}).get('R')
    if not perm_code or perm_code not in session.get('permissions', []):
        return jsonify({"status": "error", "message": "Akses ditolak."}), 403
    
    search_query = request.args.get('search', '')
    sort_by = request.args.get('sort_by', 'CreatedDate')
    sort_order = request.args.get('sort_order', 'DESC')
    is_super_admin = 'SA' in session.get('permissions', [])

    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 50))
    offset = (page - 1) * limit

    if sort_order.upper() not in ['ASC', 'DESC']:
        sort_order = 'DESC'

    try:
        cur = mysql.connection.cursor()
        params = []
        
        base_query = ""
        count_query = ""
        
        if data_type == 'penjualan':
            valid_sort_columns = ['Nomor', 'Cabang', 'Tanggal', 'Salesman', 'Nama', 'Daerah', 'Telepon', 'TotalPenjualanLusin', 'TotalHargaPenjualan', 'Pembayaran', 'TanggalBayar', 'JatuhTempo']
            if sort_by not in valid_sort_columns:
                sort_by = 'a.CreatedDate'
            
            base_query = """
                FROM activities a
                LEFT JOIN branches b ON a.BranchId = b.Id
                LEFT JOIN salesmans s ON a.SalesmanId = s.Id
            """
            select_fields = """
                SELECT
                    a.Id,
                    DATE_FORMAT(a.Date, '%%y%%m%%d%%H%%i%%s') as Nomor, b.Name as Cabang, DATE_FORMAT(a.CreatedDate, '%%d-%%m-%%Y') as Tanggal,
                    s.Name as Salesman, a.Name as Nama, a.Address as Daerah, a.Phone as Telepon, a.Total as TotalPenjualanLusin,
                    a.TotalPrice as TotalHargaPenjualan, a.PaymentType as Pembayaran, DATE_FORMAT(a.PaymentDate, '%%d-%%m-%%Y') as TanggalBayar,
                    DATE_FORMAT(a.DueDate, '%%d-%%m-%%Y') as JatuhTempo, a.PaymentNote as KeteranganPembayaran,
                    CASE WHEN a.IsBypass = 1 THEN 'Ya' ELSE 'Tidak' END as Bypass,
                    CASE WHEN a.IsBypassVerified = 1 THEN 'Ya' ELSE 'Tidak' END as BypassDiterima
            """
            
            where_clauses = ["a.Type = 'SalesOrder'"]
            
            if search_query:
                where_clauses.append("(s.Name LIKE %s OR a.Name LIKE %s OR a.Phone LIKE %s)")
                search_term = f"%{search_query}%"
                params.extend([search_term, search_term, search_term])
            
            start_date = request.args.get('start_date')
            end_date = request.args.get('end_date')

            if start_date and end_date:
                where_clauses.append("a.CreatedDate BETWEEN %s AND %s")
                params.extend([start_date, end_date + ' 23:59:59'])
            
            if where_clauses:
                where_clause_str = " WHERE " + " AND ".join(where_clauses)
                base_query += where_clause_str
            
            count_query = "SELECT COUNT(*) as total " + base_query
            query = select_fields + base_query + f" ORDER BY {sort_by} {sort_order} LIMIT %s OFFSET %s"

        elif data_type == 'penerimaan':
            valid_sort_columns = ['Nomor', 'Cabang', 'Dari', 'Tanggal', 'Scan', 'Keterangan', 'TotalPenjualanLusin', 'TotalHargaPenjualan']
            sort_by = request.args.get('sort_by', 'a.CreatedDate')
            if sort_by not in valid_sort_columns:
                sort_by = 'a.CreatedDate'

            base_query = """
                FROM activities a
                LEFT JOIN branches b ON a.BranchId = b.Id
                LEFT JOIN branches ref_b ON a.ReferenceBranchId = ref_b.Id
            """
            select_fields = """
                SELECT
                    DATE_FORMAT(a.Date, '%%y%%m%%d%%H%%i%%s') as Nomor,
                    b.Name as Cabang,
                    ref_b.Name as Dari,
                    DATE_FORMAT(a.CreatedDate, '%%d-%%m-%%Y') as Tanggal,
                    DATE_FORMAT(a.ScanDate, '%%d-%%m-%%Y %%H:%%i:%%s') as Scan,
                    a.Note as Keterangan,
                    a.Total as TotalPenjualanLusin,
                    a.TotalPrice as TotalHargaPenjualan
            """
            
            where_clauses = ["a.Type = 'Delivery'"]
            
            if search_query:
                where_clauses.append("(b.Name LIKE %s OR ref_b.Name LIKE %s OR a.Note LIKE %s)")
                search_term = f"%{search_query}%"
                params.extend([search_term, search_term, search_term])
            
            start_date = request.args.get('start_date')
            end_date = request.args.get('end_date')

            if start_date and end_date:
                where_clauses.append("a.CreatedDate BETWEEN %s AND %s")
                params.extend([start_date, end_date + ' 23:59:59'])

            if where_clauses:
                base_query += " WHERE " + " AND ".join(where_clauses)
            
            count_query = "SELECT COUNT(*) as total " + base_query
            query = select_fields + base_query + f" ORDER BY {sort_by} {sort_order} LIMIT %s OFFSET %s"
        
        elif data_type == 'packinglist-barcode':
            base_url = os.getenv('SQL_SERVER_API_BASE_URL')
            if not base_url:
                return jsonify({"status": "error", "message": "URL API Packing List tidak dikonfigurasi."}), 500
            
            try:
                # Ambil semua data dari endpoint eksternal
                response = requests.get(f"{base_url}/packinglist", timeout=10)
                response.raise_for_status()
                all_data = response.json()
                
                # Implementasi search sederhana di sisi server Flask
                if search_query:
                    search_term = search_query.lower()
                    filtered_data = [
                        item for item in all_data 
                        if search_term in str(item.get('Barcode', '')).lower() or
                           search_term in str(item.get('Item', '')).lower() or
                           search_term in str(item.get('Size', '')).lower()
                    ]
                else:
                    filtered_data = all_data

                # Implementasi pagination sederhana
                total_records = len(filtered_data)
                paginated_data = filtered_data[offset : offset + limit]

                return jsonify({"status": "success", "data": paginated_data, "total_records": total_records})

            except requests.exceptions.RequestException as e:
                return jsonify({"status": "error", "message": f"Gagal mengambil data dari server Packing List: {e}"}), 503
        # --- AKHIR TAMBAHAN ---
        elif data_type == 'packinglist-riwayat':
            base_url = os.getenv('SQL_SERVER_API_BASE_URL')
            if not base_url:
                return jsonify({"status": "error", "message": "URL API Packing List tidak dikonfigurasi."}), 500
            
            try:
                # Panggil endpoint history di server eksternal
                response = requests.get(f"{base_url}/packinglist/history", timeout=10)
                response.raise_for_status()
                all_data = response.json()
                
                # Implementasi search sederhana
                if search_query:
                    search_term = search_query.lower()
                    filtered_data = [
                        item for item in all_data 
                        if search_term in str(item.get('WONo', '')).lower() or
                           search_term in str(item.get('DONo', '')).lower() or
                           search_term in str(item.get('CustomerName', '')).lower()
                    ]
                else:
                    filtered_data = all_data

                # Implementasi pagination
                total_records = len(filtered_data)
                paginated_data = filtered_data[offset : offset + limit]

                return jsonify({"status": "success", "data": paginated_data, "total_records": total_records})

            except requests.exceptions.RequestException as e:
                return jsonify({"status": "error", "message": f"Gagal mengambil data dari server Packing List: {e}"}), 503
        # --- AKHIR TAMBAHAN ---

        elif data_type == 'items':
            valid_sort_columns = ['Barcode', 'Name', 'BahanName', 'SizeName', 'BrandName', 'ModelName', 'Price', 'Serial', 'CreatedDate']
            if sort_by not in valid_sort_columns:
                sort_by = 'CreatedDate'
            
            column_mapping = {
                'BahanName': 'm.Name', 'SizeName': 's.Name', 'BrandName': 'b.Name', 'ModelName': 'mo.Name', 'Barcode': 'i.Barcode',
                'Name': 'i.Name', 'Price': 'i.Price', 'Serial': 'i.Serial', 'CreatedDate': 'i.CreatedDate'
            }
            db_sort_column = column_mapping.get(sort_by, 'i.CreatedDate')

            base_query = "FROM items i LEFT JOIN materials m ON i.MaterialId = m.Id LEFT JOIN sizes s ON i.SizeId = s.Id LEFT JOIN brands b ON i.BrandId = b.Id LEFT JOIN models mo ON i.ModelId = mo.Id"
            select_fields = "SELECT i.Id, i.Barcode, i.Name, i.Serial, m.Name as BahanName, s.Name as SizeName, b.Name as BrandName, mo.Name as ModelName, i.Price, i.IsActive, i.CreatedDate "
            
            where_clauses = []
            if search_query:
                where_clauses.append("(i.Name LIKE %s OR i.Barcode LIKE %s)")
                params.extend([f"%{search_query}%", f"%{search_query}%"])
            if not is_super_admin:
                where_clauses.append("i.IsActive = 1")
            
            if where_clauses:
                where_clause_str = " WHERE " + " AND ".join(where_clauses)
                base_query += where_clause_str
            
            count_query = "SELECT COUNT(*) as total " + base_query
            query = select_fields + base_query + f" ORDER BY {db_sort_column} {sort_order} LIMIT %s OFFSET %s"
        else:
            valid_sort_columns = ['Name', 'IsActive']
            if sort_by not in valid_sort_columns:
                sort_by = 'Name'
            base_query = f"FROM {data_type}"
            select_fields = f"SELECT Id, Name, IsActive "
            
            where_clauses = []
            if search_query:
                where_clauses.append("Name LIKE %s")
                params.append(f"%{search_query}%")
            if not is_super_admin:
                where_clauses.append("IsActive = 1")

            if where_clauses:
                where_clause_str = " WHERE " + " AND ".join(where_clauses)
                base_query += where_clause_str
                
            count_query = "SELECT COUNT(*) as total " + base_query
            query = select_fields + base_query + f" ORDER BY {sort_by} {sort_order} LIMIT %s OFFSET %s"

        cur.execute(count_query, tuple(params))
        total_records = cur.fetchone()['total']
        
        params.extend([limit, offset])
        cur.execute(query, tuple(params))
        results = cur.fetchall()
        cur.close()
        
        for row in results:
            for key, value in row.items():
                if isinstance(value, bytes):
                    row[key] = 1 if value == b'\x01' else 0
                elif isinstance(value, decimal.Decimal):
                    row[key] = str(value)
                elif isinstance(value, datetime):
                    row[key] = value.strftime('%Y-%m-%d %H:%M:%S')

        return jsonify({"status": "success", "data": results, "total_records": total_records})

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@api_bp.route('/penjualan/header/<activity_id>')
@login_required
@permission_required('RP')
def get_penjualan_header(activity_id):
    try:
        cur = mysql.connection.cursor()
        query = """
            SELECT
                DATE_FORMAT(a.Date, '%%y%%m%%d%%H%%i%%s') as Nomor,
                a.Name,
                b.Name as Cabang
            FROM activities a
            LEFT JOIN branches b ON a.BranchId = b.Id
            WHERE a.Id = %s
        """
        cur.execute(query, [activity_id])
        header_data = cur.fetchone()
        cur.close()
        return jsonify({"status": "success", "data": header_data})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@api_bp.route('/penjualan/detail/<activity_id>')
@login_required
@permission_required('RP')
def get_penjualan_detail(activity_id):
    try:
        cur = mysql.connection.cursor()
        query = """
            SELECT
                i.Name AS 'NamaBarang',
                ad.Qty,
                ad.Price,
                ad.Discount,
                ad.Subtotal,
                ad.Note,
                ad.Serial,
                u.UserName as CreatedBy
            FROM activitydetails ad
            LEFT JOIN items i ON ad.ItemId = i.Id
            LEFT JOIN users u ON ad.CreatedById = u.Id
            WHERE ad.ActivityId = %s
            ORDER BY ad.No ASC
        """
        cur.execute(query, [activity_id])
        details = cur.fetchall()
        cur.close()
        
        for row in details:
            for key, value in row.items():
                if isinstance(value, decimal.Decimal):
                    row[key] = str(value)

        return jsonify({"status": "success", "data": details})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
        
@api_bp.route('/data/<data_type>/<item_id>/toggle-active', methods=['PUT'])
@login_required
@permission_required('SA')
def toggle_active_status(data_type, item_id):
    table_map = {'items': 'items', 'materials': 'materials', 'sizes': 'sizes', 'brands': 'brands', 'models': 'models'}
    table_name = table_map.get(data_type)
    if not table_name:
        return jsonify({"status": "error", "message": "Tipe data tidak valid"}), 400
    try:
        cur = mysql.connection.cursor()
        cur.execute(f"UPDATE {table_name} SET IsActive = CASE WHEN IsActive = 1 THEN 0 ELSE 1 END WHERE Id = %s", [item_id])
        mysql.connection.commit()
        cur.close()
        return jsonify({"status": "success", "message": "Status berhasil diubah."})
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

@api_bp.route('/data/items/<item_id>', methods=['GET'])
@login_required
@permission_required('RI')
def get_item_details(item_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("SELECT Name, Price, Serial, MaterialId, SizeId, BrandId, ModelId FROM items WHERE Id = %s", [item_id])
        item = cur.fetchone()
        cur.close()
        if not item: return jsonify({"status": "error", "message": "Item tidak ditemukan"}), 404
        
        for key, value in item.items():
            if isinstance(value, bytes):
                item[key] = value.decode('utf-8')
            elif isinstance(value, decimal.Decimal):
                item[key] = str(value)

        return jsonify({"status": "success", "data": item})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@api_bp.route('/data/items/<item_id>', methods=['PUT'])
@login_required
@permission_required('WI')
def update_item(item_id):
    data = request.get_json()
    client_info = data.get('clientInfo', 'Unknown Client')
    name = data.get('Name')
    price = data.get('Price')
    serial = data.get('Serial')
    material_id = data.get('MaterialId')
    size_id = data.get('SizeId')
    brand_id = data.get('BrandId')
    model_id = data.get('ModelId')

    if not all([name, price is not None, material_id, size_id, brand_id, model_id]):
        return jsonify({"status": "error", "message": "Semua field harus diisi"}), 400
    try:
        now, user_id = datetime.now(), session['user_id']
        current_time = now.strftime('%Y-%m-%d %H:%M:%S')
        cur = mysql.connection.cursor()
        cur.execute("UPDATE items SET Name = %s, Price = %s, Serial = %s, MaterialId = %s, SizeId = %s, BrandId = %s, ModelId = %s, ModifiedById = %s, ModifiedDate = %s, ModifiedAt = %s WHERE Id = %s", 
                    (name, price, serial, material_id, size_id, brand_id, model_id, user_id, current_time, client_info, item_id))
        mysql.connection.commit()
        cur.close()
        return jsonify({"status": "success", "message": "Barang berhasil diperbarui."})
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

@api_bp.route('/data/<data_type>/<item_id>', methods=['DELETE'])
@login_required
def delete_data(data_type, item_id):
    perm_code = permission_map.get(data_type, {}).get('D')
    if not perm_code or perm_code not in session.get('permissions', []):
        return jsonify({"status": "error", "message": "Akses ditolak."}), 403
    table_name = data_type
    try:
        cur = mysql.connection.cursor()
        cur.execute(f"DELETE FROM {table_name} WHERE Id = %s", [item_id])
        mysql.connection.commit()
        cur.close()
        return jsonify({"status": "success", "message": "Data berhasil dihapus."})
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

@api_bp.route('/data/lookup/<data_type>/<item_id>', methods=['PUT'])
@login_required
def update_lookup_data(data_type, item_id):
    perm_code = permission_map.get(data_type, {}).get('W')
    if not perm_code or perm_code not in session.get('permissions', []):
        return jsonify({"status": "error", "message": "Akses ditolak."}), 403
    table_name = data_type
    data = request.get_json()
    new_name = data.get('Name')
    client_info = data.get('clientInfo', 'Unknown Client')
    if not new_name: return jsonify({"status": "error", "message": "Nama tidak boleh kosong"}), 400
    try:
        now, user_id = datetime.now(), session['user_id']
        current_time = now.strftime('%Y-%m-%d %H:%M:%S')
        cur = mysql.connection.cursor()
        cur.execute(f"UPDATE {table_name} SET Name = %s, ModifiedById = %s, ModifiedDate = %s, ModifiedAt = %s WHERE Id = %s", (new_name, user_id, current_time, client_info, item_id))
        mysql.connection.commit()
        cur.close()
        return jsonify({"status": "success", "message": "Data berhasil diperbarui."})
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

@api_bp.route('/form-data', methods=['GET'])
@login_required
def get_form_data():
    is_super_admin = 'SA' in session.get('permissions', [])
    try:
        cur = mysql.connection.cursor()
        
        where_clause = "" if is_super_admin else " WHERE IsActive = 1"

        cur.execute(f"SELECT Id, Name FROM sizes{where_clause} ORDER BY Name")
        sizes = cur.fetchall()
        cur.execute(f"SELECT Id, Name FROM brands{where_clause} ORDER BY Name")
        brands = cur.fetchall()
        cur.execute(f"SELECT Id, Name FROM models{where_clause} ORDER BY Name")
        models = cur.fetchall()
        cur.execute(f"SELECT Id, Name FROM materials{where_clause} ORDER BY Name")
        materials = cur.fetchall()
        cur.close()
        
        for item_list in [sizes, brands, models, materials]:
            for item in item_list:
                if isinstance(item.get('Id'), bytes):
                    item['Id'] = item['Id'].decode('utf-8')

        return jsonify({"status": "success", "data": {"sizes": sizes, "brands": brands, "models": models, "materials": materials}})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# @api_bp.route('/add-item', methods=['POST'])
# @login_required
# @permission_required('WNB') 
# def add_item():
#     data = request.get_json()
#     client_info = data.get('clientInfo', 'Unknown Client')
#     now = datetime.now()
#     base_10_digits = now.strftime('%y%m%d%H%S')
#     milli_2_digits = str(now.microsecond // 10000).zfill(2)
#     base_12_digits = base_10_digits + milli_2_digits
#     check_digit = calculate_ean13_checksum(base_12_digits)
#     barcode = base_12_digits + check_digit
#     item_id, user_id = str(uuid.uuid4()), session['user_id']
#     current_time = now.strftime('%Y-%m-%d %H:%M:%S')
#     new_item = { 'Id': item_id, 'Barcode': barcode, 'Name': data.get('name'), 'MaterialId': data.get('materialId'), 'SizeId': data.get('sizeId'), 'IsActive': 1, 'CreatedById': user_id, 'CreatedDate': current_time, 'ModifiedById': user_id, 'ModifiedDate': current_time, 'BrandId': data.get('brandId'), 'ModelId': data.get('modelId'), 'Price': data.get('price', 0.00), 'MinimumStock': 5, 'CreatedAt': client_info, 'ModifiedAt': client_info, 'Serial': data.get('serial') }
#     query = "INSERT INTO items (Id, Barcode, Name, MaterialId, SizeId, IsActive, CreatedById, CreatedDate, ModifiedById, ModifiedDate, BrandId, ModelId, Price, MinimumStock, CreatedAt, ModifiedAt, Serial) VALUES (%(Id)s, %(Barcode)s, %(Name)s, %(MaterialId)s, %(SizeId)s, %(IsActive)s, %(CreatedById)s, %(CreatedDate)s, %(ModifiedById)s, %(ModifiedDate)s, %(BrandId)s, %(ModelId)s, %(Price)s, %(MinimumStock)s, %(CreatedAt)s, %(ModifiedAt)s, %(Serial)s)"
#     try:
#         cur = mysql.connection.cursor()
#         cur.execute(query, new_item)
#         mysql.connection.commit()
#         cur.close()
#         return jsonify({"status": "success", "message": f"Item '{data.get('name')}' berhasil ditambahkan."}), 201
#     except Exception as e:
#         mysql.connection.rollback()
#         return jsonify({"status": "error", "message": str(e)}), 500

@api_bp.route('/add-item', methods=['POST'])
@login_required
@permission_required('WNB') 
def add_item():
    data = request.get_json()
    client_info = data.get('clientInfo', 'Unknown Client')
    
    # --- 1. Dapatkan URL endpoint dari environment variables ---
    sql_server_endpoint = os.getenv('SQL_SERVER_API_BASE_URL')
    endpoint = f"{sql_server_endpoint}/packinglist/batch-insert"
    if not sql_server_endpoint:
        return jsonify({"status": "error", "message": "Endpoint SQL Server tidak dikonfigurasi."}), 500

    # --- 2. Generate data item baru (barcode, id, dll) ---
    now = datetime.now()
    base_10_digits = now.strftime('%y%m%d%H%S')
    milli_2_digits = str(now.microsecond // 10000).zfill(2)
    base_12_digits = base_10_digits + milli_2_digits
    check_digit = calculate_ean13_checksum(base_12_digits)
    barcode = base_12_digits + check_digit
    item_id, user_id = str(uuid.uuid4()), session['user_id']
    current_time = now.strftime('%Y-%m-%d %H:%M:%S')

    cur = None # Inisialisasi cursor di luar try-except
    try:
        cur = mysql.connection.cursor()

        # --- 3. Ambil nama 'Size' dari database berdasarkan 'sizeId' ---
        size_id = data.get('sizeId')
        cur.execute("SELECT Name FROM sizes WHERE Id = %s", [size_id])
        size_record = cur.fetchone()
        if not size_record:
            return jsonify({"status": "error", "message": "ID Ukuran tidak valid."}), 400
        size_name = size_record['Name']

        # --- 4. Siapkan payload untuk dikirim ke endpoint eksternal ---
        # Endpoint mengharapkan sebuah list/array, jadi kita bungkus datanya
        external_payload = [{
            "Barcode": barcode,
            "Color": "-",
            "Item": data.get('name'),
            "Size": size_name
        }]

        # --- 5. Kirim data ke endpoint eksternal SEBELUM menyimpan ke lokal ---
        try:
            response = requests.post(endpoint, json=external_payload, timeout=10)
            response.raise_for_status()
        except requests.exceptions.RequestException as e:
            # Jika gagal, batalkan semua operasi dan kirim error 503
            return jsonify({"status": "error", "message": f"Gagal mengirim data ke server eksternal: {e}"}), 503

        # --- 6. Jika berhasil, lanjutkan penyimpanan ke database MySQL lokal ---
        new_item = { 
            'Id': item_id, 'Barcode': barcode, 'Name': data.get('name'), 
            'MaterialId': data.get('materialId'), 'SizeId': data.get('sizeId'), 'IsActive': 1, 
            'CreatedById': user_id, 'CreatedDate': current_time, 'ModifiedById': user_id, 
            'ModifiedDate': current_time, 'BrandId': data.get('brandId'), 'ModelId': data.get('modelId'), 
            'Price': data.get('price', 0.00), 'MinimumStock': 5, 
            'CreatedAt': client_info, 'ModifiedAt': client_info,
            'Serial': data.get('serial') 
        }
        query = "INSERT INTO items (Id, Barcode, Name, MaterialId, SizeId, IsActive, CreatedById, CreatedDate, ModifiedById, ModifiedDate, BrandId, ModelId, Price, MinimumStock, CreatedAt, ModifiedAt, Serial) VALUES (%(Id)s, %(Barcode)s, %(Name)s, %(MaterialId)s, %(SizeId)s, %(IsActive)s, %(CreatedById)s, %(CreatedDate)s, %(ModifiedById)s, %(ModifiedDate)s, %(BrandId)s, %(ModelId)s, %(Price)s, %(MinimumStock)s, %(CreatedAt)s, %(ModifiedAt)s, %(Serial)s)"
        
        cur.execute(query, new_item)
        mysql.connection.commit()
        
        return jsonify({"status": "success", "message": f"Item '{data.get('name')}' berhasil ditambahkan."}), 201

    except Exception as e:
        mysql.connection.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if cur:
            cur.close()

@api_bp.route('/add-lookup-item', methods=['POST'])
@login_required
def add_lookup_item():
    data = request.get_json()
    client_info = data.get('clientInfo', 'Unknown Client')
    item_type, item_name = data.get('itemType'), data.get('itemName')
    perm_code = permission_map.get(item_type + 's', {}).get('W')
    if not perm_code or perm_code not in session.get('permissions', []):
        return jsonify({"status": "error", "message": "Akses ditolak."}), 403
    table_name = item_type + 's'
    now, user_id = datetime.now(), session['user_id']
    new_id = str(uuid.uuid4())
    current_time = now.strftime('%Y-%m-%d %H:%M:%S')
    new_lookup_item = { 'Id': new_id, 'Name': item_name, 'IsActive': 1, 'CreatedById': user_id, 'CreatedDate': current_time, 'ModifiedById': user_id, 'ModifiedDate': current_time, 'CreatedAt': client_info, 'ModifiedAt': client_info }
    query = f"INSERT INTO {table_name} (Id, Name, IsActive, CreatedById, CreatedDate, ModifiedById, ModifiedDate, CreatedAt, ModifiedAt) VALUES (%(Id)s, %(Name)s, %(IsActive)s, %(CreatedById)s, %(CreatedDate)s, %(ModifiedById)s, %(ModifiedDate)s, %(CreatedAt)s, %(ModifiedAt)s)"
    try:
        cur = mysql.connection.cursor()
        cur.execute(query, new_lookup_item)
        mysql.connection.commit()
        cur.close()
        return jsonify({"status": "success", "message": f"{item_name} berhasil ditambahkan.", "newItem": {"Id": new_id, "Name": item_name}}), 201
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500


# --- ENDPOINT ANALYTICS DIPERBARUI ---
# --- ENDPOINT ANALYTICS DIPERBARUI ---
@api_bp.route('/analytics/daily')
@login_required
@permission_required('RA')
def get_analytics_daily():
    target_date_str = request.args.get('date', date.today().strftime('%Y-%m-%d'))
    try:
        target_date = datetime.strptime(target_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({"status": "error", "message": "Format tanggal tidak valid."}), 400

    try:
        cur = mysql.connection.cursor()
        
        # Query untuk total penjualan hari ini dengan rincian
        total_query = """
            SELECT 
                SUM(TotalPrice) as total_penjualan,
                SUM(Total) as total_lusin,
                SUM(CASE WHEN PaymentType IN ('EDCDebit', 'Cash', 'Transfer') THEN TotalPrice ELSE 0 END) as lunas,
                SUM(CASE WHEN PaymentType = 'Debt' THEN TotalPrice ELSE 0 END) as belum_lunas,
                SUM(CASE WHEN PaymentType IS NULL OR PaymentType = '' THEN TotalPrice ELSE 0 END) as tidak_diketahui
            FROM activities 
            WHERE Type = 'SalesOrder' AND DATE(CreatedDate) = %s
        """
        cur.execute(total_query, [target_date])
        total_result = cur.fetchone()

        # Query untuk penjualan terkini
        recent_query = """
            SELECT 
                a.Name, a.TotalPrice, TIME_FORMAT(a.CreatedDate, '%%H:%%i:%%s') as Waktu, b.Name as Cabang 
            FROM activities a 
            LEFT JOIN branches b ON a.BranchId = b.Id 
            WHERE a.Type = 'SalesOrder' AND DATE(a.CreatedDate) = %s 
            ORDER BY a.CreatedDate DESC 
        """
        cur.execute(recent_query, [target_date])
        recent_results = cur.fetchall()
        
        cur.close()

        # Format semua data Decimal ke string
        if total_result:
            for key, value in total_result.items():
                if isinstance(value, decimal.Decimal):
                    total_result[key] = str(value)
        
        for row in recent_results:
            if isinstance(row.get('TotalPrice'), decimal.Decimal):
                row['TotalPrice'] = str(row['TotalPrice'])

        return jsonify({
            "status": "success", 
            "data": { "total": total_result, "recent": recent_results }
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# --- ENDPOINT BARU UNTUK REKAP BULANAN ---
@api_bp.route('/analytics/monthly')
@login_required
@permission_required('RA')
def get_analytics_monthly():
    try:
        target_month = date.today().month
        target_year = date.today().year

        cur = mysql.connection.cursor()
        query = """
            SELECT b.Name as Cabang, s.Name as Salesman, SUM(a.TotalPrice) as TotalPenjualan
            FROM activities a
            LEFT JOIN branches b ON a.BranchId = b.Id
            LEFT JOIN salesmans s ON a.SalesmanId = s.Id
            WHERE a.Type = 'SalesOrder' AND MONTH(a.CreatedDate) = %s AND YEAR(a.CreatedDate) = %s
            GROUP BY b.Name, s.Name
            ORDER BY b.Name, TotalPenjualan DESC
        """
        cur.execute(query, [target_month, target_year])
        results = cur.fetchall()
        cur.close()

        for row in results:
            if isinstance(row.get('TotalPenjualan'), decimal.Decimal):
                row['TotalPenjualan'] = str(row['TotalPenjualan'])
        
        return jsonify({"status": "success", "data": results})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
# Hapus fungsi get_analytics_daily dan get_analytics_monthly yang lama

# --- FUNGSI ANALYTICS YANG SUDAH DIPERBARUI ---
@api_bp.route('/analytics/range')
@login_required
@permission_required('RA')
def get_analytics_by_range():
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')

    if not start_date_str or not end_date_str:
        return jsonify({"status": "error", "message": "Parameter start_date dan end_date diperlukan."}), 400

    try:
        datetime.strptime(start_date_str, '%Y-%m-%d')
        datetime.strptime(end_date_str, '%Y-%m-%d')
    except ValueError:
        return jsonify({"status": "error", "message": "Format tanggal tidak valid. Gunakan YYYY-MM-DD."}), 400

    try:
        cur = mysql.connection.cursor()
        
        total_query = """
            SELECT 
                SUM(TotalPrice) as total_penjualan,
                SUM(Total) as total_lusin,
                SUM(CASE WHEN PaymentType IN ('EDCDebit', 'Cash', 'Transfer') THEN TotalPrice ELSE 0 END) as lunas,
                SUM(CASE WHEN PaymentType = 'Debt' THEN TotalPrice ELSE 0 END) as belum_lunas,
                SUM(CASE WHEN PaymentType IS NULL OR PaymentType = '' THEN TotalPrice ELSE 0 END) as tidak_diketahui
            FROM activities 
            WHERE Type = 'SalesOrder' AND DATE(CreatedDate) BETWEEN %s AND %s
        """
        cur.execute(total_query, [start_date_str, end_date_str])
        total_result = cur.fetchone()

        recent_query = """
            SELECT 
                a.Id, a.Name, a.TotalPrice, DATE_FORMAT(a.CreatedDate, '%%d-%%m-%%Y %%H:%%i') as Waktu, b.Name as Cabang 
            FROM activities a 
            LEFT JOIN branches b ON a.BranchId = b.Id 
            WHERE a.Type = 'SalesOrder' AND DATE(a.CreatedDate) BETWEEN %s AND %s 
            ORDER BY a.CreatedDate DESC
        """
        cur.execute(recent_query, [start_date_str, end_date_str])
        recent_results = cur.fetchall()
        
        cur.close()

        if total_result:
            for key, value in total_result.items():
                if isinstance(value, decimal.Decimal):
                    total_result[key] = str(value)
        
        for row in recent_results:
            if isinstance(row.get('TotalPrice'), decimal.Decimal):
                row['TotalPrice'] = str(row['TotalPrice'])

        return jsonify({
            "status": "success", 
            "data": { "total": total_result, "recent": recent_results }
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
@api_bp.route('/analytics/timeseries')
@login_required
@permission_required('RA')
def get_analytics_timeseries():
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')

    if not start_date_str or not end_date_str:
        return jsonify({"status": "error", "message": "Parameter start_date dan end_date diperlukan."}), 400

    try:
        # Validasi format tanggal
        datetime.strptime(start_date_str, '%Y-%m-%d')
        datetime.strptime(end_date_str, '%Y-%m-%d')
    except ValueError:
        return jsonify({"status": "error", "message": "Format tanggal tidak valid. Gunakan YYYY-MM-DD."}), 400

    try:
        cur = mysql.connection.cursor()
        query = """
            SELECT 
                DATE(CreatedDate) as tanggal, 
                SUM(TotalPrice) as total_penjualan
            FROM activities
            WHERE Type = 'SalesOrder' AND DATE(CreatedDate) BETWEEN %s AND %s
            GROUP BY DATE(CreatedDate)
            ORDER BY DATE(CreatedDate) ASC;
        """
        cur.execute(query, [start_date_str, end_date_str])
        results = cur.fetchall()
        cur.close()

        for row in results:
            if isinstance(row.get('total_penjualan'), decimal.Decimal):
                row['total_penjualan'] = str(row['total_penjualan'])
            if isinstance(row.get('tanggal'), date):
                row['tanggal'] = row['tanggal'].strftime('%Y-%m-%d')

        return jsonify({"status": "success", "data": results})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    
@api_bp.route('/packinglist/upload-csv', methods=['POST'])
@login_required
@permission_required('WPL')
def upload_packing_list_csv():
    if 'file' not in request.files:
        return jsonify({"status": "error", "message": "Tidak ada file yang diunggah."}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"status": "error", "message": "Tidak ada file yang dipilih."}), 400

    if file and file.filename.endswith('.csv'):
        try:
            # Mengubah file stream menjadi format teks yang bisa dibaca
            file_text = io.TextIOWrapper(file, encoding='utf-8')
            
            # Membaca CSV sebagai dictionary
            reader = csv.DictReader(file_text)
            
            # Validasi header
            required_headers = {'Barcode', 'Color', 'Item', 'Size'}
            if not required_headers.issubset(reader.fieldnames):
                return jsonify({"status": "error", "message": f"File CSV harus memiliki header: {', '.join(required_headers)}"}), 400

            # Ubah data CSV menjadi list of dictionaries (payload JSON)
            # Mengganti nilai None (dari sel kosong) menjadi string kosong
            json_payload = [{k: (v if v is not None else '') for k, v in row.items()} for row in reader]

            # Kirim ke endpoint batch-insert (logika ini tetap sama)
            base_url = os.getenv('SQL_SERVER_API_BASE_URL')
            if not base_url:
                return jsonify({"status": "error", "message": "URL API Packing List tidak dikonfigurasi."}), 500
            
            endpoint = f"{base_url}/packinglist/batch-insert"
            
            try:
                response = requests.post(endpoint, json=json_payload, timeout=30)
                response.raise_for_status()
                return jsonify(response.json()), response.status_code
            except requests.exceptions.RequestException as e:
                return jsonify({"status": "error", "message": f"Gagal mengirim data ke server Packing List: {e}"}), 503

        except Exception as e:
            return jsonify({"status": "error", "message": f"Gagal memproses file CSV: {e}"}), 500

    return jsonify({"status": "error", "message": "Format file tidak valid. Harap unggah file .csv"}), 400

# ... (di dalam file api.py)

@api_bp.route('/packinglist/delete/<string:barcode>', methods=['DELETE'])
@login_required
@permission_required('WPL')
def delete_packing_list_item(barcode):
    base_url = os.getenv('SQL_SERVER_API_BASE_URL')
    if not base_url:
        return jsonify({"status": "error", "message": "URL API Packing List tidak dikonfigurasi."}), 500
    
    try:
        endpoint = f"{base_url}/packinglist/delete/{barcode}"
        
        response = requests.delete(endpoint, timeout=10)
        
        # --- PERBAIKAN UTAMA DI SINI ---
        # Periksa apakah request berhasil (status code 2xx)
        if response.ok:
            # Jika berhasil, SELALU kirim format respons standar kita sendiri ke frontend
            return jsonify({
                "status": "success", 
                "message": f"Barcode {barcode} berhasil dihapus."
            }), 200
        else:
            # Jika tidak, coba baca error dari server eksternal
            try:
                error_details = response.json()
                error_message = error_details.get('message') or error_details.get('error') or "Terjadi kesalahan di server eksternal."
            except ValueError:
                error_message = response.text or "Terjadi kesalahan tidak dikenal di server eksternal."
            return jsonify({"status": "error", "message": error_message}), response.status_code
        # --- AKHIR PERBAIKAN ---

    except requests.exceptions.RequestException as e:
        # Menangani error koneksi
        return jsonify({"status": "error", "message": f"Gagal terhubung ke server Packing List: {e}"}), 503
    
@api_bp.route('/packinglist/detail/<int:idno>')
@login_required
@permission_required('RPL') # Menggunakan izin Baca Packing List
def get_packing_list_detail(idno):
    base_url = os.getenv('SQL_SERVER_API_BASE_URL')
    if not base_url:
        return jsonify({"status": "error", "message": "URL API Packing List tidak dikonfigurasi."}), 500
    
    try:
        endpoint = f"{base_url}/packinglist/history/detail/{idno}"
        response = requests.get(endpoint, timeout=10)
        response.raise_for_status()
        
        # Langsung teruskan data detail dari server eksternal
        return jsonify({
            "status": "success", 
            "data": response.json()  # Pastikan data ada di dalam key "data"
        }), 200

    except requests.exceptions.RequestException as e:
        error_message = f"Gagal mengambil detail dari server Packing List: {e}"
        status_code = 503
        if e.response is not None:
            status_code = e.response.status_code
        return jsonify({"status": "error", "message": error_message}), status_code

# --- TAMBAHKAN FUNGSI BARU UNTUK MEMBACA HEADER EXCEL ---
def clean_headers(headers):
    cleaned_headers = []
    unnamed_count = 1
    for header in headers:
        if header is None or str(header).strip() == '':
            cleaned_headers.append(f"Kolom Tanpa Nama {unnamed_count}")
            unnamed_count += 1
        else:
            cleaned_headers.append(str(header).strip())
    return cleaned_headers
@api_bp.route('/multipayroll/get-headers', methods=['POST'])
@login_required
@permission_required('RA')
def get_xlsx_headers():
    if 'file' not in request.files:
        return jsonify({"status": "error", "message": "Tidak ada file yang diunggah."}), 400
    file = request.files['file']
    if not file.filename.endswith('.xlsx'):
        return jsonify({"status": "error", "message": "Format file harus .xlsx"}), 400
    try:
        workbook = openpyxl.load_workbook(file)
        sheet = workbook.active
        headers = [cell.value for cell in sheet[1]]
        # --- PERBAIKAN DI SINI ---
        cleaned_headers = clean_headers(headers)
        # --- AKHIR PERBAIKAN --
        return jsonify({"status": "success", "headers": cleaned_headers})
    except Exception as e:
        return jsonify({"status": "error", "message": f"Gagal membaca header file: {str(e)}"}), 500

# --- GANTI TOTAL FUNGSI CONVERT DENGAN YANG BARU INI ---
@api_bp.route('/multipayroll/convert', methods=['POST'])
@login_required
@permission_required('RA')
def convert_multipayroll_file():
    if 'file' not in request.files:
        return jsonify({"status": "error", "message": "Tidak ada file yang diunggah."}), 400

    file = request.files['file']
    try:
        # Ambil semua data dari form
        settings = json.loads(request.form.get('settings'))
        mapping = json.loads(request.form.get('mapping'))

        # Baca file Excel
        workbook = openpyxl.load_workbook(file)
        sheet = workbook.active
        headers = [cell.value for cell in sheet[1]]

         # --- PERBAIKAN DI SINI ---
        cleaned_headers = clean_headers(headers)
        # --- AKHIR PERBAIKAN ---

        # Buat map dari nama kolom ke indeksnya untuk pencarian cepat
        header_map = {header: i for i, header in enumerate(cleaned_headers)}

        detail_lines = []
        total_amount = 0.0
        total_records = 0

        # Iterasi baris data (mulai dari baris ke-2)
        for row_index, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
            if all(cell is None or str(cell).strip() == '' for cell in row):
                continue # Lewati baris kosong

            detail_data = {
                'Transaction ID': '', 'Transfer Type': 'BCA', 'Beneficiary ID': '',
                'Credited Account': '', 'Receiver Name': '', 'Amount': '0.00',
                'Employee ID': '', 'Remark': 'Gaji', 'Email': '', 'SWIFT': '',
                'Cust Type': '', 'Cust Residence': ''
            }

            # Isi detail_data menggunakan mapping dari frontend
            for field, column_name in mapping.items():
                if column_name and column_name in header_map:
                    cell_value = row[header_map[column_name]]
                    detail_data[field] = str(cell_value).strip() if cell_value is not None else ''

            # Validasi Amount
            try:
                amount = float(detail_data['Amount'])
                total_amount += amount
                detail_data['Amount'] = f"{amount:.2f}"
            except (ValueError, TypeError):
                return jsonify({"status": "error", "message": f"Nilai 'Amount' tidak valid di baris {row_index}."}), 400

            # Buat baris detail
            line = "1|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}".format(
                f"000000000{detail_data['Transaction ID']}", detail_data['Transfer Type'],
                detail_data['Beneficiary ID'], detail_data['Credited Account'],
                detail_data['Receiver Name'], detail_data['Amount'],
                detail_data['Employee ID'], detail_data['Remark'],
                detail_data['Email'], detail_data['SWIFT'],
                detail_data['Cust Type'], detail_data['Cust Residence']
            )
            detail_lines.append(line)
            total_records += 1

        # Buat baris header
        header_line = "0|PY|{}|{}|{}|{}|{}|{}|{}|||".format(
            settings['corporate_id'], 
            settings['company_code'],
            # --- PERBAIKAN DI DUA BARIS INI ---
            f"{int(settings['file_no']):08d}", 
            settings['transfer_date'],
            f"{int(settings['transfer_time']):02d}", 
            # --- AKHIR PERBAIKAN ---
            settings['source_account'],
            f"{total_records:05d}"
        )

        payroll_content = header_line + "\n" + "\n".join(detail_lines)

        return jsonify({
            "status": "success",
            "payroll_data": payroll_content,
            "total_records": total_records,
            "total_amount": f"{total_amount:.2f}"
        })

    except Exception as e:
        return jsonify({"status": "error", "message": f"Terjadi kesalahan: {str(e)}"}), 500
    
@api_bp.route('/setting/<key>', methods=['GET'])
@login_required
@permission_required('RA') # Izin untuk membaca pengaturan
def get_setting(key):
    try:
        cur = mysql.connection.cursor()
        cur.execute("SELECT setting_value FROM app_settings WHERE setting_key = %s", [key])
        result = cur.fetchone()
        cur.close()
        if result:
            return jsonify({"status": "success", "value": result['setting_value']})
        else:
            # Jika key tidak ditemukan, kembalikan nilai default atau error
            return jsonify({"status": "error", "message": "Setting tidak ditemukan."}), 404
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@api_bp.route('/setting', methods=['POST'])
@login_required
@permission_required('RA') # Izin untuk menulis pengaturan
def update_setting():
    data = request.get_json()
    key = data.get('key')
    value = data.get('value')

    if not key or value is None:
        return jsonify({"status": "error", "message": "Key dan value wajib diisi."}), 400

    try:
        cur = mysql.connection.cursor()
        # Gunakan INSERT ... ON DUPLICATE KEY UPDATE untuk UPSERT
        cur.execute("""
            INSERT INTO app_settings (setting_key, setting_value) 
            VALUES (%s, %s) 
            ON DUPLICATE KEY UPDATE setting_value = %s
        """, (key, value, value))
        mysql.connection.commit()
        cur.close()
        return jsonify({"status": "success", "message": "Setting berhasil diperbarui."})
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500



CHAR_TABLE = "XRVZK2TS7QFG0CHELA4OPM9IDYUWJNBo5cx1t3hwry8knabq7efuvijmlpsgzd!@#$%&*()-+=\\:;\"<>,.?/ '"
INT_ADDER = 3371
INT_SEED = 3751517

def mtdCalculateAutoCollect(strInput):
    iCheckSum = 0
    for index1 in range(1, len(strInput) + 1):
        x = 0
        for index2 in range(1, len(CHAR_TABLE) + 1):
            if ord(CHAR_TABLE[index2 - 1]) == ord(strInput[index1 - 1]):
                num2 = index1 + index2
                x = num2 % INT_ADDER
                iCheckSum += (num2 + INT_ADDER * (INT_ADDER + index1) + INT_ADDER * (INT_ADDER + index2)) + pow(x, 2)
            else:
                iCheckSum += INT_ADDER * index1 + pow(x, 2)
    return iCheckSum

def mtdGenerateH2HChecksum(lines):
    iCheckSum = 0
    for line in lines:
        iCheckSum += mtdCalculateAutoCollect(line.strip())
    iCheckSum += INT_SEED
    return str(iCheckSum)

@api_bp.route('/multipayroll/calculate-checksum', methods=['POST'])
@login_required
@permission_required('RA')
def calculate_payroll_checksum():
    if 'file' not in request.files:
        return jsonify({"status": "error", "message": "Tidak ada file yang diunggah."}), 400

    file = request.files['file']
    if not file.filename.endswith('.txt'):
        return jsonify({"status": "error", "message": "Format file harus .txt"}), 400

    try:
        content = file.read().decode('utf-8')
        lines = content.splitlines()
        checksum = mtdGenerateH2HChecksum(lines)
        return jsonify({"status": "success", "checksum": checksum})
    except Exception as e:
        return jsonify({"status": "error", "message": f"Gagal menghitung checksum: {str(e)}"}), 500