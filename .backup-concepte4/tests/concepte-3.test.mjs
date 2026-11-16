// Teste pentru conceptele noi 3 (GlitchCoin): N3 diversificare și riscul,
// N8 asigurări, N15 scenarii și vulnerabilitate (stress test).
// Valorile așteptate au fost recalculate independent în Python
// (scratch/recalc-concepte3.py), replicând exact algoritmul din app.js
// (mulberry32 + Box-Muller + Cholesky) pentru a verifica și simularea.
// Rulează: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { gc, html, js, css } from './helpers/bundle.mjs';

const {
  computeDiversificare, simuleazaDiversificare, DV_DEFAULTS, DV_SEED, DV_SIMULATII,
  mulberry32, randn, cholesky, computeAsigurare, AS_PRESETS,
  computeStres, ST_SCENARII, ST_SCEN_ACTIVE, TAB_RENDERERS, goToTab,
} = gc;

// Tolerație pentru virgula fluantă (zecimale).
function near(actual, expected, eps = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= eps, `așteptat ~${expected}, obținut ${actual}`);
}

function includes(haystack, needle, label = 'verificare') {
  assert.ok(haystack.includes(needle), `${label}: lipsește „${needle}”`);
}

/* ══ N3 · Diversificare și riscul ══ */

test('N3 — valorile implicite: randament, volatilitate și randament ajustat la risc', () => {
  const c = computeDiversificare(DV_DEFAULTS, 30, 3.5);
  assert.equal(c.valid, true);
  near(c.rP, 0.062);                                  // 0,5×8% + 0,3×5% + 0,2×3,5%
  near(c.sP, 0.10678951259369997);                   // radical din varianța cu ρ = 0,3
  near(c.sMedie, 0.11800000000000001);                // 0,5×20% + 0,3×6% + 0,2×0%
  near(c.reducere, 0.01121048740630004);
  near(c.reducerePct, 0.09500413056186474);
  near(c.sharpeP, 0.2528338162074621);               // (6,2% − 3,5%) ÷ 10,679%
  near(c.drawdownP, 0.21357902518739993);            // 2σ
  assert.equal(c.idx, 0);
  assert.equal(c.numeA, 'Acțiuni');
  near(c.rA, 0.08);
  near(c.sA, 0.2);
  near(c.sharpeA, 0.22499999999999998);
  near(c.drawdownA, 0.4);
});

test('N3 — corelația comanda diversificarea', () => {
  const rho0 = computeDiversificare(DV_DEFAULTS, 0, 3.5);
  near(rho0.sP, 0.10160708636704431);
  near(rho0.reducerePct, 0.13892299688945509);
  near(rho0.sharpeP, 0.26572949747289765);

  const rho100 = computeDiversificare(DV_DEFAULTS, 100, 3.5);
  near(rho100.sP, 0.11800000000000001);   // egal cu media ponderată
  near(rho100.reducere, 0);
  near(rho100.reducerePct, 0);
  near(rho100.sharpeP, 0.22881355932203384);

  // Cu corelație 100% diversificarea nu aduce nimic.
  assert.ok(rho0.sP < rho100.sP, 'corelația 0 trebuie să dea volatilitate mai mică');
});

test('N3 — ponderile se normalizează și cel puțin un activ cu pondere zero e valid', () => {
  const c = computeDiversificare([
    { nume: 'A', randament: 10, volatilitate: 10, pondere: 10 },
    { nume: 'B', randament: 4, volatilitate: 20, pondere: 10 },
  ], 50, 2);
  assert.deepEqual([...c.w], [0.5, 0.5]);
  near(c.rP, 0.07);

  const invalid = computeDiversificare([
    { nume: 'A', randament: 10, volatilitate: 10, pondere: 0 },
  ], 30, 3.5);
  assert.equal(invalid.valid, false);
  assert.equal(invalid.n, 0);
});

