import type { Point, WorldRegion } from "./types";

export const WORLD_WIDTH = 2400;
export const WORLD_HEIGHT = 1800;
export const NAV_CELL = 48;
export const BAT_ISLAND = { x: 170, y: 900, radiusX: 128, radiusY: 210 };

export type Obstacle = { x: number; y: number; radius: number; kind: "tree" | "rock" };
export type Landmark = { x: number; y: number; width: number; height: number; atlas: "architecture" | "props"; tile: number; label: string; blockRadius: number; blockOffsetY?: number };

const seeded = (index: number) => {
  const value = Math.sin(index * 918.133 + 42.17) * 43758.5453;
  return value - Math.floor(value);
};

const waterEdgeAt = (y: number) => {
  const points = [{ y: 0, x: 380 }, { y: 360, x: 340 }, { y: 720, x: 390 }, { y: 1060, x: 330 }, { y: 1320, x: 310 }, { y: 1580, x: 240 }, { y: 1800, x: 110 }];
  const upper = points.findIndex((point) => point.y >= y);
  if (upper <= 0) return points[0].x;
  const from = points[upper - 1], to = points[upper], progress = (y - from.y) / (to.y - from.y);
  return from.x + (to.x - from.x) * progress;
};

const isOnBatIsland = (point: Point) => Math.pow((point.x - BAT_ISLAND.x) / BAT_ISLAND.radiusX, 2) + Math.pow((point.y - BAT_ISLAND.y) / BAT_ISLAND.radiusY, 2) <= .88;
const isOnIslandCauseway = (point: Point) => point.x >= BAT_ISLAND.x + 64 && point.x <= 620 && point.y >= BAT_ISLAND.y - 58 && point.y <= BAT_ISLAND.y + 74;
const fiordevalleWaterDepth = (point: Point) => isOnBatIsland(point) || isOnIslandCauseway(point) ? 0 : Math.max(0, waterEdgeAt(point.y) - point.x);
const ryukuzamWaterDepth = (point: Point) => Math.max(0, point.x - (2300 + Math.sin(point.y / 190) * 34));
const waterDepth = (point: Point, region: WorldRegion) => region === "fiordevalle" ? fiordevalleWaterDepth(point) : ryukuzamWaterDepth(point);

export const obstacles: Obstacle[] = Array.from({ length: 64 }, (_, index) => {
  const kind: Obstacle["kind"] = index % 4 === 0 ? "rock" : "tree";
  return {
    x: 110 + seeded(index * 3) * (WORLD_WIDTH - 220),
    y: 110 + seeded(index * 3 + 1) * (WORLD_HEIGHT - 220),
    radius: kind === "tree" ? 27 : 20,
    kind,
  };
}).filter((obstacle) => Math.hypot(obstacle.x - 1200, obstacle.y - 920) > 210
  && Math.abs(obstacle.x - 1240) > 150
  && !isOnBatIsland(obstacle)
  && !isOnIslandCauseway(obstacle));

export const landmarks: Landmark[] = [
  { x: 420, y: 410, width: 192, height: 192, atlas: "architecture", tile: 0, label: "Capela das Rosas", blockRadius: 62 },
  { x: 720, y: 360, width: 176, height: 176, atlas: "architecture", tile: 1, label: "Cripta Carmesim", blockRadius: 58 },
  { x: 1880, y: 430, width: 224, height: 176, atlas: "architecture", tile: 2, label: "Portão do Véu", blockRadius: 74 },
  { x: 1940, y: 1210, width: 144, height: 176, atlas: "architecture", tile: 3, label: "Anjo do Silêncio", blockRadius: 46 },
  { x: 450, y: 1360, width: 176, height: 152, atlas: "architecture", tile: 12, label: "Ponte dos Caçadores", blockRadius: 60 },
  { x: 1580, y: 1320, width: 168, height: 168, atlas: "props", tile: 4, label: "Círculo Rubro", blockRadius: 70 },
  { x: 1720, y: 720, width: 88, height: 112, atlas: "props", tile: 5, label: "Cemitério dos Sinos", blockRadius: 30 },
  { x: 1840, y: 790, width: 112, height: 104, atlas: "props", tile: 6, label: "Cemitério dos Sinos", blockRadius: 34 },
  { x: 1950, y: 850, width: 88, height: 112, atlas: "props", tile: 5, label: "Cemitério dos Sinos", blockRadius: 30 },
];

export const clampToWorld = (point: Point): Point => ({
  x: Math.max(28, Math.min(WORLD_WIDTH - 28, point.x)),
  y: Math.max(28, Math.min(WORLD_HEIGHT - 28, point.y)),
});

