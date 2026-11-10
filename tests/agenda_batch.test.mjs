import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './helpers/load-ts.mjs';
const { standardWeekSlots, saveSlotBatch } = loadTs('src/lib/agenda-batch.ts');

test('Standard week respects Chile time, past slots, Sundays, blocked dates and existing bookings', () => {
  const slots = standardWeekSlots(['2026-10-30|19:45'], ['2026-10-31'], ['2026-11-02|19:00'], new Date('2026-10-30T22:20:00Z'));
  assert.ok(slots.includes('2026-10-30|19:30'));
  assert.ok(!slots.includes('2026-10-30|19:00'));
  assert.ok(!slots.includes('2026-10-30|19:15'));
  assert.ok(!slots.includes('2026-10-30|19:45'));
  assert.ok(!slots.some(s => s.startsWith('2026-10-31') || s.startsWith('2026-11-01')));
  assert.ok(!slots.includes('2026-11-02|19:00'));
  assert.ok(slots.every(s => /\|19:(00|15|30|45)$/.test(s)));
});
test('Batch waits for confirmed persistence, deduplicates and reports partial failure', async () => {
  let release, complete = false;
  const calls = [];
  const pending = saveSlotBatch(['a','a','b','c'], async slot => {
    calls.push(slot);
    if (slot === 'a') return new Promise(resolve => { release = resolve; });
    if (slot === 'b') return false;
    throw Error('network');
  }).then(result => { complete = true; return result; });
  assert.equal(complete, false);
  assert.deepEqual(calls, ['a']);
  release(true);
  const result = await pending;
  assert.equal(result.saved, 1);
  assert.equal(result.failed, 2);
  assert.deepEqual(calls, ['a','b','c']);
});
