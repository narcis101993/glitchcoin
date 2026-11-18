/* GlitchCoin v2 — logica aplicației.
   Totul se calculează în browser, pe acest calculator. Fără backend, fără conturi. */
'use strict';

/* Format internațional: virgulă pentru mii, punct pentru zecimale
   (5,000.00 lei / 0.3% / 1.10x). Nu mai folosim ro-RO, care dădea 5.000,00. */
const LOCALE = 'en-US';
const AN_CURENT = CONFIG_AN.anCurent; // anul „prezent” (singura sursă: CONFIG_AN din data.js)

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

/* Procent cu număr minim de zecimale: 1% → „1%", 0.3% → „0.3%", 2,5% → „2,5%".
   Util pentru ratele mici (comisioane), unde rotunjirea la 0 zecimale ar da „0%".
   Se rotunjește mai întâi, ca să evităm artefactul în virgulă mobilă (0.07 × 100 ≠ 7). */
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

/* ── Prospețimea datelor (P0/2) ───────────────────────────────
   Textele de mai jos NU sunt literale: se construiesc din CONFIG_AN (data.js).
   Când se actualizează anul, se schimbă doar configul, nu și interfața. */
const LUNI_SCURTE_RO = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/* Link de verificare pentru nota fiscală. Exact linkul ANAF deja citat în
   sursele panoului N7 și în pagina Despre; nu ating IMPOZIT_SURSE (tabelul N7). */
const SURSA_COD_FISCAL = {
  nume: 'Codul fiscal/ANAF',
  url: 'http://static.anaf.ro/static/10/Anaf/legislatie/L_227_2015.htm',
};

/* „2026-11-12” → „12 nov 2026”. Formatul datei din config e ISO (YYYY-MM-DD). */
function textDataActualizate() {
  const [an, luna, zi] = CONFIG_AN.actualizatLa.split('-').map(Number);
  return `Date actualizate: ${zi} ${LUNI_SCURTE_RO[luna - 1]} ${an}`;
}

/* Eticheta din config e „oct 2026 vs dec 2025, parțial”: împărțim la virgulă
   ca să obținem perioada + calificativul, fără să scriem „oct”/„parțial” aici.
   Toate cifrele, inclusiv rata oct/oct, folosesc LOCALE = en-US (6.9%). */
function textEtichetaInflatie() {
  const eticheta = CONFIG_AN.inflatie.eticheta;
  const virgula = eticheta.indexOf(',');
  const perioada = (virgula === -1 ? eticheta : eticheta.slice(0, virgula)).trim();
  const calificativ = virgula === -1 ? '' : eticheta.slice(virgula + 1).trim();
  const prefix = calificativ ? `${calificativ}: ` : '';
  const rata = fmtPctSmart(CONFIG_AN.inflatie.rataOctOct);
  return `${CONFIG_AN.anCurent} = ${prefix}${perioada}; rata oct/oct = ${rata}`;
}

/* Cotele afișate în nota de context vin din CONFIG_AN.coteFiscale,
   același obiect care alimentează selectul de impozit (IMPOZIT_TIPURI). */
function textContextFiscal() {
  const c = CONFIG_AN.coteFiscale;
  return `Cotele ${CONFIG_AN.anCurent} (${c.vmRo}/${c.vmRoScurt}/${c.vmStrain}%, ` +
    `dividende ${c.dividende}%) — verifică întotdeauna Codul fiscal/ANAF în vigoare.`;
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
/* Scenariile A/B au prefix DISTINCT: „Resetează tot” curăță doar inputurile
   (`glitchcoin-input:` / `glitchcoin-table:` / `glitchcoin-tab`), nu și
   snapshoturile pe care utilizatorul le-a salvat explicit. */
const AB_PREFIX = 'glitchcoin-scenario:';
const PERSIST_DEBOUNCE_MS = 300;
let persistTimer = null;

/* Valorile implicite pentru tabelele dinamice (identice cu cele din HTML).
   Sunt singura sursă de adevăr pentru reset — `COST_ROWS_DEFAULT` / `NUAM_ROWS_DEFAULT`
   de mai jos sunt initialize din ele, ca să nu existe două liste care să se diveră. */
/* Comision implicit 0,4% (0,004 fracție) = media comisioanelor de cumpărare la BVB pe acțiuni
   (0,33%: TradeVille 0,38%, Investimental 0,41%, Salt Bank 0,25%, IB 0,28%) + taxa ASF 0,06%.
   Sursă: anexele oficiale de comisioane ale brokerilor, verificate 18.11.2026 și citate în
   tabul „Costul mediu de achiziție". */
const COST_DEFAULTS = [
  { pret: 28.81, cantitate: 24, comision: 0.004 },
  { pret: 27.75, cantitate: 144, comision: 0.004 },
  { pret: 32.89, cantitate: 4, comision: 0.004 },
  { pret: 34.4, cantitate: 30, comision: 0.004 },
];

const NUAM_DEFAULTS = [
  { nume: 'Curent', zi: 15, suma: 100 },
  { nume: 'Gaz', zi: 16, suma: 150 },
  { nume: 'Apă', zi: 18, suma: 50 },
  { nume: 'Card de credit luna precedentă', zi: 25, suma: 2000 },
  { nume: 'Abonament mobil', zi: 30, suma: 50 },
  { nume: 'Abonament internet', zi: 30, suma: 80 },
];

/* Anul implicit din tabul „Deflator”. */
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
  { key: 'glitchcoin-table:diversificare', get: () => dvRows, set: (rows) => { dvRows = rows; } },
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
    try { localStorage.setItem('glitchcoin-tab', activeTabId() || ''); } catch (e) { /* blocat */ }
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
    // fără stocare locală: se folosesc valorile implicite din HTML
  }
}

function persistClear() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PERSIST_PREFIX) && !k.startsWith(AB_PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    // dacă stocarea e blocată, nu avem ce șterge
  }
}

/* ── Buton „Resetează tot" ───────────────────────────────── */

/* Revine la valorile implicite:
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

  dvRows = DV_ROWS_DEFAULT.map((r) => ({ ...r }));
  renderDvRows();
  renderDiversificare();

  // Toate taburile se recalculează cu noile valori.
  renderQuick();
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
  renderAsigurare();
  renderStres();
  renderPensie();
  renderImpozitare();
  renderDatorii();
  renderDca();
  renderCurs();
  resetBiase();

  persistClear();       // „Resetează tot” = curăță inputurile; scenariile A/B rămân (le șterge doar butonul dedicat)
  persistSaveNow();     // pentru ca la refresh să revină la valorile implicite
}

/* ── Temă (light / dark) ─────────────────────────────────── */

const THEME_KEY = 'glitchcoin-theme';
/* Culoarea barei browserului (theme-color) pentru fiecare temă. */
const THEME_COLORS = { light: '#f6f7f4', dark: '#0c1110' };

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

/* Pentru calculele de putere de cumpărare, anul parțial (2026) folosește media
   pe 12 luni din CONFIG_AN, nu rata YTD afișată în serie — o rată oct/dec nu e
   o rată anuală și nu poate compara doi ani calendaristici. */
/* Rata de referință pentru puterea de cumpărare: media pe 12 luni din CONFIG_AN
   (nu rata YTD, care nu compară doi ani calendaristici). */
const RATA_REFERINTA_REAL = CONFIG_AN.inflatie.rataPutereCumparare;

const RATE_PUTERE_BY_YEAR = Object.fromEntries(
  GLITCHCOIN_DATA.inflation.map((d) => [
    d.year,
    d.partial ? CONFIG_AN.inflatie.rataPutereCumparare : d.rate,
  ]),
);

/* Corecție C3 — impozitul pe tipuri de venit (România, anul din CONFIG_AN).
   Selectul „Tipul de venit" (taburile Randament și Profit) setează impozitul
   implicit; utilizatorul îl poate apoi modifica manual. Sunt rate reale,
   nu valori generice (10% supraestimează impozitul pentru acțiuni păstrate
   mai mult de un an prin broker românesc). Cotele vin din CONFIG_AN.coteFiscale;
   obiectul păstrează numele și etichetele folosite deja în UI și în teste. */
const IMPOZIT_TIPURI = {
  'dobandi':     { rata: CONFIG_AN.coteFiscale.dobanda,   eticheta: 'Dobândă (depozite, obligațiuni RO)' },
  'dividende':   { rata: CONFIG_AN.coteFiscale.dividende, eticheta: 'Dividende' },
  'vm-ro':       { rata: CONFIG_AN.coteFiscale.vmRo,      eticheta: 'Valori mobiliere · broker RO · ≥ 1 an' },
  'vm-ro-scurt': { rata: CONFIG_AN.coteFiscale.vmRoScurt, eticheta: 'Valori mobiliere · broker RO · < 1 an' },
  'vm-strain':   { rata: CONFIG_AN.coteFiscale.vmStrain,  eticheta: 'Valori mobiliere · broker străin / crypto' },
};

/* v3 — aceleași tipuri de venit, cu cotele din 2025 (PwC/EY/ANAF). Selectul
   „Anul de aplicare” din Randament și Profit schimbă cota implicită. */
const IMPOZIT_TIPURI_2025 = {
  'dobandi': 10, 'dividende': 10, 'vm-ro': 1, 'vm-ro-scurt': 3, 'vm-strain': 10,
};
const IMPOZIT_ANI = [2025, CONFIG_AN.anCurent];

function impozitPentruAn(tip, an) {
  const sursa = Number(an) === 2025 ? IMPOZIT_TIPURI_2025 : IMPOZIT_TIPURI;
  const valoare = sursa[tip];
  return typeof valoare === 'number' ? valoare : valoare?.rata;
}

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
    `Cu <strong>${fmtLei(suma)}</strong> acum, în anul 2 vei avea nevoie de <strong>${fmtLei(dupaAn[2].valoare)}</strong>, ` +
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

const FOOD_YEARS = [2020, 2021, 2022, 2023, 2024, 2025, CONFIG_AN.anCurent];

/* Creștere față de 2020 — anul curent vine din CONFIG_AN; 2026 e parțial
   (estimare metodologică). Valorile max/min sunt expuse și în CONFIG_DERIVAT. */
function foodGrowth(product) {
  return product.prices[CONFIG_AN.anCurent] / product.prices[2020] - 1;
}

function renderFood() {
  const chart = document.getElementById('food-chart');
  clearChartTips(chart);
  document.getElementById('food-table-body').innerHTML = GLITCHCOIN_DATA.food.map((p) => `
    <tr>
      <td>${escapeHtml(p.name)}</td>
      ${FOOD_YEARS.map((an) => `<td class="num">${p.prices[an].toLocaleString(LOCALE)}${an >= 2025 ? '<sup class="est-mark" aria-label=" estimare">*</sup>' : ''}</td>`).join('')}
      <td class="num strong">${fmtPct(foodGrowth(p))}</td>
    </tr>`).join('');

  const max = Math.max(...GLITCHCOIN_DATA.food.map(foodGrowth));
  const min = Math.min(...GLITCHCOIN_DATA.food.map(foodGrowth));
  const prodMax = GLITCHCOIN_DATA.food.find((p) => foodGrowth(p) === max);
  const prodMin = GLITCHCOIN_DATA.food.find((p) => foodGrowth(p) === min);
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
    `Creștere 2026 vs 2020, pe produs. Maxim: ${fmtPct(max)} la ${prodMax.name}; minim: ${fmtPct(min)} la ${prodMin.name}.`);

  // Tooltip cu cifrele reale pentru fiecare bară (hover + focus).
  [...chart.querySelectorAll('.bar-row')].forEach((row, i) => {
    const p = GLITCHCOIN_DATA.food[i];
    const growth = foodGrowth(p);
    const pret2020 = fmtLei(p.prices[2020]);
    const pret2026 = fmtLei(p.prices[2026]);
    attachChartTip(row,
      `${p.name}: creștere ${fmtPct(growth)}, preț 2020 ${pret2020}, preț 2026 ${pret2026}`,
      `<strong>${escapeHtml(p.name)}</strong><span class="tip-text">Creștere 2026 vs 2020: <b>${fmtPct(growth)}</b>` +
      `<br>Preț 2020: ${pret2020}<br>Preț 2026 (parțial): ${pret2026}</span>`);
  });
}

/* ═══ 3. Inflația 1991–2026 ═════════════════════════════ */

function renderInflationChart(range = 'all') {
  const chart = document.getElementById('inflation-chart');
  clearChartTips(chart);
  const date = GLITCHCOIN_DATA.inflation.filter((d) => (range === 'recent' ? d.year >= 2000 : true));
  const maxAbs = Math.max(...date.map((d) => Math.abs(d.rate)));
  const labelMod = range === 'recent' ? 0 : 1; // 1991, 1996, … / 2000, 2005, …

  chart.innerHTML = date.map((d) => {
    const pozitiv = d.rate >= 0;
    const inaltime = (Math.abs(d.rate) / maxAbs) * 100;
    const bara = `<div class="vbar ${pozitiv ? 'vbar-pos' : 'vbar-neg'}" aria-hidden="true" style="height:${inaltime.toFixed(2)}%"></div>`;
    const eticheta = d.year % 5 === labelMod ? d.year : '';
    return `
      <div class="vcol">
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

  // Tooltip cu rata fiecărui an (hover + focus), în loc de title-ul nativ.
  [...chart.querySelectorAll('.vcol')].forEach((col, i) => {
    const d = date[i];
    attachChartTip(col,
      `${d.year}: inflație ${fmtPct(d.rate)}`,
      `<strong>${d.year}</strong><span class="tip-text">Rată anuală: <b>${fmtPct(d.rate)}</b></span>`);
  });

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
    produs *= 1 + (RATE_PUTERE_BY_YEAR[y] ?? 0);
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

/* Constantele tabulului „Timp vs dorințe”.
   Corecții C5 și C11: zilele lucrătoare vin din CONFIG_AN (România: 365 − 104
   weekend − CONFIG_AN.sarbatoriLegale sărbători legale); 30.44 zile/lună
   (365 ÷ 12) e o medie calendaristică, nu depinde de an.
   Din 2026-11-13 numărul de zile lucrătoare e un INPUT (cerință Narcis): utilizatorul
   îl poate schimba, iar valoarea implicită rămâne cea din CONFIG_AN. */
const TIMP_ZILE_LUNA = 365 / 12;     // 30.44 — media reală de zile pe lună (365/12)
const TIMP_LUNI_AN = 12;             // luni într-un an (venitul anual = 12 × venitul lunar)
const TIMP_ORE_ZI = 24;              // venitul pe oră = venit pe zi / 24
const TIMP_MINUTE_ORA = 60;          // venitul pe minut = venit pe oră / 60
const TIMP_ORE_LUCRATOARE = 8;       // venitul pe oră lucrătoare = zi lucrătoare / 8
const TIMP_ZILE_AN = 365;            // zile într-un an calendaristic
const TIMP_ZILE_LUCRATOARE_AN_DEFAULT = CONFIG_AN.zileLucratoare; // alias cu numele vechi

/* Zilele lucrătoare dintr-un an se citesc din inputul „Zile lucrătoare / an”.
   Orice valoare invalidă, nulă sau negativă revine la CONFIG_AN.zileLucratoare — altfel am împărți la zero. */
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
  // (365/12): 250/12 = 20,83. Venitul pe zi lucrătoare = venitul anual lucrător ÷ zilele
  // lucrătoare din an. (Un divisor fix de 20 ar presupune 240 de zile lucrătoare, nu 250.)
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
  // ca să nu rămână 250 dacă utilizatorul a setat altă valoare.
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

/* Rotunjește la 2 zecimale, ca funcția ROUND standard. */
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

/* Constantele tabulului „Dobânda compusă”. */
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
     Creștere anuală(n) = I(n) / G(n-1) − 1   (din anul 2) */
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
    // Când rată = 0, formula cu divizare la (rată/12) dă eroare — limita ei e suma plătită.
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

/* Formulele tabulului „Randament”:
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

/* Formulele tabulului „Profit”:
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

/* Valorile implicite ale tabulului „Costul mediu” (comisionul e fracție, nu procent).
   Se initializează din COST_DEFAULTS (mai sus), ca să existe o singură sursă pentru reset. */
const COST_ROWS_DEFAULT = COST_DEFAULTS;

let costRows = COST_ROWS_DEFAULT.map((r) => ({ ...r }));

/* Formula:
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
    // Comisionul e introdus în procente și ținut intern ca fracție.
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
    costRows.push({ pret: 0, cantitate: 0, comision: 0.004 }); // aceeași valoare cu COST_DEFAULTS
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

/* Formula: -PMT(randament/12, ani*12, suma inițială, sumă dorită).
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
  const ids = ['suma-economie', 'suma-total-economisit', 'suma-dobanda', 'suma-real', 'suma-final'];
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
  document.getElementById('suma-real').textContent =
    fmtLei(sumaDorita / Math.pow(1 + RATA_REFERINTA_REAL, ani));
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

/* ═══ 12. „Nu am bani" (scenariu avansat) ═══════════ */

/* Constantele formulelor:
   — impozitul pe dobândă e 10% (hardcodat);
   — simularea acoperă zilele de la venit până la ziua 30. */
const NUAM_IMPOZIT_DOBANDA = 0.10;
const NUAM_ZIUA_FINALA = 30;

/* Valorile implicite ale tabulului „Nu am bani”.
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
const DI_ANI_END = 2026;

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

/* Seria istorică 2000–2026 (INS, IPC național) aplicată unei rate
   nominale constante: arată de ce un depozit „sigur” poate fi
   negativ real — banii cresc nominal, dar prețurile cresc mai repede. */
function computeIstoricReal(nominal, suma) {
  const ani = GLITCHCOIN_DATA.inflation.filter((d) => d.year >= DI_ANI_START && d.year <= DI_ANI_END);
  let produsInflatie = 1;
  const rows = ani.map((d) => {
    const rata = RATE_PUTERE_BY_YEAR[d.year];
    produsInflatie *= 1 + rata;
    return {
      an: d.year,
      inflatie: rata,
      real: (1 + nominal) / (1 + rata) - 1,
      partial: Boolean(d.partial),
    };
  });

  const medie = rows.reduce((a, b) => a + b.real, 0) / rows.length;
  const minim = rows.reduce((a, b) => (b.real < a.real ? b : a));
  const maxim = rows.reduce((a, b) => (b.real > a.real ? b : a));
  const numarNegativi = rows.filter((r) => r.real < 0).length;

  // Suma din 2000 adusă în 2026: cash-ul își pierde puterea de cumpărare
  // cu produsul inflației; la randament nominal compus, crește cu
  // (1 + nominal)^număr de ani, apoi se aduce la puterea de cumpărare din 2026.
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
      <td>${row.an}${row.partial ? ' *' : ''}</td>
      <td class="num">${fmtPct(row.inflatie)}</td>
      <td class="num strong">${fmtPct(row.real)}</td>
    </tr>`).join('');

  document.getElementById('di-istoric-stats').innerHTML = `
    <span>Medie reală ${DI_ANI_START}–${DI_ANI_END}: <strong>${fmtPct(istoric.medie)}</strong></span>
    <span>Minim: <strong>${fmtPct(istoric.minim.real)}</strong> (${istoric.minim.an})</span>
    <span>Maxim: <strong>${fmtPct(istoric.maxim.real)}</strong> (${istoric.maxim.an})</span>
    <span>Ani cu randament real negativ: <strong>${istoric.numarNegativi}</strong> din ${istoric.rows.length}</span>` +
    ` <span>${CONFIG_AN.anCurent} e parțial: pentru puterea de cumpărare se folosește media pe 12 luni (${fmtPct(CONFIG_AN.inflatie.rataPutereCumparare)}).</span>`;

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
  const dobandaRealPct = r.tinta > 0
    ? (1 + r.dobandaNet / r.tinta) / (1 + RATA_REFERINTA_REAL) - 1
    : 0;
  document.getElementById('fu-dobanda-real').textContent = fmtLei(r.tinta * dobandaRealPct);
  paintSign('fu-dobanda-real', dobandaRealPct);
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

/* ═══ 19. Diversificare și riscul (N3) ══════════════════ */

const DV_SEED = 20261116;      // seed fix: simularea e deterministă și reproducibilă
const DV_SIMULATII = 5000;
const DV_ANI = 5;
const DV_DEFAULTS = [
  { nume: 'Acțiuni', randament: 8, volatilitate: 20, pondere: 50 },
  { nume: 'Obligațiuni', randament: 5, volatilitate: 6, pondere: 30 },
  { nume: 'Depozit', randament: 3.5, volatilitate: 0, pondere: 20 },
];

const DV_ROWS_DEFAULT = DV_DEFAULTS;
let dvRows = DV_ROWS_DEFAULT.map((r) => ({ ...r }));

/* PRNG determinist (mulberry32). Același seed → aceeași secvență, ca rezultatele
   simulării să fie reproducibile și verificabile. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Normală standard din două uniforme (Box-Muller, varianta cos). */
function randn(rng) {
  const u1 = Math.max(rng(), 1e-12);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/* Descompunere Cholesky (L × Lᵀ = A), pentru matrice de covarianță. */
function cholesky(A) {
  const n = A.length;
  const L = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = A[i][j];
      for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
      if (i === j) {
        if (s <= 0) return null; // nu e pozitiv definită
        L[i][j] = Math.sqrt(s);
      } else {
        L[i][j] = s / L[j][j];
      }
    }
  }
  return L;
}

/* Cuantila `p` dintr-un vector sortat (interpolare liniară, tip 7). */
function quantile(sorted, p) {
  const n = sorted.length;
  if (!n) return null;
  const pos = (n - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function statsFinale(arr, suma) {
  const sorted = [...arr].sort((a, b) => a - b);
  return {
    mediana: quantile(sorted, 0.5),
    p5: quantile(sorted, 0.05),
    p95: quantile(sorted, 0.95),
    minim: sorted[0],
    maxim: sorted[sorted.length - 1],
    probPierdere: arr.filter((v) => v < suma).length / arr.length,
  };
}

function statsDrawdown(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  return { mediana: quantile(sorted, 0.5), p90: quantile(sorted, 0.9) };
}

/* Randamentul și volatilitatea portofoliului, plus activul individual cel mai
   tentant (randamentul așteptat maxim). Toate valorile interne sunt fracții. */
function computeDiversificare(rows, corelarePct = 30, rfPct = 3.5) {
  const n = rows.length;
  const pondereTotala = rows.reduce((s, r) => s + Math.max(0, r.pondere), 0);
  if (n === 0 || pondereTotala <= 0) {
    return { valid: false, n: 0, pondereTotala };
  }
  const w = rows.map((r) => Math.max(0, r.pondere) / pondereTotala);
  const r = rows.map((x) => x.randament / 100);
  const s = rows.map((x) => Math.max(0, x.volatilitate) / 100);
  const rho = Math.max(-1, Math.min(1, corelarePct / 100));

  let rP = 0;
  let sMedie = 0;
  for (let i = 0; i < n; i++) {
    rP += w[i] * r[i];
    sMedie += w[i] * s[i];
  }

  let varP = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const c = i === j ? 1 : rho;
      varP += w[i] * w[j] * s[i] * s[j] * c;
    }
  }
  const sP = Math.sqrt(Math.max(0, varP));
  const rf = rfPct / 100;

  let idx = 0;
  for (let i = 1; i < n; i++) if (r[i] > r[idx]) idx = i;

  return {
    valid: true,
    n,
    pondereTotala,
    w, r, s, rho,
    rP,
    sP,
    sMedie,
    reducere: sMedie - sP,
    reducerePct: sMedie > 0 ? 1 - sP / sMedie : null,
    sharpeP: sP > 0 ? (rP - rf) / sP : null,
    drawdownP: 2 * sP,
    idx,
    numeA: rows[idx].nume || `Activul ${idx + 1}`,
    rA: r[idx],
    sA: s[idx],
    sharpeA: s[idx] > 0 ? (r[idx] - rf) / s[idx] : null,
    drawdownA: 2 * s[idx],
  };
}

/* Simulare Monte Carlo pe `ani` ani, cu randamente normale corelate.
   Returnează statisticile pentru portofoliu și pentru activul `idx`. */
function simuleazaDiversificare(rows, corelarePct = 30, opt = {}) {
  const { suma = 10000, simulatii = DV_SIMULATII, ani = DV_ANI, seed = DV_SEED } = opt;
  const c = computeDiversificare(rows, corelarePct, 0);
  if (!c.valid) return { valid: false };

  const n = c.n;
  const cov = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      cov[i][j] = c.s[i] * c.s[j] * (i === j ? 1 : c.rho);
    }
  }
  let L = cholesky(cov);
  if (!L) {
    // Matricea nu e pozitiv definită (corelație prea negativă pentru n) → independente.
    L = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? c.s[i] : 0)));
  }

  const rng = mulberry32(seed);
  const finalsP = [];
  const finalsA = [];
  const ddP = [];
  const ddA = [];

  for (let sim = 0; sim < simulatii; sim++) {
    let vp = suma;
    let peakP = suma;
    let mddP = 0;
    let va = suma;
    let peakA = suma;
    let mddA = 0;

    for (let t = 0; t < ani; t++) {
      const eps = Array.from({ length: n }, () => randn(rng));
      const z = new Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        let acc = 0;
        for (let k = 0; k <= i; k++) acc += L[i][k] * eps[k];
        z[i] = acc;
      }

      let rp = c.rP;
      for (let i = 0; i < n; i++) rp += c.w[i] * z[i];
      vp *= 1 + rp;
      if (vp > peakP) peakP = vp;
      const dd = (peakP - vp) / peakP;
      if (dd > mddP) mddP = dd;

      const ra = c.r[c.idx] + z[c.idx];
      va *= 1 + ra;
      if (va > peakA) peakA = va;
      const dda = (peakA - va) / peakA;
      if (dda > mddA) mddA = dda;
    }

    finalsP.push(vp);
    finalsA.push(va);
    ddP.push(mddP);
    ddA.push(mddA);
  }

  return {
    valid: true,
    simulatii,
    ani,
    suma,
    numeA: c.numeA,
    p: statsFinale(finalsP, suma),
    a: statsFinale(finalsA, suma),
    ddP: statsDrawdown(ddP),
    ddA: statsDrawdown(ddA),
  };
}

/* Rândurile tabelului de active: se reconstruiesc doar la adăugare/ștergere/reset,
   ca inputurile să-și păstreze focalizarea în timpul tastării. */
function renderDvRows() {
  const tbody = document.getElementById('dv-body');
  tbody.replaceChildren();

  dvRows.forEach((row, i) => {
    const tr = document.createElement('tr');

    const tdIndex = document.createElement('td');
    tdIndex.textContent = String(i + 1);
    tr.appendChild(tdIndex);

    const adaugaInput = (field, value, ariaLabel, max = null) => {
      const td = document.createElement('td');
      const input = document.createElement('input');
      input.type = field === 'nume' ? 'text' : 'number';
      input.className = 'cell-input';
      input.dataset.field = field;
      input.value = String(value);
      if (field !== 'nume') {
        input.min = '0';
        input.step = 'any';
        input.setAttribute('inputmode', 'decimal');
      }
      if (max !== null) input.max = String(max);
      input.setAttribute('aria-label', ariaLabel);
      td.appendChild(input);
      tr.appendChild(td);
      return input;
    };

    adaugaInput('nume', row.nume, `Rândul ${i + 1}: numele activului`);
    adaugaInput('randament', row.randament, `Rândul ${i + 1}: randament anual așteptat, procente`, 1000);
    adaugaInput('volatilitate', row.volatilitate, `Rândul ${i + 1}: volatilitate anuală, procente`, 1000);
    adaugaInput('pondere', row.pondere, `Rândul ${i + 1}: pondere, procente`, 100);

    const tdDelete = document.createElement('td');
    const btnDelete = document.createElement('button');
    btnDelete.type = 'button';
    btnDelete.className = 'row-delete';
    btnDelete.dataset.index = String(i);
    btnDelete.setAttribute('aria-label', `Șterge activul ${i + 1}`);
    btnDelete.textContent = 'Șterge';
    if (dvRows.length <= 1) btnDelete.disabled = true; // păstrăm cel puțin un activ
    tdDelete.appendChild(btnDelete);
    tr.appendChild(tdDelete);

    tbody.appendChild(tr);
  });
}

/* v3 — simularea Monte Carlo (5.000 × 5 ani) e amânată cu un tick ca să nu
   blocheze întâi statusul „Se calculează…” și restul interfeței pe mobil.
   Tokenul ignoră rezultatele învechite când utilizatorul schimbă inputurile. */
let simulareToken = 0;

function renderDiversificareSimulare(sim) {
  if (!sim || !sim.valid) return;

  if (sim.valid) {
    document.getElementById('dv-t-med-p').textContent = fmtLei(sim.p.mediana);
    document.getElementById('dv-t-med-a').textContent = fmtLei(sim.a.mediana);
    document.getElementById('dv-t-p5-p').textContent = fmtLei(sim.p.p5);
    document.getElementById('dv-t-p5-a').textContent = fmtLei(sim.a.p5);
    document.getElementById('dv-t-p95-p').textContent = fmtLei(sim.p.p95);
    document.getElementById('dv-t-p95-a').textContent = fmtLei(sim.a.p95);
    document.getElementById('dv-t-pl-p').textContent = fmtPct(sim.p.probPierdere);
    document.getElementById('dv-t-pl-a').textContent = fmtPct(sim.a.probPierdere);
    document.getElementById('dv-t-ddm-p').textContent = fmtPct(sim.ddP.mediana);
    document.getElementById('dv-t-ddm-a').textContent = fmtPct(sim.ddA.mediana);
  }}

/* Rulează simularea după ce browserul a avut timp să picteze statusul. */
function programeazaSimulare(rows, corelare, suma) {
  const status = document.getElementById('dv-sim-status');
  if (status) status.textContent = 'Se calculează simularea (5.000 de scenarii)…';
  const token = ++simulareToken;
  setTimeout(() => {
    if (token !== simulareToken) return;
    renderDiversificareSimulare(simuleazaDiversificare(rows, corelare, { suma }));
    if (status) status.textContent = '';
  }, 0);
}