export function canStand(point: Point, radius = 16, region: WorldRegion = "fiordevalle") {
  if (point.x < radius || point.y < radius || point.x > WORLD_WIDTH - radius || point.y > WORLD_HEIGHT - radius) return false;
  if (waterDepth(point, region) > 0) return false;
  return obstacles.every((item) => Math.hypot(point.x - item.x, point.y - item.y) > radius + item.radius)
    && landmarks.every((item) => Math.hypot(point.x - item.x, point.y - (item.y + (item.blockOffsetY ?? 0))) > radius + item.blockRadius);
}

function collisionPenalty(point: Point, radius = 16, region: WorldRegion = "fiordevalle") {
  let penalty = Math.max(0, radius - point.x) + Math.max(0, radius - point.y) + Math.max(0, point.x - (WORLD_WIDTH - radius)) + Math.max(0, point.y - (WORLD_HEIGHT - radius)) + waterDepth(point, region);
  for (const item of obstacles) penalty += Math.max(0, radius + item.radius - Math.hypot(point.x - item.x, point.y - item.y));
  for (const item of landmarks) penalty += Math.max(0, radius + item.blockRadius - Math.hypot(point.x - item.x, point.y - (item.y + (item.blockOffsetY ?? 0))));
  return penalty;
}

export function moveWithCollision(current: Point, delta: Point, radius = 16, region: WorldRegion = "fiordevalle"): Point {
  const currentPenalty = collisionPenalty(current, radius, region);
  const nextX = clampToWorld({ x: current.x + delta.x, y: current.y });
  const afterX = canStand(nextX, radius, region) || collisionPenalty(nextX, radius, region) < currentPenalty ? nextX : current;
  const nextY = clampToWorld({ x: afterX.x, y: afterX.y + delta.y });
  return canStand(nextY, radius, region) || collisionPenalty(nextY, radius, region) < collisionPenalty(afterX, radius, region) ? nextY : afterX;
}

export function findWorldPath(start: Point, goal: Point, radius = 18, region: WorldRegion = "fiordevalle"): Point[] {
  const columns = Math.ceil(WORLD_WIDTH / NAV_CELL), rows = Math.ceil(WORLD_HEIGHT / NAV_CELL);
  const toCell = (point: Point) => ({ x: Math.max(0, Math.min(columns - 1, Math.round(point.x / NAV_CELL))), y: Math.max(0, Math.min(rows - 1, Math.round(point.y / NAV_CELL))) });
  const fromCell = (cell: Point) => ({ x: cell.x * NAV_CELL, y: cell.y * NAV_CELL });
  const startCell = toCell(start), goalCell = toCell(goal), key = (cell: Point) => `${cell.x},${cell.y}`;
  const heuristic = (cell: Point) => {
    const dx = Math.abs(cell.x - goalCell.x), dy = Math.abs(cell.y - goalCell.y);
    return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
  };
  const open = [startCell], cameFrom = new Map<string, Point>(), cost = new Map([[key(startCell), 0]]);
  while (open.length) {
    open.sort((a, b) => (cost.get(key(a))! + heuristic(a)) - (cost.get(key(b))! + heuristic(b)));
    const current = open.shift()!;
    if (current.x === goalCell.x && current.y === goalCell.y) {
      const cells = [current]; let cursor = current;
      while (cameFrom.has(key(cursor))) { cursor = cameFrom.get(key(cursor))!; cells.push(cursor); }
      return cells.reverse().slice(1).map(fromCell);
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const next = { x: current.x + dx, y: current.y + dy };
      if (next.x < 0 || next.y < 0 || next.x >= columns || next.y >= rows) continue;
      const worldPoint = fromCell(next);
      if (!(next.x === goalCell.x && next.y === goalCell.y) && !canStand(worldPoint, radius, region)) continue;
      if (dx !== 0 && dy !== 0 && (!canStand(fromCell({ x: current.x + dx, y: current.y }), radius, region) || !canStand(fromCell({ x: current.x, y: current.y + dy }), radius, region))) continue;
      const nextKey = key(next), nextCost = cost.get(key(current))! + (dx !== 0 && dy !== 0 ? Math.SQRT2 : 1);
      if (nextCost >= (cost.get(nextKey) ?? Infinity)) continue;
      cost.set(nextKey, nextCost); cameFrom.set(nextKey, current); if (!open.some((cell) => cell.x === next.x && cell.y === next.y)) open.push(next);
    }
  }
  return [];
}
