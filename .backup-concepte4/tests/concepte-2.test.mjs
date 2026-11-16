// Teste pentru conceptele noi 2 (GlitchCoin): N2 buget personal 50/30/20,
// N13 sănătatea financiară / indicatori.
// Valorile așteptate au fost recalculate independent în Python
// (scratch/recalc-concepte2.py) și comparate cu ieșirea funcțiilor din app.js.
// Rulează: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { gc, html, js, css } from './helpers/bundle.mjs';

const {
  computeBuget, computeSanatate,
  stareRataEconomii, stareDatoriiVenit, stareRezerva, stareNetWorth,
  TAB_RENDERERS, goToTab, fmtNum, fmtPctSafe, fmtDeviereLei,
} = gc;

// Tolerație pentru virgula fluantă (zecimale).
function near(actual, expected, eps = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= eps, `așteptat ~${expected}, obținut ${actual}`);
}

function includes(haystack, needle, label = 'verificare') {
  assert.ok(haystack.includes(needle), `${label}: lipsește „${needle}”`);
}

/* ══ N2 · Buget personal 50/30/20 ══ */

test('N2 — valorile implicite: țintele 50/30/20 se potrivesc exact', () => {
  const r = computeBuget(5000, 2500, 1500, 1000, 248);
  near(r.total, 5000);
  near(r.tinta.nevoi, 2500);
  near(r.tinta.dorinte, 1500);
  near(r.tinta.economii, 1000);
  near(r.procent.nevoi, 0.5);
  near(r.procent.dorinte, 0.3);
  near(r.procent.economii, 0.2);
  near(r.procent.total, 1);
  near(r.deviere.nevoi, 0);
  near(r.deviere.dorinte, 0);
  near(r.deviere.economii, 0);
  near(r.ramas, 0);
  assert.equal(r.alertes.length, 1);
  assert.equal(r.alertes[0].nivel, 'ok');
});

test('N2 — zilele și orele lucrate pentru dorințe și economii', () => {
  const r = computeBuget(5000, 2500, 1500, 1000, 248);
  near(r.venitZiLucr, 5000 * 12 / 248);          // 241,93548387096774
  near(r.zileLucrateDorinte, 6.2);               // 1500 ÷ 241,94
  near(r.oreLucrateDorinte, 49.6);               // 6,2 × 8
  near(r.zileLucrateEconomii, 4.133333333333333);

  // Alt număr de zile lucrătoare schimbă rezultatele proporțional.
  const r240 = computeBuget(5000, 2500, 1500, 1000, 240);
  near(r240.venitZiLucr, 250);
  near(r240.zileLucrateDorinte, 6);
});

test('N2 — deficit, nevoi peste țintă și economii sub țintă (3 alarme)', () => {
  const r = computeBuget(4000, 2500, 1200, 600, 248);
  near(r.total, 4300);
  near(r.tinta.nevoi, 2000);
  near(r.tinta.dorinte, 1200);
  near(r.tinta.economii, 800);
  near(r.procent.nevoi, 0.625);
  near(r.procent.economii, 0.15);
  near(r.procent.total, 1.075);
  near(r.deviere.nevoi, 500);
  near(r.deviere.economii, -200);
  near(r.ramas, -300);

  const nivele = [...r.alertes.map((a) => a.nivel)];
  assert.deepEqual(nivele, ['bad', 'warn', 'warn']);
  assert.ok(r.alertes[0].text.includes('deficit'));
  assert.ok(r.alertes[1].text.includes('Nevoi'));
  assert.ok(r.alertes[2].text.includes('Economii'));
});

test('N2 — economii sub 10% declanșează alarma „bad”', () => {
  const r = computeBuget(5000, 2600, 1400, 300, 248);
  near(r.procent.economii, 0.06);
  near(r.deviere.economii, -700);
  near(r.ramas, 700);
  const nivele = [...r.alertes.map((a) => a.nivel)];
  assert.deepEqual(nivele, ['warn', 'bad']);
  assert.ok(r.alertes[1].text.includes('6,00%'));
});

test('N2 — venit zero: procentele sunt nule și există o singură atenționare', () => {
  const r = computeBuget(0, 0, 0, 0, 248);
  assert.equal(r.procent.nevoi, null);
  assert.equal(r.procent.dorinte, null);
  assert.equal(r.procent.economii, null);
  assert.equal(r.procent.total, null);
  assert.equal(r.venitZiLucr, null);
  assert.equal(r.zileLucrateDorinte, null);
  assert.equal(r.alertes.length, 1);
  assert.equal(r.alertes[0].nivel, 'warn');
});

