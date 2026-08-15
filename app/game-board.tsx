"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useState } from "react";

type Faction = "elf" | "orc";
type RuneTier = "bronze" | "silver" | "gold";
type Zone =
  | "hand" | "deck" | "elf-grave" | "orc-grave" | "elf-trap-active" | "orc-trap-active"
  | "elf-front-1" | "elf-front-2" | "elf-front-3"
  | "elf-leader-1" | "elf-center" | "elf-leader-2" | "elf-trap"
  | "orc-front-1" | "orc-front-2" | "orc-front-3"
  | "orc-leader-1" | "orc-center" | "orc-leader-2" | "orc-trap";
type Card = { id: string; name: string; faction: Faction; power: number; defense: number; image?: string; zone: Zone; official?: boolean; leader?: boolean; leaderId?: LeaderId; runeCost?: RuneTier };

const deckFiles = {
  clair: [
    "Abraco_da_Floresta_63x88mm.png", "Arqueira_do_Luar_63x88mm.png", "Arvore_Mae_de_Clair_63x88mm.png",
    "Cavaleira_da_Borboleta_63x88mm.png", "Clair_A_Amada_63x88mm.png", "Coroa_de_Flores_Eternas_63x88mm.png",
    "Curandeiro_do_Orvalho_63x88mm.png", "Driade_do_Coracao_Antigo_63x88mm.png", "Fonte_do_Luar_63x88mm.png",
    "Frasco_de_Orvalho_63x88mm.png", "Gorak_O_Vermelho_63x88mm.png", "Guardiao_das_Petalas_63x88mm.png",
    "Mensageira_Broto_Luz_63x88mm.png", "Milagre_da_Primavera_63x88mm.png", "Pixie_do_Po_Dourado_63x88mm.png",
    "Sacerdotisa_da_Aurora_63x88mm.png", "Semeadora_do_Bosque_63x88mm.png", "Sopro_das_Petalas_63x88mm.png",
    "Tecela_de_Brilhos_63x88mm.png", "Titania_dos_Cem_Jardins_63x88mm.png", "Unicornio_do_Alvorecer_63x88mm.png",
    "Yaguarate_A_Fera_63x88mm.png", "Zarna_O_Ladino_63x88mm.png",
  ],
  ferais: [
    "Altar_das_Nove_Presas_63x88mm.png", "Anciao_das_Mil_Garras_63x88mm.png", "Cacada_em_Matilha_63x88mm.png",
    "Corredor_da_Mata_63x88mm.png", "Filhote_Emboscador_63x88mm.png", "Garras_de_Osso_63x88mm.png",
    "Guardiao_Tartaruga_63x88mm.png", "Harpia_Rasante_63x88mm.png", "Javali_Casco_Ferro_63x88mm.png",
    "Lua_da_Fera_63x88mm.png", "Macaco_Lanca_Frutos_63x88mm.png", "Manto_de_Folhas_Vivas_63x88mm.png",
    "Pantera_da_Sombra_63x88mm.png", "Quimera_da_Selva_Profunda_63x88mm.png", "Rastreadora_de_Sangue_63x88mm.png",
    "Salto_Selvagem_63x88mm.png", "Totem_da_Cacada_63x88mm.png", "Xama_das_Garras_63x88mm.png",
  ],
  orcs: [
    "Armadura_de_Placas_Roubadas_63x88mm.png", "Arremesso_Brutal_63x88mm.png", "Brutamontes_do_Machado_63x88mm.png",
    "Campeao_do_Estandarte_Vermelho_63x88mm.png", "Capita_da_Horda_63x88mm.png", "Colosso_do_Cerco_63x88mm.png",
    "Domador_de_Feras_63x88mm.png", "Ferreiro_de_Guerra_63x88mm.png", "Forja_de_Gorak_63x88mm.png",
    "Goblin_Batedor_63x88mm.png", "Gorak_O_Vermelho_63x88mm.png", "Machado_Dentado_63x88mm.png",
    "Marcha_da_Horda_63x88mm.png", "Porta_Estandarte_Rubro_63x88mm.png", "Recruta_da_Presa_Quebrada_63x88mm.png",
    "Rugido_Menor_63x88mm.png", "Sangue_e_Ferro_63x88mm.png", "Troll_das_Correntes_63x88mm.png",
    "Xama_da_Cinza_63x88mm.png",
  ],
} as const;

type DeckName = keyof typeof deckFiles;
type LeaderId = "clair" | "gorak" | "yaguarate" | "zarna";

