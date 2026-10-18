// Servidor estático mínimo, sem dependências, só para servir a pasta public/.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5173;
const PUBLIC_DIR = path.join(__dirname, 'public');

const TIPOS_MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

const server = http.createServer((req, res) => {
  const caminhoUrl = decodeURIComponent(req.url.split('?')[0]);
  const relativo = caminhoUrl === '/' ? 'index.html' : caminhoUrl;
  const arquivo = path.join(PUBLIC_DIR, path.normalize(relativo));

  // Impede acesso a arquivos fora de public/ (ex.: /../server.js).
  if (!arquivo.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Acesso negado');
  }

  fs.readFile(arquivo, (err, conteudo) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Arquivo não encontrado');
    }
    const tipo = TIPOS_MIME[path.extname(arquivo)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': tipo });
    res.end(conteudo);
  });
});

server.listen(PORT, () => {
  console.log(`Frontend rodando em http://localhost:${PORT}`);
});