test('N3 — simularea Monte Carlo: portofoliul vs un singur activ', () => {
  const sim = simuleazaDiversificare(DV_DEFAULTS, 30, { suma: 10000 });
  assert.equal(sim.valid, true);
  assert.equal(sim.numeA, 'Acțiuni');

  // Valori exacte, replicate în Python cu același seed.
  near(sim.p.mediana, 13247.556498990223);
  near(sim.p.p5, 9238.022002255828);
  near(sim.p.p95, 18550.991555024848);
  near(sim.p.probPierdere, 0.099);
  near(sim.a.mediana, 13638.476978386909);
  near(sim.a.p5, 6362.719826185466);
  near(sim.a.p95, 26045.744702582768);
  near(sim.a.probPierdere, 0.2404);
  near(sim.ddP.mediana, 0.0567636649284394);
  near(sim.ddA.mediana, 0.16527946183849868);

  // Diversificarea: coada de risc mai bună și drawdown mai mic.
  assert.ok(sim.p.p5 > sim.a.p5, 'portofoliul nu coboară atât de mult ca activul');
  assert.ok(sim.p.probPierdere < sim.a.probPierdere);
  assert.ok(sim.ddP.mediana < sim.ddA.mediana);
  assert.ok(sim.p.minim > sim.a.minim);
});

test('N3 — simularea e deterministă (același seed → aceleași rezultate)', () => {
  const prima = simuleazaDiversificare(DV_DEFAULTS, 30, { suma: 10000, seed: DV_SEED });
  const doua = simuleazaDiversificare(DV_DEFAULTS, 30, { suma: 10000, seed: DV_SEED });
  near(prima.p.mediana, doua.p.mediana, 1e-12);
  near(prima.a.p5, doua.a.p5, 1e-12);

  const altSeed = simuleazaDiversificare(DV_DEFAULTS, 30, { suma: 10000, seed: DV_SEED + 1 });
  assert.ok(Math.abs(altSeed.p.mediana - prima.p.mediana) > 1e-6, 'alt seed trebuie să dea altă secvență');
});

test('N3 — PRNG-ul și normala standard se comportă așa cum se așteapt', () => {
  const rng = mulberry32(DV_SEED);
  const primul = rng();
  assert.ok(primul >= 0 && primul < 1);
  const rng2 = mulberry32(DV_SEED);
  near(rng2(), primul, 1e-15);

  // Normala standard: medie ~0, abatere ~1 pe un număr mare de eșantioane.
  const rng3 = mulberry32(7);
  const esantioane = Array.from({ length: 20000 }, () => randn(rng3));
  const media = esantioane.reduce((a, b) => a + b, 0) / esantioane.length;
  const abatere = Math.sqrt(esantioane.reduce((a, b) => a + b * b, 0) / esantioane.length);
  near(media, 0, 0.05);
  near(abatere, 1, 0.05);
});

test('N3 — Cholesky: L × Lᵀ reproduce matricea de covarianță', () => {
  const A = [[0.04, 0.0036], [0.0036, 0.0036]];
  const L = cholesky(A);
  assert.ok(L, 'matricea trebuie să fie pozitiv definită');
  const recon = [
    [L[0][0] * L[0][0] + L[0][1] * L[0][1], L[0][0] * L[1][0] + L[0][1] * L[1][1]],
    [L[1][0] * L[0][0] + L[1][1] * L[0][1], L[1][0] * L[1][0] + L[1][1] * L[1][1]],
  ];
  near(recon[0][0], A[0][0], 1e-12);
  near(recon[0][1], A[0][1], 1e-12);
  near(recon[1][1], A[1][1], 1e-12);
  // O matrice cu determinant negativ nu e pozitiv definită.
  assert.equal(cholesky([[1, 2], [2, 1]]), null);
});

/* ══ N8 · Asigurări ══ */

test('N8 — primă vs pierdere așteptată și probabilitatea acumulată', () => {
  const r = computeAsigurare(2000, 20000, 8, 10, 3.5);
  near(r.costPrimeNominal, 20000);
  near(r.costPrimeDobanda, 23462.786321206913);      // primă × ((1,035)^10 − 1) ÷ 0,035
  near(r.pierdereAnuala, 1600);                      // 8% × 20.000
  near(r.pierdereTotala, 16000);
  near(r.diferentaAnuala, 400);
  near(r.diferentaTotala, 4000);
  near(r.probCelPutinOData, 0.5656115457763677);     // 1 − 0,92^10
  near(r.aniMedie, 12.5);
});

test('N8 — cazuri particulare: dobândă zero, probabilitate 0 și 100%', () => {
  const r0 = computeAsigurare(2000, 20000, 8, 10, 0);
  near(r0.costPrimeDobanda, 20000);                  // fără dobândă: primă × ani
  near(r0.pierdereAnuala, 1600);

  const p0 = computeAsigurare(2000, 20000, 0, 10, 3.5);
  near(p0.pierdereAnuala, 0);
  near(p0.probCelPutinOData, 0);
  near(p0.diferentaAnuala, 2000);

  const p100 = computeAsigurare(2000, 20000, 100, 10, 3.5);
  near(p100.probCelPutinOData, 1);
  near(p100.pierdereAnuala, 20000);
  near(p100.aniMedie, 1);
});

