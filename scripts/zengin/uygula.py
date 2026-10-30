# Kullanım: python3 apply.py <yaml dosyası>  — dosyadaki her tarif için gövde (intro), notes, faq ve updated alanlarını yazar
import sys, re, yaml
DATA = yaml.safe_load(open(sys.argv[1]))
import os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'src', 'tarifler') + '/'
for slug, d in DATA.items():
    p = ROOT + slug + '.md'; s = open(p).read()
    _, fm, body = s.split('---', 2)
    for k in ('notes', 'faq', 'updated', 'editorNote'):
        fm = re.sub(r'^%s:.*?(?=^\S|\Z)' % k, '', fm, flags=re.M | re.S)
    o = {'updated': str(d.get('updated', '2026-10-30')), 'notes': d['notes'], 'faq': d['faq']}
    if d.get('editorNote'): o['editorNote'] = d['editorNote'].strip()
    extra = yaml.safe_dump(o, allow_unicode=True, sort_keys=False, width=1000)
    fm = fm.rstrip('\n') + '\n' + extra
    yaml.safe_load(fm)
    open(p, 'w').write('---' + fm + '---\n\n' + d['intro'].strip() + '\n')
    print('✓', slug)
