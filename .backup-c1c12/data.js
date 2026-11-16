/* GlitchCoin v1 — date brute din tabul „Inflație” (GlitchCoin.xlsx, septembrie 2025).
   Nu contine date personale: aplicatia lucreaza cu input de la utilizator. */
'use strict';

const GLITCHCOIN_DATA = {
  // Rata inflației anuale 1991–2024. Valoarea 2.3062 înseamnă +230,62%.
  inflation: [
    { year: 1991, rate: 2.3062 },
    { year: 1992, rate: 2.1121 },
    { year: 1993, rate: 2.5517 },
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
  ],

  // Prețuri la alimentele de bază, 2020–2025 (2025 = estimare), în lei.
  food: [
    { name: 'Ulei (litru)',        prices: { 2020: 6.5, 2021: 7,    2022: 9,    2023: 7.5,  2024: 8,    2025: 8.8 } },
    { name: 'Pâine (500g)',        prices: { 2020: 2,   2021: 2.2,  2022: 2.5,  2023: 2.7,  2024: 2.9,  2025: 3.2 } },
    { name: 'Lapte (litru)',       prices: { 2020: 4,   2021: 4.2,  2022: 4.5,  2023: 4.8,  2024: 5,    2025: 5.4 } },
    { name: 'Carne de pui (kg)',   prices: { 2020: 12,  2021: 12.5, 2022: 13,   2023: 13.5, 2024: 14,   2025: 14.7 } },
    { name: 'Zahăr (kg)',          prices: { 2020: 3.5, 2021: 3.7,  2022: 4,    2023: 4.2,  2024: 4.4,  2025: 4.8 } },
    { name: 'Făină (kg)',          prices: { 2020: 2.5, 2021: 2.6,  2022: 2.8,  2023: 2.9,  2024: 3,    2025: 3.3 } },
    { name: 'Oua (10 buc)',        prices: { 2020: 6,   2021: 6.2,  2022: 6.5,  2023: 6.8,  2024: 7,    2025: 7.5 } },
    { name: 'Cartofi (kg)',        prices: { 2020: 2,   2021: 2.2,  2022: 2.5,  2023: 2.7,  2024: 2.8,  2025: 3 } },
    { name: 'Mere (kg)',           prices: { 2020: 3,   2021: 3.2,  2022: 3.5,  2023: 3.7,  2024: 3.9,  2025: 4.2 } },
    { name: 'Brânză telemea (kg)', prices: { 2020: 20,  2021: 21,   2022: 22.5, 2023: 23.5, 2024: 24.5, 2025: 26 } },
  ],
};
