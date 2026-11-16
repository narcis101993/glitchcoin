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

/* Procent cu număr minim de zecimale: 1% → „1%", 0,3% → „0,3%", 2,5% → „2,5%".
   Util pentru ratele mici (comisioane), unde rotunjirea la 0 zecimale ar da „0%".
   Se rotunjește mai întâi, ca să evităm artefactul în virgulă mobilă (0,07 × 100 ≠ 7). */
function fmtPctSmart(fraction) {
  const procent = Math.round(fraction * 10000) / 100;
  return fmtPct(fraction, Number.isInteger(procent) ? 0 : 1);
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

/* ── Persistență inputuri (localStorage) ───────────────────
   Toate inputurile se salvează local, pe acest calculator:
     • inputurile statice — câte un `glitchcoin-input:<id>` pentru fiecare;
     • tabelele dinamici (`costRows`, `nuamRows`) — `glitchcoin-table:<nume>`;
     • tabul deschis — `glitchcoin-tab`.
   Se scrie cu debounce (~300 ms), ca să nu se salveze la fiecare tastă.
   Totul e în try/catch: pe unele browsere, pentru fișiere deschise cu file://,
   localStorage poate fi blocat — aplicația funcționează oricum, doar nu reține.
   Cheile au prefixul `glitchcoin-`, ca „Resetează tot" să știgă exact ce să șteargă. */

const PERSIST_PREFIX = 'glitchcoin-';
const PERSIST_DEBOUNCE_MS = 300;
let persistTimer = null;

/* Valorile implicite pentru tabelele dinamice (identice cu cele din HTML/Excel).
   Sunt singura sursă de adevăr pentru reset — `COST_ROWS_DEFAULT` / `NUAM_ROWS_DEFAULT`
   de mai jos sunt initialize din ele, ca să nu existe două liste care să se diveră. */
const COST_DEFAULTS = [
  { pret: 28.81, cantitate: 24, comision: 0.02 },
  { pret: 27.75, cantitate: 144, comision: 0.02 },
  { pret: 32.89, cantitate: 4, comision: 0.02 },
  { pret: 34.4, cantitate: 30, comision: 0.02 },
];

const NUAM_DEFAULTS = [
  { nume: 'Curent', zi: 15, suma: 100 },
  { nume: 'Gaz', zi: 16, suma: 150 },
  { nume: 'Apă', zi: 18, suma: 50 },
  { nume: 'Card de credit luna precedentă', zi: 25, suma: 2000 },
  { nume: 'Abonament mobil', zi: 30, suma: 50 },
  { nume: 'Abonament internet', zi: 30, suma: 80 },
];

/* Anul implicit din tabul Deflator din Excel. */
const DEF_YEAR_DEFAULT = 2001;

/* Cheile de localStorage se construiesc din id-ul elementului.
   În HTML toate inputurile vizibile au id de forma `tab-câmp` (ex. `timp-venit`),
   deci cheia este predictibilă — nu depindem de ordinea din DOM. */
function persistKeyFor(el) {
  return PERSIST_PREFIX + 'input:' + el.id;
}

function tableKey(name) {
  return PERSIST_PREFIX + 'table:' + name;
}

function isPersistable(el) {
  return Boolean(el && el.id && el.tagName !== 'BUTTON');
}

/* Tabelele dinamice: cheie de localStorage ↔ variabilă din aplicație. */
const PERSIST_TABLES = [
  { key: 'glitchcoin-table:cost', get: () => costRows, set: (rows) => { costRows = rows; } },
  { key: 'glitchcoin-table:nuam', get: () => nuamRows, set: (rows) => { nuamRows = rows; } },
];

function persistSaveNow() {
  try {
    document.querySelectorAll('input[id], select[id]').forEach((el) => {
      if (!isPersistable(el)) return;
      try { localStorage.setItem(persistKeyFor(el), el.value); } catch (e) { /* blocat */ }
    });
    PERSIST_TABLES.forEach(({ key, get }) => {
      try { localStorage.setItem(key, JSON.stringify(get())); } catch (e) { /* blocat */ }
    });
    try { localStorage.setItem('glitchcoin-tab', activeTabId()); } catch (e) { /* blocat */ }
  } catch (e) {
    // localStorage indisponibil — calculele merg mai departe, doar nu se rețin valorile
  }
}

function persistSave() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(persistSaveNow, PERSIST_DEBOUNCE_MS);
}

/* Aplică valorile salvate; ce lipsește revine la valorile implicite din HTML.
   Dacă stocarea e blocată, nu se atinge nicio cheie — rămân valorile din HTML. */
function persistRestore() {
  try {
    document.querySelectorAll('input[id], select[id]').forEach((el) => {
      if (!isPersistable(el)) return;
      try {
        const stored = localStorage.getItem(persistKeyFor(el));
        if (stored !== null) el.value = stored;
      } catch (e) { /* blocat */ }
    });
    PERSIST_TABLES.forEach(({ key, set }) => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) set(parsed);
      } catch (e) { /* blocat sau date corupte — rămân valorile implicite */ }
    });
  } catch (e) {
    // fără stocare locală: se folosesc valorile implicite din HTML/Excel
  }
}

function persistClear() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PERSIST_PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    // dacă stocarea e blocată, nu avem ce șterge
  }
}

/* ── Buton „Resetează tot" ───────────────────────────────── */

/* Revine la valorile implicite din Excel:
   • inputurile statice — `value="…"` din HTML (păstrat în `defaultValue`);
   • selectul Deflator — 2001 (valoarea din tabul sursă);
   • tabelele dinamice — listele de mai sus. */
function resetStaticInputs() {
  document.querySelectorAll('input[id], select[id]').forEach((el) => {
    if (!isPersistable(el)) return;
    if (el.tagName === 'SELECT') {
      // Doar Deflatorul are o valoare implicită specială (2001); celelalte
      // selecturi (ex. „Tipul de venit") revin la opțiunea marcată în HTML
      // prin `data-default` (corecție C3).
      el.value = el.id === 'def-year' ? String(DEF_YEAR_DEFAULT) : (el.dataset.default || el.defaultValue);
      return;
    }
    el.value = el.defaultValue; // valoarea din HTML (value="…") sau '' dacă lipsea
  });
}

function resetAll() {
  resetStaticInputs();

  costRows = COST_DEFAULTS.map((r) => ({ ...r }));
  renderCostRows();
  updateCostOutputs();

  nuamRows = NUAM_DEFAULTS.map((r) => ({ ...r }));
  renderNuamRows();
  updateNuamOutputs();

  // Toate taburile se recalculează cu noile valori.
  renderSimulator();
  renderDeflator();
  renderTimp();
  renderDobanda();
  renderCompusa();
  renderRandament();
  renderProfit();
  renderSuma();
  renderDi();
  renderRegula72();
  renderFond();
  renderOportunitate();
  renderBuget();
  renderSanatate();

  persistClear();       // „Resetează tot” = curăță și preferințele salvate
  persistSaveNow();     // pentru ca la refresh să revină la valorile implicite
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

/* Corecție C3 — impozitul pe tipuri de venit (România, 2025).
   Selectul „Tipul de venit" (taburile Randament și Profit) setează impozitul
   implicit; utilizatorul îl poate apoi modifica manual. Sunt rate reale,
   nu valori generice (10% supraestimează impozitul pentru acțiuni păstrate
   mai mult de un an prin broker românesc). */
const IMPOZIT_TIPURI = {
  'dobandi':     { rata: 10, eticheta: 'Dobândă (depozite, obligațiuni RO)' },
  'dividende':   { rata: 10, eticheta: 'Dividende' },
  'vm-ro':       { rata: 1,  eticheta: 'Valori mobiliere · broker RO · ≥ 1 an' },
  'vm-ro-scurt': { rata: 3,  eticheta: 'Valori mobiliere · broker RO · < 1 an' },
  'vm-strain':   { rata: 10, eticheta: 'Valori mobiliere · broker străin / crypto' },
};

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

const FOOD_YEARS = [2020, 2021, 2022, 2023, 2024, 2025, 2026];

/* Creștere 2025 vs 2020 — 2025 e ultimul an complet; 2026 e parțial. */
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
  const min = Math.min(...GLITCHCOIN_DATA.food.map(foodGrowth));
  const prodMax = GLITCHCOIN_DATA.food.find((p) => foodGrowth(p) === max);
  const prodMin = GLITCHCOIN_DATA.food.find((p) => foodGrowth(p) === min);
  const chart = document.getElementById('food-chart');
  chart.innerHTML = GLITCHCOIN_DATA.food.map((p) => {
    const growth = foodGrowth(p);
    const latime = (growth / max) * 100;
    return `
      <div class="bar-row">
        <span class="bar-label">${escapeHtml(p.name)}</span>
        <span class="bar-track" aria-hidden="true"><span class="bar-fill" style="width:${latime.toFixed(2)}%"></span></span>
        <span class="bar-value">${fmtPct(growth)}</span>
      </div>`;
  }).join('');
  chart.setAttribute('aria-label',
    `Creștere 2025 vs 2020, pe produs. Maxim: ${fmtPct(max)} la ${prodMax.name}; minim: ${fmtPct(min)} la ${prodMin.name}.`);
}

/* ═══ 3. Inflația 1991–2026 ═════════════════════════════ */

function renderInflationChart(range = 'all') {
  const date = GLITCHCOIN_DATA.inflation.filter((d) => (range === 'recent' ? d.year >= 2000 : true));
  const maxAbs = Math.max(...date.map((d) => Math.abs(d.rate)));
  const labelMod = range === 'recent' ? 0 : 1; // 1991, 1996, … / 2000, 2005, …

  const chart = document.getElementById('inflation-chart');
  chart.innerHTML = date.map((d) => {
    const pozitiv = d.rate >= 0;
    const inaltime = (Math.abs(d.rate) / maxAbs) * 100;
    const bara = `<div class="vbar ${pozitiv ? 'vbar-pos' : 'vbar-neg'}" aria-hidden="true" style="height:${inaltime.toFixed(2)}%"></div>`;
    const eticheta = d.year % 5 === labelMod ? d.year : '';
    return `
      <div class="vcol" title="${d.year}: ${fmtPct(d.rate)}">
        <div class="vhalf vhalf-top">${pozitiv ? bara : ''}</div>
        <div class="vzero" aria-hidden="true"></div>
        <div class="vhalf vhalf-bot">${pozitiv ? '' : bara}</div>
        <div class="vlabel">${eticheta}</div>
      </div>`;
  }).join('');

  // Eticheta sumară (ARIA) reflectă intervalul afișat, nu întregul 1991–2026.
  const chartMax = date.reduce((a, b) => (b.rate > a.rate ? b : a));
  const chartMin = date.reduce((a, b) => (b.rate < a.rate ? b : a));
  const chartMedie = date.reduce((a, b) => a + b.rate, 0) / date.length;
  chart.setAttribute('aria-label',
    `Inflație anuală ${date[0].year}–${date[date.length - 1].year}. Maxim: ${fmtPct(chartMax.rate)} în ${chartMax.year}; ` +
    `minim: ${fmtPct(chartMin.rate)} în ${chartMin.year}; medie: ${fmtPct(chartMedie)}.`);

  const rate = GLITCHCOIN_DATA.inflation.map((d) => d.rate);
  const medie = rate.reduce((a, b) => a + b, 0) / rate.length;
  const maxim = GLITCHCOIN_DATA.inflation.reduce((a, b) => (b.rate > a.rate ? b : a));
  const minim = GLITCHCOIN_DATA.inflation.reduce((a, b) => (b.rate < a.rate ? b : a));
  const deflatie = GLITCHCOIN_DATA.inflation.filter((d) => d.rate < 0).map((d) => d.year).join(', ');

  const anPrim = GLITCHCOIN_DATA.inflation[0].year;
  const anUltim = GLITCHCOIN_DATA.inflation[GLITCHCOIN_DATA.inflation.length - 1].year;
  document.getElementById('inflation-stats').innerHTML = `
    <span>Medie ${anPrim}–${anUltim}: <strong>${fmtPct(medie)}</strong></span>
    <span>Maxim: <strong>${fmtPct(maxim.rate)}</strong> (${maxim.year})</span>
    <span>Minim: <strong>${fmtPct(minim.rate)}</strong> (${minim.year})</span>
    <span>Ani cu deflație: <strong>${deflatie}</strong></span>`;

  document.getElementById('inflation-table-body').innerHTML = GLITCHCOIN_DATA.inflation.map((d) => `
    <tr${d.rate < 0 ? ' class="is-neg"' : ''}>
      <td>${d.year}${d.partial ? ' *' : ''}</td>
      <td class="num">${fmtPct(d.rate)}</td>
    </tr>`).join('');
}

/* ═══ 4. Deflatorul sumelor ═════════════════════════════ */