/* ══ N13 · Sănătatea financiară ══ */

test('N13 — valorile implicite: 4 din 4 indicatori în zona sănătoasă', () => {
  const r = computeSanatate(5000, 2500, 1000, 500, 10000, 15000, 0);
  near(r.rataEconomii, 0.2);
  near(r.datoriiVenit, 0.1);
  near(r.luniRezerva, 4);
  near(r.tintaMin, 7500);
  near(r.tintaMax, 15000);
  near(r.activeTotal, 25000);
  near(r.netWorth, 25000);
  near(r.netWorthLuni, 25000 / 60000);
  near(r.lipsa, 0);
  assert.deepEqual({ ...r.statusuri }, {
    rataEconomii: 'ok', datoriiVenit: 'ok', rezervaLuni: 'ok', netWorth: 'ok',
  });
  assert.equal(r.scorOk, 4);
  assert.equal(r.alarme.length, 1);
  assert.equal(r.alarme[0].nivel, 'ok');
});

test('N13 — scenariul de risc: alarme pe toți indicatorii, net worth negativ', () => {
  const r = computeSanatate(4000, 2500, 300, 1800, 2000, 5000, 30000);
  near(r.rataEconomii, 0.075);
  near(r.datoriiVenit, 0.45);
  near(r.luniRezerva, 0.8);
  near(r.tintaMin, 7500);
  near(r.tintaMax, 15000);
  near(r.activeTotal, 7000);
  near(r.netWorth, -23000);
  near(r.netWorthLuni, -23000 / 48000);
  near(r.lipsa, 5500);
  assert.deepEqual({ ...r.statusuri }, {
    rataEconomii: 'bad', datoriiVenit: 'warn', rezervaLuni: 'bad', netWorth: 'bad',
  });
  assert.equal(r.scorOk, 0);
  const nivele = [...r.alarme.map((a) => a.nivel)];
  assert.deepEqual(nivele, ['bad', 'warn', 'bad', 'bad']);
  assert.ok(r.alarme[3].text.includes('-23.000') || r.alarme[3].text.includes('23.000'));
});

test('N13 — venit zero: ratele devin nule, rezerva rămâne calculabilă', () => {
  const r = computeSanatate(0, 2500, 0, 0, 0, 0, 0);
  assert.equal(r.rataEconomii, null);
  assert.equal(r.datoriiVenit, null);
  near(r.luniRezerva, 0);
  near(r.netWorthLuni, 0, 1e-12);
  assert.equal(r.statusuri.rataEconomii, 'warn');
  assert.equal(r.statusuri.netWorth, 'warn');
  assert.ok(r.alarme.some((a) => a.text.includes('venitul lunar net')));
});

test('N13 — pragurile pe fiecare indicator', () => {
  // Rată de economii: ≥ 20% ok, 10–20% atenționare, < 10% alarmă.
  assert.equal(stareRataEconomii(0.2), 'ok');
  assert.equal(stareRataEconomii(0.15), 'warn');
  assert.equal(stareRataEconomii(0.05), 'bad');
  // Datorii / venit: ≤ 36% ok, 36–50% atenționare, > 50% alarmă.
  assert.equal(stareDatoriiVenit(0.36), 'ok');
  assert.equal(stareDatoriiVenit(0.45), 'warn');
  assert.equal(stareDatoriiVenit(0.6), 'bad');
  // Rezervă: ≥ 3 luni ok, 1–3 atenționare, < 1 alarmă.
  assert.equal(stareRezerva(3), 'ok');
  assert.equal(stareRezerva(2), 'warn');
  assert.equal(stareRezerva(0.5), 'bad');
  // Net worth: > 0 ok, 0 atenționare, < 0 alarmă.
  assert.equal(stareNetWorth(1), 'ok');
  assert.equal(stareNetWorth(0), 'warn');
  assert.equal(stareNetWorth(-1), 'bad');
});

/* ══ Formatare ══ */

test('Formatare — fmtNum / fmtPctSafe / fmtDeviereLei', () => {
  assert.equal(fmtNum(6.2), '6,20');
  assert.equal(fmtNum(null), '—');
  assert.equal(fmtNum(undefined), '—');
  assert.equal(fmtNum(Number.NaN), '—');
  assert.equal(fmtPctSafe(0.2), '20,00%');
  assert.equal(fmtPctSafe(null), '—');
  assert.equal(fmtDeviereLei(0), 'la țintă');
  assert.equal(fmtDeviereLei(500), 'peste țintă cu 500,00 lei');
  assert.equal(fmtDeviereLei(-200), 'sub țintă cu 200,00 lei');
  assert.equal(fmtDeviereLei(null), '—');
});

