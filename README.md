# GlitchCoin — Educație financiară

Aplicație web de educație financiară, cu 24 de calculatoare grupate în 6 categorii.
HTML + CSS + JavaScript static, **fără backend**, fără conturi, fără date personale.

## Cum deschizi

1. **Dublu-click pe `index.html`** — se deschide în browserul implicit (Safari/Chrome), direct din folder.
2. Sau, din Terminal:
   ```bash
   open "index.html"
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

## Inputurile se rețin (localStorage)

- **Toate inputurile se salvează automat**, cu un mic debounce (~300 ms), ca să nu se scrie
  la fiecare tastă. Cheile sunt de forma `glitchcoin-input:<id>` (ex. `glitchcoin-input:timp-venit`).
- **La reîncărcare**, valorile introduse anterior reapar; ce lipsește revine la valorile implicite
  din HTML.
- **Tabelele dinamice** (Costul mediu de achiziție, „Nu am bani") și **tabul deschis** se rețin la fel.
- **„Resetează tot”** (header, din dreapta) aduce toate cele 24 de taburi la valorile implicite:
  inputuri statice, selectul Deflator (2001) și selectul „Tipul de venit”, tabelele dinamice —
  și șterge preferințele salvate, ca la o pagină nouă.
- **„Resetează tot” NU șterge scenariile A/B** (decizie deliberată): snapshoturile au prefixul
  separat `glitchcoin-scenario:` și sunt șterse doar prin butonul „Șterge scenariile” din panou.
  Motivul: scenariile sunt comparații salvate explicit de tine, nu preferințe de sesiune.
- Funcționalitatea are `try/catch` pe tot parcursul: dacă `localStorage` e blocat, aplicația funcționează
  oricum, doar nu reține valorile între deschideri (verificat cu stocarea blocată în browser).

## Scenarii A/B (salvate local)

Disponibil în 6 taburi nucleu: **Inflație, Timp vs dorințe, Dobândă, Dobândă compusă, Randament, Buget**.
În panou, sub rezumat, găsești patru butoane mici: **Salvează A**, **Salvează B**,
**Arată comparația**, **Șterge scenariile**.

- **Salvează A / B** face un *snapshot* cu toate inputurile/selecturile panoului **și** textul
  rezumatului afișat în acel moment. Fișierul e stocat local (`glitchcoin-scenario:A` / `:B`);
  nu se trimite nimic pe rețea, nu e nevoie de cont.
- **Arată comparația** afișează un tabel cu **doar câmpurile care diferă** între A și B, plus
  rezultatele (summary-urile) ambelor scenarii. Dacă ambele scenarii sunt identice, tabelul
  spune explicit „Nicio diferență”. Cheile A/B sunt globale, dar snapshotul reține panoul:
  comparația se arată doar când A și B sunt salvate în același tab.
- **Șterge scenariile** șterge explicit ambele chei. „Resetează tot” nu le atinge (vezi mai sus).
- Tastatură: butoanele sunt `<button>` nativ, deci se ajunge la ele cu Tab și se activează
  cu Enter/Spațiu; tabelul are `<caption>` și anteturi cu `scope="col"` / `scope="row"`.
- Dacă `localStorage` e blocat, butoanele afișează un mesaj și aplicația merge mai departe.

> Pentru a adăuga scenarii într-un tab nou, e suficient un singur element în HTML:
> `<div class="ab-widget" data-ab-panel="id-tab"></div>`. Componentul din `app.js`
> (`initScenarii`) îl găsește și montează widgetul automat — nu se scrie cod per tab.

## Navigare: sidebar pe categorii

Cele 24 de taburi sunt grupate în **6 categorii** în sidebar (260 px, sticky), nu mai stau într-un rând
orizontal. Categoriile sunt pliabile; categoria tabului activ se deschide singură. Lista de mai jos
păstrează ordinea istorică de adăugare (cu versiunea care a adus fiecare tab):

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
| 9 | „Nu am bani” | **gata** (v2.4, scenariu avansat) |
| 10 | Dobânda vs inflație | **gata** (v2.8, concept N4) |
| 11 | Regula 72 | **gata** (v2.8, concept N10) |
| 12 | Fond de urgență | **gata** (v2.8, concept N1) |
| 13 | Costul oportunității | **gata** (v2.8, concept N5) |
| 14 | Buget 50/30/20 | **gata** (v2.9, concept N2) |
| 15 | Sănătate financiară | **gata** (v2.9, concept N13) |
| 16 | Diversificare și riscul | **gata** (v2.10, concept N3) |
| 17 | Asigurări | **gata** (v2.10, concept N8) |
| 18 | Stress test | **gata** (v2.10, concept N15) |
| 19 | Pensie / Pilon III | **gata** (v2.11, concept N6) |
| 20 | Impozitare pe investiții | **gata** (v2.11, concept N7) |
| 21 | Datorii bune vs rele | **gata** (v2.12, concept N9) |
| 22 | Scalarea în timp (DCA) | **gata** (v2.12, concept N12) |
| 23 | Curs de schimb | **gata** (v2.13, concept N11) |
| 24 | Biaseuri comportamentale | **gata** (v2.13, concept N14) |

Toate cele 24 de taburi se deschid. Se poate naviga și din tastatură (săgeți stânga/dreapta, Home, End).

**Navigare pe categorii:**

- **Breadcrumb** `Acasă › Categorie › Tab`, clickabil — categoria duce la primul ei tab.
- **Căutare rapidă `⌘K`** (sau `Ctrl+K`): pornește din butonul „Caută” din header; filtrează după nume
  sau categorie, cu diacritice ignorate; `↑`/`↓` selectează, `Enter` deschide, `Esc` închide.
- **Săgeți Precedent/Următor** sub panou, cu numele tabului de destinație; se mișcă în categorie,
  iar la capăt trec o singură categorie mai departe (cu wrap).
- **Hash** `#categorie/tab` (ex. `#investitii/randament`) — **retro-compatibil** cu `#tab`
  (ex. `#randament`) și cu `#acasa`; forma veche se normalizează automat.