/* Echivalentul în anul `an` al unei sume din AN_CURENT.
   Convenția INS: rata anuală a anului y = media anului y vs media anului y−1,
   deci pentru a aduce o sumă din AN_CURENT în anul `an` se înmulțește cu ratelor
   anuale de la `an+1` până la AN_CURENT.
   (Corecție C2: anterior se lua și rata anului `an`, ceea ce decala rezultatul
   cu un an — rândul 2024 arăta echivalentul din 2023.) */
function deflatorValue(suma, an) {
  let produs = 1;
  for (let y = an + 1; y <= AN_CURENT; y++) {
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

/* Constantele din tabul „Timp vs dorințe" din Excel.
   Corecții C5 și C11: 248 de zile lucrătoare (România 2025) și 30,44 zile/lună
   (365 ÷ 12), în loc de convenția SUA de 261 și de „31 zile/lună".
   Din 2026-11-13 numărul de zile lucrătoare e un INPUT (cerință Narcis): utilizatorul
   îl poate schimba, iar valoarea implicită rămâne 248. */
const TIMP_ZILE_LUNA = 365 / 12;     // 30,44 — media reală de zile pe lună (365/12)
const TIMP_LUNI_AN = 12;             // luni într-un an (venitul anual = 12 × venitul lunar)
const TIMP_ORE_ZI = 24;              // venitul pe oră = venit pe zi / 24
const TIMP_MINUTE_ORA = 60;          // venitul pe minut = venit pe oră / 60
const TIMP_ORE_LUCRATOARE = 8;       // venitul pe oră lucrătoare = zi lucrătoare / 8
const TIMP_ZILE_AN = 365;            // zile într-un an calendaristic
const TIMP_ZILE_LUCRATOARE_AN_DEFAULT = 248; // România 2025: 365 − 104 weekend − 13 sărbători legale

/* Zilele lucrătoare dintr-un an se citesc din inputul „Zile lucrătoare / an".
   Orice valoare invalidă, nulă sau negativă revine la 248 — altfel am împărți la zero. */
function zileLucratoareAn() {
  const el = document.getElementById('timp-zile-lucratore');
  if (!el) return TIMP_ZILE_LUCRATOARE_AN_DEFAULT;
  const value = parseFloat(el.value);
  return Number.isFinite(value) && value > 0 ? value : TIMP_ZILE_LUCRATOARE_AN_DEFAULT;
}

function computeTimp(venit, pret, zileLucratoareAn = TIMP_ZILE_LUCRATOARE_AN_DEFAULT) {
  const venitZi = venit / TIMP_ZILE_LUNA;
  const venitOra = venitZi / TIMP_ORE_ZI;
  const venitMinut = venitOra / TIMP_MINUTE_ORA;
  // Zilele lucrătoare dintr-o lună se derivă din cele anuale, la fel ca zilele calendaristice
  // (365/12): 248/12 = 20,67. Venitul pe zi lucrătoare = venitul anual lucrător ÷ zilele
  // lucrătoare din an. (Un divisor fix de 20 ar presupune 240 de zile lucrătoare, nu 248.)
  const venitZiLucr = venit * TIMP_LUNI_AN / zileLucratoareAn;
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
    pctAnLucrator: (pret / venitZiLucr) / zileLucratoareAn,
  };
}

function renderTimp() {
  const venit = Math.max(0, readNumber(document.getElementById('timp-venit')));
  const pret = Math.max(0, readNumber(document.getElementById('timp-pret')));
  const zileAn = zileLucratoareAn();

  const ids = [
    'timp-venit-zi', 'timp-venit-ora', 'timp-venit-minut',
    'timp-venit-ziluc', 'timp-venit-oraluc',
    'timp-minute', 'timp-ore', 'timp-zile', 'timp-oreluc', 'timp-zileluc',
    'timp-tabel-zile', 'timp-tabel-pct', 'timp-tabel-zileluc', 'timp-tabel-pctluc',
  ];
  const summary = document.getElementById('timp-summary');

  // Numărul de zile lucrătoare (și echivalentul pe lună) se afișează indiferent de venit,
  // ca să nu rămână 248 dacă utilizatorul a setat altă valoare.
  const zilePeLuna = zileAn / TIMP_LUNI_AN;
  document.getElementById('timp-venit-ziluc-div').textContent =
    zilePeLuna.toLocaleString(LOCALE, { maximumFractionDigits: 2 });
  document.getElementById('timp-tabel-zileanluc').textContent =
    zileAn.toLocaleString(LOCALE, { maximumFractionDigits: 2 });
  document.getElementById('timp-note-zile').textContent =
    zileAn.toLocaleString(LOCALE, { maximumFractionDigits: 2 });
  document.getElementById('timp-note-zile-luna').textContent =
    zilePeLuna.toLocaleString(LOCALE, { maximumFractionDigits: 2 });

  if (venit <= 0) {
    for (const id of ids) document.getElementById(id).textContent = '—';
    summary.textContent = 'Introdu un venit lunar mai mare decât zero pentru a vedea cât timp muncești pentru dorință.';
    return;
  }

  const r = computeTimp(venit, pret, zileAn);

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
      `Pentru <strong>${fmtLei(suma)}</strong> la <strong>${fmtPctSmart(rata)}</strong> pe <strong>${fmtInt(zile)} de zile</strong>, ` +
      `dobânda brută e <strong>${fmtLei(brut)}</strong>, iar după impozitul de <strong>${fmtPctSmart(impozit)}</strong> ` +
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
  let precedentTotala = suma;
  for (let an = 0; an <= COMP_ANI; an++) {
    // Corecție C9: contribuția e lunară, deci după `an` ani ai investit
    // suma + 12 × contribuție × an. Se păstrează aceeași bază pentru
    // totalul investit și pentru dobândă (compusă lunar) — cele două
    // coloane sunt consistente (nu se amestecă contribuție anuală cu
    // compunere lunară).
    const sumaInvestita = an === 0 ? suma : suma + contributie * COMP_LUNI_AN * an;

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
      // Corecție C8: creștere anuală reală = suma totală față de suma totală
      // din anul precedent (anterior se raporta la principalul investit,
      // ceea ce dava 41,5% în loc de creșterea reală de ~5,8%).
      crestere: an >= 2 ? sumaTotala / precedentTotala - 1 : null,
    });
    precedentTotala = sumaTotala;
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
    `După impozitul de <strong>${fmtPctSmart(impozit)}</strong> și comisioanele de <strong>${fmtPctSmart(comisioane)}</strong> ` +
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
  // Corecție C10: pierderea nu se impozitează. Dacă brut < 0, net = brut —
  // în România pierderile nu generează „impozit negativ" și nu se compensează
  // automat cu câștigurile. (Anterior net devenea mai mare decât brut.)
  const net = brut < 0 ? brut : brut - (brut * impozit + brut * comisioane);
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
      `(după impozitul de <strong>${fmtPctSmart(impozit)}</strong> și comisioanele de <strong>${fmtPctSmart(comisioane)}</strong>). ` +
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

/* Valorile implicite din tabul „Costul mediu" din Excel (comisionul e fractie, nu procent).
   Se initializează din COST_DEFAULTS (mai sus), ca să existe o singură sursă pentru reset. */
const COST_ROWS_DEFAULT = COST_DEFAULTS;

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
    persistSave();
  });

  document.getElementById('cost-add').addEventListener('click', () => {
    costRows.push({ pret: 0, cantitate: 0, comision: 0.02 });
    renderCostRows();
    updateCostOutputs();
    persistSave();
    const trs = tbody.querySelectorAll('tr');
    const input = trs[trs.length - 1] && trs[trs.length - 1].querySelector('input[data-field="pret"]');
    if (input) input.focus();
  });

  document.getElementById('cost-reset').addEventListener('click', () => {
    costRows = COST_DEFAULTS.map((r) => ({ ...r }));
    renderCostRows();
    updateCostOutputs();
    persistSave();
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

/* Valorile implicite din tabul „Nu am bani" din Excel.
   Se initializează din NUAM_DEFAULTS (mai sus), ca să existe o singură sursă pentru reset. */
const NUAM_ROWS_DEFAULT = NUAM_DEFAULTS;

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

  // Corecție C1: banii din contul de economii fac dobândă, deci la finalul
  // lunii rămâi cu MAI MULȚI bani decât fără CE. Semnul a fost invertat
  // (cheltuitFaraCE − profit), contrazicând desfășuratorul zilnic.
  const cheltuitCuCE = cheltuitFaraCE + profit;
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
    persistSave();
  });

  document.getElementById('nuam-add').addEventListener('click', () => {
    nuamRows.push({ nume: '', zi: 1, suma: 0 });
    renderNuamRows();
    updateNuamOutputs();
    persistSave();
    const trs = tbody.querySelectorAll('tr');
    const input = trs[trs.length - 1] && trs[trs.length - 1].querySelector('input[data-field="nume"]');
    if (input) input.focus();
  });

  document.getElementById('nuam-reset').addEventListener('click', () => {
    nuamRows = NUAM_DEFAULTS.map((r) => ({ ...r }));
    renderNuamRows();
    updateNuamOutputs();
    persistSave();
  });

  ['nuam-venit', 'nuam-zi', 'nuam-inflatie', 'nuam-economii', 'nuam-rata']
    .forEach((id) => document.getElementById(id).addEventListener('input', updateNuamOutputs));
}

/* ═══ 13. Dobânda vs inflație (N4) ═══════════════════════════ */

const DI_ANI_START = 2000;
const DI_ANI_END = 2025;

/* Randamentul real pe un an — formula exactă (Fisher):
     (1 + randament nominal) ÷ (1 + inflație) − 1
   Aproximația „nominal − inflație” e mai intuitivă, dar deviază
   (mai ales la rate mari). Se afișează ambele, ca să se vadă diferența. */
function computeRandamentReal(suma, nominal, inflatie) {
  const realExact = (1 + nominal) / (1 + inflatie) - 1;
  const realAproximat = nominal - inflatie;
  return {
    nominal,
    inflatie,
    crestereNominala: suma * nominal,
    realExact,
    realAproximat,
    diferenta: realExact - realAproximat,
    valoareNominala: suma * (1 + nominal),
    valoareReala: suma * (1 + realExact),
  };
}

/* Seria istorică 2000–2025 (INS, IPC național) aplicată unei rate
   nominale constante: arată de ce un depozit „sigur” poate fi
   negativ real — banii cresc nominal, dar prețurile cresc mai repede. */
function computeIstoricReal(nominal, suma) {
  const ani = GLITCHCOIN_DATA.inflation.filter((d) => d.year >= DI_ANI_START && d.year <= DI_ANI_END);
  let produsInflatie = 1;
  const rows = ani.map((d) => {
    produsInflatie *= 1 + d.rate;
    return { an: d.year, inflatie: d.rate, real: (1 + nominal) / (1 + d.rate) - 1 };
  });

  const medie = rows.reduce((a, b) => a + b.real, 0) / rows.length;
  const minim = rows.reduce((a, b) => (b.real < a.real ? b : a));
  const maxim = rows.reduce((a, b) => (b.real > a.real ? b : a));
  const numarNegativi = rows.filter((r) => r.real < 0).length;

  // Suma din 2000 adusă în 2025: cash-ul își pierde puterea de cumpărare
  // cu produsul inflației; la randament nominal compus, crește cu
  // (1 + nominal)^număr de ani, apoi se aduce la puterea de cumpărare din 2025.
  const cashReal = suma / produsInflatie;
  const investitReal = suma * Math.pow(1 + nominal, ani.length) / produsInflatie;

  return {
    rows,
    produsInflatie,
    medie,
    minim,
    maxim,
    numarNegativi,
    cashReal,
    investitReal,
    diferenta: investitReal - cashReal,
  };
}

