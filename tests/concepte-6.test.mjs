// Teste pentru conceptele noi 6 (GlitchCoin): N11 curs de schimb / riscul valutar,
// N14 biaseuri comportamentale.
// Valorile așteptate pentru N11 au fost recalculate independent în Python
// (scratch/recalc-concepte6.py), replicând exact algoritmul din app.js.
// Rulează: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { gc, html, js, css } from './helpers/bundle.mjs';

const {
  computeCurs, citesteCurs, renderCurs, initCurs,
  BIASE_QUIZ, scorBiase, renderBiaseQuiz, renderBiase, resetBiase,
  TAB_RENDERERS, goToTab,
} = gc;

// Tolerație pentru virgula fluantă (zecimale).
function near(actual, expected, eps = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= eps, `așteptat ~${expected}, obținut ${actual}`);
}

function includes(haystack, needle, label = 'verificare') {
  assert.ok(haystack.includes(needle), `${label}: lipsește „${needle}”`);
}

/* ══ N11 · Curs de schimb și riscul valutar ══ */

test('N11 — scenariul implicit (10.000 valută, 6%, curs 4,97, +2%/an, 10 ani, 10% impozit, 4% inflație)', () => {
  const c = computeCurs({ suma: 10000, randament: 6, curs: 4.97, apreciere: 2, ani: 10, impozit: 10, inflatie: 4, pretImport: 100 });
  assert.equal(c.valid, true);
  assert.equal(c.n, 10);
  near(c.valFinal, 17908.476965428545);            // 10.000 × 1,06^10
  near(c.cursFinal, 6.0584022673739435);           // 4,97 × 1,02^10
  near(c.sumaRonStart, 49700.0);                   // 10.000 × 4,97
  near(c.valoareRonBrut, 108496.75745256634);      // valFinal × cursFinal
  near(c.castigBrut, 58796.75745256634);
  near(c.impozitLei, 5879.675745256634);          // 10% din câștig
  near(c.valoareRonNet, 102617.0817073097);
  near(c.randNominal, 0.08120000000000016);        // 1,06 × 1,02 − 1
  near(c.randReal, 0.03961538461538483);           // (1 + nominal) / 1,04 − 1
  near(c.contribActiv, 0.06);
  near(c.contribValuta, 0.0212);                   // (1 + 0,06) × 0,02 — include interacțiunea
  near(c.faraValutaRon, 89005.13051817987);        // valFinal × curs de start
  near(c.efectValutar, 19491.62693438647);
  near(c.pretRonStart, 497.0);
  near(c.pretRonFinal, 605.8402267373943);
  near(c.crestereImportPct, 0.21899441999475733); // 1,02^10 − 1
  near(c.crestereImportReal, -0.019230769230769273);
  assert.equal(c.verdictCurs, 'ajuta');
  assert.equal(c.rows.length, 11);
  assert.equal(c.rows[0].an, 0);
  near(c.rows[0].randRon, 0);
  const ultim = c.rows[10];
  near(ultim.valoareValuta, 17908.476965428545);
  near(ultim.curs, 6.0584022673739435);
  near(ultim.valoareRon, 108496.75745256634);
  near(ultim.randRon, 1.183033349146204);
  near(ultim.randReal, 0.47477911003495477);
});

test('N11 — RON se întărește (apreciere −3%): cursul penalizează', () => {
  const c = computeCurs({ suma: 10000, randament: 6, curs: 4.97, apreciere: -3, ani: 10, impozit: 10, inflatie: 4, pretImport: 100 });
  assert.equal(c.valid, true);
  near(c.cursFinal, 3.6649979106677923);           // 4,97 × 0,97^10
  near(c.valoareRonBrut, 65634.53066153791);
  near(c.castigBrut, 15934.530661537909);
  near(c.impozitLei, 1593.453066153791);
  near(c.valoareRonNet, 64041.077595384115);
  near(c.randNominal, 0.028200000000000003);        // 1,06 × 0,97 − 1
  near(c.contribValuta, -0.0318);
  near(c.efectValutar, -23370.59985664196);
  near(c.crestereImportPct, -0.2625758731050719);
  assert.equal(c.verdictCurs, 'penalizeaza');
});

