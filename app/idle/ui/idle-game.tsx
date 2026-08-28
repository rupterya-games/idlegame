"use client";

import { useEffect, useRef, useState } from "react";
import { ACTOR_SEPARATION, directionFromVector, MONSTER_ABILITY_DURATION, MONSTER_ATTACK_DURATION, monsterSeparation, normalized, PLAYER_SPEED, separateMonsters, stepMonster } from "../game/engine";
import { createBat, createMonster, createOni, findBatIslandSpawn, findMonsterSpawn, respawnMonster } from "../game/monsters";
import { applyDefense, characterNames, getDerivedStats, grantProgress, skillNames, xpToNext } from "../game/progression";
import { createEmptySave, loadSave, storeSave } from "../game/save";
import type { Actor, CharacterClass, CombatSkill, GameSnapshot, Monster, Point, WorldRegion } from "../game/types";
import { BAT_ISLAND, findWorldPath, landmarks, moveWithCollision, obstacles, WORLD_HEIGHT, WORLD_WIDTH } from "../game/world";

const initialSpawnPoints: Point[] = [];
const vampireMonsters: Monster[] = Array.from({ length: 8 }, (_, index) => {
  const home = findMonsterSpawn(initialSpawnPoints);
  initialSpawnPoints.push(home);
  const guaranteedRarity = index === 0 ? "normal" : index === 1 ? "rare" : index === 2 ? "legendary" : undefined;
  return createMonster(index, home, guaranteedRarity);
});
const batSpawnPoints: Point[] = [];
const batMonsters: Monster[] = Array.from({ length: 6 }, (_, index) => {
  const home = findBatIslandSpawn(batSpawnPoints);
  batSpawnPoints.push(home);
  return createBat(index, home, index === 0 && Math.random() < .1 ? "golden-bat" : "bat");
});
const oniSpawnPoints: Point[] = [];
const oniLineup = ["oni-common", "oni-common", "oni-fighter", "oni-fighter", "oni-brute", "oni-brute", "oni-behemut", "oni-behemut-gold"] as const;
const oniMonsters: Monster[] = oniLineup.map((species, index) => {
  const home = findMonsterSpawn(oniSpawnPoints); oniSpawnPoints.push(home); return createOni(index, home, species);
});
const monsters: Monster[] = [...vampireMonsters, ...batMonsters, ...oniMonsters];
const rosePatches = Array.from({ length: 34 }, (_, index) => ({
  x: index < 17 ? 310 + ((index * 97) % 360) : 1500 + ((index * 83) % 400),
  y: index < 17 ? 610 + ((index * 61) % 250) : 970 + ((index * 67) % 240),
  tile: index % 4 === 0 ? 1 : 0,
  size: index % 4 === 0 ? 58 : 38,
}));
const bloodStains: Point[] = [
  { x: 116, y: 812 }, { x: 218, y: 946 }, { x: 142, y: 1038 },
  { x: 1510, y: 1260 }, { x: 1640, y: 1370 }, { x: 1810, y: 760 },
  { x: 1930, y: 880 }, { x: 730, y: 420 }, { x: 1280, y: 1060 },
];

type Images = Record<"cowboyIdle" | "cowboyWalk" | "cowboyAttack" | "cowboyDual" | "archerIdle" | "archerWalk" | "archerAttack" | "vampireWalk" | "vampireAttack" | "vampireRareWalk" | "vampireRareAttack" | "vampireLegendaryWalk" | "vampireLegendaryAttack" | "batWalk" | "batAttack" | "goldenBatWalk" | "goldenBatAttack" | "oniCommonWalk" | "oniCommonAttack" | "oniFighterWalk" | "oniFighterAttack" | "oniBruteWalk" | "oniBruteAttack" | "oniBehemutWalk" | "oniBehemutAttack" | "oniBehemutGoldWalk" | "oniBehemutGoldAttack" | "terrain" | "architecture" | "props" | "ryukuzamTerrain" | "ryukuzamArchitecture", HTMLImageElement>;
type DirectionalSpriteName = Exclude<keyof Images, "terrain" | "architecture" | "props" | "ryukuzamTerrain" | "ryukuzamArchitecture">;
const directionalSpriteNames: DirectionalSpriteName[] = ["cowboyIdle", "cowboyWalk", "cowboyAttack", "cowboyDual", "archerIdle", "archerWalk", "archerAttack", "vampireWalk", "vampireAttack", "vampireRareWalk", "vampireRareAttack", "vampireLegendaryWalk", "vampireLegendaryAttack", "batWalk", "batAttack", "goldenBatWalk", "goldenBatAttack", "oniCommonWalk", "oniCommonAttack", "oniFighterWalk", "oniFighterAttack", "oniBruteWalk", "oniBruteAttack", "oniBehemutWalk", "oniBehemutAttack", "oniBehemutGoldWalk", "oniBehemutGoldAttack"];
const regionSpriteNames: Record<WorldRegion, DirectionalSpriteName[]> = {
  fiordevalle: directionalSpriteNames.filter((name) => !name.startsWith("oni")),
  ryukuzam: directionalSpriteNames.filter((name) => name.startsWith("oni") || name.startsWith("cowboy") || name.startsWith("archer")),
};
type Projectile = { x: number; y: number; targetX: number; targetY: number; age: number; duration: number };
type FloatingDamage = { x: number; y: number; value: number; label?: string; color: string; age: number; duration: number };
type CowboyAttackMode = "basic" | "dual" | null;
type PendingCowboyShot = { target: Monster; baseDamage: number; dual: boolean; delay: number; character: CharacterClass };
type ActivityEvent = { id: number; text: string; tone: "combat" | "loot" | "system" };

const COWBOY_BASIC_ATTACK_DURATION = .32;
const COWBOY_DUAL_ATTACK_DURATION = .2;
const COWBOY_ATTACK_IMPACT_PROGRESS = .5;
const SPRITE_ASSET_VERSION = "20260827-5";

const monsterNames: Record<Monster["species"], string> = {
  vampire: "Vampiro",
  bat: "Morcego",
  "golden-bat": "Morcego Dourado",
  "oni-common": "Oni",
  "oni-fighter": "Oni Lutador",
  "oni-brute": "Oni Brutamontes",
  "oni-behemut": "Behemut",
  "oni-behemut-gold": "Behemut Dourado",
};

function monsterName(monster: Monster) {
  if (monster.species !== "vampire") return monsterNames[monster.species];
  return monster.rarity === "legendary" ? "Vampiro Lendario" : monster.rarity === "rare" ? "Vampiro Raro" : "Vampiro";
}

function loadImages() {
  const sources: Record<keyof Images, string> = {
    cowboyIdle: "/idle/assets/cowboy-idle-4dir-v1.png",
    cowboyWalk: "/idle/assets/cowboy-walk-4dir-v5.png",
    cowboyAttack: "/idle/assets/cowboy-attack-4dir-v6.png",
    cowboyDual: "/idle/assets/cowboy-dual-barrage-4dir-v1.png",
    archerIdle: "/idle/assets/archer-idle-4dir-v1.png",
    archerWalk: "/idle/assets/archer-walk-4dir-v1.png",
    archerAttack: "/idle/assets/archer-attack-4dir-v1.png",
    vampireWalk: "/idle/assets/vampire-walk-4dir-v4.png",
    vampireAttack: "/idle/assets/vampire-attack-4dir-v4.png",
    vampireRareWalk: "/idle/assets/vampire-rare-walk-4dir-v1.png",
    vampireRareAttack: "/idle/assets/vampire-rare-attack-4dir-v1.png",
    vampireLegendaryWalk: "/idle/assets/vampire-legendary-walk-4dir-v1.png",
    vampireLegendaryAttack: "/idle/assets/vampire-legendary-attack-4dir-v1.png",
    batWalk: "/idle/assets/bat-walk-4dir-v1.png",
    batAttack: "/idle/assets/bat-attack-4dir-v1.png",
    goldenBatWalk: "/idle/assets/golden-bat-walk-4dir-v1.png",
    goldenBatAttack: "/idle/assets/golden-bat-attack-4dir-v1.png",
    oniCommonWalk: "/idle/assets/oni-common-walk-4dir-v1.png", oniCommonAttack: "/idle/assets/oni-common-attack-4dir-v1.png",
    oniFighterWalk: "/idle/assets/oni-fighter-walk-4dir-v1.png", oniFighterAttack: "/idle/assets/oni-fighter-attack-4dir-v1.png",
    oniBruteWalk: "/idle/assets/oni-brute-walk-4dir-v1.png", oniBruteAttack: "/idle/assets/oni-brute-attack-4dir-v1.png",
    oniBehemutWalk: "/idle/assets/oni-behemut-walk-4dir-v1.png", oniBehemutAttack: "/idle/assets/oni-behemut-attack-4dir-v1.png",
    oniBehemutGoldWalk: "/idle/assets/oni-behemut-gold-walk-4dir-v1.png", oniBehemutGoldAttack: "/idle/assets/oni-behemut-gold-attack-4dir-v1.png",
    terrain: "/idle/assets/reference-terrain.png",
    architecture: "/idle/assets/fiordevalle-architecture-v1.png",
    props: "/idle/assets/fiordevalle-props-v1.png",
    ryukuzamTerrain: "/idle/assets/ryukuzam-terrain-v1.png",
    ryukuzamArchitecture: "/idle/assets/ryukuzam-architecture-v1.png",
  };
  return Object.fromEntries(Object.entries(sources).map(([name, source]) => {
    const image = new Image();
    image.src = directionalSpriteNames.includes(name as DirectionalSpriteName) ? `${source}?v=${SPRITE_ASSET_VERSION}` : source;
    return [name, image];
  })) as Images;
}

