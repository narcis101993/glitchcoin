// Verificări pentru Etapa 5 (identitate și eliminarea referințelor la Excel):
// titlu + meta description pe categorii · secțiunea „Despre" · monogramă/favicon ·
// checklistul §6.4 din REDESIGN-PROPUNERE. Rulează: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { html, css, js } from './helpers/bundle.mjs';
import { gc } from './helpers/bundle.mjs';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const readme = readFileSync(join(DIR, 'README.md'), 'utf8');
const faviconSvg = readFileSync(join(DIR, 'favicon.svg'), 'utf8');

function includes(haystack, needle, label) {
  assert.ok(haystack.includes(needle), `${label}: lipsește „${needle}”`);
}

test('Checklist §6.4 — zero „Excel” în textul vizibil (index.html)', () => {
  const faraComentarii = html.replace(/<!--[\s\S]*?-->/g, '');
  const lower = faraComentarii.toLowerCase();
  for (const termen of ['excel', 'xlsx', 'd9']) {
    assert.ok(!lower.includes(termen), `index.html: găsit „${termen}” în textul vizibil`);
  }
});

test('Checklist §6.4 — zero „Excel” în app.js (inclusiv comentarii)', () => {
  assert.ok(!js.toLowerCase().includes('excel'), 'app.js: găsit „Excel”');
});

test('Checklist §6.4 — zero path-uri personale și zero „Excel” în README', () => {
  assert.ok(!readme.includes('/Users/narciscriveanu'), 'README: path personal');
  assert.ok(!readme.toLowerCase().includes('excel'), 'README: „Excel”');
  assert.ok(!readme.toLowerCase().includes('xlsx'), 'README: „xlsx”');
});

test('Titlu și meta description — acoperă cele 6 categorii', () => {
  assert.match(html, /<title>GlitchCoin — Calculatoare pentru a înțelege banii<\/title>/);
  const meta = html.match(/<meta name="description" content="([^"]+)"/);
  assert.ok(meta, 'meta description lipsește');
  const desc = meta[1].toLowerCase();
  for (const cat of ['fundamentele banilor', 'bugetul de zi cu zi', 'investiții',
    'risc și protecție', 'impozite și viitor', 'psihologia banilor']) {
    assert.ok(desc.includes(cat), `meta description: lipsește categoria „${cat}”`);
  }
});

test('Secțiunea „Despre” — panou global, link în sidebar, trei carduri', () => {
  includes(html, 'id="panel-despre"', 'panou Despre');
  includes(html, 'id="despre-title"', 'titlu Despre');
  includes(html, 'id="nav-despre"', 'link Despre');
  assert.equal((html.match(/class="about-card"/g) || []).length, 3, 'carduri Despre');
  assert.equal(gc.GLOBAL_PANELS.length, 4);
  assert.ok(gc.GLOBAL_IDS.includes('despre'));
  assert.equal(gc.parseHash('#despre').type, 'global');
  includes(css, '.about-card', 'stil about-card');
});

test('Monogramă și favicon — monograma GlitchCoin, PNG-uri prezente', () => {
  assert.ok(faviconSvg.includes('GlitchCoin'), 'favicon: aria-label');
  assert.ok(faviconSvg.includes('#0b7a55'), 'favicon: accent verde');
  assert.ok(!faviconSvg.includes('linearGradient'), 'favicon: gradientul vechi');
  for (const f of ['favicon.svg', 'favicon.png', 'favicon-180.png']) {
    assert.ok(existsSync(join(DIR, f)), `lipsește ${f}`);
  }
  includes(html, 'href="favicon.svg"', 'link favicon.svg');
  includes(html, 'href="favicon.png"', 'link favicon.png');
  includes(html, 'href="favicon-180.png"', 'link apple-touch-icon');
});

test('Rescrierea textelor — formulă explicită în loc de „D9”', () => {
  assert.equal((html.match(/Resetează la valorile implicite/g) || []).length, 2, 'butoane reset');
  includes(html, 'adică rata lunară care, compusă, ajunge la țintă', 'notă Sumă dorită');
  includes(html, '(baza e suma plătită, nu doar prețul)', 'notă Costul mediu');
  includes(html, 'Dobânda e netă de impozit (10%).', 'notă Nu am bani');
  assert.ok(!html.includes('D9'), 'D9 a rămas');
});
