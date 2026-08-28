"""Crop a generated world backplate to 4:3 and normalize its pixel scale."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    arguments = parser.parse_args()

    source = Image.open(arguments.input).convert("RGB")
    target_ratio = 4 / 3
    if source.width / source.height > target_ratio:
        width = round(source.height * target_ratio)
        left = (source.width - width) // 2
        source = source.crop((left, 0, left + width, source.height))
    else:
        height = round(source.width / target_ratio)
        top = (source.height - height) // 2
        source = source.crop((0, top, source.width, top + height))

    source = source.resize((1200, 900), Image.Resampling.NEAREST)
    arguments.output.parent.mkdir(parents=True, exist_ok=True)
    source.save(arguments.output, optimize=True)


if __name__ == "__main__":
    main()
