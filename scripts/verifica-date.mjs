#!/usr/bin/env node
/* GlitchCoin — verificare structurală a datelor (v3).
   Rulează: node scripts/verifica-date.mjs
   Nu modifică nimic; iese cu cod 1 dacă o regulă e încălcată.
   Detectează greșeli de introducere în CONFIG_AN / GLITCHCOIN_DATA,
   nu înlocuiește verificarea surselor pe web (docs/METODOLOGIE.md). */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const data = readFileSync(new URL('../data.js', import.meta.url), 'utf8');
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(data + '\n globalThis.__d = { CONFIG_AN, CONFIG_DERIVAT, GLITCHCOIN_DATA };', ctx);
const { CONFIG_AN, CONFIG_DERIVAT, GLITCHCOIN_DATA } = ctx.__d;

const erori = [];
const regula = (ok, mesaj) => { if (!ok) erori.push(mesaj); };

regula(Number.isInteger(CONFIG_AN.anCurent) && CONFIG_AN.anCurent >= 2026,
  'CONFIG_AN.anCurent trebuie să fie un an >= 2026');
regula(/^\d{4}-\d{2}-\d{2}$/.test(CONFIG_AN.actualizatLa), 'actualizatLa trebuie format ISO YYYY-MM-DD');

const inflatie = GLITCHCOIN_DATA.inflation;
regula(inflatie.length > 0, 'seria de inflație e goală');
inflatie.forEach((d, i) => {
  regula(Number.isInteger(d.year), `an invalid la poziția ${i}`);
  regula(Number.isFinite(d.rate) && Math.abs(d.rate) < 5, `rată neverosimilă în ${d.year}`);
  if (i > 0) regula(d.year === inflatie[i - 1].year + 1, `an lipsă între ${inflatie[i - 1].year} și ${d.year}`);
  if (d.partial) {
    regula(d.year === CONFIG_AN.anCurent, `doar anul curent poate fi parțial (${d.year})`);
    regula(Math.abs(d.rate - CONFIG_AN.inflatie.rata) < 1e-12, 'rata afișată diferă de CONFIG_AN');
  }
});
regula(Math.abs(CONFIG_AN.inflatie.rata - inflatie.at(-1).rate) < 1e-12,
  'CONFIG_AN.inflatie.rata diferă de ultimul an din serie');
regula(Math.abs(CONFIG_AN.inflatie.rataPutereCumparare - CONFIG_DERIVAT.inflatie.putereCumparare) < 1e-12,
  'rata de putere de cumpărare nu ajunge în CONFIG_DERIVAT');
regula(CONFIG_AN.inflatie.rataPutereCumparare > 0, 'rata de putere de cumpărare trebuie pozitivă');

regula(CONFIG_AN.zileLucratoare === 365 - 104 - CONFIG_AN.sarbatoriLegale,
  'zileLucratoare nu coincide cu 365 − 104 − sărbători');
regula(CONFIG_AN.zileLucratoare > 0 && CONFIG_AN.zileLucratoare <= 365, 'zileLucratoare în afara intervalului');

const cote = CONFIG_AN.coteFiscale;
for (const [k, v] of Object.entries(cote)) {
  regula(Number.isFinite(v) && v >= 0 && v <= 100, `cotă fiscală invalidă: ${k}`);
}

const food = GLITCHCOIN_DATA.food;
regula(food.length >= 5, 'prea puține produse alimentare');
for (const p of food) {
  for (const an of [2020, 2024, CONFIG_AN.anCurent]) {
    regula(Number.isFinite(p.prices[an]) && p.prices[an] > 0, `preț invalid: ${p.name} (${an})`);
  }
  regula(p.prices[CONFIG_AN.anCurent] > 0, `preț lipsă în anul curent: ${p.name}`);
}
regula(CONFIG_DERIVAT.echivalent1000lei2000 > 1000, 'deflatorul nu crește puterea de cumpărare');

if (erori.length) {
  console.error(`verifica-date: ${erori.length} eroare/eri`);
  erori.forEach((e) => console.error('  • ' + e));
  process.exit(1);
}
console.log(`verifica-date: OK — ${inflatie.length} ani de inflație, ${food.length} produse, an ${CONFIG_AN.anCurent}`);
