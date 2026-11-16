// Verificări pentru „Detalii 2" (2026-11-16):
//   1. format de numere: virgulă pentru mii, punct pentru zecimale, peste tot;
//   2. tooltip-uri cu cifrele reale pe grafice, accesibile la hover și focus;
//   3. tooltip-ul „?" (clasa .tip) deasupra oricărui alt element (z-index).
// Rulează: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { css, js, gc } from './helpers/bundle.mjs';

/* ─── 1. Formatul numerelor ──────────────────────────────── */

test('LOCALE e en-US — virgulă pentru mii, punct pentru zecimale', () => {
  assert.equal(gc.LOCALE, 'en-US', 'LOCALE trebuie schimbat din ro-RO');
  assert.ok(!js.includes("'ro-RO'"), 'nu trebuie să rămână locale ro-RO în app.js');
});

test('funcțiile de formatare produc 5,000.00 / 0.3% / 1.10x', () => {
  assert.equal(gc.fmtLei(5000), '5,000.00 lei');
  assert.equal(gc.fmtLei(1234.5), '1,234.50 lei');
  assert.equal(gc.fmtLei(1234567.891, 1), '1,234,567.9 lei');
  assert.equal(gc.fmtPct(0.003), '0.30%');
  assert.equal(gc.fmtPctSmart(0.003), '0.3%');
  assert.equal(gc.fmtPctSmart(0.07), '7%');
  assert.equal(gc.fmtX(1.1), '1.1x');
  assert.equal(gc.fmtX(1234.56), '1,234.56x');
  assert.equal(gc.fmtInt(1234567), '1,234,567');
});

test('parseFormattedNumber înțelege formatul nou (virgulă mii, punct zecimale)', () => {
  // Obiectele vin din contextul vm, deci le verificăm câmp cu câmp
  // (deepStrictEqual ar eșua din cauza prototipului din alt realm).
  function check(text, value, decimals, prefix, suffix) {
    const p = gc.parseFormattedNumber(text);
    assert.equal(p.value, value, `${text} → value`);
    assert.equal(p.decimals, decimals, `${text} → decimals`);
    assert.equal(p.prefix, prefix, `${text} → prefix`);
    assert.equal(p.suffix, suffix, `${text} → suffix`);
  }
  check('5,000.00 lei', 5000, 2, '', ' lei');
  check('1,234', 1234, 0, '', '');
  check('-0.3%', -0.3, 1, '', '%');
  check('1,234,567.89x', 1234567.89, 2, '', 'x');
  assert.equal(gc.formatStatValue(5000, 2), '5,000.00');
  assert.equal(gc.formatStatValue(1234.5, 1), '1,234.5');
});

/* ─── 2. Tooltip-uri pe grafice ──────────────────────────── */

function section(startMarker, endMarker) {
  const a = js.indexOf(startMarker);
  assert.ok(a !== -1, `lipsește ${startMarker}`);
  const b = endMarker ? js.indexOf(endMarker, a) : js.length;
  assert.ok(b !== -1, `lipsește ${endMarker}`);
  return js.slice(a, b);
}

test('attachChartTip există și e accesibil: focus, hover, Escape, aria-describedby', () => {
  const body = section('function attachChartTip(', '\nfunction ');
  assert.match(body, /tabIndex\s*=\s*0/, 'bara/coloana trebuie focusabilă din tastatură');
  assert.match(body, /setAttribute\('aria-describedby'/, 'tooltip-ul e legat prin aria-describedby');
  assert.match(body, /setAttribute\('aria-label'/, 'tooltip-ul are etichetă accesibilă');
  assert.match(body, /setAttribute\('role', 'tooltip'\)/, 'panoul are role=tooltip');
  assert.match(body, /addEventListener\('focus'/, 'se deschide la focus');
  assert.match(body, /addEventListener\('mouseenter'/, 'se deschide la hover');
  assert.match(body, /addEventListener\('blur'/, 'se închide la pierderea focusului');
  assert.match(body, /addEventListener\('mouseleave'/, 'se închide când iese cursorul');
  assert.match(body, /'Escape'/, 'se închide cu Escape');
  assert.match(body, /document\.body\.appendChild\(panel\)/, 'panoul e portal în body (fără clipping)');
});

test('bar-chart „Creștere 2026 vs 2020" — tooltip cu cifrele produsului', () => {
  const body = section('function renderFood(', '/* ═══ 3. Inflația');
  assert.match(body, /clearChartTips\(chart\)/, 'curăță doar tooltip-urile acestui grafic înainte de re-render');
  assert.match(body, /attachChartTip\(/, 'fiecare bară primește tooltip');
  assert.match(body, /fmtPct\(growth\)/, 'tooltipul arată creșterea');
  assert.match(body, /p\.prices\[2020\]/, 'tooltipul arată prețul din 2020');
  assert.match(body, /p\.prices\[2026\]/, 'tooltipul arată prețul din 2026');
  assert.match(body, /escapeHtml\(p\.name\)/, 'numele produsului e escapat');
});

test('vchart „Inflația 1991–2024" — tooltip cu rata anuală', () => {
  const body = section('function renderInflationChart(', 'const rate = GLITCHCOIN_DATA.inflation.map');
  assert.match(body, /clearChartTips\(chart\)/, 'curăță doar tooltip-urile acestui grafic la schimbarea intervalului');
  assert.match(body, /attachChartTip\(/, 'fiecare coloană primește tooltip');
  assert.match(body, /fmtPct\(d\.rate\)/, 'tooltipul arată rata inflației');
  assert.match(body, /d\.year/, 'tooltipul arată anul');
  assert.ok(!body.includes('title="${d.year}'), 'title-ul nativ (doar hover) e înlocuit cu tooltip accesibil');
});

/* ─── 3. Vizibilitatea tooltip-urilor „?" ────────────────── */

test('.tip are z-index mai mare decât orice alt element din CSS', () => {
  const start = css.indexOf('.tip {');
  assert.ok(start !== -1, '.tip există în CSS');
  const end = css.indexOf('}', start);
  const block = css.slice(start, end);
  const m = block.match(/z-index:\s*(\d+)/);
  assert.ok(m, '.tip are z-index declarat');
  const tipZ = Number(m[1]);
  const others = [...css.matchAll(/z-index:\s*(\d+)/g)].map((x) => Number(x[1]));
  const maxOther = Math.max(...others.filter((z) => z !== tipZ));
  assert.ok(tipZ > maxOther, `.tip (${tipZ}) trebuie să fie deasupra tuturor (max alt: ${maxOther})`);
});

test('.chart-tip e poziționat fixed, deasupra graficelor și tabelelor', () => {
  assert.match(css, /\.chart-tip\s*\{[^}]*position:\s*fixed/, 'tooltipul de grafic e fixed (scapă de overflow)');
  assert.match(css, /\.chart-tip-host:focus-visible/, 'host-ul are contur vizibil la focus');
});
