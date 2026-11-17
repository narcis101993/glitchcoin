// P0/2 — badge „Date actualizate”, notă de inflație și notă fiscală în context.
// Textele trebuie să vină din CONFIG_AN (data.js), nu din literali în app.js.
// Rulează: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { html, css, js, gc } from './helpers/bundle.mjs';

const CONFIG = gc.CONFIG_AN;

/* ── 1. Textul exact cerut, la valorile curente din config ── */

test('badge-ul global: „Date actualizate: 12 nov 2026”', () => {
  assert.equal(gc.textDataActualizate(), 'Date actualizate: 12 nov 2026');
});

test('nota de inflație: „2026 = parțial: oct 2026 vs dec 2025; rata oct/oct = 6,9%”', () => {
  assert.equal(
    gc.textEtichetaInflatie(),
    '2026 = parțial: oct 2026 vs dec 2025; rata oct/oct = 6,9%',
  );
});

test('nota fiscală: „Cotele 2026 (3/6/16%, dividende 16%) — verifică întotdeauna Codul fiscal/ANAF în vigoare.”', () => {
  assert.equal(
    gc.textContextFiscal(),
    'Cotele 2026 (3/6/16%, dividende 16%) — verifică întotdeauna Codul fiscal/ANAF în vigoare.',
  );
});

/* ── 2. Textele se schimbă odată cu configul (nu sunt hardcodate) ── */

test('data afișată urmează CONFIG_AN.actualizatLa', () => {
  const initial = CONFIG.actualizatLa;
  try {
    CONFIG.actualizatLa = '2027-01-05';
    assert.equal(gc.textDataActualizate(), 'Date actualizate: 5 ian 2027');
    CONFIG.actualizatLa = '2026-12-31';
    assert.equal(gc.textDataActualizate(), 'Date actualizate: 31 dec 2026');
  } finally {
    CONFIG.actualizatLa = initial;
  }
});

test('eticheta de inflație urmează eticheta și rata oct/oct din config', () => {
  const etichetaInitiala = CONFIG.inflatie.eticheta;
  const rataInitiala = CONFIG.inflatie.rataOctOct;
  try {
    CONFIG.inflatie.eticheta = 'sep 2027 vs dec 2026, parțial';
    CONFIG.inflatie.rataOctOct = 0.071;
    assert.equal(
      gc.textEtichetaInflatie(),
      '2026 = parțial: sep 2027 vs dec 2026; rata oct/oct = 7,1%',
    );
  } finally {
    CONFIG.inflatie.eticheta = etichetaInitiala;
    CONFIG.inflatie.rataOctOct = rataInitiala;
  }
});

test('cotele din notă urmează CONFIG_AN.coteFiscale', () => {
  const initiale = { ...CONFIG.coteFiscale };
  try {
    CONFIG.coteFiscale = { dobanda: 10, dividende: 20, vmRo: 4, vmRoScurt: 7, vmStrain: 18 };
    assert.equal(
      gc.textContextFiscal(),
      'Cotele 2026 (4/7/18%, dividende 20%) — verifică întotdeauna Codul fiscal/ANAF în vigoare.',
    );
  } finally {
    CONFIG.coteFiscale = initiale;
  }
});

/* ── 3. Locurile de afișare și stilul (discret, fără overflow) ── */

test('HTML are cele trei sloturi goale, în panourile potrivite', () => {
  assert.match(html, /id="badge-actualizare"><\/p>/, 'slotul global e gol în HTML');
  assert.match(html, /id="badge-inflatie"><\/p>/, 'slotul de inflație e gol în HTML');
  assert.match(html, /id="tx-context-note"><\/p>/, 'slotul fiscal e gol în HTML');

  const acasa = html.split('id="panel-acasa"')[1].split('id="panel-inflatie"')[0];
  const inflatie = html.split('id="panel-inflatie"')[1].split('id="panel-dobanda"')[0];
  const impozitare = html.split('id="panel-impozitare"')[1].split('id="panel-biase"')[0];
  assert.ok(acasa.includes('id="badge-actualizare"'), 'badge-ul global e pe Acasă');
  assert.ok(inflatie.includes('id="badge-inflatie"'), 'badge-ul de inflație e lângă notele de inflație');
  assert.ok(impozitare.includes('id="tx-context-note"'), 'nota fiscală e în tabul de impozitare');
  assert.ok(
    impozitare.indexOf('id="tx-context-note"') > impozitare.indexOf('id="tx-net"'),
    'nota fiscală stă lângă rezultate, după staturi',
  );
});

test('stilurile folosesc tokenii existenți și rup textul la 390px', () => {
  for (const regula of [
    /\.data-fresh-badge\s*\{[^}]*background:\s*var\(--accent-soft\)/,
    /\.data-fresh-badge\s*\{[^}]*color:\s*var\(--accent-ink\)/,
    /\.data-fresh-badge\s*\{[^}]*max-width:\s*100%/,
    /\.data-fresh-badge\s*\{[^}]*overflow-wrap:\s*anywhere/,
    /\.data-context-note\s*\{[^}]*border-left:\s*2px solid var\(--accent-line\)/,
    /\.data-context-note\s*\{[^}]*overflow-wrap:\s*anywhere/,
    /\.data-fresh-badge:empty[\s\S]*?\.data-context-note:empty\s*\{\s*display:\s*none/,
  ]) {
    assert.match(css, regula, `regulă CSS lipsă: ${regula}`);
  }
});

/* ── 4. Randarea și sursele ── */

test('renderDataFreshness umple toate sloturile și adaugă linkuri cu sursele din raport', () => {
  assert.equal(typeof gc.renderDataFreshness, 'function');
  assert.doesNotThrow(() => gc.renderDataFreshness());

  const randare = js.slice(js.indexOf('function renderDataFreshness('), js.indexOf('/* ═══ 24.'));
  assert.match(randare, /textDataActualizate\(\)/);
  assert.match(randare, /textEtichetaInflatie\(\)/);
  assert.match(randare, /textContextFiscal\(\)/);
  assert.match(randare, /SURSA_COD_FISCAL/, 'link către Codul fiscal/ANAF');
  assert.match(randare, /IMPOZIT_SURSE\.pwc/, 'link către sursa ratelor din raport');

  const raport = readFileSync(new URL('../DATE-2025-2026.md', import.meta.url), 'utf8');
  const sursa13 = raport.match(/^\[13\]\s+(\S+)/m)[1].trim().toLowerCase();
  assert.equal(gc.IMPOZIT_SURSE.pwc.url.toLowerCase(), sursa13, 'PwC e sursa [13] din raport');
  assert.equal(gc.SURSA_COD_FISCAL.url, 'http://static.anaf.ro/static/10/Anaf/legislatie/L_227_2015.htm', 'ANAF e linkul deja citat în Despre');
  const inceputInit = js.indexOf('function init() {');
  assert.ok(inceputInit !== -1, 'funcția init există');
  assert.match(js.slice(inceputInit, inceputInit + 4000), /renderDataFreshness\(\);/, 'randarea e în init()');
  assert.match(js, /Nu e consultanță fiscală\./, 'disclaimerul fiscal e păstrat');
});

test('textele afișate nu apar ca literali în app.js', () => {
  for (const literal of [
    'Date actualizate: 12 nov 2026',
    'rata oct/oct = 6,9%',
    'Cotele 2026 (3/6/16%',
  ]) {
    assert.ok(!js.includes(literal), `text hardcodat în app.js: ${literal}`);
  }
});
