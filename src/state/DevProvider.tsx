import { createContext, useContext, type ReactNode } from 'react';

import type { Profile } from '../lib/storage';

type DevApi = {
  profile: Profile;
  /** Switches between the real save and the developer playground. */
  switchProfile: (profile: Profile, options?: { reset?: boolean }) => void;
  /** Overrides the time of day the residents live by; null follows the real clock. */
  hour: number | null;
  setHour: (hour: number | null) => void;
};

const DevContext = createContext<DevApi | null>(null);

export function DevProvider({ value, children }: { value: DevApi; children: ReactNode }) {
  return <DevContext.Provider value={value}>{children}</DevContext.Provider>;
}

export function useDev(): DevApi {
  const ctx = useContext(DevContext);
  if (!ctx) throw new Error('useDev muss innerhalb von DevProvider verwendet werden');
  return ctx;
}
