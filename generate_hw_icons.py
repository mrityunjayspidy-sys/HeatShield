import os
from PIL import Image, ImageDraw, ImageFont

def create_hw_icon(size, font_path=None):
    # Create black background image
    image = Image.new('RGBA', (size, size), (0, 0, 0, 255))
    draw = ImageDraw.Draw(image)
    
    # Try loading a bold font, fallback to default font
    font = None
    fontSize = int(size * 0.48)
    
    system_fonts = [
        "C:\\Windows\\Fonts\\arialbd.ttf",
        "C:\\Windows\\Fonts\\segoeuib.ttf",
        "C:\\Windows\\Fonts\\impact.ttf",
        "C:\\Windows\\Fonts\\tahomabd.ttf",
    ]
    
    for fpath in system_fonts:
        if os.path.exists(fpath):
            try:
                font = ImageFont.truetype(fpath, fontSize)
                break
            except Exception:
                pass
                
    if font is None:
        font = ImageFont.load_default()

    text = "HW"
    
    # Use bbox to center text precisely
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    x = (size - text_width) / 2 - bbox[0]
    y = (size - text_height) / 2 - bbox[1]
    
    # Draw crisp white text
    draw.text((x, y), text, fill=(255, 255, 255, 255), font=font)
    return image

# Define paths and sizes
targets = [
    ("public/favicon.png", 64),
    ("public/apple-touch-icon.png", 180),
    ("public/app-icon.png", 512),
    ("public/icon-192.png", 192),
    ("public/icon-512.png", 512),
    ("public/logo.png", 512),
    ("android/app/src/main/res/mipmap-mdpi/ic_launcher.png", 48),
    ("android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png", 48),
    ("android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png", 48),
    ("android/app/src/main/res/mipmap-hdpi/ic_launcher.png", 72),
    ("android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png", 72),
    ("android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.png", 72),
    ("android/app/src/main/res/mipmap-xhdpi/ic_launcher.png", 96),
    ("android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png", 96),
    ("android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png", 96),
    ("android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png", 144),
    ("android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png", 144),
    ("android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png", 144),
    ("android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png", 192),
    ("android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png", 192),
    ("android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png", 192),
]

for rel_path, size in targets:
    abs_path = os.path.abspath(rel_path)
    os.makedirs(os.path.dirname(abs_path), exist_ok=True)
    img = create_hw_icon(size)
    img.save(abs_path, "PNG")
    print(f"Generated {rel_path} ({size}x{size})")

print("All app icons generated successfully!")