/* ══ Structură și accesibilitate ══ */

test('Structură — bara de taburi are 18 taburi și 18 panouri, cu id-uri corelate', () => {
  const tabIds = [...html.matchAll(/<button[^>]*class="tab[^"]*"[^>]*id="tab-([a-z0-9]+)"/g)].map((m) => m[1]);
  const panelIds = [...html.matchAll(/<section id="panel-([a-z0-9]+)" class="tab-panel[^"]*"/g)].map((m) => m[1]);
  assert.equal(tabIds.length, 18, `taburi: ${tabIds.length}`);
  assert.equal(panelIds.length, 18, `panouri: ${panelIds.length}`);
  assert.deepEqual(tabIds, panelIds);

  const expectedNew = ['buget', 'sanatate'];
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
    'bg-venit', 'bg-nevoi', 'bg-dorinte', 'bg-economii',
    'bg-summary', 'bg-alerte', 'bg-ramas', 'bg-t-total',
    'bg-t-nevoi', 'bg-r-nevoi', 'bg-p-nevoi', 'bg-d-nevoi',
    'bg-zile-dorinte', 'bg-zile-ore', 'bg-zile-economii',
    'sf-venit', 'sf-cheltuieli', 'sf-economii', 'sf-datorii-lunar',
    'sf-rezerva', 'sf-active', 'sf-datorii',
    'sf-summary', 'sf-alerte', 'sf-tinta-min', 'sf-tinta-max',
    'sf-lipsa', 'sf-net-worth-luni',
  ];
  for (const id of ids) assert.ok(html.includes(`id="${id}"`), `lipsește #${id}`);

  for (const id of ['bg-t-nevoi', 'bg-t-dorinte', 'bg-t-economii', 'bg-t-total',
                    'sf-t-rata-economii', 'sf-t-datorii-venit', 'sf-t-rezerva-luni', 'sf-t-net-worth']) {
    assert.ok(html.includes(`id="${id}"`), `lipsește celula #${id}`);
  }
});

test('Structură — legăturile dintre taburi sunt prezente (butoane + TAB_RENDERERS)', () => {
  for (const id of ['bg-go-timp', 'timp-go-buget', 'sf-go-fond', 'sf-go-buget', 'fu-go-sanatate']) {
    assert.ok(html.includes(`id="${id}"`), `lipsește butonul #${id}`);
  }
  assert.deepEqual([...Object.keys(TAB_RENDERERS)], ['timp', 'fond', 'buget', 'sanatate', 'randament', 'diversificare', 'stres']);
  assert.equal(typeof goToTab, 'function');
});

test('Accesibilitate — toate tooltip-urile taburilor noi sunt definite și folosite', () => {
  const keys = [
    'bg-venit', 'bg-nevoi', 'bg-dorinte', 'bg-economii',
    'bg-nevoi-target', 'bg-dorinte-target', 'bg-economii-target', 'bg-ramas',
    'bg-zile', 'bg-zile-dorinte', 'bg-zile-ore', 'bg-zile-economii',
    'sf-venit', 'sf-cheltuieli', 'sf-economii', 'sf-datorii-lunar', 'sf-rezerva',
    'sf-active', 'sf-datorii', 'sf-rata-economii', 'sf-datorii-venit',
    'sf-rezerva-luni', 'sf-net-worth', 'sf-tinta-min', 'sf-tinta-max',
    'sf-lipsa', 'sf-net-worth-luni',
  ];
  for (const key of keys) {
    assert.ok(js.includes(`'${key}': {`), `FORMULA_TIPS lipsește „${key}”`);
    assert.ok(html.includes(`data-tip="${key}"`), `data-tip="${key}" lipsește din HTML`);
  }
});

test('Stil — panoul de alarme are CSS dedicat, în ambele teme și la tipărire', () => {
  includes(css, '.alerts');
  includes(css, '.alert.is-ok');
  includes(css, '.alert.is-warn');
  includes(css, '.alert.is-bad');
  includes(css, '.stat-status');
  includes(css, 'td.is-bad');
});

test('Surse — taburile noi menționează linkuri BNR / INS', () => {
  const panouBuget = html.split('id="panel-buget"')[1].split('id="panel-sanatate"')[0];
  const panouSanatate = html.split('id="panel-sanatate"')[1];
  includes(panouBuget, 'https://www.bnr.ro/', 'buget · BNR');
  includes(panouBuget, 'insse.ro', 'buget · INS');
  includes(panouSanatate, 'https://www.bnr.ro/', 'sănătate · BNR');
  includes(panouSanatate, 'insse.ro', 'sănătate · INS');
});