function renderDi() {
  const suma = Math.max(0, readNumber(document.getElementById('di-suma')));
  const nominal = readNumber(document.getElementById('di-randament')) / 100;
  const inflatie = Math.max(-0.99, readNumber(document.getElementById('di-inflatie'))) / 100;

  const r = computeRandamentReal(suma, nominal, inflatie);
  const istoric = computeIstoricReal(nominal, suma);

  document.getElementById('di-brut').textContent = fmtLei(r.crestereNominala);
  document.getElementById('di-real').textContent = fmtPct(r.realExact);
  document.getElementById('di-valoare-reala').textContent = fmtLei(r.valoareReala);
  document.getElementById('di-aprox').textContent = fmtPct(r.realAproximat);
  paintSign('di-real', r.realExact);
  paintSign('di-aprox', r.realAproximat);

  document.getElementById('di-tabel-nominal-pct').textContent = fmtPct(r.nominal);
  document.getElementById('di-tabel-nominal-lei').textContent = fmtLei(r.crestereNominala);
  document.getElementById('di-tabel-real-pct').textContent = fmtPct(r.realExact);
  document.getElementById('di-tabel-real-lei').textContent = fmtLei(suma * r.realExact);
  document.getElementById('di-tabel-aprox-pct').textContent = fmtPct(r.realAproximat);
  document.getElementById('di-tabel-aprox-lei').textContent = fmtLei(suma * r.realAproximat);

  document.getElementById('di-istoric-body').innerHTML = istoric.rows.map((row) => `
    <tr${row.real < 0 ? ' class="is-neg"' : ''}>
      <td>${row.an}</td>
      <td class="num">${fmtPct(row.inflatie)}</td>
      <td class="num strong">${fmtPct(row.real)}</td>
    </tr>`).join('');

  document.getElementById('di-istoric-stats').innerHTML = `
    <span>Medie reală ${DI_ANI_START}–${DI_ANI_END}: <strong>${fmtPct(istoric.medie)}</strong></span>
    <span>Minim: <strong>${fmtPct(istoric.minim.real)}</strong> (${istoric.minim.an})</span>
    <span>Maxim: <strong>${fmtPct(istoric.maxim.real)}</strong> (${istoric.maxim.an})</span>
    <span>Ani cu randament real negativ: <strong>${istoric.numarNegativi}</strong> din ${istoric.rows.length}</span>`;

  document.getElementById('di-cash-real').textContent = fmtLei(istoric.cashReal);
  document.getElementById('di-investit-real').textContent = fmtLei(istoric.investitReal);
  document.getElementById('di-diferenta').textContent = fmtLei(istoric.diferenta);
  paintSign('di-diferenta', istoric.diferenta);

  const summary = document.getElementById('di-summary');
  if (suma <= 0) {
    summary.textContent = 'Introdu o sumă investită mai mare decât zero pentru a vedea rezultatele.';
    return;
  }
  summary.innerHTML =
    `Cu <strong>${fmtLei(suma)}</strong> la <strong>${fmtPct(nominal)}</strong>, după 1 an ai nominal ` +
    `<strong>${fmtLei(r.valoareNominala)}</strong>, dar inflația de <strong>${fmtPct(inflatie)}</strong> ` +
    `reduce puterea de cumpărare la <strong>${fmtLei(r.valoareReala)}</strong> — randamentul real e ` +
    `<strong>${fmtPct(r.realExact)}</strong>. Aproximația rapidă (nominal − inflație) dă ` +
    `<strong>${fmtPct(r.realAproximat)}</strong>; diferența e de <strong>${fmtPct(Math.abs(r.diferenta))}</strong>.`;
}

/* ═══ 14. Regula 72 (N10) ═══════════════════════════════════ */

/* Regula 72: anii până la dublare ≈ 72 ÷ rată (în procente).
   Versiunea exactă, din compunerea anuală: ln 2 ÷ ln(1 + rată). */
const R72_PRESETS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15];

function computeRegula72(rata, suma) {
  if (rata <= 0) return null;
  const aniRegola = 72 / rata;
  const aniExact = Math.log(2) / Math.log(1 + rata / 100);
  return { rata, suma, aniRegola, aniExact, diferenta: aniRegola - aniExact, dublu: suma * 2 };
}

/* Invers: ce rată anuală dublează banii în `ani` ani?
   Exact: 2^(1/ani) − 1; regula 72: 72 ÷ ani. */
function computeDublareInAni(ani) {
  if (ani <= 0) return null;
  return {
    ani,
    rataRegola: 72 / ani,
    rataExacta: (Math.pow(2, 1 / ani) - 1) * 100,
  };
}

/* Ani, cu singular/plural coerent: „1 an”, „10,24 ani”. */
function fmtAni(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const text = value.toLocaleString(LOCALE, { maximumFractionDigits: 2 });
  const aproapeDeUn = Math.abs(value - 1) < 0.005;
  return text + (aproapeDeUn ? ' an' : ' ani');
}

function renderRegula72() {
  const rata = readNumber(document.getElementById('r72-rata'));
  const suma = Math.max(0, readNumber(document.getElementById('r72-suma')));
  const ani = readNumber(document.getElementById('r72-ani'));

  const r = computeRegula72(rata, suma);
  const inv = computeDublareInAni(ani);

  const summary = document.getElementById('r72-summary');
  if (r) {
    document.getElementById('r72-ani-regola').textContent = fmtAni(r.aniRegola);
    document.getElementById('r72-ani-exact').textContent = fmtAni(r.aniExact);
    document.getElementById('r72-diferenta').textContent = fmtAni(Math.abs(r.diferenta));
    document.getElementById('r72-dublu').textContent = fmtLei(r.dublu);
    summary.innerHTML =
      `La <strong>${fmtPctSmart(rata / 100)}</strong> pe an, banii se dublează în ` +
      `<strong>${fmtAni(r.aniRegola)}</strong> (regula 72) — compunerea exactă dă ` +
      `<strong>${fmtAni(r.aniExact)}</strong>. Diferența e de <strong>${fmtAni(Math.abs(r.diferenta))}</strong>. ` +
      `<strong>${fmtLei(suma)}</strong> devin <strong>${fmtLei(r.dublu)}</strong>.`;
  } else {
    for (const id of ['r72-ani-regola', 'r72-ani-exact', 'r72-diferenta']) {
      document.getElementById(id).textContent = '—';
    }
    document.getElementById('r72-dublu').textContent = '—';
    summary.textContent = 'Introdu o rată mai mare decât zero pentru a calcula dublarea (la rate negative banii se micșorează).';
  }

  document.getElementById('r72-rata-regola').textContent = inv ? fmtPct(inv.rataRegola / 100, 2) : '—';
  document.getElementById('r72-rata-exacta').textContent = inv ? fmtPct(inv.rataExacta / 100, 2) : '—';

  const maxAni = 72 / Math.min(...R72_PRESETS);
  const chart = document.getElementById('r72-chart');
  chart.innerHTML = R72_PRESETS.map((p) => {
    const aniP = 72 / p;
    const latime = (aniP / maxAni) * 100;
    return `
      <div class="bar-row">
        <span class="bar-label">${p}%</span>
        <span class="bar-track" aria-hidden="true"><span class="bar-fill" style="width:${latime.toFixed(2)}%"></span></span>
        <span class="bar-value">${fmtAni(aniP)}</span>
      </div>`;
  }).join('');
  chart.setAttribute('aria-label',
    `Ani până la dublare pentru rate de la ${R72_PRESETS[0]}% la ${R72_PRESETS[R72_PRESETS.length - 1]}%. ` +
    `De la ${fmtAni(maxAni)} la ${fmtAni(72 / R72_PRESETS[R72_PRESETS.length - 1])}.`);

  document.getElementById('r72-table-body').innerHTML = R72_PRESETS.map((p) => {
    const aniRegola = 72 / p;
    const aniExact = Math.log(2) / Math.log(1 + p / 100);
    return `
      <tr>
        <td class="num">${fmtPctSmart(p / 100)}</td>
        <td class="num">${fmtAni(aniRegola)}</td>
        <td class="num">${fmtAni(aniExact)}</td>
        <td class="num">${fmtAni(Math.abs(aniRegola - aniExact))}</td>
      </tr>`;
  }).join('');
}

/* ═══ 15. Fond de urgență (N1) ═══════════════════════════════ */

/* Intervalul recomandat: 3–6 luni de cheltuieli esențiale.
   Valoarea implicită a selectului „Perioada acoperită”. */
const FU_LUNI = [3, 4, 5, 6];
const FU_LUNI_DEFAULT = 6;

/* Economia lunară necesară pentru a ajunge de la `sumaActuala` la `tinta`
   în `luni` luni, cu dobânda lunară `rata / 12`:
     tinta = sumaActuala × (1+r)^n + economia × ((1+r)^n − 1) / r
   (când r = 0, economia = (tinta − sumaActuala) / n). */
function economieNecesara(sumaActuala, tinta, rata, luni) {
  if (luni <= 0) return null;
  const r = rata / 12;
  if (r === 0) return (tinta - sumaActuala) / luni;
  const putere = Math.pow(1 + r, luni);
  return (tinta - sumaActuala * putere) * r / (putere - 1);
}

/* Numărul de luni până la țintă, plecând de la `sumaActuala` cu o
   economia lunară fixă:
     n = ln((tinta×r + economia) ÷ (sumaActuala×r + economia)) ÷ ln(1+r)
   Returnează null dacă ținta nu se atinge (economie ≤ 0). */
function timpPanaLaTinta(sumaActuala, economie, rata, tinta) {
  if (tinta <= 0) return 0;
  if (sumaActuala >= tinta) return 0;
  if (economie <= 0) return null;
  const r = rata / 12;
  if (r === 0) return (tinta - sumaActuala) / economie;
  const numarator = tinta * r + economie;
  const numitor = sumaActuala * r + economie;
  if (numarator <= 0 || numitor <= 0) return null;
  return Math.log(numarator / numitor) / Math.log(1 + r);
}

function computeFond(cheltuieli, luni, rata, impozit, sumaActuala, economie) {
  const tinta = cheltuieli * luni;
  const dobandaBrut = tinta * rata;
  const dobandaNet = dobandaBrut * (1 - impozit);
  return {
    tinta,
    dobandaBrut,
    dobandaNet,
    economieNecesara: economieNecesara(sumaActuala, tinta, rata, luni),
    timpLuni: timpPanaLaTinta(sumaActuala, economie, rata, tinta),
  };
}

/* Luni → text: „45 luni” sau „45 de luni (~3,8 ani)”. */
function fmtLuni(luni) {
  if (luni === null || luni === undefined || !Number.isFinite(luni)) return '—';
  const rotunjit = Math.ceil(luni);
  if (rotunjit < 12) {
    return rotunjit.toLocaleString(LOCALE) + (rotunjit === 1 ? ' lună' : ' luni');
  }
  const ani = luni / 12;
  const aniTxt = ani.toLocaleString(LOCALE, { maximumFractionDigits: 1 });
  return `${rotunjit.toLocaleString(LOCALE)} de luni (~${aniTxt} ${Math.abs(ani - 1) < 0.05 ? 'an' : 'ani'})`;
}

function renderFond() {
  const cheltuieli = Math.max(0, readNumber(document.getElementById('fu-cheltuieli')));
  const luniSelect = document.getElementById('fu-luni');
  const luni = parseInt(luniSelect.value, 10) || FU_LUNI_DEFAULT;
  const rata = Math.max(0, readNumber(document.getElementById('fu-dobanda'))) / 100;
  const impozit = Math.min(1, Math.max(0, readNumber(document.getElementById('fu-impozit')) / 100));
  const sumaActuala = Math.max(0, readNumber(document.getElementById('fu-suma')));
  const economie = Math.max(0, readNumber(document.getElementById('fu-economie')));

  const r = computeFond(cheltuieli, luni, rata, impozit, sumaActuala, economie);

  document.getElementById('fu-tinta').textContent = fmtLei(r.tinta);
  document.getElementById('fu-dobanda-net').textContent = fmtLei(r.dobandaNet);
  document.getElementById('fu-dobanda-brut').textContent = fmtLei(r.dobandaBrut);
  document.getElementById('fu-economie-necesara').textContent =
    r.economieNecesara === null || r.economieNecesara <= 0 ? 'ținta e acoperită' : fmtLei(r.economieNecesara);
  document.getElementById('fu-timp').textContent = fmtLuni(r.timpLuni);

  const summary = document.getElementById('fu-summary');
  if (cheltuieli <= 0) {
    summary.textContent = 'Introdu cheltuielile lunare esențiale pentru a calcula fondul de urgență.';
    return;
  }
  if (r.tinta <= sumaActuala) {
    summary.innerHTML =
      `Ținta fondului e <strong>${fmtLei(r.tinta)}</strong> (${luni} luni × ${fmtLei(cheltuieli)}) — ` +
      `suma deja acumulată (<strong>${fmtLei(sumaActuala)}</strong>) o acoperă.`;
    return;
  }
  summary.innerHTML =
    `Ținta fondului e <strong>${fmtLei(r.tinta)}</strong> (${luni} luni × ${fmtLei(cheltuieli)}). ` +
    `Cu <strong>${fmtLei(economie)}</strong> pe lună ajungi în <strong>${fmtLuni(r.timpLuni)}</strong>; ` +
    `pentru a ajunge în ${luni} luni ai avea nevoie de ` +
    `<strong>${r.economieNecesara === null || r.economieNecesara <= 0 ? '—' : fmtLei(r.economieNecesara)}</strong> pe lună. ` +
    `Dobânda netă pe un an e <strong>${fmtLei(r.dobandaNet)}</strong>.`;
}

/* ═══ 16. Costul oportunității (N5) ═════════════════════════ */

/* Compară două opțiuni pentru aceeași sumă:
     • cash — rămâne neschimbat nominal, dar inflația erodează puterea de cumpărare;
     • investiție — randament net compus anual (nominal − impozit − comisioane).
   Costul oportunității = diferența dintre cea mai bună opțiune și cea aleasă,
   exprimată în putere de cumpărare (valori reale). */
