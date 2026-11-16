// Teste pentru conceptele noi 5 (GlitchCoin): N9 datorii bune vs rele,
// N12 scalarea în timp (DCA).
// Valorile așteptate au fost recalculate independent în Python
// (scratch/recalc-concepte5.py), replicând exact algoritmul din app.js.
// Rulează: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { gc, html, js, css } from './helpers/bundle.mjs';

const {
  computeDatorii, rataAnuitate, computeDca, DCA_SCENARII, computeCost,
  TAB_RENDERERS, goToTab, renderDatorii, renderDca,
} = gc;

// Tolerație pentru virgula fluantă (zecimale).
function near(actual, expected, eps = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= eps, `așteptat ~${expected}, obținut ${actual}`);
}

function includes(haystack, needle, label = 'verificare') {
  assert.ok(haystack.includes(needle), `${label}: lipsește „${needle}”`);
}

/* ══ N9 · Datorii bune vs rele ══ */

test('N9 — scenariul implicit (100.000 lei, 8%, 120 luni, economii 5%, 10% impozit, 500 lei extra)', () => {
  const c = computeDatorii({ suma: 100000, dobanda: 8, durata: 120, economie: 5, impozit: 10, avans: 500 });
  assert.equal(c.valid, true);
  assert.equal(c.n, 120);

  near(c.pmt, 1213.2759435535777);            // anuitate constantă
  near(c.costTotal, 45593.1132264275);        // dobânda totală fără anticipare
  near(c.costAntic, 27081.16862190051);       // cu 500 lei în plus pe lună
  assert.equal(c.luniAntic, 75);              // de la 120 la 75 de luni
  near(c.economisireDobanda, 18511.94460452699);
  near(c.randAntic, 0.08);                    // = dobânda creditului
  near(c.randEconomiiNet, 0.045);             // 5% × (1 − 10%)
  near(c.arbitraj, 0.035);
  near(c.pragEconomisire, 0.08888888888888889); // 8% ÷ (1 − 10%)
  near(c.valoareEconomii, 75599.03683757166);
  near(c.castigEconomii, 15599.036837571664);
  near(c.diferenta, 2912.907766955326);
  assert.equal(c.verdict, 'anticipare');

  // Tabelul are un rând pe an, cumulative.
  assert.equal(c.rows.length, 10);
  assert.deepEqual(
    { ...c.rows[0] },
    { an: 1, dobandaFara: 7754.0662629393755, dobandaCu: 7529.10325237607, economii: 6125.310005412069, diferenta: -5900.346994848763 },
  );
  const ultim = c.rows[9];
  near(ultim.dobandaFara, c.costTotal, 1e-9);
  near(ultim.dobandaCu, c.costAntic, 1e-9);
  near(ultim.economii, c.valoareEconomii, 1e-9);
});

test('N9 — economia mai mare decât creditul (5% vs 9%)', () => {
  const c = computeDatorii({ suma: 100000, dobanda: 5, durata: 120, economie: 9, impozit: 10, avans: 500 });
  near(c.pragEconomisire, 0.05555555555555556); // 5% ÷ (1 − 10%)
  near(c.arbitraj, 0.05 - 0.081);
  assert.equal(c.verdict, 'economisire');
  assert.ok(c.diferenta < 0, 'economisirea va da un câștig net mai mare');
  near(c.diferenta, -21281.152391979453);
});

test('N9 — fără sumă suplimentară: neutru, nimic de comparat', () => {
  const c = computeDatorii({ suma: 100000, dobanda: 8, durata: 120, economie: 5, impozit: 10, avans: 0 });
  assert.equal(c.verdict, 'neutral');
  near(c.economisireDobanda, 0);
  near(c.castigEconomii, 0);
  near(c.diferenta, 0);
  near(c.costTotal, c.costAntic);
  assert.equal(c.luniAntic, 120);
});

test('N9 — credit fără dobândă: anticiparea nu economisește nimic', () => {
  const c = computeDatorii({ suma: 100000, dobanda: 0, durata: 120, economie: 5, impozit: 10, avans: 500 });
  near(c.pmt, 833.3333333333334); // P ÷ n
  near(c.costTotal, 0);
  near(c.costAntic, 0);
  near(c.economisireDobanda, 0);
  assert.equal(c.verdict, 'economisire');
});

