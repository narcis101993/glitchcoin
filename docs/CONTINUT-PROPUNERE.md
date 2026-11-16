# GlitchCoin — propunere de conținut educațional, surse și categorii

> **Status:** propunere — **nimic nu a fost implementat** (conform cerinței cardului `t_b8379653`).
> **Autor:** finance · **Data:** 2026-11-16
> **Versiune analizată:** GlitchCoin **v2.13** (24 de taburi), folderul permanent
> Rădăcina repository-ului (folderul proiectului).
> **Metodă:** citire integrală a `index.html` (3.219 linii), `app.js`, `README.md`, `CONTEXT.md`,
> `REDESIGN-PROPUNERE.md`, `AUDIT-UI-UX.md` + verificare independentă a surselor pe web
> (`web_search`, 2026-11-16). **Nicio modificare de cod, nicio implementare.**

---

## 0. Rezumat

1. **24 de lead-uri noi** — câte un text scurt (2–4 fraze) pentru fiecare tab, care explică ce
   se află acolo și de ce contează, cu linkuri către surse oficiale. Zero referințe la Excel,
   celule sau taburi interne în textul vizibil.
2. **6 categorii pedagogice** — se păstrează propunerea din `REDESIGN-PROPUNERE.md` (§4),
   cu justificare explicită per categorie și ordine logică de învățare (nu istorică).
3. **Conținut suplimentar** — glosar (~35 termeni), „Știai că...?", întrebări frecvente,
   mituri frecvente cu demontare, „de ce contează pentru tine".
4. **Surse verificate** — liste consolidate pe tipuri (instituții, legislație, presă,
   educație publică), cu linkuri reale, verificate pe 2026-11-16.

**Nu se atinge:** calculele, ID-urile inputurilor, tabelele dinamice, legăturile cu prefill
între taburi, `localStorage`, print/CSV, testele (145). Propunerea e de **conținut și
organizare**, nu de motor.

---

## 1. Ton și principii editoriale

**Publicul:** români care încep să înțeleagă banii — nu contabili. Nivel de plecare:
școală generală, fără presupuneri de jargon.