- **Badge de categorie** în fiecare panou (iconiță + nume + număr de taburi).

**Categoriile din sidebar:**

| Categorie | Taburi | Întrebarea pe care o răspunde |
|---|--:|---|
| Fundamentele banilor | 5 | Ce se întâmplă cu valoarea banilor în timp? |
| Bugetul de zi cu zi | 5 | Cum-ți organizezi ce câștigi și ce cheltuiești lunar? |
| Investiții | 7 | Cum câștig și cum intri în piață? |
| Risc și protecție | 4 | Ce se întâmplă dacă eșuează? |
| Impozite și viitor | 2 | Ce plătești și ce acumulezi pe termen foarte lung? |
| Psihologia banilor | 1 | De ce iau decizii proaste cu banii? |

Prima deschidere e **„Acasă"** (6 carduri de categorii + 3 simulatoare rapide). Dacă ai deschis un tab
anterior, se deschide tabul respectiv. Pe mobil (< 1024 px) sidebar-ul devine **drawer** (buton
hamburger, `Esc` închide, focus trap). Breadcrumb-ul `Acasă › Categorie › Tab` e clickabil. Un toggle
**Concentrare** din header ascunde sidebar-ul și lățește panoul la 720 px (scurtătură `F`).

**Legături între taburi** — taburile noi se apelează una pe alta, cu prefill automat:
„Buget 50/30/20” → „Timp vs dorințe” (dorințele ca preț), „Timp vs dorințe” → „Buget 50/30/20”
(venitul), „Sănătate financiară” → „Fond de urgență” / „Buget 50/30/20” (venitul, cheltuielile,
economiile, rezerva), „Fond de urgență” → „Sănătate financiară” (cheltuielile, rezerva,
economia), „Diversificare și riscul” → „Randament” (suma și randamentul portofoliului),
„Stress test” → „Buget 50/30/20” / „Sănătate financiară”, „Buget 50/30/20” / „Sănătate
financiară” → „Stress test”, „Pensie / Pilon III” → „Sumă dorită” (ținta, numărul de ani și
randamentul efectiv după comisioane), „Randament” / „Profit” → „Impozitare pe investiții”
(același tip de venit și suma), „Impozitare pe investiții” → „Randament” (aceeași rată și,
dacă există, același tip de venit), „Datorii bune vs rele” → „Costul oportunității” (suma și
dobânda de la economii), „Dobânda vs inflație” → „Datorii bune vs rele” (randamentul și suma),
„Costul mediu de achiziție” → „Scalarea în timp (DCA)” (valoarea achiziționată) și „Scalarea în
timp (DCA)” → „Costul mediu de achiziție” (tranșele lunare: preț și cantitate), „Dobânda vs
inflație” → „Curs de schimb” (suma convertită în valută, randamentul și inflația) și „Curs de
schimb” → „Costul oportunității” (suma în RON și randamentul nominal). Butoanele sunt
chip-uri în panoul sursă; inputurile se salvează în continuare în `localStorage`.

## Interactivitate (Etapa 3)

- **Căutare `⌘K`** — găsește orice tab din primele 3 caractere (după nume sau categorie, cu
  diacritice ignorate); `↑`/`↓` selectează, `Enter` deschide, `Esc` închide.
- **Centru de alerte** — butonul „Alerte” din header adună alarmele din cele 10 taburi cu alarme,
  grupate pe categorii, cu contor în header și badge cu numărul de alerte pe fiecare categorie din
  sidebar. Click pe o alertă deschide tabul respectiv; `Esc` închide și focusul rămâne în dialog.