function computeOportunitate(suma, ani, randament, impozit, comisioane, inflatie) {
  const rNet = randament * (1 - impozit - comisioane);
  const cashNominal = suma;
  const investitNominal = suma * Math.pow(1 + rNet, ani);
  const factorInfl = Math.pow(1 + inflatie, ani);
  const cashReal = factorInfl > 0 ? cashNominal / factorInfl : null;
  const investitReal = factorInfl > 0 ? investitNominal / factorInfl : null;
  const costCash = cashReal !== null && investitReal !== null ? Math.max(0, investitReal - cashReal) : null;
  return { rNet, cashNominal, investitNominal, cashReal, investitReal, costCash };
}

function renderOportunitate() {
  const suma = Math.max(0, readNumber(document.getElementById('co-suma')));
  const ani = Math.max(0, readNumber(document.getElementById('co-ani')));
  const randament = Math.max(0, readNumber(document.getElementById('co-randament'))) / 100;
  const impozit = Math.min(1, Math.max(0, readNumber(document.getElementById('co-impozit')) / 100));
  const comisioane = Math.min(1, Math.max(0, readNumber(document.getElementById('co-comisioane')) / 100));
  const inflatie = Math.max(-0.99, readNumber(document.getElementById('co-inflatie'))) / 100;

  const r = computeOportunitate(suma, ani, randament, impozit, comisioane, inflatie);

  document.getElementById('co-cash-nominal').textContent = fmtLei(r.cashNominal);
  document.getElementById('co-investit-nominal').textContent = fmtLei(r.investitNominal);
  document.getElementById('co-cash-real').textContent = r.cashReal === null ? '—' : fmtLei(r.cashReal);
  document.getElementById('co-investit-real').textContent = r.investitReal === null ? '—' : fmtLei(r.investitReal);
  document.getElementById('co-cost').textContent = r.costCash === null ? '—' : fmtLei(r.costCash);
  paintSign('co-cost', r.costCash);
  paintSign('co-investit-real', r.investitReal);

  // Costul oportunității al fiecărei opțiuni față de cea mai bună.
  const costInvestit = (r.cashReal !== null && r.investitReal !== null && r.cashReal > r.investitReal)
    ? r.cashReal - r.investitReal : 0;

  document.getElementById('co-tabel-rnet').textContent = fmtPctSmart(r.rNet);
  document.getElementById('co-tabel-cash-nominal').textContent = fmtLei(r.cashNominal);
  document.getElementById('co-tabel-cash-real').textContent = r.cashReal === null ? '—' : fmtLei(r.cashReal);
  document.getElementById('co-tabel-cash-cost').textContent =
    r.costCash === null ? '—' : (r.costCash > 0 ? fmtLei(r.costCash) : 'cea mai bună opțiune');
  document.getElementById('co-tabel-investit-nominal').textContent = fmtLei(r.investitNominal);
  document.getElementById('co-tabel-investit-real').textContent = r.investitReal === null ? '—' : fmtLei(r.investitReal);
  document.getElementById('co-tabel-investit-cost').textContent =
    costInvestit > 0 ? fmtLei(costInvestit) : 'cea mai bună opțiune';

  const summary = document.getElementById('co-summary');
  if (suma <= 0 || ani <= 0) {
    summary.textContent = 'Introdu o sumă și o durată mai mari decât zero pentru a compara opțiunile.';
    return;
  }
  if (r.costCash === null) {
    summary.textContent = 'Nu pot calcula costul oportunității cu valorile introduse.';
    return;
  }
  if (r.costCash === 0) {
    summary.innerHTML =
      `După <strong>${ani} ani</strong>, cash-ul încă are puterea de cumpărare cea mai mare ` +
      `(<strong>${fmtLei(r.cashReal)}</strong>): randamentul net (<strong>${fmtPctSmart(r.rNet)}</strong>) ` +
      `nu depășește inflația. În acest scenariu, costul oportunității al cash-ului e zero.`;
    return;
  }
  summary.innerHTML =
    `După <strong>${ani} ani</strong>, cash-ul valorează <strong>${fmtLei(r.cashReal)}</strong> în putere de cumpărare, ` +
    `iar investiția <strong>${fmtLei(r.investitReal)}</strong>. Alegând cash-ul, plătești un cost de oportunitate de ` +
    `<strong>${fmtLei(r.costCash)}</strong> — aceasta e partea pe care inflația și lipsa randamentului o erodează.`;
}

/* ═══ 17. Buget personal 50/30/20 (N2) ══════════════════ */

const BG_TARGETE = { nevoi: 0.5, dorinte: 0.3, economii: 0.2 };

