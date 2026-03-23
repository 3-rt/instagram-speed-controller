"""
Generate Chrome Web Store graphic assets for Instagram Speed Controller.
All images are saved as 24-bit RGB PNG (no alpha channel).
"""

from PIL import Image, ImageDraw, ImageFont
import os
import math

ASSETS_DIR = os.path.expanduser("~/instagram-speed-controller/store-assets")
os.makedirs(ASSETS_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# Helper: try to load a reasonably bold system font, fall back to default
# ---------------------------------------------------------------------------
def load_font(size, bold=False):
    candidates = [
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/HelveticaNeue.ttc",
        "/Library/Fonts/Arial Bold.ttf",
        "/Library/Fonts/Arial.ttf",
        "/System/Library/Fonts/SFNSDisplay.ttf",
        "/System/Library/Fonts/SFNS.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                pass
    return ImageFont.load_default()


def draw_play_triangle(draw, cx, cy, size, color):
    """Draw a right-pointing filled triangle centred at (cx, cy)."""
    half_h = size * 0.55
    half_w = size * 0.50
    points = [
        (cx - half_w, cy - half_h),
        (cx - half_w, cy + half_h),
        (cx + half_w, cy),
    ]
    draw.polygon(points, fill=color)


def draw_speed_lines(draw, x_start, y_center, color, n=3, max_len=18, gap=7, thickness=3):
    """Draw horizontal speed lines to the right of the play triangle."""
    lengths = [max_len, max_len * 0.65, max_len * 0.40]
    total_height = (n - 1) * gap
    y0 = y_center - total_height // 2
    for i in range(n):
        y = y0 + i * gap
        length = int(lengths[i % len(lengths)])
        draw.rectangle([x_start, y - thickness // 2,
                        x_start + length, y + thickness // 2], fill=color)


# ---------------------------------------------------------------------------
# 1. Store Icon  128 x 128
# ---------------------------------------------------------------------------
def make_icon128():
    W, H = 128, 128
    img = Image.new("RGB", (W, H), color="#1a1a1a")
    draw = ImageDraw.Draw(img)

    # Triangle slightly left of centre to leave room for speed lines
    tri_cx, tri_cy = 52, 64
    tri_size = 30          # controls half-height / half-width

    draw_play_triangle(draw, tri_cx, tri_cy, tri_size, color=(255, 255, 255))

    # Speed lines to the right of triangle
    lines_x = tri_cx + tri_size + 6
    draw_speed_lines(draw, lines_x, tri_cy, color=(255, 255, 255),
                     n=3, max_len=22, gap=9, thickness=3)

    assert img.mode == "RGB", f"Expected RGB, got {img.mode}"
    path = os.path.join(ASSETS_DIR, "icon128.png")
    img.save(path, format="PNG")
    print(f"Saved {path}  ({img.size}, {img.mode})")


# ---------------------------------------------------------------------------
# 2. Screenshot  1280 x 800
# ---------------------------------------------------------------------------
def make_screenshot():
    W, H = 1280, 800
    img = Image.new("RGB", (W, H), color="#262626")
    draw = ImageDraw.Draw(img)

    # --- Video / reel area ---
    reel_w, reel_h = 500, 680
    reel_x = (W - reel_w) // 2
    reel_y = (H - reel_h) // 2 + 10    # slight downward offset for title room
    draw.rounded_rectangle(
        [reel_x, reel_y, reel_x + reel_w, reel_y + reel_h],
        radius=16, fill="#363636"
    )

    # --- Speed overlay pill ---
    pill_x = reel_x + 18
    pill_y = reel_y + 18
    pill_w, pill_h = 220, 48
    pill_color = (20, 20, 20)   # very dark, simulating semi-transparent overlay
    draw.rounded_rectangle(
        [pill_x, pill_y, pill_x + pill_w, pill_y + pill_h],
        radius=24, fill=pill_color
    )

    font_speed = load_font(26, bold=True)
    font_btn   = load_font(20)
    font_title = load_font(36, bold=True)
    font_sub   = load_font(22)
    font_caption = load_font(20)

    # Speed value text
    speed_text = "1.50×"
    bbox = draw.textbbox((0, 0), speed_text, font=font_speed)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    text_x = pill_x + 14
    text_y = pill_y + (pill_h - th) // 2 - bbox[1]
    draw.text((text_x, text_y), speed_text, font=font_speed, fill=(255, 255, 255))

    # Control button circles inside pill
    btn_labels = ["«", "−", "+", "»"]
    btn_r = 11
    btn_start_x = pill_x + 14 + tw + 14
    btn_y_center = pill_y + pill_h // 2
    for i, label in enumerate(btn_labels):
        bx = btn_start_x + i * (btn_r * 2 + 6)
        by = btn_y_center
        draw.ellipse(
            [bx - btn_r, by - btn_r, bx + btn_r, by + btn_r],
            fill=(60, 60, 60), outline=(130, 130, 130), width=1
        )
        bb = draw.textbbox((0, 0), label, font=font_btn)
        lw = bb[2] - bb[0]
        lh = bb[3] - bb[1]
        draw.text((bx - lw // 2, by - lh // 2 - bb[1]), label,
                  font=font_btn, fill=(220, 220, 220))

    # Fake progress bar at bottom of reel
    bar_h = 4
    bar_y = reel_y + reel_h - 24
    draw.rectangle([reel_x + 20, bar_y, reel_x + reel_w - 20, bar_y + bar_h],
                   fill=(80, 80, 80))
    progress = int((reel_w - 40) * 0.35)
    draw.rectangle([reel_x + 20, bar_y, reel_x + 20 + progress, bar_y + bar_h],
                   fill=(255, 255, 255))

    # A subtle play icon in the centre of the reel
    draw_play_triangle(draw, reel_x + reel_w // 2, reel_y + reel_h // 2,
                       size=40, color=(100, 100, 100))

    # --- Top title ---
    title = "Instagram Speed Controller"
    bb = draw.textbbox((0, 0), title, font=font_title)
    tw = bb[2] - bb[0]
    draw.text(((W - tw) // 2, 28), title, font=font_title, fill=(255, 255, 255))

    # --- Bottom caption ---
    caption = "Control playback speed with overlay, hotkeys, and mouse-hold"
    bb = draw.textbbox((0, 0), caption, font=font_caption)
    tw = bb[2] - bb[0]
    draw.text(((W - tw) // 2, H - 40), caption,
              font=font_caption, fill=(180, 180, 180))

    assert img.mode == "RGB", f"Expected RGB, got {img.mode}"
    path = os.path.join(ASSETS_DIR, "screenshot1.png")
    img.save(path, format="PNG")
    print(f"Saved {path}  ({img.size}, {img.mode})")


# ---------------------------------------------------------------------------
# 3. Small Promo Tile  440 x 280
# ---------------------------------------------------------------------------
def make_promo_small():
    W, H = 440, 280
    img = Image.new("RGB", (W, H), color="#1a1a1a")
    draw = ImageDraw.Draw(img)

    # --- Play/speed icon (top-left quadrant as accent) ---
    icon_cx, icon_cy = 62, H // 2
    icon_size = 26
    draw_play_triangle(draw, icon_cx, icon_cy, icon_size, color=(255, 255, 255))
    draw_speed_lines(draw, icon_cx + icon_size + 5, icon_cy,
                     color=(255, 255, 255), n=3, max_len=18, gap=8, thickness=2)

    # --- Main title ---
    font_main = load_font(34, bold=True)
    font_sub  = load_font(20)

    title = "Instagram Speed Controller"
    # Word-wrap if needed: split into two lines
    line1 = "Instagram Speed"
    line2 = "Controller"

    bb1 = draw.textbbox((0, 0), line1, font=font_main)
    bb2 = draw.textbbox((0, 0), line2, font=font_main)
    line_h = bb1[3] - bb1[1]
    gap_lines = 6

    total_text_h = line_h * 2 + gap_lines
    y1 = H // 2 - total_text_h // 2 - 18
    y2 = y1 + line_h + gap_lines

    def centered_text(text, y, font, fill):
        bb = draw.textbbox((0, 0), text, font=font)
        tw = bb[2] - bb[0]
        draw.text(((W - tw) // 2, y - bb[1]), text, font=font, fill=fill)

    centered_text(line1, y1, font_main, (255, 255, 255))
    centered_text(line2, y2, font_main, (255, 255, 255))

    # Subtitle
    subtitle = "Control Reels playback speed"
    sub_y = y2 + line_h + 18
    centered_text(subtitle, sub_y, font_sub, (0x88, 0x88, 0x88))

    assert img.mode == "RGB", f"Expected RGB, got {img.mode}"
    path = os.path.join(ASSETS_DIR, "promo-small.png")
    img.save(path, format="PNG")
    print(f"Saved {path}  ({img.size}, {img.mode})")


# ---------------------------------------------------------------------------
if __name__ == "__main__":
    make_icon128()
    make_screenshot()
    make_promo_small()
    print("\nAll assets generated successfully.")
