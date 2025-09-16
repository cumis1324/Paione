# wsgi.py
from app import create_app
from waitress import serve

app = create_app()

if __name__ == '__main__':
    # Untuk hardware i5-3330 & 12GB RAM, direkomendasikan memulai dari 16-24 threads.
    # Monitor penggunaan CPU dan memori saat menaikkan angka ini secara bertahap.
    serve(app, host='0.0.0.0', port=5001, threads=100)