- **Mod pas cu pas** — butonul „🪙 Pas cu pas” din header afișează un banner sticky (cu iconița 🪙)
  care marchează câmp cu câmp panoul activ, cu `Anterior`/`Următor`, bară de progres și ecuță
  „Pasul X” lângă câmpul evidențiat. `←`/`→` navighează, `Esc` oprește. Pe „Acasă” butonul e
  dezactivat; la schimbarea tabului pasurile se reconstruiesc. Layout-ul panoului nu se schimbă.
- **Copiere rezultat** — fiecare indicator are un buton mic care copiază valoarea formatată
  (Clipboard API, cu fallback `execCommand`); feedback vizual „Copiat” și anunț pentru cititorul
  de ecran.
- **Animații discrete** — count-up pe valori la recalcul, tranziție de panou și puls pe badge-ul de
  alerte. Toate se opresc cu `prefers-reduced-motion: reduce`.

## Tipărire și export CSV

- **Tipărire (Cmd+P / „Salvează ca PDF”)** — se tipărește doar tabul deschis, fără header, sidebar,
  breadcrumb, comutator de temă, tooltip-uri, grafice și butoane. Antetul de pagină arată titlul aplicației
  și tabul activ; tabelele se întind pe lățimea paginii, textul se rupe în loc să fie tăiat, iar antetul
  de coloană se repetă pe fiecare pagină. Tema întunecată nu se tipărește — printul e mereu deschis,
  indiferent de tema aleasă. Fiecare tab ocupă 1–5 pagini A4, în funcție de lungimea tabelelor.
