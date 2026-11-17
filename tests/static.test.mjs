// Verificări statice pentru corecțiile C1–C12: HTML, data.js, app.js.
// Rulează: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { html, js, data, gc } from './helpers/bundle.mjs';

function includes(haystack, needle, label) {
  assert.ok(haystack.includes(needle), `${label}: lipsește „${needle}”`);
}

test('C3 — selectul „Tipul de venit" există în Randament și Profit, cu rate reale', () => {
  for (const id of ['rand-tip-venit', 'prof-tip-venit']) {
    const re = new RegExp(`<select id="${id}"[^>]*>[\\s\\S]*?<\\/select>`);
    const m = html.match(re);
    assert.ok(m, `${id} lipsă`);
    const block = m[0];
    assert.match(block, /data-default="vm-ro"/, `${id} trebuie să aibă data-default="vm-ro"`);
    for (const opt of ['dobandi', 'dividende', 'vm-ro', 'vm-ro-scurt', 'vm-strain']) {
      assert.ok(block.includes(`value="${opt}"`), `${id}: opțiunea ${opt} lipsește`);
    }
  }
  includes(html, 'id="rand-impozit" value="3"', 'C3');
  includes(html, 'id="rand-comisioane" value="0.3"', 'C6');
  includes(html, 'id="prof-impozit" value="3"', 'C3');
  includes(html, 'id="prof-comisioane" value="0.3"', 'C6');
});

test('C3 — tabelele de impozitare din app.js folosesc ratele reale', () => {
  // Cotele nu mai sunt hardcodate: vin din CONFIG_AN.coteFiscale.
  includes(js, "'vm-ro':       { rata: CONFIG_AN.coteFiscale.vmRo", 'C3');
  includes(js, "'vm-ro-scurt': { rata: CONFIG_AN.coteFiscale.vmRoScurt", 'C3');
  includes(js, "'vm-strain':   { rata: CONFIG_AN.coteFiscale.vmStrain", 'C3');
  includes(js, 'impozit-tipuri', 'C3 tooltip');
});

