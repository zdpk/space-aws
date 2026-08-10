#!/usr/bin/env python3
"""Generate AWS Dream extension icons locally with Pillow."""

from pathlib import Path

from PIL import Image, ImageDraw


OUTPUT_DIR = Path(__file__).resolve().parent


def draw_icon(size: int) -> Image.Image:
    scale = 4
    canvas_size = size * scale
    image = Image.new("RGBA", (canvas_size, canvas_size), (5, 10, 28, 255))
    draw = ImageDraw.Draw(image)

    margin = round(canvas_size * 0.14)
    draw.rounded_rectangle(
        (margin, margin, canvas_size - margin, canvas_size - margin),
        radius=round(canvas_size * 0.22),
        fill=(14, 31, 66, 255),
        outline=(75, 119, 190, 255),
        width=max(scale, round(canvas_size * 0.035)),
    )

    moon_box = (
        round(canvas_size * 0.27),
        round(canvas_size * 0.23),
        round(canvas_size * 0.72),
        round(canvas_size * 0.72),
    )
    draw.ellipse(moon_box, fill=(225, 237, 255, 255))
    draw.ellipse(
        (
            round(canvas_size * 0.39),
            round(canvas_size * 0.16),
            round(canvas_size * 0.80),
            round(canvas_size * 0.63),
        ),
        fill=(14, 31, 66, 255),
    )
    star = round(canvas_size * 0.075)
    star_x = round(canvas_size * 0.68)
    star_y = round(canvas_size * 0.70)
    draw.ellipse(
        (star_x - star, star_y - star, star_x + star, star_y + star),
        fill=(111, 210, 255, 255),
    )

    return image.resize((size, size), Image.Resampling.LANCZOS)


def main() -> None:
    for size in (16, 48, 128):
        draw_icon(size).save(OUTPUT_DIR / f"icon{size}.png", optimize=True)


if __name__ == "__main__":
    main()
