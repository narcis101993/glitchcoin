# GlitchCoin — Educație financiară

Aplicație web de educație financiară, conversie a taburilor din `GlitchCoin.xlsx`.
HTML + CSS + JavaScript static, **fără backend**, fără conturi, fără date personale.

## Cum deschizi

1. **Dublu-click pe `index.html`** — se deschide în browserul implicit (Safari/Chrome), direct din folder.
2. Sau, din Terminal:
   ```bash
   open "/Users/narciscriveanu/Hermes Projects/GlitchCoin/index.html"
   ```

Nu ai nevoie de internet — toate fișierele și toate datele sunt locale.

## Tema (light / dark)

- **Comutator în header** (soare / lună), colțul din dreapta al hero-ului.
- **Preferința se salvează** în `localStorage` și reapare la următoarele vizite.
- **Prima vizită** respectă `prefers-color-scheme` din sistem (dark sau light).
- **Contrast WCAG AA** în ambele teme (verificat pe toate perechile de text).
- Se comută instant, fără flash de culoare (tema se aplică înainte de paint).
- Deciziile de design sunt tokeni CSS (`--surface`, `--ink`, `--accent`, `--pos`, `--neg`, `--warn`),
  nu culori fixe în HTML/JS.

> Notă: pe unele browsere, `localStorage` poate fi blocat pentru fișierele deschise direct
> cu `file://` (aplicația funcționează tot, dar tema nu se reține între deschideri).
> Pe `http(s)` — inclusiv GitHub Pages — persistența funcționează normal.

## Navigare cu taburi

Bara de taburi are aceeași ordine ca taburile din Excel:

| # | Tab | Stare |
|---|-----|-------|
| 1 | Inflație | **gata** (v1) |
| 2 | Timp vs dorințe | **gata** (v2.1) |
| 3 | Calculul dobânzii | **gata** (v2.1) |
| 4 | Dobânda compusă | **gata** (v2.2) |
| 5 | Randament | **gata** (v2.2) |
| 6 | Profit | **gata** (v2.3) |
| 7 | Costul mediu de achiziție | **gata** (v2.3) |
| 8 | Sumă dorită | **gata** (v2.4) |
| 9 | „Nu am bani" | **gata** (v2.4, tab ascuns în Excel) |

Toate cele 9 taburi se deschid. Bara se derulează orizontal pe ecrane înguste. Se poate naviga
și din tastatură (săgeți stânga/dreapta, Home, End).

## Fișiere

| Fișier | Rol |
|--------|-----|
| `index.html` | Structura paginii, bara de taburi și cele 4 secțiuni din tabul Inflație |
| `styles.css` | Stilurile și tokenii de temă (funcționează offline, fără librării externe) |
| `data.js` | Datele brute: inflația 1991–2024 și prețurile alimentelor 2020–2025 |
| `app.js` | Toate calculele, interactivitatea, navigarea cu taburi și comutatorul de temă |
| `favicon.svg` / `favicon.png` / `favicon-180.png` | Icoana aplicației (vector + PNG, apple-touch) |

## Ce conține tabul Inflație

1. **Simulatorul inflației** — introdu suma actuală și rata inflației; vezi cât de multi bani
   îi vei avea nevoie în anii 2, 5, 10 și 15, plus tabelul complet pe 15 ani.
2. **Alimente** — prețurile la 10 produse de bază, 2020–2025, cu creșterea 2025 vs 2020.
3. **Inflația 1991–2024** — grafic cu rata anuală, statistici și tabel complet.
4. **Deflatorul sumelor** — află echivalentul sumei actuale în orice an între 1991 și 2025.

## Ce conține tabul Timp vs dorințe

1. **Venitul pe unități de timp** — venitul lunar net împărțit la 31 (zi), 24 (oră) și 60 (minut),
   plus venitul pe zi lucrătoare (20) și pe oră lucrătoare (8/24).
2. **Cât timp muncești pentru o dorință** — minute, ore și zile din viață (24/24) sau ore și zile
   lucrate (8/24), cu procentul din timpul unui an (365 zile) sau dintr-un an lucrător (261 zile).

Valori implicite din Excel: venit 5.000 lei, dorință 3.600 lei → 32.141 minute / 536 ore / 22 zile (24/24),
sau 115 ore / 14 zile lucrate (8/24) — 6,12% dintr-un an sau 5,52% dintr-un an lucrător.

## Ce conține tabul Calculul dobânzii

1. **Patru inputuri** — sumă inițială, rată anuală, număr de zile și impozit.
2. **Dobânda brută și netă** — brut = ROUND(suma × rată × zile / 365, 2); net = ROUND((1 − impozit) × brut, 2).

Valori implicite din Excel: 15.000 lei / 7% / 184 zile / 10% → brut 529,32 lei, net 476,39 lei.

## Ce conține tabul Dobânda compusă

1. **Trei inputuri** — sumă inițială, contribuție lunară și rată anuală a dobânzii.
2. **Scenariul fără contribuție** — evoluția pe 20 de ani: suma + dobândă, dobânda anuală și
   randamentul față de primul an.
