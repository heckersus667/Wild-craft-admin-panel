// Tiny JSON-file store. Good enough for a handful of admins and an audit log.
// Runs in ONE process only: two panel instances would overwrite each other's files.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const dataDir = path.resolve(
  process.env.DATA_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), '../data'),
);
fs.mkdirSync(dataDir, { recursive: true });

const pending = new Set();
function writeFile(file, data) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, file);
}

export function createStore(name, seed) {
  const file = path.join(dataDir, `${name}.json`);
  let data;
  if (fs.existsSync(file)) {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } else {
    data = seed();
    writeFile(file, data);
  }
  let timer = null;
  const store = {
    data,
    // Batched write (for frequent, low-value changes like mock game data).
    save() {
      clearTimeout(timer);
      pending.add(store);
      timer = setTimeout(store.flush, 200);
    },
    // Immediate write (staff accounts, audit log).
    flush() {
      clearTimeout(timer);
      pending.delete(store);
      writeFile(file, data);
    },
  };
  return store;
}

// Don't lose batched writes on shutdown.
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    for (const s of [...pending]) s.flush();
    process.exit(0);
  });
}

export const newId = (prefix) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
