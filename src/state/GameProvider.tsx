import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  applyRun,
  createGame,
  expansionCost,
  isNeighborOfLand,
  ITEM_BY_ID,
  REFUND_RATE,
  totalKm,
  type GameState,
  type ItemId,
  type RunInput,
  type RunOutcome,
  type StreakItemId,
  type Tile,
  type WorldId,
  WORLD_BY_ID,
  worldUnlocked,
} from '../lib/game';
import { saveGame } from '../lib/storage';
import { mergeStates, sameState } from '../lib/sync';

type GameApi = {
  state: GameState;
  totalKm: number;
  addRun: (run: RunInput) => RunOutcome;
  build: (index: number, item: ItemId) => string | null;
  demolish: (index: number) => string | null;
  expand: (index: number) => string | null;
  switchWorld: (id: WorldId) => string | null;
  /** Folds in a save from the cloud; never loses local runs. */
  mergeRemote: (remote: GameState) => void;
  reset: () => void;
};

const GameContext = createContext<GameApi | null>(null);

export function GameProvider({ children, initial }: { children: ReactNode; initial: GameState }) {
  const [state, setState] = useState<GameState>(initial);

  useEffect(() => {
    saveGame(state).catch((e) => console.warn('Speichern fehlgeschlagen', e));
  }, [state]);

  const km = useMemo(() => totalKm(state.runs), [state.runs]);

  const addRun = useCallback(
    (run: RunInput) => {
      const outcome = applyRun(state, run);
      setState({ ...outcome.state, updatedAt: Date.now() });
      return outcome;
    },
    [state],
  );

  const world = state.worlds[state.activeWorld];

  // Actions work on the active world. They validate against the current state and
  // return an error message, or null on success.
  const build = useCallback(
    (index: number, itemId: ItemId) => {
      const item = ITEM_BY_ID[itemId];
      const tile = world.tiles[index];
      if (!tile?.unlocked) return 'Hier ist noch kein Land.';
      if (tile.item) return 'Hier steht schon etwas.';
      if (item.world !== 'any' && item.world !== state.activeWorld) return `${item.name} passt nicht in diese Welt.`;
      if (item.streakWeeks) {
        if (!state.inventory[itemId as StreakItemId]) {
          return `${item.name} bekommst du für ${item.streakWeeks} ${item.streakWeeks === 1 ? 'Woche' : 'Wochen'} Streak.`;
        }
      } else {
        if (km < item.unlockKm) return `${item.name} wird ab ${item.unlockKm} km freigeschaltet.`;
        if (state.energy < item.cost) return `Dir fehlen ${item.cost - state.energy} ⚡ – ab auf die Strecke!`;
      }
      setState((s) => {
        const inventory = { ...s.inventory };
        if (item.streakWeeks) inventory[itemId as StreakItemId] = (inventory[itemId as StreakItemId] ?? 1) - 1;
        return { ...updateTile(s, index, { item: itemId }), energy: s.energy - item.cost, inventory };
      });
      return null;
    },
    [state, world, km],
  );

  const demolish = useCallback(
    (index: number) => {
      const tile = world.tiles[index];
      if (!tile?.item) return 'Hier steht nichts.';
      const item = ITEM_BY_ID[tile.item];
      setState((s) => {
        const next = updateTile(s, index, { item: null });
        // Collectibles go back into the inventory instead of being sold.
        if (item.streakWeeks) {
          const id = item.id as StreakItemId;
          return { ...next, inventory: { ...s.inventory, [id]: (s.inventory[id] ?? 0) + 1 } };
        }
        return { ...next, energy: s.energy + Math.floor(item.cost * REFUND_RATE) };
      });
      return null;
    },
    [world],
  );

  const expand = useCallback(
    (index: number) => {
      const tile = world.tiles[index];
      if (!tile || tile.unlocked) return null;
      if (!isNeighborOfLand(world, index)) return 'Land kann nur am Rand wachsen.';
      const cost = expansionCost(world);
      if (state.energy < cost) return `Neues Land kostet ${cost} ⚡. Dir fehlen ${cost - state.energy} ⚡.`;
      setState((s) => ({ ...updateTile(s, index, { unlocked: true }), energy: s.energy - cost }));
      return null;
    },
    [state.energy, world],
  );

  const switchWorld = useCallback(
    (id: WorldId) => {
      if (!worldUnlocked(id, km)) return `${WORLD_BY_ID[id].name} öffnet sich ab ${WORLD_BY_ID[id].unlockKm} km.`;
      setState((s) => (s.activeWorld === id ? s : { ...s, activeWorld: id }));
      return null;
    },
    [km],
  );

  const mergeRemote = useCallback((remote: GameState) => {
    setState((s) => {
      const merged = mergeStates(s, remote);
      return sameState(merged, s) ? s : merged;
    });
  }, []);

  const reset = useCallback(() => setState(createGame()), []);

  const api = useMemo(
    () => ({ state, totalKm: km, addRun, build, demolish, expand, switchWorld, mergeRemote, reset }),
    [state, km, addRun, build, demolish, expand, switchWorld, mergeRemote, reset],
  );

  return <GameContext.Provider value={api}>{children}</GameContext.Provider>;
}

/** Changes one tile of the active world and marks the save as changed. */
function updateTile(s: GameState, index: number, change: Partial<Tile>): GameState {
  const world = s.worlds[s.activeWorld];
  const tiles = world.tiles.slice();
  tiles[index] = { ...tiles[index], ...change };
  return { ...s, worlds: { ...s.worlds, [s.activeWorld]: { ...world, tiles } }, updatedAt: Date.now() };
}

export function useGame(): GameApi {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame muss innerhalb von GameProvider verwendet werden');
  return ctx;
}
