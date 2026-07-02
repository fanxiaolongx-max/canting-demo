from PIL import Image

def process():
    img = Image.open('static/logo.png').convert("RGBA")
    pixels = img.load()

    # Background color #f8fafc -> 248, 250, 252
    bg_r, bg_g, bg_b = 248, 250, 252

    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = pixels[x, y]
            # Multiply blending: result = (top * bottom) / 255
            nr = int((r * bg_r) / 255.0)
            ng = int((g * bg_g) / 255.0)
            nb = int((b * bg_b) / 255.0)
            pixels[x, y] = (nr, ng, nb, a)

    img.save('static/logo.png')
    print("Logo processed with multiply blend.")

process()
