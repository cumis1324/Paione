# app/__init__.py
import os
from flask import Flask
from flask_mysqldb import MySQL
from flask_cors import CORS
from dotenv import load_dotenv

# Muat environment variables
load_dotenv()

# Inisialisasi ekstensi
mysql = MySQL()
cors = CORS()

def create_app():
    """Factory function untuk membuat instance aplikasi Flask."""
    app = Flask(__name__, instance_relative_config=True)

    # --- Konfigurasi Aplikasi ---
    app.config.from_mapping(
        SECRET_KEY=os.getenv("SECRET_KEY", "super-secret-key-for-dev"),
        MYSQL_HOST=os.getenv('MYSQL_HOST', 'localhost'),
        MYSQL_USER=os.getenv('MYSQL_USER', 'root'),
        MYSQL_PASSWORD=os.getenv('MYSQL_PASSWORD', ''),
        MYSQL_DB=os.getenv('MYSQL_DB', 'your_database_name'),
        MYSQL_CURSORCLASS='DictCursor'
    )

    # Inisialisasi ekstensi dengan aplikasi
    mysql.init_app(app)
    cors.init_app(app)

    with app.app_context():
        # Import dan daftarkan Blueprints
        from .routes import auth, main, api
        app.register_blueprint(auth.auth_bp)
        app.register_blueprint(main.main_bp)
        app.register_blueprint(api.api_bp, url_prefix='/api')
        
    return app