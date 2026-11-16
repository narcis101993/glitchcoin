/* GlitchCoin v2 — logica aplicației.
   Totul se calculează în browser, pe acest calculator. Fără backend, fără conturi. */
'use strict';

const LOCALE = 'ro-RO';
const AN_CURENT = 2025; // anul "prezent" pentru care suma actuală este introdusă

/* ── Formatare ────────────────────────────────────────── */

function fmtLei(value, decimals = 2) {
  return value.toLocaleString(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }) + ' lei';
}

function fmtPct(fraction, decimals = 2) {
  return (fraction * 100).toLocaleString(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }) + '%';
}

function fmtX(value) {
  return value.toLocaleString(LOCALE, { maximumFractionDigits: 2 }) + 'x';
}

function fmtInt(value) {
  return value.toLocaleString(LOCALE, { maximumFractionDigits: 0 });
}

function readNumber(input, fallback = 0) {
  const value = parseFloat(input.value);
  return Number.isFinite(value) ? value : fallback;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

/* ── Temă (light / dark) ─────────────────────────────────── */

const THEME_KEY = 'glitchcoin-theme';
/* Culoarea barei browserului (theme-color) pentru fiecare temă. */
const THEME_COLORS = { light: '#0b1530', dark: '#070d1d' };

function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch (e) {
    return null; // localStorage poate fi blocat (ex. file:// în unele browsere)
  }
}

/* Sincronizează atributul data-theme, comutatorul și meta theme-color. */
function applyTheme(theme) {
  const dark = theme === 'dark';
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');

  const toggle = document.getElementById('theme-toggle');
  if (toggle) {
    toggle.setAttribute('aria-pressed', String(dark));
    toggle.setAttribute('aria-label', dark ? 'Comută la tema deschisă' : 'Comută la tema întunecată');
    toggle.title = dark ? 'Temă deschisă' : 'Temă întunecată';
  }

  const meta = document.getElementById('meta-theme-color');
  if (meta) meta.setAttribute('content', THEME_COLORS[theme] || THEME_COLORS.light);
}

function initTheme() {
  // Tema inițială e pusă de scriptul inline din <head> (înainte de paint).
  const current = document.documentElement.getAttribute('data-theme')
    || (getStoredTheme() === 'dark' ? 'dark' : 'light');
  applyTheme(current);

  const toggle = document.getElementById('theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch (e) {
        // fără stocare locală: tema se schimbă doar pentru sesiunea curentă
      }
      applyTheme(next);
    });
  }

  // Fără preferință salvată, urmărim prefers-color-scheme.
  const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  if (media) {
    const onChange = (event) => {
      if (getStoredTheme()) return; // utilizatorul a ales deja o temă
      applyTheme(event.matches ? 'dark' : 'light');
    };
    if (media.addEventListener) media.addEventListener('change', onChange);
    else if (media.addListener) media.addListener(onChange); // Safari vechi
  }
}

/* Colorează o valoare după semn (verde = pozitiv, roșu = negativ). */
function paintSign(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('is-pos', 'is-neg');
  if (value === null || value === undefined || !Number.isFinite(value)) return;
  if (value > 0) el.classList.add('is-pos');
  else if (value < 0) el.classList.add('is-neg');
}

/* ── Date ─────────────────────────────────────────────── */

const RATE_BY_YEAR = Object.fromEntries(
  GLITCHCOIN_DATA.inflation.map((d) => [d.year, d.rate]),
);

/* ═══ 1. Simulatorul inflației ═════════════════════════ */

const SIM_YEARS = [2, 5, 10, 15];
const SIM_TABLE_YEARS = 15;

function computeSimulator(suma, rata) {
  const randament = 1 + rata;
  const rows = [];
  for (let an = 1; an <= SIM_TABLE_YEARS; an++) {
    const valoare = suma * Math.pow(randament, an - 1);
    rows.push({
      an,
      valoare,
      plus: an >= 2 ? valoare - suma * Math.pow(randament, an - 2) : null,
      vs1: suma > 0 && an >= 2 ? valoare / suma - 1 : null,
      mult: suma > 0 ? valoare / suma : null,
    });
  }
  return rows;
}

function renderSimulator() {
  const suma = Math.max(0, readNumber(document.getElementById('sim-suma')));
  const rata = Math.max(-0.99, readNumber(document.getElementById('sim-rata')) / 100);
  const rows = computeSimulator(suma, rata);
  const dupaAn = Object.fromEntries(rows.map((r) => [r.an, r]));

  const summary = document.getElementById('sim-summary');
  if (suma <= 0) {
    summary.textContent = 'Introdu o sumă actuală (mai mare decât zero) pentru a vedea rezultatele simulării.';
    for (const an of SIM_YEARS) {
      document.getElementById('sim-card-' + an).textContent = '—';
    }
    document.getElementById('sim-table-body').innerHTML = rows.map((r) => `
      <tr><td>${r.an}</td><td class="num">—</td><td class="num">—</td><td class="num">—</td><td class="num">—</td></tr>`).join('');
    return;
  }

  const mult15 = dupaAn[15].mult;
  summary.innerHTML =
    `Cu <strong>${fmtLei(suma)}</strong> acum, în anul 2 avei nevoie de <strong>${fmtLei(dupaAn[2].valoare)}</strong>, ` +
    `în anul 5 de <strong>${fmtLei(dupaAn[5].valoare)}</strong>, în anul 10 de <strong>${fmtLei(dupaAn[10].valoare)}</strong> ` +
    `și în anul 15 de <strong>${fmtLei(dupaAn[15].valoare)}</strong> — <strong>${mult15 === null ? '—' : fmtX(mult15)}</strong> suma inițială, ` +
    `menținând inflația la <strong>${fmtPct(rata)}</strong> în fiecare an.`;

  for (const an of SIM_YEARS) {
    document.getElementById('sim-card-' + an).textContent = fmtLei(dupaAn[an].valoare);
  }

  document.getElementById('sim-table-body').innerHTML = rows.map((r) => `
    <tr>
      <td>${r.an}</td>
      <td class="num">${fmtLei(r.valoare)}</td>
      <td class="num">${r.plus === null ? '—' : fmtLei(r.plus)}</td>
      <td class="num">${r.vs1 === null ? '—' : fmtPct(r.vs1)}</td>
      <td class="num">${r.mult === null ? '—' : fmtX(r.mult)}</td>
    </tr>`).join('');
}

/* ═══ 2. Prețurile la alimente ══════════════════════════ */

const FOOD_YEARS = [2020, 2021, 2022, 2023, 2024, 2025];

function foodGrowth(product) {
  return product.prices[2025] / product.prices[2020] - 1;
}

function renderFood() {
  document.getElementById('food-table-body').innerHTML = GLITCHCOIN_DATA.food.map((p) => `
    <tr>
      <td>${escapeHtml(p.name)}</td>
      ${FOOD_YEARS.map((an) => `<td class="num">${p.prices[an].toLocaleString(LOCALE)}</td>`).join('')}
      <td class="num strong">${fmtPct(foodGrowth(p))}</td>
    </tr>`).join('');

  const max = Math.max(...GLITCHCOIN_DATA.food.map(foodGrowth));
  document.getElementById('food-chart').innerHTML = GLITCHCOIN_DATA.food.map((p) => {
    const growth = foodGrowth(p);
    const latime = (growth / max) * 100;
    return `
      <div class="bar-row">
        <span class="bar-label">${escapeHtml(p.name)}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${latime.toFixed(2)}%"></span></span>
        <span class="bar-value">${fmtPct(growth)}</span>
      </div>`;
  }).join('');
}

