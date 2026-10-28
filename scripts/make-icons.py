"""生成像素风 App 图标、启动图和网页图标（用法：python3 scripts/make-icons.py，需要 Pillow）"""
from PIL import Image, ImageDraw

INK, SKY, GREEN, WHITE, GREY = (26, 28, 44), (65, 166, 246), (56, 183, 100), (244, 244, 244), (148, 176, 194)
COLORS = {'k': INK, 'w': WHITE, 'b': (59, 93, 201), 'C': (115, 239, 247), 'g': GREY}
PLANE = [
    '................',
    '.kk.............',
    '.kbk............',
    '.kbbk...........',
    '.kbbbkkkkkkkk...',
    'kkwwwwwwwwwwwkk.',
    'kwwbwwbwwbwwbwCk',
    'kwwwwwwwwwwwwwkk',
    '.kkkkkwwwwkkkk..',
    '......kwwwk.....',
    '.....kwwwk......',
    '.....kkkk.......',
]
CLOUD = ['....kkkk....', '...kwwwwk...', '.kkwwwwwwkk.', 'kwwwwwwwwwwk', 'kwwwwwwwwwgk', '.kgggggggk..', '..kkkkkkk...']


def sprite(img, rows, x0, y0, s, tint=None):
    d = ImageDraw.Draw(img)
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch != '.':
                d.rectangle([x0 + x * s, y0 + y * s, x0 + (x + 1) * s - 1, y0 + (y + 1) * s - 1], fill=tint or COLORS[ch])


def scene(size, plane_scale):
    img = Image.new('RGBA', (size, size), SKY)
    d = ImageDraw.Draw(img)
    u = size // 32
    d.rectangle([0, size - 6 * u, size, size], fill=GREEN)
    d.rectangle([0, size - 6 * u, size, size - 6 * u + u // 2], fill=INK)
    if u >= 3:  # 小图标上云会糊成一团，不画
        sprite(img, CLOUD, 19 * u, 2 * u, u)
        sprite(img, CLOUD, 2 * u, 19 * u, u * 2 // 3)
    pw = 16 * plane_scale
    sprite(img, PLANE, (size - pw) // 2, (size - 12 * plane_scale) // 2 - u, plane_scale)
    return img


scene(1024, 40).convert('RGB').save('assets/icon.png')
scene(48, 2).convert('RGB').save('assets/favicon.png')

# 安卓自适应图标：前景只放飞机，留出安全边距
fg = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
sprite(fg, PLANE, (1024 - 16 * 36) // 2, (1024 - 12 * 36) // 2, 36)
fg.save('assets/android-icon-foreground.png')
Image.new('RGB', (1024, 1024), SKY).save('assets/android-icon-background.png')
mono = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
sprite(mono, PLANE, (1024 - 16 * 36) // 2, (1024 - 12 * 36) // 2, 36, tint=(255, 255, 255))
mono.save('assets/android-icon-monochrome.png')

# 启动图：透明背景上的飞机，背景色在 app.json 里设成天空蓝
splash = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
sprite(splash, PLANE, (512 - 16 * 24) // 2, (512 - 12 * 24) // 2, 24)
splash.save('assets/splash-icon.png')
print('icons written')
