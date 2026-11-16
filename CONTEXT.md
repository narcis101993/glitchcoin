# GlitchCoin — context proiect

> Fișier de context, creat de Organizer la 2026-11-11 din conversația cu Narcis.
> Sursa de adevăr pentru starea proiectelor rămâne `~/.hermes/profiles/organizer/workspace/proiecte.md`.
> Ultima actualizare: 2026-11-13.

## Ce e GlitchCoin

Aplicație web de educație financiară, derivată dintr-un Excel de învățare.

## Surse pe disc (verificate 2026-11-11)

- **Excel sursă:** `/Users/narciscriveanu/Library/CloudStorage/OneDrive-Personal/Educatie financiara/GlitchCoin.xlsx` (24.09.2025) — **9 taburi**, dintre care unul ascuns:
  1. Inflație — simulator, prețuri alimente 2020–2025, deflator 1991–2025
  2. Timp vs dorințe
  3. Calculul dobânzii
  4. Dobânda compusă
  5. Randament
  6. Profit
  7. Costul mediu de achiziție
  8. Sumă dorită
  9. **„Nu am bani"** — tab ASCUNS (`state="hidden"`)
- **Snapshot web vechi:** `GlitchCoin - Aplicatie Financiara Completa.webarchive` (09.02.2026) — pagină goală care trimite către un sandbox `e2b.dev` deja mort. Codul aplicației **nu** e pe disc.
- **Nicio implementare existentă** pentru GlitchCoin în afară de acest fișier.

## Decizii confirmate de Narcis (2026-11-11)

- Proiect **separat** (nu face parte din „Excel education").
- **v1:** pentru Narcis, local, funcțional. Fără conturi/login, fără backend, fără date în cloud.
- **v1 conține doar tabul „Inflație"** — ales de Narcis ca prim tab.
- **Share public se face LA FINAL**, după ce aplicația conține toate taburile (v2+).
- **Date personale** (venituri, sume) **nu** ajung în aplicație — aplicația lucrează cu input de la utilizator.

## Stare

- **v1 (tabul Inflație): LIVE și testat** — build + testare finalizate 2026-11-11 (carduri `t_89156cf0`, `t_0b9c7a42`).
  Fișiere pe disc: `index.html`, `styles.css`, `data.js`, `app.js`, `README.md` (deschide cu dublu-click pe `index.html`).
  Verificare independentă: calculele reproduc Excelul (eroare maximă ~2e-12), pagina se deschide offline prin `file://`,
  zero erori JS la încărcare și la interacțiuni, fără overflow orizontal la 390px și 1200px.
- **v2.0 (schelet navigare cu taburi): LIVE și testat** — build + verificare finalizate 2026-11-11 (card `t_6c7f7921`).
  Bara de taburi cu cele 8 taburi (Inflație activ + 7 „în curând"), tabul 9 („Nu am bani") ascuns până la v2.4.
  Nav-ul cu ancore a rămas doar în tabul Inflație (subnav). Verificare: taburile „în curând" nu se deschid,
  v1 (Inflație) neschimbat, tastatură (săgeți + Home/End), fără overflow la 390px, zero erori JS, ARIA valid.
- **v2.1 (Timp vs dorințe + Calculul dobânzii): LIVE și testat** — build + verificare finalizate 2026-11-11 (card `t_e9220d69`).
  Ambele taburi construite după formulele din Excel. Valori implicite: venit 5.000 / dorință 3.600 → 32.141 minute,
  536 ore, 22 zile, 115 ore lucrate, 14 zile lucrate, 6,12% / 5,52%; dobândă 15.000 / 7% / 184 zile / 10% →
  brut 529,32, net 476,39. Verificare: browser file:// desktop + 390px, tastatură, cazuri extreme (venit 0),
  taburile „în curând" încă disabled, fără overflow, fără erori JS, ARIA valid.
- **v2.2 (Dobânda compusă + Randament): LIVE și testat** — build + verificare finalizate 2026-11-12 (card `t_f5b5cfc7`).
  Ambele taburi construite după formulele din Excel. Valori implicite: 10.000 lei / 200 lei lunar / 2,50% →
  anul 1 = 10.250,00 lei, anul 2 = 10.506,25 lei, anul 20 = 16.386,14 lei (fără contribuție) și
  78.673,58 lei cu contribuție (58.000,00 lei investiți); randament 10.000 lei / 7% / 10% / 2% / 5% →
  brut 700,00 lei (7,00%), net 616,00 lei (6,16%), real 110,48 lei (1,10%).
  Verificare: 168/168 valori comparate cu Excelul (node), browser file:// desktop 1200px + mobil 390px,
  tastatură, cazuri extreme (sumă 0, rată 0, deflație), taburile „în curând" încă disabled,
  fără overflow, fără erori JS, ARIA valid, zero apeluri de rețea / stocare locală.
- **v2.3 (Profit + Costul mediu de achiziție): LIVE și testat** — build + verificare finalizate 2026-11-12 (card `t_0d7052b4`).
  Ambele taburi construite după formulele din Excel. Profit: 10.000 lei / 25 / 28 / 10% / 2% / 5% →
  valoarea finală 11.200,00 lei, profit brut 1.200,00 lei, profit net 1.056,00 lei, randament real 5,30%
  (profit real 529,52 lei). Costul mediu: tabel dinamic (preț, cantitate, comision) cu adăugare/ștergere
  rânduri și reset; (28,81×24), (27,75×144), (32,89×4), (34,40×30) cu comision 2% → 29,5447 lei
  pentru 202 de unități (5.851,00 + 117,02 = 5.968,02 lei).
  Verificare: node 19/19 (inclusiv 14.000 + 2.000 de comparații aleatorii cu formulele Excel),
  browser file:// desktop 1200px + mobil 390px, tabel dinamic (editare, adăugare, ștergere, reset,
  păstrarea focalizării), tastatură, cazuri extreme (preț inițial 0, sumă 0, cantitate 0, pierdere),
  tabul „Sumă dorită" încă disabled, fără overflow, zero erori JS, ARIA valid,
  zero apeluri de rețea / stocare locală.