/* ═══ 3. Inflația 1991–2024 ═════════════════════════════ */

function renderInflationChart(range = 'all') {
  const date = GLITCHCOIN_DATA.inflation.filter((d) => (range === 'recent' ? d.year >= 2000 : true));
  const maxAbs = Math.max(...date.map((d) => Math.abs(d.rate)));
  const labelMod = range === 'recent' ? 0 : 1; // 1991, 1996, … / 2000, 2005, …

  document.getElementById('inflation-chart').innerHTML = date.map((d) => {
    const pozitiv = d.rate >= 0;
    const inaltime = (Math.abs(d.rate) / maxAbs) * 100;
    const bara = `<div class="vbar ${pozitiv ? 'vbar-pos' : 'vbar-neg'}" style="height:${inaltime.toFixed(2)}%"></div>`;
    const eticheta = d.year % 5 === labelMod ? d.year : '';
    return `
      <div class="vcol" title="${d.year}: ${fmtPct(d.rate)}">
        <div class="vhalf vhalf-top">${pozitiv ? bara : ''}</div>
        <div class="vzero"></div>
        <div class="vhalf vhalf-bot">${pozitiv ? '' : bara}</div>
        <div class="vlabel">${eticheta}</div>
      </div>`;
  }).join('');

  const rate = GLITCHCOIN_DATA.inflation.map((d) => d.rate);
  const medie = rate.reduce((a, b) => a + b, 0) / rate.length;
  const maxim = GLITCHCOIN_DATA.inflation.reduce((a, b) => (b.rate > a.rate ? b : a));
  const minim = GLITCHCOIN_DATA.inflation.reduce((a, b) => (b.rate < a.rate ? b : a));
  const deflatie = GLITCHCOIN_DATA.inflation.filter((d) => d.rate < 0).map((d) => d.year).join(', ');

  document.getElementById('inflation-stats').innerHTML = `
    <span>Medie 1991–2024: <strong>${fmtPct(medie)}</strong></span>
    <span>Maxim: <strong>${fmtPct(maxim.rate)}</strong> (${maxim.year})</span>
    <span>Minim: <strong>${fmtPct(minim.rate)}</strong> (${minim.year})</span>
    <span>Ani cu deflație: <strong>${deflatie}</strong></span>`;

  document.getElementById('inflation-table-body').innerHTML = GLITCHCOIN_DATA.inflation.map((d) => `
    <tr>
      <td>${d.year}</td>
      <td class="num">${fmtPct(d.rate)}</td>
    </tr>`).join('');
}

/* ═══ 4. Deflatorul sumelor ═════════════════════════════ */

function deflatorValue(suma, an) {
  let produs = 1;
  for (let y = an; y < AN_CURENT; y++) {
    produs *= 1 + (RATE_BY_YEAR[y] ?? 0);
  }
  return suma / produs;
}

function renderDeflator() {
  const suma = Math.max(0, readNumber(document.getElementById('def-suma')));
  const an = parseInt(document.getElementById('def-year').value, 10);
  const echivalent = deflatorValue(suma, an);

  const result = document.getElementById('def-result');
  if (an >= AN_CURENT) {
    result.innerHTML = `Echivalentul în ${an}: <strong>${fmtLei(echivalent)}</strong> — anul curent, suma se păstrează neschimbată.`;
  } else {
    result.innerHTML =
      `Echivalentul în ${an}: <strong>${fmtLei(echivalent)}</strong> — suma de <strong>${fmtLei(suma)}</strong> din ${AN_CURENT} ` +
      `avea puterea de cumpărare a <strong>${fmtLei(echivalent)}</strong> din ${an}.`;
  }

  const tbody = document.getElementById('def-table-body');
  const fragment = document.createDocumentFragment();
  for (let y = 1991; y <= AN_CURENT; y++) {
    const tr = document.createElement('tr');
    if (y === an) tr.className = 'selected';
    const valoare = deflatorValue(suma, y);
    const diferenta = suma > 0 ? valoare / suma - 1 : null;
    tr.innerHTML = `<td>${y}</td><td class="num">${fmtLei(valoare)}</td><td class="num">${diferenta === null ? '—' : fmtPct(diferenta)}</td>`;
    fragment.appendChild(tr);
  }
  tbody.replaceChildren(fragment);
}

/* ═══ 5. Timp vs dorințe ═══════════════════════════════ */

/* Constantele din tabul „Timp vs dorințe" din Excel. */
const TIMP_ZILE_LUNA = 31;           // venitul pe zi = venit / 31
const TIMP_ORE_ZI = 24;              // venitul pe oră = venit pe zi / 24
const TIMP_MINUTE_ORA = 60;          // venitul pe minut = venit pe oră / 60
const TIMP_ZILE_LUCRATOARE = 20;     // venitul pe zi lucrătoare = venit / 20
const TIMP_ORE_LUCRATOARE = 8;       // venitul pe oră lucrătoare = zi lucrătoare / 8
const TIMP_ZILE_AN = 365;            // zile într-un an calendaristic
const TIMP_ZILE_LUCRATOARE_AN = 261; // zile lucrătoare într-un an

function computeTimp(venit, pret) {
  const venitZi = venit / TIMP_ZILE_LUNA;
  const venitOra = venitZi / TIMP_ORE_ZI;
  const venitMinut = venitOra / TIMP_MINUTE_ORA;
  const venitZiLucr = venit / TIMP_ZILE_LUCRATOARE;
  const venitOraLucr = venitZiLucr / TIMP_ORE_LUCRATOARE;

  return {
    venitZi,
    venitOra,
    venitMinut,
    venitZiLucr,
    venitOraLucr,
    minute: pret / venitMinut,
    ore: pret / venitOra,
    zile: pret / venitZi,
    oreLucrate: pret / venitOraLucr,
    zileLucrate: pret / venitZiLucr,
    pctAn: (pret / venitZi) / TIMP_ZILE_AN,
    pctAnLucrator: (pret / venitZiLucr) / TIMP_ZILE_LUCRATOARE_AN,
  };
}

