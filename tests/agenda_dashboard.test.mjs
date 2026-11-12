import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './helpers/load-ts.mjs';

function dashboard(save, overrides = {}) {
  const values = [];
  let cursor = 0;
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in values)) values[index] = typeof initial === 'function' ? initial() : initial;
      return [values[index], next => { values[index] = typeof next === 'function' ? next(values[index]) : next; }];
    },
    useRef(initial) { const index = cursor++; return values[index] ??= { current: initial }; },
    useMemo: fn => fn(), useCallback: fn => fn, useEffect() {},
  };
  const context = {
    doctorUser: { id: 'fixture', nombre: 'Fixture', email: 'fixture@example.invalid' },
    isDoctorLoggedIn: true, appointments: [], questionnaires: [], availableSlots: [], blockedDates: [],
    doctorBlogPosts: [], blogPosts: [], supabaseStatus: { connected: true }, toggleSlotAvailability: save,
    ...overrides,
  };
  const Page = loadTs('src/app/admin/page.tsx', {
    react, '@/lib/doctor-offline': { readDoctorOffline: () => ({}) },
    '@/components/GuideLibrary': { GuideLibrary: () => null },
    '@/context/CadoContext': { useCado: () => context },
  }, {}, { window: { confirm: () => true, alert() {} } }).default;
  return () => { cursor = 0; const element = Page(); return element.type(element.props); };
}
function nodes(element) {
  if (!element || typeof element !== 'object') return [];
  if (Array.isArray(element)) return element.flatMap(nodes);
  return [element, ...nodes(element.props?.children)];
}
function label(element) {
  if (typeof element === 'string' || typeof element === 'number') return String(element);
  if (!element || typeof element !== 'object') return '';
  if (Array.isArray(element)) return element.map(label).join('');
  return label(element.props?.children);
}

test('Agenda dashboard waits for persistence, disables controls and prevents duplicate batch submissions', async () => {
  let release, calls = 0;
  const render = dashboard(async () => {
    calls++;
    if (calls === 1) return new Promise(resolve => { release = resolve; });
    return false;
  });
  let tree = render();
  const navigation = nodes(tree).find(node => node.type === 'button' && /Disponibilidad|Agenda/.test(label(node)));
  assert.ok(navigation);
  navigation.props.onClick();
  tree = render();
  const generate = nodes(tree).find(node => node.type === 'button' && /Generar semana estándar/.test(label(node)));
  assert.ok(generate);
  const pending = generate.props.onClick();
  assert.equal(calls, 1);
  await generate.props.onClick();
  assert.equal(calls, 1);
  tree = render();
  assert.equal(nodes(tree).find(node => node.type === 'fieldset').props.disabled, true);
  assert.match(label(tree), /Guardando cambios de agenda/);
  assert.doesNotMatch(label(tree), /Se guardaron 1 cambios/);
  release(true);
  await pending;
  tree = render();
  assert.equal(nodes(tree).find(node => node.type === 'fieldset').props.disabled, false);
  assert.match(label(tree), /Se guardaron 1 cambios/);
  assert.match(label(tree), /No se pudieron guardar/);
});

test('Habilitar never removes an existing block or offers a blocked date or active booking', async () => {
  const date = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  for (const [overrides, message] of [
    [{ availableSlots: [`${date}|19:00`] }, /ya está habilitado/],
    [{ blockedDates: [date] }, /fecha está bloqueada/],
    [{ appointments: [{ id: 'booked', date, time: '19:00', status: 'Programada', comfortProfile: {} }] }, /tiene una reserva/],
  ]) {
    let calls = 0;
    const render = dashboard(async () => { calls++; return true; }, overrides);
    nodes(render()).find(node => node.type === 'button' && label(node) === 'Disponibilidad').props.onClick();
    let tree = render();
    const dateInput = nodes(tree).find(node => node.type === 'input' && node.props.type === 'date' && !node.props['aria-label']);
    dateInput.props.onChange({ target: { value: date } });
    tree = render();
    await nodes(tree).find(node => node.type === 'button' && label(node) === 'Habilitar').props.onClick();
    assert.equal(calls, 0);
    assert.match(label(render()), message);
  }
});
