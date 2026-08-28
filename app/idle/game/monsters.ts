import type { Monster, MonsterRarity, MonsterSpecies, Point, WorldRegion } from "./types";
import { BAT_ISLAND, canStand, WORLD_HEIGHT, WORLD_WIDTH } from "./world";

type MonsterProfile = {
  hp: number;
  mana: number;
  damage: number;
  abilityDamage: number;
  moveSpeed: number;
  goldReward: number;
  lifeSteal: number;
  aggroRadius: number;
};

export const MONSTER_PROFILES: Record<MonsterRarity, MonsterProfile> = {
  normal: { hp: 44, mana: 30, damage: 6, abilityDamage: 0, moveSpeed: 102, goldReward: 12, lifeSteal: 0, aggroRadius: 340 },
  rare: { hp: 92, mana: 55, damage: 9, abilityDamage: 0, moveSpeed: 110, goldReward: 38, lifeSteal: 4, aggroRadius: 370 },
  legendary: { hp: 180, mana: 100, damage: 13, abilityDamage: 18, moveSpeed: 96, goldReward: 120, lifeSteal: 6, aggroRadius: 430 },
};

export const BAT_PROFILES: Record<"bat" | "golden-bat", MonsterProfile> = {
  bat: { hp: 28, mana: 20, damage: 7, abilityDamage: 0, moveSpeed: 158, goldReward: 9, lifeSteal: 0, aggroRadius: 380 },
  "golden-bat": { hp: 260, mana: 100, damage: 17, abilityDamage: 24, moveSpeed: 188, goldReward: 100, lifeSteal: 0, aggroRadius: 480 },
};

export const GOLDEN_BAT_SPAWN_CHANCE = .02;

export const ONI_PROFILES: Record<"oni-common" | "oni-fighter" | "oni-brute" | "oni-behemut" | "oni-behemut-gold", MonsterProfile> = {
  "oni-common": { hp: 60, mana: 25, damage: 8, abilityDamage: 0, moveSpeed: 105, goldReward: 14, lifeSteal: 0, aggroRadius: 350 },
  "oni-fighter": { hp: 105, mana: 45, damage: 12, abilityDamage: 0, moveSpeed: 122, goldReward: 30, lifeSteal: 0, aggroRadius: 390 },
  "oni-brute": { hp: 185, mana: 70, damage: 18, abilityDamage: 22, moveSpeed: 86, goldReward: 55, lifeSteal: 0, aggroRadius: 420 },
  "oni-behemut": { hp: 340, mana: 100, damage: 24, abilityDamage: 32, moveSpeed: 72, goldReward: 120, lifeSteal: 0, aggroRadius: 470 },
  "oni-behemut-gold": { hp: 500, mana: 130, damage: 30, abilityDamage: 42, moveSpeed: 82, goldReward: 300, lifeSteal: 0, aggroRadius: 520 },
};

const fallbackSpawns: Point[] = [
  { x: 780, y: 580 }, { x: 650, y: 1220 }, { x: 1610, y: 490 }, { x: 1840, y: 1180 },
  { x: 1380, y: 1420 }, { x: 980, y: 310 }, { x: 320, y: 1080 }, { x: 2110, y: 1510 },
];

export function rollMonsterRarity(): MonsterRarity {
  const roll = Math.random();
  if (roll < .7) return "normal";
  if (roll < .94) return "rare";
  return "legendary";
}

export function rollBatSpecies(): "bat" | "golden-bat" {
  return Math.random() < GOLDEN_BAT_SPAWN_CHANCE ? "golden-bat" : "bat";
}

export function findMonsterSpawn(occupied: Point[] = [], region: WorldRegion = "fiordevalle"): Point {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const point = { x: 90 + Math.random() * (WORLD_WIDTH - 180), y: 90 + Math.random() * (WORLD_HEIGHT - 180) };
    if (Math.hypot(point.x - 1200, point.y - 920) < 310 || !canStand(point, 22, region)) continue;
    if (occupied.some((other) => Math.hypot(point.x - other.x, point.y - other.y) < 130)) continue;
    return point;
  }
  return fallbackSpawns.find((point) => canStand(point, 22, region) && occupied.every((other) => Math.hypot(point.x - other.x, point.y - other.y) >= 100)) ?? fallbackSpawns[0];
}

export function findBatIslandSpawn(occupied: Point[] = []): Point {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const angle = Math.random() * Math.PI * 2, distance = Math.sqrt(Math.random()) * .78;
    const point = {
      x: BAT_ISLAND.x + Math.cos(angle) * BAT_ISLAND.radiusX * distance,
      y: BAT_ISLAND.y + Math.sin(angle) * BAT_ISLAND.radiusY * distance,
    };
    if (!canStand(point, 18, "fiordevalle") || occupied.some((other) => Math.hypot(point.x - other.x, point.y - other.y) < 72)) continue;
    return point;
  }
  return { x: BAT_ISLAND.x, y: BAT_ISLAND.y };
}