function renderDiversificare() {
  const suma = Math.max(0, readNumber(document.getElementById('dv-suma')));
  const corelare = Math.max(-100, Math.min(100, readNumber(document.getElementById('dv-corelare'), 30)));
  const rf = Math.max(0, Math.min(100, readNumber(document.getElementById('dv-rf'), 3.5)));

  const c = computeDiversificare(dvRows, corelare, rf);

  const summary = document.getElementById('dv-summary');
  const alertesBox = document.getElementById('dv-alerte');

  if (!c.valid) {
    summary.textContent = 'Introdu cel puțin un activ cu pondere mai mare decât zero.';
    alertesBox.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'alert is-warn';
    p.textContent = 'Portofoliul nu poate fi calculat: ponderile sunt zero sau lipsesc.';
    alertesBox.appendChild(p);
    return;
  }

  document.getElementById('dv-randament').textContent = fmtPct(c.rP);
  document.getElementById('dv-volatilitate').textContent = fmtPct(c.sP);
  document.getElementById('dv-reducere').textContent =
    c.reducerePct === null ? '—' : '−' + fmtPct(c.reducerePct);
  document.getElementById('dv-sharpe').textContent = fmtNum(c.sharpeP, 2);

  document.getElementById('dv-t-nume-a').textContent = c.numeA;
  document.getElementById('dv-t-r-p').textContent = fmtPct(c.rP);
  document.getElementById('dv-t-r-a').textContent = fmtPct(c.rA);
  document.getElementById('dv-t-v-p').textContent = fmtPct(c.sP);
  document.getElementById('dv-t-v-a').textContent = fmtPct(c.sA);
  document.getElementById('dv-t-dd-p').textContent = fmtPct(c.drawdownP);
  document.getElementById('dv-t-dd-a').textContent = fmtPct(c.drawdownA);
  document.getElementById('dv-t-sh-p').textContent = fmtNum(c.sharpeP, 2);
  document.getElementById('dv-t-sh-a').textContent = fmtNum(c.sharpeA, 2);

  programeazaSimulare(dvRows, corelare, suma);

  // Scenarii pe un an: randamentul portofoliului și al activului, la z deviații standard.
  const scenBody = document.getElementById('dv-scen-body');
  scenBody.replaceChildren();
  [-3, -2, -1, 0, 1, 2, 3].forEach((z) => {
    const rp = c.rP + z * c.sP;
    const ra = c.rA + z * c.sA;
    const tr = document.createElement('tr');
    const celule = [
      `${z > 0 ? '+' : ''}${z}σ`,
      fmtPct(rp),
      fmtLei(suma * (1 + rp)),
      fmtPct(ra),
      fmtLei(suma * (1 + ra)),
    ];
    celule.forEach((text, i) => {
      const td = document.createElement('td');
      if (i > 0) td.className = 'num';
      td.textContent = text;
      tr.appendChild(td);
    });
    scenBody.appendChild(tr);
  });

  summary.innerHTML =
    `Randament portofoliu <strong>${fmtPct(c.rP)}</strong> · volatilitate <strong>${fmtPct(c.sP)}</strong> ` +
    `(media ponderată ar fi <strong>${fmtPct(c.sMedie)}</strong>). ` +
    `Diversificarea reduce volatilitatea cu <strong>${fmtPct(c.reducere)}</strong> ` +
    `(−${c.reducerePct === null ? '—' : fmtPct(c.reducerePct)}). ` +
    `Cel mai tentant activ e <strong>${escapeHtml(c.numeA)}</strong> ` +
    `(randament ${fmtPct(c.rA)}, volatilitate ${fmtPct(c.sA)}).`;

  const alertes = [];
  if (c.rho >= 0.9) {
    alertes.push({
      nivel: 'warn',
      text: 'Corelația e aproape de 100%: activele se mișcă împreună și diversificarea nu te protejează.',
    });
  }
  const pondereMax = Math.max(...c.w);
  if (pondereMax > 0.8) {
    alertes.push({
      nivel: 'warn',
      text: `Un activ reprezintă ${fmtPct(pondereMax)} din portofoliu — riscul e concentrat într-un singur activ.`,
    });
  }
  if (c.sharpeP !== null && c.sharpeA !== null && c.sharpeP > c.sharpeA) {
    alertes.push({
      nivel: 'ok',
      text: `Portofoliul are un randament ajustat la risc mai bun (${fmtNum(c.sharpeP, 2)}) decât ${escapeHtml(c.numeA)} (${fmtNum(c.sharpeA, 2)}).`,
    });
  }
  if (alertes.length === 0) {
    alertes.push({ nivel: 'ok', text: 'Portofoliul e diversificat și volatilitatea e sub media volatilităților.' });
  }
  renderAlerts('dv-alerte', alertes);
}

function initDiversificare() {
  renderDvRows();
  renderDiversificare();

  const tbody = document.getElementById('dv-body');

  tbody.addEventListener('input', (event) => {
    const input = event.target;
    if (!input.dataset || !input.dataset.field) return;
    const tr = input.closest('tr');
    const index = Array.from(tbody.querySelectorAll('tr')).indexOf(tr);
    if (index === -1) return;

    const field = input.dataset.field;
    if (field === 'nume') {
      dvRows[index].nume = input.value;
    } else {
      const value = parseFloat(input.value);
      dvRows[index][field] = Number.isFinite(value) ? value : 0;
    }
    renderDiversificare();
  });

  tbody.addEventListener('click', (event) => {
    const btn = event.target.closest('.row-delete');
    if (!btn) return;
    const index = Number(btn.dataset.index);
    if (!Number.isInteger(index) || index < 0 || index >= dvRows.length) return;
    if (dvRows.length <= 1) return;
    dvRows.splice(index, 1);
    renderDvRows();
    renderDiversificare();
    persistSave();
  });

  document.getElementById('dv-add').addEventListener('click', () => {
    dvRows.push({ nume: `Activ ${dvRows.length + 1}`, randament: 5, volatilitate: 10, pondere: 10 });
    renderDvRows();
    renderDiversificare();
    persistSave();
    const trs = tbody.querySelectorAll('tr');
    const input = trs[trs.length - 1] && trs[trs.length - 1].querySelector('input[data-field="nume"]');
    if (input) input.focus();
  });

  document.getElementById('dv-reset').addEventListener('click', () => {
    dvRows = DV_ROWS_DEFAULT.map((r) => ({ ...r }));
    renderDvRows();
    renderDiversificare();
    persistSave();
  });

  ['dv-suma', 'dv-corelare', 'dv-rf'].forEach((id) => {
    document.getElementById(id).addEventListener('input', renderDiversificare);
  });
}

/* ═══ 20. Asigurări (N8) ═══════════════════════════════ */

const AS_PRESETS = {
  sanatate: { prima: 2000, suma: 20000, probabilitate: 8 },
  casa: { prima: 500, suma: 150000, probabilitate: 1 },
  masina: { prima: 1500, suma: 25000, probabilitate: 6 },
  personalizat: null,
};
const AS_NUME_RISC = { sanatate: 'Sănătate', casa: 'Casă', masina: 'Mașină' };

function computeAsigurare(prima, suma, probabilitatePct, ani, dobandaPct) {
  const p = Math.min(1, Math.max(0, probabilitatePct / 100));
  const r = Math.max(0, dobandaPct / 100);
  const n = Math.max(1, Math.round(ani));

  const costPrimeNominal = prima * n;
  const costPrimeDobanda = r > 0 ? prima * (Math.pow(1 + r, n) - 1) / r : prima * n;
  const pierdereAnuala = p * suma;
  const pierdereTotala = pierdereAnuala * n;
  const diferentaAnuala = prima - pierdereAnuala;
  const diferentaTotala = costPrimeNominal - pierdereTotala;
  const probCelPutinOData = 1 - Math.pow(1 - p, n);
  const aniMedie = p > 0 ? 1 / p : null;

  return {
    p, n, prima, suma,
    costPrimeNominal,
    costPrimeDobanda,
    pierdereAnuala,
    pierdereTotala,
    diferentaAnuala,
    diferentaTotala,
    probCelPutinOData,
    aniMedie,
  };
}

function renderAsigurare() {
  const prima = Math.max(0, readNumber(document.getElementById('as-prima')));
  const suma = Math.max(0, readNumber(document.getElementById('as-suma')));
  const probabilitate = Math.max(0, Math.min(100, readNumber(document.getElementById('as-probabilitate'), 8)));
  const ani = Math.max(1, Math.min(100, readNumber(document.getElementById('as-ani'), 10)));
  const dobanda = Math.max(0, Math.min(100, readNumber(document.getElementById('as-dobanda'), 3.5)));

  const r = computeAsigurare(prima, suma, probabilitate, ani, dobanda);

  document.getElementById('as-cost-prime').textContent = fmtLei(r.costPrimeDobanda);
  document.getElementById('as-pierdere-anuala').textContent = fmtLei(r.pierdereAnuala);
  document.getElementById('as-diferenta').textContent = fmtLei(r.diferentaAnuala);
  paintSign('as-diferenta', r.diferentaAnuala);
  document.getElementById('as-prob').textContent = fmtPct(r.probCelPutinOData);

  // Tabelul comparativ: asigurare vs auto-asigurare.
  document.getElementById('as-t-cost-an-asig').textContent = fmtLei(prima);
  document.getElementById('as-t-cost-an-auto').textContent = fmtLei(r.pierdereAnuala);
  document.getElementById('as-t-cost-n-asig').textContent = fmtLei(r.costPrimeDobanda);
  document.getElementById('as-t-cost-n-auto').textContent = fmtLei(r.pierdereTotala);
  document.getElementById('as-t-eveniment-asig').textContent = fmtLei(0);
  document.getElementById('as-t-eveniment-auto').textContent = fmtLei(suma);
  document.getElementById('as-t-risc-asig').textContent = fmtLei(0);
  document.getElementById('as-t-risc-auto').textContent = fmtLei(suma);
  document.getElementById('as-t-lichid-asig').textContent = fmtLei(prima);
  document.getElementById('as-t-lichid-auto').textContent = fmtLei(suma);

  // Exemplele ilustrative (presetele), cu aceiași formulă.
  const presetsBody = document.getElementById('as-presets-body');
  presetsBody.replaceChildren();
  Object.keys(AS_NUME_RISC).forEach((cheie) => {
    const pre = AS_PRESETS[cheie];
    const calc = computeAsigurare(pre.prima, pre.suma, pre.probabilitate, ani, dobanda);
    const tr = document.createElement('tr');
    [AS_NUME_RISC[cheie], fmtLei(pre.prima), fmtLei(pre.suma), fmtPct(calc.p), fmtLei(calc.pierdereAnuala)]
      .forEach((text, i) => {
        const td = document.createElement('td');
        if (i > 0) td.className = 'num';
        td.textContent = text;
        tr.appendChild(td);
      });
    presetsBody.appendChild(tr);
  });

  const summary = document.getElementById('as-summary');
  summary.innerHTML =
    `Primă <strong>${fmtLei(prima)}</strong> pe an · pierdere așteptată <strong>${fmtLei(r.pierdereAnuala)}</strong> pe an. ` +
    `Diferența <strong>${fmtLei(r.diferentaAnuala)}</strong> pe an e prețul transferului de risc ` +
    `(administrare, marjă și liniște). În ${r.n} ani, șansa de cel puțin un eveniment e ` +
    `<strong>${fmtPct(r.probCelPutinOData)}</strong>.`;

  const alertes = [];
  if (suma <= 0 || prima <= 0) {
    alertes.push({ nivel: 'warn', text: 'Introdu prima și suma asigurată pentru a compara asigurarea cu auto-asigurarea.' });
  } else if (r.diferentaAnuala > 0) {
    alertes.push({
      nivel: 'warn',
      text: `Prima depășește pierderea anuală așteptată cu ${fmtLei(r.diferentaAnuala)}: diferența e prețul liniștii și al marjelor asiguratorului.`,
    });
  } else if (r.diferentaAnuala < 0) {
    alertes.push({
      nivel: 'warn',
      text: `Pierderea așteptată depășește prima cu ${fmtLei(-r.diferentaAnuala)}: în medie auto-asigurarea pare mai ieftină, dar rămâi expus la o pierdere mare.`,
    });
  }
  if (r.probCelPutinOData > 0.5) {
    alertes.push({
      nivel: 'warn',
      text: `În ${r.n} ani, șansa de cel puțin un eveniment e ${fmtPct(r.probCelPutinOData)} — probabilitățile mici se acumulează.`,
    });
  }
  if (alertes.length === 0) {
    alertes.push({ nivel: 'ok', text: 'Primă și pierdere așteptată sunt apropiate: decizia depinde de lichiditate și de toleranța la risc.' });
  }
  renderAlerts('as-alerte', alertes);
}

function initAsigurari() {
  renderAsigurare();

  const select = document.getElementById('as-tip');
  select.addEventListener('change', () => {
    const pre = AS_PRESETS[select.value];
    if (!pre) return; // „Personalizat” — se păstrează valorile introduse
    document.getElementById('as-prima').value = String(pre.prima);
    document.getElementById('as-suma').value = String(pre.suma);
    document.getElementById('as-probabilitate').value = String(pre.probabilitate);
    renderAsigurare();
  });

  ['as-prima', 'as-suma', 'as-probabilitate', 'as-ani', 'as-dobanda'].forEach((id) => {
    document.getElementById(id).addEventListener('input', renderAsigurare);
  });
}

/* ═══ 21. Stress test (N15) ════════════════════════════ */

const ST_SCENARII = {
  personalizat: null,
  inflatie10: { inflatie: 10, scadereVenit: 0, randament: 0 },
  recesiune: { inflatie: 3, scadereVenit: 20, randament: -20 },
  soc: { inflatie: 10, scadereVenit: 20, randament: -20 },
};
const ST_SCEN_ACTIVE = [
  { nume: 'Optimist', probabilitate: 0.25, randament: 0.10 },
  { nume: 'Bază', probabilitate: 0.50, randament: 0 },
  { nume: 'Pesimist', probabilitate: 0.25, randament: null }, // din input
];

function computeStres(venit, cheltuieli, economii, rezerva, active, luni, inflatiePct, scaderePct, randamentPct) {
  const ani = luni / 12;
  const inflF = inflatiePct / 100;
  const factorInfl = inflF > -1 ? Math.pow(1 + inflF, ani) : null;

  const cheltuieliNoi = factorInfl !== null ? cheltuieli * factorInfl : null;
  const venitNou = venit * (1 - Math.min(1, Math.max(0, scaderePct / 100)));
  const soldLunar = cheltuieliNoi !== null ? venitNou - cheltuieliNoi : null;
  const luniRezerva = soldLunar !== null && soldLunar < 0 ? (rezerva > 0 ? rezerva / -soldLunar : 0) : null;
  const rezervaMinima = cheltuieliNoi !== null ? cheltuieliNoi * 3 : null;
  const putereEconomii = factorInfl !== null && factorInfl > 0 ? economii / factorInfl : null;

  const randF = randamentPct / 100;
  const activeNoi = active * (1 + randF);
  const pierdereActive = Math.max(0, active - activeNoi);
  const randamentRevenire = active > 0 && activeNoi > 0 && activeNoi < active ? active / activeNoi - 1 : null;

  const scenarii = ST_SCEN_ACTIVE.map((s) => {
    const rand = s.randament === null ? randF : s.randament;
    return { nume: s.nume, probabilitate: s.probabilitate, randament: rand, valoare: active * (1 + rand) };
  });
  const valoareAsteptata = scenarii.reduce((acc, s) => acc + s.probabilitate * s.valoare, 0);
  const pesimist = scenarii.find((s) => s.nume === 'Pesimist');

  return {
    ani, factorInfl, cheltuieliNoi, venitNou, soldLunar, luniRezerva, rezervaMinima,
    putereEconomii, activeNoi, pierdereActive, randamentRevenire,
    scenarii, valoareAsteptata, valoarePesimist: pesimist.valoare,
  };
}

function renderStres() {
  const venit = Math.max(0, readNumber(document.getElementById('st-venit')));
  const cheltuieli = Math.max(0, readNumber(document.getElementById('st-cheltuieli')));
  const economii = Math.max(0, readNumber(document.getElementById('st-economii')));
  const rezerva = Math.max(0, readNumber(document.getElementById('st-rezerva')));
  const active = Math.max(0, readNumber(document.getElementById('st-active')));
  const luni = Math.max(1, Math.min(600, readNumber(document.getElementById('st-luni'), 12)));
  const inflatie = readNumber(document.getElementById('st-inflatie'), 10);
  const scadere = Math.max(0, Math.min(100, readNumber(document.getElementById('st-scadere'), 20)));
  const randament = readNumber(document.getElementById('st-randament'), -20);

  const r = computeStres(venit, cheltuieli, economii, rezerva, active, luni, inflatie, scadere, randament);

  document.getElementById('st-venit-nou').textContent = fmtLei(r.venitNou);
  document.getElementById('st-cheltuieli-noi').textContent =
    r.cheltuieliNoi === null ? '—' : fmtLei(r.cheltuieliNoi);
  document.getElementById('st-sold-lunar').textContent =
    r.soldLunar === null ? '—' : fmtLei(r.soldLunar);
  paintSign('st-sold-lunar', r.soldLunar);
  document.getElementById('st-luni-rezerva').textContent =
    r.luniRezerva === null ? 'deficit inexistent' : fmtNum(r.luniRezerva, 1) + ' luni';
  document.getElementById('st-putere-economii').textContent =
    r.putereEconomii === null ? '—' : fmtLei(r.putereEconomii);
  paintSign('st-putere-economii', r.putereEconomii === null ? null : r.putereEconomii - economii);
  document.getElementById('st-active-noi').textContent = fmtLei(r.activeNoi);
  document.getElementById('st-pierdere-active').textContent =
    r.pierdereActive > 0 ? fmtLei(r.pierdereActive) : 'nicio pierdere';
  paintSign('st-pierdere-active', -r.pierdereActive);
  document.getElementById('st-randament-revenire').textContent =
    r.randamentRevenire === null ? '—' : fmtPct(r.randamentRevenire);

  // Scenariile pentru active + valoarea așteptată.
  const scenBody = document.getElementById('st-scen-body');
  scenBody.replaceChildren();
  r.scenarii.forEach((s) => {
    const tr = document.createElement('tr');
    [s.nume, fmtPct(s.probabilitate, 0), fmtPct(s.randament), fmtLei(s.valoare)].forEach((text, i) => {
      const td = document.createElement('td');
      if (i > 0) td.className = 'num';
      td.textContent = text;
      tr.appendChild(td);
    });
    scenBody.appendChild(tr);
  });
  const trAsteptata = document.createElement('tr');
  ['Valoarea așteptată (media ponderată)', '100%', '—', fmtLei(r.valoareAsteptata)].forEach((text, i) => {
    const td = document.createElement('td');
    if (i > 0) td.className = 'num';
    td.textContent = text;
    trAsteptata.appendChild(td);
  });
  scenBody.appendChild(trAsteptata);

  const summary = document.getElementById('st-summary');
  summary.innerHTML =
    `Venit sub stres <strong>${fmtLei(r.venitNou)}</strong>, cheltuieli esențiale ajustate ` +
    `<strong>${r.cheltuieliNoi === null ? '—' : fmtLei(r.cheltuieliNoi)}</strong>, ` +
    `sold lunar <strong>${r.soldLunar === null ? '—' : fmtLei(r.soldLunar)}</strong>. ` +
    (r.luniRezerva === null
      ? `Rezerva nu e necesară în acest scenariu. `
      : `Rezerva acoperă <strong>${fmtNum(r.luniRezerva, 1)} luni</strong> de deficit. `) +
    `Activele ajung la <strong>${fmtLei(r.activeNoi)}</strong>, iar valoarea așteptată e ` +
    `<strong>${fmtLei(r.valoareAsteptata)}</strong>.`;

  const alertes = [];
  if (venit <= 0) {
    alertes.push({ nivel: 'warn', text: 'Introdu venitul lunar net pentru a testa bugetul sub stres.' });
  }
  if (r.soldLunar !== null && r.soldLunar < 0) {
    alertes.push({
      nivel: 'bad',
      text: `Bugetul e în deficit cu ${fmtLei(-r.soldLunar)} pe lună sub stres.`,
    });
  }
  if (r.luniRezerva !== null && r.luniRezerva < 3) {
    alertes.push({
      nivel: r.luniRezerva < 1 ? 'bad' : 'warn',
      text: `Rezerva acoperă doar ${fmtNum(r.luniRezerva, 1)} luni de deficit — sub minimul de 3 luni.`,
    });
  }
  if (r.factorInfl !== null && r.factorInfl > 1) {
    alertes.push({
      nivel: 'warn',
      text: `Inflația erodează puterea de cumpărare cu ${fmtPct(1 - 1 / r.factorInfl)} pe perioada de ${luni} luni.`,
    });
  }
  if (r.pierdereActive > 0) {
    alertes.push({
      nivel: 'warn',
      text: `Activele pierd ${fmtLei(r.pierdereActive)}; pentru revenirea la valoarea inițială ai nevoie de ${r.randamentRevenire === null ? '—' : fmtPct(r.randamentRevenire)}.`,
    });
  }
  if (alertes.length === 0) {
    alertes.push({ nivel: 'ok', text: 'Planul rezistă la acest scenariu: bugetul nu e în deficit și activele nu pierd valoare.' });
  }
  renderAlerts('st-alerte', alertes);
}

function initStres() {
  renderStres();

  const select = document.getElementById('st-scenariu');
  select.addEventListener('change', () => {
    const pre = ST_SCENARII[select.value];
    if (!pre) return; // „Personalizat” — se păstrează valorile introduse
    document.getElementById('st-inflatie').value = String(pre.inflatie);
    document.getElementById('st-scadere').value = String(pre.scadereVenit);
    document.getElementById('st-randament').value = String(pre.randament);
    renderStres();
  });

  ['st-venit', 'st-cheltuieli', 'st-economii', 'st-rezerva', 'st-active', 'st-luni',
    'st-inflatie', 'st-scadere', 'st-randament'].forEach((id) => {
    document.getElementById(id).addEventListener('input', renderStres);
  });
}

/* ═══ 22. Pensie / Pilon III (N6) ═══════════════════════ */

/* Valori ilustrative, nu recomandări. Randamentul mediu al fondurilor de
   pensii facultative (Pilon III) pe 2007–2025 (ultimul an complet) a fost 6.7% pe an, calculat de
   APAPR din datele ASF, față de o inflație medie de 4.9%. Comisioanele din
   schemele autorizate: 3–5% din contribuție (maxim 5%) + 0.091–0.195% lunar
   din activul net (maxim 0.2% pe lună) — echivalent de ~1.5% pe an. */
const PN_SCENARII = {
  istoric: { randament: 6.7, inflatie: 4.9 },
  conservator: { randament: 4, inflatie: 4.9 },
  optimist: { randament: 9, inflatie: 4.9 },
  personalizat: null,
};

/* Valoarea acumulată la un orizont, cu compunere lunară:
   suma inițială × (1+r)^n + contribuția × ((1+r)^n − 1) ÷ r. */
function pensieValoareLa(suma, contributie, r, n) {
  if (r > 0) return suma * Math.pow(1 + r, n) + contributie * (Math.pow(1 + r, n) - 1) / r;
  return suma * Math.pow(1 + r, n) + contributie * n; // rată nulă sau negativă
}

function computePensie({ varsta, pensionare, contributie, suma, randament, comision, impozit, inflatie }) {
  const aniBrut = Math.round(pensionare) - Math.round(varsta);
  const valid = aniBrut >= 1;
  const ani = Math.max(1, Math.min(45, aniBrut));
  const luni = ani * 12;
  const rBrut = randament / 100 / 12;
  const rCost = Math.max(-0.5, (randament - comision) / 100 / 12);
  const rInfl = Math.max(-0.9, inflatie / 100);
  const cotaImpozit = Math.max(0, Math.min(1, impozit / 100));

  const finalBrut = pensieValoareLa(suma, contributie, rBrut, luni);
  const finalCost = pensieValoareLa(suma, contributie, rCost, luni);
  const contributii = suma + contributie * luni;
  const castigBrut = finalBrut - contributii;
  const costComisioane = Math.max(0, finalBrut - finalCost);
  const castigImpozabil = Math.max(0, finalCost - contributii);
  const impozitLei = castigImpozabil * cotaImpozit;
  const finalNet = finalCost - impozitLei;
  const valoareReala = finalNet / Math.pow(1 + rInfl, ani);

  // Randament anual efectiv: brut minus comisionul anual — aceeași convenție
  // ca „randament net = brut × (1 − impozit − comisioane)” din taburile
  // Randament și Profit. Diferența exactă în lei e `costComisioane`.
  const randEfectiv = (randament - comision) / 100;
  const randReal = (1 + randEfectiv) / (1 + rInfl) - 1;

  const rows = [];
  for (let an = 1; an <= ani; an++) {
    const n = an * 12;
    const contributiiAn = suma + contributie * n;
    const brut = pensieValoareLa(suma, contributie, rBrut, n);
    const cost = pensieValoareLa(suma, contributie, rCost, n);
    const impozitAn = Math.max(0, cost - contributiiAn) * cotaImpozit;
    rows.push({
      an,
      contributii: contributiiAn,
      brut,
      cost,
      impozit: impozitAn,
      net: cost - impozitAn,
    });
  }

  return {
    valid, ani, luni, randament, comision, inflatie,
    finalBrut, finalCost, contributii, castigBrut, costComisioane,
    castigImpozabil, impozitLei, finalNet, valoareReala,
    randEfectiv, randReal, rows,
  };
}

/* Inputurile tabului Pensie, curățate (valori numerice, plafonate). */
function citestePensie() {
  return {
    varsta: Math.round(readNumber(document.getElementById('pn-varsta'), 25)),
    pensionare: Math.round(readNumber(document.getElementById('pn-pensionare'), 65)),
    contributie: Math.max(0, readNumber(document.getElementById('pn-contributie'))),
    suma: Math.max(0, readNumber(document.getElementById('pn-suma'))),
    randament: Math.max(-20, Math.min(100, readNumber(document.getElementById('pn-randament'), 6.7))),
    comision: Math.max(0, Math.min(20, readNumber(document.getElementById('pn-comision'), 1.5))),
    impozit: Math.max(0, Math.min(100, readNumber(document.getElementById('pn-impozit'), 10))),
    inflatie: Math.max(-20, Math.min(100, readNumber(document.getElementById('pn-inflatie'), 4.9))),
  };
}

function renderPensie() {
  const { varsta, pensionare, contributie, randament, comision, inflatie } = citestePensie();

  const r = computePensie(citestePensie());

  const summary = document.getElementById('pn-summary');

  if (!r.valid) {
    summary.textContent = 'Vârsta la pensionare trebuie să fie mai mare decât vârsta acum.';
    ['pn-final-brut', 'pn-final-cost', 'pn-final-net', 'pn-contributii', 'pn-castig',
      'pn-impozit-lei', 'pn-cost-comisioane', 'pn-rand-efectiv', 'pn-valoare-reala']
      .forEach((id) => {
        const el = document.getElementById(id);
        el.textContent = '—';
        el.classList.remove('is-pos', 'is-neg');
      });
    document.getElementById('pn-evol-body').replaceChildren();
    renderAlerts('pn-alerte', [{ nivel: 'bad', text: 'Introdu o vârstă de pensionare mai mare decât vârsta actuală.' }]);
    return;
  }

  document.getElementById('pn-final-brut').textContent = fmtLei(r.finalBrut);
  document.getElementById('pn-final-cost').textContent = fmtLei(r.finalCost);
  document.getElementById('pn-final-net').textContent = fmtLei(r.finalNet);
  document.getElementById('pn-contributii').textContent = fmtLei(r.contributii);
  document.getElementById('pn-castig').textContent = fmtLei(r.castigBrut);
  paintSign('pn-castig', r.castigBrut);
  document.getElementById('pn-impozit-lei').textContent = fmtLei(r.impozitLei);
  document.getElementById('pn-cost-comisioane').textContent = fmtLei(r.costComisioane);
  paintSign('pn-cost-comisioane', -r.costComisioane);
  document.getElementById('pn-rand-efectiv').textContent = fmtPct(r.randEfectiv);
  document.getElementById('pn-valoare-reala').textContent = fmtLei(r.valoareReala);

  const body = document.getElementById('pn-evol-body');
  body.replaceChildren();
  r.rows.forEach((row) => {
    const tr = document.createElement('tr');
    [String(row.an), fmtLei(row.contributii), fmtLei(row.brut), fmtLei(row.cost),
      fmtLei(row.impozit), fmtLei(row.net)].forEach((text, i) => {
      const td = document.createElement('td');
      if (i > 0) td.className = 'num';
      td.textContent = text;
      tr.appendChild(td);
    });
    body.appendChild(tr);
  });

  summary.innerHTML =
    `În <strong>${r.ani} de ani</strong>, cu <strong>${fmtLei(contributie)}</strong> pe lună, se acumulează ` +
    `<strong>${fmtLei(r.finalBrut)}</strong> brut. Comisioanele de <strong>${fmtPct(comision / 100, 1)}</strong> ` +
    `costă <strong>${fmtLei(r.costComisioane)}</strong>, iar impozitul pe câștig ` +
    `<strong>${fmtLei(r.impozitLei)}</strong> — rămâi cu <strong>${fmtLei(r.finalNet)}</strong>, ` +
    `adică <strong>${fmtLei(r.valoareReala)}</strong> în putere de cumpărare de astăzi. ` +
    `Randamentul efectiv după comisioane e <strong>${fmtPct(r.randEfectiv)}</strong> pe an, ` +
    `iar cel real <strong>${fmtPct(r.randReal)}</strong>.`;

  const alertes = [];
  if (pensionare - varsta < 10) {
    alertes.push({
      nivel: 'warn',
      text: `Orizont de doar ${r.ani} ani: compunerea face diferența pe 20–30 de ani, nu pe câteva.`,
    });
  }
  if (comision > 2) {
    alertes.push({
      nivel: 'warn',
      text: `Comisionul anual de ${fmtPct(comision / 100, 1)} e mare: costă ${fmtLei(r.costComisioane)} pe ${r.ani} de ani.`,
    });
  } else if (r.finalBrut > 0 && r.costComisioane / r.finalBrut > 0.15) {
    alertes.push({
      nivel: 'warn',
      text: `Comisioanele reprezintă ${fmtPct(r.costComisioane / r.finalBrut)} din valoarea brută — un cost ascuns, dar real.`,
    });
  }
  if (randament < inflatie) {
    alertes.push({
      nivel: 'warn',
      text: `Randamentul brut (${fmtPct(randament / 100, 1)}) e sub inflația ${fmtPct(inflatie / 100, 1)}: în medie, puterea de cumpărare scade.`,
    });
  }
  if (r.finalNet < r.contributii) {
    alertes.push({
      nivel: 'bad',
      text: `Valoarea netă e sub contribuțiile vărsate: la acest randament și aceste taxe, banii tăi se erodează.`,
    });
  }
  if (contributie <= 0) {
    alertes.push({ nivel: 'warn', text: 'Introdu o contribuție lunară mai mare decât zero pentru a vedea acumularea.' });
  }
  if (alertes.length === 0) {
    alertes.push({
      nivel: 'ok',
      text: `Randamentul efectiv de ${fmtPct(r.randEfectiv)} pe an depășește inflația: compunerea lucrează pentru tine.`,
    });
  }
  renderAlerts('pn-alerte', alertes);
}

function initPensie() {
  renderPensie();

  const select = document.getElementById('pn-scenariu');
  select.addEventListener('change', () => {
    const pre = PN_SCENARII[select.value];
    if (!pre) return; // „Personalizat” — se păstrează valorile introduse
    document.getElementById('pn-randament').value = String(pre.randament);
    document.getElementById('pn-inflatie').value = String(pre.inflatie);
    renderPensie();
  });

  ['pn-varsta', 'pn-pensionare', 'pn-contributie', 'pn-suma', 'pn-randament',
    'pn-comision', 'pn-impozit', 'pn-inflatie'].forEach((id) => {
    document.getElementById(id).addEventListener('input', renderPensie);
  });
}

/* ═══ 23. Impozitare pe investiții (N7) ══════════════════ */

/* Rate reale, România, 2025 → 2026. Informativ, nu recomandare fiscală.
   Sursele sunt enumerate la finalul panoului și în tooltip-uri. */
const IMPOZIT_SURSE = {
  pwc: { nume: 'PwC', url: SURSA_PWC_RATA },
  ey: { nume: 'EY', url: 'https://www.ey.com/en_gl/technical/tax-alerts/romanian-tax-changes-introduced-by-new-fiscal-and-budgetary-measures' },
  tel: { nume: 'Tax Efficiency Lab', url: 'https://taxefficiencylab.com/romania-tax-guide' },
  oa: { nume: 'openaccountants', url: 'https://www.openaccountants.com/skills/ro-employee-income-tax' },
  rsm: { nume: 'RSM', url: 'https://www.rsm.global/romania/ro/real-estate-tax-guide-romania' },
  asf: { nume: 'ASF', url: 'https://asfromania.ro/files/pilon_III.pdf' },
};

