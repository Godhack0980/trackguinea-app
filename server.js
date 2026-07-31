const { createServer } = require('http');
const { parse } = require('url');
const path = require('path');
const fs = require('fs');

const port = process.env.PORT || 3000;
process.env.NODE_ENV = 'production';

// Determine static asset source directories
const staticDirPrimary = path.join(__dirname, '.next', 'static');
const staticDirStandalone = path.join(__dirname, '.next', 'standalone', '.next', 'static');
const publicDirPrimary = path.join(__dirname, 'public');
const publicDirStandalone = path.join(__dirname, '.next', 'standalone', 'public');

const contentTypeMap = {
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.html': 'text/html; charset=utf-8'
};

function tryServeStatic(req, res, pathname) {
  // 1. Check _next/static chunks
  if (pathname && pathname.startsWith('/_next/static/')) {
    const subPath = pathname.replace('/_next/static/', '');
    const path1 = path.join(staticDirPrimary, subPath);
    const path2 = path.join(staticDirStandalone, subPath);

    const targetPath = fs.existsSync(path1) ? path1 : (fs.existsSync(path2) ? path2 : null);

    if (targetPath && fs.statSync(targetPath).isFile()) {
      const ext = path.extname(targetPath).toLowerCase();
      res.setHeader('Content-Type', contentTypeMap[ext] || 'application/octet-stream');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      fs.createReadStream(targetPath).pipe(res);
      return true;
    }
  }

  // 2. Check public static files
  if (pathname && pathname !== '/' && !pathname.startsWith('/_next/')) {
    const path1 = path.join(publicDirPrimary, pathname);
    const path2 = path.join(publicDirStandalone, pathname);

    const targetPath = fs.existsSync(path1) ? path1 : (fs.existsSync(path2) ? path2 : null);

    if (targetPath && fs.statSync(targetPath).isFile()) {
      const ext = path.extname(targetPath).toLowerCase();
      if (contentTypeMap[ext]) {
        res.setHeader('Content-Type', contentTypeMap[ext]);
      }
      fs.createReadStream(targetPath).pipe(res);
      return true;
    }
  }

  return false;
}

console.log('> Preparing TransConnekt High-Performance Production Server for o2switch...');

const next = require('next');
const app = next({ dev: false, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      const { pathname } = parsedUrl;

      // Intercept and serve static CSS/JS/Image assets directly
      if (tryServeStatic(req, res, pathname)) {
        return;
      }

      handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', req.url, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> TransConnekt Server ready on port ${port}`);
  });
}).catch((err) => {
  console.error('Failed to prepare Next.js server:', err);
  process.exit(1);
});
