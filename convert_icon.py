from PIL import Image
import os

input_path = "airbamin-logo.png"
output_path = "favicon_io/favicon.ico"

if os.path.exists(input_path):
    img = Image.open(input_path)
    # Ensure the image is RGBA
    img = img.convert("RGBA")
    img.save(output_path, format='ICO', sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)])
    print(f"Converted {input_path} to {output_path}")
else:
    print(f"Input file not found: {input_path}")
