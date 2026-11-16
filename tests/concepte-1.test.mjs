// Teste pentru conceptele noi 1 (GlitchCoin): N1 fond de urgență, N4 dobândă vs inflație,
// N5 costul oportunității, N10 regula 72.
// Valorile așteptate au fost recalculate independent în Python (scratch/recalc-concepte1.py)
// din seria INS IPC național 2000–2025.
// Rulează: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { gc, html, js } from './helpers/bundle.mjs';

const {
  GLITCHCOIN_DATA,
  computeRandamentReal, computeIstoricReal, computeRegula72, computeDublareInAni,
  economieNecesara, timpPanaLaTinta, computeFond, computeOportunitate, R72_PRESETS,
} = gc;

// Tolerație pentru virgula fluantă (zecimale).
function near(actual, expected, eps = 1e-6) {
  assert.ok(Math.abs(actual - expected) <= eps, `așteptat ~${expected}, obținut ${actual}`);
}

/* ══ N4 · Dobândă vs inflație ══ */

test('N4 — randamentul real pe 1 an: formula exactă (Fisher) și aproximația', () => {
  const r = computeRandamentReal(10000, 0.07, 0.05);
  near(r.crestereNominala, 700);
  near(r.realExact, 0.019047619048);      // 1,07 / 1,05 − 1
  near(r.realAproximat, 0.02);             // 0,07 − 0,05
  near(r.diferenta, -0.000952380952);      // exact − aproximație
  near(r.valoareNominala, 10700);
  near(r.valoareReala, 10190.476190476);
});

test('N4 — seria istorică 2000–2025 (INS) aplicată unei rate nominale de 7%', () => {
  const h = computeIstoricReal(0.07, 10000);
  assert.equal(h.rows.length, 26);                       // 2000–2025 incluse
  near(h.produsInflatie, 8.653244031001, 1e-9);
  near(h.medie, -0.011681201011, 1e-9);
  near(h.minim.real, -0.265463032883, 1e-9);
  assert.equal(h.minim.an, 2000);
  near(h.maxim.real, 0.086735730246, 1e-9);
  assert.equal(h.maxim.an, 2016);                        // deflație → randament real maxim
  assert.equal(h.numarNegativi, 10);
  // Un an concret: 2022, inflație 13,8%.
  const an2022 = h.rows.find((r) => r.an === 2022);
  near(an2022.inflatie, 0.138);
  near(an2022.real, 1.07 / 1.138 - 1);
  near(h.cashReal, 1155.635963134034);
  near(h.investitReal, 6711.185890662465);
  near(h.diferenta, 5555.549927528431);
});

test('N4 — constantele de interval și sursa INS', () => {
  includes(js, 'DI_ANI_START = 2000');
  includes(js, 'DI_ANI_END = 2025');
  includes(html, 'Exemple istorice · 2000–2025');
  includes(html, 'insse.ro');
});

/* ══ N5 · Costul oportunității ══ */

test('N5 — cash vs investiție: randament net compus și putere de cumpărare', () => {
  const r = computeOportunitate(10000, 10, 0.07, 0.01, 0.003, 0.05);
  near(r.rNet, 0.06909);                                // 7% × (1 − 1% − 0,3%)
  near(r.cashNominal, 10000);
  near(r.investitNominal, 19504.852608128956);
  near(r.cashReal, 6139.132535407592);                  // 10000 ÷ 1,05^10
  near(r.investitReal, 11974.287524489409);
  near(r.costCash, 5835.154989081818);
  assert.ok(r.investitReal > r.cashReal, 'investiția trebuie să bată cash-ul la 7%');
});

test('N5 — randament net zero: cash-ul și investiția sunt la egalitate', () => {
  const r = computeOportunitate(10000, 10, 0, 0.10, 0.005, 0.05);
  near(r.rNet, 0);
  near(r.cashReal, r.investitReal);   // ambele = 10000 ÷ 1,05^10
  assert.equal(r.costCash, 0);
});

/* ══ N1 · Fond de urgență ══ */

test('N1 — ținta, dobânda brută/netă și economia lunară necesară', () => {
  const r = computeFond(4000, 6, 0.035, 0.10, 0, 500);
  near(r.tinta, 24000);                                 // 4000 × 6 luni
  near(r.dobandaBrut, 840);                             // 24000 × 3,5%
  near(r.dobandaNet, 756);                              // 840 × 0,9
  near(r.economieNecesara, 3970.932436044728);         // PMT pentru 24000 în 6 luni la 3,5%
  near(r.timpLuni, 44.989458012610);                    // 500 lei/lună
});

test('N1 — suma deja acumulă reduced economia necesară și timpul', () => {
  const cu5000 = computeFond(4000, 6, 0.035, 0.10, 5000, 500);
  near(cu5000.economieNecesara, 3129.071511868743);
  near(cu5000.timpLuni, timpPanaLaTinta(5000, 500, 0.035, 24000), 1e-9);

  const cu1000 = computeFond(4000, 6, 0.035, 0.10, 0, 1000);
  near(cu1000.timpLuni, 23.231063808672);

  // Fără dobândă: timpul e pura împărțire (24000 − 0) ÷ 500.
  near(timpPanaLaTinta(0, 500, 0, 24000), 48);
  // Ținta deja acoperită.
  near(timpPanaLaTinta(25000, 500, 0.035, 24000), 0);
  // Economie 0 → ținta nu se atinge.
  assert.equal(timpPanaLaTinta(0, 0, 0.035, 24000), null);
  // Economia necesară cu rată 0: (țintă − suma) ÷ luni.
  near(economieNecesara(0, 24000, 0, 6), 4000);
});