- **v2.4 (Sumă dorită + „Nu am bani"): LIVE și testat** — build + verificare finalizate 2026-11-12 (card `t_92ef3881`).
  Sumă dorită: 10% / 15 ani / 0 / 1.000.000 lei → 2.412,72 lei/lună (434.289,21 economisiți + 565.710,79 din dobândă).
  „Nu am bani" (tab ascuns din Excel): venit 5.000 / ziua 10 / inflație 5% / economii 5.000 / dobândă 2% →
  2.570,00 lei fără CE, 2.565,77 lei cu CE, profit 4,23 lei (0,08%); tabel de facturi dinamic,
  desfășurator zilnic, scenarii pe 1 an și 10 ani.
  Verificare: Python vs app.js vs Excel (toate valorile și cele 21 de zile coincidence, dif < 1e-9),
  node 5.000+ cazuri aleatorii, browser file:// desktop 1200px/1440px + mobil 390px, tastatură,
  cazuri extreme, zero erori JS, ARIA valid, zero apeluri de rețea / stocare locală.
  Bara de taburi a fost lărgită (max-width 1220px, padding 12px) ca toate cele 9 taburi să fie
  vizibile și pe ecrane mari, fără derulare. Coloana „Cât din țintă e acumulat" arată cât din
  țintă e acumulat (3,03% → 100,00%), iar numele facturilor are min-width 240px ca să nu se
  truncate pe ecran mic.
- **v3 (UI modern + dark mode): LIVE și testat** — build + verificare finalizate 2026-11-12 (card `t_7eba600f`).
  Temă întunecată completă (toate suprafețele, tabele, inputuri, chip-uri, hero, grafice), comutator
  soare/lună în header cu salvare în `localStorage`, respectarea `prefers-color-scheme` la prima
  vizită, contrast WCAG AA în ambele teme (verificat pe 24 de perechi de text). Bară de taburi
  segmented/pill cu indicator clar al activului și indiciu de derulare doar când există overflow;
  paletă rafinată cu culori consistente pozitiv/negativ/atenție (valori colorate după semn);
  tipografie cu scară și spațiere; carduri cu umbre fine, borduri subțiri, colțuri rotunjite;
  stat carduri cu etichetă + valoare + subtitlu (40 de carduri); micro-interacțiuni (hover,
  focus vizibil, tranziții discrete, `prefers-reduced-motion`); responsive îmbunătățit;
  favicon SVG + PNG și titlu coerent. Verificare: browser `file://` și `http://`
  (desktop 1200px + mobil 390px), ambele teme, comutator + persistență, `prefers-color-scheme`,
  tastatură, zero erori JS, zero resurse externe, toate cele 9 taburi funcționale cu calculele
  neschimbate (valorile cheie comparate cu Excelul).
- **v2.6 (corecții financiare C1–C12 + date 2025/2026): LIVE și testat** — implementate 2026-11-13
  (card `t_35151f97`, folder permanent). C1 semnul dobânzii în „Nu am bani" (cu CE = 2.577,41 lei);
  C2 deflator fără off-by-one (2001 → 1.131,93 lei); C3 impozit pe tipuri de venit (select în Randament/Profit);
  C4 seria INS (1991 = 170,2%); C5 248 zile lucrătoare; C6 comisioane 0,3%; C7 cartofi 2025 = 2,49 lei;
  C8 creștere anuală reală (5,79%); C9 contribuție lunară consistentă; C10 pierderea nu se impozitează;
  C11 30,44 zile/lună; C12 dobândă 3,5% (interval 3–4%). Data: 2025 = 7,3% (INS), 2026 = 6,3% (parțial).
  Verificare: `node --test tests/` (28 teste) + browser `file://` (1200px și 390px), valori recalculate în Python.
- **v2.7 (C5 parametrizat: zile lucrătoare ca input): LIVE și testat** — implementat 2026-11-13
  (card `t_5ce2d4f5`, folder permanent). În tabul „Timp vs dorințe" a apărut inputul
  „Zile lucrătoare / an" (implicit **248**, notă „România 2025", tooltip cu explicație și surse),
  care înlocuiește constanta `TIMP_ZILE_LUCRATOARE_AN`. Zilele lucrătoare pe lună se derivă din cele
  anuale (248/12 = 20,67), la fel ca zilele calendaristice (365/12 = 30,44) — divisorul fix de 20
  nu era consistent cu 248/an. Valoarea se salvează în `localStorage`
  (`glitchcoin-input:timp-zile-lucratore`) și „Resetează tot" o readuce la 248.
  **Urmărire de conștientizat:** `% dintr-un an lucrător` devine `preț ÷ venit anual` și coincide cu
  `% dintr-un an calendaristic` (orice fracțiune de an = cost/venit anual); valoarea anterioară de
  5,81% era un artefact al inconsistenței 20 vs 248. Valori implicite: 241,94 lei/zi lucrătoare,
  119 ore / 15 zile lucrate, 6,00% / 6,00%.
  Verificare: `node --test tests/` (29 teste) + browser `file://` (1200px și 390px), schimbarea
  inputului schimbă rezultatele, valoarea persistă la refresh, zero erori JS, zero resurse externe.
