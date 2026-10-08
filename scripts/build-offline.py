"""Run after changing runtime files, before publishing. No third-party dependencies."""
from pathlib import Path
import hashlib,json
root=Path(__file__).resolve().parents[1]
files=sorted(p for p in root.rglob('*') if p.is_file() and p.suffix in {'.html','.css','.js','.svg','.png','.mp3','.webmanifest'} and not any(x in p.relative_to(root).parts for x in {'.git','tests','scripts','vendor-src','node_modules'}) and p.name not in {'sw.js','offline-assets.js','save-handler.js'})
h=hashlib.sha256()
for p in files:h.update(str(p.relative_to(root)).encode());h.update(p.read_bytes())
h.update((root/'sw.js').read_bytes())
(root/'offline-assets.js').write_text('const OFFLINE_VERSION='+json.dumps(h.hexdigest()[:12])+';\nconst OFFLINE_ASSETS='+json.dumps([str(p.relative_to(root)) for p in files])+';\n')
print(f'Offline bundle: {len(files)} files, {sum(p.stat().st_size for p in files)//1024} KiB')
