import os
import sys
import json
import sqlite3
import hashlib
import binascii
import hmac
from http.server import HTTPServer, SimpleHTTPRequestHandler
import urllib.parse

BASE_DIR = os.path.abspath(r"C:\Users\jjmig\.gemini\antigravity\scratch\TurisPro")
DB_PATH = os.path.join(BASE_DIR, "turispro.db")
SCHEMA_PATH = os.path.join(BASE_DIR, "backend", "src", "database", "schema.sql")

def hash_clave(clave, iteraciones=210000):
    salt = binascii.hexlify(os.urandom(16)).decode('ascii')
    h = binascii.hexlify(hashlib.pbkdf2_hmac('sha512', clave.encode('utf-8'), salt.encode('ascii'), iteraciones)).decode('ascii')
    return f"{salt}:{h}:{iteraciones}"

def verificar_clave(clave, stored):
    if not stored or ':' not in stored:
        return False
    partes = stored.split(':')
    if len(partes) == 2:
        salt, h_orig = partes
        iters = 1000
    elif len(partes) == 3:
        salt, h_orig, iters_str = partes
        iters = int(iters_str)
    else:
        return False
    try:
        h = binascii.hexlify(hashlib.pbkdf2_hmac('sha512', clave.encode('utf-8'), salt.encode('ascii'), iters)).decode('ascii')
        return hmac.compare_digest(h.encode('ascii'), h_orig.encode('ascii'))
    except Exception:
        return False