- **v2.8 (concepte noi 1): LIVE și testat** — implementat 2026-11-15
  (card `t_88a8e0a3`, folder permanent). Patru taburi noi la finalul barei: „Dobândă vs inflație”
  (N4 — randament real Fisher + serie istorică INS 2000–2025 + cash vs investiție pe 26 de ani),
  „Regula 72” (N10 — dublarea la o rată dată, invers pe ani, grafic + tabel pe rate 1–15%),
  „Fond de urgență” (N1 — țintă 3–6 luni, dobândă brută/netă, economie lunară necesară, timp până
  la țintă, tabel „unde îl ții”), „Costul oportunității” (N5 — cash vs investiție, randament net
  compus, putere de cumpărare, cost de oportunitate).
  Verificare: `node --test tests/` (44 teste, din care 15 noi) + browser real `file://` (desktop și
  390px, toate cele 13 taburi, 39 de valori comparate cu recalcul Python, zero erori JS, zero overflow,
  localStorage + „Resetează tot” funcționale, tooltip-uri accesibile, tastatură în taburi).
- **v2.9 (concepte noi 2): LIVE și testat** — implementat 2026-11-15
  (card `t_41410e1b`, folder permanent). Două taburi noi la finalul barei: „Buget 50/30/20”
  (N2 — venit → nevoi/dorințe/economii, ținte 50/30/20, abateri, alarmele bugetului, dorințele
  în zile și ore lucrate, legături bidirecționale cu „Timp vs dorințe”) și „Sănătate financiară”
  (N13 — rată de economii, datorii/venit, rezervă 3–6 luni, net worth, praguri și alarme, imagine
  de ansamblu, legături cu „Fond de urgență” și „Buget 50/30/20”).
  Verificare: `node --test tests/` (60 teste, din care 16 noi) + browser real `file://` (desktop și
  390px, toate cele 15 taburi, zero erori JS, zero overflow, localStorage + „Resetează tot”
  funcționale, 97 de tooltip-uri accesibile, tastatură în taburi, cele 5 legături între taburi,
  export CSV pentru taburile noi).