function CharacterAvatar({ character }: { character: CharacterClass }) {
  const avatarRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = avatarRef.current;
    if (!canvas) return;
    const image = new Image();
    image.src = `${character === "cowboy" ? "/idle/assets/cowboy-idle-4dir-v1.png" : "/idle/assets/archer-idle-4dir-v1.png"}?v=${SPRITE_ASSET_VERSION}`;
    image.onload = () => {
      const cellWidth = Math.round(image.naturalWidth / 4), cellHeight = Math.round(image.naturalHeight / 4);
      const frame = document.createElement("canvas"); frame.width = cellWidth; frame.height = cellHeight;
      const frameContext = frame.getContext("2d", { willReadFrequently: true })!; frameContext.drawImage(image, 0, 0, cellWidth, cellHeight, 0, 0, cellWidth, cellHeight);
      const pixels = frameContext.getImageData(0, 0, cellWidth, cellHeight), data = pixels.data, visited = new Uint8Array(cellWidth * cellHeight), queue: number[] = [];
      const floor = character === "archer" ? 230 : 245;
      const enqueue = (x: number, y: number) => {
        const index = y * cellWidth + x, pixel = index * 4, r = data[pixel], g = data[pixel + 1], b = data[pixel + 2];
        if (!visited[index] && (data[pixel + 3] === 0 || Math.min(r, g, b) >= floor && Math.max(r, g, b) - Math.min(r, g, b) <= 24)) { visited[index] = 1; queue.push(index); }
      };
      for (let x = 0; x < cellWidth; x += 1) { enqueue(x, 0); enqueue(x, cellHeight - 1); }
      for (let y = 0; y < cellHeight; y += 1) { enqueue(0, y); enqueue(cellWidth - 1, y); }
      for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const index = queue[cursor], x = index % cellWidth, y = Math.floor(index / cellWidth); data[index * 4 + 3] = 0;
        if (x > 0) enqueue(x - 1, y); if (x < cellWidth - 1) enqueue(x + 1, y); if (y > 0) enqueue(x, y - 1); if (y < cellHeight - 1) enqueue(x, y + 1);
      }
      if (character === "archer") for (let index = 0; index < cellWidth * cellHeight; index += 1) {
        const pixel = index * 4, r = data[pixel], g = data[pixel + 1], b = data[pixel + 2];
        if (Math.min(r, g, b) >= 230 && Math.max(r, g, b) - Math.min(r, g, b) <= 24) data[pixel + 3] = 0;
      }
      frameContext.putImageData(pixels, 0, 0);
      const context = canvas.getContext("2d")!; context.clearRect(0, 0, canvas.width, canvas.height); context.imageSmoothingEnabled = false; context.drawImage(frame, 0, 0, cellWidth, cellHeight, 0, 0, canvas.width, canvas.height);
    };
  }, [character]);
  return <canvas ref={avatarRef} width="52" height="56" className="idle-avatar" aria-hidden="true" />;
}

