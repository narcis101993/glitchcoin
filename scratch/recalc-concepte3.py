#!/usr/bin/env python3
"""Recalcul independent (Python) pentru conceptele noi 3 — GlitchCoin.

N3 diversificare și riscul, N8 asigurări, N15 stress test.
Se replică exact algoritmul din app.js (mulberry32 + Box-Muller + Cholesky),
ca să se verifice și simularea Monte Carlo.
"""
import math

MASK = 0xFFFFFFFF


def imul(x, y):
    return ((x & MASK) * (y & MASK)) & MASK


def mulberry32(seed):
    a = seed & MASK

    def rnd():
        nonlocal a
        a = (a + 0x6D2B79F5) & MASK
        t = imul(a ^ (a >> 15), 1 | a)
        t = (((t + imul(t ^ (t >> 7), 61 | t)) & MASK) ^ t) & MASK
        return ((t ^ (t >> 14)) & MASK) / 4294967296

    return rnd


def randn(rng):
    u1 = max(rng(), 1e-12)
    u2 = rng()
    return math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)


def cholesky(A):
    n = len(A)
    L = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1):
            s = A[i][j]
            for k in range(j):
                s -= L[i][k] * L[j][k]
            if i == j:
                if s <= 0:
                    return None
                L[i][j] = math.sqrt(s)
            else:
                L[i][j] = s / L[j][j]
    return L


def quantile(sorted_vals, p):
    n = len(sorted_vals)
    if not n:
        return None
    pos = (n - 1) * p
    lo = math.floor(pos)
    hi = math.ceil(pos)
    if lo == hi:
        return sorted_vals[lo]
    return sorted_vals[lo] + (sorted_vals[hi] - sorted_vals[lo]) * (pos - lo)


def stats_finale(arr, suma):
    s = sorted(arr)
    return {
        'mediana': quantile(s, 0.5),
        'p5': quantile(s, 0.05),
        'p95': quantile(s, 0.95),
        'probPierdere': sum(1 for v in arr if v < suma) / len(arr),
    }


def stats_dd(arr):
    s = sorted(arr)
    return {'mediana': quantile(s, 0.5), 'p90': quantile(s, 0.9)}


DV_DEFAULTS = [
    {'nume': 'Acțiuni', 'randament': 8, 'volatilitate': 20, 'pondere': 50},
    {'nume': 'Obligațiuni', 'randament': 5, 'volatilitate': 6, 'pondere': 30},
    {'nume': 'Depozit', 'randament': 3.5, 'volatilitate': 0, 'pondere': 20},
]
DV_SEED = 20261116
DV_SIMULATII = 5000
DV_ANI = 5


def compute_diversificare(rows, corelare_pct=30, rf_pct=3.5):
    n = len(rows)
    pondere_totala = sum(max(0, r['pondere']) for r in rows)
    if n == 0 or pondere_totala <= 0:
        return {'valid': False}
    w = [max(0, r['pondere']) / pondere_totala for r in rows]
    r = [x['randament'] / 100 for x in rows]
    s = [max(0, x['volatilitate']) / 100 for x in rows]
    rho = max(-1, min(1, corelare_pct / 100))
    rP = sum(w[i] * r[i] for i in range(n))
    sMedie = sum(w[i] * s[i] for i in range(n))
    varP = 0.0
    for i in range(n):
        for j in range(n):
            c = 1 if i == j else rho
            varP += w[i] * w[j] * s[i] * s[j] * c
    sP = math.sqrt(max(0, varP))
    rf = rf_pct / 100
    idx = 0
    for i in range(1, n):
        if r[i] > r[idx]:
            idx = i
    return {
        'valid': True, 'n': n, 'pondereTotala': pondere_totala, 'w': w, 'r': r, 's': s,
        'rho': rho, 'rP': rP, 'sP': sP, 'sMedie': sMedie,
        'reducere': sMedie - sP,
        'reducerePct': (1 - sP / sMedie) if sMedie > 0 else None,
        'sharpeP': (rP - rf) / sP if sP > 0 else None,
        'drawdownP': 2 * sP, 'idx': idx, 'numeA': rows[idx]['nume'],
        'rA': r[idx], 'sA': s[idx],
        'sharpeA': (r[idx] - rf) / s[idx] if s[idx] > 0 else None,
        'drawdownA': 2 * s[idx],
    }


def simuleaza(rows, corelare_pct=30, suma=10000, simulatii=DV_SIMULATII, ani=DV_ANI, seed=DV_SEED):
    c = compute_diversificare(rows, corelare_pct, 0)
    if not c['valid']:
        return {'valid': False}
    n = c['n']
    cov = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            cov[i][j] = c['s'][i] * c['s'][j] * (1 if i == j else c['rho'])
    L = cholesky(cov)
    if L is None:
        L = [[c['s'][i] if i == j else 0.0 for j in range(n)] for i in range(n)]
    rng = mulberry32(seed)
    finalsP, finalsA, ddP, ddA = [], [], [], []
    for _ in range(simulatii):
        vp, peakP, mddP = suma, suma, 0.0
        va, peakA, mddA = suma, suma, 0.0
        for _t in range(ani):
            eps = [randn(rng) for _ in range(n)]
            z = [0.0] * n
            for i in range(n):
                acc = 0.0
                for k in range(i + 1):
                    acc += L[i][k] * eps[k]
                z[i] = acc
            rp = c['rP'] + sum(c['w'][i] * z[i] for i in range(n))
            vp *= 1 + rp
            peakP = max(peakP, vp)
            mddP = max(mddP, (peakP - vp) / peakP)
            ra = c['r'][c['idx']] + z[c['idx']]
            va *= 1 + ra
            peakA = max(peakA, va)
            mddA = max(mddA, (peakA - va) / peakA)
        finalsP.append(vp)
        finalsA.append(va)
        ddP.append(mddP)
        ddA.append(mddA)
    return {
        'valid': True, 'numeA': c['numeA'],
        'p': stats_finale(finalsP, suma), 'a': stats_finale(finalsA, suma),
        'ddP': stats_dd(ddP), 'ddA': stats_dd(ddA),
    }