export function applyMonsterRarity(monster: Monster, rarity: MonsterRarity) {
  const profile = MONSTER_PROFILES[rarity];
  monster.species = "vampire";
  monster.rarity = rarity;
  monster.maxHp = profile.hp;
  monster.hp = profile.hp;
  monster.maxMana = profile.mana;
  monster.mana = profile.mana;
  monster.damage = profile.damage;
  monster.abilityDamage = profile.abilityDamage;
  monster.moveSpeed = profile.moveSpeed;
  monster.goldReward = profile.goldReward;
  monster.lifeSteal = profile.lifeSteal;
  monster.aggroRadius = profile.aggroRadius;
  monster.attackCooldown = 0;
  monster.attackPulse = 0;
  monster.attackDidHit = false;
  monster.abilityCooldown = rarity === "legendary" ? 2.5 : 0;
  monster.abilityPulse = 0;
  monster.abilityDidHit = false;
  return monster;
}

export function applyBatSpecies(monster: Monster, species: "bat" | "golden-bat") {
  const profile = BAT_PROFILES[species];
  monster.species = species;
  monster.rarity = species === "golden-bat" ? "legendary" : "normal";
  monster.maxHp = profile.hp; monster.hp = profile.hp;
  monster.maxMana = profile.mana; monster.mana = profile.mana;
  monster.damage = profile.damage; monster.abilityDamage = profile.abilityDamage;
  monster.moveSpeed = profile.moveSpeed; monster.goldReward = profile.goldReward;
  monster.lifeSteal = profile.lifeSteal; monster.aggroRadius = profile.aggroRadius;
  monster.attackCooldown = 0; monster.attackPulse = 0; monster.attackDidHit = false;
  monster.abilityCooldown = species === "golden-bat" ? 1.8 : 0;
  monster.abilityPulse = 0; monster.abilityDidHit = false;
  return monster;
}

function monsterShell(id: string, home: Point, species: MonsterSpecies, rarity: MonsterRarity): Monster {
  return {
    id, ...home, home: { ...home }, region: "fiordevalle", direction: "down", facing: "right", species, rarity,
    hp: 1, maxHp: 1, mana: 0, maxMana: 0, damage: 0, abilityDamage: 0, moveSpeed: 0,
    goldReward: 0, lifeSteal: 0, attackCooldown: 0, attackPulse: 0, attackDidHit: false,
    abilityCooldown: 0, abilityPulse: 0, abilityDidHit: false, aggroRadius: 0, thinkCooldown: 0,
    path: [], deathTimer: 0,
  };
}

export function createMonster(index: number, home: Point, rarity: MonsterRarity = rollMonsterRarity()): Monster {
  const monster = monsterShell(`vampire-${index}`, home, "vampire", rarity);
  monster.facing = index % 2 ? "left" : "right";
  return applyMonsterRarity(monster, rarity);
}

export function createBat(index: number, home: Point, species: "bat" | "golden-bat" = "bat"): Monster {
  return applyBatSpecies(monsterShell(`bat-${index}`, home, species, species === "golden-bat" ? "legendary" : "normal"), species);
}

export function applyOniSpecies(monster: Monster, species: keyof typeof ONI_PROFILES) {
  const profile = ONI_PROFILES[species];
  monster.region = "ryukuzam"; monster.species = species;
  monster.rarity = species === "oni-behemut-gold" ? "legendary" : species === "oni-behemut" || species === "oni-brute" ? "rare" : "normal";
  monster.maxHp = profile.hp; monster.hp = profile.hp; monster.maxMana = profile.mana; monster.mana = profile.mana;
  monster.damage = profile.damage; monster.abilityDamage = profile.abilityDamage; monster.moveSpeed = profile.moveSpeed;
  monster.goldReward = profile.goldReward; monster.lifeSteal = profile.lifeSteal; monster.aggroRadius = profile.aggroRadius;
  monster.attackCooldown = 0; monster.attackPulse = 0; monster.attackDidHit = false;
  monster.abilityCooldown = profile.abilityDamage > 0 ? 2.2 : 0; monster.abilityPulse = 0; monster.abilityDidHit = false;
  return monster;
}

export function createOni(index: number, home: Point, species: keyof typeof ONI_PROFILES): Monster {
  return applyOniSpecies(monsterShell(`oni-${index}`, home, species, "normal"), species);
}

export function respawnMonster(monster: Monster, occupied: Point[]) {
  const isBat = monster.species === "bat" || monster.species === "golden-bat";
  const isOni = monster.region === "ryukuzam";
  const home = isBat ? findBatIslandSpawn(occupied) : findMonsterSpawn(occupied, monster.region);
  monster.x = home.x;
  monster.y = home.y;
  monster.home = { ...home };
  monster.path = [];
  monster.thinkCooldown = 0;
  monster.deathTimer = 0;
  monster.direction = "down";
  if (isOni) {
    const nextSpecies = monster.species === "oni-behemut" || monster.species === "oni-behemut-gold" ? Math.random() < .08 ? "oni-behemut-gold" : "oni-behemut" : monster.species;
    applyOniSpecies(monster, nextSpecies as keyof typeof ONI_PROFILES);
  } else if (isBat) applyBatSpecies(monster, rollBatSpecies());
  else applyMonsterRarity(monster, rollMonsterRarity());
}
