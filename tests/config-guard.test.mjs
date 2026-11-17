// P1/3 — guard împotriva revenirii la date hardcodate.
//
// Scop: dacă cineva reintroduce anul, zilele lucrătoare, cotele fiscale sau
// valorile afișate direct în app.js / index.html, testul eșuează imediat.
//
// Verificăm TIPARE DE COD (declarații, chei, atribuiri, valori asociate),
// NU simpla prezență a unui an: 2025/2026 sunt legitimi în seria istorică,
// în comparațiile N7 și în secțiunile datate. Nu folosim grep global pe ani.
//
// Rulează: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { html, js, data, gc } from './helpers/bundle.mjs';

/* ── utilitare ──────────────────────────────────────────────────────── */

// Corpul declarației `const NAME = ...;`. Folosim corpul, nu tot fișierul,
// ca să nu confundăm anii din comentarii / serii cu valorile de config.
function declarationBody(name) {
  const m = js.match(new RegExp(`\\bconst\\s+${name}\\s*=\\s*([\\s\\S]*?);`, 'm'));
  return m ? m[1].trim() : null;
}

function declarationCount(name) {
  return (js.match(new RegExp(`\\bconst\\s+${name}\\s*=`, 'g')) || []).length;
}

// Șterge comentariile JS, dar păstrează șirurile (URL-urile au `://`,
// deci un regex naiv `//.*` ar tăia text din stringuri).
function withoutComments(source) {
  let out = '';
  let quote = null;
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];
    if (quote) {
      out += ch;
      if (ch === '\\') { out += next ?? ''; i += 2; continue; }
      if (ch === quote) quote = null;
      i += 1;
      continue;
    }
    if (ch === '/' && next === '/') {
      while (i < source.length && source[i] !== '\n') i += 1;
      continue;
    }
    if (ch === '/' && next === '*') {
      i += 2;
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) i += 1;
      i += 2;
      out += ' ';
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') quote = ch;
    out += ch;
    i += 1;
  }
  return out;
}

// Șterge elementele HTML marcate cu data-config-key (tag + conținut),
// inclusiv inputurile self-closing. Ce rămâne e „zona nemarcată”.
function withoutMarkedElements(source) {
  const withClosingTag = source.replace(
    /<([a-zA-Z][\w-]*)\b[^>]*\bdata-config-key="[^"]+"[^>]*>([\s\S]*?)<\/\1>/g,
    (m) => '\n'.repeat((m.match(/\n/g) || []).length),
  );
  return withClosingTag.replace(/<input\b[^>]*\bdata-config-key="[^"]+"[^>]*>/g, '');
}

function resolvePath(obj, path) {
  return path.split('.').reduce((acc, part) => (acc == null ? undefined : acc[part]), obj);
}

const CONFIG_KEYS = [...html.matchAll(/data-config-key="([^"]+)"/g)].map((m) => m[1]);
const CODE = withoutComments(js);
const HTML_UNMARKED = withoutMarkedElements(html);

/* ── 1. app.js: aliasuri din CONFIG_AN, fără cifre hardcodate ───────── */

test('app.js: AN_CURENT e singular și vine doar din CONFIG_AN.anCurent', () => {
  assert.equal(declarationCount('AN_CURENT'), 1, 'trebuie o singură declarație');
  const body = declarationBody('AN_CURENT');
  assert.ok(body, 'declarația AN_CURENT lipsește');
  assert.match(body, /^CONFIG_AN\.anCurent$/, `inițializare nepermisă: ${body}`);
  assert.doesNotMatch(body, /\d/, 'AN_CURENT conține o cifră hardcodată');
});