const IMPOZIT_VENITURI = [
  {
    cheie: 'dobanzi',
    nume: 'Dobânzi — depozite, obligații RO',
    r2025: 10, r2026: 10,
    baza: 'Dobânda brută',
    cum: 'Reținut de bancă la sursă, impozit final. Titlurile de stat (tezaur) sunt neimpozabile.',
    sursa: 'oa',
  },
  {
    cheie: 'dividende',
    nume: 'Dividende',
    r2025: 10, r2026: 16,
    baza: 'Dividendul brut',
    cum: 'Reținut la sursă la distribuire; de la 01.01.2026 e 16%.',
    sursa: 'ey',
  },
  {
    cheie: 'vm-ro',
    nume: 'Valori mobiliare · broker RO · deținut ≥ 365 zile',
    r2025: 1, r2026: 3,
    baza: 'Plusvaloarea la vânzare',
    cum: 'Reținut de broker, pe fiecare câștig. Pierderile din acest regim nu se compensează.',
    sursa: 'pwc',
  },
  {
    cheie: 'vm-ro-scurt',
    nume: 'Valori mobiliare · broker RO · deținut < 365 zile',
    r2025: 3, r2026: 6,
    baza: 'Plusvaloarea la vânzare',
    cum: 'Reținut de broker, pe fiecare câștig.',
    sursa: 'pwc',
  },
  {
    cheie: 'vm-strain',
    nume: 'Valori mobiliare · broker străin / crypto',
    r2025: 10, r2026: 16,
    baza: 'Plusvaloarea anuală netă',
    cum: 'Declarat anual. Prag nedeductibil: 200 lei/tranzacție, dacă totalul anual nu depășește 600 lei.',
    sursa: 'tel',
  },
  {
    cheie: 'imob-scurt',
    nume: 'Imobiliare · vânzare · deținut ≤ 3 ani',
    r2025: 3, r2026: 3,
    baza: 'Valoarea tranzacției',
    cum: 'Reținut de notar la autentificare, pe valoarea declarată în contract.',
    sursa: 'rsm',
  },
  {
    cheie: 'imob-lung',
    nume: 'Imobiliare · vânzare · deținut > 3 ani',
    r2025: 1, r2026: 1,
    baza: 'Valoarea tranzacției',
    cum: 'Reținut de notar; cota redusă rămâne pentru deținere lungă.',
    sursa: 'rsm',
  },
  {
    cheie: 'chirii',
    nume: 'Imobiliare · venit din chirie',
    r2025: 10, r2026: 10,
    baza: 'Chiria − 20% cheltuieli deductibile',
    cum: 'Impozit pe venit, declarat (declarația unică).',
    sursa: 'rsm',
  },
  {
    cheie: 'pensie',
    nume: 'Pensie privată (Pilon III) · câștig la retragere',
    r2025: 10, r2026: 10,
    baza: 'Activul − contribuțiile vărsate',
    cum: 'Doar câștigul se impozitează. Prag lunar neimpozabil de 3.000 lei; peste prag, CASS 10%.',
    sursa: 'asf',
  },
];

/* Rata pentru anul ales (2025 / 2026); null dacă linia nu are cotă pentru anul respectiv. */
function impozitRata(linie, an) {
  return an === 2025 ? linie.r2025 : linie.r2026;
}

function computeImpozit(castig, rataPct) {
  const castigCuratat = Math.max(0, castig);
  const cota = Math.max(0, Math.min(1, rataPct / 100));
  const impozit = castigCuratat * cota;
  return { castig: castigCuratat, cota, impozit, net: castigCuratat - impozit };
}

function renderImpozitare() {
  const linie = IMPOZIT_VENITURI.find((r) => r.cheie === document.getElementById('tx-tip').value) || IMPOZIT_VENITURI[0];
  const an = Number(document.getElementById('tx-an').value) === 2025 ? 2025 : 2026;
  const castig = Math.max(0, readNumber(document.getElementById('tx-castig')));
  const rata = impozitRata(linie, an);
  const altAn = an === 2025 ? 2026 : 2025;
  const rataAlt = impozitRata(linie, altAn);

  const c = computeImpozit(castig, rata);
  const cAlt = computeImpozit(castig, rataAlt);
  const diferenta = c.impozit - cAlt.impozit;

  document.getElementById('tx-rata').textContent = fmtPctSmart(rata / 100);
  document.getElementById('tx-impozit-lei').textContent = fmtLei(c.impozit);
  document.getElementById('tx-net').textContent = fmtLei(c.net);
  document.getElementById('tx-diferenta').textContent =
    `${diferenta > 0 ? '+' : diferenta < 0 ? '−' : ''}${fmtLei(Math.abs(diferenta))}`;
  paintSign('tx-diferenta', diferenta);

  const body = document.getElementById('tx-body');
  body.replaceChildren();
  IMPOZIT_VENITURI.forEach((linie) => {
    const tr = document.createElement('tr');
    const celule = [
      linie.nume,
      fmtPctSmart(linie.r2025 / 100),
      fmtPctSmart(linie.r2026 / 100),
      linie.baza,
      linie.cum,
    ];
    celule.forEach((text, i) => {
      const td = document.createElement('td');
      if (i === 1 || i === 2) td.className = 'num';
      td.textContent = text;
      tr.appendChild(td);
    });

    const tdSursa = document.createElement('td');
    const sursa = IMPOZIT_SURSE[linie.sursa];
    if (sursa) {
      const a = document.createElement('a');
      a.href = sursa.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = sursa.nume;
      tdSursa.appendChild(a);
    }
    tr.appendChild(tdSursa);
    body.appendChild(tr);
  });

  const summary = document.getElementById('tx-summary');
  summary.innerHTML =
    `Pentru <strong>${escapeHtml(linie.nume)}</strong> în ${an}, cota e ` +
    `<strong>${fmtPctSmart(rata / 100)}</strong> pe <strong>${escapeHtml(linie.baza.toLowerCase())}</strong>: ` +
    `din <strong>${fmtLei(castig)}</strong> rămân <strong>${fmtLei(c.net)}</strong> net ` +
    `(impozit ${fmtLei(c.impozit)}). În ${altAn} aceeași sumă ar fi impozitată cu ` +
    `<strong>${fmtPctSmart(rataAlt / 100)}</strong>, adică ${fmtLei(cAlt.impozit)}.`;

  const alertes = [];
  if (castig <= 0) {
    alertes.push({ nivel: 'warn', text: 'Introdu un câștig mai mare decât zero pentru a vedea impozitul.' });
  }
  if (rataAlt > rata) {
    alertes.push({
      nivel: 'warn',
      text: `Cota va crește la ${fmtPctSmart(rataAlt / 100)} în ${altAn} (acum e ${fmtPctSmart(rata / 100)}): același câștig lasă mai puțin net.`,
    });
  }
  if (linie.cheie === 'vm-strain') {
    alertes.push({
      nivel: 'warn',
      text: 'Broker străin / crypto: impozitul se declară anual, iar pierderile se compensează cu câștigurile din aceeași sursă.',
    });
  }
  if (linie.cheie === 'pensie') {
    alertes.push({
      nivel: 'ok',
      text: 'La pensie privată se impozitează doar câștigul, nu contribuțiile vărsate — contribuțiile au fost deja impozitate la intrare.',
    });
  }
  if (alertes.length === 0) {
    alertes.push({
      nivel: 'ok',
      text: 'Cota nu s-a schimbat între 2025 și 2026 pentru acest tip de venit.',
    });
  }
  renderAlerts('tx-alerte', alertes);
}

function initImpozitare() {
  renderImpozitare();

  document.getElementById('tx-castig').addEventListener('input', renderImpozitare);
  ['tx-tip', 'tx-an'].forEach((id) => {
    document.getElementById(id).addEventListener('change', renderImpozitare);
  });
}

/* Completează cele trei locuri de context adăugate în P0/2: badge-ul global
   de prospețime, nota de lângă inflație și nota de lângă rezultatele fiscale.
   Toate textele vin din CONFIG_AN prin funcțiile de mai sus; linkurile sunt
   sursele deja folosite în panou (ANAF/Cod fiscal și PwC = [13] în raport). */
function appendTextLink(parent, sursa, text) {
  const a = document.createElement('a');
  a.href = sursa.url;
  a.target = '_blank';
  a.rel = 'noopener';
  a.textContent = text || sursa.nume;
  parent.appendChild(a);
}

function renderDataFreshness() {
  const versiune = document.getElementById('versiune-app');
  if (versiune) versiune.textContent = `v${CONFIG_AN.versiune}`;

  const badgeData = document.getElementById('badge-actualizare');
  if (badgeData) badgeData.textContent = textDataActualizate();

  const badgeInflatie = document.getElementById('badge-inflatie');
  if (badgeInflatie) badgeInflatie.textContent = textEtichetaInflatie();

  const nota = document.getElementById('tx-context-note');
  if (!nota) return;
  nota.replaceChildren();

  const text = textContextFiscal();
  const marker = 'Codul fiscal/ANAF';
  const pozitie = text.indexOf(marker);
  if (pozitie === -1) {
    nota.appendChild(document.createTextNode(text));
  } else {
    nota.appendChild(document.createTextNode(text.slice(0, pozitie)));
    appendTextLink(nota, SURSA_COD_FISCAL, marker);
    nota.appendChild(document.createTextNode(text.slice(pozitie + marker.length)));
  }
  nota.appendChild(document.createTextNode(' Sursa ratelor: '));
  appendTextLink(nota, IMPOZIT_SURSE.pwc, 'PwC Tax Summaries (raport)');
  nota.appendChild(document.createTextNode(' Nu e consultanță fiscală.'));
}

/* ═══ 24. Datorii bune vs rele (N9) ══════════════════════ */

/* Rata lunară a unei anuități constante: P·i ÷ (1 − (1+i)^−n).
   Pentru i = 0 (fără dobândă) → P ÷ n. */
function rataAnuitate(suma, i, n) {
  if (i <= 0) return suma / n;
  return suma * i / (1 - Math.pow(1 + i, -n));
}

function computeDatorii({ suma, dobanda, durata, economie, impozit, avans }) {
  const P = Math.max(0, suma);
  const r = Math.max(0, dobanda) / 100;              // dobânda anuală a creditului
  const n = Math.max(1, Math.min(600, Math.round(durata)));
  const sBrut = Math.max(0, economie) / 100;         // dobânda anuală la economii
  const cotaImpozit = Math.max(0, Math.min(1, impozit / 100));
  const X = Math.max(0, avans);
  const valid = P > 0;

  const i = r / 12;
  const sm = sBrut * (1 - cotaImpozit) / 12;         // dobânda lunară netă
  const pmt = rataAnuitate(P, i, n);

  // Scenariul A — fără anticipare.
  let b = P;
  const fara = [];
  for (let k = 1; k <= n; k++) {
    const dob = b * i;
    const plata = Math.min(pmt, b + dob);
    b = Math.max(0, b + dob - plata);
    fara.push({ luna: k, dobanda: dob, sold: b });
  }
  const costTotal = fara.reduce((acc, f) => acc + f.dobanda, 0);

  // Scenariul B — cu X lei în plus pe lună.
  let bA = P;
  const cu = [];
  for (let k = 1; k <= n * 4 && bA > 1e-9; k++) {
    const dob = bA * i;
    const plata = Math.min(pmt + X, bA + dob);
    bA = Math.max(0, bA + dob - plata);
    cu.push({ luna: k, dobanda: dob, sold: bA });
    if (bA <= 1e-9) break;
  }
  const costAntic = cu.reduce((acc, f) => acc + f.dobanda, 0);
  const luniAntic = cu.length;

  // Scenariul C — aceeași sumă X pusă la economii, la dobânda netă.
  let e = 0;
  const economii = [];
  for (let k = 1; k <= n; k++) {
    e = e * (1 + sm) + X;
    economii.push({ luna: k, valoare: e });
  }
  const valoareEconomii = e;
  const castigEconomii = valoareEconomii - X * n;

  const economisireDobanda = costTotal - costAntic;
  const randAntic = r;                               // randamentul garantat al anticipării
  const randEconomiiNet = sBrut * (1 - cotaImpozit);
  const arbitraj = randAntic - randEconomiiNet;
  const pragEconomisire = cotaImpozit < 1 ? r / (1 - cotaImpozit) : Infinity;
  const diferenta = economisireDobanda - castigEconomii;

  let verdict = '';
  if (valid) {
    if (X <= 0) verdict = 'neutral';
    else if (arbitraj > 1e-9) verdict = 'anticipare';
    else if (arbitraj < -1e-9) verdict = 'economisire';
    else verdict = 'indiferent';
  }

  // Agregare pe ani (12 luni), valori cumulative.
  const rows = [];
  let cumFara = 0;
  let cumCu = 0;
  const ani = Math.ceil(n / 12);
  for (let an = 1; an <= ani; an++) {
    const start = (an - 1) * 12;
    cumFara += fara.slice(start, start + 12).reduce((a, f) => a + f.dobanda, 0);
    cumCu += cu.slice(start, start + 12).reduce((a, f) => a + f.dobanda, 0);
    const eco = economii[Math.min(start + 11, n - 1)].valoare;
    rows.push({ an, dobandaFara: cumFara, dobandaCu: cumCu, economii: eco, diferenta: (cumFara - cumCu) - eco });
  }

  return {
    valid, P, r, n, sBrut, cotaImpozit, X, i, sm, pmt,
    costTotal, costAntic, luniAntic, economisireDobanda,
    randAntic, randEconomiiNet, arbitraj, pragEconomisire,
    valoareEconomii, castigEconomii, diferenta, verdict, rows,
  };
}

/* Inputurile tabului Datorii, curățate (valori numerice, plafonate). */
function citesteDatorii() {
  return {
    suma: Math.max(0, readNumber(document.getElementById('dt-suma'))),
    dobanda: Math.max(0, Math.min(100, readNumber(document.getElementById('dt-dobanda'), 8))),
    durata: Math.max(1, Math.min(600, Math.round(readNumber(document.getElementById('dt-durata'), 120)))),
    economie: Math.max(0, Math.min(100, readNumber(document.getElementById('dt-economie'), 5))),
    impozit: Math.max(0, Math.min(100, readNumber(document.getElementById('dt-impozit'), 10))),
    avans: Math.max(0, readNumber(document.getElementById('dt-avans'))),
  };
}

/* Textul verdictului, folosit și în sumar. */
function textVerdictDatorii(verdict) {
  return {
    anticipare: 'Anticiparea',
    economisire: 'Economisirea',
    indiferent: 'Indiferent',
    neutral: '—',
  }[verdict] || '—';
}

function renderDatorii() {
  const c = computeDatorii(citesteDatorii());
  const summary = document.getElementById('dt-summary');

  if (!c.valid) {
    summary.textContent = 'Introdu o sumă împrumutată mai mare decât zero.';
    ['dt-rata', 'dt-cost-total', 'dt-cost-antic', 'dt-economie-dobanda', 'dt-rand-antic',
      'dt-castig-economie', 'dt-prag', 'dt-diferenta', 'dt-verdict'].forEach((id) => {
      const el = document.getElementById(id);
      el.textContent = '—';
      el.classList.remove('is-pos', 'is-neg');
    });
    document.getElementById('dt-evol-body').replaceChildren();
    renderAlerts('dt-alerte', [{ nivel: 'bad', text: 'Introdu o sumă împrumutată mai mare decât zero.' }]);
    return;
  }

  document.getElementById('dt-rata').textContent = fmtLei(c.pmt);
  document.getElementById('dt-cost-total').textContent = fmtLei(c.costTotal);
  document.getElementById('dt-cost-antic').textContent = fmtLei(c.costAntic);
  document.getElementById('dt-economie-dobanda').textContent = fmtLei(c.economisireDobanda);
  paintSign('dt-economie-dobanda', c.economisireDobanda);
  document.getElementById('dt-rand-antic').textContent = fmtPct(c.randAntic);
  document.getElementById('dt-castig-economie').textContent = fmtLei(c.castigEconomii);
  paintSign('dt-castig-economie', c.castigEconomii);
  document.getElementById('dt-prag').textContent = Number.isFinite(c.pragEconomisire) ? fmtPct(c.pragEconomisire) : '—';
  document.getElementById('dt-diferenta').textContent =
    `${c.diferenta > 0 ? '+' : c.diferenta < 0 ? '−' : ''}${fmtLei(Math.abs(c.diferenta))}`;
  paintSign('dt-diferenta', c.diferenta);
  const verdictText = textVerdictDatorii(c.verdict);
  document.getElementById('dt-verdict').textContent = verdictText;

  const body = document.getElementById('dt-evol-body');
  body.replaceChildren();
  c.rows.forEach((row) => {
    const tr = document.createElement('tr');
    [String(row.an), fmtLei(row.dobandaFara), fmtLei(row.dobandaCu), fmtLei(row.economii),
      `${row.diferenta > 0 ? '+' : row.diferenta < 0 ? '−' : ''}${fmtLei(Math.abs(row.diferenta))}`]
      .forEach((text, i) => {
        const td = document.createElement('td');
        if (i > 0) td.className = 'num';
        td.textContent = text;
        tr.appendChild(td);
      });
    body.appendChild(tr);
  });

  const alertes = [];
  if (c.X <= 0) {
    alertes.push({ nivel: 'warn', text: 'Introdu o sumă lunară suplimentară pentru a compara anticiparea cu economisirea.' });
  }
  if (c.verdict === 'anticipare') {
    alertes.push({
      nivel: 'ok',
      text: `Dobânda creditului (${fmtPct(c.r)}) e mai mare decât randamentul net al economiilor (${fmtPct(c.randEconomiiNet)}): anticiparea câștigă cu diferența.`,
    });
  } else if (c.verdict === 'economisire') {
    alertes.push({
      nivel: 'warn',
      text: `Economisirea câștigă pe hârtie (${fmtPct(c.randEconomiiNet)} net vs ${fmtPct(c.r)}), dar cu risc — anticiparea e un randament garantat.`,
    });
  } else if (c.verdict === 'indiferent') {
    alertes.push({ nivel: 'ok', text: 'Dobânda creditului și randamentul net al economiilor sunt egale: e indiferent pe hârtie.' });
  }
  if (c.r === 0) {
    alertes.push({ nivel: 'warn', text: 'Fără dobândă pe credit, anticiparea nu economisește nimic — contează doar lichiditatea.' });
  }
  renderAlerts('dt-alerte', alertes);

  summary.innerHTML =
    `Cu <strong>${fmtLei(c.P)}</strong> la <strong>${fmtPct(c.r)}</strong> pe <strong>${c.n}</strong> de luni, ` +
    `rata e <strong>${fmtLei(c.pmt)}</strong>, iar costul total al creditului e <strong>${fmtLei(c.costTotal)}</strong>. ` +
    `Cu <strong>${fmtLei(c.X)}</strong> în plus pe lună, costul scade la <strong>${fmtLei(c.costAntic)}</strong> ` +
    `(economisești <strong>${fmtLei(c.economisireDobanda)}</strong>, adică ${c.luniAntic} luni în loc de ${c.n}). ` +
    `Punând aceeași sumă la <strong>${fmtPct(c.sBrut)}</strong> (${fmtPct(c.randEconomiiNet)} net), ai avea ` +
    `<strong>${fmtLei(c.valoareEconomii)}</strong>, cu <strong>${fmtLei(c.castigEconomii)}</strong> câștigat. ` +
    `Arbitrajul (dobândă − economii nete) e <strong>${c.arbitraj > 0 ? '+' : c.arbitraj < 0 ? '−' : ''}${fmtPct(Math.abs(c.arbitraj))}</strong>. ` +
    `Verdict: <strong>${verdictText}</strong>.`;
}

function initDatorii() {
  renderDatorii();

  ['dt-suma', 'dt-dobanda', 'dt-durata', 'dt-economie', 'dt-impozit', 'dt-avans']
    .forEach((id) => document.getElementById(id).addEventListener('input', renderDatorii));
}

/* ═══ 25. Scalarea în timp (DCA) (N12) ════════════════════ */

const DCA_SCENARII = {
  creste: { nume: 'Creștere lină', randament: 8, volatilitate: 0 },
  scade: { nume: 'Scădere lină', randament: 8, volatilitate: 0 },
  volatil: { nume: 'Volatil (scădere și recuperare)', randament: 0, volatilitate: 20 },
  'creste-volatil': { nume: 'Creștere cu volatilitate', randament: 8, volatilitate: 20 },
};

function computeDca({ suma, luni, randament, volatilitate, scenariu }) {
  const S = Math.max(0, suma);
  const n = Math.max(1, Math.min(600, Math.round(luni)));
  const g = randament / 100 / 12;
  const v = Math.max(0, volatilitate) / 100 / Math.sqrt(12);
  const scen = DCA_SCENARII[scenariu] ? scenariu : 'volatil';
  const valid = S > 0;

  // Căile de preț, deterministe: aceleași valori de fiecare dată,
  // ca rezultatele să fie reproducibile și testabile. Prețul e un indice (start = 100).
  const pret = [100];
  for (let k = 1; k <= n; k++) {
    let p;
    if (scen === 'creste') p = 100 * Math.pow(1 + g, k);
    else if (scen === 'scade') p = 100 * Math.pow(1 - g, k);
    else if (scen === 'creste-volatil') p = 100 * Math.pow(1 + g, k) * (1 + v * Math.sin((2 * Math.PI * k) / n));
    else p = 100 * (1 - v * Math.sin((Math.PI * k) / n)); // volatil: scădere și recuperare
    pret.push(p);
  }

  const investitie = S / n;
  const unitatiLump = S / pret[0];
  let unitatiDca = 0;
  const rows = [];
  for (let k = 0; k < n; k++) {
    const u = investitie / pret[k];
    unitatiDca += u;
    rows.push({
      luna: k + 1,
      pret: pret[k],
      investitie,
      unitati: u,
      valoareDca: unitatiDca * pret[k + 1],   // portofelul DCA acumulat, la prețul lunii
      valoareLump: unitatiLump * pret[k + 1],
    });
  }

  const costMediu = unitatiDca > 0 ? S / unitatiDca : 0;   // media armonică a prețurilor
  const pretMediu = pret.slice(0, n).reduce((a, p) => a + p, 0) / n;
  const pretFinal = pret[n];
  const valoareDca = unitatiDca * pretFinal;
  const valoareLump = unitatiLump * pretFinal;
  const diferenta = valoareDca - valoareLump;

  let verdict = '';
  if (valid) {
    if (diferenta > 1e-9) verdict = 'dca';
    else if (diferenta < -1e-9) verdict = 'lump';
    else verdict = 'indiferent';
  }

  return {
    valid, S, n, scen, pret, investitie, unitatiDca, unitatiLump,
    costMediu, pretMediu, pretFinal, valoareDca, valoareLump, diferenta,
    randDca: S > 0 ? valoareDca / S - 1 : 0,
    randLump: S > 0 ? valoareLump / S - 1 : 0,
    verdict, rows,
  };
}

/* Inputurile tabului DCA, curățate (valori numerice, plafonate). */
function citesteDca() {
  return {
    suma: Math.max(0, readNumber(document.getElementById('dc-suma'))),
    luni: Math.max(1, Math.min(600, Math.round(readNumber(document.getElementById('dc-luni'), 12)))),
    randament: Math.max(-100, Math.min(100, readNumber(document.getElementById('dc-randament'), 8))),
    volatilitate: Math.max(0, Math.min(200, readNumber(document.getElementById('dc-volatilitate'), 20))),
    scenariu: document.getElementById('dc-scenariu').value,
  };
}

function renderDca() {
  const inputDca = citesteDca();
  const c = computeDca(inputDca);
  const summary = document.getElementById('dc-summary');

  if (!c.valid) {
    summary.textContent = 'Introdu o sumă de investit mai mare decât zero.';
    ['dc-pret-final', 'dc-cost-mediu', 'dc-pret-mediu', 'dc-valoare-dca', 'dc-valoare-lump',
      'dc-diferenta', 'dc-valoare-real', 'dc-verdict'].forEach((id) => {
      const el = document.getElementById(id);
      el.textContent = '—';
      el.classList.remove('is-pos', 'is-neg');
    });
    document.getElementById('dc-body').replaceChildren();
    renderAlerts('dc-alerte', [{ nivel: 'bad', text: 'Introdu o sumă de investit mai mare decât zero.' }]);
    return;
  }

  document.getElementById('dc-pret-final').textContent = fmtNum(c.pretFinal, 2);
  document.getElementById('dc-cost-mediu').textContent = fmtNum(c.costMediu, 2);
  document.getElementById('dc-pret-mediu').textContent = fmtNum(c.pretMediu, 2);
  document.getElementById('dc-valoare-dca').textContent = fmtLei(c.valoareDca);
  document.getElementById('dc-valoare-lump').textContent = fmtLei(c.valoareLump);
  document.getElementById('dc-diferenta').textContent =
    `${c.diferenta > 0 ? '+' : c.diferenta < 0 ? '−' : ''}${fmtLei(Math.abs(c.diferenta))}`;
  paintSign('dc-diferenta', c.diferenta);
  const verdictText = { dca: 'DCA', lump: 'O dată', indiferent: 'Indiferent' }[c.verdict] || '—';
  document.getElementById('dc-verdict').textContent = verdictText;
  document.getElementById('dc-valoare-real').textContent =
    fmtLei(c.valoareDca / Math.pow(1 + RATA_REFERINTA_REAL, inputDca.luni / 12));

  const body = document.getElementById('dc-body');
  body.replaceChildren();
  c.rows.forEach((row) => {
    const tr = document.createElement('tr');
    [String(row.luna), fmtNum(row.pret, 2), fmtLei(row.investitie), fmtNum(row.unitati, 4),
      fmtLei(row.valoareDca), fmtLei(row.valoareLump)].forEach((text, i) => {
      const td = document.createElement('td');
      if (i > 0) td.className = 'num';
      td.textContent = text;
      tr.appendChild(td);
    });
    body.appendChild(tr);
  });

  const alertes = [];
  if (c.verdict === 'dca') {
    alertes.push({
      nivel: 'ok',
      text: `DCA câștigă cu ${fmtLei(c.diferenta)}: costul mediu (${fmtNum(c.costMediu, 2)}) e sub prețul mediu (${fmtNum(c.pretMediu, 2)}).`,
    });
  } else if (c.verdict === 'lump') {
    alertes.push({
      nivel: 'warn',
      text: `Investirea o dată câștigă cu ${fmtLei(-c.diferenta)}: prețul a crescut, deci primele unități sunt mai ieftine.`,
    });
  } else {
    alertes.push({ nivel: 'ok', text: 'Cele două strategii dau același rezultat în scenariul ales.' });
  }
  if (c.scen === 'volatil') {
    alertes.push({
      nivel: 'ok',
      text: 'Scenariul „volatil” e o scădere și recuperare: prețul coboară și se întoarce la start, iar DCA cumpără mai mult la prețul scăzut.',
    });
  }
  if (c.scen === 'creste-volatil') {
    alertes.push({
      nivel: 'warn',
      text: 'Creștere cu oscilații: tendința contează mai mult decât oscilațiile — investirea o dată rămâne în față.',
    });
  }
  renderAlerts('dc-alerte', alertes);

  summary.innerHTML =
    `În scenariul „<strong>${escapeHtml(DCA_SCENARII[c.scen].nume)}</strong>”, prețul ajunge la ` +
    `<strong>${fmtNum(c.pretFinal, 2)}</strong> după <strong>${c.n}</strong> de luni. DCA cumpără ` +
    `<strong>${fmtNum(c.unitatiDca, 4)}</strong> unități la costul mediu de <strong>${fmtNum(c.costMediu, 2)}</strong> ` +
    `(prețul mediu aritmetic e ${fmtNum(c.pretMediu, 2)}), în timp ce investirea o dată cumpără ` +
    `<strong>${fmtNum(c.unitatiLump, 4)}</strong>. Valoarea finală: <strong>${fmtLei(c.valoareDca)}</strong> cu DCA ` +
    `vs <strong>${fmtLei(c.valoareLump)}</strong> o dată — <strong>${verdictText}</strong>.`;
}

function initDca() {
  renderDca();

  const select = document.getElementById('dc-scenariu');
  select.addEventListener('change', () => {
    const pre = DCA_SCENARII[select.value];
    if (!pre) return; // „Personalizat” — se păstrează valorile introduse
    document.getElementById('dc-randament').value = String(pre.randament);
    document.getElementById('dc-volatilitate').value = String(pre.volatilitate);
    renderDca();
  });

  ['dc-suma', 'dc-luni', 'dc-randament', 'dc-volatilitate']
    .forEach((id) => document.getElementById(id).addEventListener('input', renderDca));
}

/* ═══ 25b. Curs de schimb și riscul valutar (N11) ══════════ */

function computeCurs({ suma, randament, curs, apreciere, ani, impozit, inflatie, pretImport }) {
  const S = Math.max(0, suma);
  const g = Math.max(-100, Math.min(100, randament)) / 100;
  const C0 = Math.max(0.0001, curs);
  const a = Math.max(-99, Math.min(100, apreciere)) / 100;
  const n = Math.max(1, Math.min(100, Math.round(ani)));
  const t = Math.max(0, Math.min(100, impozit)) / 100;
  const infl = Math.max(0, Math.min(100, inflatie)) / 100;
  const P = Math.max(0, pretImport);
  const valid = S > 0 && C0 > 0;

  const putereG = Math.pow(1 + g, n);
  const putereA = Math.pow(1 + a, n);
  const valFinal = S * putereG;                 // în valută
  const cursFinal = C0 * putereA;               // RON/valută
  const sumaRonStart = S * C0;                  // investiția inițială în RON
  const valoareRonBrut = valFinal * cursFinal;
  const castigBrut = valoareRonBrut - sumaRonStart;
  const impozitLei = castigBrut > 0 ? castigBrut * t : 0;
  const valoareRonNet = valoareRonBrut - impozitLei;
  const randNominal = (1 + g) * (1 + a) - 1;
  const randReal = (1 + randNominal) / (1 + infl) - 1;
  const contribActiv = g;
  const contribValuta = (1 + g) * a;
  const faraValutaRon = valFinal * C0;
  const efectValutar = valoareRonBrut - faraValutaRon;

  // Inflația importată: același coș, evaluat la cursul intern.
  const pretRonStart = P * C0;
  const pretRonFinal = P * cursFinal;
  const crestereImportPct = putereA - 1;
  const crestereImportReal = (1 + a) / (1 + infl) - 1;

  let verdictCurs = '';
  if (valid) {
    if (a > 1e-12) verdictCurs = 'ajuta';
    else if (a < -1e-12) verdictCurs = 'penalizeaza';
    else verdictCurs = 'neutru';
  }

  const rows = [];
  for (let k = 0; k <= n; k++) {
    const valK = S * Math.pow(1 + g, k);
    const cursK = C0 * Math.pow(1 + a, k);
    const ronK = valK * cursK;
    rows.push({
      an: k,
      valoareValuta: valK,
      curs: cursK,
      valoareRon: ronK,
      randRon: k === 0 ? 0 : ronK / sumaRonStart - 1,
      randReal: k === 0 ? 0 : (ronK / sumaRonStart) / Math.pow(1 + infl, k) - 1,
    });
  }

  return {
    valid, S, g, C0, a, n, t, infl, P,
    valFinal, cursFinal, sumaRonStart, valoareRonBrut, castigBrut,
    impozitLei, valoareRonNet, randNominal, randReal,
    contribActiv, contribValuta, faraValutaRon, efectValutar,
    pretRonStart, pretRonFinal, crestereImportPct, crestereImportReal,
    verdictCurs, rows,
  };
}

/* Inputurile tabului Curs, curățate (valori numerice, plafonate). */
function citesteCurs() {
  return {
    suma: Math.max(0, readNumber(document.getElementById('cs-suma'))),
    randament: Math.max(-100, Math.min(100, readNumber(document.getElementById('cs-randament'), 6))),
    curs: Math.max(0.0001, readNumber(document.getElementById('cs-curs'), 4.97)),
    apreciere: Math.max(-99, Math.min(100, readNumber(document.getElementById('cs-apreciere'), 2))),
    ani: Math.max(1, Math.min(100, Math.round(readNumber(document.getElementById('cs-ani'), 10)))),
    impozit: Math.max(0, Math.min(100, readNumber(document.getElementById('cs-impozit'), 10))),
    inflatie: Math.max(0, Math.min(100, readNumber(document.getElementById('cs-inflatie'), 4))),
    pretImport: Math.max(0, readNumber(document.getElementById('cs-pret-import'), 100)),
  };
}

const VERDICT_CURS_TEXT = {
  ajuta: 'Cursul ajută',
  penalizeaza: 'Cursul penalizează',
  neutru: 'Curs neutru',
};

