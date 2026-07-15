import os
from PIL import Image

def remove_background(image_path):
    print(f"Processing image: {image_path}")
    if not os.path.exists(image_path):
        print("Error: File does not exist")
        return
        
    img = Image.open(image_path).convert("RGBA")
    datas = img.getdata()

    newData = []
    for item in datas:
        r, g, b, a = item
        # If it's pure white or very near white, make it fully transparent
        if r > 240 and g > 240 and b > 240:
            newData.append((r, g, b, 0))
        # If it's light gray, make it semi-transparent for smooth edges
        elif r > 200 and g > 200 and b > 200:
            brightness = (r + g + b) / 3.0
            alpha = int(255 * (240.0 - brightness) / 40.0)
            newData.append((r, g, b, max(0, min(255, alpha))))
        else:
            newData.append(item)

    img.putdata(newData)
    img.save(image_path, "PNG")
    print("Background removed successfully.")

if __name__ == "__main__":
    remove_background("frontend/public/rvce_logo_header.png")