- **v2.10 (concepte noi 3): LIVE și testat** — implementat 2026-11-16
  (card `t_dd0e718a`, folder permanent). Trei taburi noi la finalul barei: „Diversificare și
  riscul” (N3 — portofoliu cu active configurabile, randament/volatilitate/corelație, randament
  ajustat la risc, simulare Monte Carlo 5.000×5 ani cu seed fix, scenarii −3σ…+3σ, tabel
  comparativ portofoliu vs activul cu randamentul maxim), „Asigurări” (N8 — primă vs
  auto-asigurare, cost total cu dobândă, pierdere așteptată, probabilitatea de cel puțin un
  eveniment, tabel comparativ, trei riscuri ilustrative: sănătate/casă/mașină) și „Stress test”
  (N15 — buget sub stres, active sub stres, randament de revenire, trei scenarii + valoarea
  așteptată, scenarii predefinite). Plus 5 legături noi între taburi (Diversificare → Randament,
  Stress test → Buget/Sănătate, Buget/Sănătate → Stress test).
  Verificare: `node --test tests/` (82 teste, din care 22 noi în `tests/concepte-3.test.mjs`) +
  browser real `file://` (desktop 1200px și 390px, toate cele 18 taburi, zero erori JS, zero
  overflow, localStorage + „Resetează tot” funcționale, 134 de tooltip-uri cu `aria-describedby`
  valid, tastatură în taburi, cele 5 legături noi cu prefill, export CSV, tabel dinamic de
  active, valori recalculate independent în Python — `scratch/recalc-concepte3.py`).
