// Verificări pentru Etapa 3 (interactivitate):
// I1 căutare din primele 3 caractere · I4 mod pas cu pas (🪙) ·
// I5 centru de alerte · I7 copiere rezultat · I8 animații cu
// prefers-reduced-motion. Rulează: node --test tests/
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

/* Numele taburilor și categoriile, extrase din HTML-ul real. */
const NAMES = {};
[...html.matchAll(/<button type="button" class="tab side-tab" id="tab-([a-z0-9]+)"[^>]*>([^<]+)<\/button>/g)]
  .forEach((m) => { NAMES[m[1]] = m[2].trim(); });

const CAT_NAMES = {};
const TAB_CATEGORY = {};
[...html.matchAll(/<div class="side-group" data-cat="([a-z]+)">([\s\S]*?)<\/div>\s*<\/div>/g)]
  .forEach((m) => {
    const name = (m[2].match(/class="side-cat-name">([^<]+)</) || [])[1];
    CAT_NAMES[m[1]] = name ? name.trim() : m[1];
    [...m[2].matchAll(/id="tab-([a-z0-9]+)"/g)].forEach((t) => { TAB_CATEGORY[t[1]] = m[1]; });
  });

const SEARCH_ITEMS = TAB_IDS.map((id) => ({
  id, name: NAMES[id], category: CAT_NAMES[TAB_CATEGORY[id]] || '',
}));

/* ── I1 · Căutare din primele 3 caractere ───────────────── */

test('Căutare — găsește orice tab din primele 3 caractere (24/24)', () => {
  assert.equal(Object.keys(NAMES).length, 24, 'număr de nume extrase');
  TAB_IDS.forEach((id) => {
    const q = gc.normalizeText(NAMES[id]).slice(0, 3);
    const rezultate = gc.filterSearchItems(SEARCH_ITEMS, q);
    assert.ok(rezultate.some((r) => r.id === id),
      `${id}: „${q}” nu găsește tabul (nume: „${NAMES[id]}”)`);
  });
});

test('Căutare — diacritic-insensibilă și prioritate prefix > conținut > categorie', () => {
  const inflatie = gc.filterSearchItems(SEARCH_ITEMS, 'Inflație');
  assert.ok(inflatie.length >= 1, '„Inflație” găsește tabul Inflație');
  assert.equal(inflatie[0].id, 'inflatie', 'prefixul are prioritate');

  const dobanda = gc.filterSearchItems(SEARCH_ITEMS, 'Dobânda');
  assert.ok(dobanda.some((r) => r.id === 'compusa'), '„Dobânda” găsește „Dobânda compusă”');

  // Categoria e ultimul criteriu: „investitii” nu e prefix de nume.
  const inv = gc.filterSearchItems(SEARCH_ITEMS, 'investitii');
  assert.equal(inv.length, 8, '7 taburi din Investiții + „Impozitare pe investiții”');
  assert.equal(inv[0].id, 'impozitare', 'conținutul numelui bate categoria');

  assert.equal(gc.filterSearchItems(SEARCH_ITEMS, '').length, 24, 'goală = toate');
  assert.equal(gc.filterSearchItems(SEARCH_ITEMS, 'zzzz').length, 0, 'fără rezultate');
});

/* ── I5 · Centru de alerte ───────────────────────────────── */

test('Centru de alerte — cele 10 containere cu alarme sunt mapate', () => {
  const containers = [...html.matchAll(/id="([a-z]{2}-alerte)" class="alerts"/g)].map((m) => m[1]);
  assert.deepEqual(containers.sort(), [
    'as-alerte', 'bg-alerte', 'cs-alerte', 'dc-alerte', 'dt-alerte',
    'dv-alerte', 'pn-alerte', 'sf-alerte', 'st-alerte', 'tx-alerte',
  ].sort());
  for (const c of containers) includes(js, `'${c}':`, `mapare ${c}`);
});

test('collectAlerts — adună doar alertele non-ok, în ordinea taburilor', () => {
  const items = gc.collectAlerts({
    buget: [{ nivel: 'warn', text: 'A' }, { nivel: 'ok', text: 'B' }],
    sanatate: [{ nivel: 'bad', text: 'C' }],
    datorii: [],
  });
  assert.equal(JSON.stringify(items.map((i) => [i.tabId, i.nivel, i.text])),
    JSON.stringify([['buget', 'warn', 'A'], ['sanatate', 'bad', 'C']]));
});

test('Centru de alerte — mark-up accesibil și legătură din renderAlerts', () => {
  assert.match(html, /id="alerts-trigger"[^>]*aria-haspopup="dialog"[^>]*aria-controls="alerts-overlay"/);
  assert.match(html, /<div class="alerts-overlay" id="alerts-overlay" hidden>/);
  assert.match(html, /class="alerts-dialog" role="dialog" aria-modal="true" aria-labelledby="alerts-title"/);
  assert.match(html, /id="alerts-list"/);
  assert.match(html, /id="alerts-empty" hidden/);
  includes(js, 'function collectAlerts', 'collectAlerts');
  includes(js, 'function updateAlertCenter', 'updateAlertCenter');
  includes(js, 'function renderAlertList', 'renderAlertList');
  includes(js, 'function initAlerts', 'initAlerts');
  includes(js, "ALERTS_BY_TAB[tabId] = alertes.map", 'renderAlerts alimentează centrul');
  includes(css, '.alerts-badge', 'stil badge alerte');
  includes(css, '.alert-item', 'stil element alertă');
  includes(css, '.side-cat-badge', 'badge pe categorie');
});

