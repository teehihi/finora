"""Generate synthetic Vietnamese loan terms for local OCR regression tests.

No personal or lender data is used. Requires Pillow and a Unicode font.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

out = Path(__file__).parent
font_path = Path("C:/Windows/Fonts/arial.ttf")
if not font_path.exists():
    font_path = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
font = ImageFont.truetype(str(font_path), 44)

def page(lines):
    image = Image.new("RGB", (1600, 1100), "white")
    draw = ImageDraw.Draw(image)
    for number, line in enumerate(lines):
        draw.text((90, 110 + number * 120), line, font=font, fill=(12, 22, 19))
    return image

first = page([
    "ĐỀ NGHỊ VAY MẪU",
    "Số tiền vay: 30.000.000 VND",
    "Kỳ hạn: 24 tháng",
    "Lãi suất năm: 12,5%",
    "Phương thức trả nợ: Trả góp đều",
])
second = page([
    "ĐIỀU KHOẢN BỔ SUNG",
    "Phí dịch vụ: 120.000 VND",
    "Phí bảo hiểm: 0 VND",
    "Phí trả nợ trước hạn: 2%",
])
first.save(out / "vi-scan.png", optimize=True)
first.save(out / "vi-scan.pdf", save_all=True, append_images=[second], resolution=180)
first.filter(ImageFilter.GaussianBlur(0.7)).save(
    out / "vi-noisy.jpg", quality=68, subsampling=2
)
page([
    "ĐỀ NGHỊ CHƯA ĐỦ ĐIỀU KHOẢN",
    "Kỳ hạn: 12 tháng",
    "Phí dịch vụ: Chưa xác định",
]).save(out / "vi-incomplete.png", optimize=True)
page([
    "TRANG MỘT",
    "Số tiền vay: 10.000.000 VND",
]).save(
    out / "vi-conflict.pdf",
    save_all=True,
    append_images=[page([
        "TRANG HAI",
        "Số tiền vay: 12.000.000 VND",
    ])],
    resolution=180,
)
