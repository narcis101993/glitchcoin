// Teste pentru corecțiile financiare C1–C12 (GlitchCoin).
// Valorile așteptate au fost recalculate independent în Python din datele INS/BNR.
// Rulează: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { gc } from './helpers/bundle.mjs';

const {
  GLITCHCOIN_DATA, AN_CURENT, IMPOZIT_TIPURI, NUAM_DEFAULTS,
  computeNuAm, deflatorValue, computeTimp, computeRandament,
  computeProfit, computeCompusa,
} = gc;

// Tolerație pentru virgula fluantă (zecimale).
function near(actual, expected, eps = 1e-6) {
  assert.ok(Math.abs(actual - expected) <= eps, `așteptat ~${expected}, obținut ${actual}`);
}

test('C1 — „Nu am bani": banii cu CE sunt mai mulți decât fără CE (semn corect)', () => {
  const r = computeNuAm(5000, 10, 0.05, 5000, 0.035, NUAM_DEFAULTS);
  near(r.totalFacturi, 2430);
  near(r.cheltuitFaraCE, 2570);
  near(r.profit, 7.411383, 1e-6);
  near(r.cheltuitCuCE, 2577.411383, 1e-6);
  // Semnul e corect: cu cont de economii rămâi cu mai mulți bani.
  assert.ok(r.cheltuitCuCE > r.cheltuitFaraCE, 'cheltuitCuCE trebuie să fie mai mare decât cheltuitFaraCE');
  // și se leagă de profil zilnic: cheltuitCuCE = cheltuitFaraCE + profit.
  near(r.cheltuitCuCE, r.cheltuitFaraCE + r.profit, 1e-9);
  // Soldul final din simulare coincide cu cheltuitCuCE.
  const soldFinal = r.zile[r.zile.length - 1].soldDupa;
  near(soldFinal, r.cheltuitCuCE, 1e-9);
});

test('C1 — caz particular, fără facturi', () => {
  const r = computeNuAm(6000, 1, 0.05, 1000, 0.04, []);
  near(r.cheltuitFaraCE, 6000);
  near(r.profit, 2.864227, 1e-6);
  near(r.cheltuitCuCE, 6002.864227, 1e-6);
});

test('C2 — deflator: rândul 2026 = suma neschimbată, 2025 = echivalentul din 2025', () => {
  near(deflatorValue(5000, 2026), 5000); // anul curent nu se deflatează
  near(deflatorValue(5000, 2025), 4703.668862, 1e-6);
  near(deflatorValue(5000, 2024), 4383.661567, 1e-6);
  near(deflatorValue(5000, 2020), 3145.326308, 1e-6);
  near(deflatorValue(5000, 2010), 2475.702007, 1e-6);
  near(deflatorValue(5000, 2001), 1064.843070, 1e-6);
  near(deflatorValue(5000, 2000), 791.822628, 1e-6);
  // 2024 trebuie să fie mai mare decât 2023 (deflatia e monotonă în timp).
  assert.ok(deflatorValue(5000, 2024) > deflatorValue(5000, 2023));
  // și 2025 să fie mai mică decât suma din 2026 (inflație pozitivă).
  assert.ok(deflatorValue(5000, 2025) < 5000);
});

test('C3 — impozit pe tipuri de venit: rate reale, nu 10% generic', () => {
  assert.equal(IMPOZIT_TIPURI['dobandi'].rata, 10);
  assert.equal(IMPOZIT_TIPURI['dividende'].rata, 16);
  assert.equal(IMPOZIT_TIPURI['vm-ro'].rata, 3);        // acțiuni broker RO ≥ 1 an (2026)
  assert.equal(IMPOZIT_TIPURI['vm-ro-scurt'].rata, 6);  // < 1 an (2026)
  assert.equal(IMPOZIT_TIPURI['vm-strain'].rata, 16);   // broker străin / crypto (2026)
});