- **„Descarcă CSV”** (header, din dreapta) — exportă toate tabelele tabului activ într-un
  fișier `glitchcoin-<tab>.csv`, cu delimitator `;` și BOM UTF-8, ca să se deschidă cu
  diacritice corecte în orice aplicație de tabele. Coloana de acțiuni („Șterge") nu se exportă;
  valorile din tabelele dinamice (cost, facturi) se exportă cu virgulă zecimală.

## Accesibilitate

- **Skip-link „Sari la conținut"** — primul element focusabil; e ascuns până când primește focus
  și duce direct la conținutul principal.
- **Focalizare în panou** — la schimbarea tabului, focusul se mută în panoul activ și panoul este
  derulat în vizibil (nu rămâne ascuns sub header).
- **Back-to-top** — buton fix în colțul din dreapta jos, apare după ~400 px de derulare; respectă
  `prefers-reduced-motion`.
- **Drawer (mobil)** — navigația e un drawer cu overlay, `Esc` închide, focusul e ținut în drawer și
  la alegerea unui tab revine în conținut.
- **`aria-live` doar în panoul activ** — cititorul de ecran nu anunță rezultatele din panourile ascunse.
- **Back/forward** — hash-ul tabului este urmărit (`#categorie/tab`, cu fallback `#tab`); butoinele de
  navigare din browser schimbă tabul.
- **Tabele** — toate tabelele au `caption` (vizibil doar pentru cititoare) și `scope="col"`
  pe coloane, deci antetele sunt asociate formal cu tabelul.
- **Contrast WCAG AA** — și pentru textul dezactivat (`--disabled` ≥ 4,5:1) în ambele teme.
- **Tooltips accesibile pentru formule** — lângă etichetele și valorile cheie apare un declanșator
  „?” (buton focusabil). Panelul are `role="tooltip"` și e legat prin `aria-describedby`; se deschide
  la focus, hover sau click și se închide cu **Escape**, la click în afara sau la pierderea focusului.
  Pe mobil poziționarea se adaptează pentru a rămâne în ecran. Nu se folosește `title` nativ
  (invizibil la tastatură și pe ecrane tactil).
- **Centru de alerte** — dialog `aria-modal` cu focus trap, `Esc`, navigare cu săgeți și elemente
  buton reale (nu doar `<div>` clickabile).
- **Mod pas cu pas** — toate controalele noi sunt butoane focusabile; bannerul sticky nu acoperă
  câmpul evidențiat (ecuța se poziționează deasupra sau dedesubt).
- **Copiere rezultat** — butoane cu `aria-label` clar; rezultatul copierii e anunțat într-o regiune
  `aria-live`.
- **Deflația evidențiată cu roșu și în tabel** — anii cu inflație negativă (2015, 2016) au rândul
  colorat în roșu în tabelul inflației, nu doar în grafic.

## Fișiere

| Fișier | Rol |
|--------|-----|
| `index.html` | Structura paginii (header, sidebar pe categorii, breadcrumb, Acasă) și cele 24 de panouri |
| `styles.css` | Stilurile, tokenii de temă, scheletul (header/sidebar/drawer) și regulile de tipărire |
| `fonts.css` + `fonts/` | Inter self-hosted (woff2, latin + latin-ext), cu fallback de sistem |
| `data.js` | Datele brute: inflația 1991–2026 (INS, IPC național) și prețurile alimentelor 2020–2026 |
| `app.js` | Toate calculele, interactivitatea, navigarea, comutatorul de temă, modul Concentrare, drawer-ul, back-to-top, persistența inputurilor și exportul CSV |
| `tests/` | Testele automate (`node --test tests/`): corecțiile C1–C12, conceptele noi N1–N15, scheletul (Etapa 1), interactivitatea (Etapa 3) și datele din `data.js` |
| `favicon.svg` / `favicon.png` / `favicon-180.png` | Icoana aplicației (vector + PNG, apple-touch) |
| `docs/` | Documentația internă de proces (audit UI/UX, propuneri de redesign și conținut, revizuire financiară, context proiect) — nu e servită de GitHub Pages |

## Documentație

Documentația de proces (auditul UI/UX, propunerile de redesign și conținut, revizuirea financiară,
contextul proiectului) e în `docs/`. Partea de documentație pentru utilizator e acest `README`.

## Teste

Rulează cu Node (fără librării externe):

```bash
node --test tests/
```

- `tests/c1-c12.test.mjs` — verifică fiecare corecție financiară (C1–C12) și datele 2025/2026,
  cu valori recalculate independent în Python.
- `tests/concepte-1.test.mjs` — verifică conceptele noi N1/N4/N5/N10 (fond de urgență, dobândă vs
  inflație, costul oportunității, regula 72), cu valori recalculate independent în Python.
- `tests/concepte-2.test.mjs` — verifică conceptele noi N2/N13 (buget 50/30/20, sănătate financiară),
  cu valori recalculate independent în Python.
- `tests/concepte-3.test.mjs` — verifică conceptele noi N3/N8/N15 (diversificare și riscul,
  asigurări, stress test), cu valori recalculate independent în Python.
- `tests/concepte-4.test.mjs` — verifică conceptele noi N6/N7 (pensie / Pilon III, impozitare
  pe investiții), cu valori recalculate independent în Python și un test „smoke” care rulează
  renderer-el în Node (prinde erori de referință fără browser).
- `tests/concepte-5.test.mjs` — verifică conceptele noi N9/N12 (datorii bune vs rele, scalarea
  în timp / DCA), cu valori recalculate independent în Python și testul „smoke” pentru cele două
  renderer-e.
- `tests/concepte-6.test.mjs` — verifică conceptele noi N11/N14 (curs de schimb / riscul valutar,
  biaseuri comportamentale), cu valori recalculate independent în Python și testul „smoke” pentru
  cele trei renderer-e.
- `tests/static.test.mjs` — verifică structura HTML și prezența opțiunilor/tooltip-urilor pentru
  impozit, comisioane și dobândă.
- `tests/interactivitate.test.mjs` — verifică căutarea din 3 caractere pentru toate cele 24 de
  taburi, centrul de alerte, modul pas cu pas (banner 🪙), copierea și animațiile.
- `tests/navigare.test.mjs` — verifică hash-ul `#categorie/tab` (cu fallback), săgețile
  Precedent/Următor, breadcrumb-ul și paleta de căutare.
- `tests/helpers/bundle.mjs` — încarcă `data.js` + `app.js` într-un context Node (DOM minim,
  cu elemente fals-pentru-smoke) pentru a apela funcțiile de calcul fără browser.

## Ce conține tabul Inflație

1. **Simulatorul inflației** — introdu suma actuală și rata inflației; vezi cât de multi bani
   îi vei avea nevoie în anii 2, 5, 10 și 15, plus tabelul complet pe 15 ani.
2. **Alimente** — prețurile la 10 produse de bază, 2020–2026, cu creșterea 2026 vs 2020 (parțial).
3. **Inflația 1991–2026** — grafic cu rata anuală, statistici și tabel complet (2026 e parțial).
   Anii cu deflație (2015, 2016) sunt evidențiați cu roșu și în tabel.
4. **Deflatorul sumelor** — află echivalentul sumei actuale în orice an între 1991 și 2026.
5. **Surse și note metodologice** — linkuri către INS, BNR, PwC, money.ro și InfoCons.

## Ce conține tabul Timp vs dorințe

1. **Venitul pe unități de timp** — venitul lunar net împărțit la 30,44 (zi, media reală 365/12),
   24 (oră) și 60 (minut), plus venitul pe zi lucrătoare și pe oră lucrătoare (8 ore).
2. **Cât timp muncești pentru o dorință** — minute, ore și zile din viață (24/24) sau ore și zile
   lucrate (8/24), cu procentul din timpul unui an (365 zile) sau dintr-un an lucrător.
3. **Zile lucrătoare / an** — input (implicit **250**, România 2026). Din el se derivă venitul pe zi
   lucrătoare și procentul dintr-un an lucrător; valoarea se salvează în `localStorage`.

Valori implicite: venit 5.000 lei, dorință 3.600 lei, 250 zile lucrătoare → 31.536 minute / 526 ore /
22 zile (24/24), sau 120 ore / 15 zile lucrate (8/24) — 6,00% din venitul anual lucrător
(cele două procente coincid, vezi nota metodologică din aplicație).

## Ce conține tabul Calculul dobânzii

1. **Patru inputuri** — sumă inițială, rată anuală, număr de zile și impozit.
2. **Dobânda brută și netă** — brut = ROUND(suma × rată × zile / 365, 2); net = ROUND((1 − impozit) × brut, 2).

Valori implicite: 15.000 lei / 7% / 184 zile / 10% → brut 529,32 lei, net 476,39 lei.

## Ce conține tabul Dobânda compusă

1. **Trei inputuri** — sumă inițială, contribuție lunară și rată anuală a dobânzii.
2. **Scenariul fără contribuție** — evoluția pe 20 de ani: suma + dobândă, dobânda anuală și
   randamentul față de primul an.
3. **Scenariul cu contribuție** — suma investită, dobânda acumulată, suma totală și creștere anuală.

Valori implicite: 10.000 lei / 200 lei lunar / 2,50% → anul 1 = 10.250,00 lei,
anul 2 = 10.506,25 lei, anul 20 = 16.386,14 lei (fără contribuție) și 78.673,58 lei
cu contribuție, din care 58.000,00 lei investiți.

## Ce conține tabul Randament

1. **Șase inputuri** — sumă investită, randament, tipul de venit, impozit, comisioane și inflație.
2. **Randament brut, net și real** — brut = sumă × randament; net = brut − impozit − comisioane;
   real = (1 + net) / (1 + inflație) − 1.
3. **Impozit pe tipuri de venit** — selectul „Tipul de venit" aplică rata reală (dobândă 10%,
   dividende 10% / 16%, valori mobiliere broker RO ≥ 1 an 1% / 3% etc.).