| # | Regulă | De ce |
|---|--------|-------|
| T1 | **Românește, persoana a II-a singular („tu").** Fără „utilizatorul", fără pasiv. | Sună ca o conversație, nu ca un manual. |
| T2 | **2–4 fraze scurte**, apoi detalii doar dacă sunt necesare. | Ecranul e mic; atenția e scurtă. |
| T3 | **Un concept nou = explicat pe loc**, în paranteză sau într-o propoziție. Ex.: „deflator (factor prin care o sumă veche se aduce la prețurile de astăzi)". | Termenii tehnici rămân utili, dar nu sunt barieră. |
| T4 | **Zero referințe la Excel, celule (`D9`), fișiere (`GlitchCoin.xlsx`) sau „tab ascuns" în textul vizibil.** Se spune „valori implicite", „scenariu avansat", „formula". | Utilizatorul nu trebuie să știe că aplicația a apărut dintr-un Excel. |
| T5 | **O propoziție cu „de ce contează"** la finalul fiecărui lead. | Trece de la „ce e" la „ce înseamnă pentru mine". |
| T6 | **Surse cu link, inline**, sub formă de [text](url). Doar surse reale. | Verificabilitate; utilizatorul poate aprofunda subiectul. |
| T7 | **Nu e recomandare personalizată.** Fiecare lead se încheie cu un cadru de decizie, nu cu „cumpără/vinde". | Aplicația e educațională, nu un serviciu de consultanță. |
| T8 | **Cifrele cu sursă.** Orice valoare din text (inflație, salariu mediu, cotă de impozit) are link. | Utilizatorul verifică singur; crește încrederea. |

**Exemple de ton:**

- „Fondul de urgență acoperă 3–6 luni de cheltuieli esențiale dacă venitul se oprește."
- „Inflația e inamicul tăcut al economiilor: un randament nominal bun poate fi un randament real negativ."

---

## 2. Categorii — 24 de taburi, 6 grupuri

Se păstrează integral propunerea lui dev (`REDESIGN-PROPUNERE.md`, §4), fără ajustări:
**„Sumă dorită"** și **„Costul oportunității"** rămân la Investiții — amândouă sunt calculatoare
de randament/pe termen lung, nu de protecție.

### 2.1 Maparea completă

| # | Tab | Categorie | Întrebarea pe care o răspunde |
|---|-----|-----------|-------------------------------|
| 1 | Inflație | **Fundamentele banilor** | „De ce banii își pierd valoarea?" |
| 2 | Calculul dobânzii | **Fundamentele banilor** | „Care e prețul banilor împrumutați?" |
| 3 | Dobânda compusă | **Fundamentele banilor** | „Cum crește banul când dobânda lucrează pentru el?" |
| 4 | Dobândă vs inflație | **Fundamentele banilor** | „Ce rămâne din randament după inflație?" |
| 5 | Regula 72 | **Fundamentele banilor** | „Cât durează până îmi dublez banii?" |
| 6 | Timp vs dorințe | **Bugetul de zi cu zi** | „Cât timp munce
ști pentru ceea ce îți dorești?" |
| 7 | Nu am bani | **Bugetul de zi cu zi** | „Cum se mișcă banii lunii, cu facturi la scadență?" |
| 8 | Buget 50/30/20 | **Bugetul de zi cu zi** | „Cum îmi repartizez venitul?" |
| 9 | Fond de urgență | **Bugetul de zi cu zi** | „Cât să rețin pentru imprevist?" |
| 10 | Sănătate financiară | **Bugetul de zi cu zi** | „Care e starea mea de ansamblu?" |
| 11 | Randament | **Investiții** | „Cu cât s-a multiplicat banul investit?" |
| 12 | Profit | **Investiții** | „Câți bani rămân dintr-o tranzacție?" |
| 13 | Costul mediu de achiziție | **Investiții** | „La ce preț mediu am construit poziția?" |
| 14 | Sumă dorită | **Investiții** | „Cât să economisesc lunar pentru o țintă?" |
| 15 | Costul oportunității | **Investiții** | „Ce pierd când aleg cash în loc de investiție?" |
| 16 | Scalarea în timp (DCA) | **Investiții** | „E mai bine să investesc lunar sau o dată?" |
| 17 | Curs de schimb | **Investiții** | „Cum afectează valuta randamentul în RON?" |
| 18 | Diversificare și riscul | **Risc și protecție** | „Cum reduc volatilitatea fără să sacrific randamentul?" |
| 19 | Asigurări | **Risc și protecție** | „Când să plătesc prima, când să mă auto-asigur?" |
| 20 | Stress test | **Risc și protecție** | „Unde se rupe planul într-un scenariu rău?" |
| 21 | Datorii bune vs rele | **Risc și protecție** | „Să creditez sau să economisesc — care e pragul?" |
| 22 | Impozitare pe investiții | **Impozite și viitor** | „Ce ia statul din câștigurile din investiții?" |
| 23 | Pensie / Pilon III | **Impozite și viitor** | „Ce acumulez pe un orizont de 20–30 de ani?" |
| 24 | Biaseuri comportamentale | **Psihologia banilor** | „De ce iau decizii proaste cu banii?" |

**Total:** Fundamentele 5 · Bugetul 5 · Investițiile 7 · Riscul 4 · Impozitele 2 · Psihologia 1 = **24**.

> Numerotarea de mai sus urmează ordinea din sidebar (pe categorii). Secțiunile din §3 sunt numerotate după ordinea din aplicație (`const TABS` din `app.js`), ca să corespundă direct implementării.

### 2.2 Justificarea pedagogică

| Categorie | Taburi | Întrebarea centrală | De ce e grupul potrivit |
|-----------|--------|---------------------|-------------------------|
| **Fundamentele banilor** | 5 | „Ce se întâmplă cu valoarea banilor în timp?" | Sunt concepte abstracte, fără portofoliu și fără date de piață. Se învață mai ușor înainte de orice altceva, ca o alfabetizare numerică. |
| **Bugetul de zi cu zi** | 5 | „Cum-mi organizez ce câștig și ce cheltuiesc lunar?" | Toate pornesc de la venit/cheltuieli reale ale utilizatorului; efectul e imediat și vizibil în viața lui. |
| **Investițiile** | 7 | „Cum câștig și cum intr în piață?" | Un bloc coerent: randament → tranzacție → poziție → țintă → cash vs investiție → DCA → valută. Se construiește logic unul peste altul. |
| **Risc și protecție** | 4 | „Ce se întâmplă dacă eșuează?" | Volatilitate, evenimente, reziliență și datorii — toate răspund la „dar dacă o meargă prost". |
| **Impozite și viitor** | 2 | „Ce plătesc și ce acumulez pe termen foarte lung?" | Două taburi, dar dense: fiscalitatea și pensia pe 20–30 de ani. Se deschid natural la finalul cunoașterii pieței. |
| **Psihologia banilor** | 1 | „De ce iau decizii proaste cu banii?" | Nu e calculator, ci o lectură. Se deschide cel mai bine după ce ai văzut cum funcționează cifrele. |

### 2.3 Ordinea din sidebar

Ordinea din categorii nu mai e ordinea istorică (Excel + adăugări). E o **cale de învățare**:
fundamente → buget personal → investiții → risc → impozite/viitor → psihologie. Se păstrează
suportul pentru hash-urile vechi (`#inflatie`, `#regula72` etc.) și pentru legăturile cu prefill.

### 2.4 Variantă alternativă (5 categorii)

Varianta de la `REDESIGN-PROPUNERE.md` §4.3 combină „Impozite și viitor" + „Psihologia banilor"
în „Viitor și decizii". **Recomandare: rămânem la 6.** Motive: (a) psihologia are ton și
conținut diferit — o lectură, nu un calculator; (b) 24 de taburi în 6 grupuri = ~4 taburi
per categorie, sub plafonul de 7±2 de elemente reținute; (c) 5 categorii ar concentra 3
taburi heterogene (impozit, pensie, biaseuri) într-un singur grup.

---

## 3. Descriere per tab — 24 de lead-uri propuse

Regula pentru fiecare secțiune: **Lead propus** (textul care înlocuiește lead-ul actual),
**De ce contează**, **Surse**, iar acolo unde e cazul **De rescris** (referințe Excel).

### 1. Inflație — `panel-inflatie`

**Lead propus:**

> Banii își pierd valoarea în timp: același coș de cumpărături costă din ce în ce mai mult. Vezi prețul la 10 alimente de bază între 2020 și 2026, inflația anuală din 1991 până astăzi și cât îi va trebui peste câțiva ani pentru a cumpara aceleași lucruri.

**De ce contează:** e prima lecție de educație financiară — dacă inflația e mai mare decât dobânda la care îți pui banii, îți scade puterea de cumpărare.

**Surse:** [INS — IPC, serie anuală](https://insse.ro/cms/ro/content/ipc%E2%80%93serie-de-date-anuala) · [Eurostat — HICP România](https://ec.europa.eu/eurostat/databrowser/product/view/prc_hicp_aind) · [BNR — Raportul asupra inflației](https://www.bnr.ro/) · [InfoCons — prețuri alimente](https://infocons.ro/)

**De rescris:** linia de stare vizibilă „Tabul Inflație este gata: simulator…" → înlocuită cu lead-ul de mai sus (nu mai e un mesaj intern de status).

### 2. Timp vs dorințe — `panel-timp`

**Lead propus:**

> Cât timp trebuie să muncești pentru ceea ce îți dorești? Introdu venitul lunar net și prețul dorinței — primești minute, ore și zile din viața ta (24 de ore pe zi) sau ore și zile lucrate (8 ore pe zi).

**De ce contează:** transformă prețurile în timp real lucrat și arată ce reprezintă o dorință din venitul tău.

**Surse:** [INS — câștiguri salariale, serie anuală](https://insse.ro/cms/en/content/earnings-1938-annual-series-0) · [BNR — studii și date economice](https://www.bnr.ro/)

**De rescris:** „Calculele sunt identice cu tabul „Timp vs dorințe" din GlitchCoin.xlsx" → eliminat; inputul „Zile lucrătoare / an" rămâne (implicit 248, România 2025), cu nota metodologică.

### 3. Calculul dobânzii — `panel-dobanda`

**Lead propus:**

> Dobânda este prețul banilor împrumutați: ce primești când depozitezi, și ce plătești când iei credit. Introdu sumă, rată anuală și numărul de zile — calculează dobânda brută și netă după impozit.

**De ce contează:** e formula de bază pentru depozite, credite și obligațiuni; fără ea nu înțelegi niciun alt calculator din aplicație.

**Surse:** [BNR — statistici și politica monetară](https://www.bnr.ro/) · [ANPC — informații standard pentru creditul de consumatori (DAE)](https://www.anpc.ro/anpcftp/legislatie/100609/anexa2_inf_standard_credit_consumatori.pdf)

**De rescris:** „la fel ca în tabul „Calculul dobânzii" din GlitchCoin.xlsx" → eliminat.

### 4. Dobânda compusă — `panel-compusa`

**Lead propus:**

> La compunere, dobânda de fiecare perioadă se adaugă la sumă și ea însăși produce dobândă. Introdu sumă inițială, contribuție lunară și rată anuală — vezi evoluția pe 20 de ani, cu și fără aport lunar.

**De ce contează:** arată de ce timpul e ingredientul decisiv al investiției: diferența dintre randament și compunere devine vizibilă abia pe orizont lung.

**Surse:** [BNR — politica monetară și dobânzi](https://www.bnr.ro/) · matematică standard (fără sursă externă necesară)

**De rescris:** „la fel ca în tabul „Dobânda compusă" din GlitchCoin.xlsx" → eliminat.

### 5. Randament — `panel-randament`

**Lead propus:**

> Randamentul spune cu cât s-a multiplicat banul investit. Calculează randamentul brut, net (după impozit și comisioane) și real (în raport cu inflația) — și alege tipul de venit pentru o impozitare corectă.

**De ce contează:** randamentul real, nu cel nominal, decide dacă ai câștigat cu adevărat.

**Surse:** [BVB — Bursa de Valori București](https://www.bvb.ro/) · [PwC Tax Summaries — România](https://taxsummaries.pwc.com/romania/individual/significant-developments) · [money.ro — brokeri autorizați](https://www.money.ro/invata/brokeri-autorizati)

**De rescris:** „la fel ca în tabul „Randament" din GlitchCoin.xlsx" → eliminat.

### 6. Profit — `panel-profit`

**Lead propus:**

> Profitul este diferența dintre prețul de vânzare și prețul de achiziție. Introdu suma investită, prețul inițial/mediu și prețul de vânzare — obții valoarea finală, profitul brut și net și randamentul real.

**De ce contează:** arată ce rămâne efectiv în buzunar după o tranzacție, nu doar „pe hârtie".

**Surse:** [BVB — acțiuni](https://www.bvb.ro/FinancialInstruments/Markets/Shares) · [EY — romanian tax changes](https://www.ey.com/en_gl/technical/tax-alerts/romanian-tax-changes-introduced-by-new-fiscal-and-budgetary-measures) · [INS — inflație](https://insse.ro/cms/en/content/cpi-annual-data-series)

**De rescris:** „la fel ca în tabul „Profit" din GlitchCoin.xlsx" → eliminat.

### 7. Costul mediu de achiziție — `panel-cost`

**Lead propus:**

> Când cumperi în mai multe tranșe, prețul contabil nu e ultimul preț, ci media ponderată a tuturor achizițiilor. Adaugă rânduri cu preț, cantitate și comision — vezi costul mediu și valoarea totală plătită.

**De ce contează:** determină câștigul/pierderea reală la vânzare și arată cât te costă comisionul.

**Surse:** [BVB — tranzacționare și statistici](https://www.bvb.ro/) · [wall-street.ro — costul tranzacțiilor](https://www.wall-street.ro/articol/Money/201325/cat-te-costa-sa-cumperi-actiuni-pe-bursa-si-care-sunt-sumele-minime-de-care-ai-nevoie.html) · [money.ro — brokeri autorizați](https://www.money.ro/invata/brokeri-autorizati)

**De rescris:** „la fel ca în tabul „Costul mediu" din GlitchCoin.xlsx" → eliminat; nota „ca în Excel" → „(baza e suma plătită, nu doar prețul)".

### 8. Sumă dorită — `panel-suma`

**Lead propus:**

> Stabilește o sumă țintă și află cât trebuie să economisești în fiecare lună pentru a o atinge. Introdu randamentul anual, numărul de ani, suma inițială și ținta — primești rata lunară necesară și cât din ea e economisit vs. dobândă.

**De ce contează:** convertește un obiectiv numeric într-o obligație lunară reală; prima formă de planificare pe termen lung.

**Surse:** [BNR — politica monetară și dobânzi](https://www.bnr.ro/) · [ASF — ghiduri pensii private](https://asfromania.ro/app.php/ro/a/1686/ghiduri-pensii-private)

**De rescris:** „la fel ca în tabul „Sumă dorită" din GlitchCoin.xlsx" → eliminat; formula se scrie explicit (`-PMT(randament/12, ani×12, sumă inițială, sumă dorită)`), nu printr-o referință la o celulă.

### 9. Nu am bani — `panel-nuam`

**Lead propus:**

> Un scenariu avansat de flux de numerar: primești venitul într-o zi din lună și plătești facturile la scadență. Vezi soldul zilnic, cum acționează inflația și dobânda și dacă la final rămâi cu un rest sau cu un deficit.

**De ce contează:** arată că contul nu e doar suma de pe hârtie — momentul în care intră și iese banul contează.

**Surse:** [ANPC — drepturi și obligații la credit](https://www.anpc.ro/anpcftp/legislatie/100609/anexa2_inf_standard_credit_consumatori.pdf) · [BNR — dobânzi și statistici](https://www.bnr.ro/)

**De rescris:** „**Tabul ascuns din Excel**: vezi ce se întâmplă…" → „Scenariu avansat — flux de numerar zilnic". Se elimină și nota „identică cu `D9` din tabul „Sumă dorită" din Excel".

### 10. Dobândă vs inflație — `panel-di`

**Lead propus:**

> Randamentul nominal spune cu câți bani mai mulți termini; randamentul real spune ce poți cumpăra mai mult. Introdu randamentul și inflația — află ce rămâne după inflație, cu exemple reale din 2000–2025 și comparația cash vs investiție pe 26 de ani.

**De ce contează:** inflația e inamicul tăcut al economiilor — un randament nominal bun poate fi un randament real negativ.

**Surse:** [INS — IPC](https://insse.ro/cms/en/content/cpi-annual-data-series) · [ECB Data Portal — HICP România](https://data.ecb.europa.eu/data/datasets/HICP/HICP.M.RO.N.000000.4D0.ANR) · [BNR](https://www.bnr.ro/)

**De rescris:** „Completează tabul „Randament"" → „Leagă de calculatorul „Randament" pentru a vedea întreaga imagine."

### 11. Regula 72 — `panel-regula72`

**Lead propus:**

> O scurtătură mentală cu 500 de ani: împarte 72 la rata anuală de randament și obții numărul aproximativ de ani în care îți dublezi banii. Setează rata și suma — vezi dublarea exactă și estimarea prin regulă, pentru rate de la 1% la 15%.

**De ce contează:** îți dă rapid ce rată ai nevoie pentru un obiectiv, fără calcule complicate.

**Surse:** [Luca Pacioli, Summa de arithmetica (1494) — „Rule of 72"](https://en.wikipedia.org/wiki/Rule_of_72) · [BNR — dobânzi](https://www.bnr.ro/)

**De rescris:** „E complementară tabului „Dobânda compusă"." → „Se completează cu calculatorul „Dobânda compusă"."

### 12. Fond de urgență — `panel-fond`

**Lead propus:**

> Rezerva de 3–6 luni de cheltuieli esențiale te protejează dacă venitul se oprește. Introdu cheltuielile lunare esențiale și perioada acoperită — calculează ținta, cât îți aduce dobânda și cât timp îți ia până la ea, cu un tabel comparativ unde o poți ține.

**De ce contează:** e primul pas obligatoriu în orice plan financiar — fără rezervă, orice imprevist devine credit.

**Surse:** [CFPB — ghid pentru fondul de urgență](https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/) · [BNR — dobânzi](https://www.bnr.ro/)

**De rescris:** textul actual e deja bun; se adaugă o frază scurtă despre „unde îl ții" (cont Economii / depozit), fără jargon.

### 13. Costul oportunității — `panel-oportunitate`

**Lead propus:**

> Fiecare alegere are un preț ascuns: ceea ce renunți să faci cu acea sumă. Compară bani în cont curent cu bani investiți — randament net compus, putere de cumpărare și costul de oportunitate pe care îl plătește cash-ul.

**De ce contează:** îți arată că „a ține cash" nu e gratis — inflația și randamentul renunțat au un cost, uneori mai mare decât riscul investiției.

**Surse:** [Econlib — opportunity cost](https://www.econlib.org/library/Topics/College/opportunitycost.html) · [BNR — dobânzi](https://www.bnr.ro/)

**De rescris:** „Completează tabul „Nu am bani" cu contrapartida de investiție." → „Se leagă de scenariul „Nu am bani" pentru contrapartida de investiție."

### 14. Buget 50/30/20 — `panel-buget`

**Lead propus:**

> Regula 50/30/20 împarte venitul lunar net în trei categorii: 50% nevoi, 30% dorințe, 20% economii. Introdu ce cheltuiești efectual — vezi abaterile față de țintă, alarmele bugetului și câte zile și ore lucrate costă fiecare dorință.

**De ce contează:** îți dă o imagine rapidă asupra echilibrului din viața ta financiară, nu doar un buget pe hârtie.

**Surse:** [Elizabeth Warren & Amelia Warren Tyagi, „All Your Worth" (2005) — explicat de Prudential](https://www.prudential.com/financial-education/budgeting-50-30-20-rule) · [INS — câștiguri salariale](https://insse.ro/cms/en/content/earnings-1938-annual-series-0)

**De rescris:** textul actual e deja bun; se aliniază tonul („Introdu ce cheltuiești efectual").

### 15. Sănătate financiară — `panel-sanatate`

**Lead propus:**

> Patru indicatori care îți dau o imagine de ansamblu: rată de economii, datorii raportate la venit, rezerva de 3–6 luni și net worth (averea ta). Fiecare are un prag și o alarmă, cu legături rapide către fondul de urgență și buget.

**De ce contează:** e tabloul de bord personal — îți arată dacă mergi bine sau dacă ai un punct slab, fără să te îndatorări pentru asta.

**Surse:** [BNR — Raport asupra stabilității financiare, iunie 2026](https://www.bnr.ro/uploads/2026-07-06raportasuprastabilitatiifinanciare-iunie2026_documentpdf_545_1783339608.pdf) · [CFPB — emergency fund](https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/) · [INS — venituri](https://insse.ro/cms/en/content/earnings-1938-annual-series-0)

**De rescris:** textul actual e deja bun; se menționează că pragurile sunt orientative, nu reglementări.

### 16. Diversificare și riscul — `panel-diversificare`

**Lead propus:**

> Nu pune toți banii într-o singură acțiune. Introdu active, ponderi și corelația dintre ele — vezi randamentul, volatilitatea, randamentul ajustat la risc și o simulare Monte Carlo pe 5 ani, cu scenarii de la −3σ la +3σ.

**De ce contează:** riscul unei investiții nu se măsoară doar prin volatilitatea ei, ci prin contribuția ei la riscul întregului portofoliu.

**Surse:** [Nobel Prize 1990 — Harry Markowitz, teoria portofoliului](https://www.nobelprize.org/prizes/economic-sciences/1990/press-release/) · [BVB — componența BET-XT](https://m.bvb.ro/FinancialInstruments/Indices/IndicesProfiles.aspx?i=BET-XT)

**De rescris:** textul actual e deja bun; se precizează că „corelația" = în ce măsură activele se mișcă împreună.

### 17. Asigurări — `panel-asigurari`

**Lead propus:**

> Asigurarea e transferul unui risc către altcineva, contra unei prime; auto-asigurarea înseamnă că îți rezervi banii pentru o pierdere posibilă. Compară cele două pentru sănătate, casă și mașină — vezi costul total cu dobândă și probabilitatea de cel puțin un eveniment.

**De ce contează:** îți arată când are sens să plătești prima și când să reții riscul — decizia depinde de probabilitate, nu de emoție.

**Surse:** [ASF — reglementarea asigurărilor (Legea nr. 237/2015)](https://www.asfromania.ro/ro/a/159/autorizare-societ%C4%83%C8%9Bi-de-asigurare-%C8%99i/-sau-reasigurare) · [ANPC — drepturi ale consumatorilor](https://www.anpc.ro/)

**De rescris:** textul actual e deja bun; se adaugă o frază despre lanțul de decizie (probabilitate × impact).

### 18. Stress test — `panel-stres`

**Lead propus:**

> Un calcul optimist spune cât poți câștiga; un stress test spune cât poți pierde. Introdu venitul, cheltuielile, rezerva și activele, apoi aplică scenarii dure — inflație 10%, scădere a venitului, randament negativ — și vezi unde se rupe planul.

**De ce contează:** îți pregătește bugetul și portofoliul pentru scenarii care vor veni, dar nu știi când.

**Surse:** [BNR — Raport asupra stabilității financiare, iunie 2026 (testarea la stres a sectorului bancar)](https://www.bnr.ro/uploads/2026-07-06raportasuprastabilitatiifinanciare-iunie2026_documentpdf_545_1783339608.pdf) · [CFPB — fond de urgență](https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/)

**De rescris:** textul actual e deja bun; se menționează că scenariile sunt ilustrative, nu predicții.

### 19. Pensie / Pilon III — `panel-pensie`

**Lead propus:**

> Pilonul III e pensie facultativă, pe un orizont de 20–30 de ani: contribuții lunare, randament compus, comisioane de administrare și impozit doar pe câștig la retragere. Introdu contribuția și randamentul — vezi cât se acumulează, cât costă timpul și cât mănâncă comisioanele.

**De ce contează:** pe termen foarte lung, diferența de 1–2% în comisioane sau randament poate valora ori câteva mii de lei în plus la pensionare.

**Surse:** [ASF — Pilonul III (Legea nr. 204/2006)](https://asfromania.ro/en/a/1380/pilon-iii) · [ASF — ghiduri pensii private](https://asfromania.ro/app.php/ro/a/1686/ghiduri-pensii-private) · [ASF — document Pilon III](https://asfromania.ro/files/pilon_III.pdf)

**De rescris:** textul actual e deja bun; se precizează că scenariile Istoric/Conservator/Optimist sunt ilustrative.

### 20. Impozitare pe investiții — `panel-impozitare`

**Lead propus:**

> Câți bani îți ia statul din fiecare tip de venit din investiții — și cum se aplică. Tabelul e factual (România, 2025 → 2026), nu o recomandare: alege venitul, anul și introdu câștigul pentru a vedea impozitul și ce rămâne net.

**De ce contează:** impozitul reduce randamentul real; aici vezi exact cât plătești înainte să iei decizia.

**Surse:** [ANAF — Codul fiscal, Legea nr. 227/2015](http://static.anaf.ro/static/10/Anaf/legislatie/L_227_2015.htm) · [PwC Tax Summaries — România](https://taxsummaries.pwc.com/romania/individual/significant-developments) · [EY — romanian tax changes](https://www.ey.com/en_gl/technical/tax-alerts/romanian-tax-changes-introduced-by-new-fiscal-and-budgetary-measures)

**De rescris:** textul actual e deja bun; se adaugă o notă scurtă că normativele se schimbă anual — verifică sursa oficială.

### 21. Datorii bune vs rele — `panel-datorii`

**Lead propus:**

> O datorie nu e automat „rea": contează dobânda față de randamentul pe care ți-l poți face altfel. Introdu creditul și dobânda la economii — vezi costul total al creditului, dobânda pe care o economisești anticipând și cât ai câștiga punând aceeași sumă la economii.

**De ce contează:** există un prag clar de indiferență — sub el, anticiparea are sens; deasupra, poate fi mai bine să plătești mai încet.

**Surse:** [ANPC — informații standard pentru creditul de consumatori (DAE)](https://www.anpc.ro/anpcftp/legislatie/100609/anexa2_inf_standard_credit_consumatori.pdf) · [BNR — dobânzi și statistici](https://www.bnr.ro/)

**De rescris:** textul actual e deja bun; se menționează că pragul e orientativ, nu o regulă universală.

### 22. Scalarea în timp (DCA) — `panel-dca`

**Lead propus:**

> Scalarea în timp (DCA, dollar-cost averaging) înseamnă să investești o sumă fixă în fiecare lună, indiferent de preț. Compară cu investirea integrală din start: vezi prețul mediu pe care îl plătești, volatilitatea și câștigul fiecărei strategii în patru scenarii de preț.

**De ce contează:** e o decizie mai mult psihologică decât matematică — DCA reduce teama de a intra la vârf, dar poate costa randament pe termen lung.

**Surse:** [Vanguard Research — DCA vs. investire integrală](https://investor.vanguard.com/investor-resources-education/online-trading/dollar-cost-averaging-vs-lump-sum) · [BVB — date de tranzacționare](https://www.bvb.ro/)

**De rescris:** textul actual e deja bun; se menționează explicit că DCA nu „bate" sistematic investirea integrală.

### 23. Curs de schimb — `panel-curs`

**Lead propus:**

> Un activ în valută străină are două surse de randament: performanța activului și evoluția cursului. Acesta arată cum devine randamentul când îl schimbi în RON, ce rămâne după inflație — și cum o depreciere a leului atinge prețurile importurilor.

**De ce contează:** dacă ai bani în valută sau cheltuiești pe importuri, cursul e al treilea factor al randamentului tău real.

**Surse:** [BNR — cursul de schimb, serii zilnice](https://www.bnr.ro/report?cid=668&type=1) · [ECB Data Portal — date HICP România](https://data.ecb.europa.eu/data/datasets/HICP/HICP.M.RO.N.000000.4D0.ANR)

**De rescris:** textul actual e deja bun; se adaugă o scurtă definiție a „randamentului valutar".

### 24. Biaseuri comportamentale — `panel-biase`

**Lead propus:**

> Calculele „grele" dau greș adesea nu din cauza cifrelor, ci din cauza reflexelor. Aceste cinci tendințe explică de ce deciziile financiare se îndepărtează de rațional — și ce poți face ca să le reduci.

**De ce contează:** recunoașterea bias-ului e primul pas pentru decizii mai bune; testul rapid îți arată unde ești expus.

**Surse:** [Nobel Prize 2002 — Kahneman & Tversky, teoria perspectivii (prospect theory)](https://www.nobelprize.org/prizes/economic-sciences/2002/popular-information/) · [Nobel Prize 1990 — teoria portofoliului](https://www.nobelprize.org/prizes/economic-sciences/1990/press-release/)

**De rescris:** textul actual e deja bun; se precizează că „bias" = tendință sistematică de înțelegere greșită.

---

## 4. Conținut suplimentar

### 4.1 Glosar — ~40 de termeni

Format propus: tabelă cu trei coloane (Termen · Definiție scurtă · Tab relevant), căutabilă și
cu linkuri către taburi. Se păstrează termenii în engleză acolo unde sunt obișnuite
(ETF, DCA, net worth).

| Termen | Definiție scurtă | Tab |
|--------|------------------|-----|
| **Dobândă** | plata pentru folosirea banilor împrumutați | [Calculul dobânzii](#3-calculul-dobânzii--panel-dobanda) |
| **Dobândă compusă** | dobânda calculată și pe dobânda anterioară | [Dobânda compusă](#4-dobânda-compusă--panel-compusa) |
| **Deflator** | factor care aduce o sumă veche la prețurile de astăzi | [Inflație](#1-inflație--panel-inflatie) |
| **Inflație** | creșterea generală a prețurilor, în % pe an | [Inflație](#1-inflație--panel-inflatie) |
| **Randament nominal** | procentul de creștere a banilor, fără inflație | [Dobândă vs inflație](#10-dobândă-vs-inflație--panel-di) |
| **Randament real** | randamentul după inflație; ce poți cumpăra efectiv | [Dobândă vs inflație](#10-dobândă-vs-inflație--panel-di) |
| **Randament ajustat la risc** | randament raportat la volatilitate | [Diversificare](#16-diversificare-și-riscul--panel-diversificare) |
| **Volatilitate** | cât de mult și de repede variază prețul/randamentul | [Diversificare](#16-diversificare-și-riscul--panel-diversificare) |
| **Corelație** | în ce măsură două active se mișcă împreună (0 = independent, 1 = identic) | [Diversificare](#16-diversificare-și-riscul--panel-diversificare) |
| **Simulare Monte Carlo** | repetarea uneiași situații cu valori aleatoare, de mii de ori | [Diversificare](#16-diversificare-și-riscul--panel-diversificare) |
| **Drawdown** | scăderea maximă de la un vârf la un punct jos | [Diversificare](#16-diversificare-și-riscul--panel-diversificare) |
| **DCA** | investirea unei sume fixe la intervale regulate | [Scalarea în timp](#22-scalarea-în-timp-dca--panel-dca) |
| **Cost mediu de achiziție** | media ponderată a prețurilor plătite | [Costul mediu](#7-costul-mediu-de-achiziție--panel-cost) |
| **Comision** | taxa brokerului/platformei pe tranzacție | [Randament](#5-randament--panel-randament) |
| **Net worth (avere netă)** | active minus datorii | [Sănătate financiară](#15-sănătate-financiară--panel-sanatate) |
| **Rată de economii** | ce parte din venitul lunar e economisită | [Sănătate financiară](#15-sănătate-financiară--panel-sanatate) |
| **Datorii / venit** | ponderea datoriilor în venit | [Sănătate financiară](#15-sănătate-financiară--panel-sanatate) |
| **Fond de urgență** | rezerva de 3–6 luni de cheltuieli esențiale | [Fond de urgență](#12-fond-de-urgență--panel-fond) |
| **Anuitate** | rata lunară fixă a unui credit | [Datorii](#21-datorii-bune-vs-rele--panel-datorii) |
| **DAE** | dobânda anuală efectivă — costul total al creditului, anualizat | [Datorii](#21-datorii-bune-vs-rele--panel-datorii) |
| **Rambursare anticipată** | plata creditului mai devreme decât programat | [Datorii](#21-datorii-bune-vs-rele--panel-datorii) |
| **Cost de oportunitate** | valoarea celei mai bune alternative la care renunți | [Costul oportunității](#13-costul-oportunității--panel-oportunitate) |
| **Pilon III** | pensie facultativă, administrată privat, cu conturi individuale | [Pensie](#19-pensie--pilon-iii--panel-pensie) |
| **Comisie de administrare** | comisionul luat de fond pe an de administrare | [Pensie](#19-pensie--pilon-iii--panel-pensie) |
| **Impozit pe câștig** | taxa statului pe venitul din investiții | [Impozitare](#20-impozitare-pe-investiții--panel-impozitare) |
| **Baza de impozitare** | partea venitului asupra căreia se aplică impozitul | [Impozitare](#20-impozitare-pe-investiții--panel-impozitare) |
| **Dividend** | partea din profitul unei companii distribuită acționarilor | [Impozitare](#20-impozitare-pe-investiții--panel-impozitare) |
| **Curs de schimb** | câte lei pentru o unitate de valută străină | [Curs de schimb](#23-curs-de-schimb--panel-curs) |
| **Risc valutar** | riscul ca cursul să varieze și să afecteze randamentul în RON | [Curs de schimb](#23-curs-de-schimb--panel-curs) |
| **Asigurare** | transferul unui risc către asigurător contra unei prime | [Asigurări](#17-asigurări--panel-asigurari) |
| **Auto-asigurare** | reținerea riscului pentru tine, cu o rezervă proprie | [Asigurări](#17-asigurări--panel-asigurari) |
| **Primă de asigurare** | plata periodică pentru transferul riscului | [Asigurări](#17-asigurări--panel-asigurari) |
| **Probabilitate de eveniment** | șansele ca un risc să se materializeze | [Asigurări](#17-asigurări--panel-asigurari) |
| **Ancorare** | te agați de primul număr văzut și ajustezi greu | [Biaseuri](#24-biaseuri-comportamentale--panel-biase) |
| **Cont mental** | banii din surse diferite par să aibă reguli diferite | [Biaseuri](#24-biaseuri-comportamentale--panel-biase) |
| **Aversiune la pierdere** | suferința de la o pierdere e mai mare decât bucuria de la un câștig egal | [Biaseuri](#24-biaseuri-comportamentale--panel-biase) |
| **FOMO** | teama de a rata o oportunitate | [Biaseuri](#24-biaseuri-comportamentale--panel-biase) |
| **Efect de cadru** | decizia schimbă în funcție de cum e prezentată opțiunea | [Biaseuri](#24-biaseuri-comportamentale--panel-biase) |
| **Regula 72** | estimare a numărului de ani de dublare a banilor | [Regula 72](#11-regula-72--panel-regula72) |

### 4.2 „Știai că...?" — 12 fapte cu sursă

Format propus: carduri mici (iconiță + 1–2 fraze + link „Sursă"), afișate pe Acasă sau la finalul fiecărui tab relevant.

1. **Inflația anuală în România a fost de 170,2% în 1991 și de 45,7% în 2000**; în 2015 și 2016 a existat deflație (−0,6%, −1,5%). — [INS — IPC, serie anuală](https://insse.ro/cms/ro/content/ipc%E2%80%93serie-de-date-anuala)
2. **Din 1.000 lei din 2000, în 2025 ai avea nevoie de aproape 8.653 lei** pentru aceeași putere de cumpărare. — calculat din [seria INS](https://insse.ro/cms/en/content/cpi-annual-data-series)
3. **Regula 72 apare prima dată scrisă în 1494**, la Luca Pacioli, în *Summa de arithmetica* — și nici atunci nu a fost demonstrată, ci doar enunțată. — [Rule of 72](https://en.wikipedia.org/wiki/Rule_of_72)
4. **La 7% pe an, banii se dublează în ~10,3 ani** — și regula 72 dă același rezultat (72 ÷ 7 ≈ 10,3). — matematică standard
5. **Fondul de urgență recomandat acoperă 3–6 luni de cheltuieli esențiale**, nu venituri. — [CFPB](https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/)
6. **DAE-ul (dobânda anuală efectivă) include toate costurile creditului**, nu doar dobânda de bază — de aceea e singura cifră comparabilă între oferte. — [ANPC](https://www.anpc.ro/anpcftp/legislatie/100609/anexa2_inf_standard_credit_consumatori.pdf)
7. **Investirea integrală a depășit cost averaging în 61,6–73,7% din cazuri** pe date Vanguard 1976–2022 — dar DCA reduce riscul psihologic de abandonează planul. — [Vanguard Research](https://investor.vanguard.com/investor-resources-education/online-trading/dollar-cost-averaging-vs-lump-sum)
8. **În Pilonul III poți contribui cu până la 15% din venitul brut lunar**. — [ASF — ghiduri pensii private](https://asfromania.ro/app.php/ro/a/1686/ghiduri-pensii-private)
9. **Corelația redusă între active reduce riscul portofoliului** fără a reduce neapărat randamentul așteptat. — [Nobel Prize 1990 — Markowitz](https://www.nobelprize.org/prizes/economic-sciences/1990/press-release/)
10. **Din 2026, impozitul pe câștigul din valori mobiliare prin broker RO cu detenere ≥ 365 zile e de 3%** (era 1% în 2025). Verifică sursa oficială înainte de decizie. — [PwC Tax Summaries](https://taxsummaries.pwc.com/romania/individual/significant-developments)
11. **Ancorarea: primul preț văzut devine punct de referință**, chiar dacă e complet arbitrar. — [Nobel Prize 2002 — Kahneman & Tversky](https://www.nobelprize.org/prizes/economic-sciences/2002/popular-information/)
12. **DAE-ul se bazează pe valoarea actualizată a tuturor fluxurilor** (trageri, rambursări, costuri) pe un an. — [ANPC](https://www.anpc.ro/anpcftp/legislatie/100609/anexa2_inf_standard_credit_consumatori.pdf)

### 4.3 Întrebări frecvente — 12 întrebări

Format propus: listă cu întrebare, răspuns de 2–3 rânduri și buton „Deschide în tabul X".

| Întrebare | Răspuns scurt | Tab |
|-----------|---------------|-----|
| Cât de mult să am în fondul de urgență? | 3–6 luni de **cheltuieli esențiale**, deci 3–6 × cât cheltuiești lunar minim. | [Fond de urgență](#12-fond-de-urgență--panel-fond) |
| Să investesc acum sau să aștept? | Nu există răspuns universal; istoric, investirea integrală a depășit DCA, dar DCA reduce teama de intrare. | [Scalarea în timp](#22-scalarea-în-timp-dca--panel-dca) |
| Ce înseamnă DAE? | Costul total al creditului, anualizat, cu toate comisioanele incluse. | [Calculul dobânzii](#3-calculul-dobânzii--panel-dobanda) |
| Înflația mă afectează dacă nu investesc? | Da — cash-ul își pierde puterea de cumpărare cu inflația. | [Dobândă vs inflație](#10-dobândă-vs-inflație--panel-di) |
| Randament nominal vs real? | Nominalul e procentul; realul scade inflația și spune ce poți cumpăra. | [Dobândă vs inflație](#10-dobândă-vs-inflație--panel-di) |
| Când merită rambursare anticipată? | Când dobânda creditului e mai mare decât randamentul net pe care ți-l face altfel acea sumă. | [Datorii](#21-datorii-bune-vs-rele--panel-datorii) |
| Ce taxe plătesc pe acțiuni? | Pe dividend 10%/16%, pe câștig din vânzare 1%/3% (2025/2026, broker RO) — verifică norma. | [Impozitare](#20-impozitare-pe-investiții--panel-impozitare) |
| Merită Pilonul III? | Depinde de comisioane, randament și orizont; calculează cu scenariul conservator. | [Pensie](#19-pensie--pilon-iii--panel-pensie) |
| Cum îmi calculez averea netă? | Active (conturi, bunuri) minus datorii. | [Sănătate financiară](#15-sănătate-financiară--panel-sanatate) |
| De ce iau decizii proaste cu banii? | Biaseuri cognitive; recunoașterea lor e primul pas. | [Biaseuri](#24-biaseuri-comportamentale--panel-biase) |
| Asigurarea e mereu obligatorie? | Nu — depinde dacă reții riscul sau îl transferi, în funcție de probabilitate și impact. | [Asigurări](#17-asigurări--panel-asigurari) |
| Aplicația garantează rezultate? | Nu — calculează scenarii și formule; decizia și riscurile sunt ale tale. | Despre / Surse |

### 4.4 Mituri frecvente — 8, cu demontare și sursă

| Mit | Adevăr | Surse |
|-----|--------|-------|
| „Cash-ul e întotdeauna sigur." | Cash-ul nu e gratis: inflația îi erodează puterea de cumpărare zilnic. Siguranța are un cost. | [INS](https://insse.ro/cms/en/content/cpi-annual-data-series) |
| „Trebuie să am o sumă mare ca să încep să investesc." | Poți începe cu sume mici, consistente; DCA există tocmai pentru asta. | [Vanguard](https://investor.vanguard.com/investor-resources-education/online-trading/dollar-cost-averaging-vs-lump-sum) |
| „Dobânda compusă e magie." | E matematică: necesită timp, răbdare și consistență, nu o formulă magică. | [Regula 72](#11-regula-72--panel-regula72) |
| „Asigurarea e mereu obligatorie." | Depinde de riscul pe care îl reții vs îl transferi; probabilitate × impact, nu obiceiul. | [ASF](https://www.asfromania.ro/ro/a/159/autorizare-societ%C4%83%C8%9Bi-de-asigurare-%C8%99i/-sau-reasigurare) |
| „O datorie cu dobândă mică e mereu bună." | Nu contează dobânda nominală, ci randamentul alternativ și pragul de indiferență. | [BNR](https://www.bnr.ro/) |
| „Impozitul se plătește pe tot câștigul din investiții." | Se plătește pe **câștig**, cu baze și coti diferite per tip de venit. | [PwC](https://taxsummaries.pwc.com/romania/individual/significant-developments) |
| „Sănătatea financiară = să fii bogat." | E un set de indicatori (economii, datorii, rezervă, avere), nu un număr magic. | [CFPB](https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/) |
| „Psihologia nu contează la bani." | Deciziile financiare se iau cu emoție; bias-urile sunt documentate științific. | [Nobel 2002](https://www.nobelprize.org/prizes/economic-sciences/2002/popular-information/) |

### 4.5 „De ce contează pentru tine" — bloc recurent

Format propus: un card scurt la finalul fiecărui tab, cu 2–3 propoziții care leagă rezultatul
de viața utilizatorului. Exemple:

- **Inflație:** „Dacă inflația e 5% și dobânda la depozit e 3%, îți scade puterea de cumpărare cu ~2% pe an. Nu e o teorie: se vedea în prețurile de la magazin."
- **Fond de urgență:** „Fără rezervă, o reparație de mașină sau o diagnostic neprevăzut devine credit. Cu rezervă, rămâne o cheltuială neplăcută."
- **Pensie:** „Un leuc în plus pe lună, la 7% pe 25 de ani, aduce zeci de mii de lei în plus la pensionare."

Regulă: fără „ar trebui", fără recomandare; doar legătura dintre cifre și realitate.

### 4.6 Alte elemente utile

| Element | Ce face | Prioritate (dev) |
|---------|---------|------------------|
| Căutare `⌘K` peste taburi, glosar și FAQ | găsești orice tab din primele 3 caractere | 1 (dev I1) |
| Glosar global | definiții scurte + link către tabul relevant | 1 (dev I2) |
| FAQ global | reduce „de unde încep" | 2 (dev I3) |
| Centru de alerte | adună alertele din taburi într-un singur loc | 2 (dev I5) |
| Progres „explorat" | bifează taburile deschise („7 din 24") | 5 (dev I10) — se recomandă să rămână opțional |
| Mod „pas cu pas" | marchează câmp cu câmp panourile mari | 2 (dev I4) |

---

## 5. Surse consolidate — verificate 2026-11-16

Toate linkurile de mai jos au fost verificate prin căutare și extrare pe 16 noiembrie 2026.
Se folosesc ca linkuri inline în textul tabs-urilor și ca secțiune „Surse" globală.

### 5.1 Instituții și statistici publice

| Sursă | URL | Ce acoperă |
|-------|-----|------------|
| INS — IPC, serie anuală (RO) | https://insse.ro/cms/ro/content/ipc%E2%80%93serie-de-date-anuala | inflația 1991–2025 |
| INS — IPC, annual data (EN) | https://insse.ro/cms/en/content/cpi-annual-data-series | inflație, ENG |
| INS — earnings since 1938 | https://insse.ro/cms/en/content/earnings-1938-annual-series-0 | salariul mediu net |
| INS — TEMPO Online | http://statistici.insse.ro/tempoins/index.jsp?page=tempo2&lang=en&context=40 | seri statistice complete |
| Eurostat — HICP annual data | https://ec.europa.eu/eurostat/databrowser/product/view/prc_hicp_aind | inflația UE comparabilă |
| ECB Data Portal — HICP România | https://data.ecb.europa.eu/data/datasets/HICP/HICP.M.RO.N.000000.4D0.ANR | inflație lunară RO |
| BNR | https://www.bnr.ro/ | dobânzi, politica monetară, inflație |
| BNR — curs de schimb, serii zilnice | https://www.bnr.ro/report?cid=668&type=1 | curs valutar |
| BNR — Raport stabilitate financiară iunie 2026 | https://www.bnr.ro/uploads/2026-07-06raportasuprastabilitatiifinanciare-iunie2026_documentpdf_545_1783339608.pdf | indicatori, stress test |
| Ministerul Finanțelor | https://mfinante.gov.ro/ | politici fiscale |
| ANAF | http://static.anaf.ro/static/10/Anaf/legislatie/L_227_2015.htm | Codul fiscal |
| ASF — Pilon III | https://asfromania.ro/en/a/1380/pilon-iii | pensii facultative |
| ASF — ghiduri pensii private | https://asfromania.ro/app.php/ro/a/1686/ghiduri-pensii-private | contribuții, reguli Pilon III |
| ASF — asigurări (Legea 237/2015) | https://www.asfromania.ro/ro/a/159/autorizare-societ%C4%83%C8%9Bi-de-asigurare-%C8%99i/-sau-reasigurare | reglementare asigurări |
| ANPC — informații standard credit | https://www.anpc.ro/anpcftp/legislatie/100609/anexa2_inf_standard_credit_consumatori.pdf | DAE, drepturi debitori |
| BVB — Bursa de Valori București | https://www.bvb.ro/ | tranzacționare, indici |
| BVB — acțiuni | https://www.bvb.ro/FinancialInstruments/Markets/Shares | prețuri, date firme |
| BVB — componența BET-XT | https://m.bvb.ro/FinancialInstruments/Indices/IndicesProfiles.aspx?i=BET-XT | diversificare |

### 5.2 Fiscalitate — publicații de specialitate

| Sursă | URL | Ce acoperă |
|-------|-----|------------|
| PwC Tax Summaries — România | https://taxsummaries.pwc.com/romania/individual/significant-developments | impozite pe venituri |
| EY — Romanian tax changes | https://www.ey.com/en_gl/technical/tax-alerts/romanian-tax-changes-introduced-by-new-fiscal-and-budgetary-measures | modificări fiscale 2025/2026 |
| RSM — real estate tax guide | https://www.rsm.global/romania/ro/real-estate-tax-guide-romania | fiscalitate imobiliară |
| Tax Efficiency Lab | https://taxefficiencylab.com/romania-tax-guide | ghid fiscal sintetic |

### 5.3 Piață și presă economică

| Sursă | URL | Ce acoperă |
|-------|-----|------------|
| money.ro — brokeri autorizați | https://www.money.ro/invata/brokeri-autorizati | comisioane, intermediari |
| wall-street.ro — cost tranzacții | https://www.wall-street.ro/articol/Money/201325/cat-te-costa-sa-cumperi-actiuni-pe-bursa-si-care-sunt-sumele-minime-de-care-ai-nevoie.html | comisioane, minime |
| InfoCons — prețuri alimente | https://infocons.ro/ | studii de piață |

### 5.4 Educație publică și cercetare

| Sursă | URL | Ce acoperă |
|-------|-----|------------|
| CFPB — emergency fund | https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/ | fond de urgență |
| Econlib — opportunity cost | https://www.econlib.org/library/Topics/College/opportunitycost.html | cost de oportunitate |
| Vanguard Research — DCA vs lump sum | https://investor.vanguard.com/investor-resources-education/online-trading/dollar-cost-averaging-vs-lump-sum | DCA |
| Nobel Prize 1990 — Markowitz | https://www.nobelprize.org/prizes/economic-sciences/1990/press-release/ | teoria portofoliului |
| Nobel Prize 2002 — Kahneman & Tversky | https://www.nobelprize.org/prizes/economic-sciences/2002/popular-information/ | biaseuri, prospect theory |
| Prudential — 50/30/20 explained | https://www.prudential.com/financial-education/budgeting-50-30-20-rule | regula bugetară |
| Rule of 72 (Pacioli) | https://en.wikipedia.org/wiki/Rule_of_72 | istoria regulii 72 |

### 5.5 Publicații recomandate (cărți)

| Carte | Autor(i) | De ce |
|-------|----------|------|
| *All Your Worth: The Ultimate Lifetime Money Plan* | Elizabeth Warren & Amelia Warren Tyagi (2005) | regula 50/30/20 |
| *Thinking, Fast and Slow* | Daniel Kahneman (2011) | sistemul 1/2, biaseuri |
| *Nudge* | Richard Thaler & Cass Sunstein (2008) | arhitectura deciziei |
| *Misbehaving* | Richard Thaler (2015) | economia comportamentală |
| *The Intelligent Investor* | Benjamin Graham (1949) | gândirea investorului, margin of safety |

---

## 6. Reguli de integrare (fără implementare)

Această secțiune descrie **cum** se va aplica propunerea, ca referință pentru cardul de implementare.

1. **Lead-urile se înlocuiesc 1:1** în fiecare `<section id="panel-*">`, prima frază `<p class="lead">`.
2. **Zero „Excel" în textul vizibil.** Comentariile din `app.js` pot rămâne, dar cu o singură
   etichetă de proveniență (`// proveniență: valori implicite din documentul de lansare`).
3. **Formulele se scriu explicit**, nu prin referință la celule (`D9` etc.).
4. **Sursele** se adaugă ca listă la finalul fiecărui tab (linkuri scurte) + o secțiune globală
   „Surse" existentă se extinde cu „Educație publică".
5. **Footer:** „Sursă date: GlitchCoin.xlsx, 9 taburi (septembrie 2025)" → „Date publice:
   INS și BNR · Valorile implicite sunt alese ca exerciții, nu sunt date personale."
6. **README:** restructurat pe categorii; fără path-uri personale
   (se elimină).
7. **Glosar + FAQ + Mituri** ca secțiuni globale noi (nu taburi separate), cu linkuri către
   taburile relevante.
8. **Verificare la implementare:** `grep -in excel index.html` (doar comentarii),
   testele `node --test tests/` (145) trec, zero overflow la 390 px, toate taburile deschid.

---

## 7. Decizii care îi aparțin pe Narcis

1. **Categorii:** confirmi 6 grupuri (Fundamente / Buget / Investiții / Risc / Impozite / Psihologie)?
2. **Conținut suplimentar:** glosar + FAQ + Mituri — toate trei, sau doar glosar?
3. **Unde stau glosarul/FAQ/miturile:** secțiuni globale în sidebar sau taburi noi?
4. **Ton:** confirmi registru „tu", fără jargon, cu explicații pe loc?
5. **Ordinea taburilor:** aceeași logică (categorii) sau păstrare ordine istorică?
6. **Publicare:** după implementarea conținutului sau separat?

---

*Propunere redactată de profilul finance, 2026-11-16. Fără implementare.*