test('C3/C6 — Randament: valorile implicite cu 1% impozit și 0,3% comisioane', () => {
  const r = computeRandament(10000, 0.07, 0.01, 0.003, 0.05);
  near(r.brutLei, 700);
  near(r.netLei, 690.90);
  near(r.brutPct, 0.07);
  near(r.netPct, 0.06909);
  near(r.realPct, 0.018180952, 1e-9);
  near(r.realLei, 181.809524, 1e-6);
});

test('C3/C6 — Randament: dividende 2026 (16%) și comisioane străine (0,5%)', () => {
  const r = computeRandament(25000, 0.05, 0.16, 0.005, 0.073);
  near(r.brutLei, 1250);
  near(r.netLei, 1043.75);
  near(r.realPct, -0.029123952, 1e-9);
  near(r.realLei, -728.098788, 1e-6);
});

test('C4 — seria de inflație e INS (IPC național), nu World Bank', () => {
  const byYear = Object.fromEntries(GLITCHCOIN_DATA.inflation.map((d) => [d.year, d]));
  // 1991: INS 170,2% (World Bank ar fi 230,62%).
  near(byYear[1991].rate, 1.702);
  near(byYear[1992].rate, 2.104);
  near(byYear[1993].rate, 2.561);
});

test('C7 — cartofii 2025: 2,49 lei (real INS, −11%), nu 3,00', () => {
  const cartofi = GLITCHCOIN_DATA.food.find((p) => p.name.startsWith('Cartofi'));
  near(cartofi.prices[2025], 2.49);
  near(cartofi.prices[2024], 2.8);
});

test('A2/A3 — 2025 = 7,3% (INS), 2026 = 6,3% (parțial)', () => {
  const byYear = Object.fromEntries(GLITCHCOIN_DATA.inflation.map((d) => [d.year, d]));
  near(byYear[2025].rate, 0.073);
  near(byYear[2026].rate, 0.063);
  assert.equal(byYear[2026].partial, true, '2026 trebuie marcat ca parțial');
});

test('C5/C11 — Timp vs dorințe: zile lucrătoare parametrizate (implicit 250) și 30,44 zile/lună', () => {
  // Valoarea implicită a inputului „Zile lucrătoare / an".
  near(gc.TIMP_ZILE_LUCRATOARE_AN_DEFAULT, 250);
  near(gc.TIMP_ZILE_LUNA, 365 / 12);

  const r = computeTimp(5000, 3600);
  near(r.venitZi, 164.383562, 1e-6);      // 5000 / (365/12)
  near(r.minute, 31536, 1e-6);
  near(r.ore, 525.6, 1e-6);
  near(r.zile, 21.9, 1e-6);
  // Zilele lucrătoare pe lună se derivă din cele anuale: 250/12 = 20,83.
  near(r.venitZiLucr, 60000 / 250, 1e-6);   // 240
  near(r.oreLucrate, 120, 1e-6);
  near(r.zileLucrate, 15, 1e-6);
  near(r.pctAn, 0.06, 1e-9);
  // % dintr-un an lucrător = zilele lucrate ÷ zilele lucrătoare = prețul ÷ venitul anual.
  near(r.pctAnLucrator, 0.06, 1e-9);
});

test('C5 — zilele lucrătoare sunt un input: schimbarea valorii schimbă rezultatele', () => {
  const baza = computeTimp(5000, 3600, 248);
  const suc = computeTimp(5000, 3600, 261);   // convenția SUA
  const putine = computeTimp(5000, 3600, 220);

  // Mai puține zile lucrătoare → venitul pe zi lucrătoare crește.
  near(suc.venitZiLucr, 60000 / 261, 1e-6);
  assert.ok(putine.venitZiLucr > baza.venitZiLucr, 'mai puține zile lucrătoare → venit pe zi mai mare');
  // Zilele lucrate necesare cresc odată cu numărul de zile lucrătoare.
  assert.ok(suc.zileLucrate > baza.zileLucrate);
  near(suc.zileLucrate, 3600 / (60000 / 261), 1e-9);
  // Procentul dintr-un an lucrător = preț ÷ venit anual, deci nu depinde de numărul de zile.
  near(suc.pctAnLucrator, baza.pctAnLucrator, 1e-12);
  near(suc.pctAnLucrator, 3600 / 60000, 1e-12);
  // Baza 24/24 nu depinde de zilele lucrătoare.
  near(suc.minute, baza.minute, 1e-12);
  near(suc.venitZi, baza.venitZi, 1e-12);
});

