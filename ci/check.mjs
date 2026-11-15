// Oktanote CI — bağımlılıksız statik doğrulama
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
let fail = 0;
const ok = (name, cond, extra = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) fail++;
};

const js = readdirSync(root).filter(f => f.endsWith('.js') && f !== 'serve.py');
for (const f of js) {
  try { execFileSync(process.execPath, ['--check', join(root, f)], { stdio: 'pipe' }); ok('syntax ' + f, true); }
  catch (e) { ok('syntax ' + f, false, String(e.stderr || e).slice(0, 200)); }
}

const manifest = JSON.parse(readFileSync(join(root, 'manifest.webmanifest'), 'utf8'));
ok('manifest name', manifest.name === 'Oktanote');
ok('manifest id/start_url/scope', manifest.id === './' && manifest.start_url === './' && manifest.scope === './');

const settings = readFileSync(join(root, 'settings.js'), 'utf8');
const sw = readFileSync(join(root, 'sw.js'), 'utf8');
const appVer = (settings.match(/APP_VERSION = '([^']+)'/) || [])[1];
const cacheVer = (sw.match(/CACHE_VERSION = '([^']+)'/) || [])[1];
ok('version match', appVer && appVer === cacheVer, appVer + ' / ' + cacheVer);
ok('OCR cache preserved', /OCR_VERSION = '6\.0\.0'/.test(sw));

const shellBlock = (sw.match(/const APP_SHELL = \[([\s\S]*?)\];/) || [])[1] || '';
const shell = [...shellBlock.matchAll(/'\.\/([^']+)'/g)].map(m => m[1]);
const missing = shell.filter(f => f !== './' && !existsSync(join(root, f)));
ok('APP_SHELL files exist', missing.length === 0, missing.join(', '));

let fuelio = [];
for (const f of readdirSync(root)) {
  if (!/\.(js|html|css|webmanifest|md|txt)$/.test(f)) continue;
  if (/fuelio/i.test(readFileSync(join(root, f), 'utf8'))) fuelio.push(f);
}
ok('no third-party product refs', fuelio.length === 0, fuelio.join(', '));

process.exit(fail ? 1 : 0);
