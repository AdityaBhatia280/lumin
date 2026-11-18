const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const pages = new Set(['/', '/index.html', '/about', '/our-work', '/partnerships',
  '/partners', '/partners.html', '/youth-ambassadors', '/digital-hub', '/contact']);
const files = new Set(['/styles.css', '/app.js', '/site-content.js', '/network-data.js']);
const mime = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp'
};

http.createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost');
  const route = url.pathname.replace(/\/$/, '') || '/';
  if (route === '/network' || route === '/chapters') {
    response.writeHead(302, {Location: '/our-work'}).end();
    return;
  }
  const isPage = pages.has(route) || /^\/our-work\/[a-z0-9-]+$/.test(route);
  const file = isPage ? path.join(__dirname, 'index.html') : path.resolve(__dirname, '.' + route);
  const allowedAsset = file.startsWith(path.join(__dirname, 'assets') + path.sep) && route.startsWith('/assets/');
  if ((!isPage && !files.has(route) && !allowedAsset) || !fs.statSync(file, {throwIfNoEntry: false})?.isFile()) {
    response.writeHead(404).end('Not found');
    return;
  }
  response.setHeader('Content-Type', (mime[path.extname(file)] || 'application/octet-stream') + (isPage ? '; charset=utf-8' : ''));
  fs.createReadStream(file).pipe(response);
}).listen(Number(process.env.LUMEN_PORT || 3000), process.env.LUMEN_HOST || '127.0.0.1', function () {
  console.log('Project Lumin preview at http://' + this.address().address + ':' + this.address().port);
});
