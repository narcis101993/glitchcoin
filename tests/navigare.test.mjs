// Verificări pentru Etapa 2 (navigare pe categorii):
// hash `#categorie/tab` cu fallback `#tab`, săgeți Precedent/Următor,
// breadcrumb clickabil, căutare ⌘K și badge de categorie.
// Rulează: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { html, css, js } from './helpers/bundle.mjs';
import { gc } from './helpers/bundle.mjs';

const TAB_IDS = ['inflatie', 'dobanda', 'compusa', 'di', 'regula72', 'timp', 'nuam', 'buget',
  'fond', 'sanatate', 'randament', 'profit', 'cost', 'suma', 'oportunitate', 'dca', 'curs',
  'diversificare', 'asigurari', 'stres', 'datorii', 'pensie', 'impozitare', 'biase'];

function includes(haystack, needle, label) {
  assert.ok(haystack.includes(needle), `${label}: lipsește „${needle}”`);
}

/* ── Hash: forma canonică și fallback-ul retro-compatibil ── */

test('parseHash — recunoaște #categorie/tab, #tab (vechi) și #acasa', () => {
  const canon = gc.parseHash('#investitii/randament');
  assert.equal(canon.type, 'tab');
  assert.equal(canon.id, 'randament');

  const fundamente = gc.parseHash('#fundamente/regula72');
  assert.equal(fundamente.type, 'tab');
  assert.equal(fundamente.id, 'regula72');

  const legacyRandament = gc.parseHash('#randament');
  assert.equal(legacyRandament.type, 'tab');
  assert.equal(legacyRandament.id, 'randament');

  const legacyInflatie = gc.parseHash('#inflatie');
  assert.equal(legacyInflatie.type, 'tab');
  assert.equal(legacyInflatie.id, 'inflatie');

  assert.equal(gc.parseHash('#acasa').type, 'home');
});

test('parseHash — hash-uri invalide sau goale dau null', () => {
  assert.equal(gc.parseHash(''), null);
  assert.equal(gc.parseHash('#'), null);
  assert.equal(gc.parseHash('#nimerel'), null);
  assert.equal(gc.parseHash('#investitii/nimerel'), null);
});

test('parseHash — #buget rămâne tabul „Buget 50/30/20" (retro-compatibil)', () => {
  // „buget" e și id de tab și id de categorie: tabul are prioritate,
  // altfel bookmark-urile vechi #buget s-ar pierde.
  const parsed = gc.parseHash('#buget');
  assert.equal(parsed.type, 'tab');
  assert.equal(parsed.id, 'buget');
});

test('hashForTab — scrie forma canonică #categorie/tab', () => {
  assert.equal(gc.hashForTab('inflatie'), '#fundamente/inflatie');
  assert.equal(gc.hashForTab('randament'), '#investitii/randament');
  assert.equal(gc.hashForTab('biase'), '#psihologie/biase');
});

/* ── Săgeți Precedent/Următor ───────────────────────────── */

test('stepTab — se mișcă în categorie, la limită trece o singură categorie', () => {
  // în interiorul categoriei
  assert.equal(gc.stepTab('randament', 1), 'profit');
  assert.equal(gc.stepTab('profit', -1), 'randament');
  // la capătul categoriei: prima/ultima tabă a categoriei următoare/precedentă
  assert.equal(gc.stepTab('regula72', 1), 'timp');
  assert.equal(gc.stepTab('curs', 1), 'diversificare');
  assert.equal(gc.stepTab('timp', -1), 'regula72');
  // wrap complet
  assert.equal(gc.stepTab('biase', 1), 'inflatie');
  assert.equal(gc.stepTab('inflatie', -1), 'biase');
});

test('stepTab — parcurgerea completă vizitează toate cele 24 de taburi, fără sări', () => {
  // TAB_IDS e grupat pe categorii (ordinea din sidebar): dacă stepTab ar
  // săria categorii, șirul nu ar mai acoperi exact această ordine.
  const forward = [];
  let cur = 'inflatie';
  for (let i = 0; i < 24; i++) {
    forward.push(cur);
    cur = gc.stepTab(cur, 1);
  }
  assert.deepEqual(forward, TAB_IDS, 'ordinea parcursului +');
  assert.equal(cur, 'inflatie', 'wrap complet la final');

  const backward = [];
  cur = 'biase';
  for (let i = 0; i < 24; i++) {
    backward.push(cur);
    cur = gc.stepTab(cur, -1);
  }
  assert.deepEqual(backward, [...TAB_IDS].reverse(), 'ordinea parcursului −');
  assert.equal(cur, 'biase', 'wrap complet la început');
});

