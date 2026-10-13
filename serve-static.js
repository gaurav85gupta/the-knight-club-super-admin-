/**
 * Static file server for the super-admin panel (dev + simple production use).
 *
 * WHY THIS EXISTS instead of `npx serve`:
 * Some versions of the `serve` package implement "clean URLs" by 301/302
 * redirecting a request for `/pages/course-form.html?id=X` to
 * `/pages/course-form?id=X` (dropping the extension) — and in doing so can
 * drop the query string during that redirect. Since `course-form.html?id=X`
 * is how this app identifies WHICH course to edit, losing `?id=X` silently
 * sends the admin to a blank "New course" form instead of the course they
 * clicked. This server never redirects: it serves the exact file that was
 * asked for, so the query string is never touched.
 *
 * BEHAVIOUR:
 *   - Serves files directly under this directory (no directory listing).
 *   - `/pages/course-form.html?id=X` -> serves pages/course-form.html as-is.
 *   - `/pages/course-form?id=X` (no extension) -> ALSO serves
 *     pages/course-form.html, by trying `<path>.html` as a fallback. This
 *     keeps both forms of the URL working without ever issuing a redirect.
 *   - Unknown paths -> 404.
 *   - Query strings are never inspected or altered — only the path portion
 *     of the URL is used to resolve a file.
 *
 * USAGE:
 *   node serve-static.js [port]        (default port 3001)
 */

const http = require('http');
const path = require('path');
const fs = require('fs');

const ROOT = __dirname;
const PORT = Number(process.argv[2]) || Number(process.env.PORT) || 3001;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.map': 'application/json; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

// Resolve a URL path to a real file on disk, WITHOUT ever redirecting.
// Tries, in order: the exact path, then the exact path + ".html",
// then (if the path ends in "/") that path + "index.html".
function resolveFile(urlPath) {
  // Decode and strip any ".." traversal attempts; normalize separators.
  const decoded = decodeURIComponent(urlPath);
  const safeRelative = path
    .normalize(decoded)
    .replace(/^([/\\])+/, '') // no leading slash
    .split(/[/\\]/)
    .filter((seg) => seg !== '..' && seg !== '.')
    .join(path.sep);

  const candidates = [];
  const base = path.join(ROOT, safeRelative);

  if (safeRelative === '' || decoded.endsWith('/')) {
    candidates.push(path.join(base, 'index.html'));
  } else {
    candidates.push(base); // exact file, e.g. pages/course-form.html
    candidates.push(`${base}.html`); // extension-less request, e.g. pages/course-form
  }

  for (const candidate of candidates) {
    // Guard: resolved path must stay inside ROOT.
    if (!candidate.startsWith(ROOT)) continue;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

const server = http.createServer((req, res) => {
  const urlPath = (req.url || '/').split('?')[0].split('#')[0];
  const filePath = resolveFile(urlPath);

  if (!filePath) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('500 Internal Server Error');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      // Dev-friendly: don't let the browser cache JS/HTML while iterating.
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Super-admin panel serving at http://localhost:${PORT}`);
  console.log(`Serving files from: ${ROOT}`);
});