test('N9 — sumă zero e invalidă', () => {
  const c = computeDatorii({ suma: 0, dobanda: 8, durata: 120, economie: 5, impozit: 10, avans: 500 });
  assert.equal(c.valid, false);
  assert.equal(c.verdict, '');
});

test('N9 — durata scurtă (12 luni, 10%, 200 lei extra)', () => {
  const c = computeDatorii({ suma: 12000, dobanda: 10, durata: 12, economie: 6, impozit: 10, avans: 200 });
  assert.equal(c.n, 12);
  near(c.pmt, 1054.9906467601184);
  near(c.costTotal, 659.887761121379);
  near(c.costAntic, 557.1718530412456);
  assert.equal(c.luniAntic, 11);
  assert.equal(c.rows.length, 1);
  assert.deepEqual(
    { ...c.rows[0] },
    { an: 1, dobandaFara: 659.887761121379, dobandaCu: 557.1718530412456, economii: 2460.300086671226, diferenta: -2357.5841785910925 },
  );
});

test('N9 — rataAnuitate: formulă și cazul fără dobândă', () => {
  near(rataAnuitate(100000, 0, 120), 833.3333333333334);
  near(rataAnuitate(100000, 0.08 / 12, 120), 1213.2759435535777);
  // Rata × numărul de luni acoperă exact suma + dobânda.
  const p = 100000;
  const i = 0.08 / 12;
  near(rataAnuitate(p, i, 120) * 120, p + 45593.1132264275, 1e-6);
});

/* ══ N12 · Scalarea în timp (DCA) ══ */

test('N12 — scenariul implicit (volatil: scădere și recuperare) → DCA câștigă', () => {
  const c = computeDca({ suma: 12000, luni: 12, randament: 8, volatilitate: 20, scenariu: 'volatil' });
  assert.equal(c.valid, true);
  assert.equal(c.scen, 'volatil');
  near(c.pretFinal, 100);                    // se întoarce la start
  near(c.costMediu, 96.3114788161402);
  near(c.pretMediu, 96.34549109859995);
  near(c.unitatiDca, 124.59574027420084);
  near(c.unitatiLump, 120);
  near(c.valoareDca, 12459.574027420083);
  near(c.valoareLump, 12000);
  near(c.diferenta, 459.57402742008344);
  assert.equal(c.verdict, 'dca');
  assert.ok(c.costMediu < c.pretMediu, 'media armonică e sub media aritmetică');
  assert.equal(c.rows.length, 12);
});

test('N12 — creștere: investirea o dată câștigă', () => {
  const c = computeDca({ suma: 12000, luni: 12, randament: 8, volatilitate: 20, scenariu: 'creste' });
  near(c.pretFinal, 108.29995068075098);
  near(c.costMediu, 103.69481612831649);
  near(c.pretMediu, 103.7493835093884);
  near(c.unitatiDca, 115.72420346597343);
  near(c.valoareDca, 12532.925527934114);
  near(c.valoareLump, 12995.994081690118);
  near(c.diferenta, -463.0685537560039);
  assert.equal(c.verdict, 'lump');
  // Media armonică e întotdeauna ≤ media aritmetică; în creștere e peste prețul de start,
  // deci investirea o dată (cumpărată la start) ia mai multe unități.
  assert.ok(c.costMediu < c.pretMediu, 'media armonică e sub media aritmetică');
  assert.ok(c.costMediu > 100, 'în creștere, costul mediu e peste prețul de start');
});

test('N12 — scădere: DCA câștigă', () => {
  const c = computeDca({ suma: 12000, luni: 12, randament: 8, volatilitate: 20, scenariu: 'scade' });
  near(c.pretFinal, 92.28691155769535);
  near(c.costMediu, 96.36221598961936);
  near(c.pretMediu, 96.41360552880742);
  near(c.unitatiDca, 124.53013742744047);
  near(c.valoareDca, 11492.501779033846);
  near(c.valoareLump, 11074.429386923443);
  near(c.diferenta, 418.0723921104036);
  assert.equal(c.verdict, 'dca');
});

