import express from 'express';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const dist = fileURLToPath(new URL('../../app/dist/', import.meta.url));
const app = express();
app.use(express.static(dist));
app.get('/{*path}', (_req, res) => res.sendFile(join(dist, 'index.html')));
app.listen(8081, '127.0.0.1');
