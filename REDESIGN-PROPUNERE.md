# GlitchCoin — propunere de redesign vizual, categorii și interactivitate

**Status:** propunere — **nimic nu a fost implementat** (conform cerinței cardului `t_33013f1a`)
**Autor:** dev · **Data:** 2026-11-16
**Versiune analizată:** GlitchCoin **v2.13** (24 de taburi), folderul permanent
`/Users/narciscriveanu/Hermes Projects/GlitchCoin`
**Metodă:** citire integrală a `index.html` (3.219 linii), `styles.css` (1.492), `app.js` (5.642),
`README.md`, `CONTEXT.md`, `AUDIT-UI-UX.md` + probe reale în browser (`file://`) și probe statice
(`node`, `grep`). Nimic din cod nu a fost modificat.

---

## 0. Linia de bază (măsurată, nu din memorie)

| Măsurătoare | Valoare | Surse |
|---|---|---|
| Taburi / panouri | 24 / 24 | `index.html` · `app.js` (`const TABS`) |
| Inputuri cu `id` | 105 | `index.html` |
| Tabele | 34 | `index.html` |
| Carduri de tip `stat` | 139 | `index.html` |
| Tooltip-uri (`data-tip` + `FORMULA_TIPS`) | 221 | `index.html` · `app.js` |
| Lățime **conținut** a barei de taburi | **3.344 px** | browser (fereastră de test) |
| Lățime **vizibilă** a barei de taburi | **436 px** | idem |
| Înălțimea paginii, tabul „Inflație" | **5.361 px** | idem |
| Sidebar / căutare / „acasă" | **nu există / nu există / nu există** | idem |
| Referințe vizibile cu „Excel" în UI | **9 locuri** (`index.html` + footer) | `grep -n Excel index.html` |
| Referințe cu „Excel" în cod (comentarii) | 21 | `grep -n Excel app.js` |
| `.git` în folder | **NU există** | `git status` → exit 128 |

Ultimul rând e cel mai important pentru plan de migrare: **proiectul nu are control de versiuni**.
Orice redesign trebuie să înceapă cu `git init` + un commit și un backup.

---

## 1. Diagnostic — de ce e greu de urmărit acum

Problema nu e „lipsa de stil", e **organizarea informației**. Cinci dovezi concrete:

**D1 · 24 de taburi într-un singur rând, cu derulare obligatorie.**
Bara are 3.344 px de conținut. Chiar și pe un ecran de 1.440 px, 24 de pill-uri cu nume lungi
(„Costul mediu de achiziție", „Diversificare și riscul", „Scalarea în timp (DCA)") nu încap:
utilizatorul **nu vede ce taburi există** decât dacă derulează. Cinci taburi vizibile din 24 =
o aplicație care ascunde 80% din conținut. În plus, 24 de elemente în „zona principală" e mult
peste ce poate reține un om (7 ± 2).

**D2 · Ierarhie inexistentă — toate taburile sunt egale.**
„Inflație" (fundament) stă lângă „Biaseuri comportamentale" (psihologie) și lângă „Impozitare pe
investiții" (nicăieri). Utilizatorul nou nu are un „loc de unde să înceapă". Ordinea actuală e
istorică (ordinea din Excel + adăugări la final), nu logică de utilizator.

**D3 · O singură pagină foarte lungă.**
Tabul „Inflație" are 5.361 px înălțime, cu 4 secțiuni + surse, accesibile doar printr-o ancoră
(`subnav`). Celelalte 23 de taburi au în medie 3–6 ecrane. Nu există „sumar" și nu există
o cale scurtă între taburi în afara derulării barei.

**D4 · Identitate slabă — se citește ca o conversie.**
- Hero: titlu „GlitchCoin" + badge + tagline generică („Mini-calculatoare de educație financiară"),
  fără logotip și fără „despre".
- Textele candidează cu „din Excel": ex. „la fel ca în tabul „Sumă dorită" din `GlitchCoin.xlsx`",
  „Resetează valorile din Excel", „Tabul ascuns din Excel". Utilizatorul vede un artefact intern.
- Nu există glosar, nu există întrebări frecvente, nu există nicio altă voce decât formula.

**D5 · Interactivitate limitată la „introdu cifre → citește rezultatul".**
Nu există căutare, nu există mod „pas cu pas", nu există un loc unde alertele din cele 10 taburi
cu alarme să se adune, nu există copiere rapidă a unui rezultat, nu există „de unde încep".

