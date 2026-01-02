from PIL import Image
import sys

def make_transparent(input_path, output_path):
    img = Image.open(input_path)
    img = img.convert("RGBA")
    datas = img.getdata()

    newData = []
    for item in datas:
        # Change all white (also shades of whites)
        # to transparent
        if item[0] > 240 and item[1] > 240 and item[2] > 240:
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)

    img.putdata(newData)
    img.save(output_path, "PNG")
    print(f"Saved transparent image to {output_path}")

if __name__ == "__main__":
    input_path = "C:/Users/tkyke/.gemini/antigravity/brain/8952f14c-0d20-47ec-89dd-76a5169a43b1/lazytravelogue_logo_white_bg_1767356200769.png"
    output_path = "c:/Users/tkyke/OneDrive/Desktop/LazyTravelogue/frontend/public/logo.png"
    make_transparent(input_path, output_path)