function renderCurs() {
  const c = computeCurs(citesteCurs());
  const summary = document.getElementById('cs-summary');
  const ids = [
    'cs-val-final-valuta', 'cs-curs-final', 'cs-valoare-ron-brut', 'cs-castig-brut',
    'cs-impozit-lei', 'cs-valoare-ron-net', 'cs-rand-nominal', 'cs-rand-real',
    'cs-contrib-valuta', 'cs-verdict',
    'cs-import-ron-start', 'cs-import-ron-final', 'cs-import-crestere', 'cs-import-real',
  ];

  if (!c.valid) {
    summary.textContent = 'Introdu o sumă și un curs mai mari decât zero.';
    ids.forEach((id) => {
      const el = document.getElementById(id);
      el.textContent = '—';
      el.classList.remove('is-pos', 'is-neg');
    });
    document.getElementById('cs-body').replaceChildren();
    renderAlerts('cs-alerte', [{ nivel: 'bad', text: 'Introdu o sumă și un curs mai mari decât zero.' }]);
    return;
  }

  document.getElementById('cs-val-final-valuta').textContent = fmtNum(c.valFinal, 2);
  document.getElementById('cs-curs-final').textContent = fmtNum(c.cursFinal, 4);
  document.getElementById('cs-valoare-ron-brut').textContent = fmtLei(c.valoareRonBrut);
  document.getElementById('cs-castig-brut').textContent =
    `${c.castigBrut > 0 ? '+' : c.castigBrut < 0 ? '−' : ''}${fmtLei(Math.abs(c.castigBrut))}`;
  paintSign('cs-castig-brut', c.castigBrut);
  document.getElementById('cs-impozit-lei').textContent = fmtLei(c.impozitLei);
  document.getElementById('cs-valoare-ron-net').textContent = fmtLei(c.valoareRonNet);
  document.getElementById('cs-rand-nominal').textContent = fmtPctSafe(c.randNominal);
  paintSign('cs-rand-nominal', c.randNominal);
  document.getElementById('cs-rand-real').textContent = fmtPctSafe(c.randReal);
  paintSign('cs-rand-real', c.randReal);
  document.getElementById('cs-contrib-valuta').textContent =
    `${c.contribValuta >= 0 ? '+' : '−'}${fmtPctSafe(Math.abs(c.contribValuta))}`;
  paintSign('cs-contrib-valuta', c.contribValuta);
  document.getElementById('cs-verdict').textContent = VERDICT_CURS_TEXT[c.verdictCurs] || '—';

  document.getElementById('cs-import-ron-start').textContent = fmtLei(c.pretRonStart);
  document.getElementById('cs-import-ron-final').textContent = fmtLei(c.pretRonFinal);
  document.getElementById('cs-import-crestere').textContent = fmtPctSafe(c.crestereImportPct);
  paintSign('cs-import-crestere', c.crestereImportPct);
  document.getElementById('cs-import-real').textContent = fmtPctSafe(c.crestereImportReal);
  paintSign('cs-import-real', c.crestereImportReal);

  const body = document.getElementById('cs-body');
  body.replaceChildren();
  c.rows.forEach((row) => {
    const tr = document.createElement('tr');
    [String(row.an), fmtNum(row.valoareValuta, 2), fmtNum(row.curs, 4),
      fmtLei(row.valoareRon), fmtPctSafe(row.randRon), fmtPctSafe(row.randReal)].forEach((text, i) => {
      const td = document.createElement('td');
      if (i > 0) td.className = 'num';
      td.textContent = text;
      tr.appendChild(td);
    });
    body.appendChild(tr);
  });

  const alertes = [];
  if (c.a > 1e-12) {
    alertes.push({
      nivel: 'ok',
      text: `Valuta se apreciază cu ${fmtPctSafe(c.a)} pe an față de RON: cursul adaugă ${fmtPctSafe(c.contribValuta)} randamentului anual.`,
    });
  } else if (c.a < -1e-12) {
    alertes.push({
      nivel: 'warn',
      text: `Valuta se depreciază cu ${fmtPctSafe(-c.a)} pe an față de RON: cursul taie ${fmtPctSafe(-c.contribValuta)} din randamentul anual.`,
    });
  } else {
    alertes.push({ nivel: 'ok', text: 'Cursul rămâne constant: randamentul în RON e doar randamentul activului.' });
  }
  if (c.randReal > 1e-12) {
    alertes.push({
      nivel: 'ok',
      text: `Randamentul real în RON e ${fmtPctSafe(c.randReal)} pe an: își păstrează puterea de cumpărare.`,
    });
  } else {
    alertes.push({
      nivel: 'warn',
      text: `Randamentul real în RON e ${fmtPctSafe(c.randReal)} pe an: inflația mănâncă tot randamentul.`,
    });
  }
  if (c.P > 0 && c.crestereImportReal > 1e-12) {
    alertes.push({
      nivel: 'warn',
      text: `Coșul importat crește cu ${fmtPctSafe(c.crestereImportReal)} pe an în real, peste inflația internă.`,
    });
  }
  renderAlerts('cs-alerte', alertes);

  summary.innerHTML =
    `După <strong>${c.n}</strong> de ani, activul valorează <strong>${fmtNum(c.valFinal, 2)}</strong> ` +
    `(în valută), iar cursul ajunge la <strong>${fmtNum(c.cursFinal, 4)}</strong>. În RON: ` +
    `<strong>${fmtLei(c.valoareRonBrut)}</strong> brut, <strong>${fmtLei(c.valoareRonNet)}</strong> net. ` +
    `Randamentul anual compus e <strong>${fmtPctSafe(c.randNominal)}</strong> nominal și ` +
    `<strong>${fmtPctSafe(c.randReal)}</strong> real — <strong>${VERDICT_CURS_TEXT[c.verdictCurs]}</strong>.`;
}

function initCurs() {
  renderCurs();

  ['cs-suma', 'cs-randament', 'cs-curs', 'cs-apreciere', 'cs-ani',
    'cs-impozit', 'cs-inflatie', 'cs-pret-import']
    .forEach((id) => document.getElementById(id).addEventListener('input', renderCurs));
}

/* ═══ 25c. Biaseuri comportamentale (N14) ═════════════════ */

const BIASE_QUIZ = [
  {
    id: 'q-ancorare',
    intrebare: 'Acțiunea X a scăzut de la 100 la 60 lei. Ai cumpărat la 100. Prietenul tău o vinde la 60. Ce decizi?',
    optiuni: [
      { id: 'a', text: 'Nu o cumperi — prețul de cumpărare de 100 de lei arată că e scump.' },
      { id: 'b', text: 'Verifici valoarea actuală și dacă 60 de lei se potrivesc planului tău.', corect: true },
      { id: 'c', text: 'O cumperi imediat — „e cu 40% mai ieftină decât a fost”.' },
    ],
    explicatie: 'Ancorarea: 100 de lei e doar punctul de plecare, nu valoarea. Decizia se ia pe ce valorează acum (60), nu pe cât a costat.',
  },
  {
    id: 'q-cont',
    intrebare: 'Ai 10.000 lei la economii (2%) și 10.000 lei datorie la 8%. Ce e rațional?',
    optiuni: [
      { id: 'a', text: 'Să lași economiile în pace — sunt pentru un scop diferit.' },
      { id: 'b', text: 'Să folosești o parte din economii pentru a rambursa datoria, dacă lichiditatea rămasă e suficientă.', corect: true },
      { id: 'c', text: 'Să păstrezi datoria pentru că „așa a funcționat întotdeauna”.' },
    ],
    explicatie: 'Contul mental: banii sunt fungibili. Un leu rambursat de la 8% „câștigă” 8%, indiferent de etichetă.',
  },
  {
    id: 'q-aversiune',
    intrebare: 'O acțiune din portofel a scăzut 20%, dar planul pe termen lung rămâne valabil. Care reflex e cel mai probabil?',
    optiuni: [
      { id: 'a', text: 'Nu o vinzi cât timp nu revii la prețul de cumpărare.' },
      { id: 'b', text: 'O evaluezi la valoarea actuală și decizi conform planului.', corect: true },
      { id: 'c', text: 'Vinzi tot portofelul ca să nu mai simți pierderea.' },
    ],
    explicatie: 'Aversiunea la pierdere ne face să tratăm pierderea ca pe un eșec personal. Decizia se ia pe valoarea de mâine, nu pe cea de ieri.',
  },
  {
    id: 'q-fomo',
    intrebare: 'O acțiune urcă de trei săptămâni și toată lumea comentează despre ea. Ce procedezi?',
    optiuni: [
      { id: 'a', text: 'Cumperi imediat, ca să nu ratezi creșterea.' },
      { id: 'b', text: 'Verifici dacă se potrivește planului tău și dacă prețul e justificat de valoare.', corect: true },
      { id: 'c', text: 'Cumperi cu un credit, pentru că „acum e momentul”.' },
    ],
    explicatie: 'FOMO scurtează orizontul și elimină analiza. Regula scrisă și o pauză de 24–48 de ore reduc impulsul.',
  },
  {
    id: 'q-cadru',
    intrebare: 'Ce este adevărat despre un fond cu „comision 1%” față de unul cu „99% din banii tăi rămân”?',
    optiuni: [
      { id: 'a', text: 'Primul pare mai mic, dar ambele descriu același cost — cadrul influențează percepția.', corect: true },
      { id: 'b', text: 'Primul este cu siguranță mai ieftin.' },
      { id: 'c', text: 'Al doilea ascunde un risc mai mare.' },
    ],
    explicatie: 'Efectul de cadru: aceleași cifre, alt cadru. Compară întotdeauna costul total sau randamentul net, nu etichetele.',
  },
];

/* Numără răspunsurile corecte. `raspunsuri` mapează id-ul întrebării
   la id-ul opțiunii alese (sau null dacă încă n-a răspuns). */
function scorBiase(raspunsuri, intrebari) {
  const rezultat = { scor: 0, total: intrebari.length, raspunse: 0 };
  intrebari.forEach((intrebare) => {
    const aleasa = raspunsuri ? raspunsuri[intrebare.id] : null;
    if (!aleasa) return;
    rezultat.raspunse += 1;
    const corecta = intrebare.optiuni.find((o) => o.corect);
    if (corecta && aleasa === corecta.id) rezultat.scor += 1;
  });
  return rezultat;
}

function renderBiaseQuiz() {
  const container = document.getElementById('bq-quiz');
  if (!container) return;
  container.replaceChildren();

  BIASE_QUIZ.forEach((intrebare, index) => {
    const fs = document.createElement('fieldset');
    fs.className = 'quiz-q';
    fs.dataset.q = intrebare.id;

    const legend = document.createElement('legend');
    legend.textContent = `${index + 1}. ${intrebare.intrebare}`;
    fs.appendChild(legend);

    intrebare.optiuni.forEach((opt) => {
      const label = document.createElement('label');
      label.className = 'quiz-opt';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'bq-' + intrebare.id;
      input.value = opt.id;
      const span = document.createElement('span');
      span.textContent = `${opt.id.toUpperCase()}) ${opt.text}`;
      label.appendChild(input);
      label.appendChild(span);
      fs.appendChild(label);
    });

    const checkBtn = document.createElement('button');
    checkBtn.type = 'button';
    checkBtn.className = 'chip quiz-check';
    checkBtn.textContent = 'Verifică răspunsul';
    fs.appendChild(checkBtn);

    const feedback = document.createElement('p');
    feedback.className = 'quiz-feedback';
    feedback.setAttribute('aria-live', 'polite');
    fs.appendChild(feedback);

    container.appendChild(fs);
  });

  actualizeazaScorBiase();
}

/* Actualizează marcajul de scor din panoul de test. */
function actualizeazaScorBiase() {
  const raspunsuri = {};
  document.querySelectorAll('.quiz-q').forEach((fs) => {
    const sel = fs.querySelector('input[type="radio"]:checked');
    raspunsuri[fs.dataset.q || ''] = sel ? sel.value : null;
  });
  const s = scorBiase(raspunsuri, BIASE_QUIZ);
  const box = document.getElementById('bq-scor');
  if (!box) return s;

  if (s.raspunse === 0) {
    box.textContent = 'Alege o opțiune și apoi „Verifică răspunsul” pentru prima întrebare.';
  } else if (s.raspunse < s.total) {
    box.innerHTML = `<strong>${s.scor}</strong> din <strong>${s.raspunse}</strong> răspunsuri date sunt corecte.`;
  } else {
    let mesaj;
    if (s.scor === s.total) mesaj = 'Perfect — ai numit toate reflexele.';
    else if (s.scor >= Math.ceil(s.total / 2)) mesaj = 'Bune reflexe — revezi întrebările greșite.';
    else mesaj = 'Un bun punct de plecare — citește explicațiile și cardurile de mai sus.';
    box.innerHTML = `<strong>${s.scor} din ${s.total}</strong> corecte. ${mesaj}`;
  }
  return s;
}

/* Reîncepe testul: debifează opțiunile și golește feedback-urile. */
function resetBiase() {
  document.querySelectorAll('.quiz-q').forEach((fs) => {
    fs.classList.remove('is-ok', 'is-bad');
    fs.querySelectorAll('input[type="radio"]').forEach((r) => {
      r.disabled = false;
      r.checked = false;
    });
    fs.querySelectorAll('.quiz-opt').forEach((l) => l.classList.remove('is-correct', 'is-wrong'));
    const btn = fs.querySelector('.quiz-check');
    if (btn) btn.disabled = false;
    const fb = fs.querySelector('.quiz-feedback');
    if (fb) {
      fb.textContent = '';
      fb.className = 'quiz-feedback';
    }
  });
  actualizeazaScorBiase();
}

/* Panoul de biaseuri nu are calcul: doar scorul testului. */
function renderBiase() {
  actualizeazaScorBiase();
}

function initBiase() {
  renderBiaseQuiz();

  document.getElementById('bq-quiz').addEventListener('click', (event) => {
    const btn = event.target.closest('.quiz-check');
    if (!btn) return;
    const fs = btn.closest('.quiz-q');
    if (!fs) return;
    const intrebare = BIASE_QUIZ.find((q) => q.id === fs.dataset.q);
    const sel = fs.querySelector('input[type="radio"]:checked');
    const feedback = fs.querySelector('.quiz-feedback');
    if (!intrebare || !feedback) return;

    if (!sel) {
      feedback.textContent = 'Mai întâi alege o opțiune.';
      feedback.className = 'quiz-feedback is-warn';
      return;
    }

    const corecta = intrebare.optiuni.find((o) => o.corect);
    const ok = Boolean(corecta) && sel.value === corecta.id;
    fs.classList.add(ok ? 'is-ok' : 'is-bad');

    // Închide întrebarea: răspunsul e blocat, ca să vezi clar ce ai ales.
    fs.querySelectorAll('input[type="radio"]').forEach((r) => { r.disabled = true; });
    btn.disabled = true;

    // Evidențiază opțiunea corectă și, dacă e cazul, alegerea greșită.
    fs.querySelectorAll('.quiz-opt').forEach((label) => {
      const input = label.querySelector('input');
      if (!input) return;
      if (corecta && input.value === corecta.id) label.classList.add('is-correct');
      else if (input.checked) label.classList.add('is-wrong');
    });

    feedback.textContent = (ok ? 'Corect. ' : 'Aici era în joc un reflex. ') + intrebare.explicatie;
    feedback.className = 'quiz-feedback ' + (ok ? 'is-ok' : 'is-bad');
    actualizeazaScorBiase();
  });

  document.getElementById('bq-reset').addEventListener('click', resetBiase);
}

/* ═══ 26. Legături între taburi ══════════════════════════ */

/* Render-ul panoului destinație, pentru salturile cu prefill. */
const TAB_RENDERERS = {
  compusa: renderCompusa,
  timp: renderTimp,
  fond: renderFond,
  buget: renderBuget,
  sanatate: renderSanatate,
  randament: renderRandament,
  diversificare: renderDiversificare,
  stres: renderStres,
  suma: renderSuma,
  regula72: renderRegula72,
  impozitare: renderImpozitare,
  datorii: renderDatorii,
  dca: renderDca,
  curs: renderCurs,
  biase: renderBiase,
  cost: updateCostOutputs,
};

/* Listează alarmele în container, cu culoarea corespunzătoare nivelului.
   În același timp le înregistrează pentru Centrul de alerte (I5),
   ca cele 10 taburi cu alarme să fie vizibile și într-un singur loc. */
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
  const tabId = ALERT_CONTAINERS[containerId];
  if (tabId) {
    ALERTS_BY_TAB[tabId] = alertes.map((a) => ({ nivel: a.nivel, text: a.text }));
    updateAlertCenter();
  }
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

/* ═══ 25. Navigarea cu taburi (v2) ═══════════════════════ */

/* Definiția taburilor: id-ul butonului ↔ id-ul panoului (`tab-<id>` / `panel-<id>`).
   Ordinea e cea din sidebar (pe categorii), nu cea istorică. */
const TABS = ['inflatie', 'dobanda', 'compusa', 'di', 'regula72', 'timp', 'nuam', 'buget', 'fond', 'sanatate', 'randament', 'profit', 'cost', 'suma', 'oportunitate', 'dca', 'curs', 'diversificare', 'asigurari', 'stres', 'datorii', 'pensie', 'impozitare', 'biase'];

/* Cele 6 categorii din sidebar (§4.1 din REDESIGN-PROPUNERE). */
const CATEGORIES = [
  { id: 'fundamente', nume: 'Fundamentele banilor', tabs: ['inflatie', 'dobanda', 'compusa', 'di', 'regula72'] },
  { id: 'buget', nume: 'Bugetul de zi cu zi', tabs: ['timp', 'nuam', 'buget', 'fond', 'sanatate'] },
  { id: 'investitii', nume: 'Investiții', tabs: ['randament', 'profit', 'cost', 'suma', 'oportunitate', 'dca', 'curs'] },
  { id: 'risc', nume: 'Risc și protecție', tabs: ['diversificare', 'asigurari', 'stres', 'datorii'] },
  { id: 'impozite', nume: 'Impozite și viitor', tabs: ['pensie', 'impozitare'] },
  { id: 'psihologie', nume: 'Psihologia banilor', tabs: ['biase'] },
];
const TAB_CATEGORY = {};
CATEGORIES.forEach((c) => c.tabs.forEach((t) => { TAB_CATEGORY[t] = c; }));

/* Secțiunile globale din sidebar (Etapa 4 + 5): glosar, FAQ, mituri, despre.
   Nu sunt taburi — nu au categorie, nu se numără în cele 24 și nu au
   săgeți Precedent/Următor. Se deschide din sidebar sau din căutare. */
const GLOBAL_PANELS = [
  { id: 'glosar', nume: 'Glosar' },
  { id: 'faq', nume: 'Întrebări frecvente' },
  { id: 'mituri', nume: 'Mituri și adevăruri' },
  { id: 'despre', nume: 'Despre' },
];
const GLOBAL_IDS = GLOBAL_PANELS.map((g) => g.id);

function globalName(id) {
  const g = GLOBAL_PANELS.find((x) => x.id === id);
  return g ? g.nume : id;
}

/* ── Hash `#categorie/tab` (cu fallback retro-compatibil `#tab`) ──
   Hash-ul canonic spune clar unde sta tabul: `#investitii/randament`.
   Hash-urile vechi (#randament) rămân valide pentru bookmark-uri și
   legături existente. `#acasa` deschide panoul Acasă. */
function parseHash(raw) {
  const h = String(raw == null ? '' : raw).replace(/^#/, '');
  if (!h) return null;
  if (h === 'acasa') return { type: 'home' };
  if (GLOBAL_IDS.includes(h)) return { type: 'global', id: h };
  const parts = h.split('/');
  if (parts.length >= 2 && TABS.includes(parts[parts.length - 1])) {
    return { type: 'tab', id: parts[parts.length - 1] };
  }
  if (TABS.includes(h)) return { type: 'tab', id: h };
  return null;
}

/* Hash-ul canonic al unui tab (`#fundamente/inflatie`). */
function hashForTab(id) {
  const cat = TAB_CATEGORY[id];
  return '#' + (cat ? cat.id + '/' : '') + id;
}

/* Numele vizibil al unui tab (din butonul din sidebar). */
function tabName(id) {
  const btn = document.getElementById('tab-' + id);
  return btn ? btn.textContent.trim() : id;
}

/* Normalizare pentru căutare: litere mici, fără diacritice, spații unificate. */
function normalizeText(s) {
  return String(s == null ? '' : s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/* Salt Precedent/Următor: în cadrul categoriei, cu wrap; la capătul
   categoriei trece la categoria următoare/precedentă — mereu o singură
   categorie, niciodată două sau mai multe (§3.4 din REDESIGN-PROPUNERE). */
function stepTab(id, dir) {
  const cat = TAB_CATEGORY[id];
  if (!cat) return null;
  const idx = cat.tabs.indexOf(id);
  if (idx === -1) return null;
  const catIdx = CATEGORIES.indexOf(cat);

  if (dir > 0) {
    if (idx < cat.tabs.length - 1) return cat.tabs[idx + 1];
    const nextCat = CATEGORIES[(catIdx + 1) % CATEGORIES.length];
    return nextCat.tabs[0];
  }
  if (idx > 0) return cat.tabs[idx - 1];
  const prevCat = CATEGORIES[(catIdx - 1 + CATEGORIES.length) % CATEGORIES.length];
  return prevCat.tabs[prevCat.tabs.length - 1];
}

/* Id-ul tabului activ, citit din HTML (clasa `is-active`), nu din hash:
   hash-ul se schimbă la click, dar tabul afișat e cel cu `is-active`. */
function activeTabId() {
  const active = document.querySelector('.side-nav .tab.is-active');
  if (active) return active.id.replace(/^tab-/, '');
  return null; // panoul „Acasă" e activ
}

/* Comută tabul. `focus` „pune" focusul pe buton (tastatură), `focusPanel` îl
   mută în panoul activ (click, back/forward) — cititorul de ecran anunță noul
   conținut, iar panoul nu rămâne ascuns sub bara de taburi sticky.
   `history: 'push'` adaugă o intrare în istoric (click/săgeți), deci
   back/forward schimbă tabul; implicit se înlocuiește intrarea curentă. */
/* v3 — progres „explorat”, opțional: numărul de calculatoare deschise.
   Cheile sunt prefixate ca să nu se amestece cu inputurile salvate. */
const EXPLORAT_KEY = 'glitchcoin-explorat';
const EXPLORAT_OFF_KEY = 'glitchcoin-explorat-off';

function citesteExplorat() {
  try {
    const brut = localStorage.getItem(EXPLORAT_KEY);
    const lista = brut ? JSON.parse(brut) : [];
    return Array.isArray(lista) ? lista : [];
  } catch (e) { return []; }
}

function actualizeazaProgres() {
  const box = document.getElementById('side-progress');
  if (!box) return;
  let ascuns = false;
  try { ascuns = localStorage.getItem(EXPLORAT_OFF_KEY) === '1'; } catch (e) { /* blocat */ }
  box.hidden = ascuns;
  const text = document.getElementById('explorat-text');
  if (text) text.textContent = `${citesteExplorat().length} din ${AB_CORE_TABS.length} taburi explorate`;
  const btn = document.getElementById('explorat-toggle');
  if (btn) btn.setAttribute('aria-pressed', String(!ascuns));
}

function marcheazaExplorat(id) {
  if (!AB_CORE_TABS.includes(id)) return;
  const lista = citesteExplorat();
  if (lista.includes(id)) return;
  lista.push(id);
  try { localStorage.setItem(EXPLORAT_KEY, JSON.stringify(lista)); } catch (e) { /* blocat */ }
  actualizeazaProgres();
}

function activateTab(id, { focus = false, focusPanel = false, scroll = false, history: historyMode = 'replace' } = {}) {
  marcheazaExplorat(id);
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

  // Secțiunile globale (glosar/FAQ/mituri) se ascund când se deschide un tab.
  GLOBAL_IDS.forEach((gid) => {
    const p = document.getElementById('panel-' + gid);
    if (p) { p.classList.remove('is-active'); p.setAttribute('hidden', ''); }
  });

  // `aria-live` doar în panoul vizibil: regiunile live din panourile ascunse
  // nu anunță rezultate în timp ce utilizatorul e în altă parte a paginii.
  document.querySelectorAll('.tab-panel[hidden] [aria-live]').forEach((el) => {
    el.removeAttribute('aria-live');
  });
  panel.querySelectorAll('.summary').forEach((el) => {
    if (!el.hasAttribute('aria-live')) el.setAttribute('aria-live', 'polite');
  });

  // Panoul „Acasă" se ascunde ÎNAINTE de derulare. Dacă rămâne vizibil,
  // `scrollIntoView` țintește poziția panoului nou calculată cu „Acasă"
  // încă pe ecran; după ascundere, pagina rămâne prea jos — click pe
  // „Inflație" arăta „Prețurile la alimentele de bază" în vârful ecranului.
  const homePanel = document.getElementById('panel-acasa');
  if (homePanel) homePanel.hidden = true;

  if (focus) tab.focus();
  if (focusPanel) panel.focus({ preventScroll: true });
  if (scroll || focusPanel) panel.scrollIntoView({ block: 'start', inline: 'nearest' });

  // Reține ultimul tab vizibil în bara de browser, în forma canonică
  // `#categorie/tab` (fără a mai încărca pagina). Hash-urile vechi
  // (`#tab`) sunt acceptate la deschidere și la back/forward.
  if (history.replaceState) {
    const hash = hashForTab(id);
    if (historyMode === 'push') history.pushState(null, '', hash);
    else history.replaceState(null, '', hash);
  }

  updateChrome(id);
  updateTableScrollHints();
  if (stepMode) retargetStepMode(id);
  updateStepTriggerState();
}

/* Numele tabului din antetul de tipărire (P5). */
function updatePrintTabName() {
  const el = document.getElementById('print-tab-name');
  if (!el) return;
  const id = activeTabId();
  if (!id) {
    const globalActiva = GLOBAL_IDS.find((gid) => {
      const p = document.getElementById('panel-' + gid);
      return p && p.classList.contains('is-active');
    });
    el.textContent = globalActiva ? globalName(globalActiva) : 'Acasă';
    return;
  }
  const tab = document.getElementById('tab-' + id);
  el.textContent = tab ? tab.textContent : '—';
}

/* ═══ 26. Schelet: breadcrumb, Acasă, concentrare, drawer, sus ═══ */

/* Împachetarea vizuală curentă: sidebar (categoria activă deschisă),
   breadcrumb și numele tabului din antetul de tipărire. */
function updateChrome(id) {
  const cat = TAB_CATEGORY[id];

  // Linkurile globale (glosar/FAQ/mituri) își actualizează `aria-current`.
  document.querySelectorAll('.side-global-link').forEach((a) => {
    a.setAttribute('aria-current', a.getAttribute('data-global') === id ? 'page' : 'false');
  });

  document.querySelectorAll('.side-nav .tab').forEach((btn) => {
    const activ = btn.id === 'tab-' + id;
    btn.classList.toggle('is-active', activ);
    btn.setAttribute('aria-selected', activ ? 'true' : 'false');
  });

  document.querySelectorAll('.side-group').forEach((group) => {
    const toggle = group.querySelector('.side-cat');
    const items = group.querySelector('.side-items');
    if (!toggle || !items) return;
    if (cat && group.dataset.cat === cat.id) {
      items.hidden = false;
      toggle.setAttribute('aria-expanded', 'true');
    }
  });

  const homeLink = document.getElementById('nav-acasa');
  if (homeLink) homeLink.removeAttribute('aria-current');

  renderBreadcrumb(id);
  updatePanelNav(id);
  updatePrintTabName();
}

function renderBreadcrumb(id) {
  const list = document.getElementById('breadcrumb-list');
  if (!list) return;
  const tab = document.getElementById('tab-' + id);
  const cat = TAB_CATEGORY[id];
  list.replaceChildren();

  const liHome = document.createElement('li');
  const aHome = document.createElement('a');
  aHome.href = '#acasa';
  aHome.textContent = 'Acasă';
  liHome.appendChild(aHome);
  list.appendChild(liHome);

  // Secțiune globală (glosar/FAQ/mituri): doar „Acasă / <nume>”, fără categorie.
  if (GLOBAL_IDS.includes(id)) {
    const liGlobal = document.createElement('li');
    liGlobal.setAttribute('aria-current', 'page');
    liGlobal.textContent = globalName(id);
    list.appendChild(liGlobal);
    return;
  }

  if (cat) {
    const liCat = document.createElement('li');
    const aCat = document.createElement('a');
    aCat.href = hashForTab(cat.tabs[0]);
    aCat.textContent = cat.nume;
    liCat.appendChild(aCat);
    list.appendChild(liCat);
  }

  const liTab = document.createElement('li');
  liTab.setAttribute('aria-current', 'page');
  liTab.textContent = tab ? tab.textContent : '—';
  list.appendChild(liTab);
}

function renderBreadcrumbHome() {
  const list = document.getElementById('breadcrumb-list');
  if (!list) return;
  list.replaceChildren();
  const li = document.createElement('li');
  li.setAttribute('aria-current', 'page');
  li.textContent = 'Acasă';
  list.appendChild(li);
}

/* Deschide panoul „Acasă" și ascunde toate taburile. */
function activateHome({ focusPanel = false, history: historyMode = 'replace' } = {}) {
  TABS.forEach((tid) => {
    const btn = document.getElementById('tab-' + tid);
    const pnl = document.getElementById('panel-' + tid);
    if (btn) {
      btn.classList.remove('is-active');
      btn.setAttribute('aria-selected', 'false');
    }
    if (pnl) {
      pnl.classList.remove('is-active');
      pnl.setAttribute('hidden', '');
    }
  });

  // Secțiunile globale se ascund și ele când revii la „Acasă”.
  GLOBAL_IDS.forEach((gid) => {
    const p = document.getElementById('panel-' + gid);
    if (p) { p.classList.remove('is-active'); p.setAttribute('hidden', ''); }
  });
  document.querySelectorAll('.side-global-link').forEach((a) => a.removeAttribute('aria-current'));

  const home = document.getElementById('panel-acasa');
  if (home) {
    home.classList.add('is-active');
    home.hidden = false;
  }

  document.querySelectorAll('.tab-panel[hidden] [aria-live]').forEach((el) => {
    el.removeAttribute('aria-live');
  });

  const homeLink = document.getElementById('nav-acasa');
  if (homeLink) homeLink.setAttribute('aria-current', 'page');

  renderBreadcrumbHome();
  updatePanelNav(null);
  updatePrintTabName();
  if (stepMode) stopStepMode();
  updateStepTriggerState();

  if (focusPanel && home) {
    home.focus({ preventScroll: true });
    home.scrollIntoView({ block: 'start', inline: 'nearest' });
  }

  if (history.replaceState) {
    if (historyMode === 'push') history.pushState(null, '', '#acasa');
    else history.replaceState(null, '', '#acasa');
  }
}

/* Deschide o secțiune globală (glosar / FAQ / mituri) din sidebar.
   Ascunde taburile și „Acasă”, marchează linkul activ în sidebar și
   actualizează breadcrumb-ul. Nu are săgeți Precedent/Următor. */
function activateGlobal(id, { focusPanel = false, history: historyMode = 'replace' } = {}) {
  const panel = document.getElementById('panel-' + id);
  if (!panel || !GLOBAL_IDS.includes(id)) return;

  TABS.forEach((tid) => {
    const btn = document.getElementById('tab-' + tid);
    const pnl = document.getElementById('panel-' + tid);
    if (btn) { btn.classList.remove('is-active'); btn.setAttribute('aria-selected', 'false'); }
    if (pnl) { pnl.classList.remove('is-active'); pnl.setAttribute('hidden', ''); }
  });

  const home = document.getElementById('panel-acasa');
  if (home) { home.classList.remove('is-active'); home.hidden = true; }

  GLOBAL_IDS.forEach((gid) => {
    const p = document.getElementById('panel-' + gid);
    if (!p) return;
    const activ = gid === id;
    p.classList.toggle('is-active', activ);
    if (activ) p.removeAttribute('hidden');
    else p.setAttribute('hidden', '');
  });

  document.querySelectorAll('.side-global-link').forEach((a) => {
    a.setAttribute('aria-current', a.getAttribute('data-global') === id ? 'page' : 'false');
  });

  document.querySelectorAll('.tab-panel[hidden] [aria-live]').forEach((el) => {
    el.removeAttribute('aria-live');
  });

  renderBreadcrumb(id);
  updatePanelNav(null);
  updatePrintTabName();
  if (stepMode) stopStepMode();
  updateStepTriggerState();

  if (focusPanel && panel) {
    panel.focus({ preventScroll: true });
    panel.scrollIntoView({ block: 'start', inline: 'nearest' });
  }

  if (history.replaceState) {
    const hash = '#' + id;
    if (historyMode === 'push') history.pushState(null, '', hash);
    else history.replaceState(null, '', hash);
  }
}

/* ── Săgeți Precedent/Următor ───────────────────────────────
   Butoanele de sub panou arată numele tabului de destinație și
   urmează aceeași logică ca săgețile din tastatură: se mișcă în
   categorie, la limită trec o singură categorie mai departe. */
function updatePanelNav(id) {
  const nav = document.getElementById('panel-nav');
  const prevBtn = document.getElementById('prev-tab');
  const nextBtn = document.getElementById('next-tab');
  if (!nav || !prevBtn || !nextBtn) return;

  if (!id || !TAB_CATEGORY[id]) {
    nav.hidden = true;
    return;
  }
  nav.hidden = false;

  const prev = stepTab(id, -1);
  const next = stepTab(id, 1);
  prevBtn.querySelector('.panel-nav-text').textContent = tabName(prev);
  nextBtn.querySelector('.panel-nav-text').textContent = tabName(next);
  prevBtn.title = 'Precedent: ' + tabName(prev);
  nextBtn.title = 'Următor: ' + tabName(next);
}

function initPanelNav() {
  const prevBtn = document.getElementById('prev-tab');
  const nextBtn = document.getElementById('next-tab');
  if (!prevBtn || !nextBtn) return;

  const go = (dir) => {
    const current = activeTabId();
    if (!current) return;
    const target = stepTab(current, dir);
    if (!target) return;
    activateTab(target, { focusPanel: true, history: 'push' });
    persistSave();
  };
  prevBtn.addEventListener('click', () => go(-1));
  nextBtn.addEventListener('click', () => go(1));
}

/* Badge-ul de categorie din panoul fiecărui tab (injectat din JS,
   ca panourile să rămână neschimbate în HTML). */
function renderCategoryBadges() {
  // Iconițele din sidebar, pentru același semn vizual pe badge.
  const icons = {};
  document.querySelectorAll('.side-group').forEach((group) => {
    const icon = group.querySelector('.side-cat-icon');
    if (icon && group.dataset.cat) icons[group.dataset.cat] = icon.innerHTML;
  });

  TABS.forEach((id) => {
    const panel = document.getElementById('panel-' + id);
    const cat = TAB_CATEGORY[id];
    if (!panel || !cat || panel.querySelector('.cat-badge')) return;

    const badge = document.createElement('span');
    badge.className = 'cat-badge';
    badge.dataset.cat = cat.id;
    const n = cat.tabs.length;
    badge.innerHTML =
      (icons[cat.id] ? `<span class="cat-badge-icon" aria-hidden="true">${icons[cat.id]}</span>` : '') +
      `<span class="cat-badge-name">${cat.nume}</span>` +
      `<span class="cat-badge-count">${n} ${n === 1 ? 'tab' : 'taburi'}</span>`;
    panel.insertAdjacentElement('afterbegin', badge);
  });
}

/* ── Mod Concentrare ─────────────────────────────────────── */
function applyFocus(on) {
  document.documentElement.classList.toggle('is-focus', on);
  const btn = document.getElementById('focus-toggle');
  if (btn) {
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.title = on ? 'Oprește modul Concentrare (F)' : 'Mod Concentrare (F)';
  }
}

/* ── Drawer (mobil) ──────────────────────────────────────── */
function initDrawer() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const menuBtn = document.getElementById('menu-btn');
  if (!sidebar || !overlay || !menuBtn) return;
  let lastFocus = null;

  function trapFocus(event) {
    if (event.key === 'Escape') { event.preventDefault(); closeDrawer(); return; }
    if (event.key !== 'Tab') return;
    const focusables = Array.from(sidebar.querySelectorAll('a[href], button:not([disabled])'));
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  function openDrawer() {
    lastFocus = document.activeElement;
    sidebar.classList.add('is-open');
    overlay.hidden = false;
    menuBtn.setAttribute('aria-expanded', 'true');
    menuBtn.setAttribute('aria-label', 'Închide navigarea');
    sidebar.setAttribute('aria-modal', 'true');
    document.body.classList.add('is-drawer-open');
    const first = sidebar.querySelector('.side-home') || sidebar.querySelector('button');
    if (first) first.focus();
    document.addEventListener('keydown', trapFocus);
  }

  function closeDrawer(restore = true) {
    sidebar.classList.remove('is-open');
    overlay.hidden = true;
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.setAttribute('aria-label', 'Deschide navigarea');
    sidebar.removeAttribute('aria-modal');
    document.body.classList.remove('is-drawer-open');
    document.removeEventListener('keydown', trapFocus);
    if (restore && lastFocus && lastFocus.focus) lastFocus.focus();
  }

  menuBtn.addEventListener('click', () => {
    if (sidebar.classList.contains('is-open')) closeDrawer();
    else openDrawer();
  });
  overlay.addEventListener('click', () => closeDrawer());

  // Alegerea unui tab în drawer: închide și lasă focusul în conținut.
  sidebar.addEventListener('click', (event) => {
    const navigheaza = event.target.closest('.side-tab') || event.target.closest('.side-global-link');
    if (navigheaza && sidebar.classList.contains('is-open')) {
      closeDrawer(false);
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth >= 1024 && sidebar.classList.contains('is-open')) closeDrawer(false);
  });
}

/* ── Buton „sus" ─────────────────────────────────────────── */
function initBackToTop() {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;
  const onScroll = () => { btn.hidden = window.scrollY < 400; };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  btn.addEventListener('click', () => {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });
}

/* ── Simulatoare rapide de pe Acasă ──────────────────────── */
function renderQuick() {
  const c = document.getElementById('q-compusa-suma');
  if (c) {
    const suma = Math.max(0, readNumber(c));
    const rez = document.getElementById('q-compusa-rez');
    if (rez) {
      if (suma <= 0) rez.textContent = '—';
      else {
        const { scenA } = computeCompusa(suma, 0, 0.07);
        rez.textContent = fmtLei(scenA[10].valoare);
      }
    }
  }

  const r72 = document.getElementById('q-r72-rata');
  if (r72) {
    const rata = Math.max(0, readNumber(r72));
    const rez = document.getElementById('q-r72-rez');
    if (rez) {
      const r = computeRegula72(rata, 0);
      rez.textContent = r ? fmtAni(r.aniRegola) : '—';
    }
  }

  const tinta = document.getElementById('q-suma-tinta');
  if (tinta) {
    const sumaDorita = Math.max(0, readNumber(tinta));
    const rez = document.getElementById('q-suma-rez');
    if (rez) {
      // Aceleași ipoteze ca în tabul complet: 10% pe an, 15 ani, fără capital inițial.
      const r = sumaDorita > 0 ? computeSuma(0.10, 15, 0, sumaDorita) : null;
      rez.textContent = r ? fmtLei(r.economie) + '/lună' : '—';
    }
  }
}

function initHome() {
  ['q-compusa-suma', 'q-r72-rata', 'q-suma-tinta'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', renderQuick);
  });

  document.querySelectorAll('.quick-card [data-goto]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-goto');
      const valori = {};
      const prefill = btn.getAttribute('data-prefill');
      // Perechi multiple, separate prin virgulă: „dest:sursă,dest2:sursă2”.
      // Sursa poate fi id-ul unui input de pe Acasă sau o constantă numerică
      // (ex. 7 pentru rată) — tabul complet pornește exact cu ipotezele cardului.
      if (prefill) {
        prefill.split(',').forEach((pereche) => {
          const [dest, sursa] = pereche.split(':');
          if (!dest || sursa === undefined) return;
          const el = sursa ? document.getElementById(sursa) : null;
          if (el) valori[dest] = el.value;
          else if (/^-?\d+(?:\.\d+)?$/.test(sursa.trim())) valori[dest] = sursa.trim();
        });
      }
      goToTab(id, valori);
    });
  });

  renderQuick();
}

