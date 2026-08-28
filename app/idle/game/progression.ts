import type { CharacterClass, CombatSkill, GameSnapshot, LevelProgress } from "./types";

type ProgressKind = "account" | "character" | "skill";

export type DerivedStats = {
  maxHp: number;
  maxMana: number;
  rangedDamage: number;
  meleeDamage: number;
  magicDamage: number;
  physicalDefense: number;
  magicDefense: number;
  physicalReduction: number;
  magicReduction: number;
};

export type ProgressAward = {
  accountXp?: number;
  characterXp?: number;
  skillXp?: Partial<Record<CombatSkill, number>>;
};

const progressionBase: Record<ProgressKind, number> = {
  account: 140,
  character: 105,
  skill: 80,
};

export const characterNames: Record<CharacterClass, string> = {
  cowboy: "Cowboy",
  archer: "Arqueiro",
};

export const skillNames: Record<CombatSkill, string> = {
  magic: "Magia",
  melee: "Corpo a Corpo",
  ranged: "Distancia",
  physicalDefense: "Defesa Fisica",
  magicDefense: "Defesa Magica",
};

export function xpToNext(kind: ProgressKind, level: number) {
  return Math.round(progressionBase[kind] * Math.pow(Math.max(1, level), 1.24));
}

function addLevelXp(progress: LevelProgress, amount: number, kind: ProgressKind): LevelProgress {
  let level = Math.max(1, Math.floor(progress.level || 1));
  let xp = Math.max(0, progress.xp || 0) + Math.max(0, amount);
  let required = xpToNext(kind, level);
  while (xp >= required) {
    xp -= required;
    level += 1;
    required = xpToNext(kind, level);
  }
  return { level, xp: Math.floor(xp) };
}

export function grantProgress(snapshot: GameSnapshot, character: CharacterClass, award: ProgressAward): GameSnapshot {
  const characters = {
    cowboy: { ...snapshot.characters.cowboy },
    archer: { ...snapshot.characters.archer },
  };
  const skills = {
    magic: { ...snapshot.skills.magic },
    melee: { ...snapshot.skills.melee },
    ranged: { ...snapshot.skills.ranged },
    physicalDefense: { ...snapshot.skills.physicalDefense },
    magicDefense: { ...snapshot.skills.magicDefense },
  };

  if (award.characterXp) characters[character] = addLevelXp(characters[character], award.characterXp, "character");
  for (const [skill, amount] of Object.entries(award.skillXp ?? {}) as [CombatSkill, number][]) {
    if (amount > 0) skills[skill] = addLevelXp(skills[skill], amount, "skill");
  }
  const account = award.accountXp ? addLevelXp({ level: snapshot.accountLevel, xp: snapshot.accountXp }, award.accountXp, "account") : { level: snapshot.accountLevel, xp: snapshot.accountXp };

  return { ...snapshot, accountLevel: account.level, accountXp: account.xp, characters, skills };
}

export function getDerivedStats(snapshot: GameSnapshot, character: CharacterClass): DerivedStats {
  const account = Math.max(1, snapshot.accountLevel);
  const characterLevel = Math.max(1, snapshot.characters[character].level);
  const magic = Math.max(1, snapshot.skills.magic.level);
  const melee = Math.max(1, snapshot.skills.melee.level);
  const ranged = Math.max(1, snapshot.skills.ranged.level);
  const physicalSkill = Math.max(1, snapshot.skills.physicalDefense.level);
  const magicDefenseSkill = Math.max(1, snapshot.skills.magicDefense.level);
  const physicalDefense = Math.round(account * .35 + characterLevel * .4 + physicalSkill * 1.8);
  const magicDefense = Math.round(account * .35 + characterLevel * .35 + magicDefenseSkill * 1.85);

  return {
    maxHp: Math.round(88 + account * 4 + characterLevel * 5 + physicalSkill * 3),
    maxMana: Math.round(52 + account * 2 + characterLevel * 2 + magic * 2 + magicDefenseSkill),
    rangedDamage: Math.round(11 + account * .45 + characterLevel * .7 + ranged * 1.35),
    meleeDamage: Math.round(8 + account * .4 + characterLevel * .65 + melee * 1.4),
    magicDamage: Math.round(10 + account * .45 + characterLevel * .6 + magic * 1.5),
    physicalDefense,
    magicDefense,
    physicalReduction: physicalDefense / (100 + physicalDefense),
    magicReduction: magicDefense / (100 + magicDefense),
  };
}

export function applyDefense(rawDamage: number, defense: number) {
  return Math.max(1, Math.round(rawDamage * 100 / (100 + Math.max(0, defense))));
}