def compute_asigurare(prima, suma, prob_pct, ani, dobanda_pct):
    p = min(1, max(0, prob_pct / 100))
    r = max(0, dobanda_pct / 100)
    n = max(1, round(ani))
    cost_nominal = prima * n
    cost_dobanda = prima * ((1 + r) ** n - 1) / r if r > 0 else prima * n
    pierdere_anuala = p * suma
    return {
        'p': p, 'n': n, 'costPrimeNominal': cost_nominal, 'costPrimeDobanda': cost_dobanda,
        'pierdereAnuala': pierdere_anuala, 'pierdereTotala': pierdere_anuala * n,
        'diferentaAnuala': prima - pierdere_anuala,
        'diferentaTotala': cost_nominal - pierdere_anuala * n,
        'probCelPutinOData': 1 - (1 - p) ** n,
        'aniMedie': 1 / p if p > 0 else None,
    }


def compute_stres(venit, cheltuieli, economii, rezerva, active, luni, inflatie_pct, scadere_pct, randament_pct):
    ani = luni / 12
    inflF = inflatie_pct / 100
    factor = (1 + inflF) ** ani if inflF > -1 else None
    cheltuieli_noi = cheltuieli * factor if factor is not None else None
    venit_nou = venit * (1 - min(1, max(0, scadere_pct / 100)))
    sold = venit_nou - cheltuieli_noi if cheltuieli_noi is not None else None
    luni_rezerva = (rezerva / -sold) if (sold is not None and sold < 0 and rezerva > 0) else (0 if (sold is not None and sold < 0) else None)
    randF = randament_pct / 100
    active_noi = active * (1 + randF)
    pierdere = max(0, active - active_noi)
    revenire = active / active_noi - 1 if (active > 0 and active_noi > 0 and active_noi < active) else None
    scen = []
    for nume, prob, rand in [('Optimist', 0.25, 0.10), ('Bază', 0.50, 0.0), ('Pesimist', 0.25, randF)]:
        scen.append({'nume': nume, 'probabilitate': prob, 'randament': rand, 'valoare': active * (1 + rand)})
    val_asteptata = sum(s['probabilitate'] * s['valoare'] for s in scen)
    return {
        'ani': ani, 'factorInfl': factor, 'cheltuieliNoi': cheltuieli_noi, 'venitNou': venit_nou,
        'soldLunar': sold, 'luniRezerva': luni_rezerva, 'rezervaMinima': cheltuieli_noi * 3 if cheltuieli_noi is not None else None,
        'putereEconomii': economii / factor if (factor is not None and factor > 0) else None,
        'activeNoi': active_noi, 'pierdereActive': pierdere, 'randamentRevenire': revenire,
        'scenarii': scen, 'valoareAsteptata': val_asteptata,
        'valoarePesimist': [s for s in scen if s['nume'] == 'Pesimist'][0]['valoare'],
    }


def show(title, obj):
    print(f'\n=== {title} ===')
    for k, v in obj.items():
        if isinstance(v, float):
            print(f'  {k} = {v!r}')
        elif isinstance(v, list):
            print(f'  {k} = {v!r}')
        else:
            print(f'  {k} = {v!r}')


if __name__ == '__main__':
    c = compute_diversificare(DV_DEFAULTS, 30, 3.5)
    show('N3 · computeDiversificare(defaults, 30, 3.5)', c)

    print('\nN3 · scenarii pe un an (suma 10000):')
    for z in (-3, -2, -1, 0, 1, 2, 3):
        rp = c['rP'] + z * c['sP']
        ra = c['rA'] + z * c['sA']
        print(f'  z={z:+d}  portofoliu {rp:.6f} -> {10000*(1+rp):.2f}   activ {ra:.6f} -> {10000*(1+ra):.2f}')

    sim = simuleaza(DV_DEFAULTS, 30, suma=10000)
    show('N3 · simuleazaDiversificare(defaults, 30, suma=10000)', sim)

    # corelație 0 și 100, pentru test
    show('N3 · corelație 0', compute_diversificare(DV_DEFAULTS, 0, 3.5))
    show('N3 · corelație 100', compute_diversificare(DV_DEFAULTS, 100, 3.5))

    a = compute_asigurare(2000, 20000, 8, 10, 3.5)
    show('N8 · computeAsigurare(2000, 20000, 8, 10, 3.5)', a)
    for nume, pre in [('sanatate', (2000, 20000, 8)), ('casa', (500, 150000, 1)), ('masina', (1500, 25000, 6))]:
        show(f'N8 · preset {nume}', compute_asigurare(pre[0], pre[1], pre[2], 10, 3.5))

    s = compute_stres(5000, 2500, 1000, 10000, 20000, 12, 10, 20, -20)
    show('N15 · computeStres(5000,2500,1000,10000,20000,12,10,20,-20)', s)

    s2 = compute_stres(5000, 2500, 1000, 10000, 20000, 12, 10, 0, 0)
    show('N15 · inflație 10% doar', s2)

    s3 = compute_stres(5000, 2500, 1000, 10000, 20000, 12, 3, 20, -20)
    show('N15 · recesiune', s3)