export function IdleGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<Actor>({ id: "player", x: 1200, y: 920, direction: "down", facing: "right", hp: 100, maxHp: 100, mana: 60, maxMana: 60, attackCooldown: 0, attackPulse: 0 });
  const inputRef = useRef<Point>({ x: 0, y: 0 });
  const targetRef = useRef<Point | null>(null);
  const selectedMonsterIdRef = useRef<string | null>(null);
  const dualRequestRef = useRef(false);
  const prepareRegionRef = useRef<((region: WorldRegion) => void) | null>(null);
  const regionRef = useRef<WorldRegion>("fiordevalle");
  const activeCharacterRef = useRef<CharacterClass>("cowboy");
  const characterSwitchRef = useRef<CharacterClass | null>(null);
  const [region, setRegion] = useState<WorldRegion>("fiordevalle");
  const [activeCharacter, setActiveCharacter] = useState<CharacterClass>("cowboy");
  const [autoHunt, setAutoHunt] = useState(true);
  const autoRef = useRef(true);
  const [save, setSave] = useState<GameSnapshot>(() => createEmptySave());
  const saveRef = useRef(save);
  const [hp, setHp] = useState(100);
  const [mana, setMana] = useState(60);
  const [chamberShots, setChamberShots] = useState(0);
  const [criticalReady, setCriticalReady] = useState(false);
  const [dualCooldown, setDualCooldown] = useState(0);
  const [buildOpen, setBuildOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [huntTab, setHuntTab] = useState<"battle" | "loot">("battle");
  const [selectedMonsterId, setSelectedMonsterId] = useState<string | null>(null);
  const [, setMonsterRevision] = useState(0);
  const [sessionKills, setSessionKills] = useState(0);
  const [sessionGold, setSessionGold] = useState(0);
  const eventSequenceRef = useRef(1);
  const [combatLog, setCombatLog] = useState<ActivityEvent[]>([
    { id: 0, text: "A caca automatica comecou em Fiordevalle.", tone: "system" },
  ]);
  const [lootLog, setLootLog] = useState<ActivityEvent[]>([]);

  const pushCombatLog = (text: string, tone: ActivityEvent["tone"] = "combat") => {
    const event = { id: eventSequenceRef.current++, text, tone };
    setCombatLog((current) => [event, ...current].slice(0, 10));
  };
  const pushLootLog = (text: string) => {
    const event = { id: eventSequenceRef.current++, text, tone: "loot" as const };
    setLootLog((current) => [event, ...current].slice(0, 14));
  };

  const updateSave = (updater: (current: GameSnapshot) => GameSnapshot) => {
    setSave((current) => {
      const next = updater(current);
      saveRef.current = next;
      return next;
    });
  };

  const changeRegion = (next: WorldRegion) => {
    const player = playerRef.current;
    regionRef.current = next; setRegion(next); player.x = 1200; player.y = 920; player.hp = player.maxHp;
    player.direction = "down"; targetRef.current = null; selectedMonsterIdRef.current = null; setSelectedMonsterId(null); inputRef.current = { x: 0, y: 0 }; setHp(player.hp); setAutoHunt(true);
    pushCombatLog(`Caca iniciada em ${next === "fiordevalle" ? "Fiordevalle" : "Ryukuzam"}.`, "system");
    prepareRegionRef.current?.(next);
  };

  const changeCharacter = (next: CharacterClass) => {
    activeCharacterRef.current = next;
    characterSwitchRef.current = next;
    setActiveCharacter(next);
    updateSave((current) => ({ ...current, activeCharacter: next }));
    targetRef.current = null;
    selectedMonsterIdRef.current = null;
    setSelectedMonsterId(null);
    setAutoHunt(true);
    pushCombatLog(`${characterNames[next]} assumiu a caca.`, "system");
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      const loaded = loadSave(); saveRef.current = loaded; activeCharacterRef.current = loaded.activeCharacter;
      setActiveCharacter(loaded.activeCharacter); setSave(loaded); setHydrated(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => { autoRef.current = autoHunt; }, [autoHunt]);
  useEffect(() => { saveRef.current = save; }, [save]);
  useEffect(() => { const timer = setInterval(() => storeSave(saveRef.current), 5000); return () => clearInterval(timer); }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const images = loadImages();
    const keys = new Set<string>();
    const player = playerRef.current;
    let frameId = 0;
    let last = 0;
    let elapsed = 0;
    const camera = { x: player.x, y: player.y };
    let projectiles: Projectile[] = [];
    let floatingDamage: FloatingDamage[] = [];
    let playerPath: Point[] = [];
    let playerRepathCooldown = 0;
    let playerMoving = false;
    let chamberCount = 0;
    let critArmed = false;
    let dualShotsRemaining = 0;
    let dualShotTimer = 0;
    let dualCooldownTime = 0;
    let lastDualCooldownDisplay = 0;
    let lastMaxHp = player.maxHp;
    let lastMaxMana = player.maxMana;
    let lastResourceUi = 0;
    let cowboyAttackMode: CowboyAttackMode = null;
    let cowboyAttackDuration = COWBOY_BASIC_ATTACK_DURATION;
    let pendingCowboyShots: PendingCowboyShot[] = [];
    const monsterMoving = new Map<string, boolean>();
    const preparedFrames = new Map<keyof Images, HTMLCanvasElement[]>();
    const preparingSprites = new Set<DirectionalSpriteName>();
    const spriteQueue: DirectionalSpriteName[] = [];
    let spriteQueueBusy = false;
    const texture = document.createElement("canvas");
    texture.width = texture.height = 96;
    const textureContext = texture.getContext("2d")!;
    textureContext.fillStyle = "#365b43"; textureContext.fillRect(0, 0, 96, 96);
    for (let index = 0; index < 160; index += 1) {
      const x = (index * 47) % 96, y = (index * 71) % 96;
      textureContext.fillStyle = index % 3 === 0 ? "#496f4c" : index % 3 === 1 ? "#294a38" : "#7b7342";
      textureContext.globalAlpha = .22; textureContext.fillRect(x, y, index % 5 === 0 ? 3 : 2, 2);
    }
    textureContext.globalAlpha = 1;

    const resize = () => {
      const ratio = Math.min(2, devicePixelRatio || 1);
      canvas.width = Math.round(innerWidth * ratio); canvas.height = Math.round(innerHeight * ratio);
      canvas.style.width = `${innerWidth}px`; canvas.style.height = `${innerHeight}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.imageSmoothingEnabled = false;
    };
    const prepareSpriteSheet = (name: DirectionalSpriteName) => {
      // Contract: game/SPRITE_STANDARD.md. Preserve fixed cells and foot anchors;
      // never recenter individual connected components at runtime.
      const image = images[name];
      if (!image.naturalWidth || !image.naturalHeight) return;

      const cellWidth = image.naturalWidth / 4;
      const cellHeight = image.naturalHeight / 4;
      if (cellWidth <= 0 || cellHeight <= 0) return;

      const frames: HTMLCanvasElement[] = [];
      for (let row = 0; row < 4; row += 1) for (let column = 0; column < 4; column += 1) {
        const frame = document.createElement("canvas");
        frame.width = frame.height = 384;
        const frameContext = frame.getContext("2d", { willReadFrequently: true })!;
        frameContext.imageSmoothingEnabled = false;
        const sourceX = Math.round(column * cellWidth);
        const sourceY = Math.round(row * cellHeight);
        const sourceRight = Math.round((column + 1) * cellWidth);
        const sourceBottom = Math.round((row + 1) * cellHeight);
        frameContext.drawImage(image, sourceX, sourceY, sourceRight - sourceX, sourceBottom - sourceY, 0, 0, 384, 384);

        // Remove only a legacy white backdrop connected to the frame border.
        // Sprite parts and their original foot anchor remain untouched.
        const pixels = frameContext.getImageData(0, 0, 384, 384);
        const data = pixels.data;
        const visited = new Uint8Array(384 * 384);
        const queue: number[] = [];
        const backgroundFloor = 230;
        const isBackground = (index: number) => {
          const pixel = index * 4;
          if (data[pixel + 3] === 0) return true;
          const r = data[pixel], g = data[pixel + 1], b = data[pixel + 2];
          return Math.min(r, g, b) >= backgroundFloor && Math.max(r, g, b) - Math.min(r, g, b) <= 24;
        };
        const enqueue = (x: number, y: number) => {
          const index = y * 384 + x;
          if (!visited[index] && isBackground(index)) { visited[index] = 1; queue.push(index); }
        };
        for (let x = 0; x < 384; x += 1) { enqueue(x, 0); enqueue(x, 383); }
        for (let y = 0; y < 384; y += 1) { enqueue(0, y); enqueue(383, y); }
        for (let cursor = 0; cursor < queue.length; cursor += 1) {
          const index = queue[cursor], pixel = index * 4, x = index % 384, y = Math.floor(index / 384);
          data[pixel + 3] = 0;
          if (x > 0) enqueue(x - 1, y);
          if (x < 383) enqueue(x + 1, y);
          if (y > 0) enqueue(x, y - 1);
          if (y < 383) enqueue(x, y + 1);
        }
        if (name.startsWith("archer")) for (let index = 0; index < 384 * 384; index += 1) {
          const pixel = index * 4, r = data[pixel], g = data[pixel + 1], b = data[pixel + 2];
          if (Math.min(r, g, b) >= 230 && Math.max(r, g, b) - Math.min(r, g, b) <= 24) data[pixel + 3] = 0;
        }

        // Peel only pale pixels touching transparency. The dark pixel-art outline
        // becomes a natural stop, so internal hair, faces and equipment stay whole.
        const removeHalo = (passes: number, floor: number, spread: number) => {
          for (let pass = 0; pass < passes; pass += 1) {
            const alpha = new Uint8Array(384 * 384);
            for (let index = 0; index < alpha.length; index += 1) alpha[index] = data[index * 4 + 3];
            for (let y = 1; y < 383; y += 1) for (let x = 1; x < 383; x += 1) {
              const index = y * 384 + x;
              if (alpha[index] === 0) continue;
              const pixel = index * 4, r = data[pixel], g = data[pixel + 1], b = data[pixel + 2];
              const touchesTransparency = alpha[index - 385] === 0 || alpha[index - 384] === 0 || alpha[index - 383] === 0
                || alpha[index - 1] === 0 || alpha[index + 1] === 0
                || alpha[index + 383] === 0 || alpha[index + 384] === 0 || alpha[index + 385] === 0;
              if (touchesTransparency && Math.min(r, g, b) >= floor && Math.max(r, g, b) - Math.min(r, g, b) <= spread) data[pixel + 3] = 0;
            }
          }
        };
        if (name.startsWith("archer")) removeHalo(8, 45, 100);
        else removeHalo(3, 145, 55);

        if (name.startsWith("archer")) {
          const seen = new Uint8Array(384 * 384);
          const components: Array<{ pixels: number[]; minX: number; minY: number; maxX: number; maxY: number }> = [];
          for (let start = 0; start < seen.length; start += 1) {
            if (seen[start] || data[start * 4 + 3] === 0) continue;
            const pixels = [start];
            seen[start] = 1;
            let minX = start % 384, maxX = minX, minY = Math.floor(start / 384), maxY = minY;
            for (let cursor = 0; cursor < pixels.length; cursor += 1) {
              const index = pixels[cursor], x = index % 384, y = Math.floor(index / 384);
              minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
              for (const neighbor of [index - 385, index - 384, index - 383, index - 1, index + 1, index + 383, index + 384, index + 385]) {
                if (neighbor < 0 || neighbor >= seen.length || seen[neighbor] || data[neighbor * 4 + 3] === 0) continue;
                const neighborX = neighbor % 384;
                if (Math.abs(neighborX - x) > 1) continue;
                seen[neighbor] = 1;
                pixels.push(neighbor);
              }
            }
            components.push({ pixels, minX, minY, maxX, maxY });
          }
          const body = components.reduce<(typeof components)[number] | null>((largest, component) => !largest || component.pixels.length > largest.pixels.length ? component : largest, null);
          if (body) {
            const lowerBody = body.minY + (body.maxY - body.minY) * .68;
            for (const component of components) {
              if (component === body || component.pixels.length > body.pixels.length * .28) continue;
              const belowBody = component.minY >= lowerBody && component.maxX >= body.minX && component.minX <= body.maxX;
              if (belowBody) for (const index of component.pixels) data[index * 4 + 3] = 0;
            }
          }
        }
        frameContext.putImageData(pixels, 0, 0);
        frames.push(frame);
      }
      preparedFrames.set(name, frames);
    };
    const prepareRegion = (region: WorldRegion) => {
      const pending = regionSpriteNames[region].filter((name) => !preparedFrames.has(name) && !preparingSprites.has(name));
      for (const name of pending) preparingSprites.add(name);
      spriteQueue.unshift(...pending);
      const drainQueue = () => {
        if (spriteQueueBusy) return;
        const name = spriteQueue.shift(); if (!name) return;
        spriteQueueBusy = true;
        const run = () => setTimeout(() => { prepareSpriteSheet(name); preparingSprites.delete(name); spriteQueueBusy = false; drainQueue(); }, 0);
        if (images[name].complete) run(); else images[name].addEventListener("load", run, { once: true });
      };
      drainQueue();
    };
    prepareRegionRef.current = prepareRegion;
    prepareRegion("fiordevalle");
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "2") dualRequestRef.current = true;
      if (["w", "a", "s", "d", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) { keys.add(event.key.toLowerCase()); targetRef.current = null; setAutoHunt(false); }
    };
    const keyup = (event: KeyboardEvent) => keys.delete(event.key.toLowerCase());
    const pointer = (event: PointerEvent) => { targetRef.current = { x: event.clientX - innerWidth / 2 + camera.x, y: event.clientY - innerHeight / 2 + camera.y }; setAutoHunt(false); };
    resize(); addEventListener("resize", resize); addEventListener("keydown", keydown); addEventListener("keyup", keyup); canvas.addEventListener("pointerdown", pointer);

    const drawAtlasTile = (image: HTMLImageElement, tile: number, columns: number, rows: number, x: number, y: number, width: number, height: number) => {
      if (!image.complete || !image.naturalWidth) return;
      const cellWidth = image.naturalWidth / columns, cellHeight = image.naturalHeight / rows;
      context.drawImage(image, (tile % columns) * cellWidth, Math.floor(tile / columns) * cellHeight, cellWidth, cellHeight, x, y, width, height);
    };
    const drawSpriteFrame = (image: HTMLCanvasElement, x: number, y: number, size: number) => {
      context.drawImage(image, x - size / 2, y - size, size, size);
    };
    const drawActorBars = (actor: Actor, hostile = false, height = 91, width = 48) => {
      const x = actor.x - width / 2, y = actor.y - height, health = Math.max(0, actor.hp / actor.maxHp), mana = Math.max(0, actor.mana / actor.maxMana);
      context.fillStyle = "#080b0ae6"; context.fillRect(x - 2, y - 2, width + 4, 12);
      context.fillStyle = "#30282b"; context.fillRect(x, y, width, 4); context.fillStyle = hostile ? "#c83245" : "#4fc46b"; context.fillRect(x, y, width * health, 4);
      context.fillStyle = "#1b2735"; context.fillRect(x, y + 6, width, 3); context.fillStyle = "#4399d4"; context.fillRect(x, y + 6, width * mana, 3);
    };
    const drawRarityMarker = (monster: Monster) => {
      const golden = monster.species === "golden-bat" || monster.species === "oni-behemut-gold";
      if (monster.rarity === "normal" && !golden) return;
      const markerHeight = golden ? monster.species === "oni-behemut-gold" ? 170 : 132 : monster.species === "oni-behemut" || monster.species === "oni-brute" ? 142 : 108;
      const x = Math.round(monster.x), y = Math.round(monster.y - markerHeight);
      context.save();
      context.fillStyle = golden ? "#ffd84a" : monster.rarity === "rare" ? "#f4f7f8" : "#ff3048";
      context.shadowColor = "#050607"; context.shadowBlur = 3;
      context.fillRect(x - 5, y - 5, 10, 7); context.fillRect(x - 3, y + 2, 6, 4);
      context.fillStyle = "#101113"; context.shadowBlur = 0;
      context.fillRect(x - 3, y - 2, 2, 2); context.fillRect(x + 1, y - 2, 2, 2); context.fillRect(x - 1, y + 1, 2, 2);
      context.restore();
    };
    const drawMonsterAbility = (monster: Monster) => {
      if (monster.abilityPulse <= 0) return;
      const progress = 1 - monster.abilityPulse / MONSTER_ABILITY_DURATION, radius = 28 + progress * 124;
      context.save(); context.globalAlpha = Math.max(0, .7 - progress * .42);
      const gradient = context.createRadialGradient(monster.x, monster.y - 20, 10, monster.x, monster.y - 20, radius);
      const golden = monster.species === "golden-bat" || monster.species === "oni-behemut-gold";
      gradient.addColorStop(0, golden ? "#ffe55f66" : "#ff395a55"); gradient.addColorStop(.72, golden ? "#ad761f30" : "#8f102c28"); gradient.addColorStop(1, golden ? "#59320000" : "#36030a00");
      context.fillStyle = gradient; context.beginPath(); context.arc(monster.x, monster.y - 20, radius, 0, Math.PI * 2); context.fill();
      context.strokeStyle = golden ? "#ffd83d" : "#ff3654"; context.lineWidth = 3; context.beginPath(); context.arc(monster.x, monster.y - 20, radius * .82, 0, Math.PI * 2); context.stroke();
      context.restore();
    };
    const drawPlayer = (actor: Actor, moving: boolean) => {
      const shooting = actor.attackPulse > 0 && cowboyAttackMode !== null;
      const character = activeCharacterRef.current;
      const spriteName: DirectionalSpriteName = character === "archer"
        ? shooting ? "archerAttack" : moving ? "archerWalk" : "archerIdle"
        : shooting && cowboyAttackMode === "dual" ? "cowboyDual" : shooting ? "cowboyAttack" : moving ? "cowboyWalk" : "cowboyIdle";
      const frames = preparedFrames.get(spriteName);
      if (!frames) return;
      const attackProgress = shooting ? Math.max(0, Math.min(1, 1 - actor.attackPulse / cowboyAttackDuration)) : 0;
      const frame = shooting ? Math.min(3, Math.floor(attackProgress * 4)) : moving ? Math.floor(elapsed * 8) % 4 : 0;
      const row = { down: 0, up: 1, left: 2, right: 3 }[actor.direction];
      drawSpriteFrame(frames[row * 4 + frame], actor.x, actor.y, 96);
    };
    const drawMonster = (monster: Monster, moving: boolean) => {
      const dying = monster.deathTimer > 0, attacking = monster.attackPulse > 0 || monster.abilityPulse > 0;
      const spriteName: DirectionalSpriteName = monster.species === "golden-bat"
        ? attacking ? "goldenBatAttack" : "goldenBatWalk"
        : monster.species === "bat" ? attacking ? "batAttack" : "batWalk"
          : monster.species === "oni-common" ? attacking ? "oniCommonAttack" : "oniCommonWalk"
            : monster.species === "oni-fighter" ? attacking ? "oniFighterAttack" : "oniFighterWalk"
              : monster.species === "oni-brute" ? attacking ? "oniBruteAttack" : "oniBruteWalk"
                : monster.species === "oni-behemut" ? attacking ? "oniBehemutAttack" : "oniBehemutWalk"
                  : monster.species === "oni-behemut-gold" ? attacking ? "oniBehemutGoldAttack" : "oniBehemutGoldWalk"
                    : monster.rarity === "legendary" ? attacking ? "vampireLegendaryAttack" : "vampireLegendaryWalk"
                      : monster.rarity === "rare" ? attacking ? "vampireRareAttack" : "vampireRareWalk"
                        : attacking ? "vampireAttack" : "vampireWalk";
      const frames = preparedFrames.get(spriteName);
      if (!frames) return;
      const row = { down: 0, up: 1, left: 2, right: 3 }[monster.direction];
      const duration = monster.abilityPulse > 0 ? MONSTER_ABILITY_DURATION : MONSTER_ATTACK_DURATION;
      const pulse = monster.abilityPulse > 0 ? monster.abilityPulse : monster.attackPulse;
      const frame = attacking ? Math.min(3, Math.floor((duration - pulse) / duration * 4)) : moving ? Math.floor(elapsed * 8) % 4 : 0;
      const image = frames[row * 4 + frame];
      const size = monster.species === "oni-behemut-gold" ? 158 : monster.species === "oni-behemut" ? 150 : monster.species === "oni-brute" ? 126 : monster.species === "oni-fighter" ? 108 : monster.species === "oni-common" ? 102 : monster.species === "golden-bat" ? 112 : monster.species === "bat" ? 84 : 96;
      const groundY = monster.species === "bat" || monster.species === "golden-bat" ? monster.y - 12 : monster.y;
      context.save();
      if (dying) { const progress = 1 - monster.deathTimer / .9; context.globalAlpha = Math.max(0, 1 - progress); context.translate(monster.x, groundY); context.rotate((monster.facing === "left" ? -1 : 1) * progress * 1.35); drawSpriteFrame(image, 0, 0, size); }
      else drawSpriteFrame(image, monster.x, groundY, size);
      context.restore();
    };
    const drawBatIsland = () => {
      context.save(); context.lineCap = "round";
      context.strokeStyle = "#101923"; context.lineWidth = 76; context.beginPath(); context.moveTo(BAT_ISLAND.x + 88, BAT_ISLAND.y + 18); context.lineTo(390, BAT_ISLAND.y + 18); context.stroke();
      context.strokeStyle = "#69727a"; context.lineWidth = 54; context.stroke();
      context.strokeStyle = "#343c44"; context.lineWidth = 4; context.setLineDash([18, 12]); context.stroke(); context.setLineDash([]);
      context.beginPath(); context.ellipse(BAT_ISLAND.x, BAT_ISLAND.y, BAT_ISLAND.radiusX, BAT_ISLAND.radiusY, -.08, 0, Math.PI * 2);
      context.fillStyle = "#111b24"; context.fill(); context.lineWidth = 16; context.strokeStyle = "#17232c"; context.stroke(); context.clip();
      if (images.terrain.complete && images.terrain.naturalWidth) {
        const cellWidth = images.terrain.naturalWidth / 4, cellHeight = images.terrain.naturalHeight / 4;
        for (let y = BAT_ISLAND.y - BAT_ISLAND.radiusY; y < BAT_ISLAND.y + BAT_ISLAND.radiusY; y += 112) for (let x = BAT_ISLAND.x - BAT_ISLAND.radiusX; x < BAT_ISLAND.x + BAT_ISLAND.radiusX; x += 112) {
          context.drawImage(images.terrain, 10, 10, cellWidth - 20, cellHeight - 20, x, y, 114, 114);
        }
      }
      context.fillStyle = "#11131830"; context.fillRect(BAT_ISLAND.x - BAT_ISLAND.radiusX, BAT_ISLAND.y - 24, BAT_ISLAND.radiusX * 2, 48);
      context.restore();
      for (let index = 0; index < 10; index += 1) {
        const angle = index / 10 * Math.PI * 2, x = BAT_ISLAND.x + Math.cos(angle) * (BAT_ISLAND.radiusX - 8), y = BAT_ISLAND.y + Math.sin(angle) * (BAT_ISLAND.radiusY - 8);
        drawAtlasTile(images.props, 4, 4, 4, x - 23, y - 34, 46, 46);
      }
      drawAtlasTile(images.props, 13, 4, 4, BAT_ISLAND.x - 54, BAT_ISLAND.y + 4, 108, 108);
      for (const rose of [{ x: -66, y: -112 }, { x: 72, y: -74 }, { x: -58, y: 94 }, { x: 58, y: 132 }]) drawAtlasTile(images.props, 0, 4, 4, BAT_ISLAND.x + rose.x - 18, BAT_ISLAND.y + rose.y - 36, 36, 36);
    };
    const drawBloodStain = (stain: Point, index: number) => {
      context.save(); context.translate(stain.x, stain.y); context.rotate(((index * 37) % 18 - 9) * Math.PI / 180);
      context.fillStyle = "#5b1018b8"; context.beginPath(); context.ellipse(0, 0, 13 + index % 4 * 3, 6 + index % 3 * 2, 0, 0, Math.PI * 2); context.fill();
      context.fillStyle = "#8d1723c7"; context.fillRect(-7, -3, 10, 4); context.fillRect(4, 1, 7, 3);
      context.fillStyle = "#4a0c13d6";
      for (const drop of [{ x: -22, y: -8 }, { x: 20, y: 7 }, { x: -12, y: 13 }, { x: 27, y: -5 }]) context.fillRect(drop.x + index % 3, drop.y - index % 2, index % 2 ? 3 : 4, 3);
      context.restore();
    };
    const render = () => {
      const width = innerWidth, height = innerHeight, currentRegion = regionRef.current;
      const terrainImage = currentRegion === "ryukuzam" ? images.ryukuzamTerrain : images.terrain;
      context.clearRect(0, 0, width, height);
      context.save(); context.translate(width / 2 - camera.x, height / 2 - camera.y);
      if (terrainImage.complete && terrainImage.naturalWidth) {
        const groundCellW = terrainImage.naturalWidth / 4, groundCellH = terrainImage.naturalHeight / 4;
        const terrainInset = 10;
        for (let y = 0; y < WORLD_HEIGHT; y += 128) for (let x = 0; x < WORLD_WIDTH; x += 128) {
          const variant = currentRegion === "ryukuzam" ? (Math.floor(x / 128) + Math.floor(y / 128) * 3) % 13 === 0 ? 2 : 0 : (Math.floor(x / 128) * 3 + Math.floor(y / 128) * 5) % 11 === 0 ? 1 : 0;
          context.drawImage(terrainImage, variant * groundCellW + terrainInset, terrainInset, groundCellW - terrainInset * 2, groundCellH - terrainInset * 2, x, y, 130, 130);
        }
        for (const field of currentRegion === "ryukuzam" ? [{ x: 260, y: 560, w: 470, h: 360 }, { x: 1450, y: 920, w: 520, h: 330 }] : [{ x: 260, y: 560, w: 470, h: 360 }, { x: 1450, y: 920, w: 520, h: 330 }]) {
          context.save(); context.beginPath(); context.ellipse(field.x + field.w / 2, field.y + field.h / 2, field.w / 2, field.h / 2, -.18, 0, Math.PI * 2); context.clip();
          const fieldTile = currentRegion === "ryukuzam" ? 4 : 3;
          for (let y = field.y; y < field.y + field.h; y += 126) for (let x = field.x; x < field.x + field.w; x += 126) context.drawImage(terrainImage, fieldTile * groundCellW + terrainInset, terrainInset, groundCellW - terrainInset * 2, groundCellH - terrainInset * 2, x, y, 128, 128);
          context.restore();
        }
        const roadTexture = document.createElement("canvas"); roadTexture.width = roadTexture.height = 156; const roadContext = roadTexture.getContext("2d")!;
        roadContext.imageSmoothingEnabled = false; roadContext.drawImage(terrainImage, (currentRegion === "ryukuzam" ? 3 : 2) * groundCellW, 0, groundCellW, groundCellH, 0, 0, 156, 156);
        context.lineCap = "round"; context.lineJoin = "round"; context.beginPath(); context.moveTo(1230, -80); context.bezierCurveTo(1110, 420, 1430, 680, 1280, 990); context.bezierCurveTo(1150, 1260, 1440, 1510, 1350, 1880);
        context.strokeStyle = "#101a25"; context.lineWidth = 156; context.stroke(); context.strokeStyle = context.createPattern(roadTexture, "repeat")!; context.lineWidth = 132; context.stroke();
      } else { context.fillStyle = context.createPattern(texture, "repeat")!; context.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT); }
      if (currentRegion === "fiordevalle") { context.fillStyle = "#304f65"; context.beginPath(); context.moveTo(180, 0); context.bezierCurveTo(260, 390, 90, 720, 270, 1060); context.bezierCurveTo(390, 1320, 180, 1580, 230, 1800); context.lineTo(0, 1800); context.lineTo(0, 0); context.closePath(); context.fill(); }
      if (currentRegion === "fiordevalle") { drawBatIsland(); bloodStains.forEach(drawBloodStain); }
      const layers: Array<{ y: number; draw: () => void }> = obstacles.map((item) => ({ y: item.y + item.radius * .55, draw: () => {
        if (currentRegion === "ryukuzam") drawAtlasTile(images.ryukuzamArchitecture, item.kind === "tree" ? item.x % 2 > 1 ? 6 : 7 : 8, 4, 4, item.x - item.radius * 1.8, item.y - item.radius * 3.4, item.radius * 3.6, item.radius * 3.6);
        else drawAtlasTile(images.props, item.kind === "tree" ? 3 : 4, 4, 4, item.x - item.radius * 1.7, item.y - item.radius * 3.2, item.radius * 3.4, item.radius * 3.4);
      } }));
      if (currentRegion === "fiordevalle") for (const rose of rosePatches) layers.push({ y: rose.y, draw: () => drawAtlasTile(images.props, rose.tile, 4, 4, rose.x - rose.size / 2, rose.y - rose.size, rose.size, rose.size) });
      for (const item of landmarks) layers.push({ y: item.y, draw: () => {
        if (currentRegion === "ryukuzam") drawAtlasTile(images.ryukuzamArchitecture, item.tile % 16, 4, 4, item.x - item.width / 2, item.y - item.height, item.width, item.height);
        else { const image = item.atlas === "architecture" ? images.architecture : images.props; const cells = item.atlas === "architecture" ? 3 : 4; drawAtlasTile(image, item.tile, cells, cells, item.x - item.width / 2, item.y - item.height, item.width, item.height); }
      } });
      for (const monster of monsters.filter((item) => item.region === currentRegion && (item.hp > 0 || item.deathTimer > 0))) layers.push({ y: monster.y, draw: () => { drawMonsterAbility(monster); drawMonster(monster, monsterMoving.get(monster.id) ?? false); } });
      layers.push({ y: player.y, draw: () => drawPlayer(player, playerMoving) });
      layers.sort((a, b) => a.y - b.y); for (const layer of layers) layer.draw();
      for (const monster of monsters) if (monster.region === currentRegion && monster.hp > 0) {
        const barHeight = monster.species === "oni-behemut-gold" ? 156 : monster.species === "oni-behemut" ? 150 : monster.species === "oni-brute" ? 126 : monster.species === "oni-fighter" || monster.species === "oni-common" ? 106 : monster.species === "golden-bat" ? 116 : monster.species === "bat" ? 84 : 91;
        const barWidth = monster.species === "oni-behemut-gold" || monster.species === "oni-behemut" ? 76 : monster.species === "oni-brute" || monster.species === "golden-bat" ? 66 : 48;
        drawActorBars(monster, true, barHeight, barWidth); drawRarityMarker(monster);
      }
      drawActorBars(player);
      for (const shot of projectiles) {
        const progress = Math.min(1, shot.age / shot.duration), x = shot.x + (shot.targetX - shot.x) * progress, y = shot.y + (shot.targetY - shot.y) * progress;
        const previous = Math.max(0, progress - .12), previousX = shot.x + (shot.targetX - shot.x) * previous, previousY = shot.y + (shot.targetY - shot.y) * previous;
        context.strokeStyle = "#f7e3a5"; context.lineWidth = 2; context.beginPath(); context.moveTo(previousX, previousY); context.lineTo(x, y); context.stroke();
        context.fillStyle = progress > .86 ? "#d52d3d" : "#fff4bd"; context.beginPath(); context.arc(x, y, progress > .86 ? 7 * (1 - progress) + 2 : 3, 0, Math.PI * 2); context.fill();
      }
      context.textAlign = "center"; context.textBaseline = "middle"; context.font = "bold 15px monospace";
      for (const damage of floatingDamage) { const progress = damage.age / damage.duration, label = damage.label ?? `${damage.value}`; context.globalAlpha = Math.max(0, 1 - progress); context.lineWidth = 3; context.strokeStyle = "#120b0c"; const y = damage.y - progress * 38; context.strokeText(label, damage.x, y); context.fillStyle = damage.color; context.fillText(label, damage.x, y); }
      context.globalAlpha = 1;
      context.restore();
    };
    const resolveCowboyShot = (target: Monster, baseDamage: number, dual = false, character = activeCharacterRef.current) => {
      if (target.hp <= 0 || target.region !== regionRef.current) return;
      const offset = { x: target.x - player.x, y: target.y - player.y }, distance = Math.hypot(offset.x, offset.y);
      player.direction = directionFromVector(offset, player.direction); if (offset.x !== 0) player.facing = offset.x < 0 ? "left" : "right";
      const muzzle = character === "archer"
        ? { up: { x: 0, y: -62 }, down: { x: 0, y: -36 }, left: { x: -42, y: -42 }, right: { x: 42, y: -42 } }[player.direction]
        : { up: { x: dual ? (dualShotsRemaining % 2 ? -15 : 15) : 0, y: -70 }, down: { x: dual ? (dualShotsRemaining % 2 ? -18 : 18) : 0, y: -18 }, left: { x: -38, y: dualShotsRemaining % 2 ? -42 : -31 }, right: { x: 38, y: dualShotsRemaining % 2 ? -42 : -31 } }[player.direction];
      projectiles.push({ x: player.x + muzzle.x, y: player.y + muzzle.y, targetX: target.x, targetY: target.y - (target.species.startsWith("oni-behemut") ? 70 : 42), age: 0, duration: Math.max(.1, distance / 1000) });
      const critical = character === "cowboy" && critArmed, damage = critical ? baseDamage * 2 : baseDamage;
      if (character === "cowboy") {
        if (critical) { critArmed = false; chamberCount = 0; setCriticalReady(false); setChamberShots(0); }
        else { chamberCount += 1; if (chamberCount >= 6) { chamberCount = 0; critArmed = true; setCriticalReady(true); } setChamberShots(chamberCount); }
      }
      target.hp = Math.max(0, target.hp - damage);
      floatingDamage.push({ x: target.x, y: target.y - 82, value: damage, label: critical ? `CRIT ${damage}` : undefined, color: critical ? "#fff09b" : dual ? "#ffb84f" : "#ffd56a", age: 0, duration: .8 });
      pushCombatLog(`${characterNames[character]} causou ${damage} em ${monsterName(target)}${critical ? " (critico)" : ""}.`);
      const defeated = target.hp === 0;
      const reward = defeated ? target.goldReward : 0;
      updateSave((current) => {
        const progressed = grantProgress(current, character, {
          accountXp: defeated ? 12 + Math.min(40, Math.round(reward / 3)) : 0,
          characterXp: defeated ? 18 + Math.min(60, Math.round(reward / 2)) : 0,
          skillXp: { ranged: 1 + Math.max(1, Math.floor(damage / 12)) },
        });
        return defeated ? { ...progressed, kills: progressed.kills + 1, gold: progressed.gold + reward } : progressed;
      });
      if (defeated) {
        setSessionKills((current) => current + 1);
        setSessionGold((current) => current + reward);
        pushCombatLog(`${monsterName(target)} foi derrotado.`, "system");
        pushLootLog(`${monsterName(target)}: +${reward} ouro`);
        if (selectedMonsterIdRef.current === target.id) { selectedMonsterIdRef.current = null; setSelectedMonsterId(null); }
        target.deathTimer = .9; target.path = []; target.attackPulse = 0; target.abilityPulse = 0;
        setTimeout(() => respawnMonster(target, monsters.filter((monster) => monster !== target && monster.region === target.region && monster.hp > 0)), 4200);
      }
    };
    const startCowboyShot = (target: Monster, baseDamage: number, dual = false) => {
      const offset = { x: target.x - player.x, y: target.y - player.y };
      player.direction = directionFromVector(offset, player.direction);
      if (offset.x !== 0) player.facing = offset.x < 0 ? "left" : "right";
      cowboyAttackMode = dual ? "dual" : "basic";
      cowboyAttackDuration = dual ? COWBOY_DUAL_ATTACK_DURATION : COWBOY_BASIC_ATTACK_DURATION;
      player.attackPulse = cowboyAttackDuration;
      pendingCowboyShots.push({ target, baseDamage, dual, delay: cowboyAttackDuration * COWBOY_ATTACK_IMPACT_PROGRESS, character: activeCharacterRef.current });
    };
    const loop = (now: number) => {
      const dt = last === 0 ? 0 : Math.min(.033, (now - last) / 1000); last = now; elapsed += dt;
      if (characterSwitchRef.current) {
        characterSwitchRef.current = null; player.attackPulse = 0; player.attackCooldown = 0; pendingCowboyShots = []; dualShotsRemaining = 0;
      }
      playerRepathCooldown = Math.max(0, playerRepathCooldown - dt);
      dualShotTimer = Math.max(0, dualShotTimer - dt); dualCooldownTime = Math.max(0, dualCooldownTime - dt);
      const cooldownDisplay = Math.ceil(dualCooldownTime); if (cooldownDisplay !== lastDualCooldownDisplay) { lastDualCooldownDisplay = cooldownDisplay; setDualCooldown(cooldownDisplay); }
      projectiles = projectiles.map((shot) => ({ ...shot, age: shot.age + dt })).filter((shot) => shot.age <= shot.duration);
      floatingDamage = floatingDamage.map((damage) => ({ ...damage, age: damage.age + dt })).filter((damage) => damage.age <= damage.duration);
      player.attackCooldown = Math.max(0, player.attackCooldown - dt);
      player.attackPulse = Math.max(0, player.attackPulse - dt);
      if (player.attackPulse === 0) cowboyAttackMode = null;
      const waitingShots: PendingCowboyShot[] = [];
      for (const shot of pendingCowboyShots) {
        shot.delay -= dt;
        if (shot.delay <= 0) resolveCowboyShot(shot.target, shot.baseDamage, shot.dual, shot.character);
        else waitingShots.push(shot);
      }
      pendingCowboyShots = waitingShots;
      const currentCharacter = activeCharacterRef.current;
      const combatStats = getDerivedStats(saveRef.current, currentCharacter);
      if (combatStats.maxHp !== lastMaxHp) {
        player.hp = Math.min(combatStats.maxHp, player.hp + Math.max(0, combatStats.maxHp - lastMaxHp));
        player.maxHp = combatStats.maxHp; lastMaxHp = combatStats.maxHp; setHp(player.hp);
      }
      if (combatStats.maxMana !== lastMaxMana) {
        player.mana = Math.min(combatStats.maxMana, player.mana + Math.max(0, combatStats.maxMana - lastMaxMana));
        player.maxMana = combatStats.maxMana; lastMaxMana = combatStats.maxMana;
      }
      player.mana = Math.min(player.maxMana, player.mana + dt * 4); for (const monster of monsters) { monster.deathTimer = Math.max(0, monster.deathTimer - dt); monster.mana = Math.min(monster.maxMana, monster.mana + dt * 2); }
      if (elapsed - lastResourceUi >= .25) { lastResourceUi = elapsed; setMana(Math.round(player.mana)); setMonsterRevision((current) => current + 1); }
      const currentRegion = regionRef.current;
      const activeEnemies = monsters.filter((monster) => monster.region === currentRegion && monster.hp > 0);
      const selectedEnemy = activeEnemies.find((monster) => monster.id === selectedMonsterIdRef.current);
      const nearest = selectedEnemy ?? activeEnemies.sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y))[0];
      if (dualRequestRef.current) {
        dualRequestRef.current = false;
        const abilityCost = currentCharacter === "cowboy" ? 35 : 28;
        const abilityCooldown = currentCharacter === "cowboy" ? 14 : 8;
        if (nearest && dualCooldownTime === 0 && player.mana >= abilityCost) { player.mana -= abilityCost; dualShotsRemaining = currentCharacter === "cowboy" ? 12 : 5; dualShotTimer = 0; dualCooldownTime = abilityCooldown; lastDualCooldownDisplay = abilityCooldown; setDualCooldown(abilityCooldown); autoRef.current = true; setAutoHunt(true); }
      }
      let input = { x: Number(keys.has("d") || keys.has("arrowright")) - Number(keys.has("a") || keys.has("arrowleft")), y: Number(keys.has("s") || keys.has("arrowdown")) - Number(keys.has("w") || keys.has("arrowup")) };
      const target = targetRef.current;
      if (target) { if (!playerPath.length || playerRepathCooldown === 0) { playerPath = findWorldPath(player, target); playerRepathCooldown = .7; } const waypoint = playerPath[0]; if (waypoint && Math.hypot(waypoint.x - player.x, waypoint.y - player.y) < 10) playerPath.shift(); else if (waypoint) input = normalized({ x: waypoint.x - player.x, y: waypoint.y - player.y }); else targetRef.current = null; }
      if (autoRef.current) {
        if (nearest) {
          const offset = { x: nearest.x - player.x, y: nearest.y - player.y }, distance = Math.hypot(offset.x, offset.y);
          if (distance > 260) {
            if (!playerPath.length || playerRepathCooldown === 0) { playerPath = findWorldPath(player, nearest); playerRepathCooldown = .65; }
            const waypoint = playerPath[0];
            if (waypoint && Math.hypot(waypoint.x - player.x, waypoint.y - player.y) < 10) playerPath.shift();
            else if (waypoint) input = normalized({ x: waypoint.x - player.x, y: waypoint.y - player.y });
          } else {
            playerPath = []; input = { x: 0, y: 0 };
            if (player.attackPulse === 0) { player.direction = directionFromVector(offset, player.direction); if (offset.x !== 0) player.facing = offset.x < 0 ? "left" : "right"; }
            if (dualShotsRemaining > 0 && dualShotTimer === 0 && player.attackPulse === 0) {
              startCowboyShot(nearest, Math.max(1, Math.round(combatStats.rangedDamage * (currentCharacter === "cowboy" ? .7 : .82))), true);
              dualShotsRemaining -= 1;
              dualShotTimer = COWBOY_DUAL_ATTACK_DURATION;
            }
            else if (dualShotsRemaining === 0 && player.attackCooldown === 0 && player.attackPulse === 0) {
              player.attackCooldown = currentCharacter === "cowboy" ? .72 : .62;
              startCowboyShot(nearest, combatStats.rangedDamage);
            }
          }
        }
      }
      if (player.attackPulse > 0) input = { x: 0, y: 0 };
      inputRef.current = input; const move = normalized(input), previousPlayer = { x: player.x, y: player.y }; const next = moveWithCollision(player, { x: move.x * PLAYER_SPEED * dt, y: move.y * PLAYER_SPEED * dt }); const pushesIntoMonster = activeEnemies.some((monster) => { const separation = (ACTOR_SEPARATION + monsterSeparation(monster)) / 2; return Math.hypot(next.x - monster.x, next.y - monster.y) < separation && Math.hypot(next.x - monster.x, next.y - monster.y) < Math.hypot(player.x - monster.x, player.y - monster.y); }); player.x = pushesIntoMonster ? previousPlayer.x : next.x; player.y = pushesIntoMonster ? previousPlayer.y : next.y; playerMoving = Math.hypot(player.x - previousPlayer.x, player.y - previousPlayer.y) > .05; if (playerMoving) player.direction = directionFromVector(move, player.direction); if (move.x !== 0 && (player.direction === "left" || player.direction === "right")) player.facing = move.x < 0 ? "left" : "right";
      for (const monster of monsters) if (monster.region === currentRegion && monster.hp > 0) {
        const previousMonster = { x: monster.x, y: monster.y }, action = stepMonster(monster, player, dt);
        monsterMoving.set(monster.id, Math.hypot(monster.x - previousMonster.x, monster.y - previousMonster.y) > .05);
        if (action) {
          const magicHit = action === "ability-hit";
          const rawDamage = magicHit ? monster.abilityDamage : monster.damage;
          const damage = applyDefense(rawDamage, magicHit ? combatStats.magicDefense : combatStats.physicalDefense);
          player.hp = Math.max(0, player.hp - damage);
          floatingDamage.push({ x: player.x, y: player.y - 82, value: damage, color: magicHit ? "#d877ff" : "#ff6678", age: 0, duration: .8 });
          pushCombatLog(`${monsterName(monster)} causou ${damage} em ${characterNames[currentCharacter]}.`);
          updateSave((current) => grantProgress(current, currentCharacter, { skillXp: magicHit ? { magicDefense: 2 + Math.floor(rawDamage / 6) } : { physicalDefense: 2 + Math.floor(rawDamage / 6) } }));
          if (action === "melee-hit" && monster.lifeSteal > 0 && monster.hp < monster.maxHp) {
            const healed = Math.min(monster.lifeSteal, monster.maxHp - monster.hp);
            monster.hp += healed;
            floatingDamage.push({ x: monster.x, y: monster.y - 82, value: healed, color: "#77e7bb", age: 0, duration: .8 });
          }
          if (player.hp === 0) { pushCombatLog(`${characterNames[currentCharacter]} retornou ao ponto seguro.`, "system"); player.hp = player.maxHp; player.x = 1200; player.y = 920; playerPath = []; }
          setHp(player.hp);
        }
      } else monsterMoving.set(monster.id, false);
      separateMonsters(activeEnemies);
      const halfWidth = Math.min(innerWidth / 2, WORLD_WIDTH / 2), halfHeight = Math.min(innerHeight / 2, WORLD_HEIGHT / 2);
      const cameraTargetX = Math.max(halfWidth, Math.min(WORLD_WIDTH - halfWidth, player.x)), cameraTargetY = Math.max(halfHeight, Math.min(WORLD_HEIGHT - halfHeight, player.y));
      camera.x += (cameraTargetX - camera.x) * Math.min(1, dt * 4.3); camera.y += (cameraTargetY - camera.y) * Math.min(1, dt * 4.3); render(); frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => { prepareRegionRef.current = null; cancelAnimationFrame(frameId); removeEventListener("resize", resize); removeEventListener("keydown", keydown); removeEventListener("keyup", keyup); canvas.removeEventListener("pointerdown", pointer); };
  }, []);

  const derivedStats = getDerivedStats(save, activeCharacter);
  const characterProgress = save.characters[activeCharacter];
  const accountRequired = xpToNext("account", save.accountLevel);
  const characterRequired = xpToNext("character", characterProgress.level);
  const regionMonsters = monsters.filter((monster) => monster.region === region && monster.hp > 0);
  const selectedMonster = regionMonsters.find((monster) => monster.id === selectedMonsterId) ?? null;
  const progressWidth = (xp: number, required: number) => `${Math.min(100, Math.round(xp / Math.max(1, required) * 100))}%`;
  const skillRows: { key: CombatSkill; glyph: string; detail: string }[] = [
    { key: "magic", glyph: "M", detail: `Poder magico ${derivedStats.magicDamage}` },
    { key: "melee", glyph: "C", detail: `Dano corpo a corpo ${derivedStats.meleeDamage}` },
    { key: "ranged", glyph: "D", detail: `Dano a distancia ${derivedStats.rangedDamage}` },
    { key: "physicalDefense", glyph: "F", detail: `Reducao ${Math.round(derivedStats.physicalReduction * 100)}%` },
    { key: "magicDefense", glyph: "A", detail: `Reducao ${Math.round(derivedStats.magicReduction * 100)}%` },
  ];

  return <main className="idle-shell">
    <canvas ref={canvasRef} className="idle-canvas" aria-label={`Mapa de ${region === "fiordevalle" ? "Fiordevalle" : "Ryukuzam"}`} />
    <header className="idle-topbar"><div><strong>{region === "fiordevalle" ? "FIORDEVALLE" : "RYUKUZAM"}</strong><span>{characterNames[activeCharacter]} · {region === "fiordevalle" ? "Vale do Norte" : "Provincia dos Onis"}</span></div><div className="idle-resources"><span>PV <b>{hp}/{derivedStats.maxHp}</b></span><span>Mana <b>{mana}/{derivedStats.maxMana}</b></span><span>Conta <b>NV {save.accountLevel}</b></span><span>Personagem <b>NV {characterProgress.level}</b></span><span>Ouro <b>{save.gold}</b></span></div></header>
    <nav className="idle-region-tabs" aria-label="Mapas"><button className={region === "fiordevalle" ? "active" : ""} onClick={() => changeRegion("fiordevalle")}>Fiordevalle</button><button className={region === "ryukuzam" ? "active" : ""} onClick={() => changeRegion("ryukuzam")}>Ryukuzam</button></nav>
    <aside className="idle-actions"><button className={autoHunt ? "active" : ""} onClick={() => setAutoHunt((value) => !value)}>{autoHunt ? "Pausar caca" : "Iniciar caca"}</button><button onClick={() => { setStatsOpen((value) => !value); setBuildOpen(false); }}>Ficha</button><button onClick={() => { setBuildOpen((value) => !value); setStatsOpen(false); }}>Construir</button></aside>
    <nav className="idle-roster" aria-label="Personagens">
      {(["cowboy", "archer"] as CharacterClass[]).map((character) => <button key={character} className={activeCharacter === character ? "active" : ""} onClick={() => changeCharacter(character)} aria-label={`Jogar com ${characterNames[character]}`}>
        <CharacterAvatar character={character} />
        <span><b>{characterNames[character]}</b><small>NV {save.characters[character].level}</small></span>
      </button>)}
    </nav>
    {statsOpen && <aside className="idle-stats" aria-label="Progressao e atributos">
      <header><div><small>FICHA</small><strong>{characterNames[activeCharacter]}</strong></div><button aria-label="Fechar ficha" onClick={() => setStatsOpen(false)}>×</button></header>
      <section className="idle-levels">
        <div><span>Nivel da conta <b>{save.accountLevel}</b></span><i><em style={{ width: progressWidth(save.accountXp, accountRequired) }} /></i><small>{save.accountXp}/{accountRequired} XP</small></div>
        <div><span>Nivel do personagem <b>{characterProgress.level}</b></span><i><em style={{ width: progressWidth(characterProgress.xp, characterRequired) }} /></i><small>{characterProgress.xp}/{characterRequired} XP</small></div>
      </section>
      <section className="idle-skill-list">
        {skillRows.map(({ key, glyph, detail }) => {
          const skill = save.skills[key], required = xpToNext("skill", skill.level);
          return <div className={`idle-skill ${key === "ranged" ? "primary" : ""}`} key={key}>
            <span className="idle-skill-glyph" aria-hidden="true">{glyph}</span>
            <div><span>{skillNames[key]} <b>{skill.level}</b></span><i><em style={{ width: progressWidth(skill.xp, required) }} /></i><small>{detail} · {skill.xp}/{required} XP</small></div>
          </div>;
        })}
      </section>
    </aside>}
    {hydrated && !statsOpen && !buildOpen && <aside className="idle-hunt-panel" aria-label="Informacoes da caca">
      <nav><button className={huntTab === "battle" ? "active" : ""} onClick={() => setHuntTab("battle")}>Caca</button><button className={huntTab === "loot" ? "active" : ""} onClick={() => setHuntTab("loot")}>Saque</button></nav>
      {huntTab === "battle" ? <>
        <section className="idle-analyzer"><header>ANALISADOR</header><div><span>Regiao <b>{region === "fiordevalle" ? "Fiordevalle" : "Ryukuzam"}</b></span><span>Estado <b className={autoHunt ? "running" : "paused"}>{autoHunt ? "Cacando" : "Pausado"}</b></span><span>Abates <b>{sessionKills}</b></span><span>Ouro <b>{sessionGold}</b></span></div></section>
        <section className="idle-battle-list"><header>MONSTROS <small>{regionMonsters.length} vivos</small></header>{regionMonsters.map((monster) => <button key={monster.id} className={monster.id === selectedMonsterId ? "selected" : ""} onClick={() => { selectedMonsterIdRef.current = monster.id; setSelectedMonsterId(monster.id); targetRef.current = null; setAutoHunt(true); }}>
          <span className={`idle-monster-glyph ${monster.rarity}`}>{monster.species === "golden-bat" || monster.species === "oni-behemut-gold" ? "G" : monster.species === "bat" ? "M" : monster.species.startsWith("oni") ? "O" : "V"}</span><span><b>{monsterName(monster)}</b><i><em style={{ width: `${Math.max(0, monster.hp / monster.maxHp * 100)}%` }} /></i><small>{monster.hp}/{monster.maxHp} PV</small></span>
        </button>)}</section>
      </> : <section className="idle-loot-list"><header>SAQUES DA SESSAO</header>{lootLog.length ? lootLog.map((event) => <p key={event.id}>{event.text}</p>) : <span>Nenhum saque nesta sessao.</span>}</section>}
    </aside>}
    {buildOpen && <section className="idle-build"><div><strong>Construções</strong><button aria-label="Fechar" onClick={() => setBuildOpen(false)}>×</button></div><button disabled={save.wood < 12}>Cabana <span>12 madeira</span></button><button disabled={save.stone < 10}>Pedreira <span>10 pedra</span></button><small>Madeira {save.wood} · Pedra {save.stone}</small></section>}
    <section className="idle-combat-log" aria-label="Registro de combate"><header><span>REGISTRO DE COMBATE</span>{selectedMonster && <b>Alvo: {monsterName(selectedMonster)}</b>}</header>{combatLog.slice(0, 6).map((event) => <p className={event.tone} key={event.id}>{event.text}</p>)}</section>
    <div className="idle-zone"><b>{activeCharacter === "cowboy" ? criticalReady ? "Bala Marcada pronta · proximo tiro critico" : `Tambor Marcado · ${chamberShots}/6 tiros` : "Olho do Falcao · ataques treinam Distancia"}</b><span>{activeCharacter === "cowboy" ? "Duplo Tambor: 12 tiros · 70% de dano por pistola" : "Saraivada: 5 flechas · 82% de dano por flecha"}</span></div>
    <nav className="idle-hotbar" aria-label={`Habilidades de ${characterNames[activeCharacter]}`}>
      <button className={activeCharacter === "cowboy" && criticalReady ? "ultimate" : "ready"} aria-label={activeCharacter === "cowboy" ? "Disparo de Prata" : "Flecha Precisa"}><kbd>1</kbd><b>{activeCharacter === "cowboy" ? "✦" : "➶"}</b><span>{activeCharacter === "cowboy" ? criticalReady ? "Critico" : "Disparo" : "Flecha"}</span><small>{activeCharacter === "cowboy" ? criticalReady ? "100%" : `${chamberShots}/6` : derivedStats.rangedDamage}</small></button>
      <button className={dualCooldown === 0 ? "ready" : ""} aria-label={activeCharacter === "cowboy" ? "Duplo Tambor" : "Saraivada"} onClick={() => { dualRequestRef.current = true; }}><kbd>2</kbd><b>{activeCharacter === "cowboy" ? "✦✦" : "➶➶"}</b><span>{activeCharacter === "cowboy" ? "Duplo Tambor" : "Saraivada"}</span><small>{dualCooldown || (activeCharacter === "cowboy" ? 35 : 28)}</small></button>
      <button aria-label={activeCharacter === "cowboy" ? "Passo Sombrio" : "Passo do Bosque"}><kbd>3</kbd><b>↯</b><span>Passo</span><small>18</small></button>
      <button aria-label={activeCharacter === "cowboy" ? "Armadilha de Rosas" : "Armadilha de Espinhos"}><kbd>4</kbd><b>⌖</b><span>Armadilha</span><small>24</small></button>
      <button className="ultimate" aria-label={activeCharacter === "cowboy" ? "Lua do Cacador" : "Chuva de Flechas"}><kbd>5</kbd><b>{activeCharacter === "cowboy" ? "☾" : "✥"}</b><span>{activeCharacter === "cowboy" ? "Cacada" : "Chuva"}</span><small>40</small></button>
    </nav>
  </main>;
}
