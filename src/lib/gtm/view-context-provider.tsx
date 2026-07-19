'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import type { ViewContext } from './view-context';

type ScopedViewContext = {
  pathname: string;
  value: ViewContext;
};

type ViewContextValue = {
  viewContext: ViewContext | null;
  setViewContext: (value: ViewContext) => void;
  clearViewContext: () => void;
};

const ViewContextState = createContext<ViewContextValue | null>(null);

export function ViewContextProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [scopedContext, setScopedContext] = useState<ScopedViewContext | null>(
    null
  );

  const setViewContext = useCallback(
    (value: ViewContext) => setScopedContext({ pathname, value }),
    [pathname]
  );
  const clearViewContext = useCallback(() => setScopedContext(null), []);
  const viewContext =
    scopedContext?.pathname === pathname ? scopedContext.value : null;
  const value = useMemo(
    () => ({ viewContext, setViewContext, clearViewContext }),
    [viewContext, setViewContext, clearViewContext]
  );

  return (
    <ViewContextState.Provider value={value}>
      {children}
    </ViewContextState.Provider>
  );
}

export function useViewContext(): ViewContextValue {
  const value = useContext(ViewContextState);
  if (!value) {
    throw new Error('useViewContext must be used inside ViewContextProvider');
  }
  return value;
}
