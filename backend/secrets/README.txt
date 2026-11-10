TURISPRO - CLAVE PRIVADA DE GEMINI

Pega tu clave en el archivo .env de esta misma carpeta:
GEMINI_API_KEY=tu_clave_real

Guarda el archivo como .env (si Windows lo guarda como .env.txt, el backend también intentará leer esa variante).
No compartas este archivo ni lo subas a GitHub.
Después de guardar, detén el servidor con Ctrl+C y ejecuta npm start nuevamente desde backend.
Al iniciar, la consola indicará GEMINI API Key: CONFIGURADA o NO DETECTADA. Nunca mostrará el valor de la clave.


Configuración del análisis IA:
- El backend prueba primero gemini-3.5-flash-lite para reducir el tiempo de respuesta.
- Si no responde o no está disponible, intenta el modelo definido en LLM_MODEL.
- Cada intento tiene un límite máximo de 30 segundos. La pantalla espera hasta 70 segundos para recibir el resultado o diagnóstico.
- Nunca compartas este archivo ni subas la API Key a GitHub.
