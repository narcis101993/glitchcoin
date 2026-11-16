#!/usr/bin/env python3
# Valori ajutatoare pentru tests/concepte-4.test.mjs
def pv(suma, c, r, n):
    if r > 0:
        return suma * (1 + r) ** n + c * ((1 + r) ** n - 1) / r
    return suma * (1 + r) ** n + c * n


rb = 0.067 / 12
rc = (6.7 - 1.5) / 100 / 12
b = pv(0, 300, rb, 12)
c = pv(0, 300, rc, 12)
imp = max(0, c - 3600) * 0.1
print('row1 brut', repr(b))
print('row1 cost', repr(c))
print('row1 imp', repr(imp))
print('row1 net', repr(c - imp))

print('conservator finalBrut', repr(pv(0, 300, 0.04 / 12, 480)))
print('conservator finalCost', repr(pv(0, 300, (4 - 1.5) / 100 / 12, 480)))

print('r1% finalCost', repr(pv(0, 100, (1 - 1.5) / 100 / 12, 120)))
print('r1% contributii', repr(100 * 120))

fb = pv(0, 200, 0.067 / 12, 360)
fc = pv(0, 200, (6.7 - 1.5) / 100 / 12, 360)
print('30ani raport', repr((fb - fc) / fb))

print('r0 valoare reala', repr(181000 / 1.049 ** 30))
print('r0 randReal', repr(1 / 1.049 - 1))
print('rneg valoare reala', repr(72000 / 1.049 ** 20))
print('rneg randReal', repr((1 - 0.065) / 1.049 - 1))
print('suma50k contributii', repr(50000 + 200 * 360))
