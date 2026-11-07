import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './helpers/load-ts.mjs';

const tick = () => new Promise(resolve => setImmediate(resolve));
const a = '11111111-1111-1111-1111-111111111111';
const b = '22222222-2222-2222-2222-222222222222';

test('Live broker shares connections, scopes events, recovers joins and removes the final channel', async () => {
  const { createLiveBroker } = loadTs('src/lib/live-updates.ts');
  const channels = [], removed = [], tokens = [];
  const client = {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'user-a' }, access_token: 'fixture' } } }) },
    realtime: { setAuth: async token => tokens.push(token) },
    channel(name) {
      const channel = { name, handlers: [], on(_, filter, receive) { this.handlers.push({ filter, receive }); return this; }, subscribe(fn) { this.status = fn; return this; } };
      channels.push(channel); return channel;
    },
    removeChannel(channel) { removed.push(channel); },
  };
  const broker = createLiveBroker(async () => client);
  const eventsA = [], eventsB = [], statuses = [];
  const options = { scope: 'doctor', doctorId: a, authUserId: 'user-a', resources: ['appointments'] };
  const stopA = broker.subscribe(options, { resources: new Set(['appointments']), change: (...args) => eventsA.push(args), status: value => statuses.push(value) });
  const stopB = broker.subscribe(options, { resources: new Set(['blog']), change: (...args) => eventsB.push(args), status() {} });
  await tick();
  assert.equal(channels.length, 1);
  assert.deepEqual(tokens, ['fixture']);
  assert.equal(channels[0].handlers[0].filter.filter, `doctor_id=eq.${a}`);
  assert.ok(channels[0].handlers.every(item => item.filter.event !== 'DELETE'));
  channels[0].status('SUBSCRIBED');
  channels[0].handlers[0].receive({ new: { audience: 'doctor', doctor_id: b, resource: 'appointments' } });
  channels[0].handlers[0].receive({ new: { audience: 'public', resource: 'appointments' } });
  assert.equal(eventsA.length, 1, 'foreign rows do not trigger refetches');
  channels[0].handlers[1].receive({ new: { audience: 'doctor', doctor_id: a, resource: 'appointments' } });
  assert.deepEqual(eventsA.at(-1), ['appointments', 'change']);
  assert.equal(eventsB.length, 1, 'resources are filtered within a shared channel');
  channels[0].status('CHANNEL_ERROR');
  assert.equal(statuses.at(-1), false);
  channels[0].status('SUBSCRIBED');
  assert.deepEqual(eventsA.at(-1), [null, 'connected']);
  stopA(); assert.equal(removed.length, 0);
  stopB(); assert.equal(removed.length, 1);
});

test('Live startup retries an unavailable session and cancellation prevents late subscriptions', async () => {
  const timers = new Map(); let next = 0, session = null, joined = 0;
  const { createLiveBroker } = loadTs('src/lib/live-updates.ts', {}, {}, {
    setTimeout(fn) { timers.set(++next, fn); return next; }, clearTimeout(id) { timers.delete(id); },
  });
  const client = { auth: { getSession: async () => ({ data: { session } }) }, realtime: { setAuth: async () => {} },
    channel() { joined++; return { on() { return this; }, subscribe() {} }; }, removeChannel() {} };
  const listener = { resources: new Set(['appointments']), status() {}, change() {} };
  const broker = createLiveBroker(async () => client);
  const stop = broker.subscribe({ scope: 'doctor', doctorId: a, authUserId: 'user-a', resources: ['appointments'] }, listener);
  await tick(); assert.equal(joined, 0); assert.equal(timers.size, 1);
  session = { user: { id: 'user-a' }, access_token: 'fixture' };
  [...timers.values()][0](); await tick(); assert.equal(joined, 1); stop();
  let release;
  const pendingBroker = createLiveBroker(() => new Promise(resolve => { release = resolve; }));
  const cancel = pendingBroker.subscribe({ resources: ['availability'] }, listener);
  cancel(); release(client); await tick(); assert.equal(joined, 1);
});

test('Live hook merges bursts, serializes requests, recovers focus and clears listeners', async () => {
  let subscription, cleanup, timeoutId = 0;
  const timeouts = new Map(), intervals = new Map(), windowEvents = new Map(), documentEvents = new Map();
  const document = { visibilityState: 'visible', addEventListener: (name, fn) => documentEvents.set(name, fn), removeEventListener: name => documentEvents.delete(name) };
  let stopped = false;
  const { useLiveUpdates } = loadTs('src/hooks/useLiveUpdates.ts', {
    react: { useRef: initial => ({ current: initial }), useState: initial => [initial, () => {}], useEffect: fn => { cleanup = fn(); } },
    '@/lib/live-updates': { liveBroker: { subscribe(_, listener) { subscription = listener; return () => { stopped = true; }; } } },
  }, {}, {
    document, window: { addEventListener: (name, fn) => windowEvents.set(name, fn), removeEventListener: name => windowEvents.delete(name) },
    setTimeout(fn) { timeouts.set(++timeoutId, fn); return timeoutId; }, clearTimeout(id) { timeouts.delete(id); },
    setInterval(fn) { intervals.set(++timeoutId, fn); return timeoutId; }, clearInterval(id) { intervals.delete(id); },
  });
  const calls = []; let release;
  useLiveUpdates({ resources: ['blog', 'availability'] }, (...args) => {
    calls.push(args); return new Promise(resolve => { release = resolve; });
  });
  const flush = async () => { const tasks = [...timeouts.values()]; timeouts.clear(); tasks.forEach(fn => fn()); await tick(); };
  subscription.change('blog', 'change'); subscription.change('availability', 'change');
  assert.equal(timeouts.size, 1); await flush();
  assert.deepEqual(calls[0], [null, 'change']);
  subscription.change('blog', 'change'); subscription.change('blog', 'change');
  assert.equal(calls.length, 1); release(); await tick(); await flush();
  assert.deepEqual(calls[1], ['blog', 'change']);
  release(); await tick();
  document.visibilityState = 'hidden'; [...intervals.values()][0](); assert.equal(timeouts.size, 0);
  document.visibilityState = 'visible'; windowEvents.get('focus')(); await flush();
  assert.deepEqual(calls[2], [null, 'resume']);
  cleanup(); release(); await tick();
  assert.equal(stopped, true); assert.equal(windowEvents.size, 0); assert.equal(documentEvents.size, 0); assert.equal(intervals.size, 0); assert.equal(timeouts.size, 0);
});