function renderTimp() {
  const venit = Math.max(0, readNumber(document.getElementById('timp-venit')));
  const pret = Math.max(0, readNumber(document.getElementById('timp-pret')));

  const ids = [
    'timp-venit-zi', 'timp-venit-ora', 'timp-venit-minut',
    'timp-venit-ziluc', 'timp-venit-oraluc',
    'timp-minute', 'timp-ore', 'timp-zile', 'timp-oreluc', 'timp-zileluc',
    'timp-tabel-zile', 'timp-tabel-pct', 'timp-tabel-zileluc', 'timp-tabel-pctluc',
  ];
  const summary = document.getElementById('timp-summary');

  if (venit <= 0) {
    for (const id of ids) document.getElementById(id).textContent = '—';
    summary.textContent = 'Introdu un venit lunar mai mare decât zero pentru a vedea cât timp muncești pentru dorință.';
    return;
  }

  const r = computeTimp(venit, pret);

  document.getElementById('timp-venit-zi').textContent = fmtLei(r.venitZi);
  document.getElementById('timp-venit-ora').textContent = fmtLei(r.venitOra);
  document.getElementById('timp-venit-minut').textContent = fmtLei(r.venitMinut, 4);
  document.getElementById('timp-venit-ziluc').textContent = fmtLei(r.venitZiLucr);
  document.getElementById('timp-venit-oraluc').textContent = fmtLei(r.venitOraLucr);

  document.getElementById('timp-minute').textContent = fmtInt(Math.round(r.minute));
  document.getElementById('timp-ore').textContent = fmtInt(Math.round(r.ore));
  document.getElementById('timp-zile').textContent = fmtInt(Math.round(r.zile));
  document.getElementById('timp-oreluc').textContent = fmtInt(Math.round(r.oreLucrate));
  document.getElementById('timp-zileluc').textContent = fmtInt(Math.round(r.zileLucrate));

  document.getElementById('timp-tabel-zile').textContent = r.zile.toLocaleString(LOCALE, { maximumFractionDigits: 2 });
  document.getElementById('timp-tabel-pct').textContent = fmtPct(r.pctAn);
  document.getElementById('timp-tabel-zileluc').textContent = r.zileLucrate.toLocaleString(LOCALE, { maximumFractionDigits: 2 });
  document.getElementById('timp-tabel-pctluc').textContent = fmtPct(r.pctAnLucrator);

  summary.innerHTML =
    `Pentru dorința de <strong>${fmtLei(pret)}</strong> vei munci aproximativ ` +
    `<strong>${fmtInt(Math.round(r.minute))} minute</strong> sau <strong>${fmtInt(Math.round(r.ore))} ore</strong> ` +
    `sau <strong>${fmtInt(Math.round(r.zile))} zile</strong> din viața ta (24/24).<br>` +
    `SAU vei munci aproximativ <strong>${fmtInt(Math.round(r.oreLucrate))} ore</strong> ` +
    `sau <strong>${fmtInt(Math.round(r.zileLucrate))} zile</strong> lucrate (8/24).<br>` +
    `Mai exact, cheltuiala ta îți va lua <strong>${fmtPct(r.pctAn)}</strong> din timpul tău într-un an (24/24) ` +
    `sau <strong>${fmtPct(r.pctAnLucrator)}</strong> dintr-un an lucrător.`;
}

/* ═══ 6. Calculul dobânzii ═════════════════════════════ */

/* Rotunjește la 2 zecimale, ca funcția ROUND din Excel. */
function round2(value) {
  return Math.round(value * 100) / 100;
}

function computeDobanda(suma, rata, zile, impozit) {
  const brut = round2(suma * rata * zile / 365);
  const net = round2((1 - impozit) * brut);
  return { brut, net };
}

function renderDobanda() {
  const suma = Math.max(0, readNumber(document.getElementById('dob-suma')));
  const rata = Math.max(0, readNumber(document.getElementById('dob-rata'))) / 100;
  const zile = Math.max(0, readNumber(document.getElementById('dob-zile')));
  const impozit = Math.min(1, Math.max(0, readNumber(document.getElementById('dob-impozit')) / 100));

  const { brut, net } = computeDobanda(suma, rata, zile, impozit);

  const summary = document.getElementById('dob-summary');
  if (suma <= 0 || zile <= 0) {
    summary.textContent = 'Introdu o sumă inițială și un număr de zile mai mari decât zero pentru a calcula dobânda.';
  } else {
    summary.innerHTML =
      `Pentru <strong>${fmtLei(suma)}</strong> la <strong>${fmtPct(rata, 0)}</strong> pe <strong>${fmtInt(zile)} de zile</strong>, ` +
      `dobânda brută e <strong>${fmtLei(brut)}</strong>, iar după impozitul de <strong>${fmtPct(impozit, 0)}</strong> ` +
      `rămâi cu <strong>${fmtLei(net)}</strong>.`;
  }

  document.getElementById('dob-brut').textContent = fmtLei(brut);
  document.getElementById('dob-net').textContent = fmtLei(net);
  document.getElementById('dob-pas-brut').textContent = fmtLei(brut);
  document.getElementById('dob-pas-net').textContent = fmtLei(net);
}

/* ═══ 7. Dobânda compusă ═══════════════════════════════ */

/* Constantele din tabul „Dobânda compusă" din Excel. */
const COMP_ANI = 20;        // evoluția pe 20 de ani
const COMP_LUNI_AN = 12;    // 12 luni într-un an

/* Scenariul A (fără contribuție):
     B(0) = suma inițială
     B(n) = ROUND(B(n-1) × (1 + rată), 2)
     Dobânda(n) = B(n) − B(n-1)
     Randament(n) = B(n) / B(0) − 1
   Scenariul B (cu contribuție lunară):
     G(0) = suma inițială
     G(n) = ROUND(G(n-1) + contribuție × 12, 2)
     I(n) = C7 × (1 + rată/12)^(12×n) + contribuție × ((1 + rată/12)^(12×n) − 1) / (rată/12)
     Dobânda acumulată(n) = I(n) − G(n)
     Creștere anuală(n) = I(n) / G(n-1) − 1   (din anul 2, ca în Excel) */
function computeCompusa(suma, contributie, rata) {
  const factorAn = 1 + rata;

  const scenA = [];
  let precedentA = suma;
  for (let an = 0; an <= COMP_ANI; an++) {
    const valoare = an === 0 ? suma : round2(precedentA * factorAn);
    scenA.push({
      an,
      valoare,
      dobanda: an === 0 ? null : valoare - precedentA,
      randament: an >= 1 && suma > 0 ? valoare / suma - 1 : null,
    });
    precedentA = valoare;
  }

  const scenB = [];
  let investit = suma;
  for (let an = 0; an <= COMP_ANI; an++) {
    const sumaInvestita = an === 0 ? suma : round2(investit + contributie * COMP_LUNI_AN);

    const luna = rata / COMP_LUNI_AN;
    const putere = Math.pow(1 + luna, COMP_LUNI_AN * an);
    // Când rată = 0, formula cu divizare la (rată/12) dă erorie — limita ei e suma platită.
    const sumaTotala = rata === 0
      ? suma + contributie * COMP_LUNI_AN * an
      : suma * putere + contributie * (putere - 1) / luna;

    scenB.push({
      an,
      sumaInvestita,
      dobanda: sumaTotala - sumaInvestita,
      sumaTotala,
      crestere: an >= 2 ? sumaTotala / investit - 1 : null,
    });
    investit = sumaInvestita;
  }

  return { scenA, scenB };
}

function renderCompusa() {
  const suma = Math.max(0, readNumber(document.getElementById('comp-suma')));
  const contributie = Math.max(0, readNumber(document.getElementById('comp-contributie')));
  const rata = Math.max(0, readNumber(document.getElementById('comp-rata'))) / 100;

  const { scenA, scenB } = computeCompusa(suma, contributie, rata);
  const finalA = scenA[scenA.length - 1];
  const finalB = scenB[scenB.length - 1];

  const summaryA = document.getElementById('comp-a-summary');
  if (suma <= 0) {
    summaryA.textContent = 'Introdu o sumă inițială mai mare decât zero pentru a vedea evoluția.';
  } else {
    summaryA.innerHTML =
      `Cu <strong>${fmtLei(suma)}</strong> la <strong>${fmtPct(rata)}</strong> pe an, după ` +
      `<strong>${COMP_ANI} de ani</strong> ai <strong>${fmtLei(finalA.valoare)}</strong> — ` +
      `dobândă <strong>${fmtLei(finalA.valoare - suma)}</strong> ` +
      `(<strong>${finalA.randament === null ? '—' : fmtPct(finalA.randament)}</strong> față de suma inițială).`;
  }

  const summaryB = document.getElementById('comp-b-summary');
  if (suma <= 0 && contributie <= 0) {
    summaryB.textContent = 'Introdu o sumă inițială sau o contribuție lunară mai mare decât zero pentru a vedea evoluția.';
  } else {
    summaryB.innerHTML =
      `Cu <strong>${fmtLei(suma)}</strong> inițial și <strong>${fmtLei(contributie)}</strong> pe lună la ` +
      `<strong>${fmtPct(rata)}</strong>, după <strong>${COMP_ANI} de ani</strong> ai ` +
      `<strong>${fmtLei(finalB.sumaTotala)}</strong>, din care <strong>${fmtLei(finalB.sumaInvestita)}</strong> investiți — ` +
      `dobândă <strong>${fmtLei(finalB.dobanda)}</strong>.`;
  }

  document.getElementById('comp-a-body').innerHTML = scenA.map((r) => `
    <tr>
      <td>${r.an}</td>
      <td class="num">${fmtLei(r.valoare)}</td>
      <td class="num">${r.dobanda === null ? '—' : fmtLei(r.dobanda)}</td>
      <td class="num">${r.randament === null ? '—' : fmtPct(r.randament)}</td>
    </tr>`).join('');

  document.getElementById('comp-b-body').innerHTML = scenB.map((r) => `
    <tr>
      <td>${r.an}</td>
      <td class="num">${fmtLei(r.sumaInvestita)}</td>
      <td class="num">${fmtLei(r.dobanda)}</td>
      <td class="num strong">${fmtLei(r.sumaTotala)}</td>
      <td class="num">${r.crestere === null ? '—' : fmtPct(r.crestere)}</td>
    </tr>`).join('');
}

