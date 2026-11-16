#!/usr/bin/env python3
# Recalcul independent (Python) pentru taburile noi 4 din GlitchCoin:
# N6 Pensie / Pilon III si N7 Impozitare pe investitii.
# Ruleaza: python3 scratch/recalc-concepte4.py
# Valorile trebuie sa coincida cu app.js (computePensie / computeImpozit).

def pensie_valoare_la(suma, contributie, r, n):
    if r > 0:
        return suma * (1 + r) ** n + contributie * ((1 + r) ** n - 1) / r
    return suma * (1 + r) ** n + contributie * n


def compute_pensie(varsta, pensionare, contributie, suma, randament, comision, impozit, inflatie):
    ani_brut = round(pensionare) - round(varsta)
    valid = ani_brut >= 1
    ani = max(1, min(45, ani_brut))
    luni = ani * 12
    r_brut = randament / 100 / 12
    r_cost = max(-0.5, (randament - comision) / 100 / 12)
    r_infl = max(-0.9, inflatie / 100)
    cota = max(0, min(1, impozit / 100))

    final_brut = pensie_valoare_la(suma, contributie, r_brut, luni)
    final_cost = pensie_valoare_la(suma, contributie, r_cost, luni)
    contributii = suma + contributie * luni
    castig_brut = final_brut - contributii
    cost_comisioane = max(0, final_brut - final_cost)
    castig_impozabil = max(0, final_cost - contributii)
    impozit_lei = castig_impozabil * cota
    final_net = final_cost - impozit_lei
    valoare_reala = final_net / (1 + r_infl) ** ani

    rand_efectiv = (randament - comision) / 100
    rand_real = (1 + rand_efectiv) / (1 + r_infl) - 1

    rows = []
    for an in range(1, ani + 1):
        n = an * 12
        contributii_an = suma + contributie * n
        brut = pensie_valoare_la(suma, contributie, r_brut, n)
        cost = pensie_valoare_la(suma, contributie, r_cost, n)
        impozit_an = max(0, cost - contributii_an) * cota
        rows.append((an, contributii_an, brut, cost, impozit_an, cost - impozit_an))

    return dict(valid=valid, ani=ani, luni=luni, final_brut=final_brut, final_cost=final_cost,
                contributii=contributii, castig_brut=castig_brut, cost_comisioane=cost_comisioane,
                castig_impozabil=castig_impozabil, impozit_lei=impozit_lei, final_net=final_net,
                valoare_reala=valoare_reala, rand_efectiv=rand_efectiv, rand_real=rand_real, rows=rows)


def show(label, r):
    print(f'--- {label} ---')
    for k in ('valid', 'ani', 'luni', 'final_brut', 'final_cost', 'contributii', 'castig_brut',
              'cost_comisioane', 'castig_impozabil', 'impozit_lei', 'final_net', 'valoare_reala',
              'rand_efectiv', 'rand_real'):
        print(f'  {k}: {r[k]!r}')
    print(f'  rows: {len(r["rows"])}')
    print(f'  ultimul rand: {r["rows"][-1]!r}')


# Scenariul implicit din HTML: 25 -> 65 de ani, 300 lei/luna, 6,7%, 1,5% comision, 10% impozit, 4,9% inflatie
show('implicit 25->65, 300/luna, 6.7%, comision 1.5%',
     compute_pensie(25, 65, 300, 0, 6.7, 1.5, 10, 4.9))

# 30 de ani, 200 lei/luna
show('30 ani, 200/luna, 6.7%, comision 1.5%',
     compute_pensie(30, 60, 200, 0, 6.7, 1.5, 10, 4.9))

# Fara comisioane: randamentul efectiv trebuie sa fie exact 6,7%
show('fara comisioane', compute_pensie(25, 65, 300, 0, 6.7, 0, 10, 4.9))

# Comision 0 si impozit 0
show('fara comisioane, fara impozit', compute_pensie(25, 65, 300, 0, 6.7, 0, 0, 0))

# Randament nul
show('randament 0%', compute_pensie(25, 55, 500, 1000, 0, 0, 10, 4.9))

# Randament negativ (sub comision): cazul in care rCost e negativ
show('randament -5%, comision 1.5%', compute_pensie(25, 45, 300, 0, -5, 1.5, 10, 4.9))

# Varsta de pensionare mai mica -> invalid
r = compute_pensie(65, 25, 300, 0, 6.7, 1.5, 10, 4.9)
print('--- pensionare < varsta ---')
print('  valid:', r['valid'], 'ani:', r['ani'])

# Suma initiala nenula
show('suma initiala 50.000', compute_pensie(35, 65, 200, 50000, 6.7, 1.5, 10, 4.9))

# Impozit
def compute_impozit(castig, rata_pct):
    castig = max(0, castig)
    cota = max(0, min(1, rata_pct / 100))
    impozit = castig * cota
    return dict(castig=castig, cota=cota, impozit=impozit, net=castig - impozit)


for castig, rata in [(10000, 3), (10000, 1), (10000, 16), (10000, 10), (10000, 0), (-500, 3), (10000, 200)]:
    print('impozit', castig, rata, '->', compute_impozit(castig, rata))

# Cate ani sunt necesari ca comisioanele sa depaseasca 25% din final?
r = compute_pensie(25, 65, 300, 0, 6.7, 1.5, 10, 4.9)
print('comisioane / final brut =', r['cost_comisioane'] / r['final_brut'])
