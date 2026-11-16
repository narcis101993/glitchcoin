#!/usr/bin/env python3
"""Recalcul independent (Python) pentru conceptele noi 5 — GlitchCoin.

N9 · Datorii bune vs rele (computeDatorii)
N12 · Scalarea în timp / DCA (computeDca)

Replică exact algoritmul din app.js, ca să verificăm că testele node au
valori așteptate corecte. Rulează: python3 scratch/recalc-concepte5.py
"""
from math import inf


def rata_anuitate(suma, i, n):
    if i <= 0:
        return suma / n
    return suma * i / (1 - (1 + i) ** (-n))


def compute_datorii(suma, dobanda, durata, economie, impozit, avans):
    P = max(0.0, suma)
    r = max(0.0, dobanda) / 100.0
    n = max(1, min(600, round(durata)))
    s_brut = max(0.0, economie) / 100.0
    cota = max(0.0, min(1.0, impozit / 100.0))
    X = max(0.0, avans)
    valid = P > 0

    i = r / 12.0
    sm = s_brut * (1 - cota) / 12.0
    pmt = rata_anuitate(P, i, n)

    b = P
    fara = []
    for k in range(1, n + 1):
        dob = b * i
        plata = min(pmt, b + dob)
        b = max(0.0, b + dob - plata)
        fara.append((k, dob, b))
    cost_total = sum(f[1] for f in fara)

    bA = P
    cu = []
    k = 1
    while k <= n * 4 and bA > 1e-9:
        dob = bA * i
        plata = min(pmt + X, bA + dob)
        bA = max(0.0, bA + dob - plata)
        cu.append((k, dob, bA))
        if bA <= 1e-9:
            break
        k += 1
    cost_antic = sum(f[1] for f in cu)
    luni_antic = len(cu)

    e = 0.0
    economii = []
    for k in range(1, n + 1):
        e = e * (1 + sm) + X
        economii.append((k, e))
    valoare_economii = e
    castig_economii = valoare_economii - X * n

    economisire = cost_total - cost_antic
    rand_antic = r
    rand_eco_net = s_brut * (1 - cota)
    arbitraj = rand_antic - rand_eco_net
    prag = r / (1 - cota) if cota < 1 else inf
    diferenta = economisire - castig_economii

    if not valid:
        verdict = ""
    elif X <= 0:
        verdict = "neutral"
    elif arbitraj > 1e-9:
        verdict = "anticipare"
    elif arbitraj < -1e-9:
        verdict = "economisire"
    else:
        verdict = "indiferent"

    rows = []
    cum_fara = 0.0
    cum_cu = 0.0
    ani = (n + 11) // 12
    for an in range(1, ani + 1):
        start = (an - 1) * 12
        cum_fara += sum(f[1] for f in fara[start:start + 12])
        cum_cu += sum(f[1] for f in cu[start:start + 12])
        eco = economii[min(start + 11, n - 1)][1]
        rows.append((an, cum_fara, cum_cu, eco, (cum_fara - cum_cu) - eco))

    return dict(valid=valid, P=P, r=r, n=n, s_brut=s_brut, cota=cota, X=X, pmt=pmt,
                cost_total=cost_total, cost_antic=cost_antic, luni_antic=luni_antic,
                economisire=economisire, rand_antic=rand_antic, rand_eco_net=rand_eco_net,
                arbitraj=arbitraj, prag=prag, valoare_economii=valoare_economii,
                castig_economii=castig_economii, diferenta=diferenta, verdict=verdict,
                rows=rows)


def compute_dca(suma, luni, randament, volatilitate, scenariu):
    from math import sin, pi, sqrt
    S = max(0.0, suma)
    n = max(1, min(600, round(luni)))
    g = randament / 100.0 / 12.0
    v = max(0.0, volatilitate) / 100.0 / sqrt(12.0)
    valid = S > 0

    pret = [100.0]
    for k in range(1, n + 1):
        if scenariu == "creste":
            p = 100.0 * (1 + g) ** k
        elif scenariu == "scade":
            p = 100.0 * (1 - g) ** k
        elif scenariu == "creste-volatil":
            p = 100.0 * (1 + g) ** k * (1 + v * sin(2 * pi * k / n))
        else:  # volatil — scădere și recuperare în jurul startului
            p = 100.0 * (1 - v * sin(pi * k / n))
        pret.append(p)

    investitie = S / n
    unitati_lump = S / pret[0]
    unitati_dca = 0.0
    rows = []
    for k in range(n):
        u = investitie / pret[k]
        unitati_dca += u
        rows.append((k + 1, pret[k], investitie, u, unitati_dca * pret[k + 1], unitati_lump * pret[k + 1]))

    cost_mediu = S / unitati_dca if unitati_dca > 0 else 0.0
    pret_mediu = sum(pret[:n]) / n
    pret_final = pret[n]
    valoare_dca = unitati_dca * pret_final
    valoare_lump = unitati_lump * pret_final
    diferenta = valoare_dca - valoare_lump

    if not valid:
        verdict = ""
    elif diferenta > 1e-9:
        verdict = "dca"
    elif diferenta < -1e-9:
        verdict = "lump"
    else:
        verdict = "indiferent"

    return dict(valid=valid, S=S, n=n, scenariu=scenariu, pret_final=pret_final,
                cost_mediu=cost_mediu, pret_mediu=pret_mediu, unitati_dca=unitati_dca,
                unitati_lump=unitati_lump, valoare_dca=valoare_dca,
                valoare_lump=valoare_lump, diferenta=diferenta, verdict=verdict,
                rand_dca=valoare_dca / S - 1 if S > 0 else 0,
                rand_lump=valoare_lump / S - 1 if S > 0 else 0, rows=rows, pret=pret)


