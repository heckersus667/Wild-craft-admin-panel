// Tiny JSON-file store. Good enough for a handful of admins and an audit log.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data');
fs.mkdirSync(dataDir, { recursive: true });

export function createStore(name, seed) {
  const file = path.join(dataDir, `${name}.json`);
  let data;
  if (fs.existsSync(file)) {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } else {
    data = seed();
    fs.writeFileSync(file, JSON.stringify(data));
  }
  let timer = null;
  return {
    data,
    save() {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const tmp = file + '.tmp';
        fs.writeFileSync(tmp, JSON.stringify(data));
        fs.renameSync(tmp, file);
      }, 200);
    },
  };
}

export const newId = (prefix) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