3. **Scenariul cu contribuție** — suma investită, dobânda acumulată, suma totală și creștere anuală.

Valori implicite din Excel: 10.000 lei / 200 lei lunar / 2,50% → anul 1 = 10.250,00 lei,
anul 2 = 10.506,25 lei, anul 20 = 16.386,14 lei (fără contribuție) și 78.673,58 lei
cu contribuție, din care 58.000,00 lei investiți.

## Ce conține tabul Randament

1. **Cinci inputuri** — sumă investită, randament, impozit, comisioane și inflație.
2. **Randament brut, net și real** — brut = sumă × randament; net = brut − impozit − comisioane;
   real = (1 + net) / (1 + inflație) − 1.

Valori implicite din Excel: 10.000 lei / 7% / 10% / 2% / 5% → brut 700,00 lei (7,00%),
net 616,00 lei (6,16%), real 110,48 lei (1,10%).

## Ce conține tabul Profit

1. **Șase inputuri** — sumă investită, preț inițial/mediu, preț vânzare, impozit, comisioane și inflație.
2. **Valoarea finală, profitul brut, net și real** — valoarea finală = sumă / preț inițial × preț vânzare;
   brut = valoarea finală − sumă; net = brut − (brut × impozit + brut × comisioane);
   real = randament real × sumă.
3. **Randamentul brut, net și real** — brut = valoarea finală / sumă − 1; net = profit net / sumă;
   real = (1 + randament net) / (1 + inflație) − 1.

Valori implicite din Excel: 10.000 lei / 25 lei / 28 lei / 10% / 2% / 5% → valoarea finală 11.200,00 lei,
profit brut 1.200,00 lei, profit net 1.056,00 lei, randament real 5,30% (profit real 529,52 lei).

## Ce conține tabul Costul mediu de achiziție

1. **Tabel dinamic** — fiecare rând are preț, cantitate și comision (%); poți adăuga rânduri cu
   „+ Adaugă rând", șterge rândurile cu „Șterge" și revino la valorile din Excel cu „Resetează".
2. **Costul mediu ponderat** — (Σ preț × cantitate + Σ preț × cantitate × comision) / Σ cantitate,
   plus cantitatea totală, valoarea achiziționată și totalul plătit (cu comision).

Valori implicite din Excel: (28,81 × 24), (27,75 × 144), (32,89 × 4), (34,40 × 30), toate cu comision 2%
→ costul mediu 29,5447 lei pentru 202 de unități (5.851,00 lei achiziționat + 117,02 lei comisioane
= 5.968,02 lei plătiți).

## Ce conține tabul Sumă dorită

1. **Patru inputuri** — randament anual, număr de ani, sumă inițială și sumă dorită.
2. **Economia lunară necesară** — `-PMT(randament/12, ani×12, sumă inițială, sumă dorită)`,
   plus totalul economisit și suma din dobândă.
3. **Tabela pe ani** — suma acumulată, economisit în total, din dobândă și cât din țintă e acumulat.

Valori implicite din Excel: 10% / 15 ani / 0 / 1.000.000 lei → **2.412,72 lei pe lună**
(434.289,21 lei economisiți + 565.710,79 lei din dobândă = 1.000.000,00 lei).

## Ce conține tabul „Nu am bani" (ascuns în Excel)

1. **Inputuri** — venit lunar NET, ziua din lună în care primești venitul, inflația, suma
   adăugată în contul de economii și dobânda oferită de bancă.
2. **Listă de facturi** — nume, zi scadentă și sumă; rândurile se adaugă, se șterg și se resetează.
3. **Simularea pe zile** — ce rămâne la finalul lunii fără și cu cont de economii, profitul din
   dobândă și desfășuratorul zilnic (ziua, suma + dobândă, dobânda, suma retrasă, soldul).
4. **Pe termen lung** — profitul într-un an, inflația pentru tine și profitul în 10 ani.

Valori implicite din Excel: venit 5.000 lei, venitul în ziua 10, inflație 5%, economii 5.000 lei,
dobândă 2% → **2.570,00 lei fără CE, 2.565,77 lei cu CE, profit 4,23 lei (0,08%)**.

## De unde vin datele

- Sursă: `/Users/narciscriveanu/Library/CloudStorage/OneDrive-Personal/Educatie financiara/GlitchCoin.xlsx`,
  9 taburi (septembrie 2025).
- Valorile sunt verificate față de Excel (simulator 5.000 lei @ 5% → 5.250 / 6.077,53 / 7.756,64 / 9.899,66 lei;
  deflator 2001 → 903,15 lei; Profit 10.000 / 25 / 28 / 10% / 2% / 5% → 11.200,00 / 1.200,00 / 1.056,00;
  Costul mediu → 29,5447 lei; Sumă dorită 10% / 15 ani / 1.000.000 lei → 2.412,72 lei/lună;
  Nu am bani → 2.570,00 lei fără CE / 2.565,77 lei cu CE / profit 4,23 lei).

## Notă

Aplicația lucrează doar cu input de la utilizator — venituri sau alte date personale nu sunt stocate nicăieri.
