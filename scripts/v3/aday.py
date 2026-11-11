#!/usr/bin/env python3
"""Bir hâlin aday ayetlerini metniyle listeler (havuz seçimi için).
Kullanım: aday.py HAL [--hepsi] [--kes N]
Önce güçlü adaylar (!), sonra diğerleri. Varsayılan: güçlü adayların tamamı + en fazla 15 diğer aday."""
import json, sys, glob, re

hal = sys.argv[1]
hepsi = '--hepsi' in sys.argv
kes = 230
if '--kes' in sys.argv:
    kes = int(sys.argv[sys.argv.index('--kes') + 1])

q = json.load(open('src/data/quran.json', encoding='utf-8'))
metin = {(v['surahNumber'], v['ayahNumber']): v['plainTranslation'] for v in q}

guclu, diger = [], []
for f in sorted(glob.glob('data/v3/sureler/*.txt')):
    s = int(re.search(r'(\d+)\.txt$', f).group(1))
    for ln in open(f, encoding='utf-8'):
        ln = ln.strip()
        if not ln or ln[0] in '#=?' or '|' not in ln:
            continue
        a, h = ln.split('|', 1)
        r = a.split()[0]
        x, y = (int(t) for t in r.split('-')) if '-' in r else (int(r), int(r))
        for t in h.split():
            if t.rstrip('!') == hal:
                (guclu if t.endswith('!') else diger).append((s, x, y))

def yaz(lst, etiket, sinir=None):
    print(f'== {etiket} ({len(lst)})')
    for i, (s, x, y) in enumerate(lst):
        if sinir is not None and i >= sinir:
            print(f'   … {len(lst) - sinir} aday daha (--hepsi)')
            break
        t = ' / '.join(metin[(s, n)] for n in range(x, y + 1))
        r = f'{s}:{x}' + (f'-{y}' if y != x else '')
        print(f'{r} {t[:kes]}{"…" if len(t) > kes else ""}')

yaz(guclu, 'güçlü')
yaz(diger, 'diğer', None if hepsi else 15)
