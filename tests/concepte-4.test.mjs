// Teste pentru conceptele noi 4 (GlitchCoin): N6 pensie / Pilon III,
// N7 impozitare pe investiții.
// Valorile așteptate au fost recalculate independent în Python
// (scratch/recalc-concepte4.py), replicând exact algoritmul din app.js.
// Rulează: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { gc, html, js, css } from './helpers/bundle.mjs';

const {
  computePensie, PN_SCENARII, computeImpozit, impozitRata,
  IMPOZIT_VENITURI, IMPOZIT_SURSE, TAB_RENDERERS, goToTab,
  renderPensie, renderImpozitare,
} = gc;

// Tolerație pentru virgula fluantă (zecimale).
function near(actual, expected, eps = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= eps, `așteptat ~${expected}, obținut ${actual}`);
}

function includes(haystack, needle, label = 'verificare') {
  assert.ok(haystack.includes(needle), `${label}: lipsește „${needle}”`);
}

/* ══ N6 · Pensie / Pilon III ══ */

test('N6 — scenariul implicit (25 → 65 ani, 300 lei/lună, 6,7%, comision 1,5%)', () => {
  const r = computePensie({
    varsta: 25, pensionare: 65, contributie: 300, suma: 0,
    randament: 6.7, comision: 1.5, impozit: 10, inflatie: 4.9,
  });
  assert.equal(r.valid, true);
  assert.equal(r.ani, 40);
  assert.equal(r.luni, 480);

  near(r.finalBrut, 724125.5540849224);          // 300 × ((1+0,067/12)^480 − 1) ÷ (0,067/12)
  near(r.finalCost, 482440.15474445757);         // aceeași formulă, r = (6,7−1,5)% ÷ 12
  near(r.contributii, 144000);                   // 300 × 480
  near(r.castigBrut, 580125.5540849224);
  near(r.costComisioane, 241685.39934046485);     // brut − după comisioane
  near(r.castigImpozabil, 338440.15474445757);   // după comisioane − contribuții
  near(r.impozitLei, 33844.01547444576);         // 10% din câștig
  near(r.finalNet, 448596.1392700118);
  near(r.valoareReala, 66196.6488001867);         // net ÷ (1,049)^40
  near(r.randEfectiv, 0.052000000000000005);      // 6,7% − 1,5%
  near(r.randReal, 0.0028598665395616063);        // Fisher cu inflația

  // Comisioanele ascunse: un treime din valoarea brută pe 40 de ani.
  near(r.costComisioane / r.finalBrut, 0.3337617323088159);
  assert.ok(r.costComisioane / r.finalBrut > 0.25, 'comisioanele trebuie să depășească un sfert din final');

  // Tabelul are un rând pe an, iar ultimul coincide cu totalul.
  assert.equal(r.rows.length, 40);
  assert.deepEqual({ ...r.rows[0] }, {
    an: 1, contributii: 3600, brut: 3712.63353756313, cost: 3687.0515010373615,
    impozit: 8.70515010373615, net: 3678.346350933625,
  });
  const ultim = r.rows[39];
  near(ultim.brut, r.finalBrut, 1e-9);
  near(ultim.net, r.finalNet, 1e-9);
});

test('N6 — 30 de ani, 200 lei/lună', () => {
  const r = computePensie({
    varsta: 30, pensionare: 60, contributie: 200, suma: 0,
    randament: 6.7, comision: 1.5, impozit: 10, inflatie: 4.9,
  });
  assert.equal(r.ani, 30);
  near(r.finalBrut, 230031.41904199982);
  near(r.finalCost, 172745.06505019913);
  near(r.contributii, 72000);
  near(r.castigBrut, 158031.41904199982);
  near(r.costComisioane, 57286.353991800686);
  near(r.castigImpozabil, 100745.06505019913);
  near(r.impozitLei, 10074.506505019914);
  near(r.finalNet, 162670.55854517923);
  near(r.valoareReala, 38729.715971876314);
  near(r.costComisioane / r.finalBrut, 0.24903708471815833);
  assert.equal(r.rows.length, 30);
});