test('N11 — curs constant (0%): efectul valutar e zero, verdict neutru', () => {
  const c = computeCurs({ suma: 10000, randament: 6, curs: 4.97, apreciere: 0, ani: 10, impozit: 10, inflatie: 4, pretImport: 100 });
  assert.equal(c.valid, true);
  near(c.cursFinal, 4.97);
  near(c.valoareRonBrut, 89005.13051817987);
  near(c.efectValutar, 0.0);
  near(c.contribValuta, 0.0);
  near(c.crestereImportPct, 0.0);
  near(c.crestereImportReal, -0.03846153846153855); // 1 / 1,04 − 1
  assert.equal(c.verdictCurs, 'neutru');
});

test('N11 — perioadă scurtă (3 ani, curs 5, +1%, 8%, 3% inflație)', () => {
  const c = computeCurs({ suma: 5000, randament: 8, curs: 5, apreciere: 1, ani: 3, impozit: 10, inflatie: 3, pretImport: 50 });
  assert.equal(c.valid, true);
  assert.equal(c.n, 3);
  near(c.valFinal, 6298.56);
  near(c.cursFinal, 5.151505);
  near(c.sumaRonStart, 25000);
  near(c.valoareRonBrut, 32447.063332800004);
  near(c.castigBrut, 7447.063332800004);
  near(c.impozitLei, 744.7063332800004);
  near(c.valoareRonNet, 31702.356999520005);
  near(c.randNominal, 0.09079999999999999);        // 1,08 × 1,01 − 1
  near(c.contribValuta, 0.0108);
  near(c.efectValutar, 954.2633328000011);
  near(c.pretRonStart, 250);
  near(c.pretRonFinal, 257.57525);
  near(c.crestereImportPct, 0.030301000000000133);
  assert.equal(c.rows.length, 4);
});

test('N11 — fără inflație: randamentul real egal cu nominalul', () => {
  const c = computeCurs({ suma: 10000, randament: 6, curs: 4.97, apreciere: 2, ani: 10, impozit: 10, inflatie: 0, pretImport: 100 });
  near(c.randNominal, 0.08120000000000016);
  near(c.randReal, 0.08120000000000016);
  near(c.crestereImportReal, 0.020000000000000018);
});

test('N11 — inflație mare (12%): randamentul real devine negativ chiar dacă nominalul e bun', () => {
  const c = computeCurs({ suma: 10000, randament: 6, curs: 4.97, apreciere: 2, ani: 10, impozit: 10, inflatie: 12, pretImport: 100 });
  near(c.randNominal, 0.08120000000000016);
  near(c.randReal, -0.034642857142857086);
  near(c.crestereImportReal, -0.0892857142857143);
});

test('N11 — date invalide (sumă 0): valid false, verdict gol, randamentul din tabel e NaN', () => {
  const c = computeCurs({ suma: 0, randament: 6, curs: 4.97, apreciere: 2, ani: 10, impozit: 10, inflatie: 4, pretImport: 100 });
  assert.equal(c.valid, false);
  assert.equal(c.verdictCurs, '');
  near(c.valFinal, 0.0);
  near(c.valoareRonBrut, 0.0);
  assert.ok(Number.isNaN(c.rows[1].randRon));
  assert.ok(Number.isNaN(c.rows[1].randReal));
});

test('N11 — plafonarea inputurilor (valori extreme nu dau rezultate negative sau infinite)', () => {
  const c = computeCurs({ suma: 1000, randament: 1000, curs: 1, apreciere: 1000, ani: 1000, impozit: 1000, inflatie: 1000, pretImport: 100 });
  assert.equal(c.g, 1);
  assert.equal(c.a, 1);
  assert.equal(c.n, 100);
  assert.equal(c.t, 1);
  assert.equal(c.infl, 1);
  assert.ok(Number.isFinite(c.valFinal));
  assert.ok(Number.isFinite(c.cursFinal));
});

/* ══ N14 · Biaseuri comportamentale ══ */

