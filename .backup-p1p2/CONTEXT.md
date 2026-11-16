# GlitchCoin — context proiect

> Fișier decontext, creat de Organizer la 2026-11-11 din conversația cu Narcis.
> Sursa de adevăr pentru starea proiectelor rămâne `~/.hermes/profiles/organizer/workspace/proiecte.md`.
> Ultima actualizare: 2026-11-12.

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
- **v2:** toate cele 9 taburi, **navigare cu taburi** (decizie Narcis 2026-11-11), share public la final.

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
| `t_f46e55cf` | P1+P2 — inputuri persistente + „Resetează tot" | ▶ ready |
| `t_6933630d` | P4 — accesibilitate | blocked |
| `t_a94f7b68` | P3 — tooltips accesibile pentru formule | blocked |
| `t_be0bf49d` | P5 — export/print | blocked |
| `t_c0d9bf06` | P6+P7 — grafice accesibile + robustete extreme | blocked |

## Următorul pas

P1+P2 (`t_f46e55cf`), apoi P4 → P3 → P5 → P6+P7. Publicarea (v2.5) e amânată.
