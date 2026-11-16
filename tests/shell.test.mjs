// Verificări statice pentru Etapa 1 (scheletul vizual):
// header 56 px, sidebar pe 6 categorii, Acasă, back-to-top, mod Concentrare,
// tokeni verzi + Inter, drawer. Rulează: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { html, css, js } from './helpers/bundle.mjs';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const fonts = readFileSync(join(DIR, 'fonts.css'), 'utf8');

function includes(haystack, needle, label) {
  assert.ok(haystack.includes(needle), `${label}: lipsește „${needle}”`);
}

const TAB_IDS = ['inflatie', 'dobanda', 'compusa', 'di', 'regula72', 'timp', 'nuam', 'buget',
  'fond', 'sanatate', 'randament', 'profit', 'cost', 'suma', 'oportunitate', 'dca', 'curs',
  'diversificare', 'asigurari', 'stres', 'datorii', 'pensie', 'impozitare', 'biase'];

test('Sidebar — 6 categorii, toate cu buton pliabil și listă de taburi', () => {
  const groups = [...html.matchAll(/<div class="side-group" data-cat="([a-z]+)">[\s\S]*?<\/div>\s*<\/div>/g)];
  assert.equal(groups.length, 6, `categorii: ${groups.length}`);
  assert.deepEqual(groups.map((m) => m[1]),
    ['fundamente', 'buget', 'investitii', 'risc', 'impozite', 'psihologie']);
  for (const m of groups) {
    assert.match(m[0], /class="side-cat"[^>]*aria-expanded="true"[^>]*aria-controls="cat-/,
      `categorie fără toggle: ${m[1]}`);
    assert.match(m[0], /class="side-items" id="cat-/, `categorie fără listă: ${m[1]}`);
  }
});

test('Sidebar — cele 24 de taburi sunt butoane cu id și aria-controls corelate', () => {
  const sideTabs = [...html.matchAll(
    /<button type="button" class="tab side-tab" id="tab-([a-z0-9]+)" role="tab"\s*aria-controls="panel-\1" aria-selected="(true|false)">/g)];
  assert.equal(sideTabs.length, 24, `taburi în sidebar: ${sideTabs.length}`);
  assert.deepEqual(sideTabs.map((m) => m[1]), TAB_IDS);
  assert.equal(sideTabs.filter((m) => m[2] === 'true').length, 1, 'un singur tab activ inițial');
});

test('Acasă — panoul există, are 6 carduri de categorii și 3 simulatoare', () => {
  assert.match(html, /<section id="panel-acasa" class="home-panel"/);
  const home = html.split('id="panel-acasa"')[1];
  assert.equal((home.match(/class="home-card"/g) || []).length, 6, 'carduri de categorie');
  assert.equal((home.match(/class="quick-card"/g) || []).length, 3, 'simulatoare rapide');
  for (const id of ['q-compusa-suma', 'q-r72-rata', 'q-suma-tinta']) {
    assert.ok(home.includes(`id="${id}"`), `lipsește #${id}`);
  }
  // Acasă NU este numărăt ca tab-panel (nu are clasa `tab-panel`).
  assert.ok(!/<section id="panel-acasa" class="tab-panel/.test(html));
});

test('Header — 56 px, brand, focus, temă, reset, CSV, buton meniu', () => {
  assert.match(html, /<header class="app-header">/);
  for (const id of ['brand', 'focus-toggle', 'theme-toggle', 'reset-all', 'export-csv', 'menu-btn']) {
    assert.ok(html.includes(`id="${id}"`), `lipsește #${id}`);
  }
  assert.match(html, /id="focus-toggle"[^>]*aria-pressed="false"/);
  assert.match(html, /id="menu-btn"[^>]*aria-controls="sidebar"/);
  includes(css, 'height: 56px', 'header 56 px');
  includes(css, '.app-header', 'stile header');
});

test('Back-to-top — buton fix în colțul din dreapta jos', () => {
  assert.match(html, /<button class="back-to-top" id="back-to-top"[^>]*aria-label="Sus"/);
  includes(css, 'position: fixed', 'back-to-top fixed');
  includes(css, 'right: 20px', 'back-to-top dreapta');
  includes(css, 'bottom: 20px', 'back-to-top jos');
  includes(js, 'function initBackToTop', 'inițializare back-to-top');
});

test('Drawer — sidebar pe mobil, cu overlay și focus trap', () => {
  includes(css, '@media (max-width: 1023px)', 'breakpoint mobil');
  includes(css, '.sidebar.is-open', 'stare drawer deschis');
  includes(css, '.sidebar-overlay', 'overlay drawer');
  includes(js, 'function initDrawer', 'inițializare drawer');
  includes(js, 'aria-modal', 'drawer aria-modal');
});

test('Mod Concentrare — toggle în header + scurtătură F', () => {
  includes(js, 'function applyFocus', 'applyFocus');
  includes(js, "classList.toggle('is-focus', on)", 'clasa is-focus');
  includes(js, "event.key !== 'f' && event.key !== 'F'", 'scurtătură F');
  includes(css, '.is-focus .sidebar', 'stile concentrare');
});

test('Tokeni — paletă verde „registru", Inter, cifre tabulare, ritm 8 px', () => {
  includes(css, '--accent: #0b7a55', 'accent verde');
  includes(css, '--bg: #f6f7f4', 'fundal hârtie');
  includes(css, "--font: 'Inter'", 'font Inter');
  includes(css, 'font-variant-numeric: tabular-nums', 'cifre tabulare');
  includes(css, '--space-2: 8px', 'ritm 8 px');
  includes(css, '--radius: 12px', 'colțuri 12 px');
});

test('Inter self-hosted — fonts.css cu latin-ext (diacritice) și fișiere woff2 prezente', () => {
  assert.equal((fonts.match(/@font-face/g) || []).length, 8, '8 blocuri @font-face');
  includes(fonts, 'inter-latin-ext.woff2', 'subset latin-ext');
  includes(fonts, 'inter-latin.woff2', 'subset latin');
  includes(fonts, 'U+0100-02BA', 'acoperă diacriticele');
  for (const f of ['fonts/inter-latin.woff2', 'fonts/inter-latin-ext.woff2']) {
    assert.ok(existsSync(join(DIR, f)), `lipsește ${f}`);
  }
  // Fontul e linked din index.html.
  includes(html, 'href="fonts.css"', 'link fonts.css');
});

test('app.js — TABS are 24 de id-uri, CATEGORIES acoperă toate, activateHome e definit', () => {
  const tabsLine = js.match(/const TABS = \[([^\]]+)\]/)[1];
  const ids = [...tabsLine.matchAll(/'([a-z0-9]+)'/g)].map((m) => m[1]);
  assert.equal(ids.length, 24, `TABS: ${ids.length}`);
  assert.deepEqual(ids, TAB_IDS);
  assert.match(js, /const CATEGORIES = \[/, 'CATEGORIES');
  assert.ok(js.includes("id: 'fundamente'") && js.includes("id: 'psihologie'"), 'categorii definite');
  for (const fn of ['function activateHome', 'function initShell', 'function renderQuick', 'function updateChrome']) {
    assert.ok(js.includes(fn), `lipsește ${fn}`);
  }
});