const leaderDefinitions: Record<LeaderId, {
  name: string;
  title: string;
  realm: string;
  file: string;
  faction: Faction;
  deck: DeckName | null;
  accent: string;
  maxLife: number;
}> = {
  clair: {
    name: "Clair, A Amada",
    title: "A Fada",
    realm: "Reino Feérico",
    file: "Clair_A_Amada_63x88mm.png",
    faction: "elf",
    deck: "clair",
    accent: "clair",
    maxLife: 25,
  },
  gorak: {
    name: "Gorak, O Vermelho",
    title: "O Regente da Horda",
    realm: "Horda Orc",
    file: "Gorak_O_Vermelho_63x88mm.png",
    faction: "orc",
    deck: "orcs",
    accent: "gorak",
    maxLife: 18,
  },
  yaguarate: {
    name: "Yaguaraté, A Fera",
    title: "Cacica Implacável",
    realm: "Clãs Ferais",
    file: "Yaguarate_A_Fera_63x88mm.png",
    faction: "elf",
    deck: "ferais",
    accent: "yaguarate",
    maxLife: 20,
  },
  zarna: {
    name: "Zarna, O Ladino",
    title: "O Espólio de Zarna",
    realm: "Reino de Zarna",
    file: "Zarna_O_Ladino_63x88mm.png",
    faction: "elf",
    deck: null,
    accent: "zarna",
    maxLife: 18,
  },
};

const leaderFileNames = new Set<string>(Object.values(leaderDefinitions).map((leader) => leader.file));

const runeCosts: Record<RuneTier, Set<string>> = {
  bronze: new Set([
    "Goblin_Batedor_63x88mm.png", "Porta_Estandarte_Rubro_63x88mm.png", "Brutamontes_do_Machado_63x88mm.png",
    "Recruta_da_Presa_Quebrada_63x88mm.png", "Ferreiro_de_Guerra_63x88mm.png",
    "Filhote_Emboscador_63x88mm.png", "Rastreadora_de_Sangue_63x88mm.png", "Macaco_Lanca_Frutos_63x88mm.png",
    "Xama_das_Garras_63x88mm.png", "Corredor_da_Mata_63x88mm.png", "Pantera_da_Sombra_63x88mm.png",
    "Mensageira_Broto_Luz_63x88mm.png", "Curandeiro_do_Orvalho_63x88mm.png", "Guardiao_das_Petalas_63x88mm.png",
    "Pixie_do_Po_Dourado_63x88mm.png", "Semeadora_do_Bosque_63x88mm.png",
  ]),
  silver: new Set([
    "Xama_da_Cinza_63x88mm.png", "Capita_da_Horda_63x88mm.png", "Domador_de_Feras_63x88mm.png", "Troll_das_Correntes_63x88mm.png",
    "Javali_Casco_Ferro_63x88mm.png", "Harpia_Rasante_63x88mm.png", "Guardiao_Tartaruga_63x88mm.png",
    "Driade_do_Coracao_Antigo_63x88mm.png", "Tecela_de_Brilhos_63x88mm.png", "Sacerdotisa_da_Aurora_63x88mm.png",
    "Cavaleira_da_Borboleta_63x88mm.png", "Arqueira_do_Luar_63x88mm.png",
  ]),
  gold: new Set([
    "Campeao_do_Estandarte_Vermelho_63x88mm.png", "Colosso_do_Cerco_63x88mm.png",
    "Anciao_das_Mil_Garras_63x88mm.png", "Quimera_da_Selva_Profunda_63x88mm.png",
    "Unicornio_do_Alvorecer_63x88mm.png", "Arvore_Mae_de_Clair_63x88mm.png", "Titania_dos_Cem_Jardins_63x88mm.png",
  ]),
};

function runeCostFor(file: string): RuneTier | undefined {
  return (Object.keys(runeCosts) as RuneTier[]).find((tier) => runeCosts[tier].has(file));
}

function deckCards(deck: DeckName): Card[] {
  const faction: Faction = deck === "orcs" ? "orc" : "elf";
  return deckFiles[deck].filter((file) => !leaderFileNames.has(file)).map((file, index) => ({
    id: `${deck}-${index}`,
    name: file.replace("_63x88mm.png", "").replaceAll("_", " "),
    faction,
    power: 0,
    defense: 0,
    image: `/cards/${deck}/${file}`,
    zone: "hand",
    official: true,
    runeCost: runeCostFor(file),
  }));
}