/* ═══ 8. Randament ═════════════════════════════════════ */

/* Formulele din tabul „Randament" din Excel:
     câștig brut = sumă × randament
     câștig net   = brut − impozit × brut − comisioane × brut
     randament brut = brut / sumă · randament net = net / sumă
     randament real = (1 + net) / (1 + inflație) − 1
     câștig real    = randament real × sumă */
function computeRandament(suma, randament, impozit, comisioane, inflatie) {
  const brutLei = suma * randament;
  const netLei = brutLei - impozit * brutLei - comisioane * brutLei;
  const brutPct = suma > 0 ? brutLei / suma : null;
  const netPct = suma > 0 ? netLei / suma : null;
  const realPct = netPct === null ? null : (1 + netPct) / (1 + inflatie) - 1;

  return {
    brutLei,
    netLei,
    brutPct,
    netPct,
    realPct,
    realLei: realPct === null ? null : realPct * suma,
  };
}

function renderRandament() {
  const suma = Math.max(0, readNumber(document.getElementById('rand-suma')));
  const randament = readNumber(document.getElementById('rand-randament')) / 100;
  const impozit = Math.min(1, Math.max(0, readNumber(document.getElementById('rand-impozit')) / 100));
  const comisioane = Math.min(1, Math.max(0, readNumber(document.getElementById('rand-comisioane')) / 100));
  const inflatie = Math.max(-0.99, readNumber(document.getElementById('rand-inflatie')) / 100);

  const r = computeRandament(suma, randament, impozit, comisioane, inflatie);

  document.getElementById('rand-brut-pct').textContent = r.brutPct === null ? '—' : fmtPct(r.brutPct);
  document.getElementById('rand-net-pct').textContent = r.netPct === null ? '—' : fmtPct(r.netPct);
  document.getElementById('rand-real-pct').textContent = r.realPct === null ? '—' : fmtPct(r.realPct);
  paintSign('rand-brut-pct', r.brutPct);
  paintSign('rand-net-pct', r.netPct);
  paintSign('rand-real-pct', r.realPct);

  document.getElementById('rand-tabel-brut-pct').textContent = r.brutPct === null ? '—' : fmtPct(r.brutPct);
  document.getElementById('rand-tabel-brut-lei').textContent = fmtLei(r.brutLei);
  document.getElementById('rand-tabel-net-pct').textContent = r.netPct === null ? '—' : fmtPct(r.netPct);
  document.getElementById('rand-tabel-net-lei').textContent = fmtLei(r.netLei);
  document.getElementById('rand-tabel-real-pct').textContent = r.realPct === null ? '—' : fmtPct(r.realPct);
  document.getElementById('rand-tabel-real-lei').textContent = r.realLei === null ? '—' : fmtLei(r.realLei);

  const summary = document.getElementById('rand-summary');
  if (suma <= 0) {
    summary.textContent = 'Introdu o sumă investită mai mare decât zero pentru a calcula randamentul.';
    return;
  }

  summary.innerHTML =
    `Pentru <strong>${fmtLei(suma)}</strong> la <strong>${fmtPct(randament)}</strong>, câștigul brut e ` +
    `<strong>${fmtLei(r.brutLei)}</strong> (randament brut <strong>${fmtPct(r.brutPct)}</strong>). ` +
    `După impozitul de <strong>${fmtPct(impozit, 0)}</strong> și comisioanele de <strong>${fmtPct(comisioane, 0)}</strong> ` +
    `rămâi cu <strong>${fmtLei(r.netLei)}</strong> (randament net <strong>${fmtPct(r.netPct)}</strong>), ` +
    `iar ajustat pentru inflația de <strong>${fmtPct(inflatie)}</strong> randamentul real e ` +
    `<strong>${fmtPct(r.realPct)}</strong> — <strong>${fmtLei(r.realLei)}</strong>.`;
}

/* ═══ 9. Profit ════════════════════════════════════════ */

/* Formulele din tabul „Profit" din Excel:
     valoarea finală = sumă / preț inițial × preț vânzare
     profit brut     = valoarea finală − sumă
     randament brut  = valoarea finală / sumă − 1
     profit net      = brut − (brut × impozit + brut × comisioane)
     randament net   = profit net / sumă
     randament real  = (1 + randament net) / (1 + inflație) − 1
     profit real     = randament real × sumă */
function computeProfit(suma, pretInitial, pretVanzare, impozit, comisioane, inflatie) {
  if (pretInitial <= 0) {
    return {
      valoareFinala: null, brut: null, randBrut: null,
      net: null, randNet: null, randReal: null, real: null,
    };
  }

  const valoareFinala = suma / pretInitial * pretVanzare;
  const brut = valoareFinala - suma;
  const randBrut = suma > 0 ? valoareFinala / suma - 1 : null;
  const net = brut - (brut * impozit + brut * comisioane);
  const randNet = suma > 0 ? net / suma : null;
  const randReal = randNet === null ? null : (1 + randNet) / (1 + inflatie) - 1;
  const real = randReal === null ? null : randReal * suma;

  return { valoareFinala, brut, randBrut, net, randNet, randReal, real };
}

