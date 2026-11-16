// Detalii 6 — pagina „Acasă": simulatoare rapide.
// (a) primul simulator își păstrează datele în tabul complet (renderer în goToTab);
// (b) simulatoarele sunt sus pe „Acasă", nu la fundul paginii;
// (c) celelalte două sunt înlocuite cu Regula 72 și Sumă dorită.
// Rulează: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { html, js, gc } from './helpers/bundle.mjs';

const home = html.split('id="panel-acasa"')[1].split('<h2 class="home-h2">Știai că...?')[0];

/* ── (a) păstrarea datelor la „Deschide în tabul complet" ── */

test('goToTab are renderer pentru toate cele 3 simulatoare rapide', () => {
  for (const id of ['compusa', 'regula72', 'suma']) {
    assert.equal(typeof gc.TAB_RENDERERS[id], 'function', `lipsește rendererul pentru ${id}`);
  }
  assert.match(js, /compusa:\s*renderCompusa/, 'rendererul compusa e înregistrat');
  assert.match(js, /regula72:\s*renderRegula72/, 'rendererul regula72 e înregistrat');
  assert.match(js, /suma:\s*renderSuma/, 'rendererul suma e înregistrat');
});

test('goToTab aplică valorile înainte de a randa panoul destinație', () => {
  const inceput = js.indexOf('function goToTab(');
  const corp = js.slice(inceput, inceput + 500);
  const setare = corp.indexOf('el.value = String(valori[cheie])');
  const randare = corp.indexOf('if (render) render()');
  assert.ok(setare !== -1 && randare !== -1, 'goToTab setează inputurile și randează');
  assert.ok(setare < randare, 'inputurile trebuie setate înainte de render');
});

test('prefill-ul acceptă mai multe perechi și constante numerice', () => {
  const init = js.slice(js.indexOf('function initHome('), js.indexOf('/* ── Inițializarea scheletului'));
  assert.match(init, /prefill\.split\(','\)/, 'prefill-ul e parcurs pereche cu pereche');
  assert.match(init, /getElementById\(sursa\)/, 'sursa poate fi un input de pe Acasă');
  assert.match(init, /\^-\?\\d\+\(\?:\\\.\\d\+\)\?\$/, 'sursa poate fi o constantă numerică');
});

/* ── (b) poziționarea pe „Acasă" ── */

test('simulatoarele rapide stau înaintea celor 6 carduri de categorii', () => {
  const quick = home.indexOf('<div class="quick-grid">');
  const grid = home.indexOf('<div class="home-grid">');
  assert.ok(quick !== -1 && grid !== -1, 'ambele secțiuni există pe Acasă');
  assert.ok(quick < grid, 'simulatoarele trebuie să fie deasupra cardurilor de categorii');
  assert.ok(home.indexOf('id="home-title"') < grid, 'titlul „Simulatoare rapide" e înaintea grid-ului');
});

/* ── (c) simulatoarele noi ── */

test('cele 3 carduri au goto/prefill coerente cu taburile complete', () => {
  assert.equal((home.match(/class="quick-card"/g) || []).length, 3);
  for (const id of ['q-compusa-suma', 'q-r72-rata', 'q-suma-tinta']) {
    assert.ok(home.includes(`id="${id}"`), `lipsește inputul #${id}`);
  }
  assert.match(home, /data-goto="compusa"[^>]*data-prefill="comp-suma:q-compusa-suma,comp-contributie:0,comp-rata:7"/);
  assert.match(home, /data-goto="regula72"[^>]*data-prefill="r72-rata:q-r72-rata,r72-suma:10000,r72-ani:10"/);
  assert.match(home, /data-goto="suma"[^>]*data-prefill="suma-dorita:q-suma-tinta,suma-randament:10,suma-ani:15,suma-initiala:0"/);
  for (const vechi of ['q-fond-suma', 'q-datorii-suma', 'data-quick="fond"', 'data-quick="datorii"']) {
    assert.ok(!home.includes(vechi), `a rămas simulatorul vechi: ${vechi}`);
  }
  for (const id of ['q-compusa-rez', 'q-r72-rez', 'q-suma-rez']) {
    assert.ok(home.includes(`id="${id}"`), `lipsește rezultatul #${id}`);
  }
});

test('renderQuick calculează noile simulatoare folosind funcțiile din taburile complete', () => {
  const corp = js.slice(js.indexOf('function renderQuick('), js.indexOf('function initHome('));
  assert.match(corp, /getElementById\('q-r72-rata'\)/);
  assert.match(corp, /computeRegula72\(rata, 0\)/);
  assert.match(corp, /fmtAni\(r\.aniRegola\)/);
  assert.match(corp, /getElementById\('q-suma-tinta'\)/);
  assert.match(corp, /computeSuma\(0\.10, 15, 0, sumaDorita\)/);
  assert.match(corp, /fmtLei\(r\.economie\)/);
  assert.ok(!corp.includes('q-fond-suma') && !corp.includes('q-datorii-suma'), 'vechile simulatoare au fost scoase');
  const init = js.slice(js.indexOf('function initHome('), js.indexOf('/* ── Inițializarea scheletului'));
  assert.match(init, /\['q-compusa-suma', 'q-r72-rata', 'q-suma-tinta'\]/);
});

test('quick-urile se recalculează după restaurare și la „Resetează tot"', () => {
  const init = js.slice(js.indexOf('function init()'), js.indexOf("document.addEventListener('DOMContentLoaded', init)"));
  const restore = init.indexOf('persistRestore()');
  const quick = init.indexOf('renderQuick()');
  assert.ok(restore !== -1 && quick !== -1, 'init restaurează și randează quick-urile');
  assert.ok(restore < quick, 'renderQuick trebuie să ruleze după restaurarea inputurilor');
  const reset = js.slice(js.indexOf('function resetAll('), js.indexOf('/* ── Temă'));
  assert.match(reset, /renderQuick\(\)/, 'resetAll recalculează și simulatoarele rapide');
});

test('valorile implicite ale cardurilor coincid cu cele prefill-uite în taburi', () => {
  const r = gc.computeRegula72(7, 10000);
  assert.ok(Math.abs(r.aniRegola - 72 / 7) < 1e-9);
  assert.equal(gc.fmtAni(r.aniRegola), '10.29 ani');

  const s = gc.computeSuma(0.10, 15, 0, 100000);
  assert.ok(s.economie > 0 && s.economie < 1000, `economie lunară rezonabilă: ${s.economie}`);
  assert.ok(Math.abs(s.sumaFinala - 100000) < 0.01, 'ținta e atinsă la final');
});
