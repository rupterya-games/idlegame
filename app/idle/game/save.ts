import type { GameSnapshot } from "./types";

const SAVE_KEY = "fiordevalle-idle-save-v1";

export function createEmptySave(): GameSnapshot {
  return {
    gold: 0,
    kills: 0,
    wood: 18,
    stone: 12,
    accountLevel: 1,
    accountXp: 0,
    activeCharacter: "cowboy",
    characters: { cowboy: { level: 1, xp: 0 }, archer: { level: 1, xp: 0 } },
    skills: {
      magic: { level: 1, xp: 0 },
      melee: { level: 1, xp: 0 },
      ranged: { level: 1, xp: 0 },
      physicalDefense: { level: 1, xp: 0 },
      magicDefense: { level: 1, xp: 0 },
    },
    lastSeenAt: new Date().toISOString(),
  };
}

function normalizeSave(stored: Partial<GameSnapshot>): GameSnapshot {
  const empty = createEmptySave();
  return {
    ...empty,
    ...stored,
    accountLevel: Math.max(1, stored.accountLevel ?? 1),
    accountXp: Math.max(0, stored.accountXp ?? 0),
    activeCharacter: stored.activeCharacter === "archer" ? "archer" : "cowboy",
    characters: {
      cowboy: { ...empty.characters.cowboy, ...stored.characters?.cowboy },
      archer: { ...empty.characters.archer, ...stored.characters?.archer },
    },
    skills: {
      magic: { ...empty.skills.magic, ...stored.skills?.magic },
      melee: { ...empty.skills.melee, ...stored.skills?.melee },
      ranged: { ...empty.skills.ranged, ...stored.skills?.ranged },
      physicalDefense: { ...empty.skills.physicalDefense, ...stored.skills?.physicalDefense },
      magicDefense: { ...empty.skills.magicDefense, ...stored.skills?.magicDefense },
    },
  };
}

export function loadSave(): GameSnapshot {
  try {
    const stored = localStorage.getItem(SAVE_KEY);
    return stored ? normalizeSave(JSON.parse(stored)) : createEmptySave();
  } catch {
    return createEmptySave();
  }
}

export function storeSave(snapshot: GameSnapshot) {
  localStorage.setItem(SAVE_KEY, JSON.stringify({ ...snapshot, lastSeenAt: new Date().toISOString() }));
}