function renderProfit() {
  const suma = Math.max(0, readNumber(document.getElementById('prof-suma')));
  const pretInitial = readNumber(document.getElementById('prof-pret-init'));
  const pretVanzare = readNumber(document.getElementById('prof-pret-vanzare'));
  const impozit = Math.min(1, Math.max(0, readNumber(document.getElementById('prof-impozit')) / 100));
  const comisioane = Math.min(1, Math.max(0, readNumber(document.getElementById('prof-comisioane')) / 100));
  const inflatie = Math.max(-0.99, readNumber(document.getElementById('prof-inflatie')) / 100);

  const r = computeProfit(suma, pretInitial, pretVanzare, impozit, comisioane, inflatie);

  const summary = document.getElementById('prof-summary');
  if (pretInitial <= 0) {
    summary.textContent = 'Introdu un preț inițial mai mare decât zero pentru a calcula profitul.';
  } else if (suma <= 0) {
    summary.textContent = 'Introdu o sumă investită mai mare decât zero pentru a calcula randamentul.';
  } else {
    summary.innerHTML =
      `Cu <strong>${fmtLei(suma)}</strong> investiți la prețul de <strong>${fmtLei(pretInitial)}</strong> și vânduți la ` +
      `<strong>${fmtLei(pretVanzare)}</strong>, valoarea finală e <strong>${fmtLei(r.valoareFinala)}</strong> — ` +
      `profit brut <strong>${fmtLei(r.brut)}</strong> și profit net <strong>${fmtLei(r.net)}</strong> ` +
      `(după impozitul de <strong>${fmtPct(impozit, 0)}</strong> și comisioanele de <strong>${fmtPct(comisioane, 0)}</strong>). ` +
      `Randamentul real, ajustat pentru inflația de <strong>${fmtPct(inflatie)}</strong>, e ` +
      `<strong>${fmtPct(r.randReal)}</strong> — <strong>${fmtLei(r.real)}</strong>.`;
  }

  document.getElementById('prof-final').textContent = r.valoareFinala === null ? '—' : fmtLei(r.valoareFinala);
  document.getElementById('prof-brut').textContent = r.brut === null ? '—' : fmtLei(r.brut);
  document.getElementById('prof-net').textContent = r.net === null ? '—' : fmtLei(r.net);
  document.getElementById('prof-real').textContent = r.real === null ? '—' : fmtLei(r.real);
  paintSign('prof-brut', r.brut);
  paintSign('prof-net', r.net);
  paintSign('prof-real', r.real);

  document.getElementById('prof-tabel-final').textContent = r.valoareFinala === null ? '—' : fmtLei(r.valoareFinala);
  document.getElementById('prof-tabel-brut').textContent = r.brut === null ? '—' : fmtLei(r.brut);
  document.getElementById('prof-tabel-rand-brut').textContent = r.randBrut === null ? '—' : fmtPct(r.randBrut);
  document.getElementById('prof-tabel-net').textContent = r.net === null ? '—' : fmtLei(r.net);
  document.getElementById('prof-tabel-rand-net').textContent = r.randNet === null ? '—' : fmtPct(r.randNet);
  document.getElementById('prof-tabel-rand-real').textContent = r.randReal === null ? '—' : fmtPct(r.randReal);
  document.getElementById('prof-tabel-real').textContent = r.real === null ? '—' : fmtLei(r.real);
}

/* ═══ 10. Costul mediu de achiziție ════════════════════ */

/* Valorile implicite din tabul „Costul mediu" din Excel (comisionul e fractie, nu procent). */
const COST_ROWS_DEFAULT = [
  { pret: 28.81, cantitate: 24, comision: 0.02 },
  { pret: 27.75, cantitate: 144, comision: 0.02 },
  { pret: 32.89, cantitate: 4, comision: 0.02 },
  { pret: 34.4, cantitate: 30, comision: 0.02 },
];

let costRows = COST_ROWS_DEFAULT.map((r) => ({ ...r }));

/* Formula din Excel:
     costul mediu = (SUMPRODUCT(preț, cantitate) + SUMPRODUCT(preț, cantitate, comision))
                    / SUM(cantitate) */
function computeCost(rows) {
  let sumaCantitati = 0;
  let sumaValori = 0;
  let sumaComisioane = 0;

  const detalii = rows.map((r, index) => {
    const valoare = r.pret * r.cantitate;
    const comision = valoare * r.comision;
    sumaCantitati += r.cantitate;
    sumaValori += valoare;
    sumaComisioane += comision;
    return { index: index + 1, pret: r.pret, cantitate: r.cantitate, comision: r.comision, valoare, comision };
  });

  const costMediu = sumaCantitati > 0 ? (sumaValori + sumaComisioane) / sumaCantitati : null;

  return {
    detalii,
    sumaCantitati,
    sumaValori,
    sumaComisioane,
    total: sumaValori + sumaComisioane,
    costMediu,
  };
}

/* Construiește rândurile tabelului. Se apelează doar la init / adăugare / ștergere / reset,
   nu și la fiecare tastă, ca inputurile să-și păstreze focalizarea. */
function renderCostRows() {
  const tbody = document.getElementById('cost-body');
  tbody.replaceChildren();

  costRows.forEach((row, i) => {
    const tr = document.createElement('tr');

    const tdIndex = document.createElement('td');
    tdIndex.textContent = String(i + 1);
    tr.appendChild(tdIndex);

    const adaugaInput = (field, value, ariaLabel, max = null) => {
      const td = document.createElement('td');
      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'cell-input';
      input.dataset.field = field;
      input.value = String(value);
      input.min = '0';
      input.step = 'any';
      input.setAttribute('inputmode', 'decimal');
      input.setAttribute('aria-label', ariaLabel);
      if (max !== null) input.max = String(max);
      td.appendChild(input);
      tr.appendChild(td);
      return input;
    };

    adaugaInput('pret', row.pret, `Rândul ${i + 1}: preț`);
    adaugaInput('cantitate', row.cantitate, `Rândul ${i + 1}: cantitate`);
    adaugaInput('comision', row.comision * 100, `Rândul ${i + 1}: comision, procente`, 100);

    const tdValoare = document.createElement('td');
    tdValoare.className = 'num';
    tdValoare.dataset.output = 'valoare';
    tr.appendChild(tdValoare);

    const tdComision = document.createElement('td');
    tdComision.className = 'num';
    tdComision.dataset.output = 'comision';
    tr.appendChild(tdComision);

    const tdDelete = document.createElement('td');
    const btnDelete = document.createElement('button');
    btnDelete.type = 'button';
    btnDelete.className = 'row-delete';
    btnDelete.dataset.index = String(i);
    btnDelete.setAttribute('aria-label', `Șterge rândul ${i + 1}`);
    btnDelete.textContent = 'Șterge';
    if (costRows.length <= 1) btnDelete.disabled = true; // păstrăm cel puțin un rând
    tdDelete.appendChild(btnDelete);
    tr.appendChild(tdDelete);

    tbody.appendChild(tr);
  });
}

/* Recalculează și actualizează doar celulele rezultat — fără reconstruirea tabelului. */
function updateCostOutputs() {
  const r = computeCost(costRows);

  const trs = document.querySelectorAll('#cost-body tr');
  r.detalii.forEach((d, i) => {
    const tr = trs[i];
    if (!tr) return;
    tr.querySelector('[data-output="valoare"]').textContent = fmtLei(d.valoare);
    tr.querySelector('[data-output="comision"]').textContent = fmtLei(d.comision);
  });

  document.getElementById('cost-mediu').textContent = r.costMediu === null ? '—' : fmtLei(r.costMediu, 4);
  document.getElementById('cost-cantitate').textContent = fmtInt(Math.round(r.sumaCantitati));
  document.getElementById('cost-valoare').textContent = fmtLei(r.sumaValori);
  document.getElementById('cost-total').textContent = fmtLei(r.total);

  const summary = document.getElementById('cost-summary');
  if (r.costMediu === null) {
    summary.textContent = 'Introdu o cantitate mai mare decât zero pentru a calcula costul mediu.';
  } else {
    summary.innerHTML =
      `Ai cumpărat <strong>${fmtInt(Math.round(r.sumaCantitati))}</strong> unități în ` +
      `<strong>${costRows.length}</strong> tranșe, în valoare de <strong>${fmtLei(r.sumaValori)}</strong> ` +
      `(comisioane <strong>${fmtLei(r.sumaComisioane)}</strong>). ` +
      `Costul mediu de achiziție e <strong>${fmtLei(r.costMediu, 4)}</strong> pe unitate.`;
  }
}

