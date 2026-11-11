#!/usr/bin/env python3
"""Tarama dosyalarını uygulamanın okuyacağı JSON'lara çevirir.
Çıktı: data/v3/uygulama/bolumler.json, konular.json, haller.json
Kullanım: disa_aktar.py   (önce kontrol.py ve havuz.py hatasız olmalı)"""
import json, glob, re, os, collections

os.makedirs('data/v3/uygulama', exist_ok=True)
konular = json.load(open('data/v3/konular.json', encoding='utf-8'))
haller = json.load(open('data/v3/haller.json', encoding='utf-8'))
havuz = json.load(open('data/v3/havuzlar.json', encoding='utf-8'))['havuzlar']

bolumler = {}
konu_ayet = collections.defaultdict(list)
konu_ana = collections.defaultdict(list)
for f in sorted(glob.glob('data/v3/sureler/*.txt')):
    s = int(re.search(r'(\d+)\.txt$', f).group(1))
    bl = []
    for ln in open(f, encoding='utf-8'):
        ln = ln.strip()
        if not ln or ln[0] in '#?':
            continue
        if ln[0] == '=':
            r, rest = ln[1:].split(' ', 1)
            baslik, ozet = (t.strip() for t in rest.split('::', 1))
            a, b = (int(t) for t in r.split('-'))
            bl.append({'bas': a, 'son': b, 'baslik': baslik, 'ozet': ozet})
            continue
        sol = ln.split('|', 1)[0].split()
        r, toks = sol[0], sol[1:]
        a, b = (int(t) for t in r.split('-')) if '-' in r else (int(r), int(r))
        for t in toks:
            k = t.rstrip('*')
            for n in range(a, b + 1):
                konu_ayet[k].append([s, n])
                if t.endswith('*'):
                    konu_ana[k].append([s, n])
    bolumler[s] = bl

kon_out = []
for g in konular['gruplar']:
    kon_out.append({'grup': g['grup'], 'konular': [
        {'id': k['id'], 'ad': k['ad'], 'ana': konu_ana[k['id']], 'ayetler': konu_ayet[k['id']]}
        for k in g['konular']]})

hal_out = []
for g in haller['gruplar']:
    hal_out.append({'grup': g['grup'], 'haller': [
        {'id': h['id'], 'etiket': h['etiket'], 'aciklama': h['aciklama'],
         'ayetler': [{'sure': x['sure'], 'bas': x['bas'], 'son': x['son'], 'neden': x['gerekce']}
                     for x in havuz[h['id']]['secilen']]}
        for h in g['haller']]})

def yaz(ad, veri):
    json.dump(veri, open(f'data/v3/uygulama/{ad}', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print(ad, os.path.getsize(f'data/v3/uygulama/{ad}') // 1024, 'KB')

yaz('bolumler.json', bolumler)
yaz('konular.json', kon_out)
yaz('haller.json', hal_out)
