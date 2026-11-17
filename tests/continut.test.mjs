// Verificări pentru Etapa 4 (conținut educațional):
// 24 de lead-uri noi · „De ce contează pentru tine” · surse inline ·
// glosar (40) · FAQ (12) · mituri (8) · fapte (12) · disclaimer ·
// panouri globale în sidebar + căutare. Rulează: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { html, css, js, data } from './helpers/bundle.mjs';
import { gc } from './helpers/bundle.mjs';

const TAB_IDS = ['inflatie', 'dobanda', 'compusa', 'di', 'regula72', 'timp', 'nuam', 'buget',
  'fond', 'sanatate', 'randament', 'profit', 'cost', 'suma', 'oportunitate', 'dca', 'curs',
  'diversificare', 'asigurari', 'stres', 'datorii', 'pensie', 'impozitare', 'biase'];

function includes(haystack, needle, label) {
  assert.ok(haystack.includes(needle), `${label}: lipsește „${needle}”`);
}

/* ── Extragerea panourilor ─────────────────────────────── */
const starts = [...html.matchAll(/<section id="panel-([a-z0-9]+)" class="tab-panel[^"]*"[^>]*>/g)];
const PANELS = {};
starts.forEach((m, i) => {
  const end = i + 1 < starts.length ? starts[i + 1].index : html.indexOf('<nav class="panel-nav"');
  PANELS[m[1]] = html.slice(m.index, end);
});

function leadOf(panelHtml) {
  const m = panelHtml.match(/<p class="lead"[^>]*>([\s\S]*?)<\/p>/);
  return m ? m[1] : '';
}

function sectionOf(panelHtml, className) {
  const m = panelHtml.match(new RegExp(`<div class="${className}"[\\s\\S]*?<\\/div>`));
  return m ? m[0] : '';
}

/* ── 1. Lead-uri noi ────────────────────────────────────── */
const EXPECTED_LEAD = {
  inflatie: 'același coș de cumpărături',
  timp: 'Cât timp trebuie să muncești',
  dobanda: 'prețul banilor împrumutați',
  compusa: 'La compunere',
  randament: 'cu cât s-a multiplicat banul investit',
  profit: 'diferența dintre prețul de vânzare',
  cost: 'media ponderată a tuturor achizițiilor',
  suma: 'Stabilește o sumă țintă',
  nuam: 'scenariu avansat de flux de numerar',
  di: 'randamentul real spune ce poți cumpăra mai mult',
  regula72: 'O scurtătură mentală cu 500 de ani',
  fond: 'Rezerva de 3–6 luni',
  oportunitate: 'Fiecare alegere are un preț ascuns',
  buget: 'Regula 50/30/20 împarte venitul lunar net',
  sanatate: 'Patru indicatori care îți dau o imagine de ansamblu',
  diversificare: 'Nu pune toți banii într-o singură acțiune',
  asigurari: 'transferul unui risc către altcineva',
  stres: 'Un calcul optimist spune cât poți câștiga',
  pensie: 'Pilonul III e pensie facultativă',
  impozitare: 'Câți bani îți ia statul din fiecare tip de venit',
  datorii: 'O datorie nu e automat',
  dca: 'Scalarea în timp (DCA',
  curs: 'două surse de randament',
  biase: 'reflexelor',
};

test('Lead-uri — toate cele 24 de taburi au text nou (fără mesaje interne)', () => {
  assert.equal(Object.keys(PANELS).length, 24, 'panouri extrase');
  for (const id of TAB_IDS) {
    const lead = leadOf(PANELS[id]);
    assert.ok(lead, `${id}: lipsește lead-ul`);
    includes(lead, EXPECTED_LEAD[id], `lead ${id}`);
  }
});

test('Lead-uri — zero referințe la Excel / xlsx / celule în textul vizibil', () => {
  for (const id of TAB_IDS) {
    const lead = leadOf(PANELS[id]).toLowerCase();
    for (const termen of ['excel', 'xlsx', 'd9', 'tabul ascuns', 'glitchcoin.xlsx']) {
      assert.ok(!lead.includes(termen), `${id}: lead-ul menționează „${termen}”`);
    }
  }
});

/* ── 2. „De ce contează pentru tine” ────────────────────── */
test('„De ce contează pentru tine” — bloc recurent la finalul fiecărui tab', () => {
  assert.equal((html.match(/class="why-card"/g) || []).length, 24, 'număr de blocuri');
  for (const id of TAB_IDS) {
    assert.ok(PANELS[id].includes('class="why-card"'), `${id}: lipsește why-card`);
    includes(PANELS[id], 'De ce contează pentru tine', `titlu ${id}`);
  }
});

/* ── 3. Surse inline ────────────────────────────────────── */
test('Surse — fiecare tab are bloc cu linkuri externe valide', () => {
  // 24 de taburi + un bloc „Toate sursele” în pagina Despre
  assert.equal((html.match(/class="panel-sources"/g) || []).length, 25, 'număr de blocuri');
  for (const id of TAB_IDS) {
    const block = sectionOf(PANELS[id], 'panel-sources');
    assert.ok(block, `${id}: lipsește .panel-sources`);
    const links = [...block.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    assert.ok(links.length >= 1, `${id}: fără linkuri`);
    for (const href of links) {
      assert.match(href, /^https?:\/\//, `${id}: URL invalid ${href}`);
      assert.ok(!href.includes(' '), `${id}: URL cu spații ${href}`);
    }
  }
});

/* ── 3b. Pagina „Despre” — toate sursele, linkuri precise ── */
test('Despre — conține toate sursele aplicației, cu linkuri precise și sigure', () => {
  const start = html.indexOf('<section id="panel-despre"');
  assert.ok(start >= 0, 'lipsește panel-despre');
  const end = html.indexOf('</section>', start);
  const panel = html.slice(start, end);
  const block = sectionOf(panel, 'panel-sources');
  assert.ok(block, 'Despre: lipsește blocul cu surse');

  const norm = (u) => u.replace(/&amp;/g, '&');
  const despreUrls = [...block.matchAll(/href="(https?:\/\/[^"]+)"/g)].map((m) => m[1]);
  const set = new Set(despreUrls.map(norm));
  assert.ok(set.size >= 50, `Despre: doar ${set.size} surse unice`);
  for (const url of despreUrls) {
    const at = block.indexOf(`href="${url}"`);
    const tag = block.slice(Math.max(0, at - 3), at + url.length + 60);
    assert.match(tag, /target="_blank"/, `fără target="_blank": ${url}`);
    assert.match(tag, /rel="noopener"/, `fără rel="noopener": ${url}`);
  }

  // Nicio sursă nu mai trimite la homepage-ul site-ului.
  const homepages = ['https://www.bnr.ro/', 'https://www.bvb.ro/', 'https://www.asfromania.ro/',
    'https://infocons.ro/', 'https://www.anpc.ro/', 'https://www.investor.gov/',
    'https://legislatie.just.ro/', 'https://www.insse.ro/'];
  for (const hp of homepages) {
    assert.ok(!html.includes(`href="${hp}"`), `link către homepage în HTML: ${hp}`);
    assert.ok(!js.includes(`href="${hp}"`), `link către homepage în JS: ${hp}`);
    assert.ok(!data.trimEnd().endsWith(hp), `link către homepage în data.js: ${hp}`);
  }

  // Fiecare URL folosit în aplicație apare și în pagina Despre.
  const appUrls = new Set();
  const add = (u) => appUrls.add(norm(u));
  for (const m of html.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
    if (m.index >= start && m.index <= end) continue;
    add(m[1]);
  }
  for (const m of js.matchAll(/href=\\"(https?:\/\/[^"\\]+)/g)) add(m[1]);
  for (const m of js.matchAll(/url: '(https?:\/\/[^']+)'/g)) add(m[1]);
  // data.js conține acum și URL-uri ca valori (CONFIG_AN.inflatie.sursa), nu doar în comentarii:
  // regex-ul trebuie să ignore ghilimeala de închidere a literalului JS.
  for (const m of data.matchAll(/https?:\/\/[^\s]+/g)) add(m[0].replace(/[.,;']+$/, ''));
  for (const u of appUrls) assert.ok(set.has(u), `sursă absentă din Despre: ${u}`);
});

/* ── 4. Glosar ──────────────────────────────────────────── */
test('Glosar — 40 de termeni, fiecare cu link către un tab valid', () => {
  const items = [...html.matchAll(
    /<div class="glossary-item" data-search data-search-id="([^"]+)" data-search-cat="([^"]+)" data-search-target="([^"]+)">[\s\S]*?<h3>([^<]+)<\/h3>[\s\S]*?<p>([^<]+)<\/p>[\s\S]*?<a class="text-link" href="#([a-z]+)\/([a-z0-9]+)" data-goto-tab="([a-z0-9]+)"/g)];
  assert.equal(items.length, 40, `termeni: ${items.length}`);
  for (const m of items) {
    const tab = m[7];
    assert.ok(TAB_IDS.includes(tab), `glosar: tab invalid ${tab}`);
    assert.equal(m[8], tab, 'href și data-goto-tab diferă');
  }
  includes(html, 'id="panel-glosar"', 'panou glosar');
  includes(html, 'id="glosar-title"', 'titlu glosar');
});

/* ── 5. FAQ ─────────────────────────────────────────────── */
test('FAQ — 12 întrebări cu răspuns și legătură', () => {
  const items = [...html.matchAll(/<details class="faq-item" id="faq-(\d+)"[\s\S]*?<summary>([\s\S]*?)<\/summary>[\s\S]*?<p>([\s\S]*?)<\/p>/g)];
  assert.equal(items.length, 12, `întrebări: ${items.length}`);
  includes(html, 'id="panel-faq"', 'panou FAQ');
  includes(html, 'id="faq-title"', 'titlu FAQ');
});

/* ── 6. Mituri ──────────────────────────────────────────── */
test('Mituri — 8 mituri demontate, cu adevăr și sursă', () => {
  const items = [...html.matchAll(/<div class="myth-item"[\s\S]*?<h3>([\s\S]*?)<\/h3>[\s\S]*?<strong>Adevăr:<\/strong>([\s\S]*?)<\/p>[\s\S]*?<p class="myth-source">Sursă: <a href="([^"]+)"/g)];
  assert.equal(items.length, 8, `mituri: ${items.length}`);
  for (const m of items) assert.match(m[3], /^https?:\/\//, `sursă mit invalidă: ${m[3]}`);
  includes(html, 'id="panel-mituri"', 'panou mituri');
  includes(html, 'id="mituri-title"', 'titlu mituri');
});

/* ── 7. Fapte „Știai că...?” ────────────────────────────── */
test('„Știai că...?” — 12 fapte cu sursă pe Acasă', () => {
  assert.equal((html.match(/class="fact-card"/g) || []).length, 12, 'număr de fapte');
  includes(html, 'Știai că...?', 'titlu secțiune');
});

/* ── 8. Disclaimer ──────────────────────────────────────── */
test('Disclaimer — vizibil în footer și pe Acasă, redactat profesional', () => {
  const footer = html.slice(html.indexOf('<footer class="footer"'));
  includes(footer, 'id="disclaimer"', 'disclaimer în footer');
  includes(footer, 'Nu oferă sfaturi', 'formulare profesională');
  includes(footer, 'proiect educațional', 'natura educațională');
  includes(footer, 'garantate', 'fără garanții');
  includes(html, 'class="disclaimer-note"', 'notă pe Acasă');
});

/* ── 9. Secțiuni globale în sidebar ────────────────────── */
test('Sidebar — patru secțiuni globale, cu stare activă și hash', () => {
  const links = [...html.matchAll(/<a class="side-global-link" id="nav-([a-z]+)" href="#([a-z]+)" data-global="([a-z]+)">/g)];
  assert.deepEqual(links.map((m) => m[1]), ['glosar', 'faq', 'mituri', 'despre']);
  for (const m of links) {
    assert.equal(m[2], m[1], 'href și id diferă');
    assert.equal(m[3], m[1], 'data-global și id diferă');
    assert.ok(html.includes(`id="panel-${m[1]}"`), `lipsește panoul ${m[1]}`);
  }
  includes(css, '.side-global-link', 'stil sidebar global');
  includes(css, '.side-global-link[aria-current="page"]', 'stare activă');
});

/* ── 10. Navigare și căutare în JS ─────────────────────── */
test('JS — panouri globale: parseHash, activateGlobal, buildSearchItems', () => {
  includes(js, 'const GLOBAL_PANELS', 'GLOBAL_PANELS');
  includes(js, 'function activateGlobal', 'activateGlobal');
  includes(js, "if (GLOBAL_IDS.includes(h)) return { type: 'global', id: h };", 'parseHash global');
  includes(js, "document.querySelectorAll('[data-search]')", 'căutare glosar/FAQ/mituri');
  assert.equal(gc.parseHash('#glosar').type, 'global');
  assert.equal(gc.parseHash('#glosar').id, 'glosar');
  assert.equal(gc.parseHash('#faq').id, 'faq');
  assert.equal(gc.parseHash('#mituri').id, 'mituri');
  assert.equal(gc.parseHash('#despre').type, 'global');
  assert.equal(gc.parseHash('#despre').id, 'despre');
  assert.equal(gc.parseHash('#investitii/randament').type, 'tab', 'taburile rămân valide');
  assert.equal(gc.parseHash('#nimerel'), null, 'hash invalid');
  assert.equal(gc.globalName('glosar'), 'Glosar');
  assert.equal(gc.globalName('mituri'), 'Mituri și adevăruri');
  assert.equal(gc.globalName('despre'), 'Despre');
  assert.equal(gc.GLOBAL_PANELS.length, 4);
  assert.equal(gc.buildSearchItems().length, 24, 'în vm nu există [data-search]');
});

/* ── 11. Stiluri ────────────────────────────────────────── */
test('CSS — stiluri pentru conținutul educațional și print', () => {
  for (const sel of ['.why-card', '.panel-sources', '.glossary-item', '.faq-item',
    '.myth-item', '.facts-grid', '.disclaimer', '.global-panel']) {
    includes(css, sel, `stil ${sel}`);
  }
  const printBlock = css.split('@media print')[1] || '';
  includes(printBlock, '.global-panel[hidden]', 'print ascunde panourile globale inactivate');
  includes(printBlock, '.faq-item > *:not(summary)', 'print arată răspunsurile FAQ');
});

/* ── 12. Surse — acoperire pe instituții ───────────────── */
test('Surse — instituțiile de referință apar în conținut', () => {
  for (const domeniu of ['insse.ro', 'bnr.ro', 'taxsummaries.pwc.com', 'asfromania.ro',
    'anpc.ro', 'bvb.ro', 'consumerfinance.gov', 'nobelprize.org']) {
    includes(html, domeniu, `sursă ${domeniu}`);
  }
});