test('N12 — creștere cu volatilitate: investirea o dată rămâne în față', () => {
  const c = computeDca({ suma: 12000, luni: 12, randament: 8, volatilitate: 20, scenariu: 'creste-volatil' });
  near(c.pretFinal, 108.29995068075098);
  near(c.costMediu, 103.5963735816439);
  near(c.valoareDca, 12544.834951628905);
  near(c.valoareLump, 12995.994081690118);
  near(c.diferenta, -451.15913006121264);
  assert.equal(c.verdict, 'lump');
});

test('N12 — costul mediu e media armonică; DCA și „o dată” dau același rezultat la o lună', () => {
  const c = computeDca({ suma: 12000, luni: 12, randament: 8, volatilitate: 20, scenariu: 'volatil' });
  near(c.costMediu, 12000 / c.unitatiDca, 1e-9);

  const una = computeDca({ suma: 12000, luni: 1, randament: 8, volatilitate: 20, scenariu: 'volatil' });
  near(una.pretFinal, 100);
  near(una.costMediu, 100);
  near(una.diferenta, 0);
  assert.equal(una.verdict, 'indiferent');

  const inv = computeDca({ suma: 0, luni: 12, randament: 8, volatilitate: 20, scenariu: 'volatil' });
  assert.equal(inv.valid, false);
  assert.equal(inv.verdict, '');
});

test('N12 — DCA → „Costul mediu de achiziție”: aceleași tranșe dau același cost mediu', () => {
  const c = computeDca({ suma: 12000, luni: 12, randament: 8, volatilitate: 20, scenariu: 'volatil' });
  const rows = c.rows.map((r) => ({
    pret: Number(r.pret.toFixed(6)),
    cantitate: Number((r.investitie / r.pret).toFixed(6)),
    comision: 0,
  }));
  const cost = computeCost(rows);
  // Rotunjirea la 6 zecimale din handler adaugă o eroare de ordinul 1e-5 lei.
  near(cost.sumaValori, 12000, 1e-3);
  near(cost.costMediu, c.costMediu, 1e-3);
});

test('N12 — scenariile predefinite din selector', () => {
  assert.deepEqual({ ...DCA_SCENARII.creste }, { nume: 'Creștere lină', randament: 8, volatilitate: 0 });
  assert.deepEqual({ ...DCA_SCENARII.scade }, { nume: 'Scădere lină', randament: 8, volatilitate: 0 });
  assert.deepEqual({ ...DCA_SCENARII.volatil }, { nume: 'Volatil (scădere și recuperare)', randament: 0, volatilitate: 20 });
  assert.deepEqual({ ...DCA_SCENARII['creste-volatil'] }, { nume: 'Creștere cu volatilitate', randament: 8, volatilitate: 20 });
});

/* ══ Structură și accesibilitate ══ */

test('Smoke — renderer-el taburilor noi rulează fără excepții (DOM fals)', () => {
  // Prinde ReferenceError/TypeError în node, nu doar în browser: o variabilă
  // scrisă greșit într-un renderer ar blocat tabul în producție.
  assert.equal(typeof renderDatorii, 'function');
  assert.equal(typeof renderDca, 'function');
  assert.doesNotThrow(() => renderDatorii());
  assert.doesNotThrow(() => renderDca());
});

