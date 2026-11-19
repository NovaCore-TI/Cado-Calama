import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './helpers/load-ts.mjs';

function hooks() {
  const values = []; let cursor = 0;
  return {
    reset: () => { cursor = 0; },
    react: {
      createContext: () => ({ Provider: 'fixture-provider' }),
      useState(initial) {
        const key = cursor++;
        if (!(key in values)) values[key] = typeof initial === 'function' ? initial() : initial;
        return [values[key], next => { values[key] = typeof next === 'function' ? next(values[key]) : next; }];
      },
      useRef(initial) { const key = cursor++; return values[key] ??= { current: initial }; },
      useCallback: fn => fn, useMemo: fn => fn(), useEffect() {},
    },
  };
}
function provider() {
  const store = hooks(); let actor = 'a', failure = false, pause = false, release, signal;
  const pending = new Promise(resolve => { signal = resolve; });
  const profile = () => ({ id: actor, nombre: 'Doctor ' + actor, email: actor + '@example.invalid' });
  const response = body => Response.json({ ok: true, ...body });
  const fetch = async (url, init = {}) => {
    if (url === '/api/auth/login') { actor = JSON.parse(init.body).email[0]; return response({ doctor: profile(), session: {} }); }
    if (url === '/api/auth/session') return response({ doctor: profile() });
    if (url.startsWith('/api/blog')) return response({ data: [] });
    if (url.startsWith('/api/bloques')) return response({ slots: [], blockedDates: [] });
    if (url === '/api/orientaciones') {
      if (pause) { pause = false; signal(); return new Promise(resolve => { release = () => resolve(Response.json({ ok: false }, { status: 503 })); }); }
      if (failure) return Response.json({ ok: false }, { status: 503 });
      return response({ data: [{ codigo: 'own-' + actor, nombre_paciente: 'Fixture', fecha: '2099-01-01', hora: '19:00' }] });
    }
    throw Error('Unexpected request ' + url);
  };
  const { CadoProvider } = loadTs('src/context/CadoContext.tsx', {
    react: store.react,
    '@/lib/supabase': { supabase: { auth: { setSession: async () => ({ error: null }), signOut: async () => {} } } },
  }, {}, { fetch });
  const render = () => { store.reset(); return CadoProvider({ children: null }).props.value; };
  return { render, fail: value => { failure = value; }, pause: () => { pause = true; return pending; }, release: () => release() };
}
function nodes(element) {
  if (!element || typeof element !== 'object') return [];
  if (Array.isArray(element)) return element.flatMap(nodes);
  return [element, ...nodes(element.props?.children)];
}
function text(element) {
  if (typeof element === 'string' || typeof element === 'number') return String(element);
  if (!element || typeof element !== 'object') return '';
  return Array.isArray(element) ? element.map(text).join('') : text(element.props?.children);
}

test('RF-20: failed initial clinical load stays signed in, reports an error and recovers on retry', async () => {
  const fixture = provider(); fixture.fail(true);
  assert.equal((await fixture.render().loginDoctor('a@example.invalid', 'fixture')).ok, true);
  assert.equal(fixture.render().isDoctorLoggedIn, true);
  assert.match(fixture.render().appointmentsError, /No se pudieron cargar/);
  assert.equal(fixture.render().appointmentsLoading, false);
  fixture.fail(false); const retry = fixture.render().refreshSupabaseData();
  assert.equal(fixture.render().appointmentsLoading, true);
  await retry;
  assert.equal(fixture.render().appointmentsError, '');
  assert.equal(fixture.render().appointments[0].id, 'own-a');
  fixture.fail(true); await fixture.render().refreshSupabaseData();
  assert.equal(fixture.render().appointments[0].id, 'own-a');
  assert.match(fixture.render().appointmentsError, /No se pudieron cargar/);
});

test('RF-20: a delayed load failure cannot overwrite the next professional session', async () => {
  const fixture = provider(); await fixture.render().loginDoctor('a@example.invalid', 'fixture');
  const pending = fixture.pause(); const old = fixture.render().refreshSupabaseData(); await pending;
  await fixture.render().loginDoctor('b@example.invalid', 'fixture'); fixture.release(); await old;
  assert.equal(fixture.render().doctorUser.id, 'b');
  assert.equal(fixture.render().appointments[0].id, 'own-b');
  assert.equal(fixture.render().appointmentsError, '');
  assert.equal(fixture.render().appointmentsLoading, false);
});

test('RF-20: the dashboard distinguishes failed/loading history from a valid empty result', async () => {
  for (const [error, loading] of [['No se pudieron cargar las orientaciones.', false], ['', true], ['', false]]) {
    const store = hooks(); let retries = 0;
    const context = { doctorUser: { id: 'fixture', nombre: 'Fixture' }, isDoctorLoggedIn: true,
      appointments: [], availableSlots: [], blockedDates: [], doctorBlogPosts: [],
      supabaseStatus: { connected: true }, appointmentsError: error, appointmentsLoading: loading,
      refreshSupabaseData: async () => { retries++; } };
    const Page = loadTs('src/app/admin/page.tsx', {
      react: store.react, '@/context/CadoContext': { useCado: () => context },
      '@/components/GuideLibrary': { GuideLibrary: () => null },
    }).default;
    const Dashboard = Page().type; const render = () => { store.reset(); return Dashboard(); };
    nodes(render()).find(node => node.type === 'button' && /^Orientaciones/.test(text(node))).props.onClick();
    const tree = render();
    if (error || loading) assert.doesNotMatch(text(tree), /No se encontraron orientaciones/);
    else assert.match(text(tree), /No se encontraron orientaciones/);
    if (error) {
      assert.match(text(tree), /No se pudieron cargar las orientaciones/);
      await nodes(tree).find(node => node.type === 'button' && /Reintentar historial/.test(text(node))).props.onClick();
      assert.equal(retries, 1);
    } else if (loading) assert.match(text(tree), /Cargando historial/);
  }
});
