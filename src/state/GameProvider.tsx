import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  createGame,
  energyForRun,
  expansionCost,
  isNeighborOfLand,
  ITEM_BY_ID,
  REFUND_RATE,
  totalKm,
  type GameState,
  type ItemId,
  type RunRecord,
} from '../lib/game';
import { saveGame } from '../lib/storage';
import type { FinishedRun } from '../lib/tracker';

type GameApi = {
  state: GameState;
  totalKm: number;
  addRun: (run: FinishedRun) => RunRecord;
  build: (index: number, item: ItemId) => string | null;
  demolish: (index: number) => string | null;
  expand: (index: number) => string | null;
  reset: () => void;
};

const GameContext = createContext<GameApi | null>(null);

export function GameProvider({ children, initial }: { children: ReactNode; initial: GameState }) {
  const [state, setState] = useState<GameState>(initial);

  useEffect(() => {
    saveGame(state).catch((e) => console.warn('Speichern fehlgeschlagen', e));
  }, [state]);

  const km = useMemo(() => totalKm(state.runs), [state.runs]);

  const addRun = useCallback((run: FinishedRun) => {
    const { energy, rejectedReason } = energyForRun(run.distanceM, run.durationS);
    const record: RunRecord = { id: String(run.startedAt), ...run, energy, rejectedReason };
    setState((s) => ({ ...s, energy: s.energy + energy, runs: [record, ...s.runs] }));
    return record;
  }, []);

  // Actions validate against the current state and return an error message, or null on success.
  const build = useCallback(
    (index: number, itemId: ItemId) => {
      const item = ITEM_BY_ID[itemId];
      const tile = state.world.tiles[index];
      if (!tile?.unlocked) return 'Hier ist noch kein Land.';
      if (tile.item) return 'Hier steht schon etwas.';
      if (km < item.unlockKm) return `${item.name} wird ab ${item.unlockKm} km freigeschaltet.`;
      if (state.energy < item.cost) return `Dir fehlen ${item.cost - state.energy} ⚡ – ab auf die Strecke!`;
      setState((s) => {
        const tiles = s.world.tiles.slice();
        tiles[index] = { ...tiles[index], item: itemId };
        return { ...s, energy: s.energy - item.cost, world: { ...s.world, tiles } };
      });
      return null;
    },
    [state, km],
  );

  const demolish = useCallback(
    (index: number) => {
      const tile = state.world.tiles[index];
      if (!tile?.item) return 'Hier steht nichts.';
      const refund = Math.floor(ITEM_BY_ID[tile.item].cost * REFUND_RATE);
      setState((s) => {
        const tiles = s.world.tiles.slice();
        tiles[index] = { ...tiles[index], item: null };
        return { ...s, energy: s.energy + refund, world: { ...s.world, tiles } };
      });
      return null;
    },
    [state],
  );

  const expand = useCallback(
    (index: number) => {
      const tile = state.world.tiles[index];
      if (!tile || tile.unlocked) return null;
      if (!isNeighborOfLand(state.world, index)) return 'Land kann nur am Rand der Insel wachsen.';
      const cost = expansionCost(state.world);
      if (state.energy < cost) return `Neues Land kostet ${cost} ⚡. Dir fehlen ${cost - state.energy} ⚡.`;
      setState((s) => {
        const tiles = s.world.tiles.slice();
        tiles[index] = { ...tiles[index], unlocked: true };
        return { ...s, energy: s.energy - cost, world: { ...s.world, tiles } };
      });
      return null;
    },
    [state],
  );

  const reset = useCallback(() => setState(createGame()), []);

  const api = useMemo(
    () => ({ state, totalKm: km, addRun, build, demolish, expand, reset }),
    [state, km, addRun, build, demolish, expand, reset],
  );

  return <GameContext.Provider value={api}>{children}</GameContext.Provider>;
}

export function useGame(): GameApi {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame muss innerhalb von GameProvider verwendet werden');
  return ctx;
}