/* ── Inițializarea scheletului ───────────────────────────── */
function initShell() {
  // Categorii pliabile.
  document.querySelectorAll('.side-cat').forEach((btn) => {
    btn.addEventListener('click', () => {
      const items = document.getElementById(btn.getAttribute('aria-controls'));
      if (!items) return;
      const open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', open ? 'false' : 'true');
      items.hidden = open;
    });
  });

  // Acasă (brand + link din sidebar).
  const goHome = (event) => {
    event.preventDefault();
    activateHome({ focusPanel: true, history: 'push' });
    persistSave();
  };
  const homeLink = document.getElementById('nav-acasa');
  if (homeLink) homeLink.addEventListener('click', goHome);
  const brand = document.getElementById('brand');
  if (brand) brand.addEventListener('click', goHome);

  // Cardurile de categorie de pe Acasă.
  document.querySelectorAll('.home-card[data-goto]').forEach((card) => {
    card.addEventListener('click', (event) => {
      event.preventDefault();
      activateTab(card.getAttribute('data-goto'), { focusPanel: true, history: 'push' });
      persistSave();
    });
  });

  // Secțiunile globale din sidebar (glosar, întrebări frecvente, mituri).
  document.querySelectorAll('.side-global-link').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const id = link.getAttribute('data-global');
      if (!GLOBAL_IDS.includes(id)) return;
      activateGlobal(id, { focusPanel: true, history: 'push' });
      persistSave();
    });
  });

  // Legături către taburi din conținutul educațional (glosar, FAQ, fapte).
  document.querySelectorAll('a[data-goto-tab]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const id = link.getAttribute('data-goto-tab');
      if (!TABS.includes(id)) return;
      activateTab(id, { focusPanel: true, history: 'push' });
      persistSave();
    });
  });

  // Mod Concentrare (implicit pe mobil).
  const focusBtn = document.getElementById('focus-toggle');
  let storedFocus = null;
  try { storedFocus = localStorage.getItem('glitchcoin-focus'); } catch (e) { /* blocat */ }
  let focus = storedFocus === null ? window.innerWidth < 1024 : storedFocus === '1';
  applyFocus(focus);

  const toggleFocus = () => {
    focus = !focus;
    applyFocus(focus);
    try { localStorage.setItem('glitchcoin-focus', focus ? '1' : '0'); } catch (e) { /* blocat */ }
  };
  if (focusBtn) focusBtn.addEventListener('click', toggleFocus);

  // Scurtătură: F (nu când scrii într-un câmp).
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'f' && event.key !== 'F') return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const t = event.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    toggleFocus();
  });

  initDrawer();
  initBackToTop();
  initHome();
  initPanelNav();
  renderCategoryBadges();
}

/* Tastatură: săgeți stânga/dreapta + Home/End (model WAI-ARIA).
   Funcționează și atunci când focusul e în panoul activ (după click),
   nu doar când e pe butonul-tab. Săgețile respectă categoriile
   (stepTab): la limita categoriei se trece o singură categorie mai
   departe, cu wrap — nu sar taburi în aleatoriu. */
function handleTabKeys(event) {
  const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
  if (!keys.includes(event.key)) return;

  const current = document.activeElement;
  if (!current) return;

  const tabList = Array.from(document.querySelectorAll('.side-nav [role="tab"]'));
  let index = tabList.indexOf(current);
  if (index === -1 && current.id && current.id.startsWith('panel-')) {
    index = TABS.indexOf(current.id.replace(/^panel-/, ''));
  }
  // Focus pe una din săgețile Precedent/Următor: pleacă de la tabul activ.
  if (index === -1 && (current.id === 'prev-tab' || current.id === 'next-tab')) {
    const active = activeTabId();
    if (active) index = TABS.indexOf(active);
  }
  if (index === -1) return;

  event.preventDefault();

  if (event.key === 'Home') {
    activateTab(TABS[0], { focus: true, scroll: true, history: 'push' });
    persistSave();
    return;
  }
  if (event.key === 'End') {
    activateTab(TABS[TABS.length - 1], { focus: true, scroll: true, history: 'push' });
    persistSave();
    return;
  }

  const base = TABS[index];
  const target = stepTab(base, event.key === 'ArrowRight' ? 1 : -1);
  if (target) {
    activateTab(target, { focus: true, scroll: true, history: 'push' });
    persistSave();
  }
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

  const sideNav = document.querySelector('.side-nav');
  if (sideNav) sideNav.addEventListener('keydown', handleTabKeys);

  // Și din butoanele Precedent/Următor.
  const panelNav = document.getElementById('panel-nav');
  if (panelNav) panelNav.addEventListener('keydown', handleTabKeys);

  // Breadcrumb-ul e clickabil: click pe „Acasă" sau pe categorie
  // deschide primul tab al categoriei, ca o intrare nouă în istoric.
  const breadcrumbList = document.getElementById('breadcrumb-list');
  if (breadcrumbList) {
    breadcrumbList.addEventListener('click', (event) => {
      const link = event.target.closest('a[href^="#"]');
      if (!link) return;
      const parsed = parseHash(link.getAttribute('href'));
      if (!parsed) return;
      event.preventDefault();
      if (parsed.type === 'home') activateHome({ focusPanel: true, history: 'push' });
      else activateTab(parsed.id, { focusPanel: true, history: 'push' });
      persistSave();
    });
  }

  // Back/forward și legături externe: hash-ul se schimbă și tabul
  // afișat îl urmește. Acceptă `#categorie/tab` și `#tab` (vechi).
  window.addEventListener('hashchange', () => {
    const parsed = parseHash(location.hash);
    if (!parsed) return;
    if (parsed.type === 'tab') activateTab(parsed.id, { focusPanel: true });
    else if (parsed.type === 'global') activateGlobal(parsed.id, { focusPanel: true });
    else activateHome({ focusPanel: true });
    persistSave();
  });

  // Prima deschidere: „Acasă”. Dacă există un tab salvat în localStorage
  // (sau un hash valid, în oricare dintre cele două forme), se deschide
  // tabul respectiv — nu se pierde locul.
  let initial = null;
  try { initial = localStorage.getItem('glitchcoin-tab'); } catch (e) { /* blocat */ }
  if (!initial || !TABS.includes(initial)) {
    const parsed = parseHash(location.hash);
    if (parsed && parsed.type === 'tab') initial = parsed.id;
  }
  if (TABS.includes(initial)) activateTab(initial);
  else {
    const parsed = parseHash(location.hash);
    if (parsed && parsed.type === 'global') activateGlobal(parsed.id);
    else activateHome();
  }
}

/* ═══ 27. Căutare rapidă ⌘K ═══════════════════════════════
   Paletă de comenzi minimală: caută taburile după nume sau
   categorie (diacritice ignorate), navighează cu săgeți, Enter
   deschide. Structura e pregătită pentru glosar/FAQ (Etapa 3):
   filtrul pleacă din lista de taburi și poate primi intrări noi. */

let searchOpen = false;
let searchActive = -1;
let searchResults = [];

function buildSearchItems() {
  const tabs = TABS.map((id) => {
    const cat = TAB_CATEGORY[id];
    return { id, name: tabName(id), category: cat ? cat.nume : '', type: 'tab', target: id };
  });

  // Glosarul, FAQ și miturile sunt marcate în HTML cu `data-search`;
  // numele se ia din titlu (h3/summary), iar `data-search-target` spune
  // unde se deschide (tab sau secțiune globală).
  const extra = [];
  document.querySelectorAll('[data-search]').forEach((el) => {
    const nameEl = el.querySelector('h3, summary');
    const name = nameEl ? nameEl.textContent.trim() : el.getAttribute('data-search');
    const target = el.getAttribute('data-search-target');
    if (!name || !target) return;
    extra.push({
      id: el.getAttribute('data-search-id') || '',
      name: String(name).trim(),
      category: el.getAttribute('data-search-cat') || '',
      type: GLOBAL_IDS.includes(target) ? 'global' : 'tab',
      target,
    });
  });

  return tabs.concat(extra);
}

function scoreSearchItem(item, q) {
  const name = normalizeText(item.name);
  const cat = normalizeText(item.category);
  if (name.startsWith(q)) return 0;
  if (name.includes(q)) return 1;
  if (cat.includes(q)) return 2;
  return -1;
}

/* Filtrul propriu-zis, separat de DOM: testele îl pot apela cu o listă
   de itemuri, iar paleta îl apelează cu `buildSearchItems()`. */
function filterSearchItems(items, query) {
  const q = normalizeText(query);
  if (!q) return items.slice();
  return items
    .map((item) => ({ item, score: scoreSearchItem(item, q) }))
    .filter((r) => r.score !== -1)
    .sort((a, b) => a.score - b.score)
    .map((r) => r.item);
}

function filteredSearch(query) {
  return filterSearchItems(buildSearchItems(), query);
}

function renderSearchResults(query) {
  const input = document.getElementById('search-input');
  const list = document.getElementById('search-results');
  const empty = document.getElementById('search-empty');
  if (!input || !list) return;

  searchResults = filteredSearch(query);
  searchActive = searchResults.length ? 0 : -1;

  list.replaceChildren();
  searchResults.forEach((item, i) => {
    const li = document.createElement('li');
    li.className = 'search-option' + (i === searchActive ? ' is-active' : '');
    li.id = 'search-opt-' + item.id;
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', i === searchActive ? 'true' : 'false');
    li.dataset.searchId = item.id;

    const name = document.createElement('span');
    name.className = 'search-option-name';
    name.textContent = item.name;
    const cat = document.createElement('span');
    cat.className = 'search-option-cat';
    cat.textContent = item.category;

    li.appendChild(name);
    li.appendChild(cat);
    list.appendChild(li);
  });

  if (empty) empty.hidden = searchResults.length > 0;
  input.setAttribute('aria-activedescendant',
    searchActive >= 0 ? 'search-opt-' + searchResults[searchActive].id : '');
}

function setSearchActive(index) {
  const list = document.getElementById('search-results');
  if (!list || !searchResults.length) return;
  const max = searchResults.length - 1;
  searchActive = index < 0 ? max : (index > max ? 0 : index);

  Array.from(list.children).forEach((li, i) => {
    const on = i === searchActive;
    li.classList.toggle('is-active', on);
    li.setAttribute('aria-selected', on ? 'true' : 'false');
  });

  const activeLi = list.children[searchActive];
  if (activeLi) {
    activeLi.scrollIntoView({ block: 'nearest' });
    const input = document.getElementById('search-input');
    if (input) input.setAttribute('aria-activedescendant', activeLi.id);
  }
}

/* Fundalul devine inert când o paletă/dialog e deschis (suport nativ),
   ca focusul să nu ajungă în spatele dialogului. */
const BACKGROUND_INERT = ['#sidebar', '#main-content', '.app-header', '.footer'];
function setBackgroundInert(on) {
  if (typeof HTMLElement === 'undefined' || !('inert' in HTMLElement.prototype)) return;
  BACKGROUND_INERT.forEach((sel) => document.querySelectorAll(sel).forEach((el) => {
    if (on) el.setAttribute('inert', '');
    else el.removeAttribute('inert');
  }));
}

function openSearch() {
  const overlay = document.getElementById('search-overlay');
  const input = document.getElementById('search-input');
  const trigger = document.getElementById('search-trigger');
  if (!overlay || !input) return;

  searchOpen = true;
  overlay.hidden = false;
  document.body.classList.add('is-search-open');
  setBackgroundInert(true);
  input.value = '';
  renderSearchResults('');
  input.focus();
  if (trigger) trigger.setAttribute('aria-expanded', 'true');
}

function closeSearch(restoreFocus = true) {
  const overlay = document.getElementById('search-overlay');
  const trigger = document.getElementById('search-trigger');
  if (!overlay) return;

  searchOpen = false;
  overlay.hidden = true;
  document.body.classList.remove('is-search-open');
  setBackgroundInert(false);
  if (restoreFocus && trigger) {
    trigger.setAttribute('aria-expanded', 'false');
    trigger.focus();
  }
}

function chooseSearchItem(item) {
  closeSearch(false);
  if (!item) return;
  if (item.type === 'global') activateGlobal(item.target, { focusPanel: true, history: 'push' });
  else activateTab(item.target, { focusPanel: true, history: 'push' });
  persistSave();
}

function initSearch() {
  const trigger = document.getElementById('search-trigger');
  const overlay = document.getElementById('search-overlay');
  const input = document.getElementById('search-input');
  const list = document.getElementById('search-results');
  if (!trigger || !overlay || !input || !list) return;

  // Eticheta de platformă: ⌘K pe Mac, Ctrl K în rest.
  const kbd = trigger.querySelector('.header-search-kbd');
  const isMac = typeof navigator !== 'undefined' &&
    /Mac|iPod|iPhone|iPad/.test(navigator.platform || '');
  if (kbd) kbd.textContent = isMac ? '⌘K' : 'Ctrl K';
  trigger.title = isMac ? 'Căutare rapidă (⌘K)' : 'Căutare rapidă (Ctrl+K)';

  trigger.addEventListener('click', () => {
    if (searchOpen) closeSearch();
    else openSearch();
  });

  // ⌘K / Ctrl+K funcționează peste tot (ca într-o paletă de comenzi).
  document.addEventListener('keydown', (event) => {
    if (!(event.metaKey || event.ctrlKey)) return;
    if (event.key !== 'k' && event.key !== 'K') return;
    event.preventDefault();
    if (searchOpen) closeSearch();
    else openSearch();
  });

  input.addEventListener('input', () => renderSearchResults(input.value));

  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setSearchActive(searchActive + 1); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setSearchActive(searchActive - 1); }
    else if (event.key === 'Enter') {
      event.preventDefault();
      if (searchActive >= 0 && searchResults[searchActive]) chooseSearchItem(searchResults[searchActive]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeSearch();
    }
  });

  overlay.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { event.preventDefault(); closeSearch(); }
    if (event.key !== 'Tab') return;
    // Focus trap simplu: singurul element focusabil e câmpul de căutare.
    event.preventDefault();
    input.focus();
  });

  overlay.addEventListener('click', (event) => {
    if (event.target.closest('[data-search-close]')) closeSearch();
  });

  list.addEventListener('click', (event) => {
    const option = event.target.closest('.search-option');
    if (!option) return;
    const item = searchResults.find((r) => r.id === option.dataset.searchId);
    if (item) chooseSearchItem(item);
  });

  list.addEventListener('mousemove', (event) => {
    const option = event.target.closest('.search-option');
    if (!option) return;
    const idx = searchResults.findIndex((item) => item.id === option.dataset.searchId);
    if (idx !== -1 && idx !== searchActive) setSearchActive(idx);
  });
}

/* ═══ 28. Interactivitate (Etapa 3) ═══════════════════════
   I1 căutare (filtru pur, testabil) · I4 mod pas cu pas ·
   I5 centru de alerte · I7 copiere rezultat · I8 animații
   discrete (cu prefers-reduced-motion). */

/* ── I5 · Centru de alerte ────────────────────────────────
   Cele 10 taburi cu alarme își au containerul (`bg-alerte` etc.).
   `renderAlerts` le înregistrează pentru tabul respectiv, iar
   centru le adună pe toate, grupate pe categorii, cu badge
   pe categorie în sidebar și contor în header. */
const ALERT_CONTAINERS = {
  'bg-alerte': 'buget',
  'sf-alerte': 'sanatate',
  'dc-alerte': 'dca',
  'cs-alerte': 'curs',
  'dv-alerte': 'diversificare',
  'as-alerte': 'asigurari',
  'st-alerte': 'stres',
  'dt-alerte': 'datorii',
  'pn-alerte': 'pensie',
  'tx-alerte': 'impozitare',
};
const ALERTS_BY_TAB = {};
let alertsOpen = false;
let alertsCount = 0;

/* Funcție pură: adună alertele non-ok din registru, în ordinea
   taburilor din sidebar (deci grupate natural pe categorii). */
function collectAlerts(registry) {
  const items = [];
  TABS.forEach((tabId) => {
    const list = registry[tabId] || [];
    list.forEach((a) => {
      if (a && a.nivel !== 'ok') {
        items.push({ tabId, nivel: a.nivel, text: String(a.text == null ? '' : a.text) });
      }
    });
  });
  return items;
}

function updateAlertCenter() {
  const items = collectAlerts(ALERTS_BY_TAB);
  const badge = document.getElementById('alerts-badge');
  const trigger = document.getElementById('alerts-trigger');

  if (badge) {
    badge.textContent = String(items.length);
    badge.hidden = items.length === 0;
    if (items.length > alertsCount) {
      badge.classList.remove('is-pulse');
      void badge.offsetWidth; // reia animația de puls
      badge.classList.add('is-pulse');
    }
  }
  if (trigger) {
    trigger.setAttribute('aria-label', items.length
      ? `Centru de alerte (${items.length})`
      : 'Centru de alerte');
  }
  alertsCount = items.length;

  // Badge cu numărul de alerte pe fiecare categorie din sidebar.
  const byCat = {};
  items.forEach((it) => {
    const cat = TAB_CATEGORY[it.tabId];
    if (cat) byCat[cat.id] = (byCat[cat.id] || 0) + 1;
  });
  CATEGORIES.forEach((cat) => {
    const el = document.querySelector(`[data-cat-badge="${cat.id}"]`);
    if (!el) return;
    const n = byCat[cat.id] || 0;
    el.textContent = String(n);
    el.hidden = n === 0;
  });

  if (alertsOpen) renderAlertList();
}

function renderAlertList() {
  const list = document.getElementById('alerts-list');
  if (!list) return;
  const empty = document.getElementById('alerts-empty');
  const items = collectAlerts(ALERTS_BY_TAB);

  const groups = new Map();
  items.forEach((it) => {
    const cat = TAB_CATEGORY[it.tabId];
    const key = cat ? cat.id : 'altele';
    if (!groups.has(key)) groups.set(key, { nume: cat ? cat.nume : 'Altele', items: [] });
    groups.get(key).items.push(it);
  });

  list.replaceChildren();
  groups.forEach((g) => {
    const h = document.createElement('h3');
    h.className = 'alerts-cat';
    const name = document.createElement('span');
    name.textContent = g.nume;
    const count = document.createElement('span');
    count.className = 'alerts-cat-count';
    count.textContent = String(g.items.length);
    h.append(name, count);
    list.appendChild(h);

    g.items.forEach((it) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'alert-item is-' + it.nivel;
      btn.dataset.tab = it.tabId;
      const text = document.createElement('span');
      text.className = 'alert-item-text';
      text.textContent = it.text;
      const meta = document.createElement('span');
      meta.className = 'alert-item-meta';
      meta.textContent = tabName(it.tabId) + ' →';
      btn.append(text, meta);
      list.appendChild(btn);
    });
  });

  if (empty) empty.hidden = items.length > 0;
}

function openAlerts() {
  const overlay = document.getElementById('alerts-overlay');
  if (!overlay) return;
  alertsOpen = true;
  overlay.hidden = false;
  setBackgroundInert(true);
  renderAlertList();
  const trigger = document.getElementById('alerts-trigger');
  if (trigger) trigger.setAttribute('aria-expanded', 'true');
  const first = overlay.querySelector('.alert-item') || overlay.querySelector('[data-alerts-close]');
  if (first) first.focus();
}

function closeAlerts(restoreFocus = true) {
  const overlay = document.getElementById('alerts-overlay');
  if (!overlay) return;
  alertsOpen = false;
  overlay.hidden = true;
  setBackgroundInert(false);
  const trigger = document.getElementById('alerts-trigger');
  if (trigger) {
    trigger.setAttribute('aria-expanded', 'false');
    if (restoreFocus) trigger.focus();
  }
}

function initAlerts() {
  // Badge-uri de alertă pe cele 6 categorii din sidebar.
  CATEGORIES.forEach((cat) => {
    const group = document.querySelector(`.side-group[data-cat="${cat.id}"] .side-cat`);
    if (!group) return;
    const badge = document.createElement('span');
    badge.className = 'side-cat-badge';
    badge.dataset.catBadge = cat.id;
    badge.hidden = true;
    badge.textContent = '0';
    const chev = group.querySelector('.side-cat-chev');
    if (chev) group.insertBefore(badge, chev);
    else group.appendChild(badge);
  });

  const trigger = document.getElementById('alerts-trigger');
  if (trigger) {
    trigger.addEventListener('click', () => {
      if (alertsOpen) closeAlerts();
      else openAlerts();
    });
  }

  const overlay = document.getElementById('alerts-overlay');
  if (overlay) {
    overlay.addEventListener('click', (event) => {
      if (event.target.closest('[data-alerts-close]')) closeAlerts();
    });

    overlay.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') { event.preventDefault(); closeAlerts(); return; }
      if (event.key === 'Tab') {
        const focusables = overlay.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const items = Array.from(overlay.querySelectorAll('.alert-item'));
        if (!items.length) return;
        event.preventDefault();
        const idx = items.indexOf(document.activeElement);
        const next = event.key === 'ArrowDown'
          ? (idx + 1) % items.length
          : (idx <= 0 ? items.length - 1 : idx - 1);
        items[next].focus();
      }
    });

    const list = document.getElementById('alerts-list');
    if (list) {
      list.addEventListener('click', (event) => {
        const item = event.target.closest('.alert-item');
        if (!item) return;
        closeAlerts(false);
        activateTab(item.dataset.tab, { focusPanel: true, history: 'push' });
        persistSave();
      });
    }
  }

  updateAlertCenter();
}

/* ── I4 · Mod pas cu pas ──────────────────────────────────
   Un strat vizual peste panoul activ: evidențiază câmp cu
   câmp, cu banner vizibil (🪙) și navigare Anterior/Următor.
   Layout-ul panoului nu se schimbă — doar se adaugă o
   evidențiere și un banner sticky. */
