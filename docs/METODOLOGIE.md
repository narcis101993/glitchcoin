# GlitchCoin — metodologie (document viu)

> Versiunea analizată: v3.2.1 · actualizat: 2026-11-20.
> `docs/REVIEW-FINANCIAR.md` e un snapshot istoric (12–16.11.2026); pentru starea curentă vezi acest document, `data.js`, `app.js` și `README.md`.

## 1. Surse și actualizare anuală

| Domeniu | Sursă | Unde se schimbă |
|---|---|---|
| Inflație 1991–2025 | INS, IPC național, serie anuală | `GLITCHCOIN_DATA.inflation` |
| Inflație an curent | INS/BNR/AGERPRES; YTD oct/dec = 6,3%, oct/oct = 6,9% | `CONFIG_AN.inflatie` |
| Putere de cumpărare (an parțial) | media pe 12 luni nov 2025–oct 2026 = 9,0% | `CONFIG_AN.inflatie.rataPutereCumparare` |
| Zile lucrătoare | Codul muncii, art. 137: 16 sărbători în 2026, 11 în timpul săptămânii → 250 | `CONFIG_AN.zileLucratoare` |
| Cote fiscale | ANAF / Cod fiscal, PwC, EY | `CONFIG_AN.coteFiscale`, `IMPOZIT_VENITURI` |
| Pilon III | ASF, Norma 10/2026 (retrageri de la 60 de ani, fără prag de 90 de contribuții) | note în `index.html` |
| Prețuri alimente 2025–2026 | estimări metodologice: variațiile INS aplicate prețului 2024; InfoCons pentru prețuri reale | `GLITCHCOIN_DATA.food` |

Regulă: se modifică **doar** `CONFIG_AN` și seriile din `data.js`; textele afișate se trag din ele prin `data-config-key` și funcțiile `text*`. Verifică după editare:

```bash
node scripts/verifica-date.mjs
node --test tests/
```

## 2. Convenții de calcul

- **Ratã anuală vs YTD.** O rată „de la începutul anului” (oct/dec) nu compară doi ani calendaristici. În serie ea rămâne afișată cu eticheta „parțial”; în deflator și în comparațiile istorice se folosește media pe 12 luni.
- **Deflator.** `echivalent(an) = suma / Π(1 + r_y)` pentru `y = an+1 … anCurent` (fără off-by-one).
- **Randament real.** `(1 + nominal) / (1 + inflație) − 1` (Fisher), nu „nominal − inflație” (aceea e doar aproximarea).
- **Impozit.** Cotele diferă per tip de venit și per an; 2025/2026 sunt ambele disponibile în tabul „Impozitare”. Pierderea nu se impozitează.
- **Comisioane.** În aplicație se aplică pe câștig (convenție de simplificare), nu pe valoarea tranzacției.
- **Zile/lună.** 365/12 = 30,44 pentru zile calendaristice; `zileLucratoare/12` pentru zile lucrătoare. Ambele sunt medii anuale.
- **Prețuri alimente.** Nu sunt statistică oficială; INS publică indici pe categorii, nu prețuri per brand/lanț. Valorile 2025–2026 sunt marcate „estimare”.

## 3. Format numerelor

Toate cifrele afișate — inclusiv proza explicativă — folosesc **en-US**: virgulă pentru mii, punct pentru zecimale (`2,570.00 lei`, `6.3%`). Nu există un al doilea locale.

## 4. Ce nu e acoperit

Aplicația e educațională: nu oferă recomandări personalizate, nu folosește date de portofoliu și nu se conectează la conturi sau la surse live. Verificarea surselor pe web se face manual, la actualizarea anuală; scriptul de mai sus verifică doar coerența internă.