Valori implicite: 10.000 lei / 7% / 1% / 0,3% / 5% → brut 700,00 lei (7,00%),
net 690,90 lei (6,91%), real 181,81 lei (1,82%).

## Ce conține tabul Profit

1. **Șapte inputuri** — sumă investită, preț inițial/mediu, preț vânzare, tipul de venit, impozit,
   comisioane și inflație.
2. **Valoarea finală, profitul brut, net și real** — valoarea finală = sumă / preț inițial × preț vânzare;
   brut = valoarea finală − sumă; net = brut − (brut × impozit + brut × comisioane);
   real = randament real × sumă.
3. **Randamentul brut, net și real** — brut = valoarea finală / sumă − 1; net = profit net / sumă;
   real = (1 + randament net) / (1 + inflație) − 1.
4. **Impozit pe tipuri de venit** — selectul „Tipul de venit" aplică rata reală, la fel ca la Randament.
   Pierderea nu se impozitează: dacă brutul e negativ, netul = brutul.

Valori implicite: 10.000 lei / 25 lei / 28 lei / 1% / 0,3% / 5% → valoarea finală 11.200,00 lei,
profit brut 1.200,00 lei, profit net 1.184,40 lei, randament real 6,52% (profit real 651,81 lei).

## Ce conține tabul Costul mediu de achiziție

1. **Tabel dinamic** — fiecare rând are preț, cantitate și comision (%); poți adăuga rânduri cu
   „+ Adaugă rând", șterge rândurile cu „Șterge" și revino la valorile implicite cu „Resetează".
2. **Costul mediu ponderat** — (Σ preț × cantitate + Σ preț × cantitate × comision) / Σ cantitate,
   plus cantitatea totală, valoarea achiziționată și totalul plătit (cu comision).

Valori implicite: (28,81 × 24), (27,75 × 144), (32,89 × 4), (34,40 × 30), toate cu comision 2%
→ costul mediu 29,5447 lei pentru 202 de unități (5.851,00 lei achiziționat + 117,02 lei comisioane
= 5.968,02 lei plătiți).

## Ce conține tabul Sumă dorită

1. **Patru inputuri** — randament anual, număr de ani, sumă inițială și sumă dorită.
2. **Economia lunară necesară** — `-PMT(randament/12, ani×12, sumă inițială, sumă dorită)`,
   plus totalul economisit și suma din dobândă.
3. **Tabela pe ani** — suma acumulată, economisit în total, din dobândă și cât din țintă e acumulat.

Valori implicite: 10% / 15 ani / 0 / 1.000.000 lei → **2.412,72 lei pe lună**
(434.289,21 lei economisiți + 565.710,79 lei din dobândă = 1.000.000,00 lei).

## Ce conține tabul „Nu am bani"

1. **Inputuri** — venit lunar NET, ziua din lună în care primești venitul, inflația, suma
   adăugată în contul de economii și dobânda oferită de bancă.
2. **Listă de facturi** — nume, zi scadentă și sumă; rândurile se adaugă, se șterg și se resetează.
3. **Simularea pe zile** — ce rămâne la finalul lunii fără și cu cont de economii, profitul din
   dobândă și desfășuratorul zilnic (ziua, suma + dobândă, dobânda, suma retrasă, soldul).
4. **Pe termen lung** — profitul într-un an, inflația pentru tine și profitul în 10 ani.