test('TABS — ordinea e pe categorii (sidebarul e grupat) și acoperă toate categoriile', () => {
  const groups = [...html.matchAll(/<div class="side-group" data-cat="([a-z]+)">[\s\S]*?<div class="side-items" id="cat-\1">([\s\S]*?)<\/div>\s*<\/div>/g)];
  assert.equal(groups.length, 6, 'șase categorii');
  const ids = groups.flatMap((m) => [...m[2].matchAll(/id="tab-([a-z0-9]+)"/g)].map((x) => x[1]));
  assert.deepEqual(ids, TAB_IDS, 'taburile din sidebar în ordinea categoriei');
});

/* ── Breadcrumb, săgeți, căutare, badge — structură ──────── */

test('Breadcrumb + panel-nav — mark-upul există și păstrează accesibilitatea', () => {
  assert.match(html, /<nav class="breadcrumb" aria-label="Breadcrumb">/);
  assert.match(html, /<ol id="breadcrumb-list"><\/ol>/);
  assert.match(html, /<nav class="panel-nav" id="panel-nav" aria-label="Navigare între taburi" hidden>/);
  assert.match(html, /id="prev-tab"[^>]*>\s*<svg[\s\S]*?<\/svg>\s*<span class="visually-hidden">Precedent:<\/span>/);
  assert.match(html, /id="next-tab"[^>]*>\s*<span class="visually-hidden">Următor:<\/span>/);
  includes(js, 'function updatePanelNav', 'updatePanelNav');
  includes(js, 'function initPanelNav', 'initPanelNav');
  includes(js, 'function stepTab', 'stepTab');
});

test('Breadcrumb-ul se generează cu hash canonic pentru categorie', () => {
  includes(js, 'aCat.href = hashForTab(cat.tabs[0]);', 'link categorie canonic');
  includes(js, "breadcrumbList.addEventListener('click'", 'breadcrumb clickabil');
});

test('Căutare ⌘K — declanșator în header și paletă cu dialog accesibil', () => {
  assert.match(html, /id="search-trigger"[^>]*aria-haspopup="dialog"[^>]*aria-controls="search-overlay"/);
  assert.match(html, /<div class="search-overlay" id="search-overlay" hidden>/);
  assert.match(html, /role="dialog" aria-modal="true" aria-labelledby="search-title"/);
  assert.match(html, /id="search-input"[^>]*role="combobox"[^>]*aria-expanded="true"/);
  assert.match(html, /<ul class="search-results" id="search-results" role="listbox"/);
  assert.match(html, /id="search-empty" hidden/);
  includes(js, 'function openSearch', 'openSearch');
  includes(js, 'function closeSearch', 'closeSearch');
  includes(js, 'function initSearch', 'initSearch');
  includes(js, 'function filteredSearch', 'filteredSearch');
  includes(js, "event.metaKey || event.ctrlKey", 'scurtătură ⌘K / Ctrl+K');
  includes(css, '.header-search', 'stil header-search');
  includes(css, '.search-overlay', 'stil paletă');
});

test('Badge de categorie — injectat din JS în panoul fiecărui tab', () => {
  includes(js, 'function renderCategoryBadges', 'renderCategoryBadges');
  includes(js, "badge.className = 'cat-badge'", 'clasa cat-badge');
  includes(css, '.cat-badge', 'stil cat-badge');
  includes(css, '.cat-badge-count', 'contor pe badge');
});

test('Cardurile de pe Acasă folosesc hash-ul canonic #categorie/tab', () => {
  const hrefs = [...html.matchAll(/<a class="home-card" href="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(hrefs, [
    '#fundamente/inflatie',
    '#buget/timp',
    '#investitii/randament',
    '#risc/diversificare',
    '#impozite/pensie',
    '#psihologie/biase',
  ]);
  for (const href of hrefs) {
    assert.match(href, /^#[a-z]+\/[a-z0-9]+$/, `hash canonic: ${href}`);
  }
});

test('Legăturile cu prefill între taburi sunt intacte', () => {
  includes(js, 'function goToTab', 'goToTab');
  includes(js, 'activateTab(id, { focusPanel: true, history: \'push\' })', 'goToTab → activateTab push');
  includes(js, 'TAB_RENDERERS', 'renderer-e pentru prefill');
  // Hash-ul canonic nu interferă cu săgețile din panouri.
  includes(js, 'window.addEventListener(\'hashchange\'', 'hashchange ascultă');
});

test('Tipărirea ascunde panoul de navigare și paleta de căutare', () => {
  const printBlock = css.split('@media print')[1] || '';
  includes(printBlock, '.panel-nav', 'print ascunde panel-nav');
  includes(printBlock, '.search-overlay', 'print ascunde paleta');
});

test('Normalizarea căutării ignoră diacriticele', () => {
  assert.equal(gc.normalizeText('Țintă și ĂÂÎȘȚ'), 'tinta si aaist');
  assert.equal(gc.normalizeText('  Dobânda   Compusă '), 'dobanda compusa');
});
