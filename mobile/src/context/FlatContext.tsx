import React, { createContext, useContext } from "react";

type FlatContextValue = { flatId: number; flatName: string };

const FlatContext = createContext<FlatContextValue | undefined>(undefined);

export function FlatProvider({ flatId, flatName, children }: FlatContextValue & { children: React.ReactNode }) {
  return <FlatContext.Provider value={{ flatId, flatName }}>{children}</FlatContext.Provider>;
}

export function useFlat() {
  const ctx = useContext(FlatContext);
  if (!ctx) throw new Error("useFlat must be used within a FlatProvider");
  return ctx;
}
