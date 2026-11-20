/* GlitchCoin v2 — date brute.
   Nu contine date personale: aplicatia lucreaza cu input de la utilizator.

   Sursa inflatiei: INS, IPC national (serie annuala).
   • 1991–1993: aliniate la INS (valorile anterioare, World Bank/IMF, difereau semnificativ).
   • 1994–2024: coincid cu INS la zecimala de procent.
   • 2025: media anuala IPC nationala, 7,3% (INS, definitiva).
   • 2026: 6,3% — oct 2026 vs dec 2025 (YTD, parțial); rata anuală oct/oct = 6,9%.
   • Pentru puterea de cumpărare a anului parțial se folosește media pe 12 luni
     (nov 2025–oct 2026 = 9,0%), nu rata YTD — o rată YTD nu e o rată anuală.

   Surse oficiale:
   • INS — https://insse.ro/cms/en/content/cpi-annual-data-series
   • BNR — https://www.bnr.ro/uploads/2026-11-16raportasuprainflatiei,noiembrie2026_documentpdf_545_1794821695.pdf
   • AGERPRES (octombrie 2026) — https://agerpres.ro/economic/2026/11/12/rata-anuala-a-inflatiei-isi-continua-cresterea-si-ajunge-la-6-9-in-octombrie--1612494
   • Prețuri alimente: estimări metodologice (variații INS aplicate prețului 2024),
     cf. InfoCons — https://infocons.ro/studiu-comparativ-infocons-protectia-consumatorilor-cat-ne-costa-alimentele-de-baza-septembrie-2025-vs-septembrie-2026 */
'use strict';

/* CONFIG_AN — SINGURUL loc cu valorile care se schimbă odată cu anul.
   La actualizarea anuală se modifică doar acest obiect (și seria de inflație
   din GLITCHCOIN_DATA); app.js și index.html preiau valorile de aici.
   Sursa valorilor: DATE-2025-2026.md §2, §5, §7 — raport de cercetare păstrat
   în repo (public) și atașat și pe cardul t_fe959b3f. */
const CONFIG_AN = {
  versiune: '3.2.0',
  anCurent: 2026,
  inflatie: {
    rata: 0.063,                 // 6,3% — oct 2026 vs dec 2025 (YTD, parțial)
    eticheta: 'oct 2026 vs dec 2025, parțial',
    rataOctOct: 0.069,           // 6,9% — rata anuală pe octombrie 2026
    // Pentru puterea de cumpărare folosim media pe 12 luni, nu rata YTD:
    // seria lui 2026 e parțială, iar 6,3% (oct/dec) nu e o rată anuală.
    rataPutereCumparare: 0.090,  // 9,0% — nov 2025–oct 2026 (provizoriu)
    etichetaPutereCumparare: 'media 12 luni (nov 2025–oct 2026), provizoriu',
    sursa: 'https://agerpres.ro/economic/2026/11/12/rata-anuala-a-inflatiei-isi-continua-cresterea-si-ajunge-la-6-9-in-octombrie--1612494',
  },
  zileLucratoare: 250,           // 365 − 104 weekend − 11 sărbători din timpul săptămânii
  sarbatoriLegale: 11,           // din 16 sărbători legale în 2026 (Codul muncii, art. 137)
  coteFiscale: {
    dobanda: 10,
    dividende: 16,
    vmRo: 3,
    vmRoScurt: 6,
    vmStrain: 16,
  },
  actualizatLa: '2026-11-16',    // data publicării sursei BNR celei mai recente
};

/* Sursa [13] din raportul de cercetare (PwC Tax Summaries, România).
   app.js o folosește în IMPOZIT_SURSE.pwc; testul verifică această legătură,
   fără să depindă de fișierul DATE-2025-2026.md (păstrat doar local). */
const SURSA_PWC_RATA = 'https://taxsummaries.pwc.com/romania/individual/significant-developments';

