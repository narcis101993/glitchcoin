// Încarcă data.js + app.js într-un context vm cu un DOM minimal, pentru a testa
// funcțiile pure de calcul fără browser. Nu modifică aplicația.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIR = join(HERE, '..', '..'); // folderul proiectului (GlitchCoin)

const documentStub = {
  addEventListener() {},
  getElementById() { return fakeElement(); },
  querySelectorAll() { return []; },
  querySelector() { return null; },
  createElement() { return fakeElement(); },
  createDocumentFragment() { return { appendChild() {} }; },
};

/* Element fals pentru testele „smoke”: apelăm renderer-elor reale fără
   browser, ca să prindem ReferenceError / TypeError în node, nu doar în browser. */
function fakeElement() {
  return {
    value: '', textContent: '', innerHTML: '', defaultValue: '', className: '',
    type: '', href: '', target: '', rel: '', hidden: false, disabled: false,
    scrollWidth: 0, clientWidth: 0, dataset: {}, style: {}, children: [],
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    setAttribute() {}, getAttribute: () => null, removeAttribute() {},
    hasAttribute: () => false,
    appendChild(copil) { this.children.push(copil); return copil; },
    replaceChildren() { this.children = []; },
    querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {}, removeEventListener() {}, focus() {}, click() {},
    closest: () => null,
    getBoundingClientRect: () => ({ left: 0, bottom: 0, width: 0, height: 0 }),
  };
}

const ctx = {
  console,
  document: documentStub,
  window: { addEventListener() {} },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
};
vm.createContext(ctx);

const src =
  readFileSync(join(DIR, 'data.js'), 'utf8') + '\n' +
  readFileSync(join(DIR, 'app.js'), 'utf8') + '\n' +
  'globalThis.__gc = { GLITCHCOIN_DATA, AN_CURENT, IMPOZIT_TIPURI, NUAM_DEFAULTS, COST_DEFAULTS, ' +
  'TIMP_ZILE_LUNA, TIMP_ZILE_LUCRATOARE_AN_DEFAULT, computeNuAm, deflatorValue, computeTimp, ' +
  'computeRandament, computeProfit, computeCompusa, ' +
  'computeRandamentReal, computeIstoricReal, computeRegula72, computeDublareInAni, ' +
  'economieNecesara, timpPanaLaTinta, computeFond, computeOportunitate, R72_PRESETS, ' +
  'computeBuget, computeSanatate, stareRataEconomii, stareDatoriiVenit, ' +
  'stareRezerva, stareNetWorth, goToTab, TAB_RENDERERS, fmtNum, fmtPctSafe, fmtDeviereLei, ' +
  'computeDiversificare, simuleazaDiversificare, DV_DEFAULTS, DV_SEED, DV_SIMULATII, ' +
  'mulberry32, randn, cholesky, computeAsigurare, AS_PRESETS, ' +
  'computeStres, ST_SCENARII, ST_SCEN_ACTIVE, ' +
  'computePensie, citestePensie, PN_SCENARII, computeImpozit, impozitRata, ' +
  'IMPOZIT_VENITURI, IMPOZIT_SURSE, renderPensie, renderImpozitare, ' +
  'computeDatorii, citesteDatorii, rataAnuitate, renderDatorii, ' +
  'computeDca, citesteDca, DCA_SCENARII, renderDca, computeCost };';

vm.runInContext(src, ctx, { filename: 'glitchcoin-bundle.js' });

export const gc = ctx.__gc;
export const html = readFileSync(join(DIR, 'index.html'), 'utf8');
export const css = readFileSync(join(DIR, 'styles.css'), 'utf8');
export const js = readFileSync(join(DIR, 'app.js'), 'utf8');
export const data = readFileSync(join(DIR, 'data.js'), 'utf8');