/* ── I4 · Mod pas cu pas ─────────────────────────────────── */

test('Pas cu pas — câte un pas per câmp, cu text din etichetă', () => {
  const fields = [
    { id: 'a', label: 'Venit lunar net (lei)', tag: 'input', type: 'number' },
    { id: 'b', label: 'Scenariu', tag: 'select', type: '' },
  ];
  const steps = gc.buildStepsFromFields(fields);
  assert.equal(steps.length, 2);
  assert.equal(steps[0].sel, '#a');
  assert.equal(steps[0].text, 'Introdu „Venit lunar net (lei)”.');
  assert.equal(steps[1].text, 'Alege „Scenariu”.');
});

test('Pas cu pas — override-ul de instrucțiune are prioritate', () => {
  const f = { id: 'bg-venit', label: 'Venit lunar net (lei)', tag: 'input', type: 'number' };
  assert.match(gc.stepTextFor(f), /de la el pleacă toate celelalte câmpuri/);
});

test('Pas cu pas — banner vizibil cu iconița 🪙 și controale din tastatură', () => {
  assert.match(html, /id="step-trigger"[^>]*aria-pressed="false"/);
  assert.match(html, /<div class="step-banner" id="step-banner"[^>]*hidden>/);
  assert.match(html, /class="step-coin" aria-hidden="true">🪙<\/span>/);
  assert.match(html, /id="step-text"/);
  assert.match(html, /id="step-prev"/);
  assert.match(html, /id="step-next"/);
  assert.match(html, /id="step-stop"/);
  includes(js, 'function startStepMode', 'startStepMode');
  includes(js, 'function stopStepMode', 'stopStepMode');
  includes(js, 'function goStep', 'goStep');
  includes(js, 'function initStepMode', 'initStepMode');
  includes(js, 'stepIndex = (stepIndex + dir + stepList.length) % stepList.length', 'wrap anterior/următor');
  includes(js, "event.key === 'Escape'", 'Esc oprește modul');
  includes(css, '.step-banner', 'stil banner');
  includes(css, '.field.is-step-target', 'evidențiere câmp');
  includes(css, '.step-chip', 'ecuță pas');
});

/* ── I7 · Copiere rezultat ────────────────────────────────── */

test('Copiere rezultat — buton pe fiecare stat-value, cu feedback', () => {
  includes(js, 'function initCopyButtons', 'initCopyButtons');
  includes(js, 'function copyStatValue', 'copyStatValue');
  includes(js, 'navigator.clipboard.writeText', 'Clipboard API');
  includes(js, 'function copyFallback', 'fallback execCommand');
  assert.match(html, /id="copy-live" aria-live="polite"/);
  includes(css, '.copy-btn', 'stil buton copiere');
  includes(css, '.copy-btn.is-copied', 'stare copiat');
});

/* ── I8 · Animații discrete ──────────────────────────────── */

test('Animații — count-up, tranziție de panou, prefers-reduced-motion', () => {
  includes(js, 'function parseFormattedNumber', 'parseFormattedNumber');
  includes(js, 'function animateStatValue', 'animateStatValue');
  includes(js, 'function initCountUp', 'initCountUp');
  includes(js, "matchMedia('(prefers-reduced-motion: reduce)')", 'verghe redusă în JS');
  includes(css, '@media (prefers-reduced-motion: reduce)', 'verghe redusă în CSS');
  includes(css, '@keyframes panel-in', 'tranziție panou');
  includes(css, '@keyframes badge-pulse', 'puls badge');
});

test('parseFormattedNumber — formate ro-RO (mii, zecimale, sufixe)', () => {
  const p = gc.parseFormattedNumber('1.234,56 lei');
  assert.equal(p.value, 1234.56);
  assert.equal(p.decimals, 2);
  assert.equal(p.prefix, '');
  assert.equal(p.suffix, ' lei');

  const proc = gc.parseFormattedNumber('12,34%');
  assert.equal(proc.value, 12.34);
  assert.equal(proc.decimals, 2);
  assert.equal(proc.suffix, '%');

  assert.equal(gc.parseFormattedNumber('-1.234,56 lei').value, -1234.56);
  assert.equal(gc.parseFormattedNumber('1.234').value, 1234, 'punct = mii în ro-RO');
  assert.equal(gc.parseFormattedNumber('1.234').decimals, 0);
  assert.equal(gc.parseFormattedNumber('1.234.567').value, 1234567);
  assert.equal(gc.parseFormattedNumber('12,5x').value, 12.5);
  assert.equal(gc.parseFormattedNumber('—'), null, 'valoare vidă');
  assert.equal(gc.parseFormattedNumber(''), null);
});

test('Tipărirea ascunde noile controale interactive', () => {
  const printBlock = css.split('@media print')[1] || '';
  for (const sel of ['.alerts-overlay', '.step-banner', '.step-chip', '.copy-btn', '#copy-live']) {
    includes(printBlock, sel, `print ascunde ${sel}`);
  }
});
