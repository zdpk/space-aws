#!/usr/bin/env python3
"""Generate SPACE AWS extension icons from the approved store source."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter


OUTPUT_DIR = Path(__file__).resolve().parent
SOURCE_PATH = OUTPUT_DIR.parents[1] / "store-assets" / "source" / "space-aws-icon-source.png"


def render_icon(source: Image.Image, size: int) -> Image.Image:
    if size == 16:
        scale = 8
        canvas_size = size * scale
        icon = Image.new("RGBA", (canvas_size, canvas_size), (2, 7, 20, 255))
        draw = ImageDraw.Draw(icon)
        draw.rounded_rectangle(
            (2, 2, canvas_size - 3, canvas_size - 3),
            radius=round(canvas_size * 0.22),
            fill=(3, 13, 39, 255),
        )
        draw.arc(
            (
                round(canvas_size * 0.08),
                round(canvas_size * 0.22),
                round(canvas_size * 0.92),
                round(canvas_size * 0.82),
            ),
            start=190,
            end=350,
            fill=(37, 166, 255, 255),
            width=round(canvas_size * 0.08),
        )
        planet_box = (
            round(canvas_size * 0.34),
            round(canvas_size * 0.22),
            round(canvas_size * 0.70),
            round(canvas_size * 0.58),
        )
        draw.ellipse(planet_box, fill=(255, 191, 78, 255))
        draw.ellipse(
            (
                round(canvas_size * 0.42),
                round(canvas_size * 0.18),
                round(canvas_size * 0.73),
                round(canvas_size * 0.54),
            ),
            fill=(3, 13, 39, 255),
        )
        return icon.resize((size, size), Image.Resampling.LANCZOS)

    icon = source.resize((size, size), Image.Resampling.LANCZOS)
    if size <= 48:
        icon = ImageEnhance.Contrast(icon).enhance(1.12)
        icon = icon.filter(ImageFilter.UnsharpMask(radius=0.6, percent=135, threshold=2))
    return icon


def main() -> None:
    source = Image.open(SOURCE_PATH).convert("RGBA")
    for size in (16, 48, 128):
        render_icon(source, size).save(OUTPUT_DIR / f"icon{size}.png", optimize=True)


if __name__ == "__main__":
    main()