**Ce nu e defect (și nu se va atinge):** calculele, ID-urile inputurilor, tabelele dinamice,
legăturile cu prefill între taburi, `localStorage`, print/CSV, cele 145 de teste. Redesign-ul
trebuie să fie **o altă împachetare a aceluiași motor**, nu o rescrisă.

---

## 2. Direcția vizuală — modern, simplist, cu identitate proprie

### 2.1 Identitate

- **Nume:** GlitchCoin rămâne. Se adaugă o **monogramă** (un „G" format dintr-o linie de trend
  cu o „glitch" - o intruziune de 2–3 px) — folosită în header, sidebar și favicon.
- **Tagline (propusă):** „Calculatoare pentru a înțelege banii" — scurt, în loc de
  „Mini-calculatoare de educație financiară".
- **Emoji-ul 🐴** rămâne doar în favicon/meta (nu în brandul principal) — altfel pagina
  arată ca o aplicație de chat.
- **„Despre"** (secțiune nouă): 2–3 propoziții — ce e GlitchCoin, ce **nu** e (nu e produs
  financiar, nu dă sfaturi personalizate, nu stochează date), și de unde vin datele (INS/BNR).

### 2.2 Paletă (propunere concretă, tokeni)

Ideia: **verde „registru" + hârtie**, nu albastru SaaS generic. Verde = banii, creștere,
sold; „hârtie" = claritate, foaie de calcul transpusă în web.

| Token | Light | Dark | Rol |
|---|---|---|---|
| `--bg` | `#f6f7f4` | `#0c1110` | fundal pagină |
| `--surface` | `#ffffff` | `#141a18` | carduri, tabele |
| `--surface-2` | `#f0f2ee` | `#1b2220` | fundal tabel / input |
| `--ink` | `#111614` | `#e9efec` | text principal |
| `--ink-soft` | `#3d4742` | `#c2ccc7` | text secundar |
| `--muted` | `#6a756f` | `#9aa7a1` | subtitluri |
| `--line` | `#e3e7e2` | `#242c29` | borduri |
| `--accent` | `#0b7a55` | `#3fd0a0` | acțiuni, tab activ, linkuri |
| `--accent-soft` | `#e3f3ec` | `#12312a` | fundal selectat |
| `--pos` | `#0f7a4d` | `#4ade80` | valori pozitive |
| `--neg` | `#b42318` | `#f87171` | valori negative |
| `--warn` | `#9a6700` | `#fbbf24` | alerte |

**Reguli:** o singură accent-color (nu un accent per categorie în interfață — categoria se
disting prin iconiță și poziție, nu prin culoare; culoarea rămâne rezervată pentru
pozitiv/negativ/atenție). Contrast WCAG AA verificat pe toate perechile (lumină și întuneric).

### 2.3 Tipografie

- **Font:** `Inter` (self-hosted, woff2) cu fallback `-apple-system, "Segoe UI", Roboto`.
  Inter are diacritice românești complete și cifre tabulare bune. *Alternativă fără efort de
  găzduire:* stack de sistem (`-apple-system` pe Mac) — dar atunci identitatea e mai slabă.
- **Cifre:** `font-variant-numeric: tabular-nums` **peste tot** unde e o valoare (carduri `stat`,
  tabele, inputuri, rezultate). E cel mai ieftin „look profesional" pentru o aplicație de cifre.
- **Scară:** 12 / 14 / 16 / 20 / 28 / 40 px. Corp 16 px, `line-height` 1.55; lățime de conținut
  **68–72 de caractere** pentru text, **780 px** pentru panoul unui tab.
- **Titluri:** weight 650–700, `letter-spacing: -0.02em`. Etichete de card: 12 px, majuscule,
  `letter-spacing: .04em`, `--muted`.

### 2.4 Spațiere, carduri, mișcare