test('N14 — cele cinci biaseuri sunt definite, fiecare cu exact o opțiune corectă', () => {
  assert.equal(BIASE_QUIZ.length, 5);
  const ids = BIASE_QUIZ.map((q) => q.id);
  assert.equal(ids.join(','), 'q-ancorare,q-cont,q-aversiune,q-fomo,q-cadru');
  for (const q of BIASE_QUIZ) {
    assert.ok(q.intrebare && q.explicatie, `${q.id} trebuie să aibă întrebare și explicație`);
    const corecte = q.optiuni.filter((o) => o.corect);
    assert.equal(corecte.length, 1, `${q.id} trebuie să aibă exact o opțiune corectă`);
    assert.equal(q.optiuni.length, 3, `${q.id} trebuie să aibă trei opțiuni`);
  }
});

test('N14 — scorul numără răspunsurile corecte și cele date', () => {
  const toate = {};
  BIASE_QUIZ.forEach((q) => { toate[q.id] = q.optiuni.find((o) => o.corect).id; });
  const s = scorBiase(toate, BIASE_QUIZ);
  assert.equal(s.scor, 5);
  assert.equal(s.total, 5);
  assert.equal(s.raspunse, 5);

  // Un răspuns greșit: 4 din 5.
  const unulGresit = { ...toate, 'q-fomo': 'a' };
  const s2 = scorBiase(unulGresit, BIASE_QUIZ);
  assert.equal(s2.scor, 4);
  assert.equal(s2.raspunse, 5);

  // Fără răspunsuri.
  const s3 = scorBiase({}, BIASE_QUIZ);
  assert.equal(s3.scor, 0);
  assert.equal(s3.total, 5);
  assert.equal(s3.raspunse, 0);

  // Răspuns parțial.
  const s4 = scorBiase({ 'q-ancorare': toate['q-ancorare'] }, BIASE_QUIZ);
  assert.equal(s4.scor, 1);
  assert.equal(s4.total, 5);
  assert.equal(s4.raspunse, 1);
});

test('N14 — fiecare bias are un antidot și un semn descriptiv în HTML', () => {
  const panou = html.split('id="panel-biase"')[1];
  for (const cheie of ['Ancorare', 'Contul mental', 'Aversiunea la pierdere', 'FOMO', 'Efectul de cadru']) {
    assert.ok(panou.includes(cheie), `lipsește biasul „${cheie}”`);
  }
  includes(panou, 'Antidot');
  includes(panou, 'Semne');
});

/* ══ Structură și accesibilitate ══ */

test('Smoke — renderer-el noi rulează fără excepții (DOM fals)', () => {
  assert.equal(typeof renderCurs, 'function');
  assert.equal(typeof renderBiase, 'function');
  assert.equal(typeof renderBiaseQuiz, 'function');
  assert.equal(typeof citesteCurs, 'function');
  assert.doesNotThrow(() => renderCurs());
  assert.doesNotThrow(() => renderBiase());
  assert.doesNotThrow(() => renderBiaseQuiz());
  assert.doesNotThrow(() => resetBiase());
});

test('Structură — panourile noi conțin elementele cheie', () => {
  const ids = [
    // N11 · Curs
    'cs-suma', 'cs-randament', 'cs-curs', 'cs-apreciere', 'cs-ani',
    'cs-impozit', 'cs-inflatie', 'cs-pret-import',
    'cs-summary', 'cs-alerte', 'cs-val-final-valuta', 'cs-curs-final',
    'cs-valoare-ron-brut', 'cs-castig-brut', 'cs-impozit-lei', 'cs-valoare-ron-net',
    'cs-rand-nominal', 'cs-rand-real', 'cs-contrib-valuta', 'cs-verdict',
    'cs-import-ron-start', 'cs-import-ron-final', 'cs-import-crestere', 'cs-import-real',
    'cs-body',
    // N14 · Biase
    'bq-quiz', 'bq-scor', 'bq-reset',
  ];
  for (const id of ids) assert.ok(html.includes(`id="${id}"`), `lipsește #${id}`);
});

