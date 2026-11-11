#!/usr/bin/env python3
"""Hâl havuzlarını denetler ve data/v3/havuzlar.json dosyasını üretir.
Kaynak: data/v3/havuzlar/HAL.txt
  + SURE:BAS[-SON] | gerekçe [| not]   seçilen
  - SURE:BAS[-SON] | neden             elenen
Kullanım: havuz.py [--yaz]"""
import json, glob, os, sys, collections

q = json.load(open('src/data/quran.json', encoding='utf-8'))
var = {(v['surahNumber'], v['ayahNumber']) for v in q}
haller = json.load(open('data/v3/haller.json', encoding='utf-8'))
hal_ids = [h['id'] for g in haller['gruplar'] for h in g['haller']]

def ref(s):
    sure, a = s.split(':')
    x, y = (a.split('-') + [a])[:2] if '-' in a else (a, a)
    return int(sure), int(x), int(y)

hata, cikti, kullanim = [], {}, collections.defaultdict(list)
for hid in hal_ids:
    p = f'data/v3/havuzlar/{hid}.txt'
    if not os.path.exists(p):
        hata.append(f'{hid}: havuz dosyası yok'); continue
    sec, ele = [], []
    for n, ln in enumerate(open(p, encoding='utf-8'), 1):
        ln = ln.rstrip('\n')
        if not ln.strip() or ln.startswith('#'):
            continue
        isaret, govde = ln[0], ln[1:].strip()
        parca = [t.strip() for t in govde.split('|')]
        try:
            s, x, y = ref(parca[0])
        except Exception:
            hata.append(f'{p}:{n} geçersiz referans {parca[0]}'); continue
        if x > y or any((s, k) not in var for k in range(x, y + 1)):
            hata.append(f'{p}:{n} ayet yok {parca[0]}'); continue
        if isaret == '+':
            sec.append({'sure': s, 'bas': x, 'son': y, 'gerekce': parca[1] if len(parca) > 1 else '',
                        'not': parca[2] if len(parca) > 2 else ''})
            kullanim[(s, x, y)].append(hid)
        elif isaret == '-':
            ele.append({'ref': parca[0], 'neden': parca[1] if len(parca) > 1 else ''})
        else:
            hata.append(f'{p}:{n} satır + ya da - ile başlamalı')
    if not 9 <= len(sec) <= 20:
        print(f'uyarı: {hid} havuzunda {len(sec)} ayet var')
    tekrar = collections.Counter((e['sure'], e['bas'], e['son']) for e in sec)
    for k, c in tekrar.items():
        if c > 1: hata.append(f'{hid}: aynı ayet iki kez {k}')
    cikti[hid] = {'secilen': sec, 'elenen': ele}

print(f'havuz: {len(cikti)} | seçilen ayet grubu: {sum(len(v["secilen"]) for v in cikti.values())}')
coklu = {k: v for k, v in kullanim.items() if len(v) > 1}
print(f'birden fazla havuzda olan: {len(coklu)}')
for k, v in sorted(coklu.items(), key=lambda kv: -len(kv[1])):
    if len(v) > 2: print('   ', f'{k[0]}:{k[1]}' + (f'-{k[2]}' if k[2] != k[1] else ''), v)
print('HATA:', len(hata))
for h in hata: print('  ', h)
if '--yaz' in sys.argv and not hata:
    json.dump({'surum': 'taslak-02', 'havuzlar': cikti}, open('data/v3/havuzlar.json', 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)
    print('yazıldı: data/v3/havuzlar.json')