- **v2.11 (concepte noi 4): LIVE și testat** — implementat 2026-11-16
  (card `t_fb5f36fc`, folder permanent). Două taburi noi la finalul barei: „Pensie / Pilon III”
  (N6 — contribuție lunară, orizont 20–30 de ani, randament brut vs costul comisioanelor,
  impozit doar pe câștig, valoare reală, tabel evolutie pe ani, scenarii Istoric/Conservator/
  Optimist) și „Impozitare pe investiții” (N7 — tabel cu rate reale 2025→2026 pentru dobânzi,
  dividende, valori mobiliare, broker străin/crypto, imobiliare, chiriile și pensia privată,
  cu baza de impozitare, „cum se aplică” și linkuri către surse, plus un calculator cu
  comparator 2025 ↔ 2026). Plus 4 legături noi între taburi (Pensie → Sumă dorită,
  Randament/Profit → Impozitare, Impozitare → Randament).
  Verificare: `node --test tests/` (104 teste, din care 23 noi în `tests/concepte-4.test.mjs`,
  inclusiv un test „smoke” care rulează renderer-el în Node) + browser real `file://`
  (desktop 1200px și 390px, toate cele 20 taburi, zero erori JS, zero overflow, localStorage
  + „Resetează tot” funcționale, 161 de tooltip-uri cu `aria-describedby` valid, tastatură
  în taburi, legăturile cu prefill, export CSV pentru taburile noi, valori recalculate
  independent în Python — `scratch/recalc-concepte4.py`).
- **v2.12 (concepte noi 5): LIVE și testat** — implementat 2026-11-16
  (card `t_72fafaff`, folder permanent). Două taburi noi la finalul barei: „Datorii bune vs rele”
  (N9 — rata lunară a anuității, costul total al creditului, dobânda economisită prin anticipare
  vs câștigul net din economisire, prag de indiferență, arbitraj, tabel evoluție pe ani și
  clasificare datorii bune/rele) și „Scalarea în timp (DCA)” (N12 — patru căi deterministe ale
  prețului, costul mediu de achiziție vs prețul mediu, comparație DCA vs investire o dată, tabel
  evoluție lunară). Plus 4 legături noi între taburi (Datorii → Costul oportunității,
  Dobânda vs inflație → Datorii, Costul mediu ↔ DCA).
  Verificare: `node --test tests/` (126 teste, din care 22 noi în `tests/concepte-5.test.mjs`,
  inclusiv test „smoke”) + browser real `file://` (desktop 1200px și 390px, toate cele 22 de
  taburi, zero erori JS, zero overflow, localStorage + „Resetează tot” funcționale, 191 de
  tooltip-uri cu `aria-describedby` valid, tastatură în taburi, legăturile cu prefill, export CSV
  pentru taburile noi, valori recalculate independent în Python —
  `scratch/recalc-concepte5.py`).
- **v2.13 (concepte noi 6): LIVE și testat** — implementat 2026-11-16
  (card `t_3917ffbb`, folder permanent). Două taburi noi la finalul barei: „Curs de schimb”
  (N11 — randament în valută vs randament în RON, compunerea cu aprecierea cursului, randament
  real după inflație, impozit pe câștig, inflația importată pentru un coș de bunuri, tabel
  evoluție pe ani) și „Biaseuri comportamentale” (N14 — ancorarea, contul mental, aversiunea la
  pierdere, FOMO și efectul de cadru, cu semne și antidoturi, un test rapid de cinci întrebări
  cu scor și tabel de referință). Plus 2 legături noi între taburi (Dobânda vs inflație → Curs
  de schimb, Curs de schimb → Costul oportunității).
  Verificare: `node --test tests/` (145 teste, din care 19 noi în `tests/concepte-6.test.mjs`,
  inclusiv test „smoke”) + browser real `file://` (desktop 1200px și 390px, toate cele 24 de
  taburi, zero erori JS, zero overflow, localStorage + „Resetează tot” funcționale, tooltip-uri
  cu `aria-describedby` valid, tastatură în taburi, legăturile cu prefill, export CSV pentru
  taburile noi, valori recalculate independent în Python — `scratch/recalc-concepte6.py`).
- **v2:** toate cele 24 de taburi, **navigare cu taburi** (decizie Narcis 2026-11-11), share public la final.

## Carduri Kanban (board `glitchcoin`)

### v1 (închis)

| ID | Titlu | Status |
|----|-------|--------|
| `t_79017b45` | Plan v1 — scope și decizii | done |
| `t_31e8f68a` | Alegere taburi v1 (Inflație) | done |
| `t_89156cf0` | Build MVP v1 | done |
| `t_0b9c7a42` | Testare și livrare v1 | done |