function initCost() {
  renderCostRows();
  updateCostOutputs();

  const tbody = document.getElementById('cost-body');

  tbody.addEventListener('input', (event) => {
    const input = event.target;
    if (!input.dataset || !input.dataset.field) return;
    const tr = input.closest('tr');
    const index = Array.from(tbody.querySelectorAll('tr')).indexOf(tr);
    if (index === -1) return;

    const field = input.dataset.field;
    const value = parseFloat(input.value);
    // Comisionul e introdus în procente și ținut intern ca fracție (ca în Excel).
    costRows[index][field] = Number.isFinite(value) ? value / (field === 'comision' ? 100 : 1) : 0;
    updateCostOutputs();
  });

  tbody.addEventListener('click', (event) => {
    const btn = event.target.closest('.row-delete');
    if (!btn) return;
    const index = Number(btn.dataset.index);
    if (!Number.isInteger(index) || index < 0 || index >= costRows.length) return;
    if (costRows.length <= 1) return;
    costRows.splice(index, 1);
    renderCostRows();
    updateCostOutputs();
  });

  document.getElementById('cost-add').addEventListener('click', () => {
    costRows.push({ pret: 0, cantitate: 0, comision: 0.02 });
    renderCostRows();
    updateCostOutputs();
    const trs = tbody.querySelectorAll('tr');
    const input = trs[trs.length - 1] && trs[trs.length - 1].querySelector('input[data-field="pret"]');
    if (input) input.focus();
  });

  document.getElementById('cost-reset').addEventListener('click', () => {
    costRows = COST_ROWS_DEFAULT.map((r) => ({ ...r }));
    renderCostRows();
    updateCostOutputs();
  });
}

/* ═══ 11. Sumă dorită ═══════════════════════════════════ */

/* Formula D9 din Excel: -PMT(randament/12, ani*12, suma inițială, sumă dorită).
   PMT(rate, nper, pv, fv) = -rate × (pv × (1+rate)^nper + fv) / ((1+rate)^nper − 1) */
function pmt(rate, nper, pv, fv) {
  if (nper <= 0) return null;
  if (rate === 0) return -(pv + fv) / nper;
  const putere = Math.pow(1 + rate, nper);
  return -rate * (pv * putere + fv) / (putere - 1);
}

/* Suma acumulată după `luni` luni: capitalul inițial crește cu dobânda,
   la care se adaugă economia lunară (anuitate ordinară). */
function sumaAcumulata(sumaInitiala, rataLuna, luni, economie) {
  if (luni <= 0) return sumaInitiala;
  if (rataLuna === 0) return sumaInitiala + economie * luni;
  const putere = Math.pow(1 + rataLuna, luni);
  return sumaInitiala * putere + economie * (putere - 1) / rataLuna;
}

function computeSuma(randament, ani, sumaInitiala, sumaDorita) {
  const rataLuna = randament / 12;
  const luni = ani * 12;
  const payment = pmt(rataLuna, luni, sumaInitiala, sumaDorita);
  if (payment === null) return null;

  const economie = -payment; // economisirea lunară, pozitivă
  const totalEconomisit = economie * luni;
  const sumaFinala = sumaAcumulata(sumaInitiala, rataLuna, luni, economie);
  const dinDobanda = sumaFinala - sumaInitiala - totalEconomisit;

  const rows = [];
  for (let an = 1; an <= Math.floor(ani); an++) {
    const luniAn = an * 12;
    const acumulata = sumaAcumulata(sumaInitiala, rataLuna, luniAn, economie);
    rows.push({
      an,
      acumulata,
      economisit: economie * luniAn,
      dobanda: acumulata - sumaInitiala - economie * luniAn,
      avans: sumaDorita > 0 ? acumulata / sumaDorita : null,
    });
  }

  return { economie, totalEconomisit, sumaFinala, dinDobanda, rows, luni };
}

function renderSuma() {
  const randament = Math.max(0, readNumber(document.getElementById('suma-randament'))) / 100;
  const ani = Math.max(0, readNumber(document.getElementById('suma-ani')));
  const sumaInitiala = Math.max(0, readNumber(document.getElementById('suma-initiala')));
  const sumaDorita = Math.max(0, readNumber(document.getElementById('suma-dorita')));

  const summary = document.getElementById('suma-summary');
  const ids = ['suma-economie', 'suma-total-economisit', 'suma-dobanda', 'suma-final'];
  const r = computeSuma(randament, ani, sumaInitiala, sumaDorita);

  if (ani <= 0 || sumaDorita <= 0) {
    summary.textContent = 'Introdu un număr de ani și o sumă dorită mai mari decât zero pentru a calcula economia lunară.';
    for (const id of ids) {
      const el = document.getElementById(id);
      el.textContent = '—';
      el.classList.remove('is-pos', 'is-neg');
    }
    document.getElementById('suma-table-body').innerHTML = '';
    return;
  }

  summary.innerHTML =
    `Pentru a ajunge de la <strong>${fmtLei(sumaInitiala)}</strong> la <strong>${fmtLei(sumaDorita)}</strong> ` +
    `în <strong>${fmtInt(Math.round(ani))} de ani</strong> la randamentul de <strong>${fmtPct(randament)}</strong>, ` +
    `trebuie să economisești <strong>${fmtLei(r.economie)}</strong> în fiecare lună — ` +
    `<strong>${fmtLei(r.totalEconomisit)}</strong> economisiți în total, plus <strong>${fmtLei(r.dinDobanda)}</strong> din dobândă.`;

  document.getElementById('suma-economie').textContent = fmtLei(r.economie);
  document.getElementById('suma-total-economisit').textContent = fmtLei(r.totalEconomisit);
  document.getElementById('suma-dobanda').textContent = fmtLei(r.dinDobanda);
  document.getElementById('suma-final').textContent = fmtLei(r.sumaFinala);
  paintSign('suma-dobanda', r.dinDobanda);

  document.getElementById('suma-table-body').innerHTML = r.rows.map((row) => `
    <tr>
      <td>${row.an}</td>
      <td class="num">${fmtLei(row.acumulata)}</td>
      <td class="num">${fmtLei(row.economisit)}</td>
      <td class="num">${fmtLei(row.dobanda)}</td>
      <td class="num strong">${row.avans === null ? '—' : fmtPct(row.avans)}</td>
    </tr>`).join('');
}

/* ═══ 12. „Nu am bani" (tab ascuns din Excel) ═══════════ */

/* Constantele din formulele Excel:
   — impozitul pe dobândă e 10% (hardcodat în D60/D61);
   — simularea acoperă zilele D7…30, adică SEQUENCE(31−D7, 1, D7, 1). */
const NUAM_IMPOZIT_DOBANDA = 0.10;
const NUAM_ZIUA_FINALA = 30;

const NUAM_ROWS_DEFAULT = [
  { nume: 'Curent', zi: 15, suma: 100 },
  { nume: 'Gaz', zi: 16, suma: 150 },
  { nume: 'Apă', zi: 18, suma: 50 },
  { nume: 'Card de credit luna precedentă', zi: 25, suma: 2000 },
  { nume: 'Abonament mobil', zi: 30, suma: 50 },
  { nume: 'Abonament internet', zi: 30, suma: 80 },
];

let nuamRows = NUAM_ROWS_DEFAULT.map((r) => ({ ...r }));

