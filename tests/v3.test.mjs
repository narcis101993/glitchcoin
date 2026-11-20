// v3 — verificări pentru date, metodologie, CI și infrastructură.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gc, html, js, readme, data } from './helpers/bundle.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

test('scriptul verifica-date trece pe datele curente', () => {
  const r = spawnSync(process.execPath, ['scripts/verifica-date.mjs'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, String(r.stderr || r.stdout));
  assert.match(r.stdout, /verifica-date: OK/);
});

test('scriptul prinde o serie coruptă (fără să modifice fișierul)', () => {
  const src = readFileSync(ROOT + 'data.js', 'utf8');
  const corrupt = src.replace('{ year: 2024, rate: 0.0560 }', '{ year: 2026, rate: 0.0560 }');
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import vm from 'node:vm';
    const c = { console }; vm.createContext(c);
    vm.runInContext(${JSON.stringify(corrupt)} + '\\n globalThis.__d={CONFIG_AN,CONFIG_DERIVAT,GLITCHCOIN_DATA};', c);
    const {CONFIG_AN,CONFIG_DERIVAT,GLITCHCOIN_DATA}=c.__d;
    const serie=GLITCHCOIN_DATA.inflation;
    let ok=true;
    for(let i=1;i<serie.length;i++) if(serie[i].year!==serie[i-1].year+1) ok=false;
    console.log(ok ? 'OK' : 'an lipsă');
  `], { cwd: ROOT, encoding: 'utf8' });
  assert.match(r.stdout, /an lipsă/);
});

test('documentul metodologic viu există și acoperă convențiile', () => {
  const p = ROOT + 'docs/METODOLOGIE.md';
  assert.ok(existsSync(p), 'lipsește docs/METODOLOGIE.md');
  const t = readFileSync(p, 'utf8');
  for (const term of ['YTD', 'media pe 12 luni', 'Deflator', 'Fisher', 'Prețuri alimente', 'en-US']) {
    assert.ok(t.includes(term), `metodologia nu acoperă: ${term}`);
  }
  assert.match(readme, /docs\/METODOLOGIE\.md/);
});

test('CI rulează testele și verificarea datelor la push/PR', () => {
  const p = ROOT + '.github/workflows/test.yml';
  assert.ok(existsSync(p), 'lipsește workflow-ul de test');
  const t = readFileSync(p, 'utf8');
  assert.match(t, /node --test tests\//);
  assert.match(t, /node scripts\/verifica-date\.mjs/);
  assert.match(t, /pull_request/);
});

test('versiunea afișată vine din CONFIG_AN', () => {
  assert.equal(gc.CONFIG_AN.versiune, '3.2.1');
  // Verific explicit fallback-ul din footer: versiunile vechi există acum
  // legitim în istoric, deci prohibiția e limitată la <span>-ul footerului.
  assert.match(html, /data-config-key="versiune" id="versiune-app">v3\.2\.1<\/span>/);
  assert.ok(!html.includes('id="versiune-app">v3.2.0<'), 'footerul static vechi a rămas');
});

test('validarea internă a datelor nu găsește probleme', () => {
  assert.equal(gc.valideazaDate().length, 0);
});


/* ── v3.1 — randament real, impozit pe doi ani, surse alimente ── */

test('randament real adăugat în Fond de urgență, Sumă dorită și DCA', () => {
  for (const id of ['fu-dobanda-real', 'suma-real', 'dc-valoare-real']) {
    assert.ok(html.includes(`id="${id}"`), `lipsește statul ${id}`);
    assert.ok(js.includes(`getElementById('${id}')`), `${id} nu e actualizat`);
  }
  assert.ok(js.includes('RATA_REFERINTA_REAL'), 'lipsește rata de referință');
  assert.ok(html.includes('inflația de referință'), 'eticheta nu explică sursa ratei');
});

test('cotele fiscale 2025/2026 pot fi selectate în Randament și Profit', () => {
  assert.equal(gc.impozitPentruAn('vm-ro', 2025), 1);
  assert.equal(gc.impozitPentruAn('vm-ro', 2026), 3);
  assert.equal(gc.impozitPentruAn('dividende', 2025), 10);
  assert.equal(gc.impozitPentruAn('dividende', 2026), 16);
  for (const prefix of ['rand', 'prof']) {
    assert.ok(html.includes(`id="${prefix}-an"`), `lipsește selectorul de an în ${prefix}`);
    assert.match(html, new RegExp(`<label for="${prefix}-an">Anul de aplicare</label>`));
  }
  assert.ok(js.includes('IMPOZIT_TIPURI_2025'));
});

test('prețurile estimate 2025–2026 sunt marcate și au sursă', () => {
  assert.ok(js.includes("an >= 2025 ? '<sup class=\"est-mark\""), 'marcajul de estimare lipsește');
  assert.match(html, /InfoCons/);
  assert.match(html, /estimări metodologice/);
  assert.ok(data.includes("Ouă (10 buc)"));
});

/* ── v3.2 — widgeturi pe toate taburile, progres, mobil ── */

test('explicatorul generic folosește rezumatul live și textul „De ce contează”', () => {
  const panel = {
    querySelector(sel) {
      if (sel === '.summary') return { textContent: 'Rezultat 1,234.00 lei' };
      if (sel === '.why-card p') return { textContent: 'Înseamnă putere de cumpărare.' };
      return null;
    },
  };
  const text = gc.textExplicaGenerica(panel);
  assert.match(text, /Rezultatul curent: Rezultat 1,234\.00 lei/);
  assert.match(text, /putere de cumpărare/);
});

test('progresul „explorat” e opțional și folosește chei prefixate', () => {
  assert.ok(html.includes('id="side-progress"'));
  assert.ok(html.includes('id="explorat-toggle"'));
  assert.ok(js.includes("EXPLORAT_KEY = 'glitchcoin-explorat'"));
  assert.ok(js.includes("EXPLORAT_OFF_KEY = 'glitchcoin-explorat-off'"));
  assert.match(js, /marcheazaExplorat\(id\)/);
});

test('pe mobil există categorii rapide sub header', () => {
  assert.match(html, /<nav class="mobile-cats"/);
  for (const cat of ['fundamente', 'buget', 'investitii', 'risc', 'impozite', 'psihologie']) {
    assert.match(html, new RegExp(`href="#${cat}/`));
  }
  assert.ok(js.includes('Compară A vs B'), 'compararea în două coloane e etichetată explicit');
});

test('simularea Monte Carlo e amânată și arată status', () => {
  assert.ok(html.includes('id="dv-sim-status"'));
  assert.match(js, /Se calculează simularea/);
  assert.match(js, /setTimeout\(\(\) => \{/);
  assert.match(js, /if \(token !== simulareToken\) return/);
});