test('N8 — presetele ilustrative: casă, mașină, sănătate', () => {
  assert.deepEqual({ ...AS_PRESETS.sanatate }, { prima: 2000, suma: 20000, probabilitate: 8 });
  assert.deepEqual({ ...AS_PRESETS.casa }, { prima: 500, suma: 150000, probabilitate: 1 });
  assert.deepEqual({ ...AS_PRESETS.masina }, { prima: 1500, suma: 25000, probabilitate: 6 });

  const casa = computeAsigurare(AS_PRESETS.casa.prima, AS_PRESETS.casa.suma, AS_PRESETS.casa.probabilitate, 10, 3.5);
  near(casa.pierdereAnuala, 1500);
  near(casa.diferentaAnuala, -1000);                 // pierderea așteptată depășește prima

  const masina = computeAsigurare(AS_PRESETS.masina.prima, AS_PRESETS.masina.suma, AS_PRESETS.masina.probabilitate, 10, 3.5);
  near(masina.pierdereAnuala, 1500);
  near(masina.diferentaAnuala, 0);
});

/* ══ N15 · Stress test ══ */

test('N15 — scenariul implicit (inflație 10% + venit −20% + active −20%)', () => {
  const r = computeStres(5000, 2500, 1000, 10000, 20000, 12, 10, 20, -20);
  near(r.factorInfl, 1.1);
  near(r.cheltuieliNoi, 2750);                       // 2500 × 1,1
  near(r.venitNou, 4000);                            // 5000 × 0,8
  near(r.soldLunar, 1250);
  assert.equal(r.luniRezerva, null);                 // nu e deficit
  near(r.rezervaMinima, 8250);
  near(r.putereEconomii, 909.090909090909);          // 1000 ÷ 1,1
  near(r.activeNoi, 16000);
  near(r.pierdereActive, 4000);
  near(r.randamentRevenire, 0.25);                   // −20% cere +25%
  near(r.valoareAsteptata, 19500);                   // 0,25×22.000 + 0,5×20.000 + 0,25×16.000
  near(r.valoarePesimist, 16000);
  assert.equal(r.scenarii.length, 3);
  assert.deepEqual([...r.scenarii.map((s) => s.nume)], ['Optimist', 'Bază', 'Pesimist']);
  near(r.scenarii[0].valoare, 22000);
  near(r.scenarii[1].valoare, 20000);
});

test('N15 — deficit și acoperirea rezervei', () => {
  const r = computeStres(3000, 2500, 0, 10000, 0, 12, 10, 20, 0);
  near(r.venitNou, 2400);
  near(r.cheltuieliNoi, 2750);
  near(r.soldLunar, -350);
  near(r.luniRezerva, 10000 / 350);
  assert.ok(r.luniRezerva > 3, 'rezerva acoperă mai mult de 3 luni în acest caz');

  const faraRezerva = computeStres(3000, 2500, 0, 0, 0, 12, 10, 20, 0);
  near(faraRezerva.luniRezerva, 0);

  const faraDeficit = computeStres(5000, 2500, 0, 10000, 0, 12, 10, 0, 0);
  assert.equal(faraDeficit.luniRezerva, null);
});

test('N15 — activele: randament 0, −100% și pozitiv', () => {
  const r0 = computeStres(5000, 2500, 1000, 10000, 20000, 12, 10, 20, 0);
  near(r0.activeNoi, 20000);
  near(r0.pierdereActive, 0);
  assert.equal(r0.randamentRevenire, null);

  const rMinus = computeStres(5000, 2500, 1000, 10000, 20000, 12, 10, 20, -100);
  near(rMinus.activeNoi, 0);
  near(rMinus.pierdereActive, 20000);
  assert.equal(rMinus.randamentRevenire, null);

  const rPlus = computeStres(5000, 2500, 1000, 10000, 20000, 12, 10, 20, 10);
  near(rPlus.activeNoi, 22000);
  near(rPlus.pierdereActive, 0);
  assert.equal(rPlus.randamentRevenire, null);
  // Scenariul pesimist preia randamentul introdus (+10%): 0,25×22.000 + 0,5×20.000 + 0,25×22.000.
  near(rPlus.valoareAsteptata, 21000);
});