test('app.js: TIMP_ZILE_LUCRATOARE_AN_DEFAULT vine doar din CONFIG_AN.zileLucratoare', () => {
  assert.equal(declarationCount('TIMP_ZILE_LUCRATOARE_AN_DEFAULT'), 1);
  const body = declarationBody('TIMP_ZILE_LUCRATOARE_AN_DEFAULT');
  assert.ok(body, 'declarația lipsește');
  assert.match(body, /^CONFIG_AN\.zileLucratoare$/, `inițializare nepermisă: ${body}`);
  assert.doesNotMatch(body, /\d/, 'valoare numerică hardcodată');
});

test('app.js: toate ratele din IMPOZIT_TIPURI vin din CONFIG_AN.coteFiscale', () => {
  assert.equal(declarationCount('IMPOZIT_TIPURI'), 1);
  const body = declarationBody('IMPOZIT_TIPURI');
  assert.ok(body && body.startsWith('{') && body.endsWith('}'), 'IMPOZIT_TIPURI trebuie să fie obiect');
  const rate = [...body.matchAll(/\brata\s*:\s*([^,\n}]+)/g)].map((m) => m[1].trim());
  assert.equal(rate.length, 5, 'trebuie 5 cote fiscale');
  for (const r of rate) {
    assert.match(r, /^CONFIG_AN\.coteFiscale\.[A-Za-z]+$/, `rată hardcodată: ${r}`);
  }
});

test('aliasurile din app.js reflectă CONFIG_AN la încărcare', () => {
  const c = gc.CONFIG_AN;
  assert.equal(gc.AN_CURENT, c.anCurent);
  assert.equal(gc.TIMP_ZILE_LUCRATOARE_AN_DEFAULT, c.zileLucratoare);
  assert.equal(gc.IMPOZIT_TIPURI['dobandi'].rata, c.coteFiscale.dobanda);
  assert.equal(gc.IMPOZIT_TIPURI['dividende'].rata, c.coteFiscale.dividende);
  assert.equal(gc.IMPOZIT_TIPURI['vm-ro'].rata, c.coteFiscale.vmRo);
  assert.equal(gc.IMPOZIT_TIPURI['vm-ro-scurt'].rata, c.coteFiscale.vmRoScurt);
  assert.equal(gc.IMPOZIT_TIPURI['vm-strain'].rata, c.coteFiscale.vmStrain);
});

/* ── 2. CONFIG_AN / CONFIG_DERIVAT: valorile așteptate ──────────────── */

test('CONFIG_AN: an 2026, rată 0,063, etichetă „oct 2026 vs dec 2025”, 250 zile, 11 sărbători', () => {
  const c = gc.CONFIG_AN;
  assert.equal(c.anCurent, 2026);
  assert.equal(c.inflatie.rata, 0.063);
  assert.match(c.inflatie.eticheta, /oct 2026 vs dec 2025/);
  assert.equal(c.zileLucratoare, 250);
  assert.equal(c.sarbatoriLegale, 11);
});

test('CONFIG_AN: cotele fiscale sunt 10/16/3/6/16', () => {
  // Obiectul vine din contextul vm, deci îl copiem în prototype-ul gazdă
  // înainte de deepStrictEqual (altfel compară și prototipul, nu doar valorile).
  assert.deepEqual({ ...gc.CONFIG_AN.coteFiscale }, {
    dobanda: 10,
    dividende: 16,
    vmRo: 3,
    vmRoScurt: 6,
    vmStrain: 16,
  });
});

test('CONFIG_DERIVAT reproduce exact valorile afișate (9,432.04, 20.83, 66.50%, 21.50%, 250)', () => {
  const d = gc.CONFIG_DERIVAT;
  assert.equal(d.anCurent, gc.CONFIG_AN.anCurent);
  assert.equal(d.zileLucratoare, 250);
  assert.equal(d.zileLucratoarePeLuna, 250 / 12);
  assert.equal(Math.round(d.echivalent1000lei2000), 9432);
  assert.equal(Number((d.crestereAlimente.max.valoare * 100).toFixed(2)), 66.5);
  assert.equal(d.crestereAlimente.max.produs, 'Pâine (500g)');
  assert.equal(Number((d.crestereAlimente.min.valoare * 100).toFixed(2)), 21.5);
  assert.equal(d.crestereAlimente.min.produs, 'Cartofi (kg)');
});