### v2 (plan, toate blocked, în lanț)

Taburi rămase de convertit (8): Timp vs dorințe, Calculul dobânzii, Dobânda compusă, Randament, Profit,
Costul mediu de achiziție, Sumă dorită, **Nu am bani** (ascuns).

| ID | Titlu | Conținut | Status |
|----|-------|----------|--------|
| `t_6c7f7921` | v2.0 — Schelet navigare cu taburi | bară de taburi în loc de ancore; cele 9 taburi | ✓ done |
| `t_e9220d69` | v2.1 — Timp vs dorințe + Calculul dobânzii | | ✓ done |
| `t_f5b5cfc7` | v2.2 — Dobânda compusă + Randament | | ✓ done |
| `t_0d7052b4` | v2.3 — Profit + Costul mediu de achiziție | tabel dinamic pentru costul mediu | ✓ done |
| `t_92ef3881` | v2.4 — Sumă dorită + Nu am bani (ascuns) | cel mai complex (flux de numerar pe zile) | ✓ done |
| `t_c175a2f8` | v2.5 — Share public: GitHub Pages | doar după cele 9 taburi | ⊘ blocked — AMÂNAT de Narcis (după îmbunătățirile UI) |

Lanț: v2.0 → v2.1 → v2.2 → v2.3 → v2.4 → v2.5. Toate cele 9 taburi sunt gata (v2.4 done).
v2.5 e blocat la decizia lui Narcis: publicarea se amână până după ce îmbunătățim aplicația.

### Îmbunătățiri UI (2026-11-12)

| ID | Titlu | Status |
|----|-------|--------|
| `t_7eba600f` | GlitchCoin — UI modern + dark mode | ✓ done |
| `t_e93e651c` | GlitchCoin — audit UI/UX + propuneri | ✓ done — raport `AUDIT-UI-UX.md` |

Auditul a dat 5 grupuri de probleme (A1–A5) și 7 propuneri (P1–P7), cu evaluarea propunerilor
organizer-ului (13–17). Ordine recomandată: **P1+P2 → P4 → P3 → P5** (+P6+P7).

Carduri de implementare (în lanț, dev, folder permanent):

| ID | Titlu | Status |
|----|-------|--------|
| `t_f46e55cf` | P1+P2 — inputuri persistente + „Resetează tot" | ✓ done |
| `t_6933630d` | P4 — accesibilitate | ✓ done |
| `t_a94f7b68` | P3 — tooltips accesibile pentru formule | ✓ done |
| `t_be0bf49d` | P5 — export/print | ✓ done |
| `t_c0d9bf06` | P6+P7 — grafice accesibile + robustete extreme | ✓ done (verificat de organizer după crash) |

P5 (print/CSV) — `@media print`: doar panoul activ, fără tab bar/hero/subnav/tooltip-uri/grafice/butoane;
tabele pe lățime completă, text care se rupe în loc să fie tăiat, antet de coloană repetat, culori deschise
indiferent de temă. Buton „Descarcă CSV": delimitator `;`, BOM UTF-8, virgulă zecimală pentru inputurile dinamice.
Verificare: 9 PDF-uri A4 pe disc (1–5 pagini/tab, înainte 104), 43/43 test statice, browser file://
(print emulation + CSV end-to-end), dark mode tipărit ca deschis, zero erori JS.

Card separat, independent (nu modifică aplicația, doar raport):

| ID | Titlu | Assignee | Status |
|----|-------|----------|--------|
| `t_5fe146bc` | GlitchCoin — verificare financiară (date + formule + concepte noi; include 2025 complet + 2026) | finance | ✓ done — raport `REVIEW-FINANCIAR.md` |

Raportul financiar: 8 probleme, 12 corecții (C1–C12), 15 concepte noi (N1–N15). **Narcis a aprobat
toate corecțiile și toate conceptele noi (2026-11-12).**

