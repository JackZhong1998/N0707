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

function sameViewContext(left: ViewContext, right: ViewContext): boolean {
  return (
    left.view === right.view &&
    left.entityType === right.entityType &&
    left.entityId === right.entityId &&
    left.title === right.title &&
    left.channelId === right.channelId &&
    left.section === right.section &&
    left.selectedText === right.selectedText &&
    left.revision === right.revision &&
    left.path === right.path
  );
}

export function ViewContextProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [scopedContext, setScopedContext] = useState<ScopedViewContext | null>(
    null
  );

  const setViewContext = useCallback((value: ViewContext) => {
    setScopedContext((prev) => {
      if (
        prev &&
        prev.pathname === pathname &&
        sameViewContext(prev.value, value)
      ) {
        return prev;
      }
      return { pathname, value };
    });
  }, [pathname]);

  const clearViewContext = useCallback(() => {
    setScopedContext((prev) => (prev === null ? prev : null));
  }, []);

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