- Ritm **8 px** (4 / 8 / 12 / 16 / 24 / 32 / 48). Carduri: padding 16–20 px, bordură 1 px `--line`,
  colțuri **12 px** (nu 20 px — 20 px arată „învechit"); o singură umbră discretă, fără straturi.
- Distanță verticală între secțiuni: 32 px; între carduri de rezultate: 12 px.
- Tranziții: 140–180 ms, `cubic-bezier(.2,.7,.3,1)`, doar pe `transform`/`opacity`/culoare de
  fundal. `prefers-reduced-motion: reduce` → totul static (obligatoriu, moștenit din audit).
- **Fără** gradient pe carduri, fără „glow", fără animații de intrare pe toate elementele.

### 2.5 Starea de „focus"

Două sensuri, amândouă utile:

1. **Focus vizibil (accesibilitate):** ring de 2 px `--accent` cu offset 2 px pe orice element
   interactiv; skip-link „Sari la conținut"; focalizarea mutată în panoul activ la schimbarea tabului
   (deja implementat, se păstrează și se extinde la noile controale).
2. **Mod „Concentrare" (funcțional):** un toggle în header care ascunde sidebar-ul și lățimea
   panoului o aduce la 720 px, ca să nu fie distragere. Pe mobil e implicit. Scurtătură: `F`.

### 2.6 Referințe (ce împrumutăm, nu ce copiem)

1. **Linear** — densitate controlată, `⌘K`, focus states clare, micro-interacții discrete,
   dark mode coerent. Împrumutăm: **navigarea și starea de focus**.
2. **Stripe / Stripe Press** — cifre tabulare, claritate financiară, spațiere generoasă,
   tipografie sobă. Împrumătăm: **tratarea cifrelor și a tabelelor**.
3. **YNAB / Cleo** — ton și educație pentru buget; carduri de „stare" simple. Împrumțăm:
   **structura de buget și vocea conținutului**.
4. **GitHub Primer / Apple HIG** — sisteme de tokeni, motion, accesibilitate. Împrumțăm:
   **rigurositatea de design-system**.

---

## 3. Structura paginii

### 3.1 Desktop (≥ 1024 px) — sidebar + conținut

```
┌────────────────────────────────────────────────────────────────────┐
│  [monogramă] GlitchCoin      [🔍 Caută…  ⌘K]      [☾] [Resetează] │  header 56 px
├──────────────────────┬─────────────────────────────────────────────┤
│  ACASĂ               │  Acasă › Investiții › Randament             │  breadcrumb
│                      │                                             │
│  ▾ FUNDAMENTELE      │  ┌───────────────────────────────────────┐  │
│    Inflație          │  │ lead (1–2 propoziții, fără „Excel")    │  │
│    Calculul dobânzii │  └───────────────────────────────────────┘  │
│    Dobânda compusă   │  ┌─────────────┐ ┌─────────────┐            │
│    Dobânda vs infl.  │  │ inputuri    │ │ rezultate   │            │
│    Regula 72         │  └─────────────┘ └─────────────┘            │
│                      │  ┌───────────────────────────────────────┐  │
│  ▾ BUGETUL DE ZI     │  │ tabel / grafic                        │  │
│    Timp vs dorințe   │  └───────────────────────────────────────┘  │
│    Nu am bani        │                                             │
│    Buget 50/30/20    │  ┌───────────┐ ┌───────────┐                │
│    ...               │  │ ← Precedentul │ Următorul → │           │
│                      │  └───────────┘ └───────────┘                │
│  ▾ INVESTIȚII        │                                             │
│  ▾ RISC ȘI PROTECȚIE │                                             │
│  ▾ IMPOZITE ȘI ...   │                                             │
│  ▾ PSIHOLOGIA ...    │                                             │
│                      │                                             │
│  ────────────────    │                                             │
│  Glosar              │                                             │
│  Întrebări frecvente │                                             │
│  Despre · Surse      │                                             │
└──────────────────────┴─────────────────────────────────────────────┘
```

- **Sidebar (260 px, sticky):** logo-ul e în header; sidebar-ul conține doar navigarea.
  Categoriile sunt secțiuni **pliabile** (`<details>`-like, cu `aria-expanded`), categoria tabului
  activ e mereu deschisă și evidențiată. Sub categorie, taburile ca listă cu o **bară verticală**
  pe cea activă + numele scurt.
- **Header (56 px, sticky):** monogramă + nume (click → Acasă), căutare cu `⌘K`, comutator de
  temă, „Resetează tot", „CSV". Acul e puțin: acțiunile sunt globale, nu pe fiecare tab.
- **Conținut:** o singură coloană, max 780 px, padding 32–48 px. Panoul tabului păstrează
  **aceeași structură internă** (lead → inputuri → rezultate → tabele → note), doar că acum
  e singurul lucru din pagină, fără competiție cu 24 de pill-uri.
- **Breadcrumb:** `Acasă › Categorie › Tab` — dă context și e clickabil (categoria → panou
  „categorie" cu lista taburilor? Nu: categoria e doar o grupare vizuală; click → primul tab
  al categoriei, cu un mesaj „Categorie: X (N taburi)").

### 3.2 Mobil (< 1024 px)

- Sidebar-ul devine **drawer** (buton hamburger în header; `Esc` închide; focus trap simplu;
  `aria-modal`). Se păstrează și focalizarea în conținut la alegerea unui tab.
- Sub header, o **bara orizontală de categorii** (6 pill-uri) — filtru, nu navigare de nivel 2.
  Alegerea unei categorii arată taburile ei în drawer.
- Panoul: carduri `stat` pe 2 coloane (nu 4), tabele în wrapper cu scroll orizontal, inputurile
  pe coloană unică. Zero overflow la 390 px (criteriu de acceptare).

### 3.3 Prima deschidere

Două variante, de alegeri:

- **(A) „Acasă" ca destinație implicită** *(recomandat)*: prima vizită (fără `localStorage`)
  deschide panoul **Acasă**: 6 carduri de categorii (iconiță + nume + „N taburi" + o propoziție),
  un card „De unde încep?" (Inflație → Timp vs dorințe → Buget 50/30/20) și 3 **simulatoare
  rapide** (ex. „Cât ajungi să ai cu 7% în 10 ani?", „Câte luni acoperă rezerva?", „Cât costă
  un credit de 100.000 lei?"), fiecare cu buton „Deschide în tabul complet".
  Dacă există tab activ în `localStorage` → se deschide tabul respectiv (nu se pierde locul).
- **(B) Ultimul tab activ**, cu sidebar-ul evidențiind categoria. Mai puțin „wow", dar mai puțină
  muncă și zero risc de a ascunde taburile.

### 3.4 Navigare

| Cale | Comportament |
|---|---|
| Sidebar | click pe tab → deschide; categoria activă e mereu vizibilă |
| Breadcrumb | click pe categorie → primul tab al categoriei |
| Săgeți ←/→ | tabul precedent/următor **în cadrul categoriei**, cu wrap; la capăt, sare la categoria următoare |
| `⌘K` / `Ctrl+K` | căutare instant (taburi, glosar, FAQ) — vezi §5 |
| Hash | `#categorie/tab` (ex. `#investitii/randament`); **retro-compatibil** cu `#tab` (ex. `#inflatie`) |
| Precedent/Următor | butoane în panou, cu numele tabului (nu doar săgeți) |
| „Deschide în ..." | legăturile cu prefill între taburi rămân **exact** la fel (nu se atinge) |

---

## 4. Categoriile — 24 de taburi, 6 grupuri

### 4.1 Maparea completă

| # | Tab | Categorie | De ce e aici |
|---|---|---|---|
| 1 | Inflație | **Fundamentele banilor** | prima lecție: banul își pierde valoarea |
| 2 | Calculul dobânzii | **Fundamentele banilor** | formula de bază, fără portofoliu |
| 3 | Dobânda compusă | **Fundamentele banilor** | „dobânda pe dobândă", fundament |
| 4 | Dobânda vs inflație | **Fundamentele banilor** | randamentul real; folosește randamentul |
| 5 | Regula 72 | **Fundamentele banilor** | o regulă de buzunar despre compunere |
| 6 | Timp vs dorințe | **Bugetul de zi cu zi** | pleacă de la venit și prețul dorinței |
| 7 | Nu am bani | **Bugetul de zi cu zi** | flux lunar, facturi, scadențe |
| 8 | Buget 50/30/20 | **Bugetul de zi cu zi** | repartizarea venitului |
| 9 | Fond de urgență | **Bugetul de zi cu zi** | rezerva = cheltuieli din venit |
| 10 | Sănătate financiară | **Bugetul de zi cu zi** | tabloul de bord al fluxului personal |
| 11 | Randament | **Investiții** | ce returnează o investiție |
| 12 | Profit | **Investiții** | câștigul de la o tranzacție |
| 13 | Costul mediu de achiziție | **Investiții** | cum se construiește o poziție |
| 14 | Sumă dorită | **Investiții** | țintă + rată + orizont |
| 15 | Costul oportunității | **Investiții** | ce renunți când ții cash |
| 16 | Scalarea în timp (DCA) | **Investiții** | cum intri în poziție în timp |
| 17 | Curs de schimb | **Investiții** | randament în valută ↔ RON |
| 18 | Diversificare și riscul | **Risc și protecție** | riscul portofoliului, nu doar randamentul |
| 19 | Asigurări | **Risc și protecție** | transfer de risc |
| 20 | Stress test | **Risc și protecție** | reziliența la scenarii rele |
| 21 | Datorii bune vs rele | **Risc și protecție** | datoria ca risc și ca unealtă |
| 22 | Impozitare pe investiții | **Impozite și viitor** | ce plătește statului din câștig |
| 23 | Pensie / Pilon III | **Impozite și viitor** | orizont foarte lung + fiscalitate |
| 24 | Biaseuri comportamentale | **Psihologia banilor** | nu un calculator, ci un ghid de decizie |

### 4.2 Justificarea categorii

| Categorie | Taburi | Întrebarea pe care o răspunde |
|---|---|---|
| **Fundamentele banilor** | 5 | „Ce se întâmplă cu valoarea banilor în timp?" — formule de bază, fără inputuri de tip portofoliu. |
| **Bugetul de zi cu zi** | 5 | „Cum-mi organizez ce câștig și ce cheltuiește lunar?" — toate pleacă de la venit/cheltuieli. |
| **Investiții** | 7 | „Cum câștig și cum intră în piață?" — randament, profit, poziție, țintă, cash vs investiție, DCA, valută. |
| **Risc și protecție** | 4 | „Ce se întâmplă dacă eșuează?" — volatilitate, evenimente, reziliență, datorii. |
| **Impozite și viitor** | 2 | „Ce plătesc și ce acumulez pe termen foarte lung?" |
| **Psihologia banilor** | 1 | „De ce iau decizii proaste cu banii?" — o „lectură", nu un calculator; se deschide mai ușor la final. |

### 4.3 Variantă alternativă (5 categorii)

Dacă 6 par prea multe: se combină **Impozite și viitor** + **Psihologia banilor** →
„**Viitor și decizii**" (3 taburi). Recomandarea rămâne 6, pentru că „Psihologia banilor"
e un subiect distinct, cu ton diferit, și e mai ușor de găsit ca secțiune proprie.

**Notă:** ordinea din sidebar **nu mai e** ordinea din Excel. E o decizie conștientă — de aceea
se păstrează suportul pentru hash-urile vechi (`#inflatie` etc.) și pentru legăturile cu prefill.

---

## 5. Interactivitate — ce adaugăm (prioritizat)

| # | Element | Ce face | De ce | Efort | Impact | Prioritate |
|---|---|---|---|---|---|---|
| I1 | **Căutare `⌘K`** | căutare instant peste taburi, glosar și FAQ, cu rezultate și `Enter` care deschide | 24 de taburi nu se pot găsi altfel | mediu | mare | **1** |
| I2 | **Glosar** | 30–40 de termeni (dobândă compusă, deflator, DCA, net worth, anuitate, Pilon III, risk premium…) cu definiție scurtă + link către tabul relevant | aplicația e educațională; termenii sunt acum doar în tooltip-uri | mediu | mare | **1** |
| I3 | **Întrebări frecvente** | 10–15 întrebări cu răspuns de 2–3 rânduri și buton „Deschide tabul X" | reduce „de unde încep" și explică scopul | mic–mediu | mediu | **2** |
| I4 | **Mod „pas cu pas"** | un ghid în panou care marchează câmp cu câmp („1. Introdu venitul…"), cu `anterior/următor` și oprire | panourile cu 8–10 inputuri sunt greu de urmărit | mediu–mare | mare | **2** |
| I5 | **Centru de alerte** | un singur loc (header/sidebar) cu alertele din taburi (buget, fond, sănătate, datorii, stress), cu badge pe categorie | acum alertele sunt în 10 taburi și nu se văd niciodată împreună | mediu | mare | **2** |
| I6 | **Simulatoare rapide** pe Acasă | 3–5 mini-carduri cu 1 input + rezultat + „deschide în tabul complet" | prima deschidere are sens și dă rezultat imediat | mediu | mediu | **3** |
| I7 | **Copiere rezultat** | buton mic pe fiecare `stat-value` (copiază valoarea formatată) | util la notițe/partajare | mic | mediu | **3** |
| I8 | **Animații discrete** | count-up pe valori la recalcul, tranziție de panou, skeleton la Monte Carlo | „simt" de aplicație vie; se dezactivează cu `prefers-reduced-motion` | mic–mediu | mediu | **3** |
| I9 | **Compară (2 coloane)** | un mod „înainte/după" pentru taburile care au deja scenarii (DCA vs o dată, cash vs investiție, cu/fără anticipare) | centralizează ce e acum împrăștiat în tabele | mediu | mediu | **4** |
| I10 | **Progres „explorat"** | bifează taburile deschise („7 din 24") | gamificare ușoară; **dezbate** — poate deveni „todo list" nedorit | mic | mic | **5** |
| I11 | **Scenarii salvate** | salvează un set de inputuri cu nume și reîncarcă | util, dar crește complexitatea și riscurile de stare | mare | mediu | **5** |

**Recomandare:** I1 + I2 + I3 în prima fază de interactivitate; I4 + I5 în a doua; restul dacă
Narcis vrea. I11 **nu** se recomandă acum.

---

## 6. Eliminarea referințelor la Excel

### 6.1 Principiu

Utilizatorul **nu trebuie să știe** că aplicația a apărut dintr-un fișier Excel. Excelul e o
**proveniență istorică a unor valori implicite**, nu un artefact curent. Textul vizibil să vorbească
despre **formule, valori implicite și surse de date** (INS, BNR), nu despre celule și taburi.

### 6.2 Unde sunt acum (exact)

**`index.html` (UI vizibil):**
- L113 — tooltip buton: „Resetează toate cele 24 taburi la valorile implicite din **Excel**"
- L115 — tooltip CSV: „…se deschide în **Excel**"
- L850 — buton: „Resetează valorile din **Excel**"
- L885 — notă: „…comisionul fiecărei tranșe se adaugă la valoarea ei, ca în **Excel**."
- L955–958 — lead: „…la fel ca în tabul „Sumă dorită" din **`GlitchCoin.xlsx`**" +
  notă: „…identică cu **`D9`** din tabul „Sumă dorită" din **Excel**."
- L965 — lead: „**Tabul ascuns din Excel**: vezi ce se întâmplă…"
- L1008 — buton: „Resetează valorile din **Excel**"
- L1081 — notă: „Dobânda e netă de impozit (10%), ca în formulele din **Excel**."
- footer — „Sursă date: **`GlitchCoin.xlsx`**, 9 taburi (septembrie 2025)"

**`app.js`:** 21 de apariții, **toate în comentarii de cod** (nu în text vizibil).
**`README.md`:** L3 („conversie a taburilor din `GlitchCoin.xlsx`"), L35, L45, L57, L236, L240,
L251, L254, L425.

### 6.3 Propuneri de rescriere (exemple concrete)

| Acum | Propus |
|---|---|
| „Resetează toate cele 24 taburi la valorile implicite din Excel" | „Resetează toate cele 24 de taburi la **valorile implicite"** |
| „Resetează valorile din Excel" | „**Resetează la valorile implicite"** |
| „Tabul ascuns din Excel: vezi ce se întâmplă cu banii…" | „**Scenariu avansat — flux de numerar zilnic:** vezi ce se întâmplă cu banii…" |
| „…la fel ca în tabul „Sumă dorită" din `GlitchCoin.xlsx`." | „Stabilește o sumă țintă și află cât trebuie să economisești în fiecare lună pentru a o atinge." |
| „…identică cu `D9` din tabul „Sumă dorită" din Excel." | „Formula: `-PMT(randament/12, ani×12, sumă inițială, sumă dorită)` — adică rata lunară care, compusă, ajunge la țintă." |
| „…comisionul fiecărei tranșe se adaugă la valoarea ei, ca în Excel." | „…comisionul fiecărei tranșe se adaugă la valoarea ei (baza e suma plătită, nu doar prețul)." |
| „…ca în formulele din Excel." | „…cu impozitul pe câștigul net (10%)." |
| „Sursă date: `GlitchCoin.xlsx`, 9 taburi (septembrie 2025)" | „Date publice: **INS** (IPC) și **BNR** · Valorile implicite sunt alese ca exerciții (nu sunt date personale)" |
| „…se deschide în Excel" | „…se deschide în **Excel, Numbers sau Google Sheets**" |

**Reguli de aplicat:**
1. **Textul vizibil** (butoane, lead-uri, note, tooltip-uri, footer): zero „Excel", zero denumiri
   de celule (`D9`), zero nume de taburi interne.
2. **Formulele** se scriu explicit, cu notație matematică — nu prin referință la o celulă.
3. **Numele tabului** „Nu am bani" rămâne (e bun), dar descrierea e transformată în scenariu,
   nu în „tab ascuns".
4. **Comentariile din `app.js`:** pot rămâne, dar cu o singură etichetă de proveniență
   (`// proveniență: valori implicite din documentul de lansare`), nu în text de UI. Nu e
   obligatoriu să dispară — e cod, nu interfață.
5. **CSV:** menționarea Excelului e legitimă (e un caz de utilizare real), dar cu alternative.
6. **`README.md`:** se restructurează pe categorii; secțiunea „De unde vin datele" menționează
   proveniența istorică a valorilor implicite **fără** path local absolut
   (`/Users/narciscriveanu/Library/...` e date personale — se scoate oricum).

### 6.4 Checklist de verificare

```bash
cd "/Users/narciscriveanu/Hermes Projects/GlitchCoin"
# 1. zero „Excel" în textul vizibil (nu în comentarii):
grep -in excel index.html            # doar în comentarii HTML, acceptabile
grep -in "Excel" app.js | grep -v "//\|/\*"   # 0 rezultate
# 2. zero path-uri personale în README:
grep -n "/Users/narciscriveanu" README.md     # 0 rezultate
# 3. textul din UI se citește natural (revizuit manual, tab cu tab)
```

---

## 7. Plan de migrare

### 7.1 Etapa 0 — Siguranță (0,5 zi) — **obligatorie**

Proiectul **nu are `.git`** (verificat). Ordinea:

1. Backup: `cp -R . ../GlitchCoin-backup-redesign-2026-11-16`
2. `git init && git add -A && git commit -m "GlitchCoin v2.13 — înainte de redesign"`
3. Branch dedicat: `git switch -c redesign`
4. Regulă de lucru: **o etapă = un commit**; dacă ceva nu merge, `git switch .` sau
   `git restore <fișier>` — nu „refacere manuală pe nas".

**Atenție:** nicio comandă distructivă (`reset --hard`, `push --force`, `branch -D`, `clean -fd`)
fără confirmare explicită a lui Narcis.

### 7.2 Etapele

| Etapă | Ce se face | Efort | Criterii de acceptare |
|---|---|---|---|
| **1 · Fundația vizuală** | tokeni noi (§2.2), tipografie + cifre tabulare, spațiere, header 56 px, **sidebar cu toate cele 24 de taburi** (grupate pe categorii), mod Concentrare. **Panourile nu se mută și nu se modifică.** | 2–3 zile | 24/24 taburi deschise; zero erori JS; 390 px și 1440 px fără overflow; contrast AA; testele `node --test tests/` (145) trec |
| **2 · Navigare pe categorii** | breadcrumb, `⌘K`, Precedent/Următor, hash `#categorie/tab` cu **fallback** la `#tab`, badge categorie. | 2–3 zile | hash-urile vechi încă funcționează; toate legăturile cu prefill între taburi funcționează; săgețile nu „sărea" categorii neintenționat |
| **3 · Interactivitate** | I1 căutare, I2 glosar, I3 FAQ, I4 mod pas cu pas, I5 centru alerte, I7 copiere rezultat, I8 animații (cu `prefers-reduced-motion`) | 3–5 zile | căutarea găsește orice tab din primele 3 caractere; glosarul are linkuri valide către taburi; toate controalele noaste se pot folosi din tastatură |
| **4 · Conținținut și identitate** | rescrierea textelor (§6), monogramă/favicon/titlu/meta, secțiunea „Despre", eliminarea path-ului personal din README | 2–3 zile | `grep` după §6.4 = 0; textul nu mai menționează Excel; meta description acoperă categoriile |
| **5 · Verificare și livrare** | testele node, browser `file://` (desktop + 390 px), print → PDF, CSV, apoi **publicare GitHub Pages** (card `t_c175a2f8`, acum amânat) | 1–2 zile | 145/145 teste; PDF corect; Pagini publice; link shareable |

**Total estimat:** 11–16 zile-lucru, adică **4–6 iteratii de 2–3 ore**. Se poate tăia după
etapa 2 (sidebar + categorii + căutare) și deja ai o aplicație radical mai ușor de folosit.

### 7.3 Riscuri și mitigări

| Risc | Prob. | Mitigare |
|---|---|---|
| Regresii în calcule sau în legăturile cu prefill | medie | **Nu se schimbă niciun `id`, clasă de carcasa sau `data-tip`.** Testele 145 + compararea cu Python (ca în `scratch/recalc-concepte*.py`) |
| `localStorage` — utilizatorul își pierde inputurile | medie | ID-urile rămân identice → cheile `glitchcoin-input:*` rămân valide. Dacă se adaugă taburi noi, se adaugă chei, nu se șterg |
| `@media print` se strică (34 de tabele) | medie | Re-test PDF pe 2–3 taburi lungi după fiecare etapă |
| Tabelele dinamice pe ecrane înguste | medie | Wrapper-ul existent se păstrează; se testează la 390 px după fiecare etapă |
| Sidebar-ul „iază" focusul / derutează cititorul de ecran | medie | ARIA corect (nav, `aria-current`), drawer cu focus trap, skip-link actualizat |
| Font propriu (Inter) nu se încarcă offline | mic | fallback de sistem; fontul e opțional, nu blochează |
| Animațiile derutează | mic | `prefers-reduced-motion` + doar `transform/opacity` |
| Scope creep (FAQ/glosar/„pas cu pas" pot crește) | mare | Se livrează I1+I2+I3 mai întâi; restul doar după o decizie explicită |
| Bookmark-uri/hash-uri vechi | mic | fallback `#tab` → `#categorie/tab` |
| Se pierde timp pentru că nu există git | mare | Etapa 0, obligatorie, înainte de orice edit |

### 7.4 Criterii de „gata" pentru prima versiune publică

1. Toate cele 24 de taburi funcționează identic din punct de vedere al calculelor.
2. Navigarea: sidebar pe categorii + căutare + breadcrumb + săgeți.
3. Zero referințe vizibile la Excel.
4. 390 px și 1440 px fără overflow; contrast AA; tastatură completă.
5. `node --test tests/` verde; print → PDF corect; CSV corect.

---

## 8. Ce **NU** se propune (pentru a nu crește scope-ul)

- **Fără backend, conturi, cloud, date personale** — rămâne aplicație locală (decizie din 2026-11-11).
- **Fără schimbarea formulelor** sau a valorilor implicite — redesign-ul e de organizare și de
  prezentare, nu financiar.
- **Fără reîmpachetare în React/Vite** — proiectul e static, cu 145 teste; un build-tool adaugă
  complexitate fără beneficiu.
- **Fără mutarea inputurilor în panouri cu pași** (wizard complet) — e regresc major; se face
  doar „pas cu pas" ca strat vizual (I4), păstrând layout-ul existent.
- **Fără „moduri" de temă suplimentare** (doar light/dark, ca acum).
- **Fără ștergerea taburilor** „în curând" — nu mai există.

---

## 9. Decizii care îi aparțin pe Narcis

1. **Categorii:** 6 (recomandat) sau 5 (cu „Viitor și decizii")?
2. **Prima deschidere:** „Acasă" (recomandat) sau ultimul tab activ?
3. **Paletă:** verde „registru" (recomandat) sau alt accent (cobalt)?
4. **Font:** Inter self-hosted (identitate mai puternică) sau stack de sistem (zero efort)?
5. **Interactivitate:** doar I1+I2+I3, sau și I4+I5?
6. **„Pas cu pas"** — îl vrei ca mod implicit pe taburile mari, sau doar opțional?
7. **Emoji-ul 🐴** în favicon — îl păstrăm?
8. **Publicare:** după ce etapă? (recomandat: după etapa 5; minim: după etapa 2)

---

## 10. Rezumat în 5 rânduri

1. Problema e **organizarea**, nu stilul: 24 de taburi într-un rând (3.344 px), fără ierarhie,
   fără căutare, fără „acasă".
2. Propunerea: **sidebar pe 6 categorii + căutare `⌘K` + breadcrumb + mod Concentrare**, cu
   paletă verde „registru", cifre tabulare și spațiere generoasă.
3. Interactivitate: **glosar, FAQ, mod pas cu pas, centru de alerte, simulatoare rapide**,
   în această ordine de prioritate.
4. Textul se rescie: „din Excel" → „valori implicite" + formule explicite; 9 locuri în UI,
   plus README (fără path-uri personale).
5. Migrarea e în **5 etape + etapa 0 de siguranță (`git init`)** — ~11–16 zile-lucru, cu
   criterii clare de acceptare la fiecare pas. **Nu s-a implementat nimic.**
