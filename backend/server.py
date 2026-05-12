"""
Flask Server for FIR Assistant
"""

import os
import sys
from flask import send_from_directory
from dotenv import load_dotenv

# Load environment variables from config folder
load_dotenv(os.path.join(os.path.dirname(__file__), '../config/.env'))

# Add project root to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app

app = create_app()

# Get absolute path to frontend
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../frontend/public')

# Serve frontend files
@app.route('/')
def index():
    """Serve main FIR assistant page"""
    return send_from_directory(FRONTEND_DIR, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    """Serve static files"""
    return send_from_directory(FRONTEND_DIR, path)

if __name__ == '__main__':
    print("🚀 Starting AI Voice FIR Assistant...")
    print("📡 Server: https://localhost:5000")
    print("🎤 Voice Input: ENABLED with HTTPS")
    print("🤖 AI: Sarvam AI (Made in India 🇮🇳)")
    print("🔊 Voice: Sarvam AI TTS")
    print("🔒 Certificate: Self-signed (accept browser warning)")
    print("\n👉 Open: https://localhost:5000\n")

    # Get SSL certificate paths
    cert_path = os.path.join(os.path.dirname(__file__), '../config/cert.pem')
    key_path = os.path.join(os.path.dirname(__file__), '../config/key.pem')

    # Start server
    # Prefer HTTPS if certs are present, otherwise fall back to HTTP for local dev
    ssl_context = None
    if os.path.exists(cert_path) and os.path.exists(key_path):
        ssl_context = (cert_path, key_path)
        print(f"Using SSL certs: {cert_path}, {key_path}")
    else:
        print("⚠️ SSL certs not found; starting without HTTPS. To enable HTTPS place cert.pem and key.pem in config/ or set CERT_PATH/KEY_PATH in config/.env")

    app.run(
        debug=True,
        host='0.0.0.0',
        port=5000,
        ssl_context=ssl_context
    )
