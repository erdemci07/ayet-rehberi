#!/usr/bin/env python3
"""data/v3/sureler/NNN.txt dosyalarını denetler ve ilerlemeyi yazdırır.
Biçim:
  =BAS-SON Başlık :: tek cümlelik özet
  AYET konu konu* | hal hal!        (* = konunun ana ayeti, ! = hâl için güçlü aday)
  AYET-AYET ...                      (aralık: aynı etiketler aralıktaki her ayete)
  ?yeni-hal açıklama                 (listede olmayan hâl önerisi; serbest not)
"""
import json, re, glob, sys, collections
q = json.load(open('src/data/quran.json', encoding='utf-8'))
n = collections.Counter(v['surahNumber'] for v in q)
K = {k['id'] for g in json.load(open('data/v3/konular.json', encoding='utf-8'))['gruplar'] for k in g['konular']}
H = {h['id'] for g in json.load(open('data/v3/haller.json', encoding='utf-8'))['gruplar'] for h in g['haller']}
errs = []; done = 0; secs = 0; kc = collections.Counter(); hc = collections.Counter(); out = {}
for p in sorted(glob.glob('data/v3/sureler/*.txt')):
    s = int(re.search(r'(\d+)\.txt', p).group(1)); cover = []; tags = {}; sec = []
    for ln, line in enumerate(open(p, encoding='utf-8'), 1):
        line = line.rstrip('\n')
        if not line.strip() or line.startswith('#') or line.startswith('?'): continue
        if line.startswith('='):
            m = re.match(r'=(\d+)-(\d+) (.+?) :: (.+)$', line)
            if not m: errs.append(f'{p}:{ln} bölüm satırı bozuk'); continue
            a, b = int(m.group(1)), int(m.group(2)); cover += range(a, b + 1); sec.append({'bas': a, 'son': b, 'baslik': m.group(3), 'ozet': m.group(4)}); continue
        m = re.match(r'(\d+)(?:-(\d+))? ([^|]*)(?:\| ?(.*))?$', line)
        if not m: errs.append(f'{p}:{ln} satır bozuk: {line[:40]}'); continue
        a = int(m.group(1)); b = int(m.group(2) or a)
        ks = m.group(3).split(); hs = (m.group(4) or '').split()
        for k in ks:
            if k.rstrip('*') not in K: errs.append(f'{p}:{ln} bilinmeyen konu {k}')
        for h in hs:
            if h.rstrip('!') not in H: errs.append(f'{p}:{ln} bilinmeyen hâl {h}')
        for x in range(a, b + 1):
            if x in tags: errs.append(f'{p}:{ln} ayet {x} iki kez')
            if not 1 <= x <= n[s]: errs.append(f'{p}:{ln} ayet {x} sure dışında')
            tags[x] = {'konular': ks, 'haller': hs}
            kc.update(k.rstrip('*') for k in ks); hc.update(h.rstrip('!') for h in hs)
    if cover != list(range(1, n[s] + 1)): errs.append(f'{p} bölümler 1..{n[s]} aralığını tam ve sıralı kaplamıyor')
    else: done += n[s]
    secs += len(sec); out[s] = {'bolumler': sec, 'ayetler': tags}
print(f'sure dosyası: {len(out)}/114 | tamamlanan ayet: {done}/6236 | bölüm: {secs}')
print('HATA:', len(errs)); [print('  ', e) for e in errs[:40]]
if '--say' in sys.argv:
    print('konu:', dict(kc.most_common())); print('hâl:', dict(hc.most_common()))
    print('hiç kullanılmayan konu:', sorted(K - set(kc))); print('hiç kullanılmayan hâl:', sorted(H - set(hc)))
sys.exit(1 if errs else 0)
