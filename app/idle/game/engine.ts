import type { Actor, Direction, Monster, Point, WorldRegion } from "./types";
import { findWorldPath, moveWithCollision } from "./world";

export const PLAYER_SPEED = 168;
export const ACTOR_SEPARATION = 58;
export const MELEE_ATTACK_RANGE = 72;
export const MONSTER_ATTACK_DURATION = .44;
export const MONSTER_ABILITY_DURATION = .9;
export const MONSTER_ABILITY_RANGE = 164;
export type MonsterAction = "melee-hit" | "ability-hit" | null;

export function monsterSeparation(monster: Monster) {
  if (monster.species === "bat") return 28;
  if (monster.species === "golden-bat") return 48;
  if (monster.species === "oni-behemut-gold" || monster.species === "oni-behemut") return 96;
  if (monster.species === "oni-brute") return 72;
  if (monster.species === "oni-fighter" || monster.species === "oni-common") return 54;
  return 50;
}

const monsterMeleeRange = (monster: Monster) => Math.max(MELEE_ATTACK_RANGE, monsterSeparation(monster) + 12);
const AXIS_SWITCH_RATIO = 1.35;

const isHorizontal = (direction: Direction) => direction === "left" || direction === "right";

export function directionFromVector(vector: Point, fallback: Direction): Direction {
  const horizontal = Math.abs(vector.x);
  const vertical = Math.abs(vector.y);
  if (horizontal < .01 && vertical < .01) return fallback;

  if (isHorizontal(fallback)) {
    if (vertical > horizontal * AXIS_SWITCH_RATIO) return vector.y < 0 ? "up" : "down";
    if (horizontal > .01) return vector.x < 0 ? "left" : "right";
  } else {
    if (horizontal > vertical * AXIS_SWITCH_RATIO) return vector.x < 0 ? "left" : "right";
    if (vertical > .01) return vector.y < 0 ? "up" : "down";
  }
  return fallback;
}

export function normalized(vector: Point): Point {
  const length = Math.hypot(vector.x, vector.y);
  return length > 0 ? { x: vector.x / length, y: vector.y / length } : { x: 0, y: 0 };
}

export function stepActor(actor: Actor, input: Point, speed: number, dt: number, region: WorldRegion = "fiordevalle") {
  // Physics may move diagonally; the visible sprite remains one of four stable directions.
  const movement = normalized(input);
  actor.direction = directionFromVector(movement, actor.direction);
  if (movement.x !== 0 && (actor.direction === "left" || actor.direction === "right")) actor.facing = movement.x < 0 ? "left" : "right";
  const next = moveWithCollision(actor, { x: movement.x * speed * dt, y: movement.y * speed * dt }, 16, region);
  actor.x = next.x;
  actor.y = next.y;
}

export function stepMonster(monster: Monster, player: Actor, dt: number): MonsterAction {
  const previousAttackPulse = monster.attackPulse;
  const previousAbilityPulse = monster.abilityPulse;
  monster.attackCooldown = Math.max(0, monster.attackCooldown - dt);
  monster.attackPulse = Math.max(0, monster.attackPulse - dt);
  monster.abilityCooldown = Math.max(0, monster.abilityCooldown - dt);
  monster.abilityPulse = Math.max(0, monster.abilityPulse - dt);
  monster.thinkCooldown = Math.max(0, monster.thinkCooldown - dt);
  if (previousAbilityPulse > 0) {
    if (!monster.abilityDidHit && previousAbilityPulse > .42 && monster.abilityPulse <= .42) {
      monster.abilityDidHit = true;
      return Math.hypot(player.x - monster.x, player.y - monster.y) <= MONSTER_ABILITY_RANGE ? "ability-hit" : null;
    }
    return null;
  }
  if (previousAttackPulse > 0) {
    if (!monster.attackDidHit && previousAttackPulse > .22 && monster.attackPulse <= .22) { monster.attackDidHit = true; return "melee-hit"; }
    return null;
  }
  const offset = { x: player.x - monster.x, y: player.y - monster.y };
  const distance = Math.hypot(offset.x, offset.y);
  if (distance > monster.aggroRadius) { monster.path = []; return null; }
  if (monster.abilityDamage > 0 && monster.abilityCooldown === 0 && monster.mana >= 35 && distance <= MONSTER_ABILITY_RANGE) {
    monster.direction = directionFromVector(offset, monster.direction);
    if (offset.x !== 0) monster.facing = offset.x < 0 ? "left" : "right";
    monster.mana -= 35;
    monster.abilityCooldown = 7.5;
    monster.abilityPulse = MONSTER_ABILITY_DURATION;
    monster.abilityDidHit = false;
    monster.path = [];
    return null;
  }
  if (distance < monsterMeleeRange(monster)) {
    if (monster.attackCooldown === 0) {
      monster.direction = directionFromVector(offset, monster.direction);
      if (offset.x !== 0) monster.facing = offset.x < 0 ? "left" : "right";
      monster.attackCooldown = 1.25;
      monster.attackPulse = MONSTER_ATTACK_DURATION;
      monster.attackDidHit = false;
      return null;
    }
    return null;
  }
  if (!monster.path.length || monster.thinkCooldown === 0) { monster.path = findWorldPath(monster, player, 18, monster.region); monster.thinkCooldown = .65; }
  const waypoint = monster.path[0];
  if (waypoint) { if (Math.hypot(waypoint.x - monster.x, waypoint.y - monster.y) < 10) monster.path.shift(); else stepActor(monster, { x: waypoint.x - monster.x, y: waypoint.y - monster.y }, monster.moveSpeed, dt, monster.region); }
  return null;
}

export function separateMonsters(monsters: Monster[]) {
  const living = monsters.filter((monster) => monster.hp > 0);
  for (let firstIndex = 0; firstIndex < living.length; firstIndex += 1) for (let secondIndex = firstIndex + 1; secondIndex < living.length; secondIndex += 1) {
    const first = living[firstIndex], second = living[secondIndex], dx = second.x - first.x, dy = second.y - first.y, distance = Math.hypot(dx, dy);
    const separation = (monsterSeparation(first) + monsterSeparation(second)) / 2;
    if (distance >= separation) continue;
    const normalX = distance > .01 ? dx / distance : firstIndex % 2 ? 1 : -1, normalY = distance > .01 ? dy / distance : 0, correction = (separation - distance) / 2;
    const firstNext = moveWithCollision(first, { x: -normalX * correction, y: -normalY * correction }, 16, first.region);
    const secondNext = moveWithCollision(second, { x: normalX * correction, y: normalY * correction }, 16, second.region);
    first.x = firstNext.x; first.y = firstNext.y; second.x = secondNext.x; second.y = secondNext.y;
  }
}