test('Structură — bara de taburi are 24 de taburi și 24 de panouri, cu id-uri corelate', () => {
  const tabIds = [...html.matchAll(/<button[^>]*class="tab[^"]*"[^>]*id="tab-([a-z0-9]+)"/g)].map((m) => m[1]);
  const panelIds = [...html.matchAll(/<section id="panel-([a-z0-9]+)" class="tab-panel[^"]*"/g)].map((m) => m[1]);
  assert.equal(tabIds.length, 24, `taburi: ${tabIds.length}`);
  assert.equal(panelIds.length, 24, `panouri: ${panelIds.length}`);
  assert.deepEqual(tabIds, panelIds);

  const expectedNew = ['datorii', 'dca'];
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
    // N9 · Datorii
    'dt-suma', 'dt-dobanda', 'dt-durata', 'dt-economie', 'dt-impozit', 'dt-avans',
    'dt-summary', 'dt-alerte', 'dt-rata', 'dt-cost-total', 'dt-cost-antic',
    'dt-economie-dobanda', 'dt-rand-antic', 'dt-castig-economie', 'dt-prag',
    'dt-diferenta', 'dt-verdict', 'dt-evol-body',
    // N12 · DCA
    'dc-scenariu', 'dc-suma', 'dc-luni', 'dc-randament', 'dc-volatilitate',
    'dc-summary', 'dc-alerte', 'dc-pret-final', 'dc-cost-mediu', 'dc-pret-mediu',
    'dc-valoare-dca', 'dc-valoare-lump', 'dc-diferenta', 'dc-verdict', 'dc-body',
  ];
  for (const id of ids) assert.ok(html.includes(`id="${id}"`), `lipsește #${id}`);
});

test('Structură — legăturile dintre taburi sunt prezente (butoane + TAB_RENDERERS)', () => {
  for (const id of ['dt-go-oportunitate', 'di-go-datorii', 'cost-go-dca', 'dc-go-cost']) {
    assert.ok(html.includes(`id="${id}"`), `lipsește butonul #${id}`);
  }
  assert.deepEqual([...Object.keys(TAB_RENDERERS)],
    ['compusa', 'timp', 'fond', 'buget', 'sanatate', 'randament', 'diversificare', 'stres', 'suma', 'regula72', 'impozitare', 'datorii', 'dca', 'curs', 'biase', 'cost']);
  assert.equal(typeof goToTab, 'function');
});

test('Accesibilitate — toate tooltip-urile taburilor noi sunt definite și folosite', () => {
  const keys = [
    // N9
    'dt-suma', 'dt-dobanda', 'dt-durata', 'dt-economie', 'dt-impozit', 'dt-avans',
    'dt-rata', 'dt-cost-total', 'dt-cost-antic', 'dt-economie-dobanda', 'dt-rand-antic',
    'dt-castig-economie', 'dt-prag', 'dt-diferenta', 'dt-verdict', 'dt-evolutie', 'dt-tabel',
    // N12
    'dc-scenariu', 'dc-suma', 'dc-luni', 'dc-randament', 'dc-volatilitate',
    'dc-pret-final', 'dc-cost-mediu', 'dc-pret-mediu', 'dc-valoare-dca',
    'dc-valoare-lump', 'dc-diferenta', 'dc-verdict', 'dc-evolutie',
  ];
  for (const key of keys) {
    assert.ok(js.includes(`'${key}': {`), `FORMULA_TIPS lipsește „${key}”`);
    assert.ok(html.includes(`data-tip="${key}"`), `data-tip="${key}" lipsește din HTML`);
  }
});

test('Stocare locală — toate inputurile noi au id (se salvează automat în localStorage)', () => {
  const ids = [
    'dt-suma', 'dt-dobanda', 'dt-durata', 'dt-economie', 'dt-impozit', 'dt-avans',
    'dc-scenariu', 'dc-suma', 'dc-luni', 'dc-randament', 'dc-volatilitate',
  ];
  for (const id of ids) assert.ok(html.includes(`id="${id}"`), `inputul #${id} lipsește`);
  // Selectul nou are data-default (revine la „Resetează tot”).
  assert.match(html, /<select id="dc-scenariu"[^>]*data-default="[^"]+"/, 'dc-scenariu trebuie să aibă data-default');
  includes(js, 'renderDatorii();');
  includes(js, 'renderDca();');
  includes(js, 'initDatorii();');
  includes(js, 'initDca();');
});

test('Surse — taburile noi menționează linkuri BNR / INS / Investor.gov', () => {
  const panouDatorii = html.split('id="panel-datorii"')[1].split('id="panel-dca"')[0];
  const panouDca = html.split('id="panel-dca"')[1];
  includes(panouDatorii, 'https://www.bnr.ro/', 'datorii · BNR');
  includes(panouDatorii, 'insse.ro', 'datorii · INS');
  includes(panouDatorii, 'investor.gov', 'datorii · Investor.gov');
  includes(panouDca, 'investor.gov', 'dca · Investor.gov');
  includes(panouDca, 'https://www.bnr.ro/', 'dca · BNR');
  includes(panouDca, 'insse.ro', 'dca · INS');
});

test('Stil — panourile noi refolosesc stilurile existente (alarme, tabele, carduri)', () => {
  includes(css, '.alerts');
  includes(css, '.alert.is-ok');
  includes(css, '.alert.is-warn');
  includes(css, '.alert.is-bad');
  includes(css, '.table-wrap');
  includes(css, '.stat-sub');
});
