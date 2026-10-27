"""Gemini ile görsel üretme / düzenleme yardımcı modülü (yalnızca standart kütüphane + Pillow).

GEMINI_API_KEY ortam değişkeni gerekir (GitHub Actions secret). GEMINI_IMAGE_MODEL ile model seçilebilir.
Önce Interactions API, olmazsa generateContent denenir; her model için sırayla.
"""
import base64
import io
import json
import os
import time
import urllib.error
import urllib.request

API = 'https://generativelanguage.googleapis.com/v1beta'
DEFAULT_MODELS = ['gemini-nano-banana-2.1', 'gemini-3.1-flash-image', 'gemini-2.5-flash-image']


class GeminiError(RuntimeError):
    pass


def _post(url, body, key, timeout=180):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), method='POST', headers={
        'Content-Type': 'application/json', 'x-goog-api-key': key})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors='replace')[:600]
        raise GeminiError(f'HTTP {e.code}: {detail}') from None


def _find_image(obj):
    """Yanıtın içinde base64 görsel verisini bulur (alan adlarından bağımsız)."""
    if isinstance(obj, dict):
        mime = obj.get('mime_type') or obj.get('mimeType') or ''
        data = obj.get('data')
        if isinstance(data, str) and len(data) > 1000 and (mime.startswith('image/') or obj.get('type') == 'image'):
            return base64.b64decode(data)
        for k in ('output_image', 'inline_data', 'inlineData'):
            if k in obj:
                got = _find_image(obj[k])
                if got:
                    return got
        for v in obj.values():
            got = _find_image(v)
            if got:
                return got
    elif isinstance(obj, list):
        for v in reversed(obj):  # son üretilen görsel
            got = _find_image(v)
            if got:
                return got
    return None


def _interactions(model, prompt, images, key, aspect):
    inp = [{'type': 'text', 'text': prompt}]
    for mime, b in images:
        inp.append({'type': 'image', 'mime_type': mime, 'data': base64.b64encode(b).decode()})
    body = {'model': model, 'input': inp, 'response_format': {'type': 'image', 'aspect_ratio': aspect, 'image_size': '2K'}}
    return _post(f'{API}/interactions', body, key)


def _generate_content(model, prompt, images, key, aspect):
    parts = [{'text': prompt}]
    for mime, b in images:
        parts.append({'inline_data': {'mime_type': mime, 'data': base64.b64encode(b).decode()}})
    body = {'contents': [{'role': 'user', 'parts': parts}],
            'generationConfig': {'responseModalities': ['IMAGE'], 'imageConfig': {'aspectRatio': aspect}}}
    return _post(f'{API}/models/{model}:generateContent', body, key)


def generate(prompt, images=(), aspect='16:9'):
    """prompt + (mime, bytes) görselleri -> görsel bayt dizisi."""
    key = os.environ.get('GEMINI_API_KEY')
    if not key:
        raise GeminiError('GEMINI_API_KEY tanımlı değil')
    models = [m for m in [os.environ.get('GEMINI_IMAGE_MODEL')] if m] + DEFAULT_MODELS
    errors = []
    for model in models:
        for fn in (_interactions, _generate_content):
            for attempt in range(2):
                try:
                    res = fn(model, prompt, list(images), key, aspect)
                    img = _find_image(res)
                    if img:
                        print(f'  [gemini] {model} / {fn.__name__} ile üretildi')
                        return img
                    errors.append(f'{model}/{fn.__name__}: yanıtta görsel yok: {json.dumps(res)[:300]}')
                    break
                except GeminiError as e:
                    msg = str(e)
                    errors.append(f'{model}/{fn.__name__}: {msg}')
                    if msg.startswith('HTTP 429') or msg.startswith('HTTP 5'):
                        time.sleep(20)
                        continue
                    break
                except Exception as e:  # ağ hatası vb.
                    errors.append(f'{model}/{fn.__name__}: {e}')
                    time.sleep(5)
    raise GeminiError('Görsel üretilemedi:\n' + '\n'.join(errors[-6:]))


def save_jpeg(img_bytes, path, width=1600, ratio=(16, 9)):
    """Görseli 16:9'a ortadan kırpıp verilen genişlikte JPEG olarak kaydeder."""
    from PIL import Image
    im = Image.open(io.BytesIO(img_bytes)).convert('RGB')
    w, h = im.size
    tw, th = ratio
    if abs(w / h - tw / th) > 0.01:
        if w / h > tw / th:
            nw = int(h * tw / th); x = (w - nw) // 2; im = im.crop((x, 0, x + nw, h))
        else:
            nh = int(w * th / tw); y = (h - nh) // 2; im = im.crop((0, y, w, y + nh))
    if im.width > width:
        im = im.resize((width, int(width * th / tw)), Image.LANCZOS)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, 'JPEG', quality=84, optimize=True, progressive=True)


def fetch(url, timeout=60):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Mesai Mutfak image bot; +https://mesaimutfak.com)'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        data = r.read()
        mime = r.headers.get_content_type()
    if not mime.startswith('image/'):
        from PIL import Image
        Image.open(io.BytesIO(data)).verify()
        mime = 'image/jpeg'
    return mime, data