test('N6 — fără comisioane: costul e zero, randamentul efectiv e brutul', () => {
  const r = computePensie({
    varsta: 25, pensionare: 65, contributie: 300, suma: 0,
    randament: 6.7, comision: 0, impozit: 10, inflatie: 4.9,
  });
  near(r.finalBrut, 724125.5540849224);
  near(r.finalCost, 724125.5540849224);
  near(r.costComisioane, 0);
  near(r.impozitLei, 58012.55540849225);        // 10% din tot câștigul
  near(r.finalNet, 666112.9986764302);
  near(r.valoareReala, 98294.3105715902);
  near(r.randEfectiv, 0.067);
  near(r.randReal, 0.01715919923736897);
});

test('N6 — fără comisioane și fără impozit', () => {
  const r = computePensie({
    varsta: 25, pensionare: 65, contributie: 300, suma: 0,
    randament: 6.7, comision: 0, impozit: 0, inflatie: 0,
  });
  near(r.finalNet, 724125.5540849224);
  near(r.valoareReala, 724125.5540849224);
  near(r.impozitLei, 0);
  near(r.randReal, 0.067);
});

test('N6 — randament 0%: doar contribuțiile, fără impozit pe câștig nul', () => {
  const r = computePensie({
    varsta: 25, pensionare: 55, contributie: 500, suma: 1000,
    randament: 0, comision: 0, impozit: 10, inflatie: 4.9,
  });
  near(r.finalBrut, 181000);                    // 1000 + 500 × 360
  near(r.finalCost, 181000);
  near(r.contributii, 181000);
  near(r.castigBrut, 0);
  near(r.impozitLei, 0);
  near(r.finalNet, 181000);
  near(r.valoareReala, 43093.714398003205);      // 181.000 ÷ 1,049^30
  near(r.randEfectiv, 0);
  near(r.randReal, -0.046711153479504275);
});

test('N6 — randament negativ (sub comision): formulele cu rată negativă', () => {
  const r = computePensie({
    varsta: 25, pensionare: 45, contributie: 300, suma: 0,
    randament: -5, comision: 1.5, impozit: 10, inflatie: 4.9,
  });
  assert.equal(r.ani, 20);
  near(r.finalBrut, 72000);                     // 300 × 240 (r ≤ 0)
  near(r.finalCost, 72000);
  near(r.castigBrut, 0);
  near(r.costComisioane, 0);
  near(r.finalNet, 72000);
  near(r.valoareReala, 27658.124839930482);
  near(r.randEfectiv, -0.065);
  near(r.randReal, -0.10867492850333638);
});

test('N6 — vârsta de pensionare mai mică decât vârsta actuală e invalidă', () => {
  const r = computePensie({
    varsta: 65, pensionare: 25, contributie: 300, suma: 0,
    randament: 6.7, comision: 1.5, impozit: 10, inflatie: 4.9,
  });
  assert.equal(r.valid, false);
  assert.equal(r.ani, 1);                       // clamp, nu o lasă să cheltui negativ
  assert.equal(r.rows.length, 1);

  const egale = computePensie({
    varsta: 30, pensionare: 30, contributie: 300, suma: 0,
    randament: 6.7, comision: 1.5, impozit: 10, inflatie: 4.9,
  });
  assert.equal(egale.valid, false);
});

test('N6 — suma inițială se compune la fel ca contribuția', () => {
  const r = computePensie({
    varsta: 35, pensionare: 65, contributie: 200, suma: 50000,
    randament: 6.7, comision: 1.5, impozit: 10, inflatie: 4.9,
  });
  assert.equal(r.ani, 30);
  near(r.finalBrut, 601116.9414547912);
  near(r.finalCost, 409885.5521879149);
  near(r.contributii, 122000);                  // 50.000 + 200 × 360
  near(r.castigBrut, 479116.94145479123);
  near(r.costComisioane, 191231.38926687633);
  near(r.castigImpozabil, 287885.5521879149);
  near(r.impozitLei, 28788.55521879149);
  near(r.finalNet, 381096.99696912343);
  near(r.valoareReala, 90734.1720736138);
  near(r.contributii, 50000 + 200 * 360, 1e-12);
});

test('N6 — impozitul nu se aplică pe pierdere', () => {
  const r = computePensie({
    varsta: 25, pensionare: 35, contributie: 100, suma: 5000,
    randament: 1, comision: 1.5, impozit: 10, inflatie: 4.9,
  });
  assert.equal(r.ani, 10);
  near(r.contributii, 17000);
  near(r.finalCost, 16756.09756579628);         // sub contribuții: randamentul e negativ după comisioane
  assert.ok(r.finalCost < r.contributii, 'valoarea e sub contribuții la randament sub comision');
  near(r.castigImpozabil, 0);
  near(r.impozitLei, 0);
  near(r.finalNet, r.finalCost);
  near(r.valoareReala, 10385.274939619409);
  near(r.randEfectiv, -0.005);
  near(r.randReal, -0.05147759771210669);
});

