"""Görseli olmayan tariflere Gemini ile sitenin tarzında yemek fotoğrafı üretir (GitHub Actions'ta çalışır).

- Görseli boş (`image: ''`) tarifleri seçer: önce ana sayfa vitrini, sonra en yeni tarihli tarifler.
- scripts/gorsel/referans/ içindeki örnek görselleri stil referansı olarak gönderir (aynı masa, ışık, peçete).
- src/img/tarifler/<slug>.jpg olarak kaydeder (1376x774) ve tarif dosyasındaki image / imageAlt alanlarını doldurur.
"""
import glob
import json
import os
import re
import sys

import yaml

sys.path.insert(0, os.path.dirname(__file__))
from gemini_image import generate, save_jpeg  # noqa: E402

MAX = int(os.environ.get('MAX_IMAGES', '10'))
REF_DIR = os.path.join(os.path.dirname(__file__), 'referans')

PROMPT = """Create a photorealistic food photograph for the Turkish recipe website "Mesai Mutfak".

DISH: {title}
DESCRIPTION (Turkish): {desc}
MAIN INGREDIENTS (Turkish): {ing}

STYLE - match the attached reference photos exactly:
- Same set: light natural oak wooden table, a sage-green linen napkin, soft bright blurred white kitchen in the background.
- Same light: soft natural window daylight from the side, gentle shadows, warm and clean colors, no heavy filters.
- Same camera: slightly elevated three-quarter angle (about 30-45 degrees), dish slightly off-center, shallow depth of field, 16:9 landscape.
- Plating: the finished dish served authentically as it is served in Turkey, in simple matte ceramic tableware; at most one or two small, fitting side elements (e.g. a glass of tea, ayran, bread, lemon, a small bowl of yogurt) only if they suit the dish.

RULES:
- The food must look real, appetizing and correctly cooked, true to the traditional Turkish version of the dish.
- No text, letters, logos, watermarks, brand packaging, hands or people.
- Do not copy the dishes from the reference photos; they are for style only."""


def front(path):
    raw = open(path, encoding='utf-8').read()
    m = re.match(r'^---\n(.*?)\n---\n', raw, re.S)
    return raw, (yaml.safe_load(m.group(1)) if m else {}) or {}


def ingredients(fm):
    names = []
    for g in fm.get('ingredients') or []:
        for it in g.get('items') or []:
            n = str(it.get('n') or '').strip()
            if n and n not in names:
                names.append(n)
    return ', '.join(names[:10])


def main():
    refs = [('image/jpeg', open(p, 'rb').read()) for p in sorted(glob.glob(os.path.join(REF_DIR, '*.jpg')))]
    try:
        home = json.load(open('src/_data/home.json', encoding='utf-8'))
        prio = [home.get('hero', {}).get('slug')] + list(home.get('popular') or [])
    except Exception:
        prio = []
    todo = []
    for path in glob.glob('src/tarifler/*.md'):
        raw, fm = front(path)
        slug = os.path.basename(path)[:-3]
        img = str(fm.get('image') or '').strip()
        if img and os.path.exists('src' + img):
            continue
        rank = prio.index(slug) if slug in prio else 999
        todo.append((rank, -int(str(fm.get('date') or '0').replace('-', '') or 0), slug, path, fm, raw))
    todo.sort()
    print(f'Görseli olmayan tarif: {len(todo)} | Bu çalıştırmada: {min(MAX, len(todo))}')
    done, failed = [], []
    for _, _, slug, path, fm, raw in todo[:MAX]:
        print(f'-> {slug}')
        try:
            img = generate(PROMPT.format(title=fm.get('title', slug), desc=fm.get('desc', ''), ing=ingredients(fm)), refs)
            out = f'src/img/tarifler/{slug}.jpg'
            save_jpeg(img, out, width=1376)
            new = re.sub(r"^image:.*$", f'image: /img/tarifler/{slug}.jpg', raw, count=1, flags=re.M)
            if not str(fm.get('imageAlt') or '').strip():
                alt = str(fm.get('title', slug)).replace("'", "''")
                new = re.sub(r"^imageAlt:.*$", f"imageAlt: '{alt}'", new, count=1, flags=re.M)
            open(path, 'w', encoding='utf-8').write(new)
            done.append(slug)
        except Exception as e:
            print(f'   HATA: {e}')
            failed.append(f'{slug}: {str(e)[:200]}')
            if 'kotası' in str(e):
                open('/tmp/gemini-last.log', 'w').write('kotası')
                break
    print(f'\nÜretilen: {len(done)} | Hata: {len(failed)} | Kalan: {len(todo) - len(done)}')
    for f in failed:
        print('  !', f)
    with open(os.environ.get('GITHUB_STEP_SUMMARY', os.devnull), 'a') as s:
        s.write(f'### Tarif görselleri\n- Üretilen: {len(done)}\n- Hata: {len(failed)}\n- Görsel bekleyen: {len(todo) - len(done)}\n')
        for d in done:
            s.write(f'  - {d}\n')
        for f in failed:
            s.write(f'  - HATA {f}\n')


if __name__ == '__main__':
    main()