function shuffleCards(cards: Card[]): Card[] {
  const shuffled = [...cards];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

type RunePool = Record<RuneTier, number>;
type CardModifier = { damage: number; life: number };

function runesForTurn(turn: number): RunePool {
  if (turn === 1) return { bronze: 1, silver: 0, gold: 0 };
  if (turn === 2) return { bronze: 2, silver: 0, gold: 0 };
  if (turn === 3) return { bronze: 1, silver: 1, gold: 0 };
  if (turn === 4) return { bronze: 1, silver: 0, gold: 1 };
  if (turn === 5) return { bronze: 1, silver: 0, gold: 1 };
  return { bronze: 0, silver: 1, gold: 1 };
}

function leaderCard(id: LeaderId, throne: "elf-leader-1" | "elf-leader-2"): Card {
  const leader = leaderDefinitions[id];
  return {
    id: `leader-${id}`,
    name: leader.name,
    faction: leader.faction,
    power: 0,
    defense: 0,
    image: `/cards/clair/${leader.file}`,
    zone: throne,
    official: true,
    leader: true,
    leaderId: id,
  };
}

const starterCards: Card[] = [
  { id: "e1", name: "Sentinela de Lúmen", faction: "elf", power: 4, defense: 6, zone: "hand" },
  { id: "e2", name: "Arqueira do Bosque", faction: "elf", power: 5, defense: 3, zone: "hand" },
  { id: "e3", name: "Cervo Ancestral", faction: "elf", power: 3, defense: 7, zone: "hand" },
  { id: "o1", name: "Brutamontes de Cinza", faction: "orc", power: 7, defense: 4, zone: "orc-front-2" },
];

function CardFace({ card, selected, faceDown = false, onSelect }: { card: Card; selected: boolean; faceDown?: boolean; onSelect: () => void }) {
  if (faceDown) {
    return (
      <button
        className={`game-card card-back ${card.faction} ${selected ? "selected" : ""}`}
        draggable
        onDragStart={(event) => event.dataTransfer.setData("cardId", card.id)}
        onClick={(event) => { event.stopPropagation(); onSelect(); }}
        aria-label="Carta de armadilha virada para baixo"
        type="button"
      >
        <span className="back-frame"><span>R</span><b>RUPTERYA</b><small>ARMADILHA</small></span>
      </button>
    );
  }

  return (
    <button
      className={`game-card ${card.faction} ${card.official ? "official-card" : ""} ${selected ? "selected" : ""}`}
      draggable={!card.leader}
      onDragStart={(event) => card.leader ? event.preventDefault() : event.dataTransfer.setData("cardId", card.id)}
      onClick={(event) => { event.stopPropagation(); onSelect(); }}
      aria-label={`${card.name}, ataque ${card.power}, defesa ${card.defense}`}
      type="button"
    >
      {!card.official && <span className="card-rivets" />}
      <span className="card-art">
        {card.image ? <img src={card.image} alt="" /> : <span className="card-sigil" aria-hidden="true">{card.faction === "elf" ? "✦" : "☠"}</span>}
      </span>
      {card.runeCost && <span className={`card-rune-cost ${card.runeCost}`}>{card.runeCost === "bronze" ? "B" : card.runeCost === "silver" ? "P" : "O"}</span>}
      {!card.official && <><span className="card-name">{card.name}</span><span className="card-stats"><span title="Ataque">⚔ {card.power}</span><span title="Defesa">◆ {card.defense}</span></span></>}
    </button>
  );
}

export function GameBoard() {
  const [cards, setCards] = useState<Card[]>(starterCards);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  const [showCreator, setShowCreator] = useState(false);
  const [showLeaders, setShowLeaders] = useState(false);
  const [draftLeaders, setDraftLeaders] = useState<LeaderId[]>([]);
  const [chosenLeaders, setChosenLeaders] = useState<LeaderId[]>([]);
  const [leaderLife, setLeaderLife] = useState<Partial<Record<LeaderId, number>>>({});
  const [targetedLeader, setTargetedLeader] = useState<LeaderId | null>(null);
  const [turn, setTurn] = useState(1);
  const [runes, setRunes] = useState<RunePool>(runesForTurn(1));
  const [playError, setPlayError] = useState("");
  const [cardModifiers, setCardModifiers] = useState<Record<string, CardModifier>>({});
  const [image, setImage] = useState("");
  const [name, setName] = useState("");
  const [faction, setFaction] = useState<Faction>("elf");
  const [power, setPower] = useState(4);
  const [defense, setDefense] = useState(4);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("rupterya-cards");
    if (saved) {
      try {
        const legacyZones: Record<string, Zone> = {
          "elf-1": "elf-front-1", "elf-2": "elf-front-2", "elf-3": "elf-front-3",
          "orc-1": "orc-front-1", "orc-2": "orc-front-2", "orc-3": "orc-front-3",
        };
        setCards(JSON.parse(saved).map((card: Card) => ({ ...card, zone: legacyZones[card.zone] ?? card.zone })));
      } catch { setCards(starterCards); }
    }
    const savedLeaders = localStorage.getItem("rupterya-leaders");
    if (savedLeaders) {
      try { setChosenLeaders(JSON.parse(savedLeaders)); } catch { setChosenLeaders([]); }
    }
    const savedLife = localStorage.getItem("rupterya-leader-life");
    if (savedLife) {
      try { setLeaderLife(JSON.parse(savedLife)); } catch { setLeaderLife({}); }
    }
    const savedTurn = Number(localStorage.getItem("rupterya-turn"));
    if (savedTurn > 0) setTurn(savedTurn);
    const savedRunes = localStorage.getItem("rupterya-runes");
    if (savedRunes) {
      try { setRunes(JSON.parse(savedRunes)); } catch { setRunes(runesForTurn(savedTurn > 0 ? savedTurn : 1)); }
    }
    const savedModifiers = localStorage.getItem("rupterya-card-modifiers");
    if (savedModifiers) {
      try { setCardModifiers(JSON.parse(savedModifiers)); } catch { setCardModifiers({}); }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem("rupterya-cards", JSON.stringify(cards));
  }, [cards, hydrated]);

  useEffect(() => {
    if (hydrated) localStorage.setItem("rupterya-leaders", JSON.stringify(chosenLeaders));
  }, [chosenLeaders, hydrated]);

  useEffect(() => {
    if (hydrated) localStorage.setItem("rupterya-leader-life", JSON.stringify(leaderLife));
  }, [leaderLife, hydrated]);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem("rupterya-turn", String(turn));
      localStorage.setItem("rupterya-runes", JSON.stringify(runes));
    }
  }, [turn, runes, hydrated]);

  useEffect(() => {
    if (hydrated) localStorage.setItem("rupterya-card-modifiers", JSON.stringify(cardModifiers));
  }, [cardModifiers, hydrated]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setInspectedId(null);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  const hand = useMemo(() => cards.filter((card) => card.zone === "hand"), [cards]);
  const deckCount = useMemo(() => cards.filter((card) => card.zone === "deck").length, [cards]);
  const inspectedCard = cards.find((card) => card.id === inspectedId);

  function moveCard(cardId: string, zone: Zone) {
    const movingCard = cards.find((card) => card.id === cardId);
    if (!movingCard || movingCard.leader) return;
    if (zone.includes("leader")) {
      setPlayError("Os Tronos aceitam somente os dois Líderes escolhidos.");
      return;
    }
    const isGraveyard = zone === "elf-grave" || zone === "orc-grave";
    const isBeingPlayed = movingCard.zone === "hand" && zone !== "hand" && zone !== "deck" && !isGraveyard;
    if (isBeingPlayed && movingCard.runeCost && runes[movingCard.runeCost] < 1) {
      const runeName = movingCard.runeCost === "bronze" ? "Bronze" : movingCard.runeCost === "silver" ? "Prata" : "Ouro";
      setPlayError(`Você precisa de uma Runa de ${runeName} para jogar esta carta.`);
      return;
    }
    setCards((current) => {
      const moving = current.find((card) => card.id === cardId);
      if (moving?.leader || zone.includes("leader")) return current;
      if (isGraveyard && moving) {
        return [...current.filter((card) => card.id !== cardId), { ...moving, zone }];
      }
      return current.map((card) => {
      if (card.id === cardId) return { ...card, zone };
      if (zone !== "hand" && zone !== "deck" && card.zone === zone) return { ...card, zone: "hand" };
      return card;
      });
    });
    if (isBeingPlayed && movingCard.runeCost) {
      setRunes((current) => ({ ...current, [movingCard.runeCost as RuneTier]: current[movingCard.runeCost as RuneTier] - 1 }));
    }
    if (isGraveyard || zone === "hand") {
      setCardModifiers((current) => ({ ...current, [cardId]: { damage: 0, life: 0 } }));
    }
    setPlayError("");
    setSelectedId(null);
    setInspectedId(null);
  }

  function handleDrop(event: DragEvent, zone: Zone) {
    event.preventDefault();
    const cardId = event.dataTransfer.getData("cardId");
    if (cardId) moveCard(cardId, zone);
  }

  function chooseZone(zone: Zone) {
    if (selectedId) moveCard(selectedId, zone);
  }

  function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.readAsDataURL(file);
  }

  function addCard() {
    if (!name.trim()) return;
    setCards((current) => [...current, {
      id: crypto.randomUUID(), name: name.trim(), faction, power, defense, image, zone: "hand",
    }]);
    setName(""); setImage(""); setPower(4); setDefense(4); setShowCreator(false);
  }

  function toggleLeader(id: LeaderId) {
    setDraftLeaders((current) => {
      if (current.includes(id)) return current.filter((leader) => leader !== id);
      if (current.length === 2) return current;
      return [...current, id];
    });
  }

  function confirmLeaders() {
    if (draftLeaders.length !== 2) return;
    prepareMatch(draftLeaders);
    setChosenLeaders(draftLeaders);
    setSelectedId(null);
    setShowLeaders(false);
  }

  function openLeaderChoice() {
    setDraftLeaders(chosenLeaders);
    setShowLeaders(true);
  }

  function resetMatch() {
    if (chosenLeaders.length === 2) {
      prepareMatch(chosenLeaders);
    } else {
      setCards(starterCards);
    }
    setSelectedId(null);
  }

  function prepareMatch(ids: LeaderId[]) {
    const realmCards = shuffleCards(ids.flatMap((id) => {
      const deck = leaderDefinitions[id].deck;
      return deck ? deckCards(deck) : [];
    })).map((card, index) => ({ ...card, zone: index < 4 ? "hand" as Zone : "deck" as Zone }));
    setCards([
      leaderCard(ids[0], "elf-leader-1"),
      leaderCard(ids[1], "elf-leader-2"),
      ...realmCards,
    ]);
    setLeaderLife(Object.fromEntries(ids.map((id) => [id, leaderDefinitions[id].maxLife])));
    setTargetedLeader(null);
    setTurn(1);
    setRunes(runesForTurn(1));
    setCardModifiers({});
    setPlayError("");
  }

  function drawCard() {
    setCards((current) => {
      const nextCard = current.find((card) => card.zone === "deck");
      if (!nextCard) return current;
      return current.map((card) => card.id === nextCard.id ? { ...card, zone: "hand" } : card);
    });
  }

  function nextTurn() {
    if (chosenLeaders.length !== 2) {
      setPlayError("Escolha dois Líderes antes de iniciar os turnos.");
      return;
    }
    const next = turn + 1;
    setTurn(next);
    setRunes(runesForTurn(next));
    drawCard();
    setPlayError(next === 5 ? "A combinação do 5º turno está provisória até você definir a regra." : "");
  }

  function changeLeaderLife(id: LeaderId, amount: number) {
    setLeaderLife((current) => ({
      ...current,
      [id]: Math.max(0, Math.min(leaderDefinitions[id].maxLife, (current[id] ?? leaderDefinitions[id].maxLife) + amount)),
    }));
  }

  function changeCardModifier(cardId: string, type: keyof CardModifier, amount: number) {
    setCardModifiers((current) => {
      const modifier = current[cardId] ?? { damage: 0, life: 0 };
      return {
        ...current,
        [cardId]: { ...modifier, [type]: Math.max(-99, Math.min(99, modifier[type] + amount)) },
      };
    });
  }

  const renderZone = (zone: Zone, label: string, side: Faction, kind: "normal" | "leader" | "trap" | "active-trap" | "grave" = "normal") => (
    <div
      className={`card-zone ${side}-zone ${kind}-zone ${cards.some((card) => card.zone === zone && card.leaderId === targetedLeader) ? "targeted-leader" : ""}`}
      key={zone}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => handleDrop(event, zone)}
      onClick={() => chooseZone(zone)}
    >
      {cards.filter((card) => card.zone === zone).map((card) => (
        <CardFace
          key={card.id}
          card={card}
          faceDown={kind === "trap" || kind === "grave"}
          selected={selectedId === card.id}
          onSelect={() => {
            if (kind === "trap") {
              if (side === "elf") setInspectedId(card.id);
              return;
            }
            if (kind === "grave") return;
            setInspectedId(card.id);
          }}
        />
      ))}
      {!cards.some((card) => card.zone === zone) && (
        <span><b>{kind === "leader" ? "♛" : kind === "trap" ? "?" : kind === "active-trap" ? "!" : kind === "grave" ? "†" : side === "elf" ? "✧" : "ᛟ"}</b>{label}{kind === "leader" && <em>OBRIGATÓRIO</em>}</span>
      )}
      {kind === "grave" && cards.some((card) => card.zone === zone) && <div className="grave-count">{cards.filter((card) => card.zone === zone).length} cartas</div>}
      {kind === "normal" && cards.filter((card) => card.zone === zone && !card.leader).map((card) => {
        const modifiers = cardModifiers[card.id] ?? { damage: 0, life: 0 };
        const signed = (value: number) => value > 0 ? `+${value}` : String(value);
        return (
          <div className="card-buff-panel" key={`buff-${card.id}`} onClick={(event) => event.stopPropagation()}>
            <span className="buff-stat damage">
              <b>DANO</b>
              <button onClick={() => changeCardModifier(card.id, "damage", -1)} aria-label={`Diminuir buff de dano de ${card.name}`} type="button">−</button>
              <strong>{signed(modifiers.damage)}</strong>
              <button onClick={() => changeCardModifier(card.id, "damage", 1)} aria-label={`Aumentar buff de dano de ${card.name}`} type="button">＋</button>
            </span>
            <span className="buff-stat life">
              <b>VIDA</b>
              <button onClick={() => changeCardModifier(card.id, "life", -1)} aria-label={`Diminuir buff de vida de ${card.name}`} type="button">−</button>
              <strong>{signed(modifiers.life)}</strong>
              <button onClick={() => changeCardModifier(card.id, "life", 1)} aria-label={`Aumentar buff de vida de ${card.name}`} type="button">＋</button>
            </span>
          </div>
        );
      })}
      {cards.filter((card) => card.zone === zone && card.leaderId).map((card) => {
        const id = card.leaderId as LeaderId;
        const currentLife = leaderLife[id] ?? leaderDefinitions[id].maxLife;
        return (
          <div className="leader-health-panel" key={`life-${id}`} onClick={(event) => event.stopPropagation()}>
            <button
              className={`target-leader ${targetedLeader === id ? "active" : ""}`}
              onClick={() => setTargetedLeader(targetedLeader === id ? null : id)}
              title="Marcar este Líder como alvo"
              type="button"
            >
              ◎
            </button>
            <span className="leader-life-name"><em>VIDA PÚBLICA</em>{leaderDefinitions[id].name.split(",")[0]}</span>
            <span className="leader-life-total"><i>♥</i><strong>{currentLife}</strong><small>/{leaderDefinitions[id].maxLife}</small></span>
            <span className="leader-life-controls">
              <button onClick={() => changeLeaderLife(id, -5)} aria-label={`Causar 5 de dano em ${leaderDefinitions[id].name}`} type="button">−5</button>
              <button onClick={() => changeLeaderLife(id, -1)} aria-label={`Causar 1 de dano em ${leaderDefinitions[id].name}`} type="button">−1</button>
              <button onClick={() => changeLeaderLife(id, 1)} aria-label={`Recuperar 1 de vida de ${leaderDefinitions[id].name}`} type="button">＋1</button>
              <button onClick={() => changeLeaderLife(id, 5)} aria-label={`Recuperar 5 de vida de ${leaderDefinitions[id].name}`} type="button">＋5</button>
            </span>
          </div>
        );
      })}
    </div>
  );

  return (
    <main className="game-shell">
      <header className="topbar">
        <div className="brand-mark" aria-hidden="true">R</div>
        <div className="brand"><span>RUPTERYA</span><small>Crônicas da Ruptura</small></div>
        <div className="leader-setup">
          {chosenLeaders.length === 2 && (
            <span className="chosen-realms">
              {chosenLeaders.map((id) => leaderDefinitions[id].realm).join(" + ")}
            </span>
          )}
          <button className="choose-leaders-button" onClick={openLeaderChoice} type="button">
            <span>♛</span>{chosenLeaders.length === 2 ? "Trocar líderes" : "Escolher líderes"}
          </button>
        </div>
        <div className="turn-engine">
          <span className="turn-number"><small>TURNO</small><b>{turn}</b>{turn === 5 && <em>PROVISÓRIO</em>}</span>
          <span className="rune-pool" aria-label="Runas disponíveis neste turno">
            <i className="rune bronze" title="Runas de Bronze">B <b>×{runes.bronze}</b></i>
            <i className="rune silver" title="Runas de Prata">P <b>×{runes.silver}</b></i>
            <i className="rune gold" title="Runas de Ouro">O <b>×{runes.gold}</b></i>
          </span>
          <button className="next-turn-button" onClick={nextTurn} type="button">Próximo turno ›</button>
        </div>
        <div className="match-status"><span className="live-dot" />LOCAL</div>
        <button className="ghost-button" onClick={resetMatch} type="button">Reiniciar</button>
      </header>

      <section className="battle-table">
        <div className="faction-half orc-half">
          <div className="atmosphere rune-orc">ᛉ</div>
          <div className="player-banner orc-banner">
            <span className="avatar orc-avatar">☠</span>
            <span><small>OPONENTE</small><strong>Clã Presa de Ferro</strong></span>
            <span className="health">20 <i>♥</i></span>
          </div>
          <div className="battlefield-layout opponent-zones">
            <div className="formation">
              <div className="zone-row command-row">
                {renderZone("orc-leader-1", "Trono do Campeão", "orc", "leader")}
                {renderZone("orc-center", "Campo 4", "orc")}
                {renderZone("orc-leader-2", "Trono do Campeão", "orc", "leader")}
              </div>
              <div className="zone-row front-row">
                {(["orc-front-1", "orc-front-2", "orc-front-3"] as Zone[]).map((zone, index) => renderZone(zone, `Campo ${index + 1}`, "orc"))}
              </div>
            </div>
            <aside className="utility-column">
              <div className="trap-pair">
                <div className="trap-area"><small>ZONA SECRETA</small>{renderZone("orc-trap", "Armadilha", "orc", "trap")}</div>
                <div className="active-trap-area"><small>ZONA REVELADA</small>{renderZone("orc-trap-active", "Armadilha Ativada", "orc", "active-trap")}</div>
              </div>
              <div className="grave-area"><small>DESCARTES</small>{renderZone("orc-grave", "Cemitério", "orc", "grave")}</div>
            </aside>
          </div>
        </div>

        <div className="rift-line"><span /><b>CAMPO DA RUPTURA</b><span /></div>

        <div className="faction-half elf-half">
          <div className="atmosphere rune-elf">❧</div>
          <div className="battlefield-layout player-zones">
            <div className="formation">
              <div className="zone-row front-row">
                {(["elf-front-1", "elf-front-2", "elf-front-3"] as Zone[]).map((zone, index) => renderZone(zone, `Campo ${index + 1}`, "elf"))}
              </div>
              <div className="zone-row command-row">
                {renderZone("elf-leader-1", "Trono do Campeão", "elf", "leader")}
                {renderZone("elf-center", "Campo 4", "elf")}
                {renderZone("elf-leader-2", "Trono do Campeão", "elf", "leader")}
              </div>
            </div>
            <aside className="utility-column">
              <div className="trap-pair">
                <div className="trap-area"><small>ZONA SECRETA</small>{renderZone("elf-trap", "Armadilha", "elf", "trap")}</div>
                <div className="active-trap-area"><small>ZONA REVELADA</small>{renderZone("elf-trap-active", "Armadilha Ativada", "elf", "active-trap")}</div>
              </div>
              <div className="grave-area"><small>DESCARTES</small>{renderZone("elf-grave", "Cemitério", "elf", "grave")}</div>
            </aside>
          </div>
          <div className="player-banner elf-banner">
            <span className="avatar elf-avatar">✦</span>
            <span><small>VOCÊ</small><strong>Guardiões de Sylvarin</strong></span>
            <span className="health">20 <i>♥</i></span>
          </div>
        </div>
      </section>

      <section className="hand-dock" onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleDrop(event, "hand")}>
        <div className="hand-label"><small>SUA MÃO</small><strong>{hand.length} cartas</strong></div>
        <div className="deck-stack" aria-label={`Monte com ${deckCount} cartas`}>
          <span className="deck-card-back"><b>R</b><small>RUPTERYA</small></span>
          <strong>{deckCount}</strong>
          <small>MONTE</small>
        </div>
        <div className="hand-cards">
          {hand.map((card) => (
            <CardFace key={card.id} card={card} selected={selectedId === card.id} onSelect={() => setSelectedId(selectedId === card.id ? null : card.id)} />
          ))}
          {hand.length === 0 && <p className="empty-hand">Arraste uma carta do campo para cá.</p>}
        </div>
        <button className="add-card" onClick={() => setShowCreator(true)} type="button"><span>＋</span>Adicionar carta</button>
      </section>

      {selectedId && <div className="hint">Carta selecionada — escolha uma zona ou arraste-a.</div>}
      {playError && <button className="rule-alert" onClick={() => setPlayError("")} type="button">{playError}<span>×</span></button>}

      {showLeaders && (
        <div className="leader-choice-backdrop" onMouseDown={() => setShowLeaders(false)}>
          <section className="leader-choice-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="leader-choice-title">
            <button className="leader-choice-close" onClick={() => setShowLeaders(false)} aria-label="Fechar" type="button">×</button>
            <header>
              <p>CONSELHO DOS REINOS</p>
              <h1 id="leader-choice-title">Escolha dois Líderes</h1>
              <span>Cada Líder ocupa um Trono do Campeão e convoca as cartas do seu próprio reino.</span>
            </header>
            <div className="leader-options">
              {(Object.keys(leaderDefinitions) as LeaderId[]).map((id) => {
                const leader = leaderDefinitions[id];
                const selected = draftLeaders.includes(id);
                return (
                  <button
                    className={`leader-option ${leader.accent} ${selected ? "selected" : ""}`}
                    onClick={() => toggleLeader(id)}
                    aria-pressed={selected}
                    type="button"
                    key={id}
                  >
                    <span className="leader-card-image"><img src={`/cards/clair/${leader.file}`} alt={leader.name} /></span>
                    <span className="leader-option-copy">
                      <small>{leader.realm}</small>
                      <strong>{leader.name}</strong>
                      <em>{leader.title}</em>
                      <b>{leader.deck ? `${deckCards(leader.deck).length} cartas do reino` : "Reino em preparação"}</b>
                    </span>
                    <span className="selection-mark">{selected ? "✓ ESCOLHIDO" : "ESCOLHER"}</span>
                  </button>
                );
              })}
            </div>
            <footer className="leader-choice-footer">
              <span><b>{draftLeaders.length}</b>/2 Líderes escolhidos</span>
              {draftLeaders.includes("zarna") && <small>As cartas do Reino de Zarna serão adicionadas quando você enviá-las.</small>}
              <button onClick={confirmLeaders} disabled={draftLeaders.length !== 2} type="button">Convocar facções</button>
            </footer>
          </section>
        </div>
      )}

      {inspectedCard && (
        <div className="inspect-backdrop" onMouseDown={() => setInspectedId(null)}>
          <section className={`card-inspector ${inspectedCard.zone === "elf-trap" ? "private-inspection" : ""}`} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Visualização ampliada de ${inspectedCard.name}`}>
            <button className="inspect-close" onClick={() => setInspectedId(null)} aria-label="Fechar visualização" type="button">×</button>
            <div className="inspect-card-wrap">
              <CardFace card={inspectedCard} selected={false} onSelect={() => undefined} />
            </div>
            <div className="inspect-caption">
              <small>{inspectedCard.zone === "elf-trap" ? "VISÃO PRIVADA • SUA ARMADILHA" : "CARTA EM CAMPO"}</small>
              <strong>{inspectedCard.name}</strong>
              <span>{inspectedCard.zone === "elf-trap" ? "Esta informação é visível somente para você." : "Pressione Esc ou clique fora para fechar"}</span>
            </div>
          </section>
        </div>
      )}

      {showCreator && (
        <div className="modal-backdrop" onMouseDown={() => setShowCreator(false)}>
          <section className="card-creator" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="creator-title">
            <button className="close-button" onClick={() => setShowCreator(false)} aria-label="Fechar" type="button">×</button>
            <div>
              <p className="eyebrow">FORJA DE CARTAS</p>
              <h1 id="creator-title">Invoque uma nova carta</h1>
              <p className="creator-copy">Escolha uma imagem do seu computador e defina os atributos para adicioná-la à sua mão.</p>
            </div>
            <label className="image-drop">
              {image ? <img src={image} alt="Prévia da carta" /> : <span><b>＋</b>Escolher imagem</span>}
              <input type="file" accept="image/*" onChange={handleImage} />
            </label>
            <label>Nome da carta<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Druida da Lua" autoFocus /></label>
            <div className="form-row">
              <label>Facção<select value={faction} onChange={(event) => setFaction(event.target.value as Faction)}><option value="elf">Élfica</option><option value="orc">Orc</option></select></label>
              <label>Ataque<input type="number" min="0" max="99" value={power} onChange={(event) => setPower(Number(event.target.value))} /></label>
              <label>Defesa<input type="number" min="0" max="99" value={defense} onChange={(event) => setDefense(Number(event.target.value))} /></label>
            </div>
            <button className="forge-button" onClick={addCard} disabled={!name.trim()} type="button">Adicionar à mão</button>
          </section>
        </div>
      )}
    </main>
  );
}
