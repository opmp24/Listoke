from PIL import Image, ImageDraw, ImageFont
import os

os.makedirs(os.path.join('icons'), exist_ok=True)

def make_icon(size, path):
    img = Image.new('RGBA', (size, size), (0,0,0,0))
    draw = ImageDraw.Draw(img)

    # gradient background
    for i in range(size):
        r = int(14 + (2)*(i/size)*100)
        g = int(165 + (1)*(i/size)*50)
        b = int(164 + (2)*(i/size)*80)
        draw.line([(0,i),(size,i)], fill=(r,g,b))

    # rounded rect overlay
    radius = int(size*0.08)
    rect_margin = int(size*0.06)
    draw.rounded_rectangle([rect_margin, rect_margin, size-rect_margin, size-rect_margin], radius=radius, fill=None)

    # text
    try:
        font_size = int(size*0.45)
        font = ImageFont.truetype('arial.ttf', font_size)
    except Exception:
        font = ImageFont.load_default()
        font_size = 40

    text = "SL"
    # get text bounding box (compatible across Pillow versions)
    try:
        bbox = draw.textbbox((0,0), text, font=font)
        w = bbox[2] - bbox[0]
        h = bbox[3] - bbox[1]
    except Exception:
        w, h = font.getsize(text)
    draw.text(((size-w)/2, (size-h)/2), text, font=font, fill=(255,255,255))

    img.save(path)

make_icon(512, os.path.join('icons','icon-512.png'))
make_icon(192, os.path.join('icons','icon-192.png'))
print('Icons generated: icons/icon-192.png, icons/icon-512.png')
