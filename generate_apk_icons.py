import os
from PIL import Image, ImageDraw, ImageFont

def get_bold_font(font_size):
    system_fonts = [
        "C:\\Windows\\Fonts\\arialbd.ttf",
        "C:\\Windows\\Fonts\\segoeuib.ttf",
        "C:\\Windows\\Fonts\\impact.ttf",
        "C:\\Windows\\Fonts\\tahomabd.ttf",
    ]
    for fpath in system_fonts:
        if os.path.exists(fpath):
            try:
                return ImageFont.truetype(fpath, font_size)
            except Exception:
                pass
    return ImageFont.load_default()

def create_solid_hw_icon(size):
    """ Solid black background with centered ultra-bold white HW text """
    image = Image.new('RGBA', (size, size), (0, 0, 0, 255))
    draw = ImageDraw.Draw(image)
    
    font_size = int(size * 0.52)
    font = get_bold_font(font_size)
    text = "HW"
    
    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    
    x = (size - text_w) / 2 - bbox[0]
    y = (size - text_h) / 2 - bbox[1]
    
    draw.text((x, y), text, fill=(255, 255, 255, 255), font=font)
    return image

def create_foreground_hw_icon(size):
    """ Transparent background with centered ultra-bold white HW text (for Android adaptive icons) """
    image = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    
    # Safe zone for adaptive foreground is ~50% of size
    font_size = int(size * 0.38)
    font = get_bold_font(font_size)
    text = "HW"
    
    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    
    x = (size - text_w) / 2 - bbox[0]
    y = (size - text_h) / 2 - bbox[1]
    
    draw.text((x, y), text, fill=(255, 255, 255, 255), font=font)
    return image

# Density mapping (size, foreground_size)
densities = {
    "mipmap-mdpi": (48, 108),
    "mipmap-hdpi": (72, 162),
    "mipmap-xhdpi": (96, 216),
    "mipmap-xxhdpi": (144, 324),
    "mipmap-xxxhdpi": (192, 432),
}

base_res = os.path.abspath("android/app/src/main/res")

for folder, (ic_size, fg_size) in densities.items():
    folder_path = os.path.join(base_res, folder)
    os.makedirs(folder_path, exist_ok=True)
    
    # Save ic_launcher.png & ic_launcher_round.png
    solid_img = create_solid_hw_icon(ic_size)
    solid_img.save(os.path.join(folder_path, "ic_launcher.png"), "PNG")
    solid_img.save(os.path.join(folder_path, "ic_launcher_round.png"), "PNG")
    
    # Save ic_launcher_foreground.png
    fg_img = create_foreground_hw_icon(fg_size)
    fg_img.save(os.path.join(folder_path, "ic_launcher_foreground.png"), "PNG")
    
    print(f"Generated Android icons for {folder}: launcher {ic_size}x{ic_size}, fg {fg_size}x{fg_size}")

# Also update web public assets
public_dir = os.path.abspath("public")
create_solid_hw_icon(512).save(os.path.join(public_dir, "app-icon.png"), "PNG")
create_solid_hw_icon(512).save(os.path.join(public_dir, "icon-512.png"), "PNG")
create_solid_hw_icon(192).save(os.path.join(public_dir, "icon-192.png"), "PNG")
create_solid_hw_icon(180).save(os.path.join(public_dir, "apple-touch-icon.png"), "PNG")
create_solid_hw_icon(64).save(os.path.join(public_dir, "favicon.png"), "PNG")

print("All APK and web icons generated successfully!")
