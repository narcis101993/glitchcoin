#!/usr/bin/env python3
def pv(suma, c, r, n):
    if r > 0:
        return suma * (1 + r) ** n + c * ((1 + r) ** n - 1) / r
    return suma * (1 + r) ** n + c * n


r = pv(5000, 100, (1 - 1.5) / 100 / 12, 120)
print('finalCost', repr(r))
print('contributii', repr(5000 + 100 * 120))
print('castigImpozabil', repr(max(0, r - 17000)))
print('valoareReala', repr(r / 1.049 ** 10))
print('randEfectiv', repr((1 - 1.5) / 100))
print('randReal', repr((1 + (1 - 1.5) / 100) / 1.049 - 1))
