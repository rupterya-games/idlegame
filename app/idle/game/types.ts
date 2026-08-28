export type Point = { x: number; y: number };
export type Direction = "up" | "down" | "left" | "right";
export type WorldRegion = "fiordevalle" | "ryukuzam";
export type CharacterClass = "cowboy" | "archer";
export type CombatSkill = "magic" | "melee" | "ranged" | "physicalDefense" | "magicDefense";
export type MonsterRarity = "normal" | "rare" | "legendary";
export type MonsterSpecies = "vampire" | "bat" | "golden-bat" | "oni-common" | "oni-fighter" | "oni-brute" | "oni-behemut" | "oni-behemut-gold";

export type Actor = Point & {
  id: string;
  direction: Direction;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  attackCooldown: number;
  attackPulse: number;
  facing: "left" | "right";
};

export type Monster = Actor & {
  home: Point;
  region: WorldRegion;
  species: MonsterSpecies;
  rarity: MonsterRarity;
  damage: number;
  abilityDamage: number;
  moveSpeed: number;
  goldReward: number;
  lifeSteal: number;
  aggroRadius: number;
  thinkCooldown: number;
  path: Point[];
  deathTimer: number;
  attackDidHit: boolean;
  abilityCooldown: number;
  abilityPulse: number;
  abilityDidHit: boolean;
};

export type GameSnapshot = {
  gold: number;
  kills: number;
  wood: number;
  stone: number;
  accountLevel: number;
  accountXp: number;
  activeCharacter: CharacterClass;
  characters: Record<CharacterClass, LevelProgress>;
  skills: Record<CombatSkill, LevelProgress>;
  lastSeenAt: string;
};

export type LevelProgress = {
  level: number;
  xp: number;
};
