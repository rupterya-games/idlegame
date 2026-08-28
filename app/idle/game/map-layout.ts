import type { Point, WorldRegion } from "./types";
import { BAT_ISLAND } from "./world";

export const MAP_TILE_SIZE = 64;

const fiordevalleRoad: Point[] = [
  { x: 1210, y: -80 },
  { x: 1160, y: 300 },
  { x: 1290, y: 650 },
  { x: 1240, y: 980 },
  { x: 1320, y: 1320 },
  { x: 1350, y: 1880 },
];

const ryukuzamRoad: Point[] = [
  { x: 1120, y: -80 },
  { x: 1140, y: 360 },
  { x: 1260, y: 690 },
  { x: 1180, y: 1040 },
  { x: 1320, y: 1390 },
  { x: 1300, y: 1880 },
];

const bloodSites: Point[] = [
  { x: 720, y: 420 },
  { x: 1280, y: 1060 },
  { x: 1510, y: 1260 },
  { x: 1810, y: 760 },
];

function distanceToSegment(point: Point, from: Point, to: Point) {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;
  if (lengthSquared === 0) return Math.hypot(point.x - from.x, point.y - from.y);
  const progress = Math.max(0, Math.min(1, ((point.x - from.x) * deltaX + (point.y - from.y) * deltaY) / lengthSquared));
  return Math.hypot(point.x - (from.x + deltaX * progress), point.y - (from.y + deltaY * progress));
}

function distanceToRoad(point: Point, road: Point[]) {
  let distance = Infinity;
  for (let index = 1; index < road.length; index += 1) distance = Math.min(distance, distanceToSegment(point, road[index - 1], road[index]));
  return distance;
}

function insideEllipse(point: Point, center: Point, radiusX: number, radiusY: number) {
  return Math.pow((point.x - center.x) / radiusX, 2) + Math.pow((point.y - center.y) / radiusY, 2) <= 1;
}

function waterEdgeAt(y: number) {
  const points = [{ y: 0, x: 380 }, { y: 360, x: 340 }, { y: 720, x: 390 }, { y: 1060, x: 330 }, { y: 1320, x: 310 }, { y: 1580, x: 240 }, { y: 1800, x: 110 }];
  const upper = points.findIndex((point) => point.y >= y);
  if (upper <= 0) return points[0].x;
  const from = points[upper - 1], to = points[upper];
  return from.x + (to.x - from.x) * ((y - from.y) / (to.y - from.y));
}

function isBatIsland(point: Point) {
  return insideEllipse(point, BAT_ISLAND, BAT_ISLAND.radiusX, BAT_ISLAND.radiusY);
}

function isBatCauseway(point: Point) {
  return point.x >= BAT_ISLAND.x + 64 && point.x <= 620 && point.y >= BAT_ISLAND.y - 58 && point.y <= BAT_ISLAND.y + 74;
}

function stableVariant(column: number, row: number, modulo: number) {
  return Math.abs(column * 17 + row * 31 + column * row * 3) % modulo;
}

export function terrainTile(region: WorldRegion, column: number, row: number) {
  const point = { x: column * MAP_TILE_SIZE + MAP_TILE_SIZE / 2, y: row * MAP_TILE_SIZE + MAP_TILE_SIZE / 2 };

  if (region === "fiordevalle") {
    const edge = waterEdgeAt(point.y);
    if (point.x < edge && !isBatIsland(point) && !isBatCauseway(point)) return edge - point.x < MAP_TILE_SIZE ? 9 : 8;
    if (isBatCauseway(point)) return 4;
    if (isBatIsland(point)) return stableVariant(column, row, 5) === 0 ? 12 : 3;
    if (bloodSites.some((site) => Math.hypot(point.x - site.x, point.y - site.y) < 44)) return 14;
    if (distanceToRoad(point, fiordevalleRoad) < 82) return 4;
    if (insideEllipse(point, { x: 1750, y: 940 }, 430, 360)) return stableVariant(column, row, 6) === 0 ? 15 : 1;
    if (insideEllipse(point, { x: 500, y: 750 }, 340, 250)) return stableVariant(column, row, 4) === 0 ? 12 : 3;
    return stableVariant(column, row, 9) === 0 ? 2 : 0;
  }

  if (distanceToRoad(point, ryukuzamRoad) < 82) return 4;
  if (insideEllipse(point, { x: 480, y: 740 }, 360, 260)) return stableVariant(column, row, 5) === 0 ? 8 : 2;
  if (insideEllipse(point, { x: 1720, y: 1080 }, 420, 300)) return stableVariant(column, row, 4) === 0 ? 11 : 3;
  if (insideEllipse(point, { x: 1880, y: 470 }, 280, 220)) return stableVariant(column, row, 5) === 0 ? 9 : 2;
  return stableVariant(column, row, 8) === 0 ? 2 : 0;
}
