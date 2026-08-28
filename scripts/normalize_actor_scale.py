"""Normalize apparent actor height while preserving a fixed foot anchor per cell."""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image


def keep_largest_alpha_component(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    width, height = image.size
    visited: set[tuple[int, int]] = set()
    components: list[list[tuple[int, int]]] = []

    for y in range(height):
        for x in range(width):
            if not alpha.getpixel((x, y)) or (x, y) in visited:
                continue
            component: list[tuple[int, int]] = []
            queue = deque([(x, y)])
            visited.add((x, y))
            while queue:
                point_x, point_y = queue.popleft()
                component.append((point_x, point_y))
                for next_x, next_y in (
                    (point_x - 1, point_y - 1), (point_x, point_y - 1), (point_x + 1, point_y - 1),
                    (point_x - 1, point_y), (point_x + 1, point_y),
                    (point_x - 1, point_y + 1), (point_x, point_y + 1), (point_x + 1, point_y + 1),
                ):
                    if 0 <= next_x < width and 0 <= next_y < height and alpha.getpixel((next_x, next_y)) and (next_x, next_y) not in visited:
                        visited.add((next_x, next_y))
                        queue.append((next_x, next_y))
            components.append(component)

    if not components:
        return image

    keep = set(max(components, key=len))
    pixels = image.load()
    for y in range(height):
        for x in range(width):
            if (x, y) not in keep:
                pixels[x, y] = (0, 0, 0, 0)
    return image


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--target-height", type=int, default=56)
    parser.add_argument("--max-width", type=int, default=60)
    parser.add_argument("--foot-line", type=int, default=62)
    parser.add_argument("--largest-component-only", action="store_true")
    arguments = parser.parse_args()

    source = Image.open(arguments.input).convert("RGBA")
    cell_width = source.width // 4
    cell_height = source.height // 4
    destination = Image.new("RGBA", source.size, (0, 0, 0, 0))

    for row in range(4):
        for column in range(4):
            cell = source.crop((
                column * cell_width,
                row * cell_height,
                (column + 1) * cell_width,
                (row + 1) * cell_height,
            ))
            if arguments.largest_component_only:
                cell = keep_largest_alpha_component(cell)
            bounds = cell.getchannel("A").getbbox()
            if not bounds:
                continue
            actor = cell.crop(bounds)
            scale = min(arguments.target_height / actor.height, arguments.max_width / actor.width)
            width = max(1, round(actor.width * scale))
            height = max(1, round(actor.height * scale))
            actor = actor.resize((width, height), Image.Resampling.NEAREST)
            x = column * cell_width + (cell_width - width) // 2
            y = row * cell_height + arguments.foot_line - height
            destination.alpha_composite(actor, (x, y))

    arguments.output.parent.mkdir(parents=True, exist_ok=True)
    destination.save(arguments.output, optimize=True)


if __name__ == "__main__":
    main()