/* Număr fără „lei"/„%”, cu „—” pentru valori nedefinite. */
function fmtNum(value, decimals = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return value.toLocaleString(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/* Procent „sigur”: nu aruncă excepție dacă valoarea e nulă/nedefinită. */
function fmtPctSafe(fraction, decimals = 2) {
  if (fraction === null || fraction === undefined || !Number.isFinite(fraction)) return '—';
  return fmtPct(fraction, decimals);
}

/* Abaterea față de țintă, în text: „peste țintă cu X lei” / „sub țintă cu X lei”. */
function fmtDeviereLei(valoare) {
  if (valoare === null || valoare === undefined || !Number.isFinite(valoare)) return '—';
  if (Math.abs(valoare) < 0.005) return 'la țintă';
  return valoare > 0
    ? 'peste țintă cu ' + fmtLei(valoare)
    : 'sub țintă cu ' + fmtLei(-valoare);
}

/* Regula 50/30/20: venitul lunar net se repartizează pe nevoi, dorințe, economii.
   Returnează țintele, procentele reale, abaterile și alarmele bugetului.
   `zileLucratoareAn` vine din inputul tabului „Timp vs dorințe” (aceeași sursă). */
function computeBuget(venit, nevoi, dorinte, economii, zileLucratoareAn = TIMP_ZILE_LUCRATOARE_AN_DEFAULT) {
  const total = nevoi + dorinte + economii;
  const tinta = {
    nevoi: venit * BG_TARGETE.nevoi,
    dorinte: venit * BG_TARGETE.dorinte,
    economii: venit * BG_TARGETE.economii,
  };
  const procent = venit > 0
    ? { nevoi: nevoi / venit, dorinte: dorinte / venit, economii: economii / venit, total: total / venit }
    : { nevoi: null, dorinte: null, economii: null, total: null };
  const deviere = {
    nevoi: nevoi - tinta.nevoi,
    dorinte: dorinte - tinta.dorinte,
    economii: economii - tinta.economii,
    total: total - venit,
  };
  const venitZiLucr = venit > 0 && zileLucratoareAn > 0
    ? venit * TIMP_LUNI_AN / zileLucratoareAn
    : null;
  const zileLucrate = (suma) => (venitZiLucr !== null && venitZiLucr > 0 ? suma / venitZiLucr : null);

  const alertes = [];
  if (venit <= 0) {
    alertes.push({
      nivel: 'warn',
      text: 'Introdu un venit lunar net mai mare decât zero pentru a compara cu regula 50/30/20.',
    });
  } else {
    if (total > venit) {
      alertes.push({
        nivel: 'bad',
        text: `Venitul nu acoperă cheltuielile: deficit de ${fmtLei(total - venit)} pe lună.`,
      });
    }
    if (procent.nevoi > BG_TARGETE.nevoi) {
      alertes.push({
        nivel: 'warn',
        text: `Nevoi: ${fmtPct(procent.nevoi)} din venit — peste ținta de 50% cu ${fmtLei(deviere.nevoi)} pe lună.`,
      });
    }
    if (procent.dorinte > BG_TARGETE.dorinte) {
      alertes.push({
        nivel: 'warn',
        text: `Dorințe: ${fmtPct(procent.dorinte)} din venit — peste ținta de 30% cu ${fmtLei(deviere.dorinte)} pe lună.`,
      });
    }
    if (procent.economii < BG_TARGETE.economii) {
      alertes.push({
        nivel: procent.economii < 0.1 ? 'bad' : 'warn',
        text: `Economii: ${fmtPct(procent.economii)} din venit — sub ținta de 20% cu ${fmtLei(tinta.economii - economii)} pe lună.`,
      });
    }
    if (alertes.length === 0) {
      alertes.push({ nivel: 'ok', text: 'Buget echilibrat: respecți regula 50/30/20.' });
    }
  }

  return {
    total,
    tinta,
    procent,
    deviere,
    ramas: venit - total,
    venitZiLucr,
    zileLucrateDorinte: zileLucrate(dorinte),
    zileLucrateEconomii: zileLucrate(economii),
    oreLucrateDorinte: venitZiLucr !== null && venitZiLucr > 0
      ? (dorinte / venitZiLucr) * TIMP_ORE_LUCRATOARE
      : null,
    alertes,
  };
}

function renderBuget() {
  const venit = Math.max(0, readNumber(document.getElementById('bg-venit')));
  const nevoi = Math.max(0, readNumber(document.getElementById('bg-nevoi')));
  const dorinte = Math.max(0, readNumber(document.getElementById('bg-dorinte')));
  const economii = Math.max(0, readNumber(document.getElementById('bg-economii')));
  const r = computeBuget(venit, nevoi, dorinte, economii, zileLucratoareAn());

  // Carduri: ținte 50/30/20 vs realitate
  document.getElementById('bg-nevoi-target').textContent = fmtLei(r.tinta.nevoi);
  document.getElementById('bg-nevoi-pct').textContent = fmtPctSafe(r.procent.nevoi);
  document.getElementById('bg-nevoi-dev').textContent = fmtDeviereLei(r.deviere.nevoi);
  document.getElementById('bg-dorinte-target').textContent = fmtLei(r.tinta.dorinte);
  document.getElementById('bg-dorinte-pct').textContent = fmtPctSafe(r.procent.dorinte);
  document.getElementById('bg-dorinte-dev').textContent = fmtDeviereLei(r.deviere.dorinte);
  document.getElementById('bg-economii-target').textContent = fmtLei(r.tinta.economii);
  document.getElementById('bg-economii-pct').textContent = fmtPctSafe(r.procent.economii);
  document.getElementById('bg-economii-dev').textContent = fmtDeviereLei(r.deviere.economii);
  document.getElementById('bg-ramas').textContent = fmtLei(r.ramas);
  paintSign('bg-ramas', r.ramas);

  // Tabel: ținte, valori reale, procente, abateri
  document.getElementById('bg-t-nevoi').textContent = fmtLei(r.tinta.nevoi);
  document.getElementById('bg-r-nevoi').textContent = fmtLei(nevoi);
  document.getElementById('bg-p-nevoi').textContent = fmtPctSafe(r.procent.nevoi);
  document.getElementById('bg-d-nevoi').textContent = fmtDeviereLei(r.deviere.nevoi);
  document.getElementById('bg-t-dorinte').textContent = fmtLei(r.tinta.dorinte);
  document.getElementById('bg-r-dorinte').textContent = fmtLei(dorinte);
  document.getElementById('bg-p-dorinte').textContent = fmtPctSafe(r.procent.dorinte);
  document.getElementById('bg-d-dorinte').textContent = fmtDeviereLei(r.deviere.dorinte);
  document.getElementById('bg-t-economii').textContent = fmtLei(r.tinta.economii);
  document.getElementById('bg-r-economii').textContent = fmtLei(economii);
  document.getElementById('bg-p-economii').textContent = fmtPctSafe(r.procent.economii);
  document.getElementById('bg-d-economii').textContent = fmtDeviereLei(r.deviere.economii);
  document.getElementById('bg-t-total').textContent = fmtLei(venit);
  document.getElementById('bg-r-total').textContent = fmtLei(r.total);
  document.getElementById('bg-p-total').textContent = fmtPctSafe(r.procent.total);
  document.getElementById('bg-d-total').textContent =
    r.ramas >= 0 ? 'rămas ' + fmtLei(r.ramas) : 'deficit ' + fmtLei(-r.ramas);

  // Dorințele și economiile, exprimate în timp de muncă
  document.getElementById('bg-zile-dorinte').textContent = fmtNum(r.zileLucrateDorinte);
  document.getElementById('bg-zile-ore').textContent = fmtNum(r.oreLucrateDorinte);
  document.getElementById('bg-zile-economii').textContent = fmtNum(r.zileLucrateEconomii);

  const summary = document.getElementById('bg-summary');
  if (venit <= 0) {
    summary.textContent = 'Introdu venitul lunar net pentru a vedea repartizarea 50/30/20.';
  } else {
    summary.innerHTML =
      `Venit <strong>${fmtLei(venit)}</strong> → ținte: nevoi <strong>${fmtLei(r.tinta.nevoi)}</strong>, ` +
      `dorințe <strong>${fmtLei(r.tinta.dorinte)}</strong>, economii <strong>${fmtLei(r.tinta.economii)}</strong>. ` +
      `Cheltuieli totale <strong>${fmtLei(r.total)}</strong> — ` +
      (r.ramas >= 0
        ? `rămâi cu <strong>${fmtLei(r.ramas)}</strong>.`
        : `deficit de <strong>${fmtLei(-r.ramas)}</strong>.`);
  }

  renderAlerts('bg-alerte', r.alertes);
}

/* ═══ 18. Sănătatea financiară (N13) ════════════════════ */

const SF_PRAG_ECONOMII = 0.2;        // ținta de siguranță: ≥ 20% din venit
const SF_PRAG_DATORII = 0.36;        // plafonul prudențial: rate ≤ 36% din venit
const SF_PRAG_DATORII_WARN = 0.5;    // peste 50% e alarmă
const SF_PRAG_REZERVA = 3;           // minim 3 luni de cheltuieli esențiale
const SF_PRAG_REZERVA_WARN = 1;      // sub 1 lună e alarmă
const SF_ETICHETE_STARE = { ok: 'în regulă', warn: 'atenționare', bad: 'alarmă' };

function stareRataEconomii(v) {
  if (v === null) return 'warn';
  if (v >= SF_PRAG_ECONOMII) return 'ok';
  if (v >= SF_PRAG_ECONOMII / 2) return 'warn';
  return 'bad';
}

function stareDatoriiVenit(v) {
  if (v === null) return 'warn';
  if (v <= SF_PRAG_DATORII) return 'ok';
  if (v <= SF_PRAG_DATORII_WARN) return 'warn';
  return 'bad';
}

function stareRezerva(luni) {
  if (luni === null) return 'warn';
  if (luni >= SF_PRAG_REZERVA) return 'ok';
  if (luni >= SF_PRAG_REZERVA_WARN) return 'warn';
  return 'bad';
}

function stareNetWorth(v) {
  if (v === null) return 'warn';
  if (v > 0) return 'ok';
  if (v === 0) return 'warn';
  return 'bad';
}

/* Cei patru indicatori de sănătate financiară, cu praguri și alarme. */
function computeSanatate(venit, cheltuieli, economii, datoriiLunar, rezerva, active, datorii) {
  const venitAnual = venit * TIMP_LUNI_AN;
  const rataEconomii = venit > 0 ? economii / venit : null;
  const datoriiVenit = venit > 0 ? datoriiLunar / venit : null;
  const luniRezerva = cheltuieli > 0 ? rezerva / cheltuieli : null;
  const tintaMin = cheltuieli * 3;
  const tintaMax = cheltuieli * 6;
  const activeTotal = active + rezerva;
  const netWorth = activeTotal - datorii;
  const netWorthLuni = venitAnual > 0 ? netWorth / venitAnual : null;
  const lipsa = rezerva < tintaMin ? tintaMin - rezerva : 0;

  const statusuri = {
    rataEconomii: stareRataEconomii(rataEconomii),
    datoriiVenit: stareDatoriiVenit(datoriiVenit),
    rezervaLuni: stareRezerva(luniRezerva),
    netWorth: stareNetWorth(netWorth),
  };

  const alarme = [];
  if (venit <= 0) {
    alarme.push({
      nivel: 'warn',
      text: 'Introdu venitul lunar net pentru a calcula indicatorii de sănătate financiară.',
    });
  }
  if (rataEconomii !== null && rataEconomii < SF_PRAG_ECONOMII) {
    alarme.push({
      nivel: stareRataEconomii(rataEconomii),
      text: `Rată de economii ${fmtPct(rataEconomii)} — sub ținta de 20% din venit.`,
    });
  }
  if (datoriiVenit !== null && datoriiVenit > SF_PRAG_DATORII) {
    alarme.push({
      nivel: stareDatoriiVenit(datoriiVenit),
      text: `Ratele lunare absorb ${fmtPct(datoriiVenit)} din venit — peste pragul prudențial de 36%.`,
    });
  }
  if (luniRezerva !== null && luniRezerva < SF_PRAG_REZERVA) {
    alarme.push({
      nivel: stareRezerva(luniRezerva),
      text: `Rezerva acoperă ${fmtNum(luniRezerva, 1)} luni de cheltuieli — sub minimul de 3 luni.`,
    });
  }
  if (netWorth < 0) {
    alarme.push({
      nivel: 'bad',
      text: `Net worth negativ: datoriile depășesc activele cu ${fmtLei(-netWorth)}.`,
    });
  }
  if (alarme.length === 0) {
    alarme.push({ nivel: 'ok', text: 'Toți indicatorii sunt în zona sănătoasă.' });
  }

  const scorOk = Object.values(statusuri).filter((s) => s === 'ok').length;

  return {
    venitAnual,
    rataEconomii,
    datoriiVenit,
    luniRezerva,
    tintaMin,
    tintaMax,
    activeTotal,
    netWorth,
    netWorthLuni,
    lipsa,
    statusuri,
    alarme,
    scorOk,
  };
}

/* Eticheta de stare dintr-un card de indicator. */
function setStare(id, stare) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('is-ok', 'is-warn', 'is-bad');
  el.classList.add('is-' + stare);
  el.textContent = SF_ETICHETE_STARE[stare] || '—';
}

function renderSanatate() {
  const venit = Math.max(0, readNumber(document.getElementById('sf-venit')));
  const cheltuieli = Math.max(0, readNumber(document.getElementById('sf-cheltuieli')));
  const economii = Math.max(0, readNumber(document.getElementById('sf-economii')));
  const datoriiLunar = Math.max(0, readNumber(document.getElementById('sf-datorii-lunar')));
  const rezerva = Math.max(0, readNumber(document.getElementById('sf-rezerva')));
  const active = Math.max(0, readNumber(document.getElementById('sf-active')));
  const datorii = Math.max(0, readNumber(document.getElementById('sf-datorii')));
  const r = computeSanatate(venit, cheltuieli, economii, datoriiLunar, rezerva, active, datorii);

  // Carduri de indicatori
  document.getElementById('sf-rata-economii').textContent = fmtPctSafe(r.rataEconomii);
  setStare('sf-status-rata-economii', r.statusuri.rataEconomii);
  document.getElementById('sf-datorii-venit').textContent = fmtPctSafe(r.datoriiVenit);
  setStare('sf-status-datorii-venit', r.statusuri.datoriiVenit);
  document.getElementById('sf-rezerva-luni').textContent =
    r.luniRezerva === null ? '—' : fmtNum(r.luniRezerva, 1) + ' luni';
  setStare('sf-status-rezerva-luni', r.statusuri.rezervaLuni);
  document.getElementById('sf-net-worth').textContent = fmtLei(r.netWorth);
  paintSign('sf-net-worth', r.netWorth);
  setStare('sf-status-net-worth', r.statusuri.netWorth);

  // Tabel: valori și stări
  document.getElementById('sf-t-rata-economii').textContent = fmtPctSafe(r.rataEconomii);
  document.getElementById('sf-s-rata-economii').textContent = SF_ETICHETE_STARE[r.statusuri.rataEconomii];
  setStare('sf-s-rata-economii', r.statusuri.rataEconomii);
  document.getElementById('sf-t-datorii-venit').textContent = fmtPctSafe(r.datoriiVenit);
  document.getElementById('sf-s-datorii-venit').textContent = SF_ETICHETE_STARE[r.statusuri.datoriiVenit];
  setStare('sf-s-datorii-venit', r.statusuri.datoriiVenit);
  document.getElementById('sf-t-rezerva-luni').textContent =
    r.luniRezerva === null ? '—' : fmtNum(r.luniRezerva, 1) + ' luni';
  document.getElementById('sf-s-rezerva-luni').textContent = SF_ETICHETE_STARE[r.statusuri.rezervaLuni];
  setStare('sf-s-rezerva-luni', r.statusuri.rezervaLuni);
  document.getElementById('sf-t-net-worth').textContent = fmtLei(r.netWorth);
  document.getElementById('sf-s-net-worth').textContent = SF_ETICHETE_STARE[r.statusuri.netWorth];
  setStare('sf-s-net-worth', r.statusuri.netWorth);

  // Rezerva și net worth, în cifre
  document.getElementById('sf-tinta-min').textContent = fmtLei(r.tintaMin);
  document.getElementById('sf-tinta-max').textContent = fmtLei(r.tintaMax);
  document.getElementById('sf-lipsa').textContent = r.lipsa > 0 ? fmtLei(r.lipsa) : 'ținta e acoperită';
  document.getElementById('sf-net-worth-luni').textContent = fmtNum(r.netWorthLuni, 2);

  const summary = document.getElementById('sf-summary');
  if (venit <= 0) {
    summary.textContent = 'Introdu venitul lunar net pentru a vedea imaginea de ansamblu.';
  } else {
    summary.innerHTML =
      `<strong>${r.scorOk} din 4</strong> indicatori în zona sănătoasă. ` +
      `Rată de economii <strong>${fmtPctSafe(r.rataEconomii)}</strong>, ` +
      `datorii absorb <strong>${fmtPctSafe(r.datoriiVenit)}</strong> din venit, ` +
      `rezerva acoperă <strong>${r.luniRezerva === null ? '—' : fmtNum(r.luniRezerva, 1)}</strong> luni, ` +
      `net worth <strong>${fmtLei(r.netWorth)}</strong>.`;
  }

  renderAlerts('sf-alerte', r.alarme);
}

/* ═══ 19. Legături între taburi ══════════════════════════ */

/* Render-ul panoului destinație, pentru salturile cu prefill. */
const TAB_RENDERERS = {
  timp: renderTimp,
  fond: renderFond,
  buget: renderBuget,
  sanatate: renderSanatate,
};

/* Listează alarmele în container, cu culoarea corespunzătoare nivelului. */
function renderAlerts(containerId, alertes) {
  const box = document.getElementById(containerId);
  if (!box) return;
  box.innerHTML = '';
  alertes.forEach((a) => {
    const p = document.createElement('p');
    p.className = 'alert is-' + a.nivel;
    p.textContent = a.text;
    box.appendChild(p);
  });
}

/* Salt dintr-un tab în altul, cu prefill: setează inputurile, recalculă panoul
   destinație și deschide tabul. Închide bucla dintre taburi:
   Buget → Timp, Timp → Buget, Sănătate → Fond/Buget, Fond → Sănătate. */
function goToTab(id, valori = {}) {
  Object.keys(valori).forEach((cheie) => {
    const el = document.getElementById(cheie);
    if (el) el.value = String(valori[cheie]);
  });
  const render = TAB_RENDERERS[id];
  if (render) render();
  activateTab(id, { focusPanel: true, history: 'push' });
  persistSave();
}

/* ═══ 20. Navigarea cu taburi (v2) ═══════════════════════ */

/* Definiția taburilor: id-ul butonului ↔ id-ul panoului (`tab-<id>` / `panel-<id>`). */
const TABS = ['inflatie', 'timp', 'dobanda', 'compusa', 'randament', 'profit', 'cost', 'suma', 'nuam', 'di', 'regula72', 'fond', 'oportunitate', 'buget', 'sanatate'];

/* Id-ul tabului activ, citit din HTML (clasa `is-active`), nu din hash:
   hash-ul se schimbă la click, dar tabul afișat e cel cu `is-active`. */
function activeTabId() {
  const active = document.querySelector('.tabs .tab.is-active');
  if (active) return active.id.replace(/^tab-/, '');
  return 'inflatie';
}

/* Comută tabul. `focus` „pune" focusul pe buton (tastatură), `focusPanel` îl
   mută în panoul activ (click, back/forward) — cititorul de ecran anunță noul
   conținut, iar panoul nu rămâne ascuns sub bara de taburi sticky.
   `history: 'push'` adaugă o intrare în istoric (click/săgeți), deci
   back/forward schimbă tabul; implicit se înlocuiește intrarea curentă. */
function activateTab(id, { focus = false, focusPanel = false, scroll = false, history: historyMode = 'replace' } = {}) {
  const tab = document.getElementById('tab-' + id);
  const panel = document.getElementById('panel-' + id);
  if (!tab || !panel) return;

  TABS.forEach((tid) => {
    const btn = document.getElementById('tab-' + tid);
    const pnl = document.getElementById('panel-' + tid);
    if (!btn || !pnl) return;
    const activ = tid === id;
    btn.classList.toggle('is-active', activ);
    btn.setAttribute('aria-selected', activ ? 'true' : 'false');
    pnl.classList.toggle('is-active', activ);
    if (activ) pnl.removeAttribute('hidden');
    else pnl.setAttribute('hidden', '');
  });

  // `aria-live` doar în panoul vizibil: regiunile live din panourile ascunse
  // nu anunță rezultate în timp ce utilizatorul e în altă parte a paginii.
  document.querySelectorAll('.tab-panel[hidden] [aria-live]').forEach((el) => {
    el.removeAttribute('aria-live');
  });
  panel.querySelectorAll('.summary').forEach((el) => {
    if (!el.hasAttribute('aria-live')) el.setAttribute('aria-live', 'polite');
  });

  if (focus) tab.focus();
  if (focusPanel) panel.focus({ preventScroll: true });
  if (scroll || focusPanel) panel.scrollIntoView({ block: 'start', inline: 'nearest' });

  // Reține ultimul tab vizibil în bara de browser (fără a mai încărca pagina).
  if (history.replaceState) {
    if (historyMode === 'push') history.pushState(null, '', '#' + id);
    else history.replaceState(null, '', '#' + id);
  }

  updatePrintTabName();
}

/* Numele tabului din antetul de tipărire (P5). */
function updatePrintTabName() {
  const el = document.getElementById('print-tab-name');
  if (!el) return;
  const tab = document.getElementById('tab-' + activeTabId());
  el.textContent = tab ? tab.textContent : '—';
}

/* Tastatură: săgeți stânga/dreapta + Home/End (model WAI-ARIA).
   Funcționează și atunci când focusul e în panoul activ (după click),
   nu doar când e pe butonul-tab. */
function handleTabKeys(event) {
  const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
  if (!keys.includes(event.key)) return;

  const current = document.activeElement;
  if (!current) return;

  const tabList = Array.from(document.querySelectorAll('.tabs [role="tab"]'));
  let index = tabList.indexOf(current);
  if (index === -1 && current.id && current.id.startsWith('panel-')) {
    index = TABS.indexOf(current.id.replace(/^panel-/, ''));
  }
  if (index === -1) return;

  event.preventDefault();
  let next = index;
  if (event.key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length;
  if (event.key === 'ArrowRight') next = (index + 1) % TABS.length;
  if (event.key === 'Home') next = 0;
  if (event.key === 'End') next = TABS.length - 1;

  activateTab(TABS[next], { focus: true, scroll: true, history: 'push' });
  persistSave();
}

function initTabs() {
  TABS.forEach((tid) => {
    const tab = document.getElementById('tab-' + tid);
    if (!tab) return;

    tab.addEventListener('click', () => {
      activateTab(tid, { focusPanel: true, history: 'push' });
      persistSave();
    });

    // Săgețile și Home/End merg și din panoul activ.
    const panel = document.getElementById('panel-' + tid);
    if (panel) panel.addEventListener('keydown', handleTabKeys);
  });

  document.querySelector('.tabs').addEventListener('keydown', handleTabKeys);

  // Back/forward: hash-ul se schimbă și tabul afișat îl urmează.
  window.addEventListener('hashchange', () => {
    const id = location.hash.replace('#', '');
    if (TABS.includes(id)) {
      activateTab(id, { focusPanel: true });
      persistSave();
    }
  });

  // Dacă pagina se deschide cu #nume-tab, pornește de acolo.
  // Tabul deschis anterior (din localStorage) e o dovadă mai bună decât hash-ul:
  // hash-ul rămâne în bara de browser și ar putea să indice un tab neintenționat.
  let initial = null;
  try { initial = localStorage.getItem('glitchcoin-tab'); } catch (e) { /* blocat */ }
  if (!initial || !TABS.includes(initial)) {
    initial = location.hash.replace('#', '');
  }
  activateTab(TABS.includes(initial) ? initial : 'inflatie');

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

/* ── Tooltips accesibile pentru formule ─────────────────────
   Fiecare element cu `data-tip="cheie"` primește un declanșator
   „?" (buton focusabil) și un panou `role="tooltip"`, legat prin
   `aria-describedby`. Se deschide la focus, hover sau click și se
   închide cu Escape, la pierderea focusului/sauurii sau la click
   în afara. Nu folosim `title` nativ — e invizibil la tastatură
   și pe ecranele tactile. */

const FORMULA_TIPS = {
  'sim-compound': {
    title: 'Suma necesară în anul N',
    text: 'Suma actuală × (1 + rata inflației)<sup>N−1</sup>. Anul 1 = anul curent, deci suma rămâne cea introdusă. Exemplu: 5.000 lei la 5% ajung la 5.250 lei în anul 2.'
  },
  'deflator': {
    title: 'Echivalentul în anul A',
    text: 'Suma actuală ÷ Π (1 + rata inflației anuale), pentru anii A+1, A+2, …, 2025. Rândul A arată cât puteai cumpăra în anul A cu banii din 2025. Anul 2025 păstrează suma neschimbată.'
  },
  'timp-basis': {
    title: 'Baza de calcul a timpului',
    text: 'Venitul pe zi = venitul lunar net ÷ 30,44 (media reală de zile pe lună, 365/12). Pe oră = ÷ 24. Pe minut = ÷ 60. Pe zi lucrătoare = ÷ 20. Pe oră lucrătoare = ÷ 8 ore.'
  },
  'timp-minute': {
    title: 'Minute de muncă',
    text: 'Prețul dorinței ÷ venitul pe minut. Un minut de muncă = 1/60 dintr-o oră, iar o oră = 1/24 dintr-o zi de 30,44 de zile.'
  },
  'timp-oreluc': {
    title: 'Ore lucrate',
    text: 'Prețul dorinței ÷ venitul pe oră lucrătoare. Ține cont doar de zilele și orele de lucru (8 ore pe zi lucrătoare).'
  },
  'timp-zile-lucratore': {
    title: 'Zile lucrătoare într-un an',
    text: 'Zilele lucrătoare = zile calendaristice − weekenduri − sărbători legale: 365 − 104 (52 × 2) − 13 = 248 în România, în 2025. De ce contează: venitul pe zi lucrătoare = venitul anual (12 × lunar) ÷ zilele lucrătoare, iar „% dintr-un an lucrător" = zilele lucrate ÷ zilele lucrătoare. Cu mai puține zile lucrătoare, fiecare zi valorează mai mult. Procentul dintr-un an lucrător este echivalent cu prețul ÷ venitul anual, deci nu se modifică odată cu numărul de zile. Surse: calendarul sărbătorilor legale — <a href="https://legislatie.just.ro/" target="_blank" rel="noopener">legislatie.just.ro</a>; date macro — <a href="https://www.insse.ro/" target="_blank" rel="noopener">INS</a>.'
  },
  'dob-brut': {
    title: 'Dobânda brută',
    text: 'ROUND(sumă × rată × zile ÷ 365, 2). Rata e anuală (7% = 0,07), iar zilele sunt calendaristice. Rezultatul e înainte de impozit.'
  },
  'dob-net': {
    title: 'Dobânda netă',
    text: 'ROUND((1 − impozit) × brut, 2). Impozitul e un procent din dobândă (10% = 0,10), nu din sumă.'
  },
  'comp-a': {
    title: 'Dobânda compusă fără contribuție',
    text: 'B(0) = suma inițială; B(n) = ROUND(B(n−1) × (1 + rată), 2). Dobânda(n) = B(n) − B(n−1); randamentul(n) = B(n) ÷ B(0) − 1.'
  },
  'comp-b': {
    title: 'Dobânda compusă cu contribuție',
    text: 'Sumă investită(n) = suma inițială + 12 × contribuție × n (contribuția e lunară). Sumă totală(n) = suma × (1 + rată/12)<sup>12×n</sup> + contribuție × ((1 + rată/12)<sup>12×n</sup> − 1) ÷ (rată/12) — compunere lunară, pe aceeași bază de contribuție.'
  },
  'comp-b-investit': {
    title: 'Suma investită (contribuție lunară)',
    text: 'Suma inițială + 12 × contribuția lunară × numărul de ani. Deoarece contribuția e lunară, coloana crește cu 12 × contribuție în fiecare an, iar dobânda e compusă lunar pe aceeași bază — cele două coloane sunt consistente.'
  },
  'rand-brut-pct': {
    title: 'Randament brut',
    text: 'Câștig brut ÷ sumă. Câștigul brut = sumă × randament. E procentul înainte de impozit și comisioane.'
  },
  'rand-net-pct': {
    title: 'Randament net',
    text: '(Brut − impozit − comisioane) ÷ sumă. Impozitul și comisioanele se aplică pe câștigul brut, nu pe sumă investită.'
  },
  'rand-real-pct': {
    title: 'Randament real',
    text: '(1 + randament net) ÷ (1 + inflație) − 1. Arată creșterea reală a puterii de cumpărare, nu doar banii nominali.'
  },
  'impozit-tipuri': {
    title: 'Impozitul pe tipuri de venit (România)',
    text: 'Dobândă: 10% (2025). Dividende: 10% (2025) / 16% (2026). Valori mobiliere, broker RO, deținut ≥ 1 an: 1% (2025) / 3% (2026); < 1 an: 3% / 6%. Valori mobiliere prin broker străin sau crypto: 10% (2025) / 16% (2026). Selectează „Tipul de venit" pentru a aplica rata corectă. Surse: <a href="https://taxsummaries.pwc.com/romania/individual/significant-developments" target="_blank" rel="noopener">PwC</a>, <a href="https://www.ey.com/en_gl/technical/tax-alerts/romanian-tax-changes-introduced-by-new-fiscal-and-budgetary-measures" target="_blank" rel="noopener">EY</a>.'
  },
  'comisioane': {
    title: 'Comisioanele de tranzacționare',
    text: 'Media reală de pe piață: 0,1–0,5% la brokerii români (0,3% e tariful online cel mai răspândit), 0,5–1% la brokerii străini; crypto/CFD-uri pot ajunge la 1–2%. Valoarea din aplicație (0,3%) e media pieței RO pentru acțiuni. Surse: <a href="https://www.money.ro/invata/brokeri-autorizati" target="_blank" rel="noopener">money.ro</a>, <a href="https://www.wall-street.ro/articol/Money/201325/cat-te-costa-sa-cumperi-actiuni-pe-bursa-si-care-sunt-sumele-minime-de-care-ai-nevoie.html" target="_blank" rel="noopener">wall-street.ro</a> (grile de comisioane, octombrie 2026).'
  },
  'prof-final': {
    title: 'Valoarea finală',
    text: 'Sumă ÷ preț inițial × preț vânzare. Câte unități ai cumpărat (sumă ÷ preț inițial) × prețul la care vinzi.'
  },
  'prof-brut': {
    title: 'Profit brut',
    text: 'Valoare finală − sumă investită. Poate fi negativ dacă vinzi mai ieftin decât ai cumpărat.'
  },
  'prof-net': {
    title: 'Profit net',
    text: 'Brut − (brut × impozit + brut × comisioane). Taxele se aplică pe profit, nu pe sumă investită. Dacă brutul e negativ (pierdere), netul = brutul: pierderea nu se impozitează.'
  },
  'prof-real': {
    title: 'Profit real',
    text: 'Randament real × sumă, unde randament real = (1 + randament net) ÷ (1 + inflație) − 1. E profitul ajustat la inflație.'
  },
  'cost-mediu': {
    title: 'Costul mediu de achiziție',
    text: '(Σ preț × cantitate + Σ preț × cantitate × comision) ÷ Σ cantitate. E media ponderată cu cantitatea, cu comisionul inclus.'
  },
  'cost-cantitate': {
    title: 'Cantitate totală',
    text: 'Σ cantitate, pentru toate tranșele introduse.'
  },
  'cost-valoare': {
    title: 'Valoare achiziționată',
    text: 'Σ preț × cantitate, fără comisioane.'
  },
  'cost-total': {
    title: 'Total plătit',
    text: 'Valoare achiziționată + Σ (preț × cantitate × comision). Include comisionul fiecărei tranșe.'
  },
  'suma-economie': {
    title: 'Economia lunară necesară',
    text: '−PMT(randament ÷ 12, ani × 12, sumă inițială, sumă dorită). E suma constantă pe lună care, cu dobânda, ajunge la țintă.'
  },
  'suma-total-economisit': {
    title: 'Total economisit',
    text: 'Economia lunară × numărul de luni. Doar contribuțiile tale, fără dobândă.'
  },
  'suma-dobanda': {
    title: 'Suma din dobândă',
    text: 'Suma totală la final − sumă inițială − total economisit. Partea crescută doar din dobândă.'
  },
  'suma-final': {
    title: 'Suma totală la final',
    text: 'Sumă inițială × (1 + rată/12)<sup>luni</sup> + economia lunară × ((1 + rată/12)<sup>luni</sup> − 1) ÷ (rată/12). E ținta atinsă.'
  },
  'nuam-fara': {
    title: 'Suma la finalul lunii · fără CE',
    text: 'Venit − total facturi. Nu se câștigă dobândă pe banii din cont.'
  },
  'nuam-cu': {
    title: 'Suma la finalul lunii · cu CE',
    text: 'Venit − total facturi + profitul din dobândă. Facturile se plătesc la scadență, deci banii rămân în contul de economii și fac dobândă — la final rămâi cu mai mulți bani decât fără CE.'
  },
  'nuam-rata': {
    title: 'Dobânda la contul de economii',
    text: 'Intervalul real pentru depozitele nou deschise în România: 3–4% pe an (2025–2026). Media dobânzii la depozitele noi ale populației a fost 5,39% la finalul 2025, iar cele mai bune oferte ~6,75–7% (BNR). Valoarea din aplicație e prudentă, nu promoțională.'
  },
  'nuam-profit': {
    title: 'Profit (diferență)',
    text: 'Dobânda netă (10% impozit) pe soldul din contul de economii, zilnic, de la venit până la retragere. E diferența dintre scenariul cu CE și fără CE.'
  },
  'nuam-raport': {
    title: 'Profit raportat la investiție',
    text: 'Profit ÷ suma adăugată în contul de economii. Arată rentabilitatea banilor ținuți în CE.'
  },
  'nuam-profit-anual': {
    title: 'Profit într-un an',
    text: 'Profit lunar × 12, presupunând aceeași sumă și aceeași rată în fiecare lună.'
  },
  'nuam-raport-anual': {
    title: 'Profit raportat la investiție (an)',
    text: 'Profit anual ÷ suma adăugată în contul de economii.'
  },
  'nuam-inflatie-tine': {
    title: 'Rata inflației pentru tine',
    text: 'Inflație − profit raportat anual. Dacă e negativă, banii tăi „inflatizează" mai repede decât prețurile.'
  },
  'nuam-profit-10': {
    title: 'Profit în 10 ani',
    text: 'Profit anual × 10, fără recalcularea dobânzii compuse.'
  },
  'nuam-raport-10': {
    title: 'Profit raportat la investiție (10 ani)',
    text: 'Profit în 10 ani ÷ suma adăugată în contul de economii.'
  },
  'di-crestere': {
    title: 'Creșterea nominală',
    text: 'Suma × randament nominal. Câți bani mai mulți vei avea după un an, înainte de a ține cont de inflație.'
  },
  'di-real': {
    title: 'Randamentul real (exact)',
    text: '(1 + randament nominal) ÷ (1 + inflație) − 1. Măsoară creșterea puterii de cumpărare, nu banii nominali. Formula este identică cu cea din tabul „Randament”.'
  },
  'di-valoare-reala': {
    title: 'Valoarea reală după 1 an',
    text: 'Suma × (1 + randament real). Echivalentul în lei de astăzi al banilor de peste un an.'
  },
  'di-aproximare': {
    title: 'Aproximația nominal − inflație',
    text: 'Estimare rapidă, fără compunere: randamentul nominal minus inflația. La rate mari deviază de la formula exactă (Fisher); diferența este afișată în rezumat.'
  },
  'di-istoric': {
    title: 'Randamentul real istoric 2000–2025',
    text: 'Pentru fiecare an, (1 + randament nominal constant) ÷ (1 + inflația anuală INS) − 1. Un depozit „sigur” poate fi negativ real în anii cu inflație ridicată. Sursa: INS — IPC național, serie annuală (<a href="https://insse.ro/cms/en/content/cpi-annual-data-series" target="_blank" rel="noopener">insse.ro</a>).'
  },
  'di-cash-real': {
    title: 'Cash păstrat 26 de ani',
    text: 'Suma ÷ produsul inflației 2000–2025. Câtă putere de cumpărare din 2025 mai are banii notați în 2000.'
  },
  'di-investit-real': {
    title: 'La randamentul nominal',
    text: 'Suma × (1 + nominal)^26 ÷ produsul inflației — aceiași bani compuși nominal 26 de ani, aduși în putere de cumpărare din 2025.'
  },
  'di-diferenta': {
    title: 'Diferența pe termen lung',
    text: 'Valoarea reală de la randament nominal − valoarea reală a cash-ului, pe 26 de ani. Pozitivă când randamentul depășește inflația acumulată.'
  },
  'r72-regula': {
    title: 'Regula 72',
    text: 'Ani până la dublare ≈ 72 ÷ rată (în procente). O scurtătură bazată pe compunere; la 7% dă ~10,3 ani, iar compunerea exactă dă 10,24 ani. Cel mai precisă pentru rate de 6–10%.'
  },
  'r72-exact': {
    title: 'Compunerea exactă',
    text: 'ln 2 ÷ ln(1 + rată). Numărul exact de ani pentru care (1 + rată)^n = 2, cu compunere anuală.'
  },
  'r72-diferenta': {
    title: 'Diferența dintre regulă și exact',
    text: '|cât estimează regula 72 − anii exacti|. Mică între 6% și 10%, mai mare la extreme.'
  },
  'r72-dublu': {
    title: 'Suma dublă',
    text: 'Suma inițială × 2 — ce vei avea la dublare, la valoarea nominală.'
  },
  'r72-inverse': {
    title: 'Rată necesară pentru dublare în N ani',
    text: 'Cât de mare trebuie să fie randamentul anual ca banii să se dubleze în numărul de ani introdus.'
  },
  'r72-inverse-regula': {
    title: 'Rată · regula 72',
    text: '72 ÷ numărul de ani. Estimare rapidă a ratei necesare pentru dublare.'
  },
  'r72-inverse-exact': {
    title: 'Rată · exactă',
    text: '2^(1/ani) − 1, în procente. Rată anuală exactă pentru dublare în N ani (compunere anuală).'
  },
  'fu-tinta': {
    title: 'Ținta fondului de urgență',
    text: 'Cheltuielile lunare esențiale × numărul de luni (3–6). Reprezintă cât ai avea nevoie dacă venitul s-ar opri complet. Surse: BNR — dobânzi la depozite (<a href="https://www.bnr.ro/" target="_blank" rel="noopener">bnr.ro</a>), INS — inflație (<a href="https://insse.ro/cms/en/content/cpi-annual-data-series" target="_blank" rel="noopener">insse.ro</a>).'
  },
  'fu-dobanda': {
    title: 'Dobânda pe fond',
    text: 'Țintă × rată (brut), apoi brut × (1 − impozit) = net. Pentru depozite, impozitul pe dobândă e 10% în România; intervalul real de dobândă e 3–4% (2025–2026, BNR).'
  },
  'fu-economie-necesara': {
    title: 'Economia lunară necesară',
    text: '(Țintă − suma actuală × (1+r)^n) × r ÷ ((1+r)^n − 1), cu r = rată/12 pe lună și n = numărul de luni. E contribuția lunară care ajunge la țintă la rata aleasă.'
  },
  'fu-timp': {
    title: 'Timpul până la țintă',
    text: 'n = ln((țintă×r + economia) ÷ (suma actuală×r + economia)) ÷ ln(1 + r), cu r = rată/12. Câte luni sunt necesare cu economia lunară introdusă.'
  },
  'co-cash-nominal': {
    title: 'Cash · valoare nominală',
    text: 'Suma rămâne neschimbată — contul curent nu dobândește.'
  },
  'co-investit-nominal': {
    title: 'Investiție · valoare nominală',
    text: 'Suma × (1 + randament net)^ani, cu randament net = nominal × (1 − impozit − comisioane), compus anual.'
  },
  'co-cash-real': {
    title: 'Cash · putere de cumpărare',
    text: 'Valoarea nominală ÷ (1 + inflație)^ani. Cât poți cumpăra efectiv cu banii păstrați în cash.'
  },
  'co-investit-real': {
    title: 'Investiție · putere de cumpărare',
    text: 'Valoarea nominală la final ÷ (1 + inflație)^ani — valoarea reală a investiției.'
  },
  'co-cost': {
    title: 'Costul oportunității',
    text: 'Valoarea reală de la investiție − valoarea reală a cash-ului, dacă e pozitivă. Ce pierzi alegând cash-ul în locul investiției, exprimat în putere de cumpărare.'
  },
  'bg-venit': {
    title: 'Venitul lunar net',
    text: 'Venitul după impozite, pe lună — baza regulii 50/30/20. Țintele se calculează din acest venit: 50% nevoi, 30% dorințe, 20% economii.'
  },
  'bg-nevoi': {
    title: 'Nevoi',
    text: 'Cheltuielile esențiale, care trebuie plătite indiferent de venit: locuință, alimente, utilități, transport, rambursări. Ținta e 50% din venit.'
  },
  'bg-dorinte': {
    title: 'Dorințe',
    text: 'Cheltuielile opționale: restaurante, hobby, călătorii, abonamente. Ținta e 30% din venit. Aici se găsește ce poți tăia primul.'
  },
  'bg-economii': {
    title: 'Economii',
    text: 'Suma care rămâne neatinsă la final de lună și merge la fondul de urgență sau investiții. Ținta e 20% din venit.'
  },
  'bg-nevoi-target': {
    title: 'Nevoi · țintă vs realitate',
    text: 'Ținta = 50% din venitul lunar net. Abaterea = valoarea reală − ținta: pozitivă înseamnă peste țintă (nevoi prea mari).'
  },
  'bg-dorinte-target': {
    title: 'Dorințe · țintă vs realitate',
    text: 'Ținta = 30% din venitul lunar net. Abaterea = valoarea reală − ținta.'
  },
  'bg-economii-target': {
    title: 'Economii · țintă vs realitate',
    text: 'Ținta = 20% din venitul lunar net. Abaterea = valoarea reală − ținta: negativă înseamnă sub țintă.'
  },
  'bg-ramas': {
    title: 'Rămas / deficit',
    text: 'Venit − (nevoi + dorințe + economii). Pozitiv = subvenit nealocat; negativ = cheltuieli peste venit.'
  },
  'bg-zile': {
    title: 'Timp de muncă',
    text: 'Venitul pe zi lucrătoare = venitul anual (12 × lunar) ÷ zilele lucrătoare din an. Aceleași valori sunt folosite în tabul „Timp vs dorințe”.'
  },
  'bg-zile-dorinte': {
    title: 'Dorințe · zile lucrate',
    text: 'Cheltuielile lunare pentru dorințe ÷ venitul pe zi lucrătoare. Câte zile lucrate costă, lunar, categoria de dorințe.'
  },
  'bg-zile-ore': {
    title: 'Dorințe · ore lucrate',
    text: 'Zilele lucrate × 8 ore. Aceeași valoare o vezi în tabul „Timp vs dorințe” pentru prețul dorinței.'
  },
  'bg-zile-economii': {
    title: 'Economii · zile lucrate',
    text: 'Economia lunară ÷ venitul pe zi lucrătoare. Câte zile lucrate reprezintă economia pe care o pui deoparte în fiecare lună.'
  },
  'sf-venit': {
    title: 'Venitul lunar net',
    text: 'Venitul după impozite, pe lună — baza tuturor indicatorilor din acest tab.'
  },
  'sf-cheltuieli': {
    title: 'Cheltuieli esențiale',
    text: 'Cheltuielile lunare pe care le-ai păstra și fără venit: locuință, alimente, utilități, transport. Sunt baza rezervei de 3–6 luni.'
  },
  'sf-economii': {
    title: 'Economii lunare',
    text: 'Suma pusă deoparte în fiecare lună. Rata de economii = economii ÷ venit; ținta e ≥ 20%.'
  },
  'sf-datorii-lunar': {
    title: 'Rate lunare la datorii',
    text: 'Totalul ratelor lunare: ipotecă, auto, card, împrumuturi personale. Datorii / venit = rate ÷ venit; plafonul prudențial e 36%.'
  },
  'sf-rezerva': {
    title: 'Rezerva de urgență actuală',
    text: 'Suma giudicioasă acum, pentru 3–6 luni de cheltuieli esențiale. Rezerva se adaugă la activele din net worth.'
  },
  'sf-active': {
    title: 'Active, fără rezerva',
    text: 'Casa, investițiile, vehiculul și alte active. Net worth = active + rezerva − datorii. Ține cont că valoarea imobiliară e estimată.'
  },
  'sf-datorii': {
    title: 'Datorii totale',
    text: 'Restul de plată la ipotecă, auto, card și alte împrumuturi. Net worth = active + rezerva − datorii.'
  },
  'sf-rata-economii': {
    title: 'Rată de economii',
    text: 'Economii lunare ÷ venit lunar net. Ținta e ≥ 20% (regula 50/30/20); sub 10% e alarmă.'
  },
  'sf-datorii-venit': {
    title: 'Datorii / venit',
    text: 'Ratele lunare ÷ venitul lunar net. Ținta e ≤ 36% (plafonul prudențial uzual); peste 50% e alarmă.'
  },
  'sf-rezerva-luni': {
    title: 'Rezerva de urgență, în luni',
    text: 'Rezerva ÷ cheltuielile esențiale lunare. Ținta e 3–6 luni; sub 1 lună e alarmă.'
  },
  'sf-net-worth': {
    title: 'Net worth',
    text: 'Active + rezerva − datorii. Pozitiv înseamnă că ce deții depășește ce datorezi. Ținta e > 0.'
  },
  'sf-tinta-min': {
    title: 'Ținta minimă · 3 luni',
    text: 'Cheltuielile esențiale × 3 — primul nivel de siguranță. Lipsa = ce mai trebuie acumulat până aici.'
  },
  'sf-tinta-max': {
    title: 'Ținta maximă · 6 luni',
    text: 'Cheltuielile esențiale × 6 — rezerva completă, pentru perioade lungi fără venit (recesiune, schimbare de job).'
  },
  'sf-lipsa': {
    title: 'Lipsa până la 3 luni',
    text: 'Ținta minimă − rezerva actuală. Zero înseamnă că prima țintă e deja acoperită.'
  },
  'sf-net-worth-luni': {
    title: 'Net worth, în luni de venit',
    text: 'Net worth ÷ venitul anual. Câte luni de venit valorează ce mai ai după ce ai plătit toate datoriile.'
  },
};

let formulaTipCounter = 0;
const openFormulaTips = [];

function closeFormulaTip(entry) {
  entry.panel.hidden = true;
  entry.btn.setAttribute('aria-expanded', 'false');
  const index = openFormulaTips.indexOf(entry);
  if (index !== -1) openFormulaTips.splice(index, 1);
}

function closeFormulaTips() {
  [...openFormulaTips].forEach(closeFormulaTip);
}

function buildFormulaTip(host, key) {
  const tip = FORMULA_TIPS[key];
  if (!tip) return;

  const stat = host.closest('.stat');
  const label = stat ? stat.querySelector('.stat-label') : null;
  const anchor = label || host;

  const wrap = document.createElement('span');
  wrap.className = 'tip-wrap';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'tip-btn';
  btn.textContent = '?';
  btn.setAttribute('aria-label', 'Detalii: ' + tip.title);

  const valueEl = stat ? stat.querySelector('.stat-value') : null;
  const baseId = (valueEl && valueEl.id) || host.id || key;
  let panelId = 'tip-' + baseId;
  if (document.getElementById(panelId)) {
    panelId = 'tip-' + baseId + '-' + String(++formulaTipCounter).padStart(2, '0');
  }
  btn.setAttribute('aria-describedby', panelId);
  btn.setAttribute('aria-expanded', 'false');

  const panel = document.createElement('span');
  panel.id = panelId;
  panel.className = 'tip';
  panel.setAttribute('role', 'tooltip');
  panel.hidden = true;
  panel.innerHTML = '<strong>' + tip.title + '</strong><span class="tip-text">' + tip.text + '</span>';

  wrap.append(btn, panel);
  anchor.appendChild(wrap);

  const entry = { btn, panel };

  function positionTip() {
    const wrapRect = wrap.getBoundingClientRect();
    const tipRect = panel.getBoundingClientRect();
    const margin = 16;
    const vw = Math.min(window.innerWidth, document.documentElement.clientWidth);
    const vh = window.innerHeight;

    // Orizontal: ține tooltip-ul în viewport (poate trece și la stânga declanșatorului).
    const targetLeft = Math.max(margin, Math.min(wrapRect.left, vw - tipRect.width - margin));
    panel.style.left = (targetLeft - wrapRect.left) + 'px';
    panel.style.right = 'auto';

    // Vertical: dacă nu încapă dedesubt, deschide în sus.
    if (wrapRect.bottom + tipRect.height + margin > vh) {
      panel.style.top = 'auto';
      panel.style.bottom = 'calc(100% + 8px)';
    } else {
      panel.style.top = 'calc(100% + 8px)';
      panel.style.bottom = 'auto';
    }
  }

  function show() {
    closeFormulaTips();
    panel.hidden = false;
    positionTip();
    btn.setAttribute('aria-expanded', 'true');
    if (!openFormulaTips.includes(entry)) openFormulaTips.push(entry);
  }

  function hide() {
    closeFormulaTip(entry);
  }

  btn.addEventListener('focus', show);
  btn.addEventListener('blur', hide);
  btn.addEventListener('mouseenter', show);
  btn.addEventListener('mouseleave', () => {
    if (document.activeElement !== btn) hide();
  });
  // Click/touch: păstrează tooltip-ul deschis; se închide cu Escape,
  // la click în afara sau la pierderea focusului.
  btn.addEventListener('click', show);
  btn.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      hide();
    }
  });
  document.addEventListener('click', (event) => {
    if (!wrap.contains(event.target)) hide();
  });
  window.addEventListener('resize', () => {
    if (!panel.hidden) positionTip();
  });
}

