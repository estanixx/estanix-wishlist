'use client';

import { useEffect } from 'react';
import { registerVisitOnce } from '@/lib/visitor-storage';

// Renders nothing -- fires the once-per-visitor POST /api/visits on mount via
// lib/visitor-storage.ts. Not in the Phase 2 task list's named component set,
// but required by it: localStorage only exists client-side, so a server
// component page (app/shared/page.tsx) needs a tiny client boundary to run
// the dedup check. Phase 3's /shared/[wishId] page renders this exact same
// component -- same dedup key, zero duplicated logic (apply-progress
// instructions for this batch).
export function VisitCounterEffect() {
  useEffect(() => {
    void registerVisitOnce();
  }, []);

  return null;
}
