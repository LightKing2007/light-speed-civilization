# 用法：python3 -I tools/grid.py out.jpg cols width img1 img2 ...  （把若干截图拼成一张，便于查看）
import sys
from PIL import Image
out, cols, w = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]); fs = sys.argv[4:]
h = w * 9 // 16; rows = (len(fs) + cols - 1) // cols
W = Image.new('RGB', (cols * w, rows * h))
for i, f in enumerate(fs): W.paste(Image.open(f).convert('RGB').resize((w, h), Image.LANCZOS), ((i % cols) * w, (i // cols) * h))
W.save(out, quality=88)