test('N6 — scenariile predefinite din selector', () => {
  assert.deepEqual({ ...PN_SCENARII.istoric }, { randament: 6.7, inflatie: 4.9 });
  assert.deepEqual({ ...PN_SCENARII.conservator }, { randament: 4, inflatie: 4.9 });
  assert.deepEqual({ ...PN_SCENARII.optimist }, { randament: 9, inflatie: 4.9 });
  assert.equal(PN_SCENARII.personalizat, null);

  const conservator = computePensie({
    varsta: 25, pensionare: 65, contributie: 300, suma: 0,
    randament: 4, comision: 1.5, impozit: 10, inflatie: 4.9,
  });
  near(conservator.finalBrut, 354588.40199736477);
  near(conservator.finalCost, 247025.61815296105);
  assert.ok(conservator.finalBrut < 724125.5540849224);
});

/* ══ N7 · Impozitare pe investiții ══ */

test('N7 — tabelul cu rate reale: structura și cote', () => {
  assert.equal(IMPOZIT_VENITURI.length, 9);
  const chei = [...IMPOZIT_VENITURI].map((r) => r.cheie);
  assert.deepEqual(chei, [
    'dobanzi', 'dividende', 'vm-ro', 'vm-ro-scurt', 'vm-strain',
    'imob-scurt', 'imob-lung', 'chirii', 'pensie',
  ]);

  for (const rand of IMPOZIT_VENITURI) {
    assert.equal(typeof rand.nume, 'string');
    assert.ok(rand.nume.length > 0);
    assert.ok(Number.isFinite(rand.r2025) && Number.isFinite(rand.r2026), `${rand.cheie}: rate numerice`);
    assert.ok(rand.baza.length > 0, `${rand.cheie}: baza lipsește`);
    assert.ok(rand.cum.length > 0, `${rand.cheie}: „cum se aplică” lipsește`);
    assert.ok(IMPOZIT_SURSE[rand.sursa], `${rand.cheie}: sursa ${rand.sursa} lipsește`);
  }

  // Cote 2025 → 2026, conform surselor citate.
  const dupaCheie = Object.fromEntries(IMPOZIT_VENITURI.map((r) => [r.cheie, r]));
  assert.deepEqual([dupaCheie.dobanzi.r2025, dupaCheie.dobanzi.r2026], [10, 10]);
  assert.deepEqual([dupaCheie.dividende.r2025, dupaCheie.dividende.r2026], [10, 16]);
  assert.deepEqual([dupaCheie['vm-ro'].r2025, dupaCheie['vm-ro'].r2026], [1, 3]);
  assert.deepEqual([dupaCheie['vm-ro-scurt'].r2025, dupaCheie['vm-ro-scurt'].r2026], [3, 6]);
  assert.deepEqual([dupaCheie['vm-strain'].r2025, dupaCheie['vm-strain'].r2026], [10, 16]);
  assert.deepEqual([dupaCheie['imob-scurt'].r2025, dupaCheie['imob-scurt'].r2026], [3, 3]);
  assert.deepEqual([dupaCheie['imob-lung'].r2025, dupaCheie['imob-lung'].r2026], [1, 1]);
  assert.deepEqual([dupaCheie.chirii.r2025, dupaCheie.chirii.r2026], [10, 10]);
  assert.deepEqual([dupaCheie.pensie.r2025, dupaCheie.pensie.r2026], [10, 10]);

  // Premisa generică „10% pentru toate” nu mai există.
  assert.ok(IMPOZIT_VENITURI.some((r) => r.r2026 < 10), 'trebuie să existe o cotă sub 10% în 2026');
  assert.ok(IMPOZIT_VENITURI.some((r) => r.r2026 > 10), 'trebuie să existe o cotă peste 10% în 2026');
});