Valori implicite: venit 5.000 lei, venitul în ziua 10, inflație 5%, economii 5.000 lei,
dobândă 3,5% (intervalul real 3–4%) → **2.570,00 lei fără CE, 2.577,41 lei cu CE, profit 7,41 lei (0,15%)**.
Cu cont de economii rămâi cu mai mulți bani, la fel ca în desfășuratorul zilnic.

## Ce conține tabul Dobânda vs inflație

1. **Randament nominal vs real** — sumă, randament nominal și inflație; creșterea nominală, randamentul
   real (exact, Fisher), valoarea reală după 1 an și aproximarea „nominal − inflație".
2. **Exemple istorice 2000–2026** — inflația reală (INS, IPC național) și randamentul real al aceleiași
   rate nominale, pe fiecare an; medie, minim, maxim și numărul de ani cu randament real negativ.
3. **Pe termen lung** — puterea de cumpărare a cash-ului vs a unei investiții la randament nominal,
   pe 27 de ani.

Valori implicite: 10.000 lei / 7% / 5% → creștere nominală 700,00 lei, randament real 1,90%,
valoare reală 10.190,48 lei. Pe 2000–2026, cash-ul de 10.000 lei ajunge la 1.087,15 lei reali,
iar la randament nominal 7% la 6.755,38 lei reali (diferența 5.668,23 lei).

## Ce conține tabul Regula 72

1. **Calculator** — rată anuală și sumă inițială; ani până la dublare (regula 72 vs compunere exactă),
   diferența și suma dublă.
2. **Invers** — ce rată dublează banii într-un număr dat de ani (72 ÷ ani vs 2^(1/ani) − 1).
3. **Pe rate** — grafic și tabel cu rate de la 1% la 15%.

Valori implicite: 7% → 10,29 ani (regula 72) vs 10,24 ani (exact); pentru 10 ani → 7,20% vs 7,18%.

## Ce conține tabul Fond de urgență

1. **Ținta** — cheltuielile lunare esențiale × 3–6 luni; dobânda brută și netă pe un an.
2. **Economia lunară necesară** — contribuția pentru a ajunge la țintă în perioada aleasă.
3. **Timpul până la țintă** — cu economia lunară introdusă (suma deja acumulată și dobânda reduc timpul).
4. **Unde ții fondul** — tabel comparativ: cont curent / depozit / acțiuni, cu lichiditate și randament tipic.

Valori implicite: 4.000 lei/lună, 6 luni, dobândă 3,5%, impozit 10% → țintă 24.000,00 lei,
dobândă netă 756,00 lei/an; 500 lei/lună ajung în ~45 de luni (~3,7 ani).

## Ce conține tabul Costul oportunității

1. **Cash vs investiție** — valoare nominală și putere de cumpărare (reală) după N ani, pentru cash
   (fără dobândă) și pentru investiție (randament net compus anual).
2. **Costul oportunității** — diferența dintre cea mai bună opțiune și cea aleasă, în putere de cumpărare.
3. **Tabel comparativ** — ce primești și ce pierzi la fiecare opțiune.

Valori implicite: 10.000 lei / 10 ani / 7% / impozit 1% / comisioane 0,3% / inflație 5% →
cash 10.000,00 lei nominal (6.139,13 real), investiție 19.504,85 lei nominal (11.974,29 real),
cost de oportunitate 5.835,15 lei.

## Ce conține tabul Buget 50/30/20

1. **Ținte 50/30/20** — venitul lunar net → nevoi (50%), dorințe (30%), economii (20%), cu valoarea
   reală, procentul din venit și abaterea față de țintă pentru fiecare categorie.
2. **Alarmele bugetului** — deficit dacă cheltuielile depășesc venitul, nevoi peste 50%, dorințe peste
   30%, economii sub 20% (sub 10% e alarmă). Fiecare alarmă e colorată după gravitate.
3. **Dorințele, în timp de muncă** — câte zile și ore lucrate costă categoria de dorințe și câte zile
   reprezintă economia, pe baza aceluiași număr de zile lucrătoare din „Timp vs dorințe”.
4. **Legături** — „Vezi dorințele în «Timp vs dorințe»” (prefill: venitul și dorințele) și, invers,
   „Vezi venitul în «Buget 50/30/20»” din tabul „Timp vs dorințe”.

Valori implicite: 5.000 lei → 2.500 / 1.500 / 1.000 lei, toate la țintă. Dorințele de 1.500 lei
costă 6,25 zile lucrate (50,00 ore), iar economia de 1.000 lei 4,17 zile lucrate.
Cu 4.000 / 2.500 / 1.200 / 600 lei: deficit 300,00 lei, nevoi 62,50%, economii 15,00%.

## Ce conține tabul Sănătate financiară

1. **Patru indicatori, cu prag și stare** — rată de economii (≥ 20%), datorii / venit (≤ 36%),
   rezerva de urgență (3–6 luni de cheltuieli esențiale) și net worth (> 0). Fiecare card are o
   etichetă de stare („în regulă” / „atenționare” / „alarmă”) și culoare.
