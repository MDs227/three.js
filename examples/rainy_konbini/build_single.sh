#!/bin/bash
# Build dist/index.html: one self-contained page (game modules inlined, three.js from jsDelivr).
# Needed for sandboxed hosts (e.g. claude.ai Artifacts) whose origin is "null": separate module
# files would need CORS headers there, an inline module script does not.
set -e
cd "$(dirname "$0")"
mkdir -p dist
npx --yes esbuild@0.24.2 js/main.js --bundle --format=esm --minify --target=es2020 \
	--external:three --external:'three/addons/*' --outfile=dist/bundle.js --log-level=warning
python3 - <<'PY'
import re
s = open('index.html').read()
b = open('dist/bundle.js').read().replace('</script', '<\\/script')
s = re.sub(r'<script type="importmap">.*?</script>', '<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.186.0/examples/jsm/"}}</script>', s, flags=re.S)
s = s.replace('<script type="module" src="./js/main.js"></script>', '<script type="module">\n' + b + '\n</script>')
open('dist/index.html', 'w').write(s)
PY
rm dist/bundle.js
echo "dist/index.html built"