function computeNuAm(venit, ziVenit, inflatie, economii, rata, rows) {
  const totalFacturi = rows.reduce((a, r) => a + r.suma, 0);
  const cheltuitFaraCE = venit - totalFacturi;

  const facturiPeZi = {};
  for (const r of rows) {
    const zi = Math.min(31, Math.max(1, Math.round(r.zi)));
    facturiPeZi[zi] = (facturiPeZi[zi] || 0) + r.suma;
  }

  const zile = [];
  let sold = economii;
  let profit = 0;
  for (let zi = ziVenit; zi <= NUAM_ZIUA_FINALA; zi++) {
    const dobanda = zi === ziVenit ? 0 : sold * rata / 365 * (1 - NUAM_IMPOZIT_DOBANDA);
    const retras = facturiPeZi[zi] || 0;
    const soldDupa = sold + dobanda - retras;
    zile.push({ zi, soldInainte: sold, dobanda, retras, soldDupa });
    sold = soldDupa;
    profit += dobanda;
  }

  const cheltuitCuCE = cheltuitFaraCE - profit;
  const raport = economii > 0 ? profit / economii : null;
  const profitAnual = profit * 12;
  const raportAnual = economii > 0 ? profitAnual / economii : null;
  const inflatiePentruTine = raportAnual === null ? null : inflatie - raportAnual;
  const profit10Ani = profitAnual * 10;
  const raport10Ani = economii > 0 ? profit10Ani / economii : null;

  return {
    totalFacturi, cheltuitFaraCE, cheltuitCuCE, profit, raport,
    zile, profitAnual, raportAnual, inflatiePentruTine, profit10Ani, raport10Ani,
    numarZile: Math.max(0, NUAM_ZIUA_FINALA - ziVenit),
  };
}

/* Construiește rândurile tabelului de facturi. Se apelează doar la init /
   adăugare / ștergere / reset, ca inputurile să-și păstreze focalizarea. */
function renderNuamRows() {
  const tbody = document.getElementById('nuam-body');
  tbody.replaceChildren();

  nuamRows.forEach((row, i) => {
    const tr = document.createElement('tr');

    const tdIndex = document.createElement('td');
    tdIndex.textContent = String(i + 1);
    tr.appendChild(tdIndex);

    const adaugaInput = (field, value, ariaLabel, type = 'number') => {
      const td = document.createElement('td');
      const input = document.createElement('input');
      input.type = type;
      input.className = 'cell-input';
      input.dataset.field = field;
      input.value = String(value);
      input.setAttribute('inputmode', type === 'number' ? 'decimal' : 'text');
      input.setAttribute('aria-label', ariaLabel);
      if (type === 'number') {
        input.min = '0';
        input.step = 'any';
      }
      td.appendChild(input);
      tr.appendChild(td);
      return input;
    };

    adaugaInput('nume', row.nume, `Rândul ${i + 1}: factura`, 'text');
    adaugaInput('zi', row.zi, `Rândul ${i + 1}: ziua scadentă`);
    adaugaInput('suma', row.suma, `Rândul ${i + 1}: suma`);

    const tdDelete = document.createElement('td');
    const btnDelete = document.createElement('button');
    btnDelete.type = 'button';
    btnDelete.className = 'row-delete';
    btnDelete.dataset.index = String(i);
    btnDelete.setAttribute('aria-label', `Șterge rândul ${i + 1}`);
    btnDelete.textContent = 'Șterge';
    if (nuamRows.length <= 1) btnDelete.disabled = true; // păstrăm cel puțin un rând
    tdDelete.appendChild(btnDelete);
    tr.appendChild(tdDelete);

    tbody.appendChild(tr);
  });
}

/* Recalculează și actualizează rezultatele — fără reconstruirea tabelului. */
function updateNuamOutputs() {
  const venit = Math.max(0, readNumber(document.getElementById('nuam-venit')));
  const ziVenit = Math.min(31, Math.max(1, Math.round(readNumber(document.getElementById('nuam-zi'), 1))));
  const inflatie = Math.max(-0.99, readNumber(document.getElementById('nuam-inflatie'))) / 100;
  const economii = Math.max(0, readNumber(document.getElementById('nuam-economii')));
  const rata = Math.max(0, readNumber(document.getElementById('nuam-rata'))) / 100;

  const r = computeNuAm(venit, ziVenit, inflatie, economii, rata, nuamRows);

  const summary = document.getElementById('nuam-summary');
  if (venit <= 0) {
    summary.textContent = 'Introdu un venit lunar mai mare decât zero pentru a vedea simularea.';
  } else if (r.numarZile <= 0) {
    summary.textContent = `Venitul e primit în ziua ${ziVenit} — simularea zilnică acoperă doar până la ziua ${NUAM_ZIUA_FINALA}.`;
  } else {
    summary.innerHTML =
      `Fără cont de economii, la finalul lunii rămâi cu <strong>${fmtLei(r.cheltuitFaraCE)}</strong>; ` +
      `cu cont de economii, cu <strong>${fmtLei(r.cheltuitCuCE)}</strong>. ` +
      `Diferența — <strong>${fmtLei(r.profit)}</strong> — e profitul din dobândă pe <strong>${r.numarZile} de zile</strong>, ` +
      `adică <strong>${r.raport === null ? '—' : fmtPct(r.raport)}</strong> raportat la suma adăugată.`;
  }

  document.getElementById('nuam-fara').textContent = fmtLei(r.cheltuitFaraCE);
  document.getElementById('nuam-cu').textContent = fmtLei(r.cheltuitCuCE);
  document.getElementById('nuam-profit').textContent = fmtLei(r.profit);
  document.getElementById('nuam-raport').textContent = r.raport === null ? '—' : fmtPct(r.raport);
  paintSign('nuam-fara', r.cheltuitFaraCE);
  paintSign('nuam-cu', r.cheltuitCuCE);
  paintSign('nuam-profit', r.profit);

  document.getElementById('nuam-profit-anual').textContent = fmtLei(r.profitAnual);
  document.getElementById('nuam-raport-anual').textContent = r.raportAnual === null ? '—' : fmtPct(r.raportAnual);
  document.getElementById('nuam-inflatie-tine').textContent = r.inflatiePentruTine === null ? '—' : fmtPct(r.inflatiePentruTine);
  document.getElementById('nuam-profit-10').textContent = fmtLei(r.profit10Ani);
  document.getElementById('nuam-raport-10').textContent = r.raport10Ani === null ? '—' : fmtPct(r.raport10Ani);
  paintSign('nuam-profit-anual', r.profitAnual);
  paintSign('nuam-inflatie-tine', r.inflatiePentruTine);
  paintSign('nuam-profit-10', r.profit10Ani);

  document.getElementById('nuam-schedule-body').innerHTML = r.zile.map((z) => `
    <tr>
      <td>${z.zi}</td>
      <td class="num">${fmtLei(z.soldInainte + z.dobanda)}</td>
      <td class="num">${fmtLei(z.dobanda)}</td>
      <td class="num">${z.retras > 0 ? fmtLei(z.retras) : '—'}</td>
      <td class="num strong">${fmtLei(z.soldDupa)}</td>
    </tr>`).join('');
}

function initNuam() {
  renderNuamRows();
  updateNuamOutputs();

  const tbody = document.getElementById('nuam-body');

  tbody.addEventListener('input', (event) => {
    const input = event.target;
    if (!input.dataset || !input.dataset.field) return;
    const tr = input.closest('tr');
    const index = Array.from(tbody.querySelectorAll('tr')).indexOf(tr);
    if (index === -1) return;

    const field = input.dataset.field;
    if (field === 'nume') {
      nuamRows[index].nume = input.value;
    } else {
      const value = parseFloat(input.value);
      nuamRows[index][field] = Number.isFinite(value) ? value : 0;
    }
    updateNuamOutputs();
  });

  tbody.addEventListener('click', (event) => {
    const btn = event.target.closest('.row-delete');
    if (!btn) return;
    const index = Number(btn.dataset.index);
    if (!Number.isInteger(index) || index < 0 || index >= nuamRows.length) return;
    if (nuamRows.length <= 1) return;
    nuamRows.splice(index, 1);
    renderNuamRows();
    updateNuamOutputs();
  });

  document.getElementById('nuam-add').addEventListener('click', () => {
    nuamRows.push({ nume: '', zi: 1, suma: 0 });
    renderNuamRows();
    updateNuamOutputs();
    const trs = tbody.querySelectorAll('tr');
    const input = trs[trs.length - 1] && trs[trs.length - 1].querySelector('input[data-field="nume"]');
    if (input) input.focus();
  });

  document.getElementById('nuam-reset').addEventListener('click', () => {
    nuamRows = NUAM_ROWS_DEFAULT.map((r) => ({ ...r }));
    renderNuamRows();
    updateNuamOutputs();
  });

  ['nuam-venit', 'nuam-zi', 'nuam-inflatie', 'nuam-economii', 'nuam-rata']
    .forEach((id) => document.getElementById(id).addEventListener('input', updateNuamOutputs));
}

