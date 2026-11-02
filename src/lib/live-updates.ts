import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

export const LIVE_RESOURCES = ['availability', 'appointments', 'blog', 'guides', 'testimonials', 'faq', 'profile'] as const;
export type LiveResource = typeof LIVE_RESOURCES[number];
export type LiveScope = 'public' | 'doctor' | 'staff';
export type LiveReason = 'change' | 'connected' | 'resume' | 'poll';
export interface LiveOptions {
  scope?: LiveScope;
  doctorId?: string | null;
  authUserId?: string | null;
  resources: readonly LiveResource[];
  enabled?: boolean;
  pollMs?: number;
}
type Listener = {
  resources: Set<LiveResource>;
  change: (resource: LiveResource | null, reason: LiveReason) => void;
  status: (connected: boolean) => void;
};
type Entry = {
  active: boolean;
  connected: boolean;
  listeners: Set<Listener>;
  client?: SupabaseClient;
  channel?: RealtimeChannel;
  retry?: ReturnType<typeof setTimeout>;
};
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

// Only revision metadata is replicated. Clinical records remain behind the APIs.
export function liveResourceFromRow(row: Record<string, unknown>, scope: LiveScope, doctorId?: string | null): LiveResource | null {
  if (row.audience !== scope || (scope === 'doctor' && row.doctor_id !== doctorId)) return null;
  if (!LIVE_RESOURCES.includes(row.resource as LiveResource)) return null;
  return row.resource as LiveResource;
}

export function createLiveBroker(loadClient: () => Promise<SupabaseClient>) {
  const entries = new Map<string, Entry>();
  function subscribe(options: LiveOptions, listener: Listener) {
    const scope = options.scope || 'public';
    const doctorId = options.doctorId;
    if (scope === 'doctor' && (!doctorId || !UUID.test(doctorId))) {
      listener.status(false);
      return () => {};
    }
    const key = scope === 'doctor' ? `${scope}:${doctorId}:${options.authUserId || ''}` : scope;
    let entry = entries.get(key);
    if (!entry) {
      entry = { active: true, connected: false, listeners: new Set() };
      entries.set(key, entry);
      const target = entry;
      const start = async () => { try {
        const client = await loadClient();
        if (!target.active) return;
        if (scope !== 'public') {
          const { data, error } = await client.auth.getSession();
          if (!target.active) return;
          if (error || !data.session || (options.authUserId && data.session.user.id !== options.authUserId)) throw Error('Session not ready');
          await client.realtime.setAuth(data.session.access_token);
          if (!target.active) return;
        }
        target.client = client;
        const filter = scope === 'doctor' ? `doctor_id=eq.${doctorId}` : `audience=eq.${scope}`;
        const receive = (payload: { new: Record<string, unknown> }) => {
            if (!target.active) return;
            const resource = liveResourceFromRow(payload.new, scope, doctorId);
            if (!resource) return;
            for (const subscriber of target.listeners) if (subscriber.resources.has(resource)) subscriber.change(resource, 'change');
          };
        const channel = client.channel(`cado-live:${key}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'app_live_revisions', filter }, receive)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_live_revisions', filter }, receive);
        target.channel = channel;
        channel.subscribe(status => {
          if (!target.active) return;
          target.connected = status === 'SUBSCRIBED';
          for (const subscriber of target.listeners) {
            subscriber.status(target.connected);
            // Refetch on every successful join, including reconnections, to close gaps.
            if (target.connected) subscriber.change(null, 'connected');
          }
        });
      } catch {
        if (!target.active) return;
        for (const subscriber of target.listeners) subscriber.status(false);
        target.retry = setTimeout(() => void start(), 5_000);
      } };
      void start();
    }
    entry.listeners.add(listener);
    listener.status(entry.connected);
    if (entry.connected) listener.change(null, 'connected');
    const target = entry;
    return () => {
      target.listeners.delete(listener);
      if (target.listeners.size) return;
      target.active = false;
      clearTimeout(target.retry);
      entries.delete(key);
      if (target.channel) void target.client?.removeChannel(target.channel);
    };
  }
  return { subscribe };
}

export const liveBroker = createLiveBroker(() => import('@/lib/supabase').then(module => module.supabase));
