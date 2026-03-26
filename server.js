// Servidor local que serve os arquivos estáticos E faz proxy da API miuse
// Necessário para evitar bloqueio de CORS no browser
// Rodar com: node server.js

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const API_KEY = 'NjlhZDE3YmUzM2JmMGQzZjAzZjE5MDU4OnV1dXV1dXRwY29pQGdtYWlsLmNvbTpDcmlvbG83QEA=';
const API_HOST = 'api.miuse.app';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.jpg':  'image/jpeg',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

function proxyRequest(req, res, apiPath, method, body) {
  const options = {
    hostname: API_HOST,
    port: 443,
    path: apiPath,
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    }
  };

  const proxyReq = https.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (e) => {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  });

  if (body) proxyReq.write(body);
  proxyReq.end();
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
    });
    return res.end();
  }

  // Proxy: POST /api/pix → POST https://api.miuse.app/payments/pix
  if (req.method === 'POST' && url.pathname === '/api/pix') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => proxyRequest(req, res, '/payments/pix', 'POST', body));
    return;
  }

  // Proxy: GET /api/payments/status/:paymentId → GET https://api.miuse.app/payments/status/:paymentId
  if (req.method === 'GET' && url.pathname.startsWith('/api/payments/status/')) {
    const paymentId = decodeURIComponent(url.pathname.replace('/api/payments/status/', ''));
    if (!paymentId) {
      res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ error: 'payment_id obrigatório' }));
    }
    proxyRequest(req, res, `/payments/status/${encodeURIComponent(paymentId)}`, 'GET', null);
    return;
  }

  // Servir arquivos estáticos
  let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
  filePath = path.join(__dirname, filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n✅ Servidor rodando em http://localhost:${PORT}\n`);
});
