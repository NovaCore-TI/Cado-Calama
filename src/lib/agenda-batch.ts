import { futureChileSlot, VIRTUAL_TIMES } from "./booking-validation";

export function standardWeekSlots(available: string[], blocked: string[], occupied: string[], now = new Date()) {
  const today = now.toLocaleDateString("en-CA", { timeZone: "America/Santiago" });
  const slots: string[] = [];
  for (let offset = 0; offset < 7; offset++) {
    // Calendar days at noon UTC avoid DST and host timezone changes.
    const day = new Date(today + "T12:00:00Z");
    day.setUTCDate(day.getUTCDate() + offset);
    if (day.getUTCDay() === 0) continue;
    const date = day.toISOString().slice(0, 10);
    if (blocked.includes(date)) continue;
    for (const time of VIRTUAL_TIMES) {
      const key = `${date}|${time}`;
      if (futureChileSlot(date, time, now) && !available.includes(key) && !occupied.includes(key)) slots.push(key);
    }
  }
  return slots;
}

export async function saveSlotBatch(slots: string[], save: (slot: string) => Promise<boolean>) {
  let saved = 0, failed = 0;
  for (const slot of new Set(slots)) {
    try { if (await save(slot)) saved++; else failed++; }
    catch { failed++; }
  }
  return { saved, failed };
}
