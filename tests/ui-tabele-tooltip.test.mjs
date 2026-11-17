// Audit UI 2026-11-17: tabele aliniate, tabel inflație colapsabil,
// tooltipuri grafice lângă cursor. Teste statice (comportamentul real
// se verifică și în browser, file://, 1440px + 390px).
import test from 'node:test';
import assert from 'node:assert/strict';
import { html, js, css, gc } from './helpers/bundle.mjs';

function section(start, end) {
  const a = js.indexOf(start);
  assert.ok(a !== -1, `lipsește ${start}`);
  const b = end ? js.indexOf(end, a) : js.length;
  assert.ok(b !== -1, `lipsește ${end}`);
  return js.slice(a, b);
}

/* ─── 1. Tabele: compactare responsive, fără coloane ascunse ─── */

test('CSS — compactare sub 900px, textul se rupe, nicio coloană ascunsă', () => {
  const m = css.match(/@media \(max-width: 900px\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(m, 'lipsește media query-ul de compactare a tabelelor');
  const block = m[1];
  assert.match(block, /table\s*\{[^}]*font-size:\s*\.82rem/, 'font puțin mai mic pe ecrane mici');
  assert.match(block, /thead th\s*\{[\s\S]*?padding:\s*8px 10px/, 'padding compact în antet');
  assert.match(block, /tbody td\s*\{[\s\S]*?padding:\s*7px 10px/, 'padding compact în corp');
  assert.match(block, /white-space:\s*normal/, 'textul lung se rupe, nu e tăiat');
  assert.match(block, /overflow-wrap:\s*anywhere/, 'cuvinte lungi se rup în celulă');
  assert.match(block, /min-width:\s*44px/, 'lățime minimă rezonabilă');
  assert.ok(!/display:\s*none/.test(block), 'nu ascundem coloane');
  assert.ok(!/nth-child/.test(block), 'nu ascundem celule prin selectori');
});

test('CSS — indiciu „→ derulează” pentru tabelele care depășesc containerul', () => {
  assert.match(css, /\.table-scroll-hint\s*\{[\s\S]*?display:\s*none/, 'ascuns implicit');
  assert.match(css, /\.table-scroll-hint\.is-visible\s*\{\s*display:\s*block/, 'vizibil când JS-ul îl activează');
  const print = css.split('@media print').pop();
  assert.match(print, /\.table-scroll-hint\s*\{\s*display:\s*none !important/, 'nu se tipărește');
});

test('JS — indiciul se calculează din scrollWidth/clientWidth și se actualizează', () => {
  const body = section('function updateTableScrollHints(', '\nfunction initInflationPrint');
  assert.match(body, /querySelectorAll\('\.table-wrap'\)/, 'parcurge toate tabelele');
  assert.match(body, /scrollWidth\s*>\s*wrap\.clientWidth/, 'doar când chiar depășește');
  assert.match(body, /textContent\s*=\s*'→ derulează'/, 'textul indiciului');
  assert.match(body, /classList\.toggle\('is-visible'/, 'comută clasa de vizibilitate');
  assert.match(body, /aria-hidden/, 'indiciul e decorativ pentru cititorii de ecran');
  assert.ok(js.includes('updateTableScrollHints();\n  if (stepMode)'), 'recalcul la schimbarea tabului');
  assert.ok(js.includes("window.addEventListener('resize', updateTableScrollHints)"), 'recalcul la resize');
});

/* ─── 2. Tabelul inflației, pliat implicit ─── */

test('HTML — tabelul inflației e în <details> default închis, cu rândurile în DOM', () => {
  const m = html.match(/<details[^>]*id="inflation-details"[^>]*>([\s\S]*?)<\/details>/);
  assert.ok(m, 'lipsește <details id="inflation-details">');
  const block = m[0];
  assert.ok(!/\sopen(\s|>|=)/.test(block.slice(0, block.indexOf('>'))), 'nu are atributul open (default închis)');
  assert.match(block, /<summary>Rata inflației 1991–2026 — arată tabelul<\/summary>/, 'sumar discret');
  assert.match(block, /<table id="inflation-table">/, 'tabelul rămâne același');
  assert.match(block, /<caption class="visually-hidden">Rata inflației anuale în România, 1991–2026<\/caption>/, 'ARIA caption păstrat');
  assert.match(block, /<tbody id="inflation-table-body"><\/tbody>/, 'corpul rămâne în DOM');
  assert.match(js, /getElementById\('inflation-table-body'\)\.innerHTML = GLITCHCOIN_DATA\.inflation\.map/, 'rândurile se generează din date, nu dispar');
  assert.equal(gc.GLITCHCOIN_DATA.inflation.length, 36, 'seria 1991–2026 are 36 de rânduri');
});

test('JS/CSS — la print tabelul inflației se deschide și sumarul se ascunde', () => {
  const body = section('function initInflationPrint(', '\nfunction init()');
  assert.match(body, /window\.addEventListener\('beforeprint'/, 'ascultă evenimentul de print');
  assert.match(body, /details\.open\s*=\s*true/, 'deschide <details> înainte de print');
  assert.match(body, /window\.addEventListener\('afterprint'/, 'restabilește starea după print');
  assert.match(body, /details\.addEventListener\('toggle', updateTableScrollHints\)/, 'recalculează indiciul la deschidere');
  const print = css.split('@media print').pop();
  assert.match(print, /\.inflation-details > summary\s*\{\s*display:\s*none/, 'sumarul nu apare în PDF');
});

test('CSS — sumarul tabelului inflației e discret și focusabil', () => {
  assert.match(css, /\.inflation-details > summary\s*\{[\s\S]*?cursor:\s*pointer/, 'arată ca un control');
  assert.match(css, /\.inflation-details > summary:focus-visible\s*\{[\s\S]*?outline:/, 'contur la focus');
});

/* ─── 3. Tooltipuri lângă cursor ─── */

test('attachChartTip — poziționare față de cursor, cu inversare la margini', () => {
  const body = section('function attachChartTip(', '\nfunction ');
  assert.match(body, /event\.clientX/, 'folosește clientX');
  assert.match(body, /event\.clientY/, 'folosește clientY');
  assert.match(body, /addEventListener\('mousemove'/, 'repoziționează la fiecare mișcare');
  assert.match(body, /addEventListener\('mouseenter'/, 'se deschide la hover');
  assert.match(body, /const gap = 14/, 'distanța față de cursor e ~14px');
  assert.match(body, /pointer\.x\s*\+\s*gap/, 'panoul e la dreapta cursorului');
  assert.match(body, /pointer\.y\s*\+\s*gap/, 'panoul e sub cursor');
  assert.match(body, /left = pointer\.x - p\.width - gap/, 'inversare stânga când depășește');
  assert.match(body, /top = pointer\.y - p\.height - gap/, 'inversare sus când depășește');
});

test('attachChartTip — păstrează focusul, accesibilitatea și repoziționarea', () => {
  const body = section('function attachChartTip(', '\nfunction ');
  assert.match(body, /function showAtElement\(\)[\s\S]*?pointer = null/, 'focusul resetează ancorarea la mouse');
  assert.match(body, /host\.getBoundingClientRect\(\)/, 'pe focus poziționează față de element');
  assert.match(body, /addEventListener\('focus'/, 'se deschide la focus');
  assert.match(body, /addEventListener\('blur'/, 'se închide la blur');
  assert.match(body, /'Escape'/, 'se închide cu Escape');
  assert.match(body, /setAttribute\('role', 'tooltip'\)/, 'role=tooltip');
  assert.match(body, /setAttribute\('aria-describedby'/, 'aria-describedby');
  assert.match(body, /window\.addEventListener\('scroll'[\s\S]*?position\(\)/, 'repoziționare la scroll');
  assert.match(body, /window\.addEventListener\('resize'[\s\S]*?position\(\)/, 'repoziționare la resize');
  assert.match(css, /\.chart-tip\s*\{[\s\S]*?pointer-events:\s*none/, 'panoul nu prinde evenimente');
  assert.match(css, /\.tip\s*\{[\s\S]*?z-index:\s*1000/, 'z-index păstrat');
});
