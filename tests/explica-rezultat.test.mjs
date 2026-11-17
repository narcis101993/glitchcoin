// P2/5 — „Explică rezultatul” în limbaj simplu, per tab.
// Teste în stilul `tests/detalii-*.test.mjs`: verifică montarea automată,
// accesibilitatea butonului, textele pure (în română, din CONFIG_AN / din
// valorile curente) și faptul că guardul de config rămâne intact.
// Rulează: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { html, js, css, gc } from './helpers/bundle.mjs';

const EXPLICA_TABS = ['inflatie', 'dobanda', 'compusa', 'di', 'regula72', 'timp', 'nuam', 'buget', 'fond', 'sanatate', 'randament', 'profit', 'cost', 'suma', 'oportunitate', 'dca', 'curs', 'diversificare', 'asigurari', 'stres', 'datorii', 'pensie', 'impozitare'];
const TABURI_CU_FUNCTIE_DEDICATA = ['inflatie', 'timp', 'dobanda', 'compusa', 'randament', 'buget'];
const CODE = js;

/* ── 1. Montare pe cele 23 de taburi cu calculator ───────── */

test('toate taburile au o gazdă .explica-widget, imediat sub summary', () => {
  assert.deepEqual(Object.keys(gc.EXPLAINERS), TABURI_CU_FUNCTIE_DEDICATA);
  for (const id of EXPLICA_TABS) {
    assert.ok(html.includes(`id="panel-${id}"`), `lipsește panoul ${id}`);
    assert.equal((html.match(new RegExp(`data-explica-panel="${id}"`, 'g')) || []).length, 1,
      `gazda explicației pentru ${id} trebuie să fie unică`);
  }
  const hosts = html.match(/class="explica-widget" data-explica-panel="/g) || [];
  assert.equal(hosts.length, 23, 'exact 23 de gazde în HTML');
  // Fiecare gazdă e între summary și widgetul A/B din același panou.
  for (const id of EXPLICA_TABS) {
    const panel = html.slice(html.indexOf(`id="panel-${id}"`));
    const summary = panel.indexOf('class="summary"');
    const explica = panel.indexOf(`data-explica-panel="${id}"`);
    const ab = panel.indexOf(`data-ab-panel="${id}"`);
    assert.ok(summary >= 0 && explica > summary && ab > explica,
      `${id}: ordinea trebuie să fie summary → explica → A/B`);
  }
});

test('widgetul se montează automat dintr-un singur punct (initExplicate)', () => {
  const init = js.slice(js.indexOf('function init()'), js.indexOf("document.addEventListener('DOMContentLoaded', init)"));
  assert.match(init, /initExplicate\(\);/, 'init montează explicațiile');
  const mount = js.slice(js.indexOf('function initExplicate('), js.indexOf('function initExplicate(') + 400);
  assert.match(mount, /querySelectorAll\('\.explica-widget\[data-explica-panel\]'\)\.forEach\(explicaBuildWidget\)/);
  assert.ok(!init.includes('explicaBuildWidget'), 'extinderea nu cere cod per tab în init');
});

test('registrul EXPLAINERS e extensibil: o cheie nouă nu atinge montarea', () => {
  const section = js.slice(js.indexOf('const EXPLAINERS = {'), js.indexOf('function explicaBuildWidget('));
  assert.match(section, /inflatie: \(\) =>/);
  assert.match(section, /buget: \(panel\) =>/);
  assert.match(section, /CONFIG_AN\.inflatie\.rata/, 'inflația ia rata din config, nu literal');
  assert.ok(!section.includes('0.063') && !section.includes('0.069'), 'fără rate hardcodate');
  assert.ok(!section.includes('COMP_ANI ='), 'ani nu se redeclara aici');
});

/* ── 2. Buton discret, focalizabil, cu aria și Escape ───── */

test('butonul e nativ, cu aria-expanded / aria-controls, fără tabindex forțat', () => {
  const widget = js.slice(js.indexOf('function explicaBuildWidget('), js.indexOf('function initExplicate('));
  assert.match(widget, /button\.type = 'button'/);
  assert.match(widget, /button\.className = 'explica-btn'/);
  assert.match(widget, /button\.textContent = 'Explică rezultatul'/);
  assert.match(widget, /setAttribute\('aria-expanded', 'false'\)/);
  assert.match(widget, /setAttribute\('aria-controls', textId\)/);
  assert.match(widget, /paragraph\.hidden = true/, 'paragraful începe ascuns');
  assert.match(widget, /paragraph\.textContent = genereaza\(\)/, 'textul e generat la deschidere');
  assert.ok(!widget.includes('innerHTML'), 'nu injectăm textul ca HTML');
  assert.ok(!widget.includes('tabindex'), 'butonul rămâne în navigarea cu Tab');
});

test('Escape închide paragraful și readuce focusul pe buton', () => {
  const widget = js.slice(js.indexOf('function explicaBuildWidget('), js.indexOf('function initExplicate('));
  assert.match(widget, /host\.addEventListener\('keydown', \(e\) => \{/);
  assert.match(widget, /e\.key === 'Escape' && !paragraph\.hidden/);
  assert.match(widget, /seteaza\(false\);\s*button\.focus\(\)/);
});

test('textul se regenerează când se schimbă inputurile, cât timp e deschis', () => {
  const widget = js.slice(js.indexOf('function explicaBuildWidget('), js.indexOf('function initExplicate('));
  assert.match(widget, /\['input', 'change'\]\.forEach/);
  assert.match(widget, /if \(!paragraph\.hidden\) paragraph\.textContent = genereaza\(\)/);
});

/* ── 3. Textele în română simplă (exemplele din card) ───── */

test('inflație: textul exact din card, cu rata/anul/calificativul din CONFIG_AN', () => {
  const text = gc.textExplicaInflatie(gc.CONFIG_AN.inflatie.rata);
  assert.equal(text, 'La 6.3% pe an, 1,000 lei de azi cumpără ~941 lei anul viitor (2026 e parțial).');
  assert.ok(text.includes(String(gc.CONFIG_AN.anCurent)), 'anul vine din config');
  // Dovada că nu e hardcodat: schimbăm configul, textul se schimbă.
  const cfg = gc.CONFIG_AN;
  const oldYear = cfg.anCurent, oldEticheta = cfg.inflatie.eticheta;
  try {
    cfg.anCurent = 2030;
    cfg.inflatie.eticheta = 'ian 2030 vs dec 2029, parțial';
    const alt = gc.textExplicaInflatie(cfg.inflatie.rata);
    assert.ok(alt.includes('(2030 e parțial)'), `anul/eticheta nu vin din config: ${alt}`);
    cfg.inflatie.eticheta = 'ian 2030 vs dec 2029, definitiv';
    const alt2 = gc.textExplicaInflatie(cfg.inflatie.rata);
    assert.ok(!alt2.includes('parțial'), `calificativul nu vine din etichetă: ${alt2}`);
  } finally {
    cfg.anCurent = oldYear;
    cfg.inflatie.eticheta = oldEticheta;
  }
});

test('dobândă compusă: „După 10 ani la 7%, suma crește de ~1.97 ori”', () => {
  const text = gc.textExplicaCompusa(1000, 0.07, 10);
  assert.match(text, /^După 10 ani la 7%, suma crește de ~1.97 ori:/);
  assert.ok(text.includes('1,000 lei') && text.includes('~1,967 lei'));
  assert.match(text, /Dobânda rămâne în cont/, 'explică mecanismul, nu formula');
});

test('buget: „50/30/20 înseamnă 2,500 / 1,500 / 1,000 lei pentru 5,000 lei”', () => {
  assert.equal(gc.textExplicaBuget(5000),
    '50/30/20 înseamnă 2,500 lei nevoi, 1,500 lei dorințe, 1,000 lei economii pentru 5,000 lei venit lunar.');
  assert.equal(gc.textExplicaBuget(0),
    'Introdu venitul lunar net pentru a vedea repartizarea 50/30/20.');
});

test('timp și dobândă: interpretare în zile de muncă, respectiv lei după impozit', () => {
  const timp = gc.textExplicaTimp(5000, 3600, 250);
  assert.match(timp, /O dorință de 3,600 lei înseamnă ~15 zile de muncă \(8 ore pe zi\)/);
  assert.match(timp, /dintr-un an de 250 zile lucrătoare/, 'zilele vin din panou/config');
  const dobanda = gc.textExplicaDobanda(15000, 0.07, 184, 0.1);
  assert.ok(dobanda.includes('Pe 184 zile, 15,000 lei la 7% îți aduce'));
  assert.ok(dobanda.includes('529.32 lei dobândă') && dobanda.includes('476.39 lei'));
});

test('randament: diferența dintre brut, net și real e explicată în lei și %', () => {
  const text = gc.textExplicaRandament(10000, 0.1, 0.1, 0.01, 0.063);
  assert.match(text, /La 10% pe 10,000 lei, câștigul brut e 1,000.00 lei/);
  assert.ok(text.includes('890.00 lei (8.9%)') && text.includes('244.59 lei (2.45%)'));
  assert.match(text, /după inflația de 6.3%/, 'inflația e interpretată, nu doar afișată');
});

test('stări limită: texte de ghidare, fără NaN / Infinity', () => {
  for (const text of [
    gc.textExplicaInflatie(-0.99),
    gc.textExplicaTimp(0, 3600, 250),
    gc.textExplicaDobanda(0, 0.07, 184, 0.1),
    gc.textExplicaDobanda(15000, 0.07, 0, 0.1),
    gc.textExplicaCompusa(0, 0.07, 20),
    gc.textExplicaRandament(0, 0.1, 0, 0, 0.063),
    gc.textExplicaBuget(0),
  ]) {
    assert.ok(typeof text === 'string' && text.length > 0);
    assert.ok(!/NaN|Infinity|undefined/.test(text), `text invalid: ${text}`);
  }
});

/* ── 4. CSS: discret, focus, 390px, reduced motion, print ── */

test('CSS: buton discret cu focus vizibil, text care se rupe, fără overflow', () => {
  assert.match(css, /\.explica-btn\s*\{[\s\S]*?font-size: \.78rem/);
  assert.match(css, /\.explica-btn:focus-visible\s*\{\s*outline:/);
  assert.match(css, /\.explica-text\s*\{[\s\S]*?overflow-wrap: anywhere/);
  assert.match(css, /\.explica-text\[hidden\]\s*\{\s*display: none/);
});

test('CSS: prefers-reduced-motion și print sunt respectate', () => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.explica-btn\s*\{\s*transition: none/);
  assert.match(css, /@media print\s*\{[\s\S]*?\.explica-btn\s*\{\s*display: none !important/);
});

/* ── 5. Guardul de config rămâne intact ─────────────────── */

test('secțiunea nouă nu reintroduce valori de config hardcodate', () => {
  const section = js.slice(js.indexOf('/* ═══ 28.'), js.indexOf('/* ═══ Inițializare'));
  for (const literal of ['0.063', '0.069', '9.198', '20,83', '66,50', '21,50']) {
    assert.ok(!section.includes(literal), `literal de config în secțiunea nouă: ${literal}`);
  }
  assert.match(section, /CONFIG_AN\./);
});