test('Structură — legăturile dintre taburi sunt prezente (butoane + TAB_RENDERERS)', () => {
  for (const id of ['di-go-curs', 'cs-go-oportunitate']) {
    assert.ok(html.includes(`id="${id}"`), `lipsește butonul #${id}`);
  }
  assert.deepEqual([...Object.keys(TAB_RENDERERS)],
    ['timp', 'fond', 'buget', 'sanatate', 'randament', 'diversificare', 'stres', 'suma', 'impozitare', 'datorii', 'dca', 'curs', 'biase', 'cost']);
  assert.equal(typeof goToTab, 'function');
});

test('Structură — taburile noi sunt în TABS și au panouri corelate', () => {
  const tabsLine = js.match(/const TABS = \[([^\]]+)\]/)[1];
  for (const id of ['curs', 'biase']) {
    assert.ok(tabsLine.includes(`'${id}'`), `TABS lipsește ${id}`);
    assert.match(html, new RegExp(`<section id="panel-${id}"[^>]*aria-labelledby="tab-${id}"[^>]*hidden>`),
      `panel-${id} trebuie ascuns inițial și legat de tab-${id}`);
  }
});

test('Accesibilitate — toate tooltip-urile taburilor noi sunt definite și folosite', () => {
  const keys = [
    // N11
    'cs-curs', 'cs-apreciere', 'cs-ani', 'cs-inflatie', 'cs-suma', 'cs-randament',
    'cs-impozit', 'cs-pret-import', 'cs-val-final-valuta', 'cs-curs-final',
    'cs-valoare-ron-brut', 'cs-castig-brut', 'cs-impozit-lei', 'cs-valoare-ron-net',
    'cs-rand-nominal', 'cs-rand-real', 'cs-contrib-valuta', 'cs-verdict',
    'cs-evolutie', 'cs-import', 'cs-import-ron-start', 'cs-import-ron-final',
    'cs-import-crestere', 'cs-import-real',
    // N14
    'bs-ancorare', 'bs-cont-mental', 'bs-aversiune', 'bs-fomo', 'bs-cadru', 'bs-quiz',
  ];
  for (const key of keys) {
    assert.ok(js.includes(`'${key}': {`), `FORMULA_TIPS lipsește „${key}”`);
    assert.ok(html.includes(`data-tip="${key}"`), `data-tip="${key}" lipsește din HTML`);
  }
});

test('Stocare locală — toate inputurile noi au id (se salvează automat în localStorage)', () => {
  const ids = [
    'cs-suma', 'cs-randament', 'cs-curs', 'cs-apreciere', 'cs-ani',
    'cs-impozit', 'cs-inflatie', 'cs-pret-import',
  ];
  for (const id of ids) assert.ok(html.includes(`id="${id}"`), `inputul #${id} lipsește`);
  includes(js, 'renderCurs();');
  includes(js, 'renderBiase();');
  includes(js, 'initCurs();');
  includes(js, 'initBiase();');
});

test('Surse — taburile noi menționează linkuri publice', () => {
  const panouCurs = html.split('id="panel-curs"')[1].split('id="panel-biase"')[0];
  const panouBiase = html.split('id="panel-biase"')[1];
  includes(panouCurs, 'https://www.bnr.ro/', 'curs · BNR');
  includes(panouCurs, 'ecb.europa.eu', 'curs · ECB');
  includes(panouCurs, 'federalreserve.gov', 'curs · Federal Reserve');
  includes(panouCurs, 'insse.ro', 'curs · INS');
  includes(panouBiase, 'Prospect_theory', 'biase · prospect theory');
  includes(panouBiase, 'Loss_aversion', 'biase · loss aversion');
  includes(panouBiase, 'Mental_accounting', 'biase · mental accounting');
  includes(panouBiase, 'Framing_effect', 'biase · framing effect');
  includes(panouBiase, 'investor.gov', 'biase · Investor.gov');
});

test('Stil — panourile noi refolosesc stilurile existente (alarme, tabele, carduri, quiz)', () => {
  includes(css, '.alerts');
  includes(css, '.alert.is-ok');
  includes(css, '.alert.is-warn');
  includes(css, '.table-wrap');
  includes(css, '.stat-sub');
  includes(css, '.bias-grid');
  includes(css, '.bias-card');
  includes(css, '.quiz');
  includes(css, '.quiz-opt.is-correct');
  includes(css, '.quiz-opt.is-wrong');
});
