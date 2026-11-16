# GlitchCoin — Verificare financiară independentă

**Card:** `t_5fe146bc` · **Data:** 2026-11-12 · **Profil:** finance
**Fișiere verificate:** `data.js` (57 linii), `app.js` (1.784), `index.html` (1.025), `README.md`, `CONTEXT.md`
**Sursă Excel:** `GlitchCoin.xlsx` (9 taburi, inclusiv tabul ascuns „Nu am bani")
**Metodă:** citire integrală a codului și a Excel-ului (inclusiv XML-ul taburilor ascunse, cu formule), recomputare
independentă în Python a tuturor valorilor cheie, comparare cu INS / BNR / Eurostat / World Bank (nicio modificare
făcută în aplicație — doar audit, conform cerinței).

> **Regulă de citire:** toate valorile afișate de aplicație se reproduc **exact** din formulele din Excel
> (am recalculat fiecare cu Python; diferențe < 1e-9). Așadar **nu există erori de implementare** a formulelor.
> Problemele de mai jos sunt de **finanțe / metodologie / surse**, nu de programare.

---

## Rezumat executiv

| # | Problema | Tip | Prioritate |
|---|----------|-----|------------|
| 1 | Tabul „Nu am bani": valoarea „cu CE" are semnul inversat — contrazice calendul zilnic și „profitul" declarat | Financiar (semn) | **1 — ridicată** |
| 2 | Deflatorul sumelor: convenție off-by-one (aplică rata anuală cu un an în plus) | Metodologie | **1 — ridicată** |
| 3 | Seria de inflație 1991–2024 e din World Bank/IMF, nu din INS — 1991 diferă cu 60,4 pp | Sursă de date | **2 — medie** |
| 4 | Impozitul 10% și comisioanele 2% sunt generic prea mari pentru acțiuni (România, 2025–2026) | Premisă | **2 — medie** |
| 5 | „261 zile lucrătoare" e o convenție SUA; în România 2025 au fost 248 | Premisă | **2 — medie** |
| 6 | Estimarea 2025 pentru cartofi e cu ~20% peste realitate (INS: cartofii au **scăzut** cu 11%) | Date | **2 — medie** |
| 7 | „Creștere anuală" din Dobânda compusă nu e o rată de creștere; contribuția lunară e tratată inconsistent | Metodologie | **3 — joasă** |
| 8 | Profit: pierderea beneficiază de „impozit negativ" (net > brut) — necorespunzător cu realitatea | Financiar | **3 — joasă** |

---

## A. Verificarea datelor istorice

### A1. Rata inflației 1991–2024 (`data.js`)

Am comparat cele 34 de valori din `data.js` cu serii oficiale. Concluzia: **aplicația folosește seria World Bank/IMF**
(„Inflation, consumer prices (annual %)", indicatorul `FPCPITOTLZG`), nu seria INS (IPC național).

Dovezi: valorile aplicației coincid la zecimale cu seria World Bank pentru 1991–1995 (230,622 / 211,206 / 255,167 / 136,759 / 32,242)[82][83],
în timp ce INS raportează pentru 1991–1993 valori vizibil diferite[72].

| An | Aplicație | INS (IPC național) | Diferență (pp) |
|---:|---:|---:|---:|
| 1991 | 230,62% | 170,2% | **+60,42** |
| 1992 | 211,21% | 210,4% | **+0,81** |
| 1993 | 255,17% | 256,1% | **−0,93** |
| 1994 | 136,76% | 136,7% | +0,06 |
| 1995 | 32,24% | 32,3% | −0,06 |
| 1996 | 38,83% | 38,8% | +0,03 |
| 1997 | 154,76% | 154,8% | −0,04 |
| 1998 | 59,10% | 59,1% | 0,00 |
| 1999 | 45,80% | 45,8% | 0,00 |
| 2000 | 45,67% | 45,7% | −0,03 |
| 2001 | 34,48% | 34,5% | −0,02 |
| 2002 | 22,54% | 22,5% | +0,04 |
| 2003 | 15,27% | 15,3% | −0,03 |
| 2004 | 11,87% | 11,9% | −0,03 |
| 2005 | 9,01% | 9,0% | +0,01 |
| 2006 | 6,56% | 6,6% | −0,04 |
| 2007 | 4,84% | 4,8% | +0,04 |
| 2008 | 7,85% | 7,9% | −0,05 |
| 2009 | 5,59% | 5,6% | −0,01 |
| 2010 | 6,09% | 6,1% | −0,01 |
| 2011 | 5,79% | 5,8% | −0,01 |
| 2012 | 3,33% | 3,3% | +0,03 |
| 2013 | 3,98% | 4,0% | −0,02 |
| 2014 | 1,07% | 1,1% | −0,03 |
| 2015 | −0,59% | −0,6% | +0,01 |
| 2016 | −1,54% | −1,5% | −0,04 |
| 2017 | 1,34% | 1,3% | +0,04 |
| 2018 | 4,63% | 4,6% | +0,03 |
| 2019 | 3,83% | 3,8% | +0,03 |
| 2020 | 2,63% | 2,6% | +0,03 |
| 2021 | 5,05% | 5,1% | −0,05 |
| 2022 | 13,80% | 13,8% | 0,00 |
| 2023 | 10,40% | 10,4% | 0,00 |
| 2024 | 5,60% | 5,6% | 0,00 |

**Evaluare:** pentru 1994–2024 aplicația coincide cu INS la zecimala de procent (diferențe ≤0,05 pp, de rotunjire).
**1991–1993 diferă** pentru că sursa e alta (World Bank/IMF vs IPC național INS). Diferența din 1991 (60,4 pp) e importantă
și vizibilă într-o aplicație educațională.

**Recomandare:** fie **schimbi sursa la INS** (sursa oficială națională, mai crezută de publicul românesc), fie
**documentezi explicit** în aplicație că seria e World Bank/IMF și de ce. Prioritate **2**.

---

### A2. Extindere cu anul 2025 complet

Excel-ul marchează 2025 ca „estimare" (septembrie 2025). INS a publicat deja datele definitive:

- **Media anuală 2025 (IPC național): 7,3%** — INS, comunicat de presă 14.01.2026[73][74][104].
- **Rata anuală decembrie 2025: 9,69%** (IPC) / 8,6% (IAPC)[73][74].
- **Media anuală 2025 (IAPC, metodologia UE): 6,8%**[74][99].
- Alimente: **+7,7%** medie anuală; în decembrie 2025 vs decembrie 2024: **+7,75%**, cartofi **−11%**, cafea/cacao +24,67%[74][88].

**Propunere pentru aplicație:** adaugi `{ year: 2025, rate: 0.0730 }` (media anuală IPC națională, 7,3%).
Dacă vrei corespondentul european, 6,8% (IAPC) — dar prezentul 2024 (5,6%) e IPC național, deci 7,3% păstrează coerența.

---

### A3. Extindere cu datele pe 2026 (oficial până acum)

Nu există încă media anuală 2026 (anul nu s-a încheiat). Datele oficiale lunare (rata anuală, IPC național):

| Lună 2026 | Ian | Feb | Mar | Apr | Mai | Iun | Iul | Aug | Sep | Oct |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Rata anuală IPC | 9,62% | 9,31% | 9,87% | 10,71% | 10,85% | 10,42% | 8,16% | 6,2% | 6,6% | **6,94%** |

Surse: euroref.dev (seria lunară INS)[78] și rapoartele BNR[79][80]. Completat cu buletinul BNR[81], AGERPRES[75] și Bursa.ro[76].

- **Rata anuală octombrie 2026: 6,94%** (IPC) / 7,0% (IAPC)[75][76].
- **Creștere de la începutul anului** (octombrie 2026 vs decembrie 2025): **6,3%**[75][76].
- Media ultimelor 12 luni (noiembrie 2025 – octombrie 2026): **9,0%** (IPC) / 8,3% (IAPC)[77].
- **Proiecție BNR (Raportul asupra inflației, ed. noiembrie 2026):** creștere ușoară la final de an, revenire în intervalul
  țintei (2,5% ±1 pp) în T1 2028[100]. Proiecția din ed. august 2026: 6,1% în decembrie 2026[79].

**Propunere pentru aplicație:** adaugi o **valoare provizorie 2026 = 6,3%** (creșterea de la începutul anului, octombrie 2026
vs decembrie 2025), etichetată clar „parțial (ianuarie–octombrie 2026)". Alternativ, 6,94% (rata anuală octombrie 2026).
**Nu** recomand media ultimelor 12 luni (9,0%) pentru că e o fereastră glisantă, nu o rată anuală.

---

### A4. Prețurile alimentelor 2020–2025 (10 produse)

**Verificare verosimililitate:** toate cele 10 prețuri 2020–2024 sunt plausibile pentru piețele românești
(ex. ulei 6,5–9 lei/l, lapte 4–5 lei/l, ouă 6–7 lei/10 buc, mere 3–3,9 lei/kg, telemea 20–24,5 lei/kg).
Pereții de comparație publicați: InfoCons (prețuri minime în 9 lanțuri, București)[84][85], Fanatik (prețuri reale în magazine)[86],
Business24 (comparatie 2023–2025)[87].

**Problemă:** aplicația **nu citează nicio sursă** pentru prețuri și nu specifică brand/lanț de unde provin. Prețurile de
retail variază mult între lanțuri (InfoCons: ulei de la 6,99 la 9,19 lei/l în septembrie 2026, funcție de magazin[84]).

**Estimările 2025 din Excel vs realitatea INS:**

| Produs | Estimare 2025 | Variație implicită | Real 2025 (INS) | Propunere 2025 | Propunere 2026 |
|---|---:|---:|---:|---:|---:|
| Ulei (litru) | 8,80 | +10,0% | +7,75% | **8,62** | **9,30** |
| Pâine (500g) | 3,20 | +10,3% | +10,0% | **3,19** | **3,33** |
| Lapte (litru) | 5,40 | +8,0% | +9,0% | **5,45** | **5,89** |
| Carne de pui (kg) | 14,70 | +5,0% | +7,0% | **14,98** | **15,73** |
| Zahăr (kg) | 4,80 | +9,1% | +7,7% | **4,74** | **4,88** |
| Făină (kg) | 3,30 | +10,0% | +7,7% | **3,23** | **3,15** |
| Oua (10 buc) | 7,50 | +7,1% | +10,0% | **7,70** | **8,51** |
| **Cartofi (kg)** | **3,00** | **+7,1%** | **−11,0%** | **2,49** | **2,43** |
| Mere (kg) | 4,20 | +7,7% | +7,7% | **4,20** | **3,99** |
| Brânză telemea (kg) | 26,00 | +6,1% | +7,7% | **26,39** | **27,30** |

**Cea mai mare discrepanță: cartofii.** Estimarea 2025 (3,00 lei) e cu **~20% peste** ceea ce arată INS (prețul a **scăzut**
cu 11% în 2025 vs 2024[74]). Restul sunt în banda ±3%.

**Propunere 2026** = aplicarea variațiilor INS pe produs (octombrie 2026 vs octombrie 2025): pâine +4,5%, ouă +10,5%,
lapte +8,11%, ulei +7,94%, făină −2,5%, cartofi −2,53%, telemea +3,46%, fructe proaspete −15,38%[89][90][102].
Valorile de mai sus sunt **propuneri metodologice** (aplicarea variațiilor INS la prețul 2024), nu prețuri „oficiale"
— exactitatea depinde de brand/lanț. Vezi secțiunea „Limitări" de la sfârșit.

---

### A5. Deflatorul sumelor (echivalentul în anii trecuți)

**Am găsit o problemă de metodologie (off-by-one).** Aplicația calculează:

```
echivalent = suma / Π (1 + rata_y)   pentru y = an … 2024
```

Cu `r_y` = rata anuală a inflației din anul `y`. Astfel, rândul „2024" = `suma / (1 + r_2024)`, adică arată
echivalentul în **2023**, nu în 2024. Rândul „2025" = suma neschimbată (2025), deci **nu e aliniat** cu restul tabelului.

Exemplu concret (5000 lei): Excel-ul dă `2024 → 4734,85`, dar `5000 / 1,056 = 4734,85` — deci rândul 2024 arată
echivalentul în 2023. Dacă vrei „ce puteai cumpăra în 2024", trebuie `5000 / (1+r_2025)` (cu r_2025 = 7,3%) = **4660,8 lei**;
„în 2025" rămâne 5000.

**Corecția corectă:** iterează `y = an+1 … anCurent` (convenția INS: rata anuală = media anului `y` vs media anului `y-1`).
Sau păstrezi formula, dar **reetichetezi** rândurile (rândul `y` = echivalent în `y−1`).

**De ce contează:** pentru 2001, diferența e de **34,5%** (903 lei vs 1215 lei). Pentru ani recenti, ~5%.

**Valori propuse** (5000 lei, cu 2025 = 7,3%, 2026 = 6,3% provizoriu):

| An | Convenție actuală | Corectat |
|---:|---:|---:|
| 2000 | 577,82 | 841,71 |
| 2001 | 841,71 | **1131,93** |
| 2010 | 2480,60 | 2631,67 |
| 2020 | 3257,80 | 3343,48 |

(Excel-ul, cu data 2025 = 5000 lei, dă pentru 2001 → **903,15**; corecția vede 1131,93.)

**Notă:** tooltip-ul aplicației documentează deja convenția („ani A, A+1, …, 2024"), deci e o **convenție declarată**.
Dar raportat la ce așteaptă un utilizator („echivalentul în 2001"), e un an de decalaj. Recomand clarificarea. Prioritate **1**.

---

### A6. Valorile implicite folosite în exemple

| Valoare | Tab | Evaluare | Sursă |
|---|---|---|---|
| Venit 5.000 lei/lună net | Timp vs dorințe, Nu am bani | Realist — media netă 2025 = **5.266 lei**[96]; sep. 2026 = 5.717 lei[97] | OK |
| Dorință 3.600 lei | Timp vs dorințe | Plausibil (electrocasnic/laptop de bază) | OK |
| Dobândă 7% | Calculul dobânzii | Plausibil pentru un depozit promoțional pe 12 luni (BNR: media 2025 = 5,39%; oferte maxim ~6,75–7%)[105][106]; la limita superioară pentru o perioadă scurtă (184 zile) | Realist, cu nuanță |
| Impozit 10% | Dobânda, Randament, Profit | Corect pentru **dobânzi și dividende în 2025**[91][94]. **Greșit pentru acțiuni păstrate >1 an prin broker românesc** (1% în 2025, 3% în 2026)[92][93][95] | Vezi B4 |
| Comisioane 2% | Randament, Profit | **Mare** pentru acțiuni (brokeri RO: 0,1–0,5%; străini: 0,5–1%); plauzibil pentru crypto/CFD | Premisă de ilustrat |
| Inflație 5% | Randament, Profit | Apropiat de 2024 (5,6%) și din ținta BNR (2,5% ±1 pp) | OK |
| Randament 7% | Randament, Sumă dorită | Plausibil pe termen lung pentru acțiuni; **optimist** pentru depozite/obligațiuni | OK cu riscul specificat |
| Prețuri Cost mediu (28,81 / 27,75 / 32,89 / 34,40) | Costul mediu | Plausibil pentru acțiuni la o bursă | OK |
| Țintă 1.000.000 lei / 15 ani / 10% | Sumă dorită | Plausibil, dar 10% pe 15 ani fără risc e optimist | OK cu riscul specificat |
| Dobândă 2% | Nu am bani | **Scăzut** — media dobânzii la depozitele noi ale populației la finalul 2025 = 5,39%; cele mai bune oferte ~6,75–7%[105][106] | Premisă de ilustrat |

---

## B. Verificarea financiară a formulelor

Am recalculat fiecare formulă independent în Python. **Toate valorile cheie se reproduc exact.**

### B1. Simulatorul inflației — **corect**

`valoare = suma × (1+rata)^(an−1)`. 5000 @ 5% → 5250 / 6077,53 / 7756,64 / 9899,66 ✓
*Observație minoră:* anul 1 = anul curent, deci „anul 2" = un an de la acum. Eticheta poate părea un an întârziată.

### B2. Timp vs dorințe — **corect, o premisă de ajustat**

venit/zi = venit/31; /oră = /24; /minut = /60; zile lucrătoare = 20; ore = 8. Valorile 32.141 min / 536 h / 22 zile /
115 h / 14 zile / 6,12% / 5,52% se reproduc ✓.

**Problemă:** constanta `TIMP_ZILE_LUCRATOARE_AN = 261`. În România au existat **248 de zile lucrătoare în 2025** (13 sărbători
legale în timpul săptămânii, 104 zile de weekend)[98]. 261 e o convenție de tip SUA (52 săptămâni × 5 zile). Efectul:
„5,52% dintr'un an lucrător" ar deveni **~5,81%** cu 248 zile (divizorul lunar fix de 20 rămânând) — aproximativ 0,3 pp mai mult, deci mesajul e conservator.

*Observație minoră:* „31 zile/lună" supraestimează venitul pe zi cu ~1,8% față de media reală (365/12 = 30,44).

### B3. Calculul dobânzii — **corect**

`brut = ROUND(suma × rată × zile/365, 2)`; `net = ROUND((1−impozit) × brut, 2)`. 15000 @ 7% × 184 zile → 529,32 / 476,39 ✓.
Actual/365 e convenția standard pentru depozite în RON.

### B4. Randament — **corect ca formulă, premisele fiscale de ajustat**

`brut = suma × randament`; `net = brut − impozit×brut − comisioane×brut`; `real = (1+netPct)/(1+inflatie) − 1`. ✓

**Două premise discutabile:**

1. **Impozitul de 10% e prea mare pentru acțiuni.** În România, pentru vânzarea de valori mobiliere prin broker
   cu rezidență fiscală în RO: **1% (2025) / 3% (2026)** dacă deținut ≥365 zile, **3% / 6%** altfel[92][93].
   Pentru vânzări prin broker străin / gold / crypto: **10% (2025) / 16% (2026)**[92][93][91].
   Dividende: **10% (2025) / 16% (2026)**[91][94]. Dobânzi: 10% (2025), 10% pentru obligațiuni RO (de la 01.08.2025)[94][95].
   Aplicarea unei valori fixe de 10% **supraestimează impozitul** pentru un investitor cu acțiuni pe termen lung prin broker românesc.
2. **Comisioanele de 2% sunt mari pentru acțiuni** (obișnuite 0,1–0,5% RO; 0,5–1% străin). Plausibile pentru crypto/CFD.
3. **Comisioanele se aplică pe câștigul brut**, nu pe valoarea tranzacției. În realitate, comisionul e pe tranzacție
   (ex. 0,1% din valoarea cumpărată/vândută), deci un comision de 2% din *câștig* este o convenție de simplificare.

### B5. Profit — **corect ca formulă, două nuanțe**

`valoare finală = suma / preț inițial × preț vânzare`; `brut = finală − suma`; `net = brut − (brut×impozit + brut×comisioane)`;
`randReal = (1+randNet)/(1+inflatie) − 1`; `real = randReal × suma`. Valorile 11.200 / 1.200 / 1.056 / 5,30% / 529,52 ✓.

**Nuanța 1 — pierderea beneficiază de „impozit negativ":** dacă `brut < 0`, atunci `net = brut × (1 − impozit − comisioane)`,
deci `net > brut` (ex. brut −1000 lei, impozit 10% + comisioane 2% → net −880 lei). Aplicația sugerează că pierderea
este redusă de taxe, adică un beneficiu fiscal automat. În România, pierderile **nu** se compensează automat (există
compensare doar în anumite cazuri, cu reguli proprii)[93]. De regulă, impozitul pe un an cu pierdere = 0.

**Nuanța 2 — comisioanele pe câștig, nu pe tranzacție** (la fel ca la Randament).

### B6. Dobânda compusă — **corect, două inconsistențe interne**

Scenariul A: `B(n) = ROUND(B(n−1) × (1+rată), 2)` — compunere anuală, cu rotunjire. ✓ (16.386,14 la anul 20)
Scenariul B: `I(n) = C7 × (1+r/12)^(12n) + contrib × ((1+r/12)^(12n) − 1)/(r/12)` — compunere lunară. ✓ (78.673,58 la anul 20)

**Inconsistența 1 — contribuția lunară calculată ca anuală.** Coloana „Sumă investită" adaugă `contrib × 12` la
sfârșitul fiecărui an (`G(n) = G(n−1) + 12×contrib`), dar dobânda e calculată ca și cum contribuția ar fi lunară.
Dacă contribuția ar fi chiar anuală, totalul la anul 20 ar fi ~77.693 lei (cu 1.2% mai puțin). Diferență mică, dar
conceptul e mixt.

**Inconsistența 2 — „Creștere anuală" nu e o rată de creștere.** Formula `I(n)/G(n−1) − 1` compară valoarea totală
actuală cu *principalul investit* din anul precedent, nu cu valoarea totală de dinainte. La anul 20: 78.673,58/55.600 − 1
= **41,5%**, în timp ce adevărata creștere anuală e 78.673,58/74.365,31 − 1 = **5,8%**. Indicatorul induce în eroare
la utilizatorul care crede că portofoliul a crescut cu 41,5% într-un an.

### B7. Costul mediu de achiziție — **corect**

`(Σ preț × cantitate + Σ preț × cantitate × comision) / Σ cantitate`. → 29,5447 lei, 202 unități, 5.851,00 + 117,02 = 5.968,02 ✓.

### B8. Sumă dorită — **corect**

`PMT(r/12, nper, pv, fv) = −r×(pv×(1+r)^nper + fv)/((1+r)^nper − 1)`. → 2.412,72 lei/lună, 434.289,21 economisiți,
565.710,79 din dobândă ✓. Tratarea cazului `rata = 0` (împărțire la zero) e tratată corect.

### B9. „Nu am bani" — **o eroare financiară reală (semn)**

Modelul corect: venit − facturi − profit = **2.565,77** (cum afișează aplicația ca „cu CE"), dar **profitul e
calculat separat ca sumă pozitivă** — și calendul zilnic se termină la **2.574,23**. Cele două se contrazic:

- `cheltuitFaraCE = venit − facturi = 2.570,00` ✓
- `profit` (suma dobânzilor zilnice) = **+4,23** ✓
- `cheltuitCuCE = cheltuitFaraCE − profit = 2.565,77` ← **aici e semnul**
- Soldul final din simularea zilnică = `economii + profit − facturi` = **2.574,23** ← ar trebui să fie „cu CE"

Explicația din tooltip („Facturile se plătesc la scadență, deci banii rămân în contul de economii și fac dobândă")
implică un **adaos**, nu o scădere. Semnul lui `profit` în formulă e inversat față de „fără CE". Dacă banii
câștigă dobândă, la finalul lunii rămâi cu **2.574,23** (cu 4,23 mai mult), nu cu 2.565,77.

**Aceasta e eroarea cea mai importantă din punct de vedere financiar:** mesajul educațional e invers („contul de
economii îți aduce mai puțini bani"), iar aplicația se contrazice pe ea însăși (sumarul vs tabelul zilnic).
Prioritate **1**.

*Alte nuanțe minore:* dobânda e simplă zilnică (fără compunere); `profit × 12` anualizează un profit câștigat în ~20 de
zile; „inflația pentru tine" = `inflație − profit/investiție` e o aproximare brută (nu randamentul real Fisher).

---

## C. Propuneri de corecții (prioritizate)

| # | Problemă | Ce e greșit | Cum se corectează | Prioritate |
|---|----------|-------------|-------------------|:----------:|
| C1 | „Nu am bani": semnul dobânzii | `cheltuitCuCE = venit − facturi − profit` dă un rezultat mai mic decât „fără CE", contrazicând calendul zilnic | `cheltuitCuCE = venit − facturi + profit` (sau `economii + profit − facturi`, ca în simulare) | **1** |
| C2 | Deflator off-by-one | Se aplică rata anuală cu un an în plus (rândul 2024 arată echivalentul din 2023) | Iterează `y = an+1 … anCurent`; sau reetichetează rândurile | **1** |
| C3 | Impozit 10% generic | Supraestimează impozitul pentru acțiuni pe termen lung (1%/3% prin broker RO) și pentru dividende 2026 (16%) | Împarte câmpul în tipuri de venit (dobândi / dividende / valori mobiliere) sau adaugă un tooltip cu ratele reale | **2** |
| C4 | Seria de inflație (sursă WB) | 1991 diferă cu 60,4 pp față de INS; publicul românesc așteaptă INS | Treci la seria INS (IPC național) sau documentezi sursa WB | **2** |
| C5 | 261 zile lucrătoare | Convenție SUA; România 2025 = 248 | Folosești 248 (sau 250, cu o notă), sau parametrizezi | **2** |
| C6 | Comisioane 2% | Prea mari pentru acțiuni | Exemplifică cu 0,3% (acțiuni RO) și menționează crypto/CFD separately | **2** |
| C7 | Cartofi 2025 (+7,1% estimat vs −11% real) | Estimarea e cu ~20% peste | Actualizează cu 2,49 lei (sau reviziește sursa) | **2** |
| C8 | „Creștere anuală" (Dobânda compusă) | Nu e o rată de creștere (41,5% vs 5,8% reali) | Schimbă în `I(n)/I(n−1) − 1` (creștere reală) | **3** |
| C9 | Contribuție lunară calculată ca anuală | Coloana „Sumă investită" adaugă la anul, dobânda compune lunar | Aliniază: contribuție lunară în ambele, sau anuală în ambele | **3** |
| C10 | Impozit pe pierderi (Profit) | `net > brut` când e pierdere | Dacă `brut < 0`, `net = brut` (fără impozit) | **3** |
| C11 | „31 zile/lună" | Media reală 30,44 | Folosește 365/12 = 30,44 sau precizează | **4** |
| C12 | Dobândă 2% (Nu am bani) | Jos pentru 2025–2026 | Exemplifică cu 3–4% sau menționează intervalul | **4** |

---

### C. Status implementare (2026-11-13)

Toate cele 12 corecții au fost implementate și verificate (card `t_35151f97`, folder permanent).
Verificare: `node --test tests/` (29 teste) + browser real `file://` (desktop 1200px și mobil 390px),
cu valorile afectate recalculate independent în Python.

| # | Status | Unde e implementat | Valoare verificată |
|---|--------|--------------------|--------------------|
| C1 | ✅ gata | `app.js` — `computeNuAm` | `cheltuitCuCE = cheltuitFaraCE + profit` → 2.577,41 lei (cu CE) vs 2.570,00 (fără CE) |
| C2 | ✅ gata | `app.js` — `deflatorValue` | `y = an+1 … 2025`; 2001 → 1.131,93 lei; 2024 → 4.659,83 lei |
| C3 | ✅ gata | `index.html` + `app.js` — `IMPOZIT_TIPURI` | Select „Tipul de venit": dobândă 10%, dividende 10%, VM broker RO ≥1 an 1% etc. |
| C4 | ✅ gata | `data.js` | Seria INS (IPC național): 1991 = 170,2% (nu 230,62% WB) |
| C5 | ✅ gata | `app.js` + `index.html` — input „Zile lucrătoare / an" (`zileLucratoareAn()`, implicit 248); zilele lucrătoare pe lună se derivă din cele anuale | 248 ÷ 12 = **20,67** zile/lună (nu divizor fix 20). Validat financiar (card `t_b17ee9f2`): % dintr'un an lucrător = preț ÷ venit anual = **6,00% / 6,00%** pentru 5.000 / 3.600 lei |
| C6 | ✅ gata | `index.html` + tooltip `comisioane` | Comisioane implicite 0,3% (acțiuni RO); crypto/CFD menționat separat |
| C7 | ✅ gata | `data.js` | Cartofi 2025 = 2,49 lei (real INS, −11%) |
| C8 | ✅ gata | `app.js` — `computeCompusa` | `crestere = I(n)/I(n−1) − 1` → 5,79% la anul 20 (nu 41,5%) |
| C9 | ✅ gata | `app.js` — `computeCompusa` | `sumaInvestita = suma + 12 × contribuție × an` (lunară în ambele coloane) |
| C10 | ✅ gata | `app.js` — `computeProfit` | Dacă `brut < 0`, `net = brut` (pierderea nu se impozitează) |
| C11 | ✅ gata | `app.js` — `TIMP_ZILE_LUNA` | 365/12 = 30,44 zile/lună (nu 31) |
| C12 | ✅ gata | `index.html` + tooltip `nuam-rata` | Dobândă implicită 3,5%, cu intervalul real 3–4% menționat |

**Validare C5 (card `t_b17ee9f2`, 2026-11-13):** procentul „dintr'un an lucrător" = zilele lucrate ÷ zilele lucrătoare = **preț ÷ venit anual**, deci coincide cu procentul dintr'un an calendaristic (6,00% / 6,00% pentru 5.000 / 3.600 lei); valoarea 5,81% din starea intermediară era un artefact al inconsistenței divizorului lunar fix 20 (240 de zile lucrătoare implicite) față de denominatorul anual 248. Nuanță: 248 ÷ 12 = 20,67 e o medie anuală convențională (la fel ca 365 ÷ 12 = 30,44) — numărul real de zile lucrătoare variază pe lună în România 2025 (18 în ianuarie – 23 în iulie)[107], iar % dintr'un an lucrător nu mai depinde de input.

**Extinderi de date (A2/A3):** implementate — `data.js` conține 2025 = **7,3%** (media anuală IPC națională, INS)
și 2026 = **6,3%** (creștere YTD octombrie 2026 vs decembrie 2025, marcat `partial: true`).
2025 e folosit și în deflator (`AN_CURENT = 2025`); 2026 apare în serie/grafic/tabel, marcat cu `*`.

---

## D. Propuneri de concepte noi

Concepte din educația financiară pe care aplicația **nu le acoperă**, cu efort estimat.

| # | Concept | Ce ar adăuga | De ce e util | Efort |
|---|---------|--------------|--------------|:-----:|
| N1 | **Fond de urgență** (3–6 luni de cheltuieli) | Calculator: cât să acumulezi, unde îl ții (lichiditate), interacțiune cu dobânda | Primul pas obligatoriu în orice plan financiar; ajută la evaluarea riscului de lichiditate | Mic |
| N2 | **Buget personal (50/30/20)** | Venit → nevoi / dorințe / economii, cu indicatori și alertă | Transformă educația în acțiune concretă; conectează tabul „Timp vs dorințe" la planificare | Mediu |
| N3 | **Diversificare și riscul** | Volatilitate, corelație, drawdown, randament ajustat la risc; simulare portofeliu vs un singur activ | Răspunde la „e mai bine o acțiune sau mai multe?"; concept esențial lipsă | Mediu |
| N4 | **Dobândă vs inflație** (randament real) | Randament nominal − inflație, cu exemple istorice reale (2000–2025) | Arată de ce un depozit „sigur" poate fi negativ real; completează tabul „Randament" | Mic |
| N5 | **Costul oportunității** | Ce primești/ce pierzi când alegi o opțiune (să lași cash vs să investești) | Completează tabul „Nu am bani" cu contrapartida de investiție | Mic |
| N6 | **Pensie / Pilon III** | Contribuții, risc, randament pe 20–30 ani, taxe, comisioane ascunse | Orizontul lung, cel mai puternic exemplu de compunere; lipsește complet | Mediu |
| N7 | **Impozitare pe investiții** | Tabel cu rate reale (dobânzi, dividende, valori mobiliere, crypto, imobiliare) și cum se aplică | Înlocuiește premisa „10% / 2%"; e informație factuală, nu recomandare | Mediu |
| N8 | **Asigurări** | Prima de asigurare vs auto-asigurare, riscul pentru sănătate/casă/mașină, principiul transferului de risc | Lipsă totală; esențial pentru gestionarea riscului personal | Mediu |
| N9 | **Datorii bune vs rele** | Rata dobânzii, arbitrajul dintre datorie și economie, costul total al creditului | Răspunde la „merită să plătesc anticipat sau să economisesc?"; complementar taburilor de dobândă | Mediu |
| N10 | **Regula 72 / dublarea banilor** | Un calculator simplu: cât durează să dublezi la o rată dată | Intuitiv, motivațional, complementar tabului „Dobânda compusă" | Mic |
| N11 | **Cursul de schimb și riscul valutar** | Randament în RON vs EUR/USD, ce expunevaloarea reală | Relevant pentru investiții străine și pentru inflație importată | Mediu |
| N12 | **Scalarea în timp (DCA)** | Diferența dintre investirea o dată și cea periodică, volatilitate, cost mediu | Conectează tabul „Costul mediu de achiziție" la o strategie; foarte relevant | Mediu |
| N13 | **Sănătatea financiară / indicatori** | Rată de economii, datorii/venit, rezervă de 3–6 luni, net worth | O „imagine de ansamblu" personală, cu alarme; închide bucla dintre taburi | Mediu |
| N14 | **Biaseuri comportamentale** | Ancorare, cont mental, aversiune la pierdere, FOMO, efecțiul de cadru | Parte esențială a educației financiare; explică de ce calculele „grele" dau greș | Mediu |
| N15 | **Scenarii și vulnerabilitate (stress test)** | Ce se întâmplă dacă inflația e 10% sau randamentul −20%; buget și economii sub stres | Învață gândirea probabilistică, nu doar valoarea nominală | Mediu |

**Recomandare de implementare:** N1 + N4 + N10 (mic, impact mare) → N2 + N13 (mediu) → N3 + N6 (mediu, complex).

### D. Status implementare (2026-11-16)

**N1, N2, N3, N4, N5, N8, N10, N13 și N15 sunt implementate și verificate** (card `t_88a8e0a3` → v2.8,
card `t_41410e1b` → v2.9, card `t_dd0e718a` → v2.10, folder permanent):

| # | Unde e implementat | Valori verificate |
|---|--------------------|-------------------|
| N1 | tabul „Fond de urgență” — `computeFond`, `economieNecesara`, `timpPanaLaTinta` | 4.000 lei/lună × 6 luni = 24.000,00 lei; dobândă 840,00 brut / 756,00 net; economie necesară 3.970,93 lei/lună; 500 lei/lună → ~45 de luni |
| N2 | tabul „Buget 50/30/20” — `computeBuget` | 5.000 lei → ținte 2.500 / 1.500 / 1.000, toate la țintă; dorințe 6,20 zile lucrate (49,60 ore); 4.000 / 2.500 / 1.200 / 600 → deficit 300,00 lei, nevoi 62,50%, economii 15,00% (3 alarme); economii 6,00% → alarmă „bad” |
| N4 | tabul „Dobândă vs inflație” — `computeRandamentReal`, `computeIstoricReal` | randament real 7% vs 5% = 1,90% (Fisher); serie INS 2000–2025 (produs 8,65324); cash 10.000 lei → 1.155,64 real vs 6.711,19 la 7% nominal |
| N5 | tabul „Costul oportunității” — `computeOportunitate` | 10.000 lei / 10 ani / 7% / 1% / 0,3% / 5% → 19.504,85 nominal vs 10.000,00 cash; cost de oportunitate 5.835,15 lei |
| N10 | tabul „Regula 72” — `computeRegula72`, `computeDublareInAni` | 7% → 10,29 ani (regula 72) vs 10,24 ani (exact); 10 ani → 7,20% vs 7,18%; tabel/grafic pe rate 1–15% |
| N13 | tabul „Sănătate financiară” — `computeSanatate`, `stareRataEconomii`, `stareDatoriiVenit`, `stareRezerva`, `stareNetWorth` | implicit: rată de economii 20,00%, datorii 10,00%, rezervă 4,0 luni, net worth 25.000,00 lei (0,42 luni de venit), 4/4 „în regulă”; scenariu de risc: 7,50% / 45,00% / 0,8 luni / −23.000,00 lei, lipsa 5.500,00 lei, 0/4 |
| N3 | tabul „Diversificare și riscul” — `computeDiversificare`, `simuleazaDiversificare`, `cholesky`, `mulberry32` | implicit (acțiuni 8%/20% · 50%, obligațiuni 5%/6% · 30%, depozit 3,5%/0% · 20%, ρ=30%, rf 3,5%): randament 6,20%, volatilitate 10,68% (media ponderată 11,80%), randament ajustat la risc 0,25 vs 0,22; simulare 5.000×5 ani: mediană 13.247,56 lei, p5 9.238,02 lei, drawdown mediu 5,68% vs 16,53% |
| N8 | tabul „Asigurări” — `computeAsigurare`, `AS_PRESETS` | 2.000 lei primă / 20.000 lei asigurați / 8% / 10 ani / 3,5%: cost total primă 23.462,79 lei, pierdere așteptată 1.600,00 lei/an, diferență 400,00 lei, probabilitatea de cel puțin un eveniment 56,56% |
| N15 | tabul „Stress test” — `computeStres`, `ST_SCENARII`, `ST_SCEN_ACTIVE` | 5.000 / 2.500 / 1.000 / 10.000 / 20.000 lei, 12 luni, inflație 10%, venit −20%, active −20%: venit 4.000,00 lei, cheltuieli 2.750,00 lei, sold 1.250,00 lei, active 16.000,00 lei (pierdere 4.000,00 lei, revenire +25,00%), valoarea așteptată 19.500,00 lei |

Verificare: `node --test tests/` (82/82, din care 22 noi în `tests/concepte-3.test.mjs`) + browser real
`file://` (desktop 1200px și 390px), cu recalcul independent în Python
(`scratch/recalc-concepte2.py`, `scratch/recalc-concepte3.py`). Celelalte concepte (N6, N7, N9,
N11, N12, N14) rămân de implementat.

---

## Limitări ale verificării

1. **Prețurile alimentelor** nu sunt statistică oficială. INS publică **indici** pe categorii (pâine, lapte, ouă, cartofi etc.),
   nu prețuri per brand/lanț. Propunerile din A4 aplică variațiile INS la prețul 2024 din aplicație — sunt
   **propuneri metodologice**, nu valori „oficiale". Pentru precizie, Narcis poate sursa prețurile minime din studiile
   InfoCons[84][85] (9 lanțuri, București, actualizate lunar).
2. **2026** nu are încă media anuală. Propunerea 6,3% (YTD) e provizorie și va necesita revizuire la încheierea anului.
3. **Seria INS 2022–2024** (13,8 / 10,4 / 5,6%) a fost confirmată prin surse secundare; INS publică tabela completă în
   seria IPC annuală[71], pe care nu am putut extrage integral în format structurat (doar fragmente).
4. Am verificat **datele și formulele din aplicație**, nu am testat din nou interfața (a fost deja auditată în
   `AUDIT-UI-UX.md`). Nu am implementat nimic — doar raport și propuneri.
5. **Nu am folosit date personale / de portofoliu** — verificarea e strict pe datele educaționale din aplicație.

---

## Sources

[71] https://insse.ro/cms/en/content/cpi-annual-data-series
[72] https://en.wikipedia.org/wiki/Inflation_in_Romania
[73] https://agerpres.ro/economic/2026/01/14/rata-anuala-a-inflatiei-a-coborat-la-9-69-in-luna-decembrie--1518484
[74] https://www.radioromania.ro/economic/ins-in-2025-inflatia-anuala-a-fost-de-9-7-id142222.html
[75] https://agerpres.ro/economic/2026/11/12/rata-anuala-a-inflatiei-isi-continua-cresterea-si-ajunge-la-6-9-in-octombrie--1612494
[76] https://www.bursa.ro/ins-rata-anuala-a-inflatiei-a-urcat-la-6-9-procente-in-octombrie-2026-41810167
[77] https://www.economica.net/scumpirile-continua-inflatia-anuala-a-crescut-pana-la-7-iapc_994520.html
[78] https://euroref.dev/ro/cpi
[79] https://www.bnr.ro/uploads/2026-8raportasuprainflatieiaugust_documentpdf_545_1786610312.pdf
[80] https://www.bnr.ro/uploads/2026-09buletinlunar-iulie_documentpdf_545_1790762977.pdf
[81] https://www.bnr.ro/uploads/2026-05-19raportasuprainflatiei,mai2026_documentpdf_545_1779182662.pdf
[82] https://fred.stlouisfed.org/data/FPCPITOTLZGROU
[83] https://database.earth/economy/romania/inflation-consumer-prices-annual
[84] https://infocons.ro/studiu-comparativ-infocons-protectia-consumatorilor-cat-ne-costa-alimentele-de-baza-septembrie-2025-vs-septembrie-2026
[85] https://infocons.ro/asigura-te-ca-alegi-bine-cu-infocons-cat-ne-costa-alimentele-de-baza-in-luna-noiembrie-2025
[86] https://www.fanatik.ro/cum-s-au-modificat-preturile-in-supermarketuri-si-benzinarii-comparatie-31-iulie-versus-1-august-reportaj-foto-21241355
[87] https://business24.ro/inflatie/preturi-alimente-craciun-2025-comparatie-2024-2023-cozonaci-carne-porc-1639072
[88] https://www.romania-insider.com/business/romania-inflation-2025-ins
[89] https://www.goldring.ro/ro/news/inflatia-anuala-in-romania-a-ajuns-la-69-in-octombrie-2026
[90] https://www.radioconstanta.ro/2026/11/12/rata-anuala-a-inflatiei-a-urcat-in-octombrie-la-69
[91] https://www.ey.com/en_gl/technical/tax-alerts/romanian-tax-changes-introduced-by-new-fiscal-and-budgetary-measures
[92] https://taxsummaries.pwc.com/romania/individual/significant-developments
[93] https://taxefficiencylab.com/romania-tax-guide
[94] https://assets.kpmg.com/content/dam/kpmgsites/ro/pdf/2025/TNF_OUG_iulie_2025_final_EN.pdf.coredownload.inline.pdf
[95] https://www.openaccountants.com/skills/ro-employee-income-tax
[96] https://www.radioromania.ro/economic/ins-salariul-mediu-net-in-romania-a-crescut-anul-trecut-cu-307-lei-id221782.html
[97] https://www.profit.ro/stiri/economie/salariile-romanilor-au-crescut-in-ce-domenii-sunt-cele-mai-mari-salarii-22983037
[98] https://romania.workingdays.org/how_many_working_days_in_year_2025_Standard.htm
[99] https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Consumer_prices_-_inflation
[100] https://agerpres.ro/economic/2026/11/12/bnr-anticipeaza-o-crestere-usoara-a-inflatiei-la-finalul-anului-si-revenirea-in-intervalul-tintei-in--1612795
[102] https://www.libertatea.ro/stiri/rata-anuala-inflatie-romania-crescut-chiriile-motorina-cafeaua-s-au-schumpit-6m2gy98
[104] https://economedia.ro/breaking-anul-2025-s-a-incheiat-cu-o-rata-a-inflatiei-medii-anuale-de-73-fata-de-56-in-2024-in-decembrie-indicatorul-ajunsese-la-97-nivel-similar-cel-din-luna-precedenta.html
[105] https://www.bnr.ro/uploads/2025-6raportanual_documentpdf_545_1782459656.pdf
[106] https://www.wall-street.ro/articol/credite-si-depozite-bancare/depozite-bancare-decembrie-2025-cum-arata-poza-de-final-de-an.html
[107] https://calendarloom.com/ro-working-days-2025/