test('C4 — data.js: seria de inflație e INS (1991 = 170,2%, nu 230,62%)', () => {
  includes(data, '{ year: 1991, rate: 1.702 }', 'C4');
  includes(data, 'Sursa inflatiei: INS, IPC national', 'C4');

  // P0/1 — CONFIG_AN e singurul loc al valorilor care se schimbă anual.
  assert.equal(gc.CONFIG_AN.anCurent, 2026);
  assert.equal(gc.CONFIG_AN.zileLucratoare, 250);
  assert.equal(gc.CONFIG_AN.sarbatoriLegale, 11);
  assert.equal(gc.CONFIG_AN.inflatie.rata, 0.063);
  assert.equal(gc.CONFIG_AN.inflatie.rataOctOct, 0.069);
  assert.equal(gc.CONFIG_AN.inflatie.eticheta, 'oct 2026 vs dec 2025, parțial');
  assert.match(gc.CONFIG_AN.inflatie.sursa, /^https:\/\/agerpres\.ro\//);
  assert.deepEqual({ ...gc.CONFIG_AN.coteFiscale }, {
    dobanda: 10, dividende: 16, vmRo: 3, vmRoScurt: 6, vmStrain: 16,
  });
  assert.equal(gc.CONFIG_AN.actualizatLa, '2026-11-16');
  assert.equal(gc.AN_CURENT, gc.CONFIG_AN.anCurent);
});

test('C7 — data.js: cartofii 2025 = 2,49 lei', () => {
  includes(data, '2025: 2.49', 'C7');
});

test('A2/A3 — data.js: 2025 = 7,3% (INS), 2026 = 6,3% (parțial)', () => {
  includes(data, '{ year: 2025, rate: 0.0730 }', 'A2');
  includes(data, '{ year: 2026, rate: 0.0630, partial: true }', 'A3');

  // Valorile calculate se derivă din CONFIG_AN, nu sunt scrise de mână.
  const derivat = gc.CONFIG_DERIVAT;
  assert.equal(derivat.zileLucratoarePeLuna, 250 / 12);
  // Rândul curent al seriei rămâne literal (cerința „nu atinge seria”), dar nu
  // poate diverge de la CONFIG_AN — gard pentru actualizarea anuală următoare.
  const seria = Object.fromEntries(gc.GLITCHCOIN_DATA.inflation.map((d) => [d.year, d]));
  assert.equal(seria[gc.CONFIG_AN.anCurent].rate, gc.CONFIG_AN.inflatie.rata);
  assert.ok(Math.abs(derivat.echivalent1000lei2000 - 9432.0359937914) < 1e-6);
  assert.ok(Math.abs(derivat.crestereAlimente.max.valoare - 0.665) < 1e-12);
  assert.ok(Math.abs(derivat.crestereAlimente.min.valoare - 0.215) < 1e-12);
  assert.equal(derivat.crestereAlimente.max.produs, 'Pâine (500g)');
  assert.equal(derivat.crestereAlimente.min.produs, 'Cartofi (kg)');
});

test('C5/C11 — Timp vs dorințe: zile lucrătoare ca input (implicit 248) și 30,44 zile/lună', () => {
  includes(js, 'TIMP_ZILE_LUCRATOARE_AN_DEFAULT = CONFIG_AN.zileLucratoare', 'C5 default');
  includes(js, 'TIMP_ZILE_LUNA = 365 / 12', 'C11');
  includes(js, "getElementById('timp-zile-lucratore')", 'C5 input');
  includes(js, 'timp-zile-lucratore', 'C5 tooltip');
  includes(html, 'id="timp-zile-lucratore" value="250"', 'C5 input');
  includes(html, 'data-tip="timp-zile-lucratore"', 'C5 tooltip');
  includes(html, 'id="timp-tabel-zileanluc">250</td>', 'C5 tabel');
  includes(html, 'Pe zi · 30.44 zile', 'C11');
  includes(html, '365 ÷ 12', 'C11');
});

test('Pilon III — fără pragul depășit de 90 de contribuții', () => {
  assert.ok(!js.includes('cu minimum 90 de contribuții'), 'tooltipul cu regula veche a rămas');
  assert.ok(js.includes('Norma ASF 10/2026'), 'tooltipul nu menționează norma nouă');
  assert.ok(html.includes('Norma 10/2026'), 'sursa ASF nouă lipsește din pagină');
});

test('C1 — „Nu am bani": semnul dobânzii e corect (venit − facturi + profit)', () => {
  includes(js, 'const cheltuitCuCE = cheltuitFaraCE + profit;', 'C1');
  assert.ok(!js.includes('cheltuitFaraCE - profit'), 'C1: semnul vechi a rămas în cod');
});

test('C2 — deflator: iterează de la an+1 (fără off-by-one)', () => {
  includes(js, 'for (let y = an + 1; y <= AN_CURENT; y++)', 'C2');
  includes(js, 'Suma actuală ÷ Π (1 + rata inflației anuale), pentru anii A+1, A+2, …, 2026', 'C2 tooltip');
});

test('C8/C9 — Dobânda compusă: creștere reală și contribuție lunară consistentă', () => {
  includes(js, 'crestere: an >= 2 ? sumaTotala / precedentTotala - 1 : null', 'C8');
  includes(js, 'const sumaInvestita = an === 0 ? suma : suma + contributie * COMP_LUNI_AN * an;', 'C9');
  includes(html, 'față de <strong>suma totală</strong> din anul anterior', 'C8 note');
});

test('C10 — Profit: pierderea nu se impozitează', () => {
  includes(js, 'const net = brut < 0 ? brut : brut - (brut * impozit + brut * comisioane);', 'C10');
  includes(js, 'pierderea nu se impozitează', 'C10 tooltip');
});

test('C12 — „Nu am bani": dobânda implicită 3,5% și intervalul menționat', () => {
  includes(html, 'id="nuam-rata" value="3.5"', 'C12');
  includes(js, 'Intervalul real pentru depozitele nou deschise în România: 3–4%', 'C12 tooltip');
});

test('Surse — linkuri INS/BNR/PwC/EY în secțiunea „Surse și note metodologice"', () => {
  includes(html, 'insse.ro', 'surse');
  includes(html, 'bnr.ro', 'surse');
  includes(html, 'taxsummaries.pwc.com/romania', 'surse');
  includes(html, 'ey.com', 'surse');

  // Fallback-urile statice din HTML sunt marcate pentru guardul de date hardcodate.
  for (const key of [
    'echivalent1000lei2000', 'anCurent', 'crestereAlimente', 'inflatie',
    'zileLucratoare', 'zileLucratoarePeLuna', 'sarbatoriLegale', 'coteFiscale.vmRo',
  ]) {
    assert.ok(html.includes(`data-config-key="${key}"`), `marker lipsă: ${key}`);
  }
});
