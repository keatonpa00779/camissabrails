#!/usr/bin/env python3
"""
Servidor local que serve arquivos estáticos E faz proxy da API miuse
Necessário para evitar bloqueio de CORS no browser
Rodar com: python server.py
"""

import http.server
import socketserver
import urllib.request
import urllib.parse
import json
from pathlib import Path

PORT = 3000
API_KEY = 'NjlhZDE3YmUzM2JmMGQzZjAzZjE5MDU4OnV1dXV1dXRwY29pQGdtYWlsLmNvbTpDcmlvbG83QEA='
API_HOST = 'https://api.miuse.app'

class ProxyHandler(http.server.SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-API-Key')
        self.end_headers()

    def do_POST(self):
        if self.path == '/api/pix':
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length)
            
            req = urllib.request.Request(
                f'{API_HOST}/payments/pix',
                data=body,
                headers={
                    'Content-Type': 'application/json',
                    'X-API-Key': API_KEY
                },
                method='POST'
            )
            
            try:
                with urllib.request.urlopen(req) as response:
                    data = response.read()
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(data)
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode())
        else:
            self.send_error(404)

    def do_GET(self):
        if self.path.startswith('/api/payments/status/'):
            payment_id = urllib.parse.unquote(self.path.replace('/api/payments/status/', '', 1))
            if not payment_id:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'payment_id obrigatório'}).encode())
                return

            req = urllib.request.Request(
                f'{API_HOST}/payments/status/{urllib.parse.quote(payment_id)}',
                headers={'X-API-Key': API_KEY}
            )
            
            try:
                with urllib.request.urlopen(req) as response:
                    data = response.read()
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(data)
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode())
        else:
            super().do_GET()

    def end_headers(self):
        if not self.path.startswith('/api/'):
            self.send_header('Cache-Control', 'no-store')
        super().end_headers()

if __name__ == '__main__':
    with socketserver.TCPServer(("", PORT), ProxyHandler) as httpd:
        print(f"\n✅ Servidor rodando em http://localhost:{PORT}\n")
        print("Pressione Ctrl+C para parar\n")
        httpd.serve_forever()