test('C5/C11 — Timp vs dorințe: caz particular', () => {
  const r = computeTimp(4200, 1500);
  near(r.venitZi, 138.082192, 1e-6);
  near(r.minute, 15642.857143, 1e-6);
  near(r.venitZiLucr, 4200 * 12 / 250, 1e-6);
  near(r.pctAnLucrator, 1500 / (4200 * 12), 1e-9);
});

test('C8 — „Creștere anuală" = I(n)/I(n−1) − 1 (creștere reală, nu 41,5%)', () => {
  const { scenB } = computeCompusa(10000, 200, 0.025);
  const a20 = scenB[20];
  const a19 = scenB[19];
  near(a20.sumaTotala, 78673.581399, 1e-6);
  near(a19.sumaTotala, 74365.305694, 1e-6);
  near(a20.crestere, 0.057933947, 1e-9); // ~5,8%, nu 41,5%
  assert.ok(a20.crestere < 0.10, 'creșterea anuală reală trebuie să fie mică');
  // și se recalculează identic din valorile din tabel.
  near(a20.crestere, a20.sumaTotala / a19.sumaTotala - 1, 1e-12);
});

test('C9 — contribuția lunară e consistentă în ambele coloane', () => {
  const { scenB } = computeCompusa(10000, 200, 0.025);
  const a20 = scenB[20];
  // Suma investită = 10.000 + 12 × 200 × 20 = 58.000.
  near(a20.sumaInvestita, 58000);
  // Dobânda = total − investit.
  near(a20.dobanda, a20.sumaTotala - a20.sumaInvestita, 1e-9);
  // Caz particular: 5.000 + 100/lună, 10 ani la 6%.
  const custom = computeCompusa(5000, 100, 0.06).scenB[10];
  near(custom.sumaInvestita, 17000);
  near(custom.sumaTotala, 25484.918351, 1e-6);
  near(custom.crestere, 0.115680522, 1e-9);
});

test('C10 — Profit: pierderea nu se impozitează (net = brut)', () => {
  const r = computeProfit(10000, 25, 20, 0.01, 0.003, 0.05);
  near(r.valoareFinala, 8000);
  near(r.brut, -2000);
  near(r.net, -2000); // nu −1760 (fără „impozit negativ")
  assert.ok(r.net <= r.brut + 1e-9, 'pierderea nu poate fi redusă de taxe');
  near(r.randNet, -0.2);
  near(r.randReal, -0.238095238, 1e-9);
  near(r.real, -2380.952381, 1e-6);
});

test('C10 — Profit: valoarea implicită (pozitivă) se păstrează', () => {
  const r = computeProfit(10000, 25, 28, 0.01, 0.003, 0.05);
  near(r.valoareFinala, 11200);
  near(r.brut, 1200);
  near(r.net, 1184.40);
  near(r.randReal, 0.065180952, 1e-9);
  near(r.real, 651.809524, 1e-6);
});

test('C12 — dobânda implicită din „Nu am bani" e 3,5% (intervalul real 3–4%)', () => {
  const r = computeNuAm(5000, 10, 0.05, 5000, 0.035, NUAM_DEFAULTS);
  near(r.profit, 7.411383, 1e-6);
  near(r.cheltuitCuCE, 2577.411383, 1e-6);
});
