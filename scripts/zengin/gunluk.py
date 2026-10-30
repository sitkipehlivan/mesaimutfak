# Sıradaki zengin içerik dosyasını (scripts/zengin/sira/*.yaml, ada göre ilk) tariflere uygular ve dosyayı siler.
import os, sys, glob, subprocess, datetime
HERE = os.path.dirname(os.path.abspath(__file__))
files = sorted(glob.glob(os.path.join(HERE, 'sira', '*.yaml')))
if not files: print('Sırada içerik yok.'); sys.exit(0)
f = files[0]
today = (datetime.datetime.utcnow() + datetime.timedelta(hours=3)).strftime('%Y-%m-%d')
src = open(f).read().replace('__BUGUN__', today)
tmp = f + '.tmp'; open(tmp, 'w').write(src)
subprocess.run([sys.executable, os.path.join(HERE, 'uygula.py'), tmp], check=True, env={**os.environ, 'BUGUN': today})
os.remove(tmp); os.remove(f)
print('Uygulandı:', os.path.basename(f))
