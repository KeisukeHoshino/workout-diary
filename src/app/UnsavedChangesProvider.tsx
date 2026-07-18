import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

interface UnsavedChangesValue {
  isDirty: boolean;
  markDirty(source: string): void;
  markClean(source: string): void;
}

const UnsavedChangesContext = createContext<UnsavedChangesValue | null>(null);

export function UnsavedChangesProvider({ children }: PropsWithChildren) {
  const [sources, setSources] = useState<Set<string>>(() => new Set());
  const markDirty = useCallback((source: string) => setSources((current) => new Set(current).add(source)), []);
  const markClean = useCallback((source: string) => setSources((current) => {
    if (!current.has(source)) return current;
    const next = new Set(current);
    next.delete(source);
    return next;
  }), []);
  const value = useMemo(() => ({ isDirty: sources.size > 0, markDirty, markClean }), [sources, markDirty, markClean]);
  return <UnsavedChangesContext.Provider value={value}>{children}</UnsavedChangesContext.Provider>;
}

export function useUnsavedChanges() {
  const value = useContext(UnsavedChangesContext);
  if (!value) throw new Error('useUnsavedChanges must be used within UnsavedChangesProvider.');
  return value;
}

export function useDirtySource(source: string) {
  const { markDirty, markClean } = useUnsavedChanges();
  useEffect(() => () => markClean(source), [markClean, source]);
  return {
    markDirty: useCallback(() => markDirty(source), [markDirty, source]),
    markClean: useCallback(() => markClean(source), [markClean, source])
  };
}
