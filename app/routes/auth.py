# app/routes/auth.py
import base64
from flask import Blueprint, render_template, request, flash, redirect, url_for, session, jsonify
from functools import wraps
from app import mysql

auth_bp = Blueprint('auth', __name__)

def login_required(f):
    """Decorator untuk memastikan pengguna sudah login."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            if request.path.startswith('/api/'):
                return jsonify({"status": "error", "message": "Otentikasi diperlukan"}), 401
            flash("Silakan login untuk mengakses halaman ini.", "warning")
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        try:
            cur = mysql.connection.cursor()
            cur.execute("SELECT * FROM users WHERE UserName = %s", [username])
            user = cur.fetchone()
            cur.close()

            if user and user['Password'] == base64.b64encode(password.encode('utf-8')).decode('utf-8'):
                session['user_id'] = user['Id']
                session['username'] = user['UserName']
                
                  # --- PERUBAHAN DI SINI: Logika Izin Disederhanakan ---
                if user['UserName'] == 'superadmin':
                    session['permissions'] = [
                        'SA', 'RI', 'WI', 'DI', 'PB', 'RM', 'WM', 'DM', 
                        'RSz', 'WSz', 'DSz', 'RB', 'WB', 'DB', 'WNB', 
                        'RP', 'RPe', 'RPi', 'RA', 'RTk', 'RPL', 'WPL'
                    ]
                elif user['UserName'] == 'jesica303':
                    session['permissions'] = [
                        'SA', 'RI', 'WI', 'DI', 'PB', 'RM', 'WM', 'DM', 
                        'RSz', 'WSz', 'DSz', 'RB', 'WB', 'DB', 'WNB', 
                        'RP', 'RPe', 'RPi', 'RA', 'RTk',
                    ]
                else:
                    permissions_str = user.get('Permission', '')
                    session['permissions'] = permissions_str.split(',') if permissions_str else []
                # --- AKHIR PERUBAHAN ---
                return redirect(url_for('main.dashboard'))
            else:
                flash("Username atau password salah.", "danger")
        except Exception as e:
            flash(f"Terjadi error saat login: {e}", "danger")
            
    return render_template('login.html')

@auth_bp.route('/logout')
def logout():
    session.clear()
    flash("Anda telah berhasil logout.", "info")
    return redirect(url_for('auth.login'))