test('N15 — scenariile predefinite din selector', () => {
  assert.deepEqual({ ...ST_SCENARII.inflatie10 }, { inflatie: 10, scadereVenit: 0, randament: 0 });
  assert.deepEqual({ ...ST_SCENARII.recesiune }, { inflatie: 3, scadereVenit: 20, randament: -20 });
  assert.deepEqual({ ...ST_SCENARII.soc }, { inflatie: 10, scadereVenit: 20, randament: -20 });
  assert.equal(ST_SCENARII.personalizat, null);

  const r = computeStres(5000, 2500, 1000, 10000, 20000, 12, 3, 20, -20);
  near(r.factorInfl, 1.03);
  near(r.cheltuieliNoi, 2575);
  near(r.soldLunar, 1425);
  near(r.putereEconomii, 970.8737864077669);
});

test('N15 — valoarea așteptată e media ponderată a scenariilor', () => {
  const active = 20000;
  const randament = -20; // procente, ca în input
  const r = computeStres(5000, 2500, 1000, 10000, active, 12, 10, 20, randament);
  const asteptata = ST_SCEN_ACTIVE.reduce((acc, s) => {
    const rand = s.randament === null ? randament / 100 : s.randament;
    return acc + s.probabilitate * active * (1 + rand);
  }, 0);
  near(r.valoareAsteptata, asteptata, 1e-12);
  // Probabilitățile sumă la 1.
  near(ST_SCEN_ACTIVE.reduce((acc, s) => acc + s.probabilitate, 0), 1);
});

/* ══ Structură și accesibilitate ══ */

