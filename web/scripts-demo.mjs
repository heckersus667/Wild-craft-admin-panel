// Builds web/dist-demo into ONE self-contained HTML file: web/wildcraft-admin-demo.html
import fs from 'node:fs';
import path from 'node:path';
const dir = 'dist-demo';
let html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
html = html.replace(/<script type="module" crossorigin src="\/?([^"]+)"><\/script>/, (_, f) =>
  `<script type="module">${fs.readFileSync(path.join(dir, f), 'utf8').replace(/<\/script/g, '<\\/script')}</script>`);
html = html.replace(/<link rel="stylesheet" crossorigin href="\/?([^"]+)">/, (_, f) => `<style>${fs.readFileSync(path.join(dir, f), 'utf8')}</style>`);
fs.writeFileSync('wildcraft-admin-demo.html', html);
console.log('wrote web/wildcraft-admin-demo.html', (html.length / 1024).toFixed(0) + ' KB');
