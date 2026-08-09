from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
INPUT_DIR = ROOT / ".verification"
OUTPUT_DIR = INPUT_DIR / "contact-sheets"

SCREENS = [
    ("01", "Ana Sayfa", "01-home.png"),
    ("02", "Keşfet", "02-explore.png"),
    ("03", "MoveAI", "03-moveai.png"),
    ("04", "Hizmet Talebi", "04-create-service.png"),
    ("05", "Profesyonel Listesi", "05-professionals.png"),
    ("06", "Teklifler", "06-offers.png"),
    ("07", "Ödeme", "07-payment.png"),
    ("08", "Aktif İş / Canlı Takip", "08-tracking.png"),
    ("09", "İşlerim", "09-my-jobs.png"),
    ("10", "Mesajlar", "10-messages.png"),
    ("11", "MoveWallet", "11-wallet.png"),
    ("12", "Profil", "12-profile.png"),
    ("13", "Profesyonel Dashboard", "13-provider-dashboard.png"),
    ("14", "Yeni İş Fırsatları", "14-provider-opportunities.png"),
]

GROUPS = [
    ("01-04.png", SCREENS[0:4]),
    ("05-08.png", SCREENS[4:8]),
    ("09-12.png", SCREENS[8:12]),
    ("13-14.png", SCREENS[12:14]),
]

SCREEN_SIZE = (390, 844)
LABEL_HEIGHT = 42
GUTTER = 18
OUTER = 22
BACKGROUND = "#090A0C"
PANEL = "#17191D"
TEXT = "#F4F4F5"
ACCENT = "#FF7A1A"


def load_font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size=size)
    return ImageFont.load_default()


def build_sheet(output_name: str, items: list[tuple[str, str, str]]) -> None:
    columns = 2
    rows = (len(items) + columns - 1) // columns
    panel_width = SCREEN_SIZE[0]
    panel_height = LABEL_HEIGHT + SCREEN_SIZE[1]
    width = OUTER * 2 + columns * panel_width + (columns - 1) * GUTTER
    height = OUTER * 2 + rows * panel_height + (rows - 1) * GUTTER
    sheet = Image.new("RGB", (width, height), BACKGROUND)
    draw = ImageDraw.Draw(sheet)
    label_font = load_font(18, bold=True)

    for index, (number, label, file_name) in enumerate(items):
        source_path = INPUT_DIR / file_name
        if not source_path.exists():
            raise FileNotFoundError(f"Eksik render görseli: {source_path}")
        source = Image.open(source_path).convert("RGB")
        fitted = ImageOps.fit(source, SCREEN_SIZE, method=Image.Resampling.LANCZOS)
        column = index % columns
        row = index // columns
        x = OUTER + column * (panel_width + GUTTER)
        y = OUTER + row * (panel_height + GUTTER)
        draw.rounded_rectangle(
            (x, y, x + panel_width, y + panel_height),
            radius=16,
            fill=PANEL,
        )
        draw.text((x + 14, y + 10), number, font=label_font, fill=ACCENT)
        draw.text((x + 52, y + 10), label, font=label_font, fill=TEXT)
        sheet.paste(fitted, (x, y + LABEL_HEIGHT))

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / output_name
    sheet.save(output_path, quality=95)
    print(output_path)


def main() -> None:
    for output_name, items in GROUPS:
        build_sheet(output_name, items)


if __name__ == "__main__":
    main()