test('Structură — bara de taburi are 18 taburi și 18 panouri, cu id-uri corelate', () => {
  const tabIds = [...html.matchAll(/<button[^>]*class="tab[^"]*"[^>]*id="tab-([a-z0-9]+)"/g)].map((m) => m[1]);
  const panelIds = [...html.matchAll(/<section id="panel-([a-z0-9]+)" class="tab-panel[^"]*"/g)].map((m) => m[1]);
  assert.equal(tabIds.length, 18, `taburi: ${tabIds.length}`);
  assert.equal(panelIds.length, 18, `panouri: ${panelIds.length}`);
  assert.deepEqual(tabIds, panelIds);

  const expectedNew = ['diversificare', 'asigurari', 'stres'];
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
    // N3
    'dv-suma', 'dv-corelare', 'dv-rf', 'dv-body', 'dv-add', 'dv-reset',
    'dv-summary', 'dv-alerte', 'dv-randament', 'dv-volatilitate', 'dv-reducere', 'dv-sharpe',
    'dv-t-nume-a', 'dv-t-r-p', 'dv-t-r-a', 'dv-t-v-p', 'dv-t-v-a', 'dv-t-dd-p', 'dv-t-dd-a',
    'dv-t-sh-p', 'dv-t-sh-a', 'dv-t-med-p', 'dv-t-med-a', 'dv-t-p5-p', 'dv-t-p5-a',
    'dv-t-p95-p', 'dv-t-p95-a', 'dv-t-pl-p', 'dv-t-pl-a', 'dv-t-ddm-p', 'dv-t-ddm-a',
    'dv-scen-body',
    // N8
    'as-tip', 'as-prima', 'as-suma', 'as-probabilitate', 'as-ani', 'as-dobanda',
    'as-summary', 'as-alerte', 'as-cost-prime', 'as-pierdere-anuala', 'as-diferenta', 'as-prob',
    'as-t-cost-an-asig', 'as-t-cost-an-auto', 'as-t-cost-n-asig', 'as-t-cost-n-auto',
    'as-t-eveniment-asig', 'as-t-eveniment-auto', 'as-t-risc-asig', 'as-t-risc-auto',
    'as-t-lichid-asig', 'as-t-lichid-auto', 'as-presets-body',
    // N15
    'st-scenariu', 'st-venit', 'st-cheltuieli', 'st-economii', 'st-rezerva', 'st-active',
    'st-luni', 'st-inflatie', 'st-scadere', 'st-randament',
    'st-summary', 'st-alerte', 'st-venit-nou', 'st-cheltuieli-noi', 'st-sold-lunar',
    'st-luni-rezerva', 'st-putere-economii', 'st-active-noi', 'st-pierdere-active',
    'st-randament-revenire', 'st-scen-body',
  ];
  for (const id of ids) assert.ok(html.includes(`id="${id}"`), `lipsește #${id}`);
});

test('Structură — legăturile dintre taburi sunt prezente (butoane + TAB_RENDERERS)', () => {
  for (const id of ['dv-go-randament', 'st-go-buget', 'st-go-sanatate', 'bg-go-stres', 'sf-go-stres']) {
    assert.ok(html.includes(`id="${id}"`), `lipsește butonul #${id}`);
  }
  assert.deepEqual([...Object.keys(TAB_RENDERERS)],
    ['timp', 'fond', 'buget', 'sanatate', 'randament', 'diversificare', 'stres']);
  assert.equal(typeof goToTab, 'function');
});

test('Accesibilitate — toate tooltip-urile taburilor noi sunt definite și folosite', () => {
  const keys = [
    // N3
    'dv-suma', 'dv-corelare', 'dv-rf', 'dv-randament', 'dv-volatilitate', 'dv-reducere',
    'dv-sharpe', 'dv-cmp',
    // N8
    'as-tip', 'as-prima', 'as-suma', 'as-probabilitate', 'as-ani', 'as-dobanda',
    'as-cost-prime', 'as-pierdere-anuala', 'as-diferenta', 'as-prob',
    // N15
    'st-scenariu', 'st-venit', 'st-cheltuieli', 'st-economii', 'st-rezerva', 'st-active',
    'st-luni', 'st-inflatie', 'st-scadere', 'st-randament', 'st-venit-nou',
    'st-cheltuieli-noi', 'st-sold-lunar', 'st-luni-rezerva', 'st-putere-economii',
    'st-active-noi', 'st-pierdere-active', 'st-randament-revenire', 'st-scenarii',
  ];
  for (const key of keys) {
    assert.ok(js.includes(`'${key}': {`), `FORMULA_TIPS lipsește „${key}”`);
    assert.ok(html.includes(`data-tip="${key}"`), `data-tip="${key}" lipsește din HTML`);
  }
});

test('Stocare locală — toate inputurile noi au id (se salvează automat în localStorage)', () => {
  const ids = [
    'dv-suma', 'dv-corelare', 'dv-rf',
    'as-tip', 'as-prima', 'as-suma', 'as-probabilitate', 'as-ani', 'as-dobanda',
    'st-scenariu', 'st-venit', 'st-cheltuieli', 'st-economii', 'st-rezerva', 'st-active',
    'st-luni', 'st-inflatie', 'st-scadere', 'st-randament',
  ];
  for (const id of ids) assert.ok(html.includes(`id="${id}"`), `inputul #${id} lipsește`);
  // Selecturile noi au data-default (lehină la „Resetează tot”).
  for (const id of ['as-tip', 'st-scenariu']) {
    assert.match(html, new RegExp(`<select id="${id}"[^>]*data-default="[^"]+"`), `${id} trebuie să aibă data-default`);
  }
  includes(js, "'glitchcoin-table:diversificare'");
});

test('Surse — taburile noi menționează linkuri BNR / INS / ASF', () => {
  const panouDiversificare = html.split('id="panel-diversificare"')[1].split('id="panel-asigurari"')[0];
  const panouAsigurari = html.split('id="panel-asigurari"')[1].split('id="panel-stres"')[0];
  const panouStres = html.split('id="panel-stres"')[1];
  includes(panouDiversificare, 'https://www.bnr.ro/', 'diversificare · BNR');
  includes(panouDiversificare, 'asf.ro', 'diversificare · ASF');
  includes(panouAsigurari, 'asf.ro', 'asigurări · ASF');
  includes(panouAsigurari, 'https://www.bnr.ro/', 'asigurări · BNR');
  includes(panouStres, 'https://www.bnr.ro/', 'stres · BNR');
  includes(panouStres, 'insse.ro', 'stres · INS');
});

test('Stil — panourile noi refolosesc stilurile existente (alarme, tabele, carduri)', () => {
  includes(css, '.alerts');
  includes(css, '.alert.is-ok');
  includes(css, '.alert.is-warn');
  includes(css, '.alert.is-bad');
  includes(css, '.table-actions');
  includes(css, '.row-delete');
  includes(css, '.cell-input');
});
