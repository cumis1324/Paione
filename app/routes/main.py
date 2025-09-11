# app/routes/main.py
import decimal
from flask import Blueprint, render_template, session, send_from_directory
from .auth import login_required
from app import mysql
from flask import request

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
@login_required
def dashboard():
    return render_template('dashboard.html', username=session.get('username'))

@main_bp.route('/print/barcode/<item_id>')
@login_required
def print_barcode_page(item_id):
    # Di sini kita bisa menambahkan decorator permission_required jika dibutuhkan
    try:
        cur = mysql.connection.cursor()
        query = "SELECT i.Name, i.Barcode, i.Price, i.Serial, s.Name as SizeName, m.Name as MaterialName, mo.Name as ModelName, b.Name as BrandName FROM items i LEFT JOIN sizes s ON i.SizeId = s.Id LEFT JOIN materials m ON i.MaterialId = m.Id LEFT JOIN models mo ON i.ModelId = mo.Id LEFT JOIN brands b ON i.BrandId = b.Id WHERE i.Id = %s"
        cur.execute(query, [item_id])
        item = cur.fetchone()
        cur.close()
        if item:
            if isinstance(item.get('Price'), decimal.Decimal):
                item['Price'] = str(item['Price'])
            return render_template('print_barcode.html', item=item)
        return "Item tidak ditemukan", 404
    except Exception as e:
        return f"Error: {e}", 500

# Rute untuk PWA
@main_bp.route('/manifest.json')
def manifest():
    return send_from_directory('static', 'manifest.json')

@main_bp.route('/sw.js')
def service_worker():
    return send_from_directory('static', 'sw.js')


# ... (kode lain di main.py)

@main_bp.route('/print/analytics', methods=['POST'])
@login_required
def print_analytics_page():
    # Ambil data yang dikirim dari frontend
    title = request.form.get('title', 'Laporan Analitik')
    summary_html = request.form.get('summary_html', '<p>Tidak ada data ringkasan.</p>')
    sales_img = request.form.get('sales_img')
    quantity_img = request.form.get('quantity_img')
    payment_img = request.form.get('payment_img')
    timeseries_img = request.form.get('timeseries_img')
    
    return render_template(
        'print_analytics.html',
        title=title,
        summary_html=summary_html,
        sales_img=sales_img,
        quantity_img=quantity_img,
        payment_img=payment_img,
        timeseries_img=timeseries_img
    )