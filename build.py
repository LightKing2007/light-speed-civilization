import sys
mode=sys.argv[1]  # cdn | local
land=open('land.b64').read().strip(); us=open('us.b64').read().strip()
head=open('src/head.html').read()
libs=['build/three.min.js','examples/js/shaders/CopyShader.js','examples/js/shaders/LuminosityHighPassShader.js','examples/js/postprocessing/EffectComposer.js','examples/js/postprocessing/RenderPass.js','examples/js/postprocessing/ShaderPass.js','examples/js/postprocessing/UnrealBloomPass.js','examples/js/environments/RoomEnvironment.js']
if mode=='cdn': tags=''.join(f'<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/{l}"></script>\n' for l in libs)
else: tags=''.join(f'<script src="node_modules/three/{l}"></script>\n' for l in libs)
js=f"const LAND_B64='{land}';\nconst US_B64='{us}';\n"+''.join(open('src/'+f).read()+'\n' for f in ['core.js','audio.js','scenes1.js','scenes2.js','player.js'])
out=head+'\n'+tags+'<script>\n'+js+'</script>\n'
fn='index.html' if mode=='cdn' else 'test.html'
if mode=='local':
    fonts=''.join(f'<link rel="stylesheet" href="node_modules/@fontsource/{p}.css">' for p in ['noto-sans-sc/300','noto-sans-sc/400','noto-sans-sc/500','noto-serif-sc/600','noto-serif-sc/900','big-shoulders-display/600','big-shoulders-display/800','big-shoulders-display/900','jetbrains-mono/400','jetbrains-mono/500'])
    out='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+fonts+'<style>:root{padding:0}</style></head><body>'+out+'</body></html>'
open(fn,'w').write(out); print(fn,len(out))