### Corecții + concepte (aprobate, în lanț)

| ID | Titlu | Status |
|----|-------|--------|
| `t_b3026530` | Corecții financiare C1–C12 + date 2025/2026 | ✓ done (implementat de run concurent; verificat de `t_35151f97`) |
| `t_35151f97` | Implementare corecții C1–C12 (workspace permanent) | ✓ done — verificare + documentație |
| `t_88a8e0a3` | Concepte noi 1: fond de urgență · dobândă vs inflație · costul oportunității · regula 72 | ✓ done (implementat și verificat de dev, 2026-11-15) |
| `t_41410e1b` | Concepte noi 2: buget personal 50/30/20 · sănătatea financiară | blocked |
| `t_dd0e718a` | Concepte noi 3: diversificare și riscul · asigurări · stress test | ✓ done (2026-11-16) |
| `t_fb5f36fc` | Concepte noi 4: pensie / Pilon III · impozitare pe investiții | blocked |
| `t_72fafaff` | Concepte noi 5: datorii bune vs rele · DCA | ✓ done (2026-11-16) |
| `t_3917ffbb` | Concepte noi 6: curs de schimb / riscul valutar · biaseuri comportamentale | blocked |
| `t_5ce2d4f5` | C5: zile lucrătoare ca input (parametrizare) — cerință Narcis | ✓ done (independent) |

Lanț: corecții → concepte 1 → 2 → 3 → 4 → 5 → 6. Cardul `t_5ce2d4f5` e **independent** (nu e în lanț).
Decizii Narcis: sursele se menționează cu linkuri (INS/BNR); 2025 = 7,3% (INS); 2026 = 6,3% provizoriu;
248 zile lucrătoare (acum ca **input**); comisioane = media pieței + tooltip cu linkuri.

## Verificare corecții (organizer, 2026-11-13)

Toate C1–C12 implementate și verificate pe disc: C1 (semn), C2 (deflator), C3 (selector „Tipul de venit"
funcțional: dobândă 10% / vm-ro 1% / vm-ro-scurt 3%), C4 (INS + linkuri), C5 (248), C6 (comisioane 0,3% +
tooltip cu linkuri), C7 (cartofi 2,49), C8 (creștere reală), C9 (contrib. lunară), C10 (fără impozit pe pierderi),
C11 (30,44), C12 (3,5%). Sursa: secțiunea „Surse" în tabul Inflație.

## Următorul pas

Conceptele noi 1, 2 și 3 sunt gata și verificate pe disc (`t_88a8e0a3`, `t_41410e1b`,
`t_dd0e718a`, 2026-11-15/16). Următoarele concepte din `REVIEW-FINANCIAR.md` (secțiunea D) rămân
de implementat: N6 pensie/Pilon III, N7 impozitare, N9 datorii bune vs rele, N11 curs valutar,
N12 DCA, N14 biaseuri. Publicarea (v2.5) e amânată.

## Verificare concepte noi 1 (dev, 2026-11-15)

Patru taburi noi implementate în folderul permanent și verificate pe disc: `node --test tests/`
(44/44, din care 15 noi în `tests/concepte-1.test.mjs`), 39 de valori afișate comparate cu
recalcul independent în Python (produs inflație 2000–2025 = 8,65324; randament real 7% vs 5%
= 1,90%; cost de oportunitate 5.835,15 lei; regula 72 la 7% = 10,29 vs 10,24 ani; fond 24.000 lei,
economie necesară 3.970,93 lei/lună, timp 45 de luni), browser real `file://` desktop + 390px
(zero erori JS, fără overflow, localStorage și „Resetează tot” funcționale, tooltip-uri accesibile,
tastatură în taburi).