const STEP_TEXT = {
  'sim-suma': 'Începe cu suma care îți definește momentul de acum — punctul de plecare al simulării.',
  'sim-rata': 'Setează inflația anuală medie. 5% e o premisă realistă pentru planificare.',
  'def-suma': 'Introdu suma actuală pe care vrei să o traduci în putere de cumpărare.',
  'def-year': 'Alege anul pentru care vrei deflatorul (anul curent e 2026).',
  'dob-suma': 'Introdu suma depusă la bancă.',
  'dob-rata': 'Setează dobânda anuală brută, înainte de impozit.',
  'dob-zile': 'Numărul de zile pe care banii stau depuși.',
  'dob-impozit': 'Impozitul pe dobândă (10% în România).',
  'comp-suma': 'Introdu suma inițială investită.',
  'comp-contributie': 'Adaugă contribuția lunară, dacă e cazul.',
  'comp-rata': 'Setează randamentul anual așteptat.',
  'di-suma': 'Introdu suma pe care o investești sau o economisești.',
  'di-randament': 'Randamentul nominal anual al investiției.',
  'di-inflatie': 'Inflația anuală cu care compari.',
  'r72-rata': 'Setează randamentul anual — regula 72 îți spune în câți ani se dublează.',
  'r72-suma': 'Introdu suma inițială, ca să vezi dublarea în lei.',
  'r72-ani': 'Numărul de ani în care vrei să vezi evoluția.',
  'timp-venit': 'Introdu venitul lunar net — el transformă prețul în timp de muncă.',
  'timp-pret': 'Prețul dorinței pe care vrei să o achiziționezi.',
  'timp-zile-lucratore': 'Zile lucrătoare pe an (250 e valoarea pentru România 2026).',
  'nuam-venit': 'Introdu venitul lunar net.',
  'nuam-zi': 'Ziua din lună când primești venitul — pentru fluxul zilnic.',
  'nuam-inflatie': 'Inflația cu care comparăm ce economisești.',
  'nuam-economii': 'Suma pe care o adaugi lunar în economii.',
  'nuam-rata': 'Dobânda oferită de bancă.',
  'bg-venit': 'Introdu venitul lunar net — de la el pleacă toate celelalte câmpuri.',
  'bg-nevoi': 'Cheltuielile esențiale: locuință, alimente, utilități, transport, rate.',
  'bg-dorinte': 'Cheltuielile pentru plăcere: restaurante, hobby, călătorii, abonamente.',
  'bg-economii': 'Ce rămâne neatins la final de lună.',
  'fu-cheltuieli': 'Cheltuielile lunare esențiale pe care le-ai acoperi dacă venitul s-ar opri.',
  'fu-luni': 'Perioada acoperită de fond (3–6 luni e zona obișnuită).',
  'fu-dobanda': 'Dobânda la depozit, pentru cei bani deja acumulați.',
  'fu-impozit': 'Impozitul pe dobândă.',
  'fu-suma': 'Suma deja acumulată.',
  'fu-economie': 'Economia lunară cu care completezi fondul.',
  'sf-venit': 'Introdu venitul lunar net.',
  'sf-cheltuieli': 'Cheltuielile esențiale lunare.',
  'sf-economii': 'Economiile lunare.',
  'sf-datorii-lunar': 'Rățile lunare la datorii.',
  'sf-rezerva': 'Rezerva de urgență pe care o ai acum.',
  'sf-active': 'Activele investite, fără rezerva de urgență.',
  'sf-datorii': 'Datoriile totale.',
  'rand-suma': 'Suma pe care o investești.',
  'rand-randament': 'Randamentul nominal anual.',
  'rand-tip-venit': 'Alege tipul de venit — impozitul implicit se setează singur.',
  'rand-impozit': 'Impozitul pe veniturile din investiții.',
  'rand-comisioane': 'Comisioanele anuale totale.',
  'rand-inflatie': 'Inflația cu care traducem totul în putere de cumpărare.',
  'prof-suma': 'Suma investită inițial.',
  'prof-pret-init': 'Prețul inițial sau mediu de achiziție.',
  'prof-pret-vanzare': 'Prețul la care vinzi.',
  'prof-tip-venit': 'Alege tipul de venit — impozitul implicit se setează singur.',
  'prof-impozit': 'Impozitul pe câștig.',
  'prof-comisioane': 'Comisioanele de tranzacționare.',
  'prof-inflatie': 'Inflația cu care comparăm prețul real.',
  'suma-randament': 'Randamentul anual așteptat.',
  'suma-ani': 'Numărul de ani până la țintă.',
  'suma-initiala': 'Suma pe care o ai deja.',
  'suma-dorita': 'Suma țintă pe care vrei să o atingi.',
  'co-suma': 'Suma pe care o lupți sau o investești.',
  'co-ani': 'Durata în ani.',
  'co-randament': 'Randamentul nominal anual al investiției alternative.',
  'co-impozit': 'Impozitul pe câștig.',
  'co-comisioane': 'Comisioanele anuale.',
  'co-inflatie': 'Inflația anuală.',
  'dc-scenariu': 'Alege scenariul de preț (lator, lateral, volatil).',
  'dc-suma': 'Suma totală pe care ai vrea să o investești.',
  'dc-luni': 'Numărul de luni de scalare.',
  'dc-randament': 'Randamentul anual așteptat.',
  'dc-volatilitate': 'Volatilitatea anuală a activului.',
  'cs-curs': 'Cursul RON/valută la momentul de start.',
  'cs-apreciere': 'Aprecierea anuală a valutei față de RON.',
  'cs-ani': 'Perioada analizată.',
  'cs-inflatie': 'Inflația anuală în RON.',
  'cs-suma': 'Suma investită, în valută.',
  'cs-randament': 'Randamentul anual al activului, în valută.',
  'cs-impozit': 'Impozitul pe câștig.',
  'cs-pret-import': 'Prețul unui coș importat, în valută.',
  'dv-suma': 'Suma investită în portofoliu.',
  'dv-corelare': 'Corelația dintre active (0 = independente).',
  'dv-rf': 'Rată fără risc, pentru indicele Sharpe.',
  'as-tip': 'Alege tipul de risc asigurat.',
  'as-prima': 'Prima anuală plătită pentru asigurare.',
  'as-suma': 'Suma asigurată, adică costul pierderii.',
  'as-probabilitate': 'Probabilitatea anuală a evenimentului.',
  'as-ani': 'Numărul de ani pentru comparație.',
  'as-dobanda': 'Dobânda la economii, pentru auto-asigurare.',
  'st-scenariu': 'Alege un scenariu de stres sau setează valori proprii.',
  'st-venit': 'Venitul lunar net în perioada de stres.',
  'st-cheltuieli': 'Cheltuielile esențiale lunare.',
  'st-economii': 'Economiile lunare.',
  'st-rezerva': 'Rezerva de urgență actuală.',
  'st-active': 'Activele investite.',
  'st-luni': 'Durata stresului, în luni.',
  'st-inflatie': 'Inflația anuală.',
  'st-scadere': 'Scăderea venitului, în procente.',
  'st-randament': 'Randamentul activelor în perioada de stres.',
  'dt-suma': 'Suma împrumutată.',
  'dt-dobanda': 'Dobânda anuală a creditului.',
  'dt-durata': 'Durata creditului, în luni.',
  'dt-economie': 'Dobânda anuală la economii.',
  'dt-impozit': 'Impozitul pe dobânda economiilor.',
  'dt-avans': 'Suma lunară suplimentară pentru anticipare.',
  'pn-scenariu': 'Alege un scenariu de contribuție.',
  'pn-varsta': 'Vârsta ta acum.',
  'pn-pensionare': 'Vârsta la care vrei să te pensionezi.',
  'pn-contributie': 'Contribuția lunară la Pilon III.',
  'pn-suma': 'Suma deja acumulată.',
  'pn-randament': 'Randamentul anual brut.',
  'pn-comision': 'Comisionul anual total.',
  'pn-impozit': 'Impozitul pe câștig la retragere.',
  'pn-inflatie': 'Inflația anuală.',
  'tx-tip': 'Alege tipul de venit — rata reală se setează singură.',
  'tx-an': 'Alege anul de aplicare (2025 sau 2026).',
  'tx-castig': 'Introdu câștigul brut.',
};

const STEP_SPECIAL = {
  cost: [
    { sel: '#cost-table', text: 'Tranșele cumpărate se adaugă aici, cu preț și cantitate.' },
    { sel: '#cost-add', text: 'Apasă „+ Adaugă rând” pentru a introduce o tranșă nouă.' },
    { sel: '#cost-reset', text: 'Resetează la valorile implicite dacă vrei să reiei de la zero.' },
  ],
  biase: [
    { sel: '#bq-quiz', text: 'Răspunde la cele cinci întrebări — opțiunea ta se bifează aici.' },
    { sel: '#bq-reset', text: 'Apasă „Resetează testul” pentru a reîncerca.' },
  ],
};

function stepTextFor(field) {
  const override = STEP_TEXT[field.id];
  if (override) return override;
  const label = String(field.label || '').replace(/\s+/g, ' ').trim();
  if (!label) return 'Completează acest câmp.';
  if (field.tag === 'select') return `Alege „${label}”.`;
  if (field.type === 'checkbox' || field.type === 'radio') return `Bifează „${label}”.`;
  return `Introdu „${label}”.`;
}

/* Pur: listează câmpurile data și construiește pasurile. */
function buildStepsFromFields(fields) {
  return fields.map((f) => ({ sel: '#' + f.id, text: stepTextFor(f) }));
}

function fieldsForTab(tabId) {
  const panel = document.getElementById('panel-' + tabId);
  if (!panel) return [];
  const fields = [];
  panel.querySelectorAll('.field').forEach((wrap) => {
    const input = wrap.querySelector('input, select, textarea');
    if (!input || !input.id) return;
    const label = wrap.querySelector('label');
    fields.push({
      id: input.id,
      label: label ? label.textContent.trim() : input.id,
      tag: input.tagName.toLowerCase(),
      type: input.type || '',
    });
  });
  return fields;
}

function stepsForTab(tabId) {
  if (STEP_SPECIAL[tabId]) return STEP_SPECIAL[tabId];
  return buildStepsFromFields(fieldsForTab(tabId));
}

let stepMode = false;
let stepActiveTab = null;
let stepIndex = 0;
let stepList = [];
let stepChipEl = null;

function reducedMotionQuery() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function clearStepTarget() {
  document.querySelectorAll('.is-step-target').forEach((el) => el.classList.remove('is-step-target'));
}

function stepTargetElement(step) {
  if (!step || !step.sel) return null;
  return document.querySelector(step.sel);
}

/* Elementul vizat pentru evidențiere și ecuță: wrapper-ul `.field`
   (dacă există), ca să nu acopere eticheta câmpului. */
function stepFocusTarget(step) {
  const el = stepTargetElement(step);
  return el ? (el.closest('.field') || el) : null;
}

function currentStepFocus() {
  return stepFocusTarget(stepList[stepIndex]);
}

function highlightStepTarget(step) {
  clearStepTarget();
  const el = stepTargetElement(step);
  if (!el) return null;
  const wrap = el.closest('.field') || el;
  wrap.classList.add('is-step-target');
  return el;
}

function ensureStepChip() {
  if (stepChipEl) return stepChipEl;
  stepChipEl = document.createElement('div');
  stepChipEl.className = 'step-chip';
  stepChipEl.id = 'step-chip';
  stepChipEl.hidden = true;
  stepChipEl.setAttribute('aria-hidden', 'true');
  document.body.appendChild(stepChipEl);
  return stepChipEl;
}

function positionStepChip(target) {
  const chip = stepChipEl;
  if (!chip) return;
  if (!stepMode || !target) { chip.hidden = true; return; }
  const r = target.getBoundingClientRect();
  if (!r.width && !r.height) { chip.hidden = true; return; }
  const chipH = chip.offsetHeight || 24;
  let top = r.top - chipH - 8;
  if (top < 64) top = r.bottom + 8; // sub header altfel
  const vw = window.innerWidth || document.documentElement.clientWidth;
  const left = Math.max(70, Math.min(vw - 70, r.left + r.width / 2));
  chip.style.left = left + 'px';
  chip.style.top = top + 'px';
  chip.hidden = false;
}

function applyStep() {
  const step = stepList[stepIndex];
  const count = document.getElementById('step-count');
  const text = document.getElementById('step-text');
  const bar = document.getElementById('step-progress-bar');
  if (count) count.textContent = `Pasul ${stepIndex + 1} din ${stepList.length}`;
  if (text) text.textContent = step ? step.text : '';
  if (bar) bar.style.width = (stepList.length ? ((stepIndex + 1) / stepList.length) * 100 : 0) + '%';

  const el = highlightStepTarget(step);
  const target = el ? (el.closest('.field') || el) : null;
  if (target) {
    target.scrollIntoView({
      block: 'center', inline: 'nearest',
      behavior: reducedMotionQuery() ? 'auto' : 'smooth',
    });
  }
  const chip = ensureStepChip();
  if (chip) {
    chip.textContent = 'Pasul ' + (stepIndex + 1);
    requestAnimationFrame(() => positionStepChip(target));
  }

  const prev = document.getElementById('step-prev');
  const next = document.getElementById('step-next');
  if (prev) prev.disabled = stepList.length < 2;
  if (next) next.disabled = stepList.length < 2;
}

function renderStepBanner() {
  const banner = document.getElementById('step-banner');
  if (!banner) return;
  banner.hidden = false;
  applyStep();
}

function goStep(dir) {
  if (!stepList.length) return;
  stepIndex = (stepIndex + dir + stepList.length) % stepList.length;
  applyStep();
}

function startStepMode() {
  const id = activeTabId();
  if (!id) return;
  stepActiveTab = id;
  stepList = stepsForTab(id);
  if (!stepList.length) return;
  stepMode = true;
  stepIndex = 0;
  document.body.classList.add('is-step-mode');
  const trigger = document.getElementById('step-trigger');
  if (trigger) trigger.setAttribute('aria-pressed', 'true');
  renderStepBanner();
}

function stopStepMode() {
  stepMode = false;
  stepActiveTab = null;
  stepList = [];
  stepIndex = 0;
  document.body.classList.remove('is-step-mode');
  const banner = document.getElementById('step-banner');
  if (banner) banner.hidden = true;
  clearStepTarget();
  if (stepChipEl) stepChipEl.hidden = true;
  const trigger = document.getElementById('step-trigger');
  if (trigger) trigger.setAttribute('aria-pressed', 'false');
}

/* Schimbarea tabului în timpul modului pas cu pas: pasurile
   se reconstruiesc pentru noul tab. */
function retargetStepMode(tabId) {
  if (!stepMode) return;
  stepActiveTab = tabId;
  stepIndex = 0;
  stepList = stepsForTab(tabId);
  if (!stepList.length) { stopStepMode(); return; }
  renderStepBanner();
}

/* Pe „Acasă" nu există panou cu câmpuri: declanșatorul e dezactivat. */
function updateStepTriggerState() {
  const trigger = document.getElementById('step-trigger');
  if (trigger) trigger.disabled = !activeTabId();
}

function initStepMode() {
  const trigger = document.getElementById('step-trigger');
  if (trigger) {
    trigger.addEventListener('click', () => {
      if (stepMode) stopStepMode();
      else startStepMode();
    });
  }
  updateStepTriggerState();

  const prev = document.getElementById('step-prev');
  const next = document.getElementById('step-next');
  const stop = document.getElementById('step-stop');
  if (prev) prev.addEventListener('click', () => goStep(-1));
  if (next) next.addEventListener('click', () => goStep(1));
  if (stop) stop.addEventListener('click', stopStepMode);

  const banner = document.getElementById('step-banner');
  if (banner) {
    banner.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); goStep(-1); }
      else if (event.key === 'ArrowRight') { event.preventDefault(); goStep(1); }
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !stepMode) return;
    if (searchOpen || alertsOpen) return;
    event.preventDefault();
    stopStepMode();
    const t = document.getElementById('step-trigger');
    if (t) t.focus();
  });

  window.addEventListener('scroll', () => {
    if (stepMode) positionStepChip(currentStepFocus());
  }, { passive: true });
  window.addEventListener('resize', () => {
    if (stepMode) positionStepChip(currentStepFocus());
  });
}

/* ── I7 · Copiere rezultat ─────────────────────────────────
   Fiecare indicator (.stat-value) primește un buton mic care
   copiază valoarea formatată. */
const COPY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';
const CHECK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

function announceCopy(message) {
  const live = document.getElementById('copy-live');
  if (live) live.textContent = message;
}

function copyFallback(text) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch (e) {
    return false;
  }
}

function copyStatValue(btn, value) {
  const text = (value.textContent || '').trim();
  if (!text || text === '—') {
    announceCopy('Nicio valoare de copiat.');
    return;
  }
  const done = (ok) => {
    announceCopy(ok ? 'Copiat: ' + text : 'Nu s-a putut copia.');
    btn.classList.toggle('is-copied', ok);
    btn.innerHTML = ok ? CHECK_ICON : COPY_ICON;
    window.setTimeout(() => {
      btn.classList.remove('is-copied');
      btn.innerHTML = COPY_ICON;
    }, 1400);
  };
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => done(true), () => done(copyFallback(text)));
  } else {
    done(copyFallback(text));
  }
}

function initCopyButtons() {
  document.querySelectorAll('.stat-value').forEach((value) => {
    if (!value.id) return;
    if (value.closest('.stat-value-wrap')) return;
    const stat = value.closest('.stat');
    const labelEl = stat ? stat.querySelector('.stat-label') : null;
    const label = labelEl ? labelEl.textContent.trim() : 'Valoare';

    const wrap = document.createElement('span');
    wrap.className = 'stat-value-wrap';
    value.parentNode.insertBefore(wrap, value);
    wrap.appendChild(value);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'copy-btn';
    btn.dataset.copyOf = value.id;
    btn.setAttribute('aria-label', 'Copiază valoarea „' + label + '”');
    btn.title = 'Copiază valoarea';
    btn.innerHTML = COPY_ICON;
    wrap.appendChild(btn);
  });

  document.addEventListener('click', (event) => {
    const btn = event.target && event.target.closest ? event.target.closest('.copy-btn') : null;
    if (!btn) return;
    const value = document.getElementById(btn.dataset.copyOf);
    if (value) copyStatValue(btn, value);
  });
}

/* ── I8 · Animații discrete ────────────────────────────────
   Count-up pe valori la recalcul, tranziție de panou și puls
   pe badge-ul de alerte. Toate respectă prefers-reduced-motion
   (verificare în JS + regula globală din CSS). */

/* Extrage numărul dintr-o valoare formatată (en-US): „5,000.00 lei”,
   „0.3%”, „1,234”, „12.5x”. Returnează {value, decimals, prefix, suffix}
   sau null dacă textul nu conține un număr. */
function parseFormattedNumber(text) {
  const s = String(text == null ? '' : text).trim();
  if (!s) return null;
  const m = s.match(/-?\d[\d.,]*/);
  if (!m) return null;
  const raw = m[0];
  let token = raw.replace(/\s/g, '');
  const neg = token.charAt(0) === '-';
  token = token.replace(/^-/, '');
  const hasComma = token.indexOf(',') !== -1;
  const hasDot = token.indexOf('.') !== -1;
  let numStr;
  let decimals = 0;
  if (hasComma && hasDot) {
    // en-US: virgula separă miile, punctul desparte zecimalele.
    decimals = token.length - token.indexOf('.') - 1;
    numStr = token.replace(/,/g, '');
  } else if (hasDot) {
    // Doar punct: separator zecimal (ex. „0.3", „12.5").
    decimals = token.length - token.indexOf('.') - 1;
    numStr = token;
  } else if (hasComma) {
    // Doar virgule: separator de mii (ex. „1,234"), fără zecimale.
    numStr = token.replace(/,/g, '');
  } else {
    numStr = token;
  }
  const value = Number(numStr);
  if (!Number.isFinite(value)) return null;
  return {
    value: neg ? -value : value,
    decimals,
    prefix: s.slice(0, m.index),
    suffix: s.slice(m.index + raw.length),
  };
}

