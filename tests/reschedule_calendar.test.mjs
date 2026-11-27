import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './helpers/load-ts.mjs';

const fixtures = [
  { fecha: '2026-12-02', hora: '19:30', slotKey: '2026-12-02|19:30' },
  { fecha: '2026-11-21', hora: '19:15', slotKey: '2026-11-21|19:15' },
  { fecha: '2026-11-20', hora: '19:45', slotKey: '2026-11-20|19:45' },
  { fecha: '2026-11-20', hora: '19:00', slotKey: '2026-11-20|19:00' },
];
function setup() {
  const state = []; let cursor = 0;
  const props = { slots: fixtures, value: '', onChange: next => { props.value = next; }, onRefresh() {} };
  const { RescheduleCalendar } = loadTs('src/components/RescheduleCalendar.tsx', { react: {
    useId: () => 'calendar-fixture',
    useState(initial) {
      const i = cursor++;
      if (!(i in state)) state[i] = initial;
      return [state[i], next => { state[i] = next; }];
    },
  } });
  return { props, render: () => { cursor = 0; return RescheduleCalendar(props); } };
}
const nodes = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
const text = node => typeof node === 'string' || typeof node === 'number' ? String(node) : !node || typeof node !== 'object' ? '' : Array.isArray(node) ? node.map(text).join('') : text(node.props?.children);
const button = (tree, name) => nodes(tree).find(n => n.type === 'button' && (n.props['aria-label'] || text(n)).includes(name));

test('Rescheduling groups unsorted availability by day and requires an explicit hour selection', () => {
  const calendar = setup();
  let tree = calendar.render();
  assert.match(text(tree), /noviembre de 2026/);
  assert.equal(button(tree, 'Mes anterior').props.disabled, true);
  assert.equal(button(tree, '19:00').props['aria-pressed'], false);
  assert.equal(button(tree, '19:15'), undefined);
  assert.equal(button(tree, 'jueves, 19 de noviembre').props.disabled, true);
  button(tree, '19:00').props.onClick();
  tree = calendar.render();
  assert.equal(calendar.props.value, '2026-11-20|19:00');
  assert.equal(button(tree, '19:00').props['aria-pressed'], true);
  button(tree, 'sábado, 21 de noviembre').props.onClick();
  tree = calendar.render();
  assert.equal(calendar.props.value, '');
  assert.ok(button(tree, '19:15'));
  assert.equal(button(tree, '19:00'), undefined);
  assert.match(text(tree), /Tu cita actual se conserva hasta confirmar/);
});
test('Month navigation clears the previous hour and only shows times from the displayed month', () => {
  const calendar = setup();
  let tree = calendar.render();
  button(tree, '19:00').props.onClick();
  button(tree, 'Mes siguiente').props.onClick();
  tree = calendar.render();
  assert.equal(calendar.props.value, '');
  assert.match(text(tree), /diciembre de 2026/);
  assert.ok(button(tree, '19:30'));
  assert.equal(button(tree, '19:00'), undefined);
  assert.equal(button(tree, 'Mes siguiente').props.disabled, true);
  button(tree, 'Mes anterior').props.onClick();
  assert.match(text(calendar.render()), /noviembre de 2026/);
});
test('Availability updates invalidate a removed selection and loading disables all appointment controls', () => {
  const calendar = setup();
  button(calendar.render(), '19:00').props.onClick();
  calendar.props.slots = fixtures.filter(slot => slot.fecha === '2026-12-02');
  let tree = calendar.render();
  assert.match(text(tree), /diciembre de 2026/);
  assert.doesNotMatch(text(tree), /Nuevo horario seleccionado/);
  calendar.props.loading = true;
  tree = calendar.render();
  assert.match(text(tree), /Buscando horarios/);
  assert.ok(nodes(tree).filter(n => n.type === 'button').every(n => n.props.disabled));
});
test('No available appointments gives an actionable empty state while preserving the current booking', () => {
  const calendar = setup(); calendar.props.slots = [];
  let refreshes = 0; calendar.props.onRefresh = () => { refreshes++; };
  const tree = calendar.render();
  assert.match(text(tree), /Tu reserva actual se mantiene/);
  button(tree, 'Volver a consultar').props.onClick();
  assert.equal(refreshes, 1);
});