2. **Imagine de ansamblu** — „X din 4 indicatori în zona sănătoasă”, plus lista de alarme.
3. **Rezerva și net worth, în cifre** — ținta de 3 luni, ținta de 6 luni, lipsa până la 3 luni și
   net worth exprimat în luni de venit.
4. **Legături** — „Deschide «Fond de urgență»” (cheltuielile, economia, rezerva) și „Deschide
   «Buget 50/30/20»” (venitul, cheltuielile, economiile); invers, „Fond de urgență” trimite la
   „Sănătate financiară”.

Valori implicite: venit 5.000, cheltuieli esențiale 2.500, economii 1.000, rate 500, rezervă 10.000,
active 15.000, datorii 0 → rată de economii 20,00%, datorii 10,00%, rezerva 4,0 luni, net worth
25.000,00 lei (0,42 luni de venit), 4 din 4 indicatori în regulă.
Scenariul de risc (4.000 / 2.500 / 300 / 1.800 / 2.000 / 5.000 / 30.000): rată de economii 7,50%,
datorii 45,00%, rezerva 0,8 luni, net worth −23.000,00 lei, lipsa 5.500,00 lei.

## Ce conține tabul Diversificare și riscul

1. **Portofoliu vs un singur activ** — randamentul portofoliului (media ponderată), volatilitatea
   (cu corelația introdusă), reducerea volatilității față de media ponderată și randamentul
   ajustat la risc: (randament − rată fără risc) ÷ volatilitate.
2. **Active configurabile** — tabel dinamic (nume, randament anual așteptat, volatilitate anuală,
   pondere), cu adăugare/ștergere/reset și salvare în `localStorage`.
3. **Simulare Monte Carlo** — 5.000 de scenarii × 5 ani, randamente normale corelate (seed fix,
   deci reproducibilă): mediană, p5, p95, probabilitatea de pierdere și drawdown mediu, pentru
   portofoliu și pentru activul cu randamentul cel mai mare.
4. **Scenarii pe un an** — tabel cu randamentul și valoarea la −3σ … +3σ, pentru portofoliu și
   pentru activul individual.

Valori implicite: acțiuni 8%/20% (50%), obligațiuni 5%/6% (30%), depozit 3,5%/0% (20%),
corelație 30%, rată fără risc 3,5% → randament portofoliu 6,20%, volatilitate 10,68% (media
ponderată ar fi 11,80%), randament ajustat la risc 0,25 vs 0,22 la acțiuni. Simularea: mediană
13.247,56 lei (portofoliu) vs 13.638,48 lei (acțiuni), p5 9.238,02 lei vs 6.362,72 lei,
drawdown mediu 5,68% vs 16,53%.

## Ce conține tabul Asigurări

1. **Primă vs auto-asigurare** — primă anuală, suma asigurată, probabilitate anuală, număr de ani
   și dobândă la economii; cost total al primelor (cu dobândă), pierderea anuală așteptată,
   diferența și probabilitatea de cel puțin un eveniment în N ani.
2. **Tabel comparativ** — cost anual, cost total pe N ani, ce plătești dacă evenimentul se
   întâmplă, risc rămas în bugetul tău și lichiditatea necesară, pentru fiecare opțiune.
3. **Trei riscuri frecvente** — sănătate, casă și mașină, cu valori ilustrative (nu oferte).

Valori implicite: primă 2.000 lei, sumă 20.000 lei, probabilitate 8%, 10 ani, dobândă 3,5% →
cost total al primelor 23.462,79 lei, pierdere așteptată 1.600,00 lei/an, diferență 400,00 lei,
probabilitatea de cel puțin un eveniment 56,56%.

## Ce conține tabul Stress test

1. **Bugetul sub stres** — venitul după scădere, cheltuielile esențiale ajustate la inflație,
   soldul lunar, câte luni acoperă rezerva și puterea de cumpărare a economiilor lunare.
2. **Activele sub stres** — valoarea după randament, pierderea și randamentul cerut pentru
   revenire la valoarea inițială.
3. **Trei scenarii** — optimist (25%, +10%), bază (50%, 0%) și pesimist (25%, randamentul
   introdus), plus valoarea așteptată (media ponderată).
4. **Scenarii predefinite** — selector: Personalizat, Inflație 10%, Recesiune, Șoc combinat.

Valori implicite: venit 5.000, cheltuieli 2.500, economii 1.000, rezervă 10.000, active 20.000,
12 luni, inflație 10%, scădere venit 20%, randament −20% → venit 4.000,00 lei, cheltuieli
2.750,00 lei, sold 1.250,00 lei, active 16.000,00 lei (pierdere 4.000,00 lei, revenire +25,00%),
valoarea așteptată 19.500,00 lei.

## Ce conține tabul Pensie / Pilon III

1. **8 inputuri** — scenariu predefinit, vârsta acum, vârsta la pensionare, contribuția lunară,
   suma deja acumulată, randamentul anual brut, comisionul anual total, impozitul pe câștig
   și inflația.
