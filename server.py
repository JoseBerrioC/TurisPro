"""Servidor estático opcional para el frontend de TurisPro.

La API y SQLite se ejecutan exclusivamente con el backend Node.js:
    cd backend && npm start

Este servidor Python solo sirve la carpeta frontend y no observa ni modifica
la base de datos.
"""
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os

ROOT = Path(__file__).resolve().parent
FRONTEND = ROOT / "frontend"
HOST = "127.0.0.1"
PORT = 5500

if __name__ == "__main__":
    handler = partial(SimpleHTTPRequestHandler, directory=str(FRONTEND))
    server = ThreadingHTTPServer((HOST, PORT), handler)
    print(f"TurisPro frontend: http://{HOST}:{PORT}/")
    print("API: ejecuta 'npm start' dentro de backend (http://localhost:3000).")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor frontend detenido.")
    finally:
        server.server_close()
