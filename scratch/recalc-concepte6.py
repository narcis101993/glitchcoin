#!/usr/bin/env python3
# Recalcul independent pentru conceptele noi 6 (GlitchCoin): N11 curs de schimb / riscul valutar.
# Replică exact algoritmul din app.js (computeCurs) pentru a genera valorile așteptate în teste.
# Rulează: python3 scratch/recalc-concepte6.py
from math import pow


def compute_curs(suma, randament, curs, apreciere, ani, impozit, inflatie, pret_import):
    S = max(0.0, suma)
    g = max(-100.0, min(100.0, randament)) / 100
    C0 = max(0.0001, curs)
    a = max(-99.0, min(100.0, apreciere)) / 100
    n = max(1, min(100, round(ani)))
    t = max(0.0, min(100.0, impozit)) / 100
    infl = max(0.0, min(100.0, inflatie)) / 100
    P = max(0.0, pret_import)
    valid = S > 0 and C0 > 0

    putere_g = pow(1 + g, n)
    putere_a = pow(1 + a, n)
    val_final = S * putere_g
    curs_final = C0 * putere_a
    suma_ron_start = S * C0
    valoare_ron_brut = val_final * curs_final
    castig_brut = valoare_ron_brut - suma_ron_start
    impozit_lei = castig_brut * t if castig_brut > 0 else 0.0
    valoare_ron_net = valoare_ron_brut - impozit_lei
    rand_nominal = (1 + g) * (1 + a) - 1
    rand_real = (1 + rand_nominal) / (1 + infl) - 1
    contrib_activ = g
    contrib_valuta = (1 + g) * a
    fara_valuta_ron = val_final * C0
    efect_valutar = valoare_ron_brut - fara_valuta_ron
    pret_ron_start = P * C0
    pret_ron_final = P * curs_final
    crestere_import_pct = putere_a - 1
    crestere_import_real = (1 + a) / (1 + infl) - 1

    verdict = ""
    if valid:
        if a > 1e-12:
            verdict = "ajuta"
        elif a < -1e-12:
            verdict = "penalizeaza"
        else:
            verdict = "neutru"

    rows = []
    for k in range(n + 1):
        val_k = S * pow(1 + g, k)
        curs_k = C0 * pow(1 + a, k)
        ron_k = val_k * curs_k
        # În JS 0/0 dă NaN (afișat ca „—"); în Python replicăm cu nan.
        if suma_ron_start == 0:
            rr = float("nan") if k > 0 else 0.0
            rreal = float("nan") if k > 0 else 0.0
        else:
            rr = 0.0 if k == 0 else ron_k / suma_ron_start - 1
            rreal = 0.0 if k == 0 else (ron_k / suma_ron_start) / pow(1 + infl, k) - 1
        rows.append({
            "an": k,
            "valoareValuta": val_k,
            "curs": curs_k,
            "valoareRon": ron_k,
            "randRon": rr,
            "randReal": rreal,
        })

    return {
        "valid": valid, "S": S, "g": g, "C0": C0, "a": a, "n": n, "t": t,
        "infl": infl, "P": P, "valFinal": val_final, "cursFinal": curs_final,
        "sumaRonStart": suma_ron_start, "valoareRonBrut": valoare_ron_brut,
        "castigBrut": castig_brut, "impozitLei": impozit_lei,
        "valoareRonNet": valoare_ron_net, "randNominal": rand_nominal,
        "randReal": rand_real, "contribActiv": contrib_activ,
        "contribValuta": contrib_valuta, "faraValutaRon": fara_valuta_ron,
        "efectValutar": efect_valutar, "pretRonStart": pret_ron_start,
        "pretRonFinal": pret_ron_final, "crestereImportPct": crestere_import_pct,
        "crestereImportReal": crestere_import_real, "verdictCurs": verdict,
        "rows": rows,
    }


SCENARIOS = [
    ("implicit", dict(suma=10000, randament=6, curs=4.97, apreciere=2, ani=10, impozit=10, inflatie=4, pret_import=100)),
    ("ron-intareste", dict(suma=10000, randament=6, curs=4.97, apreciere=-3, ani=10, impozit=10, inflatie=4, pret_import=100)),
    ("faracurs", dict(suma=10000, randament=6, curs=4.97, apreciere=0, ani=10, impozit=10, inflatie=4, pret_import=100)),
    ("scurt", dict(suma=5000, randament=8, curs=5, apreciere=1, ani=3, impozit=10, inflatie=3, pret_import=50)),
    ("fara-inflatie", dict(suma=10000, randament=6, curs=4.97, apreciere=2, ani=10, impozit=10, inflatie=0, pret_import=100)),
    ("inflatie-mare", dict(suma=10000, randament=6, curs=4.97, apreciere=2, ani=10, impozit=10, inflatie=12, pret_import=100)),
    ("invalid", dict(suma=0, randament=6, curs=4.97, apreciere=2, ani=10, impozit=10, inflatie=4, pret_import=100)),
]

CHEI = [
    "valFinal", "cursFinal", "sumaRonStart", "valoareRonBrut", "castigBrut",
    "impozitLei", "valoareRonNet", "randNominal", "randReal",
    "contribActiv", "contribValuta", "faraValutaRon", "efectValutar",
    "pretRonStart", "pretRonFinal", "crestereImportPct", "crestereImportReal",
    "verdictCurs",
]


def main():
    for nume, kwargs in SCENARIOS:
        r = compute_curs(**kwargs)
        print(f"\n=== {nume} ===")
        print(f"  n={r['n']} valid={r['valid']}")
        for cheie in CHEI:
            valoare = r[cheie]
            if isinstance(valoare, float):
                print(f"  near(c.{cheie}, {valoare!r});")
            else:
                print(f"  // {cheie} = {valoare!r}")
        ultim = r["rows"][-1]
        print("  # ultimul rand:")
        for cheie in ["an", "valoareValuta", "curs", "valoareRon", "randRon", "randReal"]:
            print(f"  //   {cheie} = {ultim[cheie]!r}")
        print(f"  // rows.length = {len(r['rows'])}")


if __name__ == "__main__":
    main()