2. **Rezultatele** — valoarea brută la pensionare, valoarea după comisioane, valoarea netă
   la retragere, contribuțiile totale, câștigul brut, impozitul, costul comisioanelor,
   randamentul anual efectiv și valoarea reală (putere de cumpărare).
3. **Evoluția pe ani** — un rând pe an: contribuții totale, valoare brută, după comisioane,
   impozit dacă retragi atunci și valoare netă.
4. **Scenarii predefinite** — selector: Istoric (6,7% — media fondurilor Pilon III pe 2007–2025, ultimul an complet),
   Conservator (4%), Optimist (9%), Personalizat.

Valori implicite: 25 → 65 de ani, 300 lei/lună, 6,7% brut, 1,5% comision, 10% impozit, 4,9% inflație
→ valoare brută 724.125,55 lei, cost comisioane 241.685,40 lei (33,38% din brut), impozit
33.844,02 lei, valoare netă 448.596,14 lei (66.196,65 lei reali), randament efectiv 5,20%,
randament real 0,29%.

## Ce conține tabul Impozitare pe investiții

1. **Un calculator** — tipul de venit (9 variante), anul de aplicare (2025 / 2026) și câștigul
   brut; afișează cota aplicată, impozitul, netul rămas și diferența vs celălalt an.
2. **Tabelul cu rate reale** — dobânzi 10%/10%, dividende 10%/16%, valori mobiliare prin broker
   RO 1%/3% (≥ 365 zile) și 3%/6% (< 365 zile), broker străin / crypto 10%/16%, imobiliare
   3%/1% (în funcție de deținere), chirie 10%/10% și câștigul de la pensie privată 10%/10% —
   cu baza de impozitare, „cum se aplică” și câte un link către sursă pentru fiecare rând.
3. **Note metodologice** — comisioanele nu sunt impozite separat; plusvaloarea nu se impozitează
   cât timp nu vinzi; pragul neditabil de 200 lei/tranzacție la crypto; pragul lunar de 3.000 lei
   la pensie privată.

Valori implicite: valori mobiliare prin broker RO, 2026, 10.000 lei câștig → cotă 3%, impozit
300,00 lei, net 9.700,00 lei, cu 200,00 lei mai mult decât în 2025.

## De unde vin datele

- Valorile implicite și structura taburilor provin dintr-un document intern de lansare
  (septembrie 2025); nu sunt date personale.
- Surse publice, cu linkuri în aplicație (secțiunea „Surse și note metodologice"):
  INS — IPC național ([insse.ro](https://insse.ro/cms/en/content/cpi-annual-data-series));
  BNR — Raportul asupra inflației ([bnr.ro](https://www.bnr.ro/));
  PwC Tax Summaries ([taxsummaries.pwc.com/romania](https://taxsummaries.pwc.com/romania/individual/significant-developments));
  EY; money.ro și wall-street.ro — grile de comisioane; InfoCons — prețuri alimente;
  RSM — ghid fiscal imobiliar ([rsm.global](https://www.rsm.global/romania/ro/real-estate-tax-guide-romania));
  ASF — Pilonul III și datele fondurilor de pensii private ([asfromania.ro](https://asfromania.ro/));
  Tax Efficiency Lab — ghid fiscal ([taxefficiencylab.com](https://taxefficiencylab.com/romania-tax-guide)).
- Valorile cheie: simulator 5.000 lei @ 5% → 5.250 / 6.077,53 / 7.756,64 / 9.899,66 lei;
  deflator 2001 → 1.064,84 lei; Profit 10.000 / 25 / 28 / 1% / 0,3% / 5% → 11.200,00 / 1.200,00 / 1.184,40;
  Costul mediu → 29,5447 lei; Sumă dorită 10% / 15 ani / 1.000.000 lei → 2.412,72 lei/lună;
  Nu am bani → 2.570,00 lei fără CE / 2.577,41 lei cu CE / profit 7,41 lei;
  Buget 50/30/20 → 2.500 / 1.500 / 1.000 lei (dorințele costă 6,25 zile lucrate);
  Sănătate financiară → rezerva 4,0 luni, net worth 25.000,00 lei;
  Diversificare → randament 6,20%, volatilitate 10,68%, randament ajustat la risc 0,25;
  Asigurări → cost total primă 23.462,79 lei, pierdere așteptată 1.600,00 lei/an;
  Stress test → venit 4.000,00 lei, cheltuieli 2.750,00 lei, active 16.000,00 lei;
  Pensie / Pilon III → 724.125,55 lei brut, 448.596,14 lei net, cost comisioane 241.685,40 lei;
  Impozitare → broker RO ≥ 1 an: 1% (2025) / 3% (2026); dividende 10% / 16%.

## Notă

Aplicația lucrează doar cu input de la utilizator — venituri sau alte date personale nu sunt stocate nicăieri.