def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON;")
    with open(SCHEMA_PATH, 'r', encoding='utf-8') as f:
        conn.executescript(f.read())
    
    # Comprobar usuarios iniciales
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM usuarios")
    if cursor.fetchone()[0] == 0:
        cursor.execute("INSERT INTO usuarios (nombre, correo, contrasena_hash, rol, activo) VALUES (?, ?, ?, ?, ?)",
                       ("Administrador General", "admin@turispro.com", hash_clave("Admin123*"), "ADMINISTRADOR", 1))
        cursor.execute("INSERT INTO usuarios (nombre, correo, contrasena_hash, rol, activo) VALUES (?, ?, ?, ?, ?)",
                       ("Gestor de Proveedores", "gestor@turispro.com", hash_clave("Gestor123*"), "GESTOR_PROVEEDORES", 1))
        cursor.execute("INSERT INTO usuarios (nombre, correo, contrasena_hash, rol, activo) VALUES (?, ?, ?, ?, ?)",
                       ("Evaluador Turístico", "evaluador@turispro.com", hash_clave("Evaluador123*"), "EVALUADOR", 1))
        cursor.execute("INSERT INTO usuarios (nombre, correo, contrasena_hash, rol, activo) VALUES (?, ?, ?, ?, ?)",
                       ("Carlos Mendoza", "carlos.mendoza@turispro.com", hash_clave("Carlos123*"), "ADMINISTRADOR", 1))
        conn.commit()

    # Comprobar zonas y proveedores iniciales
    cursor.execute("SELECT COUNT(*) FROM zonas_cobertura")
    if cursor.fetchone()[0] == 0:
        cursor.execute("INSERT INTO zonas_cobertura (pais, ciudad, descripcion) VALUES (?, ?, ?)", ("Colombia", "Bogotá", "Zona Andina"))
        cursor.execute("INSERT INTO zonas_cobertura (pais, ciudad, descripcion) VALUES (?, ?, ?)", ("Colombia", "Medellín", "Zona Valle de Aburrá"))
        cursor.execute("INSERT INTO zonas_cobertura (pais, ciudad, descripcion) VALUES (?, ?, ?)", ("Perú", "Cusco", "Región de los Andes"))
        conn.commit()

    cursor.execute("SELECT COUNT(*) FROM proveedores")
    if cursor.fetchone()[0] == 0:
        cursor.execute("INSERT INTO proveedores (razon_social, nit, tipo, correo, telefono, direccion, nivel_riesgo, puntaje_riesgo, estado_ciclo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                       ("Hotel Los Andes S.A.S.", "900.123.456-7", "HOTEL", "contacto@hotellosandes.com", "+57 601 2345678", "Carrera 7 # 120-45, Bogotá", "MEDIO", 38, "Activo"))
        cursor.execute("INSERT INTO proveedores (razon_social, nit, tipo, correo, telefono, direccion, nivel_riesgo, puntaje_riesgo, estado_ciclo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                       ("Transportes Andinos Express", "901.987.654-3", "TRANSPORTADOR", "operaciones@transportesandinos.com", "+57 604 8765432", "Calle 10 # 43E-12, Medellín", "ALTO", 72, "Activo"))
        cursor.execute("INSERT INTO proveedores (razon_social, nit, tipo, correo, telefono, direccion, nivel_riesgo, puntaje_riesgo, estado_ciclo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                       ("Rutas del Inca Tours E.I.R.L.", "204.567.890-1", "OPERADOR", "reservas@rutasdelinca.pe", "+51 84 223344", "Av. El Sol 450, Cusco", "SIN_DATOS", None, "Registrado"))
        conn.commit()

    conn.close()

init_db()

class TurisProHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def send_json(self, status, payload):
        data = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def get_body(self):
        length = int(self.headers.get('Content-Length', 0))
        if length == 0:
            return {}
        raw = self.rfile.read(length).decode('utf-8')
        try:
            return json.loads(raw)
        except Exception:
            return {}

    def get_auth_user(self):
        auth = self.headers.get('Authorization', '')
        # Si no hay token o es demo token, usar el admin por defecto
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT id_usuario, nombre, correo, rol, activo, contrasena_hash FROM usuarios WHERE activo = 1 LIMIT 1")
        row = cursor.fetchone()
        conn.close()
        if row:
            return {
                "idUsuario": row[0],
                "nombre": row[1],
                "correo": row[2],
                "rol": row[3],
                "activo": bool(row[4]),
                "contrasenaHash": row[5]
            }
        return {"idUsuario": 1, "nombre": "Administrador General", "correo": "admin@turispro.com", "rol": "ADMINISTRADOR", "activo": True}

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip('/')
        query = dict(urllib.parse.parse_qsl(parsed.query))

        # Redirigir raíz a settings o dashboard
        if path == "" or path == "/":
            self.send_response(302)
            self.send_header('Location', '/TurisPro/src/pages/settings/settings.html')
            self.end_headers()
            return

        # Rutas de API
        if path == "/api/health":
            return self.send_json(200, {
                "app": "TurisPro Backend API",
                "version": "1.0.0 (MVP Release 1)",
                "status": "UP"
            })

        if path == "/api/auth/perfil":
            u = self.get_auth_user()
            return self.send_json(200, {
                "usuario": {
                    "idUsuario": u["idUsuario"],
                    "nombre": u["nombre"],
                    "correo": u["correo"],
                    "rol": u["rol"],
                    "activo": u["activo"]
                },
                "permisos": {
                    "puedeGestionarUsuarios": u["rol"] == "ADMINISTRADOR",
                    "puedeConfiguracion": u["rol"] == "ADMINISTRADOR"
                }
            })

        if path == "/api/auth/menu":
            u = self.get_auth_user()
            return self.send_json(200, {
                "rol": u["rol"],
                "items": [
                    {"id": "dashboard", "nombre": "Dashboard", "ruta": "/TurisPro/src/pages/dashboard/dashboard.html", "icono": "dashboard"},
                    {"id": "proveedores", "nombre": "Proveedores", "ruta": "/TurisPro/src/pages/providers/directory.html", "icono": "storefront"},
                    {"id": "comparar", "nombre": "Comparar", "ruta": "/TurisPro/src/pages/providers/compare.html", "icono": "compare_arrows"},
                    {"id": "configuracion", "nombre": "Configuración", "ruta": "/TurisPro/src/pages/settings/settings.html", "icono": "settings"}
                ]
            })

        if path == "/api/auth/usuarios":
            conn = sqlite3.connect(DB_PATH)
            sql = "SELECT id_usuario, nombre, correo, rol, activo, creado_en FROM usuarios WHERE 1=1"
            params = []
            if "busqueda" in query and query["busqueda"]:
                sql += " AND (LOWER(nombre) LIKE ? OR LOWER(correo) LIKE ?)"
                t = f"%{query['busqueda'].lower().strip()}%"
                params.extend([t, t])
            if "rol" in query and query["rol"] and query["rol"] != "TODOS":
                r = query["rol"].upper().replace(" ", "_")
                sql += " AND rol = ?"
                params.append(r)
            if "activo" in query and query["activo"] != "":
                sql += " AND activo = ?"
                params.append(1 if query["activo"] in ["1", "true"] else 0)
            sql += " ORDER BY id_usuario ASC"

            cursor = conn.cursor()
            cursor.execute(sql, params)
            rows = cursor.fetchall()
            conn.close()

            items = [{
                "idUsuario": r[0],
                "nombre": r[1],
                "correo": r[2],
                "rol": r[3],
                "activo": bool(r[4]),
                "creadoEn": r[5]
            } for r in rows]

            return self.send_json(200, {"total": len(items), "items": items})

        if path == "/api/configuracion/preferencias":
            u = self.get_auth_user()
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("SELECT dias_alerta, alertas_incidentes, alertas_evaluaciones FROM preferencias_usuario WHERE id_usuario = ?", (u["idUsuario"],))
            row = cursor.fetchone()
            conn.close()
            if row:
                prefs = {"diasAlerta": row[0], "alertasIncidentes": bool(row[1]), "alertasEvaluaciones": bool(row[2])}
            else:
                prefs = {"diasAlerta": 30, "alertasIncidentes": True, "alertasEvaluaciones": True}
            return self.send_json(200, {"preferencias": prefs})

        if path == "/api/dashboard":
            return self.send_json(200, {
                "indicadores": {
                    "proveedoresActivos": 3,
                    "proveedoresRiesgoAlto": 1,
                    "documentosAtencion": 2,
                    "incidentesAbiertos": 2
                },
                "tablaAtencion": [
                    {
                        "idProveedor": 2,
                        "razonSocial": "Transportes Andinos Express",
                        "tipo": "TRANSPORTADOR",
                        "nivelRiesgo": "ALTO",
                        "puntajeRiesgo": 72,
                        "motivosAtencion": ["Nivel de riesgo ALTO (72 pts)", "1 incidente crítico abierto"]
                    },
                    {
                        "idProveedor": 1,
                        "razonSocial": "Hotel Los Andes S.A.S.",
                        "tipo": "HOTEL",
                        "nivelRiesgo": "MEDIO",
                        "puntajeRiesgo": 38,
                        "motivosAtencion": ["1 documento vencido (Póliza)", "1 por vencer"]
                    }
                ]
            })

        if path == "/api/proveedores":
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            sql = "SELECT id_proveedor, razon_social, nit, tipo, correo, activo, estado_ciclo, nivel_riesgo, puntaje_riesgo FROM proveedores WHERE 1=1"
            params = []
            if "texto" in query and query["texto"]:
                sql += " AND (LOWER(razon_social) LIKE ? OR LOWER(nit) LIKE ? OR LOWER(correo) LIKE ?)"
                t = f"%{query['texto'].lower().strip()}%"
                params.extend([t, t, t])
            if "q" in query and query["q"]:
                sql += " AND (LOWER(razon_social) LIKE ? OR LOWER(nit) LIKE ? OR LOWER(correo) LIKE ?)"
                t = f"%{query['q'].lower().strip()}%"
                params.extend([t, t, t])
            if "tipo" in query and query["tipo"] and query["tipo"] != "all":
                sql += " AND tipo = ?"
                params.append(query["tipo"].upper())
            if "riesgo" in query and query["riesgo"] and query["riesgo"] != "all":
                sql += " AND nivel_riesgo = ?"
                params.append(query["riesgo"].upper())
            if "estado" in query and query["estado"] and query["estado"] != "all":
                sql += " AND estado_ciclo = ?"
                params.append(query["estado"])
            sql += " ORDER BY id_proveedor ASC"
            cursor.execute(sql, params)
            rows = cursor.fetchall()
            conn.close()
            items = [{
                "idProveedor": r[0],
                "razonSocial": r[1],
                "nit": r[2],
                "tipo": r[3],
                "correo": r[4],
                "activo": bool(r[5]),
                "estadoCiclo": r[6],
                "nivelRiesgo": r[7],
                "puntajeRiesgo": r[8]
            } for r in rows]
            return self.send_json(200, {"total": len(items), "items": items})

        # Servir estáticos
        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip('/')
        body = self.get_body()

        if path == "/api/auth/login":
            correo = body.get("correo", "").strip().lower()
            clave = body.get("clave", "")
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("SELECT id_usuario, nombre, correo, contrasena_hash, rol, activo FROM usuarios WHERE correo = ?", (correo,))
            row = cursor.fetchone()
            conn.close()
            if not row or not verificar_clave(clave, row[3]):
                return self.send_json(401, {"error": "Credenciales inválidas. Verifique correo y contraseña."})
            u = {"idUsuario": row[0], "nombre": row[1], "correo": row[2], "rol": row[4], "activo": bool(row[5])}
            token = f"jwt-turispro-{row[0]}-token"
            return self.send_json(200, {"usuario": u, "token": token, "mensaje": "Autenticación exitosa"})

        if path == "/api/auth/usuarios":
            nombre = body.get("nombre", "").strip()
            correo = body.get("correo", "").strip().lower()
            rol = body.get("rol", "GESTOR_PROVEEDORES").upper().replace(" ", "_")
            activo = 1 if body.get("activo", True) else 0

            if not nombre or not correo:
                return self.send_json(400, {"error": "Nombre y correo son requeridos"})

            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("SELECT id_usuario FROM usuarios WHERE correo = ?", (correo,))
            if cursor.fetchone():
                conn.close()
                return self.send_json(409, {"error": f"Ya existe un usuario con el correo: {correo}"})

            clave_temp = hash_clave("Invitacion2026*")
            cursor.execute("INSERT INTO usuarios (nombre, correo, contrasena_hash, rol, activo) VALUES (?, ?, ?, ?, ?)",
                           (nombre, correo, clave_temp, rol, activo))
            new_id = cursor.lastrowid
            conn.commit()
            conn.close()

            return self.send_json(201, {
                "mensaje": "Usuario corporativo creado exitosamente",
                "usuario": {"idUsuario": new_id, "nombre": nombre, "correo": correo, "rol": rol, "activo": bool(activo)}
            })

        if path == "/api/auth/cambiar-clave":
            actual = body.get("claveActual", "")
            nueva = body.get("claveNueva", "")
            confirmar = body.get("confirmarClave", "")

            if not actual or not nueva or not confirmar:
                return self.send_json(400, {"error": "Todos los campos de contraseña son requeridos"})
            if nueva != confirmar:
                return self.send_json(400, {"error": "La nueva contraseña y su confirmación no coinciden"})
            if len(nueva) < 8:
                return self.send_json(400, {"error": "La nueva contraseña debe tener mínimo 8 caracteres (norma ISO 27001)"})

            u = self.get_auth_user()
            if not verificar_clave(actual, u.get("contrasenaHash", "")):
                return self.send_json(401, {"error": "La contraseña actual ingresada es incorrecta"})

            nuevo_hash = hash_clave(nueva)
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("UPDATE usuarios SET contrasena_hash = ? WHERE id_usuario = ?", (nuevo_hash, u["idUsuario"]))
            conn.commit()
            conn.close()

            return self.send_json(200, {"mensaje": "Contraseña actualizada exitosamente conforme a ISO 27001"})

        return self.send_json(404, {"error": f"Ruta POST {path} no encontrada"})

    def do_PUT(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip('/')
        body = self.get_body()

        if path == "/api/auth/perfil":
            nombre = body.get("nombre", "").strip()
            correo = body.get("correo", "").strip().lower()
            if not nombre or not correo:
                return self.send_json(400, {"error": "Nombre y correo no pueden estar vacíos"})

            u = self.get_auth_user()
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("SELECT id_usuario FROM usuarios WHERE correo = ? AND id_usuario != ?", (correo, u["idUsuario"]))
            if cursor.fetchone():
                conn.close()
                return self.send_json(409, {"error": f"El correo {correo} ya está en uso por otro usuario"})

            cursor.execute("UPDATE usuarios SET nombre = ?, correo = ? WHERE id_usuario = ?", (nombre, correo, u["idUsuario"]))
            conn.commit()
            conn.close()

            return self.send_json(200, {
                "mensaje": "Perfil corporativo guardado exitosamente",
                "usuario": {"idUsuario": u["idUsuario"], "nombre": nombre, "correo": correo, "rol": u["rol"], "activo": u["activo"]}
            })

        if path == "/api/configuracion/preferencias":
            u = self.get_auth_user()
            dias = int(body.get("diasAlerta", 30))
            if dias not in [7, 15, 30]:
                dias = 30
            inc = 1 if body.get("alertasIncidentes", True) else 0
            eval_ = 1 if body.get("alertasEvaluaciones", True) else 0

            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO preferencias_usuario (id_usuario, dias_alerta, alertas_incidentes, alertas_evaluaciones, actualizado_en)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(id_usuario) DO UPDATE SET
                    dias_alerta = excluded.dias_alerta,
                    alertas_incidentes = excluded.alertas_incidentes,
                    alertas_evaluaciones = excluded.alertas_evaluaciones,
                    actualizado_en = CURRENT_TIMESTAMP
            """, (u["idUsuario"], dias, inc, eval_))
            conn.commit()
            conn.close()

            return self.send_json(200, {
                "mensaje": "Preferencias de alertas guardadas en SQLite",
                "preferencias": {"diasAlerta": dias, "alertasIncidentes": bool(inc), "alertasEvaluaciones": bool(eval_)}
            })

        return self.send_json(404, {"error": f"Ruta PUT {path} no encontrada"})

if __name__ == '__main__':
    port = 3000
    server = HTTPServer(('0.0.0.0', port), TurisProHandler)
    print(f"TurisPro Server ejecutándose en http://localhost:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("Servidor detenido.")