/* ═══ 13. Navigarea cu taburi (v2) ═══════════════════════ */

/* Definiția taburilor: id-ul butonului ↔ id-ul panoului.
   Taburile fără `ready: true` sunt „în curând” — se văd, dar nu se deschid. */
const TABS = [
  { id: 'inflatie', ready: true },
  { id: 'timp',     ready: true },
  { id: 'dobanda',  ready: true },
  { id: 'compusa',  ready: true },
  { id: 'randament', ready: true },
  { id: 'profit',   ready: true },
  { id: 'cost',     ready: true },
  { id: 'suma',     ready: true },
  { id: 'nuam',     ready: true },
];

function activateTab(id, { focus = false } = {}) {
  const tab = document.getElementById('tab-' + id);
  const panel = document.getElementById('panel-' + id);
  if (!tab || !panel) return;

  TABS.forEach((t) => {
    const btn = document.getElementById('tab-' + t.id);
    const pnl = document.getElementById('panel-' + t.id);
    if (!btn || !pnl) return;
    const activ = t.id === id;
    btn.classList.toggle('is-active', activ);
    btn.setAttribute('aria-selected', activ ? 'true' : 'false');
    pnl.classList.toggle('is-active', activ);
    if (activ) pnl.removeAttribute('hidden');
    else pnl.setAttribute('hidden', '');
  });

  if (focus) tab.focus();

  // Reține ultimul tab vizibil în bara de browser (fără a mai încărca pagina).
  if (history.replaceState) history.replaceState(null, '', '#' + id);
}

function initTabs() {
  TABS.forEach((t) => {
    const tab = document.getElementById('tab-' + t.id);
    if (!tab) return;

    if (!t.ready) {
      tab.setAttribute('aria-disabled', 'true');
      tab.title = 'În curând';
      return; // nu se poate activa
    }

    tab.addEventListener('click', () => activateTab(t.id));
  });

  // Tastatură: săgeți stânga/dreapta + Home/End (mode WAI-ARIA).
  document.querySelector('.tabs').addEventListener('keydown', (event) => {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!keys.includes(event.key)) return;

    const tabList = Array.from(document.querySelectorAll('.tabs [role="tab"]'));
    const current = document.activeElement;
    let index = tabList.indexOf(current);
    if (index === -1) return;
    event.preventDefault();

    let next = index;
    if (event.key === 'ArrowLeft') next = (index - 1 + tabList.length) % tabList.length;
    if (event.key === 'ArrowRight') next = (index + 1) % tabList.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabList.length - 1;

    const target = tabList[next];
    const t = TABS.find((x) => 'tab-' + x.id === target.id);
    if (!t || !t.ready) return; // tab „în curând” nu se poate activa

    activateTab(t.id, { focus: true });
  });

  // Dacă pagina se deschide cu #nume-tab, pornește de acolo.
  const initial = location.hash.replace('#', '');
  activateTab(TABS.some((t) => t.id === initial && t.ready) ? initial : 'inflatie');

  updateTabsScrollHint();

  // Recemplește indiciul și la schimbarea mărimii ferestrei sau a conținutului.
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(updateTabsScrollHint).observe(document.querySelector('.tabs'));
  }
}

/* Bara de taburi afișează indiciul de derulare doar dacă are overflow. */
function updateTabsScrollHint() {
  const bar = document.querySelector('.tabs-bar');
  const tabs = document.querySelector('.tabs');
  if (!bar || !tabs) return;
  bar.classList.toggle('is-scrollable', tabs.scrollWidth > tabs.clientWidth + 1);
}

/* ═══ Inițializare ══════════════════════════════════════ */

function populateYearSelect() {
  const select = document.getElementById('def-year');
  for (let y = 1991; y <= AN_CURENT; y++) {
    const option = document.createElement('option');
    option.value = y;
    option.textContent = y;
    select.appendChild(option);
  }
  select.value = 2001; // valoarea din tabul sursă
}

function init() {
  initTheme();
  initTabs();
  populateYearSelect();
  renderSimulator();
  renderFood();
  renderInflationChart('all');
  renderDeflator();
  renderTimp();
  renderDobanda();
  renderCompusa();
  renderRandament();

  // Simulator: recalculează la fiecare modificare
  document.getElementById('sim-suma').addEventListener('input', renderSimulator);
  document.getElementById('sim-rata').addEventListener('input', renderSimulator);
  document.querySelectorAll('.presets .chip[data-rata]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById('sim-rata').value = btn.dataset.rata;
      renderSimulator();
    });
  });

  // Inflație: comutare interval
  document.querySelectorAll('.chart-toggle .chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.chart-toggle .chip').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      renderInflationChart(btn.dataset.range);
    });
  });

  // Deflator
  document.getElementById('def-suma').addEventListener('input', renderDeflator);
  document.getElementById('def-year').addEventListener('change', renderDeflator);

  // Timp vs dorințe
  document.getElementById('timp-venit').addEventListener('input', renderTimp);
  document.getElementById('timp-pret').addEventListener('input', renderTimp);

  // Calculul dobânzii
  document.getElementById('dob-suma').addEventListener('input', renderDobanda);
  document.getElementById('dob-rata').addEventListener('input', renderDobanda);
  document.getElementById('dob-zile').addEventListener('input', renderDobanda);
  document.getElementById('dob-impozit').addEventListener('input', renderDobanda);

  // Dobânda compusă
  document.getElementById('comp-suma').addEventListener('input', renderCompusa);
  document.getElementById('comp-contributie').addEventListener('input', renderCompusa);
  document.getElementById('comp-rata').addEventListener('input', renderCompusa);

  // Randament
  document.getElementById('rand-suma').addEventListener('input', renderRandament);
  document.getElementById('rand-randament').addEventListener('input', renderRandament);
  document.getElementById('rand-impozit').addEventListener('input', renderRandament);
  document.getElementById('rand-comisioane').addEventListener('input', renderRandament);
  document.getElementById('rand-inflatie').addEventListener('input', renderRandament);

  // Profit
  renderProfit();
  ['prof-suma', 'prof-pret-init', 'prof-pret-vanzare', 'prof-impozit', 'prof-comisioane', 'prof-inflatie']
    .forEach((id) => document.getElementById(id).addEventListener('input', renderProfit));

  // Costul mediu de achiziție
  initCost();

  // Sumă dorită
  renderSuma();
  ['suma-randament', 'suma-ani', 'suma-initiala', 'suma-dorita']
    .forEach((id) => document.getElementById(id).addEventListener('input', renderSuma));

  // „Nu am bani" (tab ascuns din Excel)
  initNuam();

  // Indiciul de derulare din bara de taburi se recalcul la redimensionare.
  window.addEventListener('resize', updateTabsScrollHint);
}

document.addEventListener('DOMContentLoaded', init);