test('N7 — impozitRata alege anul corect', () => {
  const rand = IMPOZIT_VENITURI.find((r) => r.cheie === 'dividende');
  assert.equal(impozitRata(rand, 2025), 10);
  assert.equal(impozitRata(rand, 2026), 16);

  const vm = IMPOZIT_VENITURI.find((r) => r.cheie === 'vm-ro');
  assert.equal(impozitRata(vm, 2025), 1);
  assert.equal(impozitRata(vm, 2026), 3);

  const imob = IMPOZIT_VENITURI.find((r) => r.cheie === 'imob-lung');
  assert.equal(impozitRata(imob, 2025), 1);
  assert.equal(impozitRata(imob, 2026), 1);
});

test('N7 — computeImpozit: impozitul, netul și cazurile particulare', () => {
  const c = computeImpozit(10000, 3);
  near(c.cota, 0.03);
  near(c.impozit, 300);
  near(c.net, 9700);

  near(computeImpozit(10000, 1).impozit, 100);
  near(computeImpozit(10000, 16).impozit, 1600);
  near(computeImpozit(10000, 10).net, 9000);
  near(computeImpozit(10000, 0).impozit, 0);
  near(computeImpozit(0, 16).net, 0);

  // Câștig negativ → zero, nu impozit negativ.
  const pierdere = computeImpozit(-500, 3);
  near(pierdere.castig, 0);
  near(pierdere.impozit, 0);
  near(pierdere.net, 0);

  // Cota este plafonată la [0, 1].
  near(computeImpozit(10000, 200).cota, 1);
  near(computeImpozit(10000, 200).net, 0);
  near(computeImpozit(10000, -5).impozit, 0);
});

