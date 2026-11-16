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
  getElementById() { return null; },
  querySelectorAll() { return []; },
  createElement() { return { style: {}, setAttribute() {}, appendChild() {}, innerHTML: '' }; },
  createDocumentFragment() { return { appendChild() {} }; },
};

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
  'computeStres, ST_SCENARII, ST_SCEN_ACTIVE };';

vm.runInContext(src, ctx, { filename: 'glitchcoin-bundle.js' });

export const gc = ctx.__gc;
export const html = readFileSync(join(DIR, 'index.html'), 'utf8');
export const css = readFileSync(join(DIR, 'styles.css'), 'utf8');
export const js = readFileSync(join(DIR, 'app.js'), 'utf8');
export const data = readFileSync(join(DIR, 'data.js'), 'utf8');
