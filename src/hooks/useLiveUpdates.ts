'use client';

import { useEffect, useRef, useState } from 'react';
import { liveBroker, type LiveOptions, type LiveReason, type LiveResource } from '@/lib/live-updates';

// Refresh data, never remount a page or reset the user's form state.
export function useLiveUpdates(options: LiveOptions, onRefresh: (resource: LiveResource | null, reason: LiveReason) => void | Promise<void>) {
  const callback = useRef(onRefresh);
  callback.current = onRefresh;
  const [connected, setConnected] = useState(false);
  const { scope = 'public', doctorId, authUserId, enabled = true, pollMs = 30_000 } = options;
  const resourcesKey = [...new Set(options.resources)].sort().join(',');
  useEffect(() => {
    if (!enabled || !resourcesKey) { setConnected(false); return; }
    let active = true;
    let running = false;
    let pending = false;
    const resources = new Set<LiveResource>();
    let allResources = false;
    let reason: LiveReason = 'poll';
    let debounce: ReturnType<typeof setTimeout> | undefined;
    async function flush() {
      debounce = undefined;
      if (!active) return;
      if (running) { pending = true; return; }
      running = true;
      pending = false;
      const nextResource = !allResources && resources.size === 1 ? [...resources][0] : null;
      resources.clear();
      allResources = false;
      try { await callback.current(nextResource, reason); } catch { /* API views own their error state; polling remains available. */ }
      finally {
        running = false;
        if (pending && active) debounce = setTimeout(() => void flush(), 120);
      }
    }
    const refresh = (next: LiveResource | null, source: LiveReason) => {
      if (!active) return;
      if (next) resources.add(next);
      else allResources = true;
      reason = source;
      if (running) { pending = true; return; }
      if (!debounce) debounce = setTimeout(() => void flush(), 120);
    };
    const unsubscribe = liveBroker.subscribe({ scope, doctorId, authUserId, resources: resourcesKey.split(',') as LiveResource[] }, {
      resources: new Set(resourcesKey.split(',') as LiveResource[]),
      change: refresh,
      status: value => { if (active) setConnected(value); },
    });
    const resume = () => { if (document.visibilityState !== 'hidden') refresh(null, 'resume'); };
    const timer = setInterval(() => { if (document.visibilityState !== 'hidden') refresh(null, 'poll'); }, pollMs);
    window.addEventListener('focus', resume);
    window.addEventListener('online', resume);
    document.addEventListener('visibilitychange', resume);
    return () => {
      active = false;
      clearTimeout(debounce);
      clearInterval(timer);
      unsubscribe();
      window.removeEventListener('focus', resume);
      window.removeEventListener('online', resume);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [scope, doctorId, authUserId, resourcesKey, enabled, pollMs]);
  return enabled && connected;
}
