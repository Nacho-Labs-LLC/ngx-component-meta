import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, parseAll, lint, computeStats } from '@nacho-labs/ngx-component-meta';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const TMP_DIR = path.join(__dirname, '.tmp');

fs.mkdirSync(TMP_DIR, { recursive: true });

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
};

function servStatic(res, filePath) {
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/api/parse') {
    try {
      const body = JSON.parse(await readBody(req));
      const source = body.source || '';

      const tmpFile = path.join(TMP_DIR, 'input.component.ts');
      fs.writeFileSync(tmpFile, source, 'utf-8');

      const docs = parse(tmpFile, {
        shouldIncludeMethods: true,
        shouldIncludeInherited: true,
        shouldIncludeQueries: true,
      });

      const allDocs = parseAll(tmpFile, {
        shouldIncludeMethods: true,
        shouldIncludeInherited: true,
        shouldIncludeQueries: true,
      });

      const lintResult = lint(allDocs);
      const stats = computeStats(allDocs);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ docs, allDocs, lintResult, stats }, null, 2));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (req.method === 'GET') {
    try {
      const urlPath = req.url === '/' ? '/index.html' : req.url;
      const decodedPath = decodeURIComponent(urlPath);
      const requestedPath = path.join(__dirname, decodedPath);
      const resolvedPath = path.resolve(requestedPath);

      if (!resolvedPath.startsWith(path.resolve(__dirname))) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      servStatic(res, resolvedPath);
    } catch {
      res.writeHead(400);
      res.end('Bad Request');
    }
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Demo running at http://localhost:${PORT}`);
});