test('N7 — sursele au URL-uri publice cu https', () => {
  for (const [cheie, s] of Object.entries(IMPOZIT_SURSE)) {
    assert.equal(typeof s.nume, 'string', `${cheie}: nume`);
    assert.match(s.url, /^https:\/\//, `${cheie}: URL`);
  }
  assert.ok(IMPOZIT_SURSE.pwc.url.includes('taxsummaries.pwc.com'));
  assert.ok(IMPOZIT_SURSE.rsm.url.includes('rsm.global'));
  assert.ok(IMPOZIT_SURSE.asf.url.includes('asfromania.ro'));
});

/* ══ Structură și accesibilitate ══ */

test('Smoke — renderer-el taburilor noi rulează fără excepții (DOM fals)', () => {
  // Prinde ReferenceError/TypeError în node, nu doar în browser: o variabilă
  // scrisă greșit într-un renderer ar blocat tabul în producție.
  assert.equal(typeof renderPensie, 'function');
  assert.equal(typeof renderImpozitare, 'function');
  assert.doesNotThrow(() => renderPensie());
  assert.doesNotThrow(() => renderImpozitare());
});

test('Structură — bara de taburi are 24 taburi și 24 panouri, cu id-uri corelate', () => {
  const tabIds = [...html.matchAll(/<button[^>]*class="tab[^"]*"[^>]*id="tab-([a-z0-9]+)"/g)].map((m) => m[1]);
  const panelIds = [...html.matchAll(/<section id="panel-([a-z0-9]+)" class="tab-panel[^"]*"/g)].map((m) => m[1]);
  assert.equal(tabIds.length, 24, `taburi: ${tabIds.length}`);
  assert.equal(panelIds.length, 24, `panouri: ${panelIds.length}`);
  assert.deepEqual(tabIds, panelIds);

  const expectedNew = ['pensie', 'impozitare'];
  for (const id of expectedNew) {
    assert.ok(tabIds.includes(id), `lipsește tab-${id}`);
    assert.match(html, new RegExp(`<section id="panel-${id}"[^>]*aria-labelledby="tab-${id}"[^>]*hidden>`),
      `panel-${id} trebuie ascuns inițial și legat de tab-${id}`);
  }

  const tabsLine = js.match(/const TABS = \[([^\]]+)\]/)[1];
  for (const id of expectedNew) assert.ok(tabsLine.includes(`'${id}'`), `TABS lipsește ${id}`);
});

test('Structură — panourile noi conțin elementele cheie', () => {
  const ids = [
    // N6 · Pensie
    'pn-scenariu', 'pn-varsta', 'pn-pensionare', 'pn-contributie', 'pn-suma',
    'pn-randament', 'pn-comision', 'pn-impozit', 'pn-inflatie',
    'pn-summary', 'pn-alerte', 'pn-final-brut', 'pn-final-cost', 'pn-final-net',
    'pn-contributii', 'pn-castig', 'pn-impozit-lei', 'pn-cost-comisioane',
    'pn-rand-efectiv', 'pn-valoare-reala', 'pn-evol-body',
    // N7 · Impozitare
    'tx-tip', 'tx-an', 'tx-castig', 'tx-summary', 'tx-alerte',
    'tx-rata', 'tx-impozit-lei', 'tx-net', 'tx-diferenta', 'tx-body',
  ];
  for (const id of ids) assert.ok(html.includes(`id="${id}"`), `lipsește #${id}`);
});

test('Structură — legăturile dintre taburi sunt prezente (butoane + TAB_RENDERERS)', () => {
  for (const id of ['pn-go-suma', 'tx-go-randament', 'rand-go-impozitare', 'prof-go-impozitare']) {
    assert.ok(html.includes(`id="${id}"`), `lipsește butonul #${id}`);
  }
  assert.deepEqual([...Object.keys(TAB_RENDERERS)],
    ['compusa', 'timp', 'fond', 'buget', 'sanatate', 'randament', 'diversificare', 'stres', 'suma', 'regula72', 'impozitare', 'datorii', 'dca', 'curs', 'biase', 'cost']);
  assert.equal(typeof goToTab, 'function');
});

test('Accesibilitate — toate tooltip-urile taburilor noi sunt definite și folosite', () => {
  const keys = [
    // N6
    'pn-scenariu', 'pn-varsta', 'pn-pensionare', 'pn-contributie', 'pn-suma',
    'pn-randament', 'pn-comision', 'pn-impozit', 'pn-inflatie',
    'pn-final-brut', 'pn-final-cost', 'pn-final-net', 'pn-contributii', 'pn-castig',
    'pn-impozit-lei', 'pn-cost-comisioane', 'pn-rand-efectiv', 'pn-valoare-reala',
    'pn-evolutie',
    // N7
    'tx-tip', 'tx-an', 'tx-castig', 'tx-rata', 'tx-impozit-lei', 'tx-net',
    'tx-diferenta', 'tx-tabel',
  ];
  for (const key of keys) {
    assert.ok(js.includes(`'${key}': {`), `FORMULA_TIPS lipsește „${key}”`);
    assert.ok(html.includes(`data-tip="${key}"`), `data-tip="${key}" lipsește din HTML`);
  }
});

test('Stocare locală — toate inputurile noi au id (se salvează automat în localStorage)', () => {
  const ids = [
    'pn-scenariu', 'pn-varsta', 'pn-pensionare', 'pn-contributie', 'pn-suma',
    'pn-randament', 'pn-comision', 'pn-impozit', 'pn-inflatie',
    'tx-tip', 'tx-an', 'tx-castig',
  ];
  for (const id of ids) assert.ok(html.includes(`id="${id}"`), `inputul #${id} lipsește`);
  // Selecturile noi au data-default (revin la „Resetează tot”).
  for (const id of ['pn-scenariu', 'tx-tip', 'tx-an']) {
    assert.match(html, new RegExp(`<select id="${id}"[^>]*data-default="[^"]+"`), `${id} trebuie să aibă data-default`);
  }
  includes(js, 'renderPensie();');
  includes(js, 'renderImpozitare();');
});

test('Surse — taburile noi menționează linkuri ASF / PwC / RSM / BNR', () => {
  const panouPensie = html.split('id="panel-pensie"')[1].split('id="panel-impozitare"')[0];
  const panouImpozitare = html.split('id="panel-impozitare"')[1];
  includes(panouPensie, 'asfromania.ro', 'pensie · ASF');
  includes(panouPensie, 'https://www.bnr.ro/', 'pensie · BNR');
  includes(panouPensie, 'insse.ro', 'pensie · INS');
  includes(panouImpozitare, 'taxsummaries.pwc.com', 'impozitare · PwC');
  includes(panouImpozitare, 'ey.com', 'impozitare · EY');
  includes(panouImpozitare, 'rsm.global', 'impozitare · RSM');
  includes(panouImpozitare, 'asfromania.ro', 'impozitare · ASF');
});

test('Stil — panourile noi refolosesc stilurile existente (alarme, tabele, carduri)', () => {
  includes(css, '.alerts');
  includes(css, '.alert.is-ok');
  includes(css, '.alert.is-warn');
  includes(css, '.alert.is-bad');
  includes(css, '.table-wrap');
  includes(css, '.stat-sub');
});