function formatStatValue(value, decimals) {
  return value.toLocaleString(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function animateStatValue(el) {
  const prev = el.dataset.statPrev;
  const cur = el.textContent;
  el.dataset.statPrev = cur;
  if (el.__animating || prev === cur) return;
  if (reducedMotionQuery()) return;
  const a = parseFormattedNumber(prev);
  const b = parseFormattedNumber(cur);
  if (!a || !b) return;
  if (Math.abs(a.value - b.value) < 1e-9) return;

  el.__animating = true;
  const duration = 380;
  const start = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const tick = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const v = a.value + (b.value - a.value) * eased;
    el.textContent = b.prefix + formatStatValue(v, b.decimals) + b.suffix;
    if (t < 1) el.__raf = requestAnimationFrame(tick);
    else {
      el.textContent = cur;
      el.__animating = false;
    }
  };
  el.__raf = requestAnimationFrame(tick);
}

function initCountUp() {
  if (typeof MutationObserver === 'undefined') return;
  const observer = new MutationObserver((mutations) => {
    const seen = new Set();
    mutations.forEach((mutation) => {
      let el = mutation.target;
      if (el && el.nodeType === 3) el = el.parentNode;
      if (el && el.classList && el.classList.contains('stat-value')) seen.add(el);
      else if (el && el.closest) {
        const v = el.closest('.stat-value');
        if (v) seen.add(v);
      }
    });
    seen.forEach((el) => animateStatValue(el));
  });
  document.querySelectorAll('.stat-value').forEach((el) => {
    observer.observe(el, { childList: true, characterData: true, subtree: true });
  });
}

/* ── Tooltips accesibile pentru formule ─────────────────────
   Fiecare element cu `data-tip="cheie"` primește un declanșator
   „?" (buton focusabil) și un panou `role="tooltip"`, legat prin
   `aria-describedby`. Se deschide la focus, hover sau click și se
   închide cu Escape, la pierderea focusului/sauurii sau la click
   în afara. Nu folosim `title` nativ — e invizibil la tastatură
   și pe ecranele tactile. */

const FORMULA_TIPS = {
  'fu-dobanda-real': {
    title: 'Dobânda reală pe un an',
    text: 'Dobânda netă actualizată cu inflația de referință (media pe 12 luni din CONFIG_AN): (1 + netă/țintă) ÷ (1 + inflație) − 1, înmulțit cu ținta. Numeric negativ înseamnă că dobânda nu acoperă inflația.'
  },
  'suma-real': {
    title: 'Puterea de cumpărare a țintei',
    text: 'Suma dorită adusă în lei de azi: țintă ÷ (1 + inflație de referință)^ani. Arată ce poți cumpăra efectiv când atingi ținta.'
  },
  'dc-valoare-real': {
    title: 'Valoare reală · DCA',
    text: 'Valoarea finală DCA împărțită la (1 + inflație de referință)^ani. Compară rezultatul cu puterea de cumpărare de la începutul perioadei.'
  },
  'sim-compound': {
    title: 'Suma necesară în anul N',
    text: 'Suma actuală × (1 + rata inflației)<sup>N−1</sup>. Anul 1 = anul curent, deci suma rămâne cea introdusă. Exemplu: 5.000 lei la 5% ajung la 5.250 lei în anul 2.'
  },
  'deflator': {
    title: 'Echivalentul în anul A',
    text: 'Suma actuală ÷ Π (1 + rata inflației anuale), pentru anii A+1, A+2, …, 2026. Rândul A arată cât puteai cumpăra în anul A cu banii din 2026. Anul 2026 păstrează suma neschimbată.'
  },
  'timp-basis': {
    title: 'Baza de calcul a timpului',
    text: 'Venitul pe zi = venitul lunar net ÷ 30.44 (media reală de zile pe lună, 365/12). Pe oră = ÷ 24. Pe minut = ÷ 60. Pe zi lucrătoare = ÷ 20. Pe oră lucrătoare = ÷ 8 ore.'
  },
  'timp-minute': {
    title: 'Minute de muncă',
    text: 'Prețul dorinței ÷ venitul pe minut. Un minut de muncă = 1/60 dintr-o oră, iar o oră = 1/24 dintr-o zi de 30.44 de zile.'
  },
  'timp-oreluc': {
    title: 'Ore lucrate',
    text: 'Prețul dorinței ÷ venitul pe oră lucrătoare. Ține cont doar de zilele și orele de lucru (8 ore pe zi lucrătoare).'
  },
  'timp-zile-lucratore': {
    title: 'Zile lucrătoare într-un an',
    text: 'Zilele lucrătoare = zile calendaristice − weekenduri − sărbători legale: 365 − 104 (52 × 2) − 11 sărbători care cad în timpul săptămânii (din 16) = 250 în România, în 2026. De ce contează: venitul pe zi lucrătoare = venitul anual (12 × lunar) ÷ zilele lucrătoare, iar „% dintr-un an lucrător" = zilele lucrate ÷ zilele lucrătoare. Cu mai puține zile lucrătoare, fiecare zi valorează mai mult. Procentul dintr-un an lucrător este echivalent cu prețul ÷ venitul anual, deci nu se modifică odată cu numărul de zile. Surse: calendarul sărbătorilor legale — <a href="https://legislatie.just.ro/Public/DetaliiDocument/128647" target="_blank" rel="noopener">legislatie.just.ro</a>; date macro — <a href="https://insse.ro/cms/en/content/cpi-annual-data-series" target="_blank" rel="noopener">INS</a>.'
  },
  'dob-brut': {
    title: 'Dobânda brută',
    text: 'ROUND(sumă × rată × zile ÷ 365, 2). Rata e anuală (7% = 0.07), iar zilele sunt calendaristice. Rezultatul e înainte de impozit.'
  },
  'dob-net': {
    title: 'Dobânda netă',
    text: 'ROUND((1 − impozit) × brut, 2). Impozitul e un procent din dobândă (10% = 0.10), nu din sumă.'
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
    text: 'Dobândă: 10% (2025). Dividende: 10% (2025) / 16% (2026). Valori mobiliare, broker RO, deținut ≥ 1 an: 1% (2025) / 3% (2026); < 1 an: 3% / 6%. Valori mobiliare prin broker străin sau crypto: 10% (2025) / 16% (2026). Selectează „Tipul de venit” pentru a aplica rata corectă. Tabelul complet — cu imobiliare, chiriile și pensia privată — e în tabul „Impozitare pe investiții”. Surse: <a href="https://taxsummaries.pwc.com/romania/individual/significant-developments" target="_blank" rel="noopener">PwC</a>, <a href="https://www.ey.com/en_gl/technical/tax-alerts/romanian-tax-changes-introduced-by-new-fiscal-and-budgetary-measures" target="_blank" rel="noopener">EY</a>.'
  },
  'comisioane': {
    title: 'Comisioanele de tranzacționare',
    text: 'Media reală de pe piață: 0.1–0.5% la brokerii români (0.3% e tariful online cel mai răspândit), 0.5–1% la brokerii străini; crypto/CFD-uri pot ajunge la 1–2%. Valoarea din aplicație (0.3%) e media pieței RO pentru acțiuni. Surse: <a href="https://www.money.ro/invata/brokeri-autorizati" target="_blank" rel="noopener">money.ro</a>, <a href="https://www.wall-street.ro/articol/Money/201325/cat-te-costa-sa-cumperi-actiuni-pe-bursa-si-care-sunt-sumele-minime-de-care-ai-nevoie.html" target="_blank" rel="noopener">wall-street.ro</a> (grile de comisioane, octombrie 2026).'
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
    text: 'Intervalul real pentru depozitele nou deschise în România: 3–4% pe an (2025–2026). Media dobânzii la depozitele noi ale populației a fost 5.39% la finalul 2025, iar cele mai bune oferte ~6.75–7% (BNR). Valoarea din aplicație e prudentă, nu promoțională.'
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
    title: 'Randamentul real istoric 2000–2026',
    text: 'Pentru fiecare an, (1 + randament nominal constant) ÷ (1 + inflația anuală INS) − 1. Un depozit „sigur” poate fi negativ real în anii cu inflație ridicată. Sursa: INS — IPC național, serie anuală (<a href="https://insse.ro/cms/en/content/cpi-annual-data-series" target="_blank" rel="noopener">insse.ro</a>).'
  },
  'di-cash-real': {
    title: 'Cash păstrat 27 de ani',
    text: 'Suma ÷ produsul inflației 2000–2026. Câtă putere de cumpărare din 2026 mai are banii notați în 2000.'
  },
  'di-investit-real': {
    title: 'La randamentul nominal',
    text: 'Suma × (1 + nominal)^27 ÷ produsul inflației — aceiași bani compuși nominal 27 de ani, aduși în putere de cumpărare din 2026.'
  },
  'di-diferenta': {
    title: 'Diferența pe termen lung',
    text: 'Valoarea reală de la randament nominal − valoarea reală a cash-ului, pe 27 de ani. Pozitivă când randamentul depășește inflația acumulată.'
  },
  'r72-regula': {
    title: 'Regula 72',
    text: 'Ani până la dublare ≈ 72 ÷ rată (în procente). O scurtătură bazată pe compunere; la 7% dă ~10.3 ani, iar compunerea exactă dă 10.24 ani. Cea mai precisă pentru rate de 6–10%.'
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
    text: 'Cheltuielile lunare esențiale × numărul de luni (3–6). Reprezintă cât ai avea nevoie dacă venitul s-ar opri complet. Surse: BNR — dobânzi la depozite (<a href="https://www.bnr.ro/1936-piete-financiare" target="_blank" rel="noopener">bnr.ro</a>), INS — inflație (<a href="https://insse.ro/cms/en/content/cpi-annual-data-series" target="_blank" rel="noopener">insse.ro</a>).'
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
    text: 'Suma judicioasă acum, pentru 3–6 luni de cheltuieli esențiale. Rezerva se adaugă la activele din net worth.'
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
  'dv-suma': {
    title: 'Suma investită',
    text: 'Valoarea de plecare a portofoliului. Se folosește pentru scenariile și pentru simulare; calculele de randament și volatilitate nu depind de ea.'
  },
  'dv-corelare': {
    title: 'Corelația dintre active',
    text: 'Cât de mult se mișcă activele împreună, de la −100% (se mișcă exact invers) la +100% (se mișcă identic). 0% = independente. Cu cât e mai mică, cu atât diversificarea reduce mai mult volatilitatea. Surse: <a href="https://www.bnr.ro/1936-piete-financiare" target="_blank" rel="noopener">BNR</a>, <a href="https://www.asfromania.ro/ro/a/1687/ghiduri-investitori-piata-capital" target="_blank" rel="noopener">ASF</a>.'
  },
  'dv-rf': {
    title: 'Rată fără risc',
    text: 'Randamentul unui activ considerat fără risc (de regulă dobânda la depozit sau un titlu de stat scurt). Folosită pentru randamentul ajustat la risc: (randament − rată fără risc) ÷ volatilitate.'
  },
  'dv-randament': {
    title: 'Randamentul portofoliului',
    text: 'Σ pondere × randament anual așteptat. Media ponderată a randamentelor activelor.'
  },
  'dv-volatilitate': {
    title: 'Volatilitatea portofoliului',
    text: 'Radical din Σᵢ Σⱼ pondereᵢ × pondereⱼ × volatilitateᵢ × volatilitateⱼ × corelațieᵢⱼ, cu corelația 1 pe diagonală. E deviația standard a randamentului anual, în procente.'
  },
  'dv-reducere': {
    title: 'Reducerea volatilității',
    text: 'Media ponderată a volatilităților − volatilitatea portofoliului. Diferența e exact ceea ce diversificarea aduce: aceiași active, combinate, oscilează mai puțin decât media lor.'
  },
  'dv-sharpe': {
    title: 'Randament ajustat la risc',
    text: '(Randamentul portofoliului − rată fără risc) ÷ volatilitate. Câți bani câștigi pentru fiecare unitate de risc. Valoare mai mare = recompensă mai bună pentru volatilitate.'
  },
  'dv-cmp': {
    title: 'Portofoliul vs un singur activ',
    text: 'Activul comparat e cel cu randamentul așteptat cel mai mare. Simularea: 5.000 de scenarii × 5 ani, randamente normale corelate (seed fix, deci reproducibilă). p5 = valoarea de sub care nu cobori în 95% din cazuri; drawdown-ul mediu = maximul scăderii de la un maxim istoric în cadrul fiecărui scenariu.'
  },
  'as-tip': {
    title: 'Tipul de risc',
    text: 'Presetul setează prima, suma asigurată și probabilitatea cu valori ilustrative pentru sănătate, casă și mașină. Alege „Personalizat” pentru a introduce propriile valori.'
  },
  'as-prima': {
    title: 'Primă anuală de asigurare',
    text: 'Suma pe care o plătești în fiecare an pentru a transfera riscul către asigurator. E costul garantat, indiferent dacă evenimentul se întâmplă sau nu.'
  },
  'as-suma': {
    title: 'Suma asigurată / costul pierderii',
    text: 'Ce ai plăti dacă evenimentul se realizează complet (pierdere totală). La auto-asigurare, aceasta e suma pe care trebuie să o ai disponibilă.'
  },
  'as-probabilitate': {
    title: 'Probabilitatea anuală a evenimentului',
    text: 'Șansa ca evenimentul să se întâmple într-un an. Pierderea anuală așteptată = probabilitate × suma asigurată.'
  },
  'as-ani': {
    title: 'Număr de ani',
    text: 'Orizontul comparării. Probabilitatea de cel puțin un eveniment crește cu numărul de ani: 1 − (1 − probabilitate)^ani.'
  },
  'as-dobanda': {
    title: 'Dobânda la economii',
    text: 'Costul oportunității al banilor dați ca primă: dacă nu plătești prima și îi pui la dobândă, ajungi la prima × ((1 + rată)^ani − 1) ÷ rată.'
  },
  'as-cost-prime': {
    title: 'Cost total al primelor',
    text: 'Primă × ((1 + dobândă)^ani − 1) ÷ dobândă — valoarea acumulată a primelor dacă le pui la dobândă. Cu dobândă zero, e primă × ani.'
  },
  'as-pierdere-anuala': {
    title: 'Pierderea anuală așteptată',
    text: 'Probabilitate × suma asigurată. E pierderea medie pe an dacă riști singur, nu ce plătești cel mai probabil într-un an anume.'
  },
  'as-diferenta': {
    title: 'Diferența primă − pierdere așteptată',
    text: 'Pozitivă: prima costă mai mult decât pierderea medie — diferența e prețul liniștii, al administrării și marjei asiguratorului. Negativă: în medie auto-asigurarea pare mai ieftină, dar expunerea la o pierdere mare rămâne.'
  },
  'as-prob': {
    title: 'Cel puțin un eveniment în N ani',
    text: '1 − (1 − probabilitate)^ani. Probabilitățile mici de pe un an se acumulează pe orizonturi lungi.'
  },
  'st-scenariu': {
    title: 'Scenariul de stres',
    text: 'Presetul setează inflația, scăderea venitului și randamentul activelor. Alege „Personalizat” pentru propriile valori.'
  },
  'st-venit': {
    title: 'Venit lunar net',
    text: 'Venitul după impozite, pe lună — baza bugetului sub stres.'
  },
  'st-cheltuieli': {
    title: 'Cheltuieli esențiale',
    text: 'Cheltuielile pe care le-ai păstra și fără venit. Sub stres cresc odată cu inflația pe durata aleasă.'
  },
  'st-economii': {
    title: 'Economii lunare',
    text: 'Suma pusă deoparte în mod normal. Sub stres, inflația erodează puterea sa de cumpărare.'
  },
  'st-rezerva': {
    text: 'Suma judicioasă disponibilă acum. Rezerva acoperă luni de deficit = rezerva ÷ (cheltuieli noi − venit nou).',
    title: 'Rezerva de urgență actuală'
  },
  'st-active': {
    title: 'Active investite',
    text: 'Valoarea activelor care depind de randament (acțiuni, obligațiuni, fonduri). Sub stres, scad cu randamentul introdus.'
  },
  'st-luni': {
    title: 'Durata stresului',
    text: 'Numărul de luni pentru care se menține scenariul. Inflația se acumulează pe durată: (1 + inflație)^(luni ÷ 12).'
  },
  'st-inflatie': {
    title: 'Inflația anuală',
    text: 'Rata anuală cu care cresc cheltuielile esențiale și scade puterea de cumpărare a economiilor. Surse: <a href="https://insse.ro/cms/en/content/cpi-annual-data-series" target="_blank" rel="noopener">INS</a>, <a href="https://www.bnr.ro/uploads/2026-11-16raportasuprainflatiei,noiembrie2026_documentpdf_545_1794821695.pdf" target="_blank" rel="noopener">BNR</a>.'
  },
  'st-scadere': {
    title: 'Scăderea venitului',
    text: 'Cu cât scade venitul în scenariu, în procente. Venitul sub stres = venit × (1 − scădere).'
  },
  'st-randament': {
    title: 'Randamentul activelor',
    text: 'Randamentul anual aplicat activelor în scenariu. Negativ înseamnă pierdere de valoare.'
  },
  'st-venit-nou': {
    title: 'Venitul sub stres',
    text: 'Venitul lunar × (1 − scădere).'
  },
  'st-cheltuieli-noi': {
    title: 'Cheltuielile ajustate la inflație',
    text: 'Cheltuielile esențiale × (1 + inflație)^(luni ÷ 12).'
  },
  'st-sold-lunar': {
    title: 'Soldul lunar sub stres',
    text: 'Venitul nou − cheltuielile noi. Negativ înseamnă deficit pe care rezerva trebuie să-l acopere.'
  },
  'st-luni-rezerva': {
    title: 'Rezerva acoperă',
    text: 'Rezerva ÷ deficitul lunar. Câte luni poți ține fără venit, la cheltuielile și venitul din scenariu.'
  },
  'st-putere-economii': {
    title: 'Puterea de cumpărare a economiei lunare',
    text: 'Economia lunară ÷ (1 + inflație)^(luni ÷ 12). Cât poți cumpăra, la prețurile de după perioada de stres, cu banii economisiți în mod normal.'
  },
  'st-active-noi': {
    title: 'Activele după randament',
    text: 'Activele × (1 + randament). Valoarea portofoliului în scenariu.'
  },
  'st-pierdere-active': {
    title: 'Pierderea activelor',
    text: 'Activele − activele după randament, dacă e pozitivă. Zero înseamnă că scenariul nu a degradat activele.'
  },
  'st-randament-revenire': {
    title: 'Randamentul de revenire',
    text: 'Activele inițiale ÷ activele noi − 1. O pierdere de 20% cere un câștig de 25% pentru a reveni la valoarea inițială.'
  },
  'st-scenarii': {
    title: 'Valoarea așteptată',
    text: 'Σ probabilitate × valoare finală, pentru scenariile optimist, bază și pesimist. E media ponderată, nu o predicție: scenariul pesimist arată riscul pe care îl iei, nu ce se va întâmpla cu siguranță.'
  },
  'pn-scenariu': {
    title: 'Scenariul de randament',
    text: 'Presetul setează randamentul anual brut și inflația. „Istoric” folosește media fondurilor Pilon III pe 2007–2025 (ultimul an complet; 6.7% pe an, APAPR/ASF). Alege „Personalizat” pentru propriile valori.'
  },
  'pn-varsta': {
    title: 'Vârsta acum',
    text: 'Vârsta la care începi să contribuie. Orizontul până la pensionare e cea mai importantă variabilă: cu cât e mai lung, cu atât compunerea aduce mai mult.'
  },
  'pn-pensionare': {
    title: 'Vârsta la pensionare',
    text: 'La Pilon III, banii pot fi retrași de la 60 de ani; din 2026 nu mai e necesar pragul de 90 de contribuții lunare (Norma ASF 10/2026). Numărul de ani = diferența dintre cele două vârste.'
  },
  'pn-contributie': {
    title: 'Contribuția lunară',
    text: 'Suma virată în fiecare lună. La Pilon III trebuie să fie de minimum 45–50 de lei și poate ajunge la 15% din venitul brut lunar. Contribuțiile de până la 400 EUR/an sunt deductibile din venitul impozabil.'
  },
  'pn-suma': {
    title: 'Suma deja acumulată',
    text: 'Activul pe care îl ai acum în fond (0 dacă abia începi). Se adaugă la contribuții și e compus la fel ca ele.'
  },
  'pn-randament': {
    text: 'Randamentul anual brut al fondului, înainte de comisioane. Randamentul istoric mediu al Pilon III e 6.7% pe an (2007–2025, ultimul an complet), dar un an bun (2025: 19.6%) nu e regulă.',
    title: 'Randament anual brut'
  },
  'pn-comision': {
    title: 'Comision anual total',
    text: 'Costul ascuns, scos din randament. La Pilon III: 3–5% din contribuție (maxim 5%) plus 0.091–0.195% lunar din activul net (maxim 0.2% pe lună), adică ~1.5% pe an. Pe 30 de ani, comisioanele pot costa peste un sfert din valoare.'
  },
  'pn-impozit': {
    title: 'Impozitul pe câștig la retragere',
    text: 'La retragere se impozitează doar câștigul (activul − contribuțiile vărsate), cu 10%, cu un prag lunar neimpozabil de 3.000 lei; peste prag se adaugă CASS 10%. Contribuțiile nu se impozitează a doua oară.'
  },
  'pn-inflatie': {
    title: 'Inflația anuală',
    text: 'Folosită pentru valoarea reală de la pensionare: câți bani din astăzi valorează suma acumulată. Media 2007–2025 (ultimul an complet) a fost 4.9% pe an (INS).'
  },
  'pn-final-brut': {
    title: 'Valoarea brută la pensionare',
    text: 'Suma inițială × (1+r)^n + contribuția × ((1+r)^n − 1) ÷ r, cu r = randamentul brut ÷ 12 și n = numărul de luni. Înainte de comisioane și impozit.'
  },
  'pn-final-cost': {
    title: 'După comisioane',
    text: 'Aceeași formulă, cu r = (randamentul − comisionul) ÷ 12. Diferența față de valoarea brută e exact costul comisioanelor ascunse.'
  },
  'pn-final-net': {
    title: 'Valoarea netă la retragere',
    text: 'După comisioane, minus impozitul pe câștig: (valoarea − contribuțiile totale) × impozit, doar dacă e pozitiv.'
  },
  'pn-contributii': {
    title: 'Contribuții totale',
    text: 'Suma inițială + contribuția lunară × numărul de luni. Sunt banii tăi depuși, care nu se impozitează la retragere.'
  },
  'pn-castig': {
    title: 'Câștig brut',
    text: 'Valoarea brută − contribuțiile totale. Partea crescută doar din randament (înainte de comisioane și impozit).'
  },
  'pn-impozit-lei': {
    title: 'Impozitul la retragere',
    text: '10% din câștigul după comisioane, doar dacă e pozitiv. Nu se impozitează pe pierdere.'
  },
  'pn-cost-comisioane': {
    title: 'Costul comisioanelor',
    text: 'Valoarea brută − valoarea după comisioane. E cea mai ușor trecută cu vederea linie de cost, pentru că nu apare ca o plată separată.'
  },
  'pn-rand-efectiv': {
    title: 'Randament anual efectiv',
    text: 'Randamentul brut minus comisionul anual — aceeași convenție ca „randament net = brut × (1 − impozit − comisioane)” din taburile Randament și Profit. E aproximația standard a costului ascuns; diferența exactă în lei o vezi în „Costul comisioanelor”.'
  },
  'pn-valoare-reala': {
    title: 'Valoarea reală la pensionare',
    text: 'Valoarea netă ÷ (1 + inflație)^ani. Cât poți cumpăra efectiv, cu prețurile de astăzi, la pensionare.'
  },
  'pn-evolutie': {
    title: 'Evoluția pe ani',
    text: 'Pentru fiecare an: contribuțiile totale, valoarea brută, valoarea după comisioane, impozitul dacă retrageai atunci și valoarea netă. Uită-te la ultimii ani: acolo se adaugă cel mai mult.'
  },
  'tx-tip': {
    title: 'Tipul de venit',
    text: 'Cota depinde mai întâi de natura venitului și, pentru valori mobiliare, de cine e brokerul și cât de mult ai deținut. Lista folosește ratele reale 2025 → 2026.'
  },
  'tx-an': {
    title: 'Anul de aplicare',
    text: 'Din 2026 cotele pe dividende, pe valori mobiliare și pe crypto cresc. Alege anul pentru a vedea diferența.'
  },
  'tx-castig': {
    title: 'Câștig brut',
    text: 'Baza de impozitare: dobânda brută, dividendul brut, plusvaloarea sau valoarea tranzacției (imobiliare). Nu toată suma investită.'
  },
  'tx-rata': {
    title: 'Cota aplicată',
    text: 'Procentul aplicat pe baza de impozitare pentru tipul și anul ales.'
  },
  'tx-impozit-lei': {
    title: 'Impozitul (lei)',
    text: 'Câștig brut × cotă.'
  },
  'tx-net': {
    title: 'Net rămas',
    text: 'Câștig brut − impozit. Nu include comisioanele de tranzacționare, care sunt un cost separat.'
  },
  'tx-diferenta': {
    title: 'Diferența vs celălalt an',
    text: 'Impozitul din anul ales − impozitul din celălalt an (2025 ↔ 2026), la același câștig. Pozitivă = plătești mai mult acum.'
  },
  'tx-tabel': {
    title: 'Tabelul cu rate reale',
    text: 'Ratele se aplică pe baza indicată, nu pe toată suma. Pentru valori mobiliare, reține regula: întâi brokerul (românesc sau străin), apoi perioada de deținere (≥ 365 zile sau nu). Surse: PwC, EY, RSM, ASF — linkurile sunt în coloana „Sursă”.'
  },
  'dt-suma': {
    title: 'Suma împrumutată',
    text: 'Suma inițială împrumutată. Toate celelalte valori (rata, costul total, economiile) se calculează de la ea.'
  },
  'dt-dobanda': {
    title: 'Dobânda anuală a creditului',
    text: 'Rata nominală pe an. Fiecare leu plătit în plus anticipat economisește exact această rată pe an — de aceea se numește „randamentul garantat al anticipării”. Surse: BNR.'
  },
  'dt-durata': {
    title: 'Durata (luni)',
    text: 'Numărul de luni de credit. Rata lunară e anuitate constantă: P·i ÷ (1 − (1+i)<sup>−n</sup>), cu i = dobânda ÷ 12.'
  },
  'dt-economie': {
    title: 'Dobânda anuală la economii',
    text: 'Dobânda brută la depozit / obligații. Impozitul pe dobândă se scade din ea: randamentul net = brut × (1 − impozit).'
  },
  'dt-impozit': {
    title: 'Impozitul pe dobânda economiilor',
    text: 'Cota reținută la sursă pe dobânda de la economii. La rate mari, impozitul mănâncă o parte semnificativă din randament.'
  },
  'dt-avans': {
    title: 'Suma lunară suplimentară',
    text: 'Suma pe care ai putea să o plătești anticipat SAU să o pui la economii. Aceeași sumă e comparată în cele două scenarii, la aceeași dobândă netă.'
  },
  'dt-rata': {
    title: 'Rata lunară',
    text: 'Anuitate constantă: P·i ÷ (1 − (1+i)<sup>−n</sup>). La dobândă zero, rata = P ÷ n. Include dobândă și o parte din capital, în sumă fixă tot timpul.'
  },
  'dt-cost-total': {
    title: 'Costul total al creditului',
    text: 'Totalul dobânzii plătite pe toată durata, fără anticipare: suma ratelor lunare − suma împrumutată.'
  },
  'dt-cost-antic': {
    title: 'Cost total cu anticipare',
    text: 'Dobânda totală dacă plătești și suma suplimentară în fiecare lună. Scade pentru că soldul scade mai repede.'
  },
  'dt-economie-dobanda': {
    title: 'Dobânda economisită',
    text: 'Costul total fără anticipare − costul total cu anticipare. E dobânda pe care o eviți plătind mai devreme.'
  },
  'dt-rand-antic': {
    title: 'Randamentul garantat al anticipării',
    text: 'Cu alte cuvinte, dobânda anuală a creditului. Fiecare leu anticipat în plus îți economisește această rată pe an, fără risc și fără impozit.'
  },
  'dt-castig-economie': {
    title: 'Câștig net din economisire',
    text: 'Valoarea economiilor la finalul duratei − sumele puse. Aceeași sumă lunară, la dobânda netă, compusă lunar.'
  },
  'dt-prag': {
    title: 'Prag de indiferență',
    text: 'Dobânda brută de la economii de la care economisirea devine mai bună decât anticiparea: r ÷ (1 − impozit). Peste prag, economisirea câștigă pe hârtie.'
  },
  'dt-diferenta': {
    title: 'Diferența',
    text: 'Dobânda economisită prin anticipare − câștigul net din economisire. Pozitivă = anticiparea te lasă mai bogat în această comparație.'
  },
  'dt-verdict': {
    title: 'Verdict',
    text: 'Arbitrajul: dobânda creditului vs randamentul net al economiilor. Dobândă mai mare → anticiparea; randament net mai mare → economisirea, dar cu risc. La egalitate, contează lichiditatea și riscul pe care îl accepți.'
  },
  'dt-evolutie': {
    title: 'Evoluția pe ani',
    text: 'Valori cumulative pe an (12 luni). „Diferența” = (dobânda fără anticipare − dobânda cu anticipare) − economiile acumulate.'
  },
  'dt-tabel': {
    title: 'Datorii bune vs rele',
    text: 'Clasificarea e calitativă, nu o recomandare. Contează dobânda, scopul împrumutului și ce altceva ai putea face cu banii. Surse: BNR, Investor.gov.'
  },
  'dc-scenariu': {
    title: 'Scenariu de preț',
    text: 'Patru căi deterministe: creștere compusă, scădere compusă, scădere și recuperare (volatil) și creștere cu oscilații. Alegerea setează automat randamentul și volatilitatea; le poți apoi modifica.'
  },
  'dc-suma': {
    title: 'Suma totală de investit',
    text: 'Suma pe care ai vrea să o investești. DCA o împarte în tranșe egale pe luni; investirea o dată o plătește integral la început.'
  },
  'dc-luni': {
    title: 'Număr de luni',
    text: 'Numărul de tranșe lunare. Investiția lunară = suma ÷ numărul de luni.'
  },
  'dc-randament': {
    title: 'Randament anual',
    text: 'Folosit în scenariile de creștere / scădere. Rata lunară = anuală ÷ 12.'
  },
  'dc-volatilitate': {
    title: 'Volatilitate anuală',
    text: 'Folosită în scenariile cu oscilații. Abaterea lunară = anuală ÷ √12 (volatilitatea e o deviație standard, nu o rată compusă).'
  },
  'dc-pret-final': {
    title: 'Preț final',
    text: 'Indicele de preț la ultima lună (start = 100). În scenariul „volatil” prețul se întoarce la start, deci diferența e dată doar de cumpărările la preț scăzut.'
  },
  'dc-cost-mediu': {
    title: 'Costul mediu de achiziție',
    text: 'Suma investită ÷ unitățile cumpărate cu DCA. E media armonică a prețurilor, deci e de obicei mai mică decât prețul mediu aritmetic.'
  },
  'dc-pret-mediu': {
    title: 'Prețul mediu aritmetic',
    text: 'Media simplă a prețurilor lunare. DCA nu poate coborî sub media aritmetică decât dacă prețurile variază.'
  },
  'dc-valoare-dca': {
    title: 'Valoarea finală · DCA',
    text: 'Unitățile cumpărate cu suma fixă lunară, evaluate la prețul final.'
  },
  'dc-valoare-lump': {
    title: 'Valoarea finală · o dată',
    text: 'Suma integrală investită la prețul primei luni, evaluată la prețul final.'
  },
  'dc-diferenta': {
    title: 'Diferența',
    text: 'Valoarea DCA − valoarea investirii o dată. Pozitivă = DCA câștigă în scenariul ales.'
  },
  'dc-verdict': {
    title: 'Verdict',
    text: 'În creștere, investirea o dată dă de obicei mai mult; în scădere sau volatilitate, DCA. Verdictul e specific scenariului, nu o regulă universală.'
  },
  'dc-evolutie': {
    title: 'Evoluția pe luni',
    text: 'Ambele coloane de valoare sunt cumulative. DCA cumpără mai multe unități când prețul e scăzut; de aceea costul mediu (media armonică) e mai mic decât prețul mediu aritmetic.'
  },
  'cs-curs': {
    title: 'Cursul RON/valută la start',
    text: 'Câți lei dai astăzi pentru o unitate de valută (ex. 4.97 lei pentru 1 EUR). BNR publică cursul oficial zilnic; pentru USD vezi și raportul H.10 al Fed. Surse: <a href="https://www.bnr.ro/report?cid=668&type=1" target="_blank" rel="noopener">BNR</a>, <a href="https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html" target="_blank" rel="noopener">ECB</a>.'
  },
  'cs-apreciere': {
    title: 'Apreciere anuală a valutei față de RON',
    text: 'Câți lei costă o unitate de valută peste un an, în medie. Pozitiv = RON se depreciază (valuta devine mai scumpă); negativ = RON se întărește. E o presupunere anuală compusă, nu o previziune.'
  },
  'cs-ani': {
    title: 'Perioada',
    text: 'Numărul de ani al investiției. Randamentul și cursul se compun anual pe toată perioada.'
  },
  'cs-inflatie': {
    title: 'Inflația anuală RON',
    text: 'Cât de mult cresc prețurile din România într-un an, în medie. Randamentul real ține cont de ea: (1 + nominal) ÷ (1 + inflație) − 1. Surse: <a href="https://insse.ro/cms/en/content/cpi-annual-data-series" target="_blank" rel="noopener">INS</a>.'
  },
  'cs-suma': {
    title: 'Suma investită (în valută)',
    text: 'Câți euro/dolari plătești la început. Pentru a-l compara cu banii tăi, se convertesc la cursul de start.'
  },
  'cs-randament': {
    title: 'Randamentul activului, în valută',
    text: 'Cât crește activul în moneda lui, în medie anual, înainte de curs. E sursa „adevărată” de randament; cursul doar o traduce în RON.'
  },
  'cs-impozit': {
    title: 'Impozit pe câștig',
    text: 'Procentul reținut din câștigul brut în RON. La un câștig negativ nu se percepe impozit.'
  },
  'cs-pret-import': {
    title: 'Prețul unui coș importat (în valută)',
    text: 'Prețul în valută al unui coș tipic de bunuri importate. Dacă RON se depreciază, același coș costă mai mulți lei.'
  },
  'cs-val-final-valuta': {
    title: 'Valoarea activului la final',
    text: 'Suma investită × (1 + randament)<sup>n</sup>, în valută. Fără curs.'
  },
  'cs-curs-final': {
    title: 'Cursul la final',
    text: 'Cursul de start × (1 + apreciere)<sup>n</sup>. Arată cât de mult s-a mișcat paritatea pe perioadă.'
  },
  'cs-valoare-ron-brut': {
    title: 'Valoarea în RON (brut)',
    text: 'Valoarea activului în valută × cursul final. Este puntea dintre cele două surse de randament.'
  },
  'cs-castig-brut': {
    title: 'Câștig brut în RON',
    text: 'Valoarea brută în RON − suma investită convertită la cursul de start. Include efectul cursului și impozitul.'
  },
  'cs-impozit-lei': {
    title: 'Impozit pe câștig',
    text: 'Câștigul brut pozitiv × rata de impozit. Nu se aplică pe pierderi.'
  },
  'cs-valoare-ron-net': {
    title: 'Valoarea netă în RON',
    text: 'Valoarea brută minus impozitul pe câștig. Ce îți rămâne efectiv în lei.'
  },
  'cs-rand-nominal': {
    title: 'Randament nominal anual în RON',
    text: '(1 + randament în valută) × (1 + apreciere) − 1. Compunerea dintre cele două surse: g + a + g×a.'
  },
  'cs-rand-real': {
    title: 'Randament real anual în RON',
    text: '(1 + randament nominal) ÷ (1 + inflație) − 1. Formula Fisher: arată creșterea puterii de cumpărare, nu doar banii nominali.'
  },
  'cs-contrib-valuta': {
    title: 'Contribția cursului',
    text: 'Partea randamentului adăugată de mișcarea cursului: (1 + randament valută) × apreciere. Poate fi negativă dacă RON se întărește.'
  },
  'cs-verdict': {
    title: 'Verdictul cursului',
    text: 'Dacă valuta se apreciază față de RON, cursul mărește randamentul; dacă se depreciază, îl taie. Verdictul nu spune nimic despre corectitudinea direcției viitoare.'
  },
  'cs-evolutie': {
    title: 'Evoluția pe ani',
    text: 'Pentru fiecare an: valoarea activului în valută, cursul, valoarea în RON, randamentul RON acumulat și randamentul real. Randamentul real este ajustat compus la inflație.'
  },
  'cs-import': {
    title: 'Inflația importată',
    text: 'Același coș de bunuri, evaluat la cursul intern. Creșterea în RON depășește inflația internă exact cu diferența dintre apreciere și inflație.'
  },
  'cs-import-ron-start': {
    title: 'Prețul coșului azi (RON)',
    text: 'Prețul în valută × cursul de start.'
  },
  'cs-import-ron-final': {
    title: 'Prețul coșului la final (RON)',
    text: 'Prețul în valută × cursul final. Creșterea vine doar de la curs dacă prețul în valută e constant.'
  },
  'cs-import-crestere': {
    title: 'Creșterea în RON pe perioadă',
    text: '(1 + apreciere)<sup>n</sup> − 1. E partea vizibilă a inflației importate.'
  },
  'cs-import-real': {
    title: 'Echivalent anual real vs inflație',
    text: '(1 + apreciere) ÷ (1 + inflație) − 1. Pozitiv = prețurile importate cresc mai repede decât nivelul general din România.'
  },
  'bs-ancorare': {
    title: 'Ancorarea',
    text: 'Tendința de a te agăța de primul număr văzut (prețul istoric, prețul de listă, cursul de ieri) și de a ajusta prea puțin față de el. Surse: <a href="https://en.wikipedia.org/wiki/Anchoring_(cognitive_bias)" target="_blank" rel="noopener">Wikipedia — anchoring</a>, <a href="https://www.investor.gov/introduction-investing" target="_blank" rel="noopener">Investor.gov</a>.'
  },
  'bs-cont-mental': {
    title: 'Contul mental',
    text: 'Separarea banilor în cuve etichetate, deși sunt fungibili. O datorie la 8% rămasă lângă economii la 2% neagă logica finanței personale. Surse: <a href="https://en.wikipedia.org/wiki/Mental_accounting" target="_blank" rel="noopener">Wikipedia — mental accounting</a>.'
  },
  'bs-aversiune': {
    title: 'Aversiunea la pierdere',
    text: 'O pierdere e simțită aprox. de două ori mai puternic decât un câștig echivalent (Kahneman & Tversky). De aceea ținem pierderile sau vindem prea devreme câștigurile. Surse: <a href="https://en.wikipedia.org/wiki/Loss_aversion" target="_blank" rel="noopener">Wikipedia — loss aversion</a>, <a href="https://en.wikipedia.org/wiki/Prospect_theory" target="_blank" rel="noopener">prospect theory</a>.'
  },
  'bs-fomo': {
    title: 'FOMO',
    text: 'Teamă de a ratezi o creștere. Comprimă analiza, scurtează orizontul și crește riscul de intrare la prețuri record. Surse: <a href="https://en.wikipedia.org/wiki/Fear_of_missing_out" target="_blank" rel="noopener">Wikipedia — fear of missing out</a>.'
  },
  'bs-cadru': {
    title: 'Efectul de cadru',
    text: 'Aceleași cifre, prezentate altfel, produc decizii diferite. Compară mereu aceleași unități (cost total, randament net, probabilități absolute). Surse: <a href="https://en.wikipedia.org/wiki/Framing_effect_(psychology)" target="_blank" rel="noopener">Wikipedia — framing effect</a>.'
  },
  'bs-quiz': {
    title: 'Testul rapid',
    text: 'Fiecare întrebare are trei variante; una arată reflexul util, celelalte două un bias. Răspunsul nu se poate schimba după verificare — e revelată explicația.'
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

/* ── Tooltip-uri cu cifre pe grafice (Detalii 2) ─────────────
   Aceeași familie de panouri `role="tooltip"` ca și tooltip-urile
   „?", dar poziționate `fixed` în <body>: graficele au overflow,
   deci un panou `absolute` ar fi tăiat. Barele/coloanele devin
   focusabile (tabindex 0), iar panoul se deschide la hover SI la
   focus și se închide la blur / mouseleave / Escape — deci e
   folosibil și din tastatură. */

const chartTips = [];
let chartTipCounter = 0;

/* Graficele se re-renderizează (ex. schimbarea intervalului la
   inflație): eliminăm panourile vechi ca să nu rămână în <body>. */
function clearChartTips(container) {
  for (let i = chartTips.length - 1; i >= 0; i--) {
    const entry = chartTips[i];
    // Ștergem doar tooltip-urile graficului re-renderizat; celelalte
    // grafice își păstrează panourile (altfel rămân cu aria-describedby
    // către un element eliminat).
    if (container && !container.contains(entry.host)) continue;
    entry.host.removeAttribute('aria-describedby');
    if (typeof entry.panel.remove === 'function') entry.panel.remove();
    chartTips.splice(i, 1);
  }
}

function attachChartTip(host, label, html) {
  const panel = document.createElement('span');
  const panelId = 'chart-tip-' + (++chartTipCounter);
  panel.id = panelId;
  panel.className = 'tip chart-tip';
  panel.setAttribute('role', 'tooltip');
  panel.hidden = true;
  panel.innerHTML = html;
  document.body.appendChild(panel);

  host.classList.add('chart-tip-host');
  host.tabIndex = 0;
  host.setAttribute('aria-label', label);
  host.setAttribute('aria-describedby', panelId);
  chartTips.push({ host, panel });

  /* `pointer` e setat doar de evenimentele de mouse. Pe focus (tastatură)
     rămâne null și panoul se poziționează față de element, ca înainte. */
  let pointer = null;

  function position() {
    const p = panel.getBoundingClientRect();
    const margin = 12;
    const gap = 14;
    let left;
    let top;
    if (pointer) {
      // Mouse: panoul urmează cursorul la ~14 px, cu inversare când
      // ar ieși din fereastră (dreapta / jos).
      left = pointer.x + gap;
      if (left + p.width > window.innerWidth - margin) left = pointer.x - p.width - gap;
      top = pointer.y + gap;
      if (top + p.height > window.innerHeight - margin) top = pointer.y - p.height - gap;
    } else {
      // Tastatură: deasupra elementului (poziționarea inițială).
      const r = host.getBoundingClientRect();
      left = r.left + r.width / 2 - p.width / 2;
      top = r.top - p.height - 10;
      if (top < margin) top = r.bottom + 10;
    }
    left = Math.max(margin, Math.min(left, window.innerWidth - p.width - margin));
    top = Math.max(margin, Math.min(top, window.innerHeight - p.height - margin));
    panel.style.left = left + 'px';
    panel.style.top = top + 'px';
  }

  function showAtPointer(event) {
    pointer = { x: event.clientX, y: event.clientY };
    panel.hidden = false;
    position();
  }
  function showAtElement() {
    pointer = null;
    panel.hidden = false;
    position();
  }
  function hide() {
    pointer = null;
    panel.hidden = true;
  }

  host.addEventListener('mouseenter', showAtPointer);
  host.addEventListener('mousemove', showAtPointer);
  host.addEventListener('mouseleave', hide);
  host.addEventListener('focus', showAtElement);
  host.addEventListener('blur', hide);
  host.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      hide();
    }
  });
  // Panoul e fixed: la scroll îl repoziționăm, ca să urmeze cursorul /
  // elementul (scroll-behavior: smooth face ca un hide imediat să închidă
  // tooltipul chiar când utilizatorul ajunge la el din tastatură).
  window.addEventListener('scroll', () => { if (!panel.hidden) position(); }, { passive: true });
  window.addEventListener('resize', () => { if (!panel.hidden) position(); });
}

/* ═══ Export CSV (P5) ══════════════════════════════════
   Butonul „Descarcă CSV" (bara de taburi) exportă tabelele
   panoului activ într-un fișier CSV, cu delimitator `;`
   (compatibil cu aplicațiile de tabele) și BOM UTF-8, ca să se
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

/* Inputurile HTML au punct zecimal (`28.81`), dar în română
   folosim virgula (`28,81`). Punctul îl înlocuim exact, fără
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

/* ═══ 27. Scenarii A/B (component reutilizabil) ═══════════
   Snapshot = valorile tuturor inputurilor/selecturilor dintr-un panou +
   textul summary-urilor acelui panou, în momentul salvării.
   Cheile sunt globale (`glitchcoin-scenario:A` / `:B`), iar snapshotul
   reține id-ul panoului: comparația se arată doar când A și B sunt din
   același panou, ca să nu comparăm mere cu pere.

   EXTINDERE LA ALT TAB: adaugă în panoul respectiv un singur element
   `<div class="ab-widget" data-ab-panel="id-tab"></div>`. `initScenarii()`
   găsește toate gazdele marcate și montează widgetul — fără alt cod,
   fără duplicare de logică. Lista `AB_CORE_TABS` e doar documentație/
   verificare pentru cele 6 taburi nucleu; nu e o listă de registrare.

   Toate accesările localStorage sunt în try/catch, ca persistența
   existentă: dacă stocarea e blocată, butoanele explică și nu crash-uiesc. */

const AB_SLOTS = ['A', 'B'];
const AB_CORE_TABS = ['inflatie', 'dobanda', 'compusa', 'di', 'regula72', 'timp', 'nuam', 'buget', 'fond', 'sanatate', 'randament', 'profit', 'cost', 'suma', 'oportunitate', 'dca', 'curs', 'diversificare', 'asigurari', 'stres', 'datorii', 'pensie', 'impozitare'];

function abScenarioKey(slot) {
  return AB_PREFIX + slot;
}

/* `storage` e opțional, ca să poată fi testat cu un obiect fals; în aplicație
   se folosește localStorage-ul browserului. */
function abStorageOr(storage) {
  return storage === undefined ? localStorage : storage;
}

function abSaveScenario(slot, snapshot, storage) {
  try {
    const s = abStorageOr(storage);
    if (!s || !AB_SLOTS.includes(slot)) return false;
    s.setItem(abScenarioKey(slot), JSON.stringify(snapshot));
    return true;
  } catch (e) {
    return false; // stocare blocată / plină — nu întrerupe interfața
  }
}

function abLoadScenario(slot, storage) {
  try {
    const s = abStorageOr(storage);
    if (!s || !AB_SLOTS.includes(slot)) return null;
    const raw = s.getItem(abScenarioKey(slot));
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || !Array.isArray(data.fields) || !Array.isArray(data.outputs)) return null;
    return data;
  } catch (e) {
    return null; // date corupte sau stocare blocată — ca și cum n-ar fi scenariu
  }
}

