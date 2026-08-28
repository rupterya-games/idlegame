"""Normalize generated 4x4 sprite and environment atlases for the game."""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image


def is_background(pixel: tuple[int, int, int, int], mode: str) -> bool:
    red, green, blue, _ = pixel
    if mode == "green-screen":
        return green > 150 and green > red * 1.35 and green > blue * 1.35
    return min(red, green, blue) >= 205 and max(red, green, blue) - min(red, green, blue) <= 34


def remove_connected_background(image: Image.Image, mode: str) -> None:
    if mode in {"alpha", "opaque"}:
        return

    pixels = image.load()
    width, height = image.size
    visited: set[tuple[int, int]] = set()
    queue: deque[tuple[int, int]] = deque()

    def enqueue(x: int, y: int) -> None:
        point = (x, y)
        if point not in visited and is_background(pixels[x, y], mode):
            visited.add(point)
            queue.append(point)

    for x in range(width):
        enqueue(x, 0)
        enqueue(x, height - 1)
    for y in range(height):
        enqueue(0, y)
        enqueue(width - 1, y)

    while queue:
        x, y = queue.popleft()
        pixels[x, y] = (0, 0, 0, 0)
        if x > 0:
            enqueue(x - 1, y)
        if x < width - 1:
            enqueue(x + 1, y)
        if y > 0:
            enqueue(x, y - 1)
        if y < height - 1:
            enqueue(x, y + 1)

    if mode == "green-screen":
        for y in range(height):
            for x in range(width):
                red, green, blue, alpha = pixels[x, y]
                if alpha and green > 55 and green > red + 14 and green > blue + 14:
                    pixels[x, y] = (0, 0, 0, 0)


def normalize(input_path: Path, output_path: Path, cell_size: int, background: str) -> None:
    source = Image.open(input_path).convert("RGBA")
    destination = Image.new("RGBA", (cell_size * 4, cell_size * 4), (0, 0, 0, 0))
    source_cell_width = source.width / 4
    source_cell_height = source.height / 4

    for row in range(4):
        for column in range(4):
            bounds = (
                round(column * source_cell_width),
                round(row * source_cell_height),
                round((column + 1) * source_cell_width),
                round((row + 1) * source_cell_height),
            )
            cell = source.crop(bounds)
            remove_connected_background(cell, background)
            cell = cell.resize((cell_size, cell_size), Image.Resampling.NEAREST)
            destination.alpha_composite(cell, (column * cell_size, row * cell_size))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    destination.save(output_path, optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--cell-size", type=int, required=True)
    parser.add_argument("--background", choices=("alpha", "light-grid", "green-screen", "opaque"), default="alpha")
    arguments = parser.parse_args()
    normalize(arguments.input, arguments.output, arguments.cell_size, arguments.background)


if __name__ == "__main__":
    main()