/* ── 3. index.html: markeri cu corespondent în config ───────────────── */

test('fiecare data-config-key are corespondent în CONFIG_AN / CONFIG_DERIVAT', () => {
  const cfg = { ...gc.CONFIG_AN, ...gc.CONFIG_DERIVAT };
  assert.ok(CONFIG_KEYS.length > 0, 'index.html nu are markeri data-config-key');
  for (const key of new Set(CONFIG_KEYS)) {
    assert.notEqual(resolvePath(cfg, key), undefined, `fără corespondent în config: ${key}`);
  }
});

test('markerii obligatorii nu pot dispărea (altfel valorile devin hardcodate)', () => {
  for (const key of [
    'echivalent1000lei2000', 'anCurent', 'crestereAlimente', 'inflatie',
    'zileLucratoare', 'zileLucratoarePeLuna', 'sarbatoriLegale', 'coteFiscale.vmRo',
  ]) {
    assert.ok(CONFIG_KEYS.includes(key), `marker lipsă: ${key}`);
  }
});

/* ── 4. valorile afișate numai în locurile marcate ──────────────────── */

test('index.html: 9,432.04 / 20.83 / 66.50% / 21.50% apar doar în elemente marcate', () => {
  for (const value of [
    '9.198', '9,198', '9198', '9,432.04', '9432',
    '20,83', '20.83', '2083',
    '66,50%', '66.50%', '66.5%', '0.665',
    '21,50%', '21.50%', '21.5%', '0.215',
  ]) {
    assert.ok(!HTML_UNMARKED.includes(value), `valoare hardcodată în afara markerului: ${value}`);
  }
});

test('index.html: niciun input/celulă cu 250 nu e nemarcat', () => {
  // „250” apare legitim și în proza surselor („250 în România (2026)…”),
  // deci verificăm doar tiparele de date, nu simpla prezență a cifrei.
  assert.ok(!/value="250"/.test(HTML_UNMARKED), 'input value="250" fără data-config-key');
  assert.ok(!/>250</.test(HTML_UNMARKED), 'element cu text 250 fără data-config-key');
});

test('app.js: valorile de config nu apar ca literali în cod (comentariile sunt excluse)', () => {
  for (const value of [
    '9.198', '9,198', '9198', '9,432.04', '9432',
    '20,83', '20.83', '2083',
    '66,50', '66.50', '66.5', '0.665', '6650',
    '21,50', '21.50', '21.5', '0.215', '2150',
    '0.063', '0.069',
  ]) {
    assert.ok(!CODE.includes(value), `literal hardcodat în app.js: ${value}`);
  }
});

/* ── 5. guardul nu interzice anii legitimi ──────────────────────────── */

test('anii din seria istorică, N7 și secțiunile datate rămân legitimi', () => {
  // Dovada că verificăm tipare, nu simpla prezență a lui 2025/2026:
  // configul are anul curent, iar seria/comparațiile au propriile lor valori.
  assert.ok(gc.CONFIG_AN.anCurent === 2026 && js.includes('2025'),
    '2026 e în config; 2025 apare în serii și comparații, fără să fie interzis');
  assert.ok(js.includes('const FOOD_YEARS = [2020, 2021, 2022, 2023, 2024, 2025, CONFIG_AN.anCurent];'),
    'seria alimentelor ia ultimul an din config, nu din literal');
  assert.ok(/\br2026\s*:\s*\d/.test(js), 'tabelul N7 compară cote vechi/noi pe ani');
  assert.ok(js.includes("=== 2025 ? 2025 : 2026"), 'selecția anului în N7 e o comparație, nu o config');
  assert.ok(data.includes('{ year: 2025, rate: 0.0730 }'), 'seria istorică păstrează anul 2025');
});