/* ══ N10 · Regula 72 ══ */

test('N10 — regula 72 vs compunere exactă, la 7%', () => {
  const r = computeRegula72(7, 10000);
  near(r.aniRegola, 10.285714285714);                   // 72 ÷ 7
  near(r.aniExact, 10.244768351059);                    // ln 2 ÷ ln 1,07
  near(r.diferenta, 0.040945934656);
  near(r.dublu, 20000);
  assert.equal(computeRegula72(0, 10000), null, 'la rată 0 regula 72 nu se aplică');
});

test('N10 — invers: rată necesară pentru dublare în 10 ani', () => {
  const inv = computeDublareInAni(10);
  near(inv.rataRegola, 7.2);                          // 72 ÷ 10
  near(inv.rataExacta, 7.177346253629);               // 2^(1/10) − 1, în %
  assert.equal(computeDublareInAni(0), null);
});

test('N10 — ratele predefinite acoperă 1–15%', () => {
  assert.deepEqual(Array.from(R72_PRESETS), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15]);
  // La 15% regula 72 subestimează puțin (diferență negativă).
  const r15 = computeRegula72(15, 10000);
  assert.ok(r15.diferenta < 0);
});

/* ══ Structură și accesibilitate ══ */

test('Structură — bara de taburi are 24 taburi și 24 panouri, cu id-uri corelate', () => {
  const tabIds = [...html.matchAll(/<button[^>]*class="tab[^"]*"[^>]*id="tab-([a-z0-9]+)"/g)].map((m) => m[1]);
  const panelIds = [...html.matchAll(/<section id="panel-([a-z0-9]+)" class="tab-panel[^"]*"/g)].map((m) => m[1]);
  assert.equal(tabIds.length, 24, `taburi: ${tabIds.length}`);
  assert.equal(panelIds.length, 24, `panouri: ${panelIds.length}`);
  assert.deepEqual(tabIds, panelIds);

  const expectedNew = ['di', 'regula72', 'fond', 'oportunitate'];
  for (const id of expectedNew) {
    assert.ok(tabIds.includes(id), `lipsește tab-${id}`);
    assert.match(html, new RegExp(`<section id="panel-${id}"[^>]*aria-labelledby="tab-${id}"[^>]*hidden>`),
      `panel-${id} trebuie ascuns inițial și legat de tab-${id}`);
  }
  // TABS din app.js conține toate id-urile, în aceeași ordine ca în HTML.
  const tabsLine = js.match(/const TABS = \[([^\]]+)\]/)[1];
  for (const id of expectedNew) assert.ok(tabsLine.includes(`'${id}'`), `TABS lipsește ${id}`);
});

test('Structură — panoul Regula 72 include graficul și tabela de comparație', () => {
  includes(html, 'id="r72-chart"');
  includes(html, 'id="r72-table-body"');
  includes(html, 'id="di-istoric-body"');
  includes(html, 'id="fu-luni"');
  includes(html, 'id="co-cost"');
});

test('Accesibilitate — toate taburile noi au tooltip-uri accesibile (data-tip + FORMULA_TIPS)', () => {
  const keys = [
    'di-crestere', 'di-real', 'di-valoare-reala', 'di-aproximare', 'di-istoric',
    'di-cash-real', 'di-investit-real', 'di-diferenta',
    'r72-regula', 'r72-exact', 'r72-diferenta', 'r72-dublu',
    'r72-inverse', 'r72-inverse-regula', 'r72-inverse-exact',
    'fu-tinta', 'fu-dobanda', 'fu-economie-necesara', 'fu-timp',
    'co-cash-nominal', 'co-investit-nominal', 'co-cash-real', 'co-investit-real', 'co-cost',
  ];
  for (const key of keys) {
    assert.ok(js.includes(`'${key}': {`), `FORMULA_TIPS lipsește „${key}”`);
    assert.ok(html.includes(`data-tip="${key}"`), `data-tip="${key}" lipsește din HTML`);
  }
});

test('Surse — taburile noi menționează linkuri INS / BNR / PwC', () => {
  includes(html, 'insse.ro/cms/en/content/cpi-annual-data-series');
  includes(html, 'https://www.bnr.ro/');
  includes(html, 'taxsummaries.pwc.com/romania');
});

test('Stocare locală — toate inputurile noi au id (se salvează automat în localStorage)', () => {
  const ids = [
    'di-suma', 'di-randament', 'di-inflatie',
    'r72-rata', 'r72-suma', 'r72-ani',
    'fu-cheltuieli', 'fu-luni', 'fu-dobanda', 'fu-impozit', 'fu-suma', 'fu-economie',
    'co-suma', 'co-ani', 'co-randament', 'co-impozit', 'co-comisioane', 'co-inflatie',
  ];
  for (const id of ids) {
    assert.ok(html.includes(`id="${id}"`), `inputul #${id} lipsește`);
  }
});

/* Helper local (static.test.mjs are unul propriu). */
function includes(haystack, needle, label = 'verificare') {
  assert.ok(haystack.includes(needle), `${label}: lipsește „${needle}”`);
}