function abClearScenarios(storage) {
  try {
    const s = abStorageOr(storage);
    if (!s) return;
    AB_SLOTS.forEach((slot) => s.removeItem(abScenarioKey(slot)));
  } catch (e) {
    // nimic de șters dacă stocarea e blocată
  }
}

/* Eticheta unui câmp: `data-ab-label` > `<label for>` > aria-label > id.
   Nu hardcodăm liste de câmpuri — funcționează pentru orice panou nou. */
function abFieldLabel(el, panel) {
  if (el.dataset && el.dataset.abLabel) return el.dataset.abLabel;
  if (panel) {
    const labels = panel.querySelectorAll('label[for]');
    for (const label of labels) {
      if (label.getAttribute('for') === el.id) {
        // Etichetele au și un <span class="tip-wrap"> cu text de tooltip;
        // luăm DOAR nodurile de text directe, ca numele câmpului să rămână scurt.
        let text = '';
        const nodes = label.childNodes;
        if (nodes && typeof nodes.length === 'number') {
          text = Array.from(nodes)
            .filter((n) => n.nodeType === 3)
            .map((n) => n.textContent || '')
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
        }
        if (!text) text = (label.textContent || '').replace(/\s+/g, ' ').trim();
        if (text) return text;
      }
    }
  }
  const aria = el.getAttribute && el.getAttribute('aria-label');
  return (aria && aria.trim()) || el.id;
}

function abCollectSnapshot(panel, panelId) {
  const fields = [];
  const outputs = [];
  if (!panel) return { panel: panelId || '', fields, outputs };
  panel.querySelectorAll('input[id], select[id]').forEach((el) => {
    const type = (el.type || '').toLowerCase();
    if (type === 'button' || type === 'submit' || type === 'reset') return;
    const value = (type === 'checkbox' || type === 'radio')
      ? (el.checked ? 'checked' : 'unchecked')
      : el.value;
    fields.push({ id: el.id, label: abFieldLabel(el, panel), value: String(value) });
  });
  panel.querySelectorAll('.summary[id]').forEach((el) => {
    outputs.push({
      id: el.id,
      label: (el.dataset && el.dataset.abLabel) || 'Rezumat',
      text: (el.textContent || '').replace(/\s+/g, ' ').trim(),
    });
  });
  return { panel: panelId || '', fields, outputs };
}

function abMapById(items) {
  const map = new Map();
  (items || []).forEach((item) => { if (item && item.id) map.set(item.id, item); });
  return map;
}

/* Returnează null când nu avem două scenarii comparabile (lipsă sau panou
   diferit). Altfel: DOAR câmpurile care diferă + toate summary-urile. */
function abDiffSnapshots(a, b) {
  if (!a || !b || !a.panel || a.panel !== b.panel) return null;
  const A = abMapById(a.fields), B = abMapById(b.fields);
  const fields = [];
  const ids = new Set([...A.keys(), ...B.keys()]);
  ids.forEach((id) => {
    const x = A.get(id), y = B.get(id);
    const va = x ? x.value : null, vb = y ? y.value : null;
    if (va === vb) return; // identice — nu apar în tabel
    const ref = x || y;
    fields.push({ id, label: ref.label || id, a: va === null ? '—' : va, b: vb === null ? '—' : vb });
  });
  const OA = abMapById(a.outputs), OB = abMapById(b.outputs);
  const outputs = [];
  const outIds = new Set([...OA.keys(), ...OB.keys()]);
  outIds.forEach((id) => {
    const x = OA.get(id), y = OB.get(id), ref = x || y;
    outputs.push({
      id,
      label: ref.label || 'Rezumat',
      a: x ? x.text : '—',
      b: y ? y.text : '—',
    });
  });
  return { panel: a.panel, fields, outputs };
}

/* Tabel construit cu createElement/textContent (nu innerHTML): valorile
   salvate nu pot deveni HTML. Anteturi cu scope=col / scope=row. */
function abRenderComparison(host, diff) {
  if (!host) return;
  host.replaceChildren();
  if (!diff) return;

  const table = document.createElement('table');
  table.className = 'ab-table';
  const caption = document.createElement('caption');
  caption.textContent = 'Compară două scenarii (A vs B) — câmpuri care diferă și rezultate';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  ['Câmp', 'Scenariul A', 'Scenariul B'].forEach((text) => {
    const th = document.createElement('th');
    th.setAttribute('scope', 'col');
    th.textContent = text;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const addRow = (label, a, b, isOutput) => {
    const tr = document.createElement('tr');
    if (isOutput) tr.className = 'is-output';
    const th = document.createElement('th');
    th.setAttribute('scope', 'row');
    th.textContent = (isOutput ? 'Rezultat · ' : '') + label;
    tr.appendChild(th);
    [a, b].forEach((value) => {
      const td = document.createElement('td');
      td.textContent = value;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  };

  if (!diff.fields.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 3;
    td.textContent = 'Nicio diferență — toate câmpurile sunt la fel.';
    tr.appendChild(td);
    tbody.appendChild(tr);
  } else {
    diff.fields.forEach((f) => addRow(f.label, f.a, f.b, false));
  }
  diff.outputs.forEach((o) => addRow(o.label, o.a, o.b, true));

  table.appendChild(tbody);
  host.appendChild(table);
}

/* Un widget = 4 butoane reale <button type="button"> (focalizabile cu Tab,
   activabile cu Enter/Spațiu) + regiune status + zona tabelului. */
function abBuildWidget(host) {
  const panelId = host.dataset ? host.dataset.abPanel : '';
  const panel = document.getElementById('panel-' + panelId);
  const actions = document.createElement('div');
  actions.className = 'ab-actions';
  const status = document.createElement('p');
  status.className = 'ab-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const results = document.createElement('div');
  results.className = 'ab-results';

  const setStatus = (msg) => { status.textContent = msg; };
  const addButton = (text, onClick) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ab-btn';
    btn.textContent = text;
    btn.addEventListener('click', onClick);
    actions.appendChild(btn);
  };

  AB_SLOTS.forEach((slot) => addButton('Salvează ' + slot, () => {
    if (!panel) { setStatus('Panoul nu a fost găsit.'); return; }
    const ok = abSaveScenario(slot, abCollectSnapshot(panel, panelId));
    setStatus(ok
      ? 'Scenariul ' + slot + ' a fost salvat în acest browser.'
      : 'Stocarea locală e blocată; scenariul nu a fost salvat.');
    results.replaceChildren();
  }));

  addButton('Compară A vs B', () => {
    const a = abLoadScenario('A'), b = abLoadScenario('B');
    if (!a || !b) {
      setStatus('Salvează mai întâi ambele scenarii (A și B).');
      results.replaceChildren();
      return;
    }
    const diff = abDiffSnapshots(a, b);
    // Cheile A/B sunt globale: widgetul nu afișează comparația unui alt panou.
    if (!diff || diff.panel !== panelId) {
      setStatus('Scenariile sunt din alt panou. Salvează A și B aici.');
      results.replaceChildren();
      return;
    }
    abRenderComparison(results, diff);
    setStatus('Comparație afișată: câmpurile care diferă și rezultatele.');
  });

  addButton('Șterge scenariile', () => {
    abClearScenarios();
    results.replaceChildren();
    setStatus('Scenariile A și B au fost șterse.');
  });

  host.appendChild(actions);
  host.appendChild(status);
  host.appendChild(results);
}

/* Singurul punct de montare. Adaugă un `.ab-widget[data-ab-panel]` în HTML
   pentru orice tab nou — nu se modifică nimic aici. */
function initScenarii() {
  document.querySelectorAll('.ab-widget[data-ab-panel]').forEach(abBuildWidget);
}

/* ═══ 28. „Explică rezultatul” (component reutilizabil) ═══════

   Sub summary-ul panoului, un buton discret deschide UN paragraf în română
   simplă: interpretarea numărului pentru utilizator, NU formula brută
   (aceea există deja în tooltipuri). Textul se construiește din valorile
   curente ale panoului și din CONFIG_AN — nicio cifră de config scrisă aici.

   EXTINDERE LA ALT TAB: adaugă în panou o gazdă
     <div class="explica-widget" data-explica-panel="id-tab"></div>
   și o intrare în EXPLAINERS. `initExplicate()` montează automat toate
   gazdele marcate; funcțiile `textExplica*` sunt pure, deci testabile
   fără browser (ca celelalte funcții `compute*`). */

/* Toate cifrele afișate, inclusiv în proza explicativă, folosesc același
   format en-US (virgulă pentru mii, punct pentru zecimale): 2,500 lei / 6.3%.
   Nu există un al doilea locale, deci nu se mai convertesc separatorii. */
function fmtProzaNum(value, min = 0, max = 2) {
  return value.toLocaleString(LOCALE, { minimumFractionDigits: min, maximumFractionDigits: max });
}
function fmtProzaLei(value, decimals = 0) {
  return fmtProzaNum(value, decimals, decimals) + ' lei';
}
function fmtProzaPct(fraction) {
  return fmtProzaNum(fraction * 100, 0, 2) + '%';
}

/* Inflație: puterea de cumpărare a 1.000 lei peste un an, la rata din
   CONFIG_AN. Cuvântul „parțial” și anul vin tot din eticheta de config. */
function textExplicaInflatie(rata) {
  const r = Math.max(-0.99, rata);
  const putere = 1000 / (1 + r);
  const eticheta = String(CONFIG_AN.inflatie.eticheta || '').toLowerCase();
  const calificativ = eticheta.indexOf('parțial') !== -1
    ? ` (${CONFIG_AN.anCurent} e parțial)`
    : '';
  return `La ${fmtProzaPct(r)} pe an, 1,000 lei de azi cumpără ~${fmtProzaNum(Math.round(putere), 0, 0)} lei anul viitor${calificativ}.`;
}

/* Timp: dorința tradusă în zile de muncă, raportat la anul lucrător. */
function textExplicaTimp(venit, pret, zileAn) {
  if (!(venit > 0)) return 'Introdu un venit lunar mai mare decât zero ca să vezi câte zile de muncă înseamnă dorința.';
  const r = computeTimp(venit, pret, zileAn);
  return `O dorință de ${fmtProzaLei(pret)} înseamnă ~${fmtProzaNum(Math.round(r.zileLucrate), 0, 0)} zile de muncă (8 ore pe zi) — aproximativ ${fmtProzaPct(r.pctAnLucrator)} dintr-un an de ${fmtProzaNum(zileAn, 0, 2)} zile lucrătoare.`;
}

/* Dobândă simplă: cât câștigă suma pe zilele alese, după impozit. */
function textExplicaDobanda(suma, rata, zile, impozit) {
  if (!(suma > 0) || !(zile > 0)) return 'Introdu o sumă și un număr de zile mai mari decât zero pentru a vedea dobânda.';
  const { brut, net } = computeDobanda(suma, rata, zile, impozit);
  return `Pe ${fmtProzaNum(zile, 0, 0)} zile, ${fmtProzaLei(suma)} la ${fmtProzaPct(rata)} îți aduce ${fmtProzaLei(brut, 2)} dobândă; după impozitul de ${fmtProzaPct(impozit)} rămân ${fmtProzaLei(net, 2)}.`;
}

/* Dobândă compusă: de câte ori crește suma când dobânda e reinvestită. */
function textExplicaCompusa(suma, rata, ani) {
  if (!(suma > 0)) return 'Introdu o sumă inițială mai mare decât zero pentru a vedea creșterea.';
  const { scenA } = computeCompusa(suma, 0, rata);
  const idx = Math.max(0, Math.min(ani, scenA.length - 1));
  const final = scenA[idx];
  const factor = final.valoare / suma;
  return `După ${fmtProzaNum(ani, 0, 0)} ani la ${fmtProzaPct(rata)}, suma crește de ~${fmtProzaNum(factor, 0, 2)} ori: ${fmtProzaLei(suma)} devin ~${fmtProzaLei(final.valoare)}. Dobânda rămâne în cont și produce dobândă și în anii următori.`;
}

/* Randament: ce rămâne după taxe și după inflație (puterea de cumpărare). */
function textExplicaRandament(suma, randament, impozit, comisioane, inflatie) {
  if (!(suma > 0)) return 'Introdu o sumă investită mai mare decât zero pentru a vedea randamentul.';
  const r = computeRandament(suma, randament, impozit, comisioane, inflatie);
  return `La ${fmtProzaPct(randament)} pe ${fmtProzaLei(suma)}, câștigul brut e ${fmtProzaLei(r.brutLei, 2)}. După impozit și comisioane rămân ${fmtProzaLei(r.netLei, 2)} (${fmtProzaPct(r.netPct)}), iar după inflația de ${fmtProzaPct(inflatie)} câștigul real e ${fmtProzaLei(r.realLei, 2)} (${fmtProzaPct(r.realPct)}).`;
}

/* Buget: repartizarea 50/30/20 pentru venitul lunar curent. */
function textExplicaBuget(venit) {
  if (!(venit > 0)) return 'Introdu venitul lunar net pentru a vedea repartizarea 50/30/20.';
  const { tinta } = computeBuget(venit, 0, 0, 0);
  return `50/30/20 înseamnă ${fmtProzaLei(tinta.nevoi)} nevoi, ${fmtProzaLei(tinta.dorinte)} dorințe, ${fmtProzaLei(tinta.economii)} economii pentru ${fmtProzaLei(venit)} venit lunar.`;
}

/* Citește valoarea curentă a unui câmp din panou (input sau select). */
function explicaValoare(panel, id) {
  const el = panel && panel.querySelector ? panel.querySelector('#' + id) : null;
  return el ? readNumber(el) : 0;
}

/* Registrul e punctul de extensie: un tab nou = o cheie nouă aici + o gazdă
   în HTML. Inflația folosește rata din CONFIG_AN (contextul real al datelor),
   restul folosesc cifrele introduse de utilizator în panoul respectiv. */
const EXPLAINERS = {
  inflatie: () => textExplicaInflatie(CONFIG_AN.inflatie.rata),
  timp: (panel) => textExplicaTimp(
    explicaValoare(panel, 'timp-venit'),
    explicaValoare(panel, 'timp-pret'),
    explicaValoare(panel, 'timp-zile-lucratore'),
  ),
  dobanda: (panel) => textExplicaDobanda(
    explicaValoare(panel, 'dob-suma'),
    explicaValoare(panel, 'dob-rata') / 100,
    explicaValoare(panel, 'dob-zile'),
    explicaValoare(panel, 'dob-impozit') / 100,
  ),
  compusa: (panel) => textExplicaCompusa(
    explicaValoare(panel, 'comp-suma'),
    explicaValoare(panel, 'comp-rata') / 100,
    COMP_ANI,
  ),
  randament: (panel) => textExplicaRandament(
    explicaValoare(panel, 'rand-suma'),
    explicaValoare(panel, 'rand-randament') / 100,
    explicaValoare(panel, 'rand-impozit') / 100,
    explicaValoare(panel, 'rand-comisioane') / 100,
    explicaValoare(panel, 'rand-inflatie') / 100,
  ),
  buget: (panel) => textExplicaBuget(explicaValoare(panel, 'bg-venit')),
};

/* Un widget = buton <button type="button"> focalizabil + paragraf ascuns.
   aria-expanded / aria-controls țin starea pentru cititoarele de ecran;
   Escape închide și readuce focusul pe buton. Textul se regenerează la
   fiecare deschidere și la schimbarea inputurilor, cât timp e deschis. */
/* Explicator generic pentru taburile fără funcție dedicată: folosește
   rezumatul live al panoului + textul „De ce contează” deja scris în panou.
   Nu inventează cifre și nu introdu locale nou. */
function textExplicaGenerica(panel) {
  if (!panel) return 'Deschide un calculator pentru a vedea explicația rezultatului.';
  const curat = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  const sumar = curat(panel.querySelector('.summary')?.textContent);
  const sens = curat(panel.querySelector('.why-card p')?.textContent);
  if (!sumar && !sens) return 'Rezultatul se actualizează când modifici datele din panou.';
  return [sumar ? `Rezultatul curent: ${sumar}` : '', sens].filter(Boolean).join(' ');
}

function explicaBuildWidget(host) {
  const panelId = host.dataset ? host.dataset.explicaPanel : '';
  const panel = document.getElementById('panel-' + panelId);
  const explainer = EXPLAINERS[panelId] || (() => textExplicaGenerica(panel));
  const textId = 'explica-text-' + panelId;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'explica-btn';
  button.textContent = 'Explică rezultatul';
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', textId);

  const paragraph = document.createElement('p');
  paragraph.className = 'explica-text';
  paragraph.id = textId;
  paragraph.setAttribute('role', 'note');
  paragraph.hidden = true;

  const genereaza = () => {
    if (!explainer) return 'Explicația pentru acest tab nu este încă disponibilă.';
    try {
      return String(explainer(panel) || '');
    } catch (e) {
      return 'Explicația nu poate fi generată cu valorile curente.';
    }
  };

  const seteaza = (deschis) => {
    if (deschis) paragraph.textContent = genereaza();
    paragraph.hidden = !deschis;
    button.setAttribute('aria-expanded', deschis ? 'true' : 'false');
    button.textContent = deschis ? 'Ascunde explicația' : 'Explică rezultatul';
  };

  button.addEventListener('click', () => seteaza(paragraph.hidden));
  host.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !paragraph.hidden) {
      seteaza(false);
      button.focus();
    }
  });

  if (panel && panel.addEventListener) {
    ['input', 'change'].forEach((evt) => panel.addEventListener(evt, () => {
      if (!paragraph.hidden) paragraph.textContent = genereaza();
    }));
  }

  host.appendChild(button);
  host.appendChild(paragraph);
}

/* Singurul punct de montare — ca la scenariile A/B. */
function initExplicate() {
  document.querySelectorAll('.explica-widget[data-explica-panel]').forEach(explicaBuildWidget);
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

/* ═══ Indiciu pentru tabelele cu scroll orizontal (audit UI) ═══
   Tabelele rămân complete (nicio coloană ascunsă). Când conținutul nu
   încape în container, adăugăm un indiciu discret „→ derulează” chiar
   deasupra tabelului. Îl recalculăm la schimbarea tabului, la redimen-
   sionare și la deschiderea tabelului inflației; în print e ascuns. */
function updateTableScrollHints() {
  document.querySelectorAll('.table-wrap').forEach((wrap) => {
    const prev = wrap.previousElementSibling;
    let hint = prev && prev.classList.contains('table-scroll-hint') ? prev : null;
    if (!hint) {
      hint = document.createElement('p');
      hint.className = 'table-scroll-hint';
      hint.textContent = '→ derulează';
      hint.setAttribute('aria-hidden', 'true');
      wrap.parentNode.insertBefore(hint, wrap);
    }
    hint.classList.toggle('is-visible', wrap.scrollWidth > wrap.clientWidth + 1);
  });
}

/* Tabelul inflației e pliat implicit; la print trebuie deschis, altfel
   lipsește din PDF. `beforeprint` acoperă și tipărirea din browser. */
function initInflationPrint() {
  const details = document.getElementById('inflation-details');
  if (!details) return;
  let wasOpen = false;
  window.addEventListener('beforeprint', () => {
    wasOpen = details.open;
    details.open = true;
    updateTableScrollHints();
  });
  window.addEventListener('afterprint', () => {
    details.open = wasOpen;
  });
  details.addEventListener('toggle', updateTableScrollHints);
}

/* v3 — validare minimă la încărcare: prinde serii goale, rate lipsă sau
   prețuri invalide înainte ca eroarea să ajungă în grafice. Nu modifică datele. */
function valideazaDate() {
  const probleme = [];
  const serie = GLITCHCOIN_DATA.inflation || [];
  if (serie.length < 2) probleme.push('seria de inflație e prea scurtă');
  for (let i = 1; i < serie.length; i++) {
    if (serie[i].year !== serie[i - 1].year + 1) probleme.push(`an lipsă: ${serie[i - 1].year} → ${serie[i].year}`);
    if (!Number.isFinite(serie[i].rate)) probleme.push(`rată invalidă în ${serie[i].year}`);
  }
  for (const p of GLITCHCOIN_DATA.food || []) {
    if (!(p.prices[CONFIG_AN.anCurent] > 0)) probleme.push(`preț invalid: ${p.name}`);
  }
  if (probleme.length) console.error('GlitchCoin — date invalide:', probleme);
  return probleme;
}

function init() {
  valideazaDate();
  actualizeazaProgres();
  document.getElementById('explorat-toggle')?.addEventListener('click', () => {
    try {
      const ascuns = localStorage.getItem(EXPLORAT_OFF_KEY) === '1';
      localStorage.setItem(EXPLORAT_OFF_KEY, ascuns ? '0' : '1');
    } catch (e) { /* blocat */ }
    actualizeazaProgres();
  });
  initTheme();
  initTabs();
  initShell();
  initSearch();
  initAlerts();
  initStepMode();
  initCopyButtons();
  initCountUp();
  initFormulaTips();
  populateYearSelect();

  // Valorile introduse anterior se restaurează ÎNAINTE de prima randare,
  // ca rezultatele afișate să corespundă cu inputurile arătate.
  persistRestore();

  // Simulatoarele rapide se recalculează după restaurarea valorilor salvate,
  // ca rezultatul afișat să corespundă cu inputul văzut pe „Acasă".
  renderQuick();
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
  renderDiversificare();
  renderAsigurare();
  renderStres();
  renderPensie();
  renderImpozitare();
  renderDatorii();
  renderDca();
  renderCurs();
  renderBiase();

  // Badge-urile și notele de context se trag din CONFIG_AN, nu din inputuri.
  renderDataFreshness();

  // Orice modificare a unui input/select se salvează (cu debounce).
  document.addEventListener('input', (event) => {
    if (isPersistable(event.target)) persistSave();
  });
  document.addEventListener('change', (event) => {
    if (isPersistable(event.target)) persistSave();
  });

  // Butonul global „Resetează tot" — toate cele 24 de taburi la valorile implicite.
  const resetAllBtn = document.getElementById('reset-all');
  if (resetAllBtn) {
    resetAllBtn.addEventListener('click', () => {
      resetAll();
      const active = document.querySelector('.side-nav .tab.is-active') || document.getElementById('nav-acasa');
      if (active) active.focus();
    });
  }

  // Butonul „Descarcă CSV" — tabelele panoului activ.
  const exportCsvBtn = document.getElementById('export-csv');
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      const id = activeTabId();
      const panel = document.querySelector('.tab-panel.is-active');
      if (!id || !panel) return;
      const csv = panelToCSV(panel);
      if (csv.trim()) downloadCSV('glitchcoin-' + id + '.csv', csv);
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

  // Diversificare → Randament (suma și randamentul portofoliului)
  document.getElementById('dv-go-randament').addEventListener('click', () => {
    const suma = Math.max(0, readNumber(document.getElementById('dv-suma')));
    const corelare = Math.max(-100, Math.min(100, readNumber(document.getElementById('dv-corelare'), 30)));
    const c = computeDiversificare(dvRows, corelare, 0);
    goToTab('randament', {
      'rand-suma': suma,
      'rand-randament': c.valid ? Number((c.rP * 100).toFixed(4)) : 0,
    });
  });

  // Stress test → Buget / Sănătate
  document.getElementById('st-go-buget').addEventListener('click', () => {
    goToTab('buget', {
      'bg-venit': Math.max(0, readNumber(document.getElementById('st-venit'))),
      'bg-nevoi': Math.max(0, readNumber(document.getElementById('st-cheltuieli'))),
      'bg-economii': Math.max(0, readNumber(document.getElementById('st-economii'))),
    });
  });

  document.getElementById('st-go-sanatate').addEventListener('click', () => {
    goToTab('sanatate', {
      'sf-venit': Math.max(0, readNumber(document.getElementById('st-venit'))),
      'sf-cheltuieli': Math.max(0, readNumber(document.getElementById('st-cheltuieli'))),
      'sf-economii': Math.max(0, readNumber(document.getElementById('st-economii'))),
      'sf-rezerva': Math.max(0, readNumber(document.getElementById('st-rezerva'))),
    });
  });

  // Buget / Sănătate → Stress test
  document.getElementById('bg-go-stres').addEventListener('click', () => {
    goToTab('stres', {
      'st-venit': Math.max(0, readNumber(document.getElementById('bg-venit'))),
      'st-cheltuieli': Math.max(0, readNumber(document.getElementById('bg-nevoi'))),
      'st-economii': Math.max(0, readNumber(document.getElementById('bg-economii'))),
    });
  });

  document.getElementById('sf-go-stres').addEventListener('click', () => {
    goToTab('stres', {
      'st-venit': Math.max(0, readNumber(document.getElementById('sf-venit'))),
      'st-cheltuieli': Math.max(0, readNumber(document.getElementById('sf-cheltuieli'))),
      'st-economii': Math.max(0, readNumber(document.getElementById('sf-economii'))),
      'st-rezerva': Math.max(0, readNumber(document.getElementById('sf-rezerva'))),
    });
  });

  // Randament / Profit → Impozitare (tabelul cu ratele reale, cu același tip de venit)
  ['rand-go-impozitare', 'prof-go-impozitare'].forEach((id) => {
    const sursa = id === 'rand-go-impozitare' ? 'rand' : 'prof';
    document.getElementById(id).addEventListener('click', () => {
      goToTab('impozitare', {
        'tx-tip': document.getElementById(sursa + '-tip-venit').value,
        'tx-castig': Math.max(0, readNumber(document.getElementById(sursa + '-suma'))),
      });
    });
  });

  // Impozitare → Randament (aceeași rată și, dacă există, același tip de venit)
  document.getElementById('tx-go-randament').addEventListener('click', () => {
    const linie = IMPOZIT_VENITURI.find((r) => r.cheie === document.getElementById('tx-tip').value) || IMPOZIT_VENITURI[0];
    const an = Number(document.getElementById('tx-an').value) === 2025 ? 2025 : 2026;
    const valori = { 'rand-impozit': impozitRata(linie, an) };
    const select = document.getElementById('rand-tip-venit');
    if (select && select.querySelector(`option[value="${linie.cheie}"]`)) valori['rand-tip-venit'] = linie.cheie;
    goToTab('randament', valori);
  });

  // Pensie → Sumă dorită (aceeași țintă, cu randamentul efectiv după comisioane)
  document.getElementById('pn-go-suma').addEventListener('click', () => {
    const r = computePensie(citestePensie());
    goToTab('suma', {
      'suma-dorita': r.valid ? r.finalBrut : 0,
      'suma-randament': r.valid ? Number((r.randEfectiv * 100).toFixed(4)) : 0,
      'suma-ani': r.valid ? r.ani : 0,
      'suma-initiala': r.valid ? r.contributii - readNumber(document.getElementById('pn-contributie')) * r.luni : 0,
    });
  });

  // Datorii → Costul oportunității (suma împrumutată și dobânda de la economii)
  document.getElementById('dt-go-oportunitate').addEventListener('click', () => {
    goToTab('oportunitate', {
      'co-suma': Math.max(0, readNumber(document.getElementById('dt-suma'))),
      'co-randament': Math.max(0, Math.min(100, readNumber(document.getElementById('dt-economie'), 5))),
      'co-impozit': Math.max(0, Math.min(100, readNumber(document.getElementById('dt-impozit'), 10))),
    });
  });

  // Dobânda vs inflație → Datorii (randamentul nominal devine dobânda de la economii)
  document.getElementById('di-go-datorii').addEventListener('click', () => {
    goToTab('datorii', {
      'dt-suma': Math.max(0, readNumber(document.getElementById('di-suma'))),
      'dt-economie': Math.max(0, Math.min(100, readNumber(document.getElementById('di-randament'), 5))),
    });
  });

  // Dobânda vs inflație → Curs de schimb (randamentul și inflația devin valutare)
  document.getElementById('di-go-curs').addEventListener('click', () => {
    const curs = Math.max(0.0001, readNumber(document.getElementById('cs-curs'), 4.97));
    const sumaRon = Math.max(0, readNumber(document.getElementById('di-suma')));
    goToTab('curs', {
      'cs-suma': Number((sumaRon / curs).toFixed(2)),
      'cs-randament': Math.max(-100, Math.min(100, readNumber(document.getElementById('di-randament'), 7))),
      'cs-inflatie': Math.max(0, Math.min(100, readNumber(document.getElementById('di-inflatie'), 5))),
    });
  });

  // Costul mediu → DCA (valoarea achiziționată devine suma de investit)
  document.getElementById('cost-go-dca').addEventListener('click', () => {
    const c = computeCost(costRows);
    goToTab('dca', { 'dc-suma': c.sumaValori > 0 ? Number(c.sumaValori.toFixed(2)) : 0 });
  });

  // DCA → Costul mediu (tranșele lunare: prețul și cantitatea cumpărată)
  document.getElementById('dc-go-cost').addEventListener('click', () => {
    const c = computeDca(citesteDca());
    if (!c.valid) return;
    costRows = c.rows.map((r) => ({
      pret: Number(r.pret.toFixed(6)),
      cantitate: Number((r.investitie / r.pret).toFixed(6)),
      comision: 0,
    }));
    renderCostRows();
    updateCostOutputs();
    goToTab('cost');
  });

  // Curs de schimb → Costul oportunității (aceeași sumă în RON, randament nominal)
  document.getElementById('cs-go-oportunitate').addEventListener('click', () => {
    const c = computeCurs(citesteCurs());
    if (!c.valid) return;
    goToTab('oportunitate', {
      'co-suma': Number(c.sumaRonStart.toFixed(2)),
      'co-randament': Number((c.randNominal * 100).toFixed(4)),
      'co-inflatie': Math.max(0, Math.min(100, readNumber(document.getElementById('cs-inflatie'), 4))),
      'co-impozit': Math.max(0, Math.min(100, readNumber(document.getElementById('cs-impozit'), 10))),
    });
  });

  // Profit
  renderProfit();
  ['prof-suma', 'prof-pret-init', 'prof-pret-vanzare', 'prof-impozit', 'prof-comisioane', 'prof-inflatie']
    .forEach((id) => document.getElementById(id).addEventListener('input', renderProfit));

  // Corecție C3: „Tipul de venit" setează impozitul implicit (Randament / Profit).
  [
    ['rand-tip-venit', 'rand-an', 'rand-impozit', renderRandament],
    ['prof-tip-venit', 'prof-an', 'prof-impozit', renderProfit],
  ].forEach(([tipId, anId, impozitId, render]) => {
    const select = document.getElementById(tipId);
    const anSelect = document.getElementById(anId);
    const input = document.getElementById(impozitId);
    const aplica = () => {
      const rata = impozitPentruAn(select?.value, anSelect?.value);
      if (Number.isFinite(rata) && input) {
        input.value = String(rata);
        render();
      }
    };
    select?.addEventListener('change', aplica);
    anSelect?.addEventListener('change', aplica);
  });

  // Costul mediu de achiziție
  initCost();

  // Sumă dorită
  renderSuma();
  ['suma-randament', 'suma-ani', 'suma-initiala', 'suma-dorita']
    .forEach((id) => document.getElementById(id).addEventListener('input', renderSuma));

  // „Nu am bani" (scenariu avansat)
  initNuam();

  // Taburile noi 3–5 (N3, N8, N15, N6, N7, N9, N12)
  initDiversificare();
  initAsigurari();
  initStres();
  initPensie();
  initImpozitare();
  initDatorii();
  initDca();
  initCurs();
  initBiase();

  // Scenarii A/B: fiecare gazdă `.ab-widget` se montează singură.
  initScenarii();

  // „Explică rezultatul”: fiecare gazdă `.explica-widget` se montează singură.
  initExplicate();

  // UI: indiciu pentru tabelele prea late + tabelul inflației deschis la print.
  initInflationPrint();
  updateTableScrollHints();
  window.addEventListener('resize', updateTableScrollHints);
}

document.addEventListener('DOMContentLoaded', init);