**Notă organizator:** cardul `t_b3026530` (cardul original din lanț) a rămas `running` și a rulat
concurent cu `t_35151f97` în același folder — implementarea a fost făcută de run-ul concurent,
iar `t_35151f97` a verificat și a documentat. Se recomandă închiderea unuia dintre cele două carduri
(duplicat de scope) pentru a evita scrierea simultană în aceleași fișiere.

## Verificare concepte noi 2 (dev, 2026-11-15)

Două taburi noi implementate în folderul permanent și verificate pe disc: `node --test tests/`
(60/60, din care 16 noi în `tests/concepte-2.test.mjs`), valori recalculate independent în Python
(`scratch/recalc-concepte2.py` — 5.000/2.500/1.500/1.000 → toate la țintă, dorințele 6,20 zile
lucrate; 4.000/2.500/1.200/600 → deficit 300,00 lei, nevoi 62,50%, economii 15,00%; sănătate
implicită → rezerva 4,0 luni, net worth 25.000,00 lei; scenariul de risc → net worth −23.000,00 lei,
lipsa 5.500,00 lei), browser real `file://` desktop 1200px + 390px (toate cele 15 taburi, zero erori
JS, zero overflow orizontal, localStorage și „Resetează tot” funcționale, 97 de tooltip-uri cu
`aria-describedby` valid, deschidere/inchidere tooltip cu click + Escape, tastatură în taburi,
cele 5 legături între taburi cu prefill, export CSV pentru taburile noi).

## Verificare concepte noi 3 (dev, 2026-11-16)

Trei taburi noi implementate în folderul permanent și verificate pe disc: `node --test tests/`
(82/82, din care 22 noi în `tests/concepte-3.test.mjs`), valori recalculate independent în Python
(`scratch/recalc-concepte3.py` — replică exact `mulberry32` + Box-Muller + Cholesky, deci și
simularea Monte Carlo se verifică la zecimale: mediană portofoliu 13.247,56 lei, p5 9.238,02 lei,
drawdown mediu 5,68% vs 16,53% la acțiuni; N8 cost total primă 23.462,79 lei, pierdere așteptată
1.600,00 lei/an; N15 venit 4.000,00 lei, cheltuieli 2.750,00 lei, active 16.000,00 lei,
valoarea așteptată 19.500,00 lei), browser real `file://` desktop 1200px + 390px (toate cele 18
taburi, zero erori JS, zero overflow orizontal, localStorage și „Resetează tot” funcționale, 134
de tooltip-uri cu `aria-describedby` valid, tastatură în taburi, cele 5 legături noi cu prefill,
export CSV, tabel dinamic de active cu adăugare/ștergere/reset, presetele de scenarii și de
risc).

## Redesign complet (2026-11-16, aprobat de Narcis)

Propunerile: `REDESIGN-PROPUNERE.md` (dev) + `CONTINUT-PROPUNERE.md` (finance). Implementare în 7 etape, în lanț:

| Etapă | Card | Ce face |
|-------|------|---------|
| 0 | `t_d38b22bf` | siguranță: backup + `git init` + branch `redesign` |
| 1 | `t_11078e9b` | fundația vizuală: 6 categorii, „Acasă", back-to-top |
| 2 | `t_33ef5406` | navigare: breadcrumb, `⌘K`, hash cu fallback |
| 3 | `t_f747b29e` | interactivitate: pas cu pas (cu banner), alerte, copiere, animații |
| 4 | `t_ae179204` | conținut: 24 lead-uri, glosar, FAQ, mituri, disclaimer |
| 5 | `t_9dd90cca` | identitate: favicon/titlu/meta, eliminarea Excelului, README |
| 6 | `t_9461f4a6` | verificare + livrare; apoi publicarea (`t_c175a2f8`) |

Decizii Narcis: 6 categorii · prima deschidere „Acasă" · paletă verde „registru" · font Inter · interactivitate
completă · pas cu pas cu banner · toate cele 3 secțiuni globale în sidebar · disclaimer profesional
(nu oferăm sfaturi financiare; proiect educațional) · publicare după ce aplicația e utilizabilă.