function initFormulaTips() {
  document.querySelectorAll('[data-tip]').forEach((host) => {
    buildFormulaTip(host, host.dataset.tip);
  });
}

// Escape închide orice tooltip deschis, indiferent unde e focusul.
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeFormulaTips();
});

/* ═══ Export CSV (P5) ══════════════════════════════════
   Butonul „Descarcă CSV" (bara de taburi) exportă tabelele
   panoului activ într-un fișier CSV, cu delimitator `;`
   (compatibil cu Excel în România) și BOM UTF-8, ca să se
   deschidă cu diacritice corecte. */

const CSV_DELIMITER = ';';
const CSV_BOM = '\uFEFF';

/* O celulă CSV: când conține `;`, `"` sau linie nouă, o încadrez
   în ghilimele și dublăm ghilimelele interne. */
function csvCell(value) {
  const text = String(value === null || value === undefined ? '' : value);
  if (/[";\n\r]/.test(text)) return '"' + text.replace(/"/g, '""') + '"';
  return text;
}

/* Textul unei celule: în tabelele dinamice (cost, facturi) valoarea
   e în <input>, nu în text. */
function csvCellText(td) {
  const input = td.querySelector('input');
  if (!input) return td.textContent.trim();
  return csvInputValue(input);
}

/* Inputurile HTML au punct zecimal (`28.81`), dar Excelul românesc
   așteaptă virgulă (`28,81`). Punctul îl înlocuim exact, fără
   trecere prin virgulă mobilă; formele exponențiale cad în fallback. */
function csvInputValue(input) {
  const raw = input.value.trim();
  if (raw === '') return '';
  if (/^-?\d+(\.\d+)?$/.test(raw)) return raw.replace('.', ',');
  const num = parseFloat(raw);
  return Number.isFinite(num) ? num.toLocaleString(LOCALE) : raw;
}

/* Transformă un tabel în CSV: prima linie e caption-ul (numele
   tabelului), apoi antetul și rândurile. Coloana de acțiuni
   (butoanele „Șterge") nu se exportă. */
function tableToCSV(table) {
  const lines = [];

  const caption = table.querySelector('caption');
  if (caption) {
    const captionText = caption.textContent.trim();
    if (captionText) lines.push(csvCell(captionText));
  }

  const header = Array.from(table.querySelectorAll('thead th'))
    .filter((th) => !th.querySelector('.visually-hidden'))
    .map((th) => csvCell(th.textContent.trim()));
  if (header.length) lines.push(header.join(CSV_DELIMITER));

  table.querySelectorAll('tbody tr').forEach((tr) => {
    const cells = Array.from(tr.querySelectorAll('td'))
      .filter((td) => !td.querySelector('button'))
      .map((td) => csvCell(csvCellText(td)));
    if (cells.length) lines.push(cells.join(CSV_DELIMITER));
  });

  return lines.join('\n');
}

/* Toate tabelele panoului activ, separate prin linie goală. */
function panelToCSV(panel) {
  return Array.from(panel.querySelectorAll('table'))
    .map(tableToCSV)
    .filter((csv) => csv.length > 0)
    .join('\n\n');
}

function downloadCSV(filename, csv) {
  const blob = new Blob([CSV_BOM + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revocarea imediată poate anula descărcarea în unele browsere.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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
  initFormulaTips();
  populateYearSelect();

  // Valorile introduse anterior se restaurează ÎNAINTE de prima randare,
  // ca rezultatele afișate să corespundă cu inputurile arătate.
  persistRestore();

  renderSimulator();
  renderFood();
  renderInflationChart('all');
  renderDeflator();
  renderTimp();
  renderDobanda();
  renderCompusa();
  renderRandament();
  renderDi();
  renderRegula72();
  renderFond();
  renderOportunitate();
  renderBuget();
  renderSanatate();

  // Orice modificare a unui input/select se salvează (cu debounce).
  document.addEventListener('input', (event) => {
    if (isPersistable(event.target)) persistSave();
  });
  document.addEventListener('change', (event) => {
    if (isPersistable(event.target)) persistSave();
  });

  // Butonul global „Resetează tot" — toate cele 9 taburi la valorile din Excel.
  const resetAllBtn = document.getElementById('reset-all');
  if (resetAllBtn) {
    resetAllBtn.addEventListener('click', () => {
      resetAll();
      const active = document.querySelector('.tabs .tab.is-active');
      if (active) active.focus();
    });
  }

  // Butonul „Descarcă CSV" — tabelele panoului activ.
  const exportCsvBtn = document.getElementById('export-csv');
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      const panel = document.querySelector('.tab-panel.is-active');
      if (!panel) return;
      const csv = panelToCSV(panel);
      if (csv.trim()) downloadCSV('glitchcoin-' + activeTabId() + '.csv', csv);
    });
  }

  // Simulator: recalculează la fiecare modificare
  document.getElementById('sim-suma').addEventListener('input', renderSimulator);
  document.getElementById('sim-rata').addEventListener('input', renderSimulator);
  document.querySelectorAll('.presets .chip[data-rata]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById('sim-rata').value = btn.dataset.rata;
      renderSimulator();
      persistSave();
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
  document.getElementById('timp-zile-lucratore').addEventListener('input', () => {
    renderTimp();
    renderBuget(); // bugetul folosește aceleași zile lucrătoare
  });

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

  // Dobânda vs inflatie (N4)
  ['di-suma', 'di-randament', 'di-inflatie']
    .forEach((id) => document.getElementById(id).addEventListener('input', renderDi));

  // Regula 72 (N10)
  ['r72-rata', 'r72-suma', 'r72-ani']
    .forEach((id) => document.getElementById(id).addEventListener('input', renderRegula72));
  document.querySelectorAll('.presets .chip[data-r72]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById('r72-rata').value = btn.dataset.r72;
      renderRegula72();
      persistSave();
    });
  });

  // Fond de urgență (N1)
  ['fu-cheltuieli', 'fu-dobanda', 'fu-impozit', 'fu-suma', 'fu-economie']
    .forEach((id) => document.getElementById(id).addEventListener('input', renderFond));
  document.getElementById('fu-luni').addEventListener('change', renderFond);

  // Costul oportunității (N5)
  ['co-suma', 'co-ani', 'co-randament', 'co-impozit', 'co-comisioane', 'co-inflatie']
    .forEach((id) => document.getElementById(id).addEventListener('input', renderOportunitate));

  // Buget 50/30/20 (N2)
  ['bg-venit', 'bg-nevoi', 'bg-dorinte', 'bg-economii']
    .forEach((id) => document.getElementById(id).addEventListener('input', renderBuget));

  // Sănătate financiară (N13)
  ['sf-venit', 'sf-cheltuieli', 'sf-economii', 'sf-datorii-lunar', 'sf-rezerva', 'sf-active', 'sf-datorii']
    .forEach((id) => document.getElementById(id).addEventListener('input', renderSanatate));

  // Legături între taburi (prefill + salt)
  document.getElementById('bg-go-timp').addEventListener('click', () => {
    goToTab('timp', {
      'timp-venit': Math.max(0, readNumber(document.getElementById('bg-venit'))),
      'timp-pret': Math.max(0, readNumber(document.getElementById('bg-dorinte'))),
    });
  });

  document.getElementById('timp-go-buget').addEventListener('click', () => {
    goToTab('buget', {
      'bg-venit': Math.max(0, readNumber(document.getElementById('timp-venit'))),
    });
  });

  document.getElementById('sf-go-fond').addEventListener('click', () => {
    goToTab('fond', {
      'fu-cheltuieli': Math.max(0, readNumber(document.getElementById('sf-cheltuieli'))),
      'fu-economie': Math.max(0, readNumber(document.getElementById('sf-economii'))),
      'fu-suma': Math.max(0, readNumber(document.getElementById('sf-rezerva'))),
    });
  });

  document.getElementById('sf-go-buget').addEventListener('click', () => {
    const venit = Math.max(0, readNumber(document.getElementById('sf-venit')));
    const cheltuieli = Math.max(0, readNumber(document.getElementById('sf-cheltuieli')));
    const economii = Math.max(0, readNumber(document.getElementById('sf-economii')));
    goToTab('buget', {
      'bg-venit': venit,
      'bg-nevoi': cheltuieli,
      'bg-economii': economii,
      'bg-dorinte': Math.max(0, venit - cheltuieli - economii),
    });
  });

  document.getElementById('fu-go-sanatate').addEventListener('click', () => {
    goToTab('sanatate', {
      'sf-cheltuieli': Math.max(0, readNumber(document.getElementById('fu-cheltuieli'))),
      'sf-rezerva': Math.max(0, readNumber(document.getElementById('fu-suma'))),
      'sf-economii': Math.max(0, readNumber(document.getElementById('fu-economie'))),
    });
  });

  // Profit
  renderProfit();
  ['prof-suma', 'prof-pret-init', 'prof-pret-vanzare', 'prof-impozit', 'prof-comisioane', 'prof-inflatie']
    .forEach((id) => document.getElementById(id).addEventListener('input', renderProfit));

  // Corecție C3: „Tipul de venit" setează impozitul implicit (Randament / Profit).
  [
    ['rand-tip-venit', 'rand-impozit', renderRandament],
    ['prof-tip-venit', 'prof-impozit', renderProfit],
  ].forEach(([tipId, impozitId, render]) => {
    const select = document.getElementById(tipId);
    if (select) {
      select.addEventListener('change', () => {
        const tip = IMPOZIT_TIPURI[select.value];
        const input = document.getElementById(impozitId);
        if (tip && input) {
          input.value = String(tip.rata);
          render();
        }
      });
    }
  });

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
