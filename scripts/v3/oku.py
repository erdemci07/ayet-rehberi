#!/usr/bin/env python3
"""Tarama için sure metnini kısa biçimde yazdırır.  Kullanım: oku.py SURE [BAS-SON] [--not]"""
import json, sys
q = json.load(open('src/data/quran.json', encoding='utf-8'))
s = int(sys.argv[1]); a, b = 1, 10**6
for x in sys.argv[2:]:
    if x[0].isdigit(): a, b = (int(t) for t in x.split('-'))
notes = '--not' in sys.argv
vs = [v for v in q if v['surahNumber'] == s]
print(f"# {s} {vs[0]['surahName']} ({len(vs)} ayet)")
for v in vs:
    if a <= v['ayahNumber'] <= b:
        print(v['ayahNumber'], v['plainTranslation'])
        if notes:
            for f in v['footnotes']: print('   ^', f['text'][:220])