def show_datorii():
    print("=== N9 · Datorii bune vs rele ===")
    c = compute_datorii(100000, 8, 120, 5, 10, 500)
    for k in ("pmt", "cost_total", "cost_antic", "luni_antic", "economisire",
              "rand_antic", "rand_eco_net", "arbitraj", "prag",
              "valoare_economii", "castig_economii", "diferenta"):
        print(f"  {k} = {c[k]!r}")
    print(f"  verdict = {c['verdict']!r}")
    print(f"  rows[0] = {c['rows'][0]!r}")
    print(f"  rows[-1] = {c['rows'][-1]!r}")
    print(f"  n rows = {len(c['rows'])}")

    # caz: economie mai mare decat creditul
    b = compute_datorii(100000, 5, 120, 9, 10, 500)
    print("  -- credit 5% vs economii 9% --")
    print(f"  verdict = {b['verdict']!r}  diferenta = {b['diferenta']!r}  prag = {b['prag']!r}")
    # fara anticipare
    z = compute_datorii(100000, 8, 120, 5, 10, 0)
    print("  -- fara suma suplimentara --")
    print(f"  verdict = {z['verdict']!r}  economisire = {z['economisire']!r}  castig = {z['castig_economii']!r}")
    # dobanda zero
    zr = compute_datorii(100000, 0, 120, 5, 10, 500)
    print("  -- credit fara dobanda --")
    print(f"  verdict = {zr['verdict']!r}  cost_total = {zr['cost_total']!r}  cost_antic = {zr['cost_antic']!r}  pmt = {zr['pmt']!r}")
    # invalid
    inv = compute_datorii(0, 8, 120, 5, 10, 500)
    print(f"  -- suma 0 -- valid = {inv['valid']!r}  verdict = {inv['verdict']!r}")
    # durata scurta
    s = compute_datorii(12000, 10, 12, 6, 10, 200)
    print("  -- 12 luni, 10%, 200 lei extra --")
    print(f"  pmt = {s['pmt']!r}  cost_total = {s['cost_total']!r}  cost_antic = {s['cost_antic']!r}  luni_antic = {s['luni_antic']}")
    print(f"  rows = {s['rows']!r}")


def show_dca():
    print("=== N12 · Scalarea în timp (DCA) ===")
    for scen in ("creste", "scade", "volatil", "creste-volatil"):
        c = compute_dca(12000, 12, 8, 20, scen)
        print(f"  -- {scen} --")
        print(f"  pret_final = {c['pret_final']!r}  cost_mediu = {c['cost_mediu']!r}  pret_mediu = {c['pret_mediu']!r}")
        print(f"  unitati_dca = {c['unitati_dca']!r}  unitati_lump = {c['unitati_lump']!r}")
        print(f"  valoare_dca = {c['valoare_dca']!r}  valoare_lump = {c['valoare_lump']!r}")
        print(f"  diferenta = {c['diferenta']!r}  verdict = {c['verdict']!r}  rand_dca = {c['rand_dca']!r}  rand_lump = {c['rand_lump']!r}")
        print(f"  rows[0] = {c['rows'][0]!r}")
        print(f"  rows[-1] = {c['rows'][-1]!r}")
    # invalid
    inv = compute_dca(0, 12, 8, 20, "volatil")
    print(f"  -- suma 0 -- valid = {inv['valid']!r}  verdict = {inv['verdict']!r}")
    # 1 luna
    u = compute_dca(12000, 1, 8, 20, "volatil")
    print(f"  -- o luna -- pret_final = {u['pret_final']!r}  cost_mediu = {u['cost_mediu']!r}  diferenta = {u['diferenta']!r}  verdict = {u['verdict']!r}")


if __name__ == "__main__":
    show_datorii()
    show_dca()
