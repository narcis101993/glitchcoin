# GlitchCoin — audit UI/UX + propuneri (2026-11-12)

Card: `t_e93e651c` · Audit tehnic, **fără implementare** · Fișiere auditate: `index.html` (1007 linii), `styles.css` (952), `app.js` (1307), `data.js` (57).

Metodă: citire integrală a celor 4 fișiere, apoi probe reale — `node --check`, verificări statice (label/id, roluri ARIA, resurse externe, CSS mort), test de contrast WCAG calculat din tokenii CSS, și execuție în browser (file:// + emulare 390px/1200px): navigare taburi, tastatură (ArrowLeft/Right, Home/End), refresh, hash, toggle temă, cazuri extreme, print-to-PDF.

---

## A. Probleme concrete (cu fișier și secțiune)

### A1 · Persistență inputuri — **inputurile se pierd la refresh** (confirmat)
- `index.html` — toate cele 32 de inputuri statice au `value` hardcodat (ex. L109 `sim-suma` = 5000; L264 `timp-venit` = 5000; L433 `comp-suma` = 10000).
- `app.js` L654 `let costRows = COST_ROWS_DEFAULT.map(...)` și L927 `let nuamRows = NUAM_ROWS_DEFAULT.map(...)` — starea dinamică e în memorie, nu e persistată.
- `app.js` L45-102 — singurul `localStorage` din aplicație e pentru temă (`glitchcoin-theme`).
- **Dovezi:** setez `timp-venit = 7777` → summary se actualizează → `reload()` → valoarea revine la `5000`. La fel toate taburile. Inconsistență: tema **se** reține (README o anunță), inputurile nu — utilizatorul nu are de unde știe.

### A2 · Buton „Resetează tot" — lipsește (există doar 2 mici)
- `index.html` L713 `cost-reset` „Resetează valorile din Excel" și L865 `nuam-reset` — acoperă doar taburile Cost și „Nu am bani".
- Celelalte 7 taburi **nu au reset** (verificat în browser: `document.querySelectorAll('button')` → doar `cost-reset`, `nuam-reset`).

### A3 · Tooltips pentru formule — parțial (native, incomplet, cu lacune)
- Singurele explicații sunt `title="..."` native: `index.html` L40 (comutator temă) și `app.js` L221 (bare graficului de inflație: `title="1991: 230,62%"`).
- Formulele există ca text în carduri/tabele: `index.html` L394 („sumă × rată × zile / 365"), L410-414 (pasii ROUND), L742-744 (formula costului mediu), L814-816 (PMT). Dar **nu există niciun tooltip** pe etichete sau rezultate.
- `index.html` L197 promite evidențierea deflației „cu roșu" în tabel, dar rândurile deflatoire (2015, 2016) nu au clasă distinctă — doar graficul are `vbar-neg` (`app.js` L218). Promisiune încălcată.

### A4 · Accesibilitate — puncte slabe reale
1. **Fără skip-link.** Primul element focusabil e comutatorul de temă (`tabOrder`: `theme-toggle` → taburi → conținut). Pentru 9 taburi × panouri lungi, un utilizator de la tastatură trece prin bara de taburi la fiecare intrare în pagină.
2. **`aria-live` în panouri ascunse.** Cele 11 regiuni live (`grep aria-live index.html`) includ 9 summary-uri din panouri `hidden` (dovezi: `timp-summary`, `dob-summary`, `comp-a-summary`, `comp-b-summary`, `rand-summary`, `prof-summary`, `cost-summary`, `suma-summary`, `nuam-summary`). O cititoare de ecran le poate anunța pe unde nu e focalizat utilizatorul.
3. **Tab activ ≠ focus.** `app.js` L1148: la activare se schimbă `hidden`, dar focalizarea nu e mutată în panou. În test, `scrollY` a rămas 318 (conținutul rămâne sub bara sticky) — cititorul de ecran nu „vede" noul panou.
4. **Valoarea tabului activ nu e persistentă.** `app.js` L1155 scrie `#id` în URL, dar la refresh `initTabs()` (L1197-1198) citeste hash-ul — **asta funcționează** (dovezi: `#cost` rămâne `tab-cost` după reload). Lipsesc doar: listener `hashchange` (back/forward nu schimbă tabul — test: `history.back()` a lăsat `tab-cost`) și persistența în `localStorage` ca fallback.
5. **`aria-disabled` fără `tabindex="-1"`.** `app.js` L1164 setează `aria-disabled` pentru taburile „în curând", dar toate cele 9 taburi sunt `ready: true` — cod mort, iar dacă s-ar dezactiva un tab, el rămâne focusabil.
6. **Tabele fără `<caption>` și fără `scope="col"`/`scope="row"`** — 0 din 14 tabele. Pentru cititoare de ecran, antetul „AN / SUMA NECESARĂ / ..." nu e asociat formal cu tabelul.
7. **SVG fără `role="img"` / `aria-label`** — cele 2 SVG-uri (comutatorul temei, L41-49) sunt `aria-hidden="true"`, ceea ce e corect; dar graficele în `app.js` (bare orizontale/verticale) nu au echivalent text complet în afara tabelelor.
8. **Contrast — verificat, dar cu excepții.** Toate perechile de text trec WCAG AA (min 4.5:1) în ambele teme, cu excepția `--tabs-bg-blur` (1.00:1 pe sine însuși — fals pozitiv, e un fundal, nu text). **Dar:** `--disabled: #7d8798` pe `--surface` = 3,15:1 → sub pragul de 4.5:1 (vizibil doar la butoanele „Șterge" dezactivate, `row-delete:disabled`).
9. **`prefers-reduced-motion`** e tratat (`styles.css` L945-951) — **bine**, dar `transition` pe `body` (L172) nu e acoperit decât prin regula globală.
10. **Focus vizibil** există (`:focus-visible`, 5 reguli), dar în teste headless `:focus-visible` nu s-a activat la `.focus()` programatic — nu e o defecțiune, e o limită a testului; recomand verificare manuală cu tastatura.

### A5 · Tehnic / UX diverse
- **CSS mort:** `styles.css` L353-369 (`.tab.is-disabled`, `.soon`) și L882-900 (`.placeholder`, `.placeholder h2`, `.placeholder-note`) nu apar nicăieri în `index.html`/`app.js` (dovezi: HTML 0, JS 0).
- **`app.js` L1122-1123** — comentariul „Taburile fără `ready: true`" e cod rezidual de la v2.0; toate sunt `ready: true`.
- **Print:** `printToPDF` funcționează, dar **fără `@media print`** rezultă un PDF de 104 de pagini cu toate panourile + tabelele lungi (2 pagini doar pentru tabelul de inflație, 21 de rânduri per tabel × mai multe tabele), text tăiat („CREȘTERE 202", „425 24 lei" — virgula zecimală pierdută la wrap).
- **Valori extreme:** `sim-suma = 999.999.999.999` → cardul cu valoare depășește lățimea (`scrollWidth > clientWidth`), textul iese din card. Nu e caz uzual, dar arată că nu există `overflow-wrap`/`min-width:0`.
- **`def-year` implicit 2001** (`app.js` L1226) — neanunțat în interfață; altfel e valoarea din Excel, deci intenționat.
- **`nuam-zi` max 31, simularea se oprește la 30** (`app.js` L916, L942) — dacă venitul e în ziua 31, mesajul explică, dar nu se oferă nicio altă variantă. Comportament corect, doar neintuitiv.
- **Zero erori JS** în toate testele (colector `window.onerror` + `console.error` după activarea tuturor taburilor, presetelor, adăugări/ștergeri de rânduri, valori extreme: `[]`).
- **Fără resurse externe** (0 linkuri `http(s)`) — offline complet, confirmat.
- **Overflow orizontal:** 0px la 390px și 1200px; bara de taburi are overflow doar la 390px (1027px vs 356px), cu indiciu vizual (`is-scrollable`) — corect.
- **Tabele pe mobil:** wrapper-ul `.table-wrap` are scroll orizontal (test: 728px în 356px) — funcțional, dar scrollbarul e nativ și subtil pe mobil.

---

## B. Propuneri de îmbunătățire

Format: **ce** · **de ce** · **efort** · **prioritate (1 = acum, 5 = mai târziu)**.

### P1 · Salvare inputuri în `localStorage` (debounce) — **MIC** · prioritate **1**
**Ce:** salvează automat toate inputurile statice și rândurile dinamice (`costRows`, `nuamRows`) în `localStorage`, cu chei per-tab; la pornire se încarcă, cu fallback la valorile din Excel. Debounce ~300ms la tastare.
**De ce:** singura defecțiune confirmată de UX (A1) — utilizatorul introduce date, reîncarcă și le pierde. E cel mai mic efort cu cel mai mare impact; schema de `localStorage` deja există (tema), deci modelul e dovedit.
**Riscuri de menționat:** `file://` blochează `localStorage` pe unele browsere (README anunță asta pentru temă) — implementarea trebuie să aibă `try/catch` ca la temă. Și: dacă inputurile persistă, un vizitator nou vede datele celui care a folosit ultimul calculatorul — de aceea e nevoie de P2 (reset vizibil).

### P2 · Buton „Resetează tot" — **MIC** · prioritate **1**
**Ce:** un singur buton global (header sau bara de taburi) care aduce toate taburile la valorile implicite din Excel: inputuri statice, `costRows`, `nuamRows`, selectul `def-year`, și opțional șterge cheile de `localStorage`. Cele două butoane existente rămân.
**De ce:** fără el, P1 transformă o preferință într-o „zonă murdară". Butonul e și o caracteristică educațională: „resetează la valorile din Excel" arată ce valori au fost sursa. Efort mic (se reutilizează deja `COST_ROWS_DEFAULT` / `NUAM_ROWS_DEFAULT` / valori `value=` din HTML).
**Prioritate 1** dacă P1 se implementează; altfel poate rămâne 2.

### P3 · Tooltips pentru formule — **MEDIU** · prioritate **2**
**Ce:** tooltip-uri accesibile pe etichete și valori cheie: `dob-brut`, `dob-net`, `rand-real-pct`, `cost-mediu`, `suma-economie`, `nuam-profit`. Fiecare explică formula și semnele. Se poate face cu un component minimal (buton `aria-describedby` + panou `role="tooltip"`) — nu cu librărie.
**De ce:** aplicația e educațională; formulele sunt deja scrise ca text, dar ascunse în tabele. Un tooltip unificat arată „de ce" fără să încarce interfața. **Atenție:** tooltip-urile native `title` (deja folosite pentru grafic) nu sunt accesibile la tastatură — de aceea e nevoie de componentă, nu de `title`.

### P4 · Accesibilitate — pachet complet — **MEDIU** · prioritate **2**
**Ce (în ordine de impact):**
1. Skip-link „Sari la conținut" (primul element focusabil, vizibil doar la focus) — `index.html` + CSS.
2. Mutarea focalizării în panoul activ la schimbarea tabului (`activateTab(..., {focus:true})` sau `panel.focus({preventScroll:true})` + `tabindex="-1"` pe panouri) — `app.js` L1148.
3. Scoaterea `aria-live` din panourile ascunse (păstrare doar în panoul vizibil) sau `aria-live` doar pe panoul activ — `index.html` + `app.js`.
4. `scope="col"` pe toate `<th>` + `<caption>` / `aria-label` pe tabele — `index.html` (14 tabele).
5. Listener `hashchange` (back/forward) + persistența tabului activ — `app.js`.
6. Contrast `--disabled` (3,15:1 → ≥4,5:1) — `styles.css` token.
7. Curățare CSS mort (A5) — `styles.css`.
**De ce:** toate punctele sunt defecte reale, nu „bonusuri". Skip-linkul și focalizarea sunt cele care blochează cu adevărat un utilizator de la tastatură/cititor de ecran.
**Efort mediu** pentru că sunt 7 sub-sarcini mici, dar independente.

### P5 · Export / print — **MEDIU** · prioritate **4**
**Ce:** (a) `@media print` minimal: ascunde bara de taburi, nav-ul, comutatorul; afișează doar panoul activ; evită ruperi de tabel pe pagină; (b) opțional, buton „Descarcă rezultate (CSV)" pe fiecare tab.
**De ce:** print-ul brut dă un PDF inutilizabil (104 pagini). Dar e o nevoie „mai târziu", nu acum — aplicația e pentru uz personal/educational. Prioritate 4 (nu 3) pentru că P1-P4 acoperă nevoile de zi cu zi; CSV e „nice to have".
**Efort mediu:** `@media print` e mic; CSV-ul e mic-mediu.

### P6 · Grafice accesibile — **MIC** · prioritate **3**
**Ce:** `role="img"` + `aria-label` pe `.bar-chart`/`.vchart` cu sumarul („Creștere 2026 vs 2020, max 66,50% la pâine"), plus `aria-hidden` pe barele decorative. Tabelele din spate deja există — deci doar etichetarea.
**De ce:** completatează P4; efort mic.

### P7 · Robustete la valori extreme — **MIC** · prioritate **3**
**Ce:** `overflow-wrap: anywhere` / `min-width: 0` pe `.stat-value`, și `input[type=number]` cu `min`/`max` consecvente (27 din 32 inputuri au `min="0"` fără `max`).
**De ce:** A5 — valori foarte mari ies din card. E un fix de o linie, dar nu e caz uzual.

---

## C. Evaluarea propunerilor organizer-ului (13-17)

### 13 · Salvarea inputurilor în `localStorage` — **DE ACORD (cu o condiție)**
De acord, e defecțiunea reală (A1) și cel mai bun raport efort/impact. **Condiția:** implementarea să aibă `try/catch` (pe `file://` localStorage e blocat — doveză: în testul meu pe file:// a fost accesibil, dar nu e garantat pe toate browserele) și să fie însoțită de P2 (reset), altfel rămâne datele ultimului utilizator. Plus debounce, ca să nu scrie pe fiecare tastă.

### 14 · Buton „Resetează tot" — **DE ACORD (dar nu e singurul)**
De acord că e necesar, mai ales ca pereche cu 13. **Nuanță:** există deja `cost-reset` și `nuam-reset` („Resetează valorile din Excel"), deci propunerea organică e „extinde la toate taburile + global". Efort mic. Prioritate 1 doar dacă 13 se face; altfel 2.

### 15 · Tooltips pentru formule — **DE ACORD, dar cu o corecție tehnică**
De acord că lipsesc — singurele explicații sunt text statice. **Corecție:** să nu se folosească `title="...""` (tooltip nativ) — e invizibil la tastatură și pe mobil. Trebuie un component de tooltip accesibil (`role="tooltip"`, declanșat și din focuse, închis cu Escape). Asta crește efortul de la „mic" la „mediu". Alternativă mai ieftină: o secțiune „Cum se calculează" (detaliată) în fiecare tab, în loc de tooltip-uri — ar acoperi și nevoia educațională.

### 16 · Accesibilitate — audit complet (tastatură, ARIA, contrast) — **DE ACORD, cu rezultatul auditului deja făcut**
Am făcut deja auditul: contrastul de text **trece WCAG AA** în ambele teme (toate perechile ≥4,5:1; singura problemă e `--disabled` la 3,15:1), ARIA de bază e validă (tablist/tab/tabpanel, `aria-selected`, `aria-labelledby`, `aria-pressed`), tastatura în taburi funcționează (ArrowLeft/Right, Home, End — testat). **Probleme reale găsite** (A4): fără skip-link, `aria-live` în panouri ascunse, focusul nu e mutat în panou, tabele fără `caption`/`scope`, `hashchange` lipsă. Deci: **de acord să se lucreze, dar nu e o „urgență" — e un pachet de îmbunătățiri medii**, cu excepția skip-linkului și focalizării (impact mare, efort mic).

### 17 · Export/print (variantă mai târziu) — **DE ACORD că e mai târziu**
De acord cu prioritatea 4-5. Motiv: print-ul brut dă un PDF de 104 pagini (doveză: am generat unul), dar aplicația e pentru uz personal/educational, nu pentru rapoarte. Când se face, să fie o singură sarcină care acoperă atât `@media print` cât și CSV.

---

## D. Recomandare de ordine (dacă Narcis vrea să avanseze)

1. **P1 + P2 împreună** (localStorage + reset) — mic, rezolvă cea mai mare defecțiune.
2. **P4.1 + P4.2** (skip-link + focalizare în panou) — mic, impact mare la tastatură.
3. **P4.4** (`caption`/`scope` pe tabele) — mic.
4. **P3** (tooltips) sau varianta „Cum se calculează" — mediu.
5. **P5** (print/CSV) — mediu, mai târziu.

**Nu am implementat nimic** — doar audit și propuneri, conform cerinței.