const GLITCHCOIN_DATA = {
  // Rata inflației anuale 1991–2026. Valoarea 2.561 înseamnă +256,1%.
  inflation: [
    { year: 1991, rate: 1.702 },
    { year: 1992, rate: 2.104 },
    { year: 1993, rate: 2.561 },
    { year: 1994, rate: 1.3676 },
    { year: 1995, rate: 0.3224 },
    { year: 1996, rate: 0.3883 },
    { year: 1997, rate: 1.5476 },
    { year: 1998, rate: 0.5910 },
    { year: 1999, rate: 0.4580 },
    { year: 2000, rate: 0.4567 },
    { year: 2001, rate: 0.3448 },
    { year: 2002, rate: 0.2254 },
    { year: 2003, rate: 0.1527 },
    { year: 2004, rate: 0.1187 },
    { year: 2005, rate: 0.0901 },
    { year: 2006, rate: 0.0656 },
    { year: 2007, rate: 0.0484 },
    { year: 2008, rate: 0.0785 },
    { year: 2009, rate: 0.0559 },
    { year: 2010, rate: 0.0609 },
    { year: 2011, rate: 0.0579 },
    { year: 2012, rate: 0.0333 },
    { year: 2013, rate: 0.0398 },
    { year: 2014, rate: 0.0107 },
    { year: 2015, rate: -0.0059 },
    { year: 2016, rate: -0.0154 },
    { year: 2017, rate: 0.0134 },
    { year: 2018, rate: 0.0463 },
    { year: 2019, rate: 0.0383 },
    { year: 2020, rate: 0.0263 },
    { year: 2021, rate: 0.0505 },
    { year: 2022, rate: 0.1380 },
    { year: 2023, rate: 0.1040 },
    { year: 2024, rate: 0.0560 },
    { year: 2025, rate: 0.0730 },
    { year: 2026, rate: 0.0630, partial: true },
  ],

  // Prețuri la alimentele de bază, 2020–2026, în lei.
  // 2025–2026: estimări metodologice (variații INS aplicate prețului 2024).
  food: [
    { name: 'Ulei (litru)',        prices: { 2020: 6.5, 2021: 7,    2022: 9,    2023: 7.5,  2024: 8,    2025: 8.62,  2026: 9.30  } },
    { name: 'Pâine (500g)',        prices: { 2020: 2,   2021: 2.2,  2022: 2.5,  2023: 2.7,  2024: 2.9,  2025: 3.19,  2026: 3.33  } },
    { name: 'Lapte (litru)',       prices: { 2020: 4,   2021: 4.2,  2022: 4.5,  2023: 4.8,  2024: 5,    2025: 5.45,  2026: 5.89  } },
    { name: 'Carne de pui (kg)',   prices: { 2020: 12,  2021: 12.5, 2022: 13,   2023: 13.5, 2024: 14,   2025: 14.98, 2026: 15.73 } },
    { name: 'Zahăr (kg)',          prices: { 2020: 3.5, 2021: 3.7,  2022: 4,    2023: 4.2,  2024: 4.4,  2025: 4.74,  2026: 4.88  } },
    { name: 'Făină (kg)',          prices: { 2020: 2.5, 2021: 2.6,  2022: 2.8,  2023: 2.9,  2024: 3,    2025: 3.23,  2026: 3.15  } },
    { name: 'Ouă (10 buc)',        prices: { 2020: 6,   2021: 6.2,  2022: 6.5,  2023: 6.8,  2024: 7,    2025: 7.70,  2026: 8.51  } },
    { name: 'Cartofi (kg)',        prices: { 2020: 2,   2021: 2.2,  2022: 2.5,  2023: 2.7,  2024: 2.8,  2025: 2.49,  2026: 2.43  } },
    { name: 'Mere (kg)',           prices: { 2020: 3,   2021: 3.2,  2022: 3.5,  2023: 3.7,  2024: 3.9,  2025: 4.20,  2026: 3.99  } },
    { name: 'Brânză telemea (kg)', prices: { 2020: 20,  2021: 21,   2022: 22.5, 2023: 23.5, 2024: 24.5, 2025: 26.39, 2026: 27.30 } },
  ],
};

/* Valori DERIVATE din CONFIG_AN și din seriile existente. Nu sunt valori
   noi, ci o singură sursă verificabilă pentru textele de fallback din
   index.html (marcate cu `data-config-key`) și pentru teste. Nicio funcție
   financiară nu e modificată de aici. */
const CONFIG_DERIVAT = (() => {
  const an = CONFIG_AN.anCurent;
  const produsInflatie = GLITCHCOIN_DATA.inflation
    .filter((d) => d.year >= 2000 && d.year <= an)
    // Anul parțial folosește media pe 12 luni, nu rata YTD (vezi CONFIG_AN.inflatie).
    .reduce((produs, d) => produs * (1 + (d.partial ? CONFIG_AN.inflatie.rataPutereCumparare : d.rate)), 1);
  const crestere = (p) => p.prices[an] / p.prices[2020] - 1;
  const max = Math.max(...GLITCHCOIN_DATA.food.map(crestere));
  const min = Math.min(...GLITCHCOIN_DATA.food.map(crestere));

  return {
    anCurent: an,
    inflatie: {
      rata: CONFIG_AN.inflatie.rata,
      rataOctOct: CONFIG_AN.inflatie.rataOctOct,
      putereCumparare: CONFIG_AN.inflatie.rataPutereCumparare,
    },
    zileLucratoare: CONFIG_AN.zileLucratoare,
    sarbatoriLegale: CONFIG_AN.sarbatoriLegale,
    zileLucratoarePeLuna: CONFIG_AN.zileLucratoare / 12,   // 250/12 = 20,83
    echivalent1000lei2000: 1000 * produsInflatie,         // putere de cumpărare, 2000 → 2026
    crestereAlimente: {
      max: { valoare: max, produs: GLITCHCOIN_DATA.food.find((p) => crestere(p) === max).name },
      min: { valoare: min, produs: GLITCHCOIN_DATA.food.find((p) => crestere(p) === min).name },
    },
    coteFiscale: { ...CONFIG_AN.coteFiscale },
  };
})();
