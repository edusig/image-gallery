const http = require('http');
const fs = require('fs');
const url = require('url');
const path = require('path');
const os = require('os');
const { fdir } = require('fdir');

const argDir = process.argv[2];
const rootDir = path.resolve(__dirname, argDir ?? '.');

const extToMimeDict = {
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  git: 'image/gif',
  webp: 'image/webp',
};

const jsonReplacer = (_, v) => {
  if (v instanceof Map) {
    return Array.from(v.values()).sort((a, b) => {
      return a.name.localeCompare(b.name, 'en', { numeric: true });
    });
  }
  return v;
};

/**
 *
 * @param {string} root
 * @param {number} depth
 */
const dirWalk = async (currentDir, depth = 2) => {
  const root = path.join(rootDir, currentDir);
  const dirs = await new fdir()
    .crawlWithOptions(root, {
      filters: [(path) => !path.includes('.DS_Store')],
      maxDepth: depth,
      relativePaths: true,
    })
    .withPromise();
  const tree = dirs.reduce((acc, it) => {
    const dir = path.dirname(it);
    const file = path.basename(it);
    const parts = dir.split(path.sep);
    let current = acc;
    parts.forEach((it, idx) => {
      const resolved = parts.slice(0, idx + 1).join(path.sep);
      if (!current.has(resolved)) {
        current.set(resolved, {
          name: it,
          files: idx >= parts.length - 1 ? [] : new Map(),
          fullPath: resolved,
        });
      }
      current = current.get(resolved).files;
    });
    current.push(file);
    return acc;
  }, new Map());
  return tree;
};

/**
 *
 * @param {http.ServerResponse} res
 */
const listDirs = async (res) => {
  const dirs = await dirWalk('.');
  res.writeHead(200);
  res.end(JSON.stringify({ count: dirs.length, data: dirs }, jsonReplacer));
};

/**
 *
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
const download = async (req, res) => {
  if (req.url.startsWith('/favicon.ico')) return res.end();
  const subpath = path.join(rootDir, decodeURIComponent(req.url));
  try {
    const stat = await fs.promises.lstat(subpath);
    const ext = path.extname(subpath).replace('.', '');
    const mime = extToMimeDict[ext];
    res.writeHead(200, {
      'Content-Type': mime,
      'Content-Length': stat.size,
    });
    const stream = fs.createReadStream(subpath);
    stream.pipe(res);
  } catch (e) {
    console.error(e);
    res.writeHead(404);
    return res.end();
  }
};

/**
 *
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
const requestListener = async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  if (parsedUrl.pathname.startsWith('/api')) {
    return await listDirs(res);
  }
  return await download(req, res);
};

const server = http.createServer(requestListener);
server.listen(9090);
console.log('listening on port 9090');
console.log('serving files from', rootDir);

const localIp = Object.values(os.networkInterfaces())
  .flat()
  .find((it) => it.family === 'IPv4' && it.address.startsWith('192.168')).address;
const serverUrl = `http://${localIp}:9090`;
console.log(`Server url:\n${serverUrl}`);
