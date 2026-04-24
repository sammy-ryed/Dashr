'use client';

import { createContext, useContext } from 'react';
import { getCollegeConfig } from '@/lib/colleges';
import type { CollegeConfig } from '@/lib/colleges';

interface CollegeContextValue {
  college: CollegeConfig;
}

const CollegeContext = createContext<CollegeContextValue | null>(null);

/**
 * Wrap your app with this provider (done in app/layout.tsx).
 *
 * Accepts a plain `slug` string (not the full config object) so the
 * RSC serialisation boundary only needs to handle a string — which
 * serialises perfectly and never causes hydration mismatches.
 * The config is resolved deterministically from the slug on both
 * server and client using the same getCollegeConfig function.
 */
export function CollegeProvider({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  const config = getCollegeConfig(slug);
  return (
    <CollegeContext.Provider value={{ college: config }}>
      {children}
    </CollegeContext.Provider>
  );
}

/**
 * Access the current college config from any client component.
 *
 * @throws If used outside a CollegeProvider — so mis-placed components
 * are caught at runtime with a clear message.
 */
export function useCollege(): CollegeContextValue {
  const ctx = useContext(CollegeContext);
  if (!ctx) {
    throw new Error(
      '[DASHR] useCollege() was called outside a <CollegeProvider>. ' +
      'Make sure your component is rendered inside app/layout.tsx\'s provider tree.'
    );
  }
  return ctx;
}

