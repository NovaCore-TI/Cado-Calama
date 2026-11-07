export const VIRTUAL_TIMES = ["19:00", "19:15", "19:30", "19:45"];
export function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(value + "T12:00:00Z");
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
export function futureChileSlot(
  date: unknown,
  time: unknown,
  now = new Date(),
) {
  if (
    !validDate(date) ||
    typeof time !== "string" ||
    !VIRTUAL_TIMES.includes(time)
  )
    return false;
  const today = now.toLocaleDateString("en-CA", {
    timeZone: "America/Santiago",
  });
  const currentTime = now.toLocaleTimeString("en-GB", {
    timeZone: "America/Santiago",
    hour12: false,
  });
  return date > today || (date === today && time + ":00" > currentTime);
}
export function validContactName(name: unknown) {
  return (
    typeof name === "string" &&
    name.trim().length >= 3 &&
    name.length <= 120 &&
    !/[\r\n]/.test(name)
  );
}

export function validContactEmail(email: unknown) {
  return (
    typeof email === "string" &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

export function validContactPhone(phone: unknown) {
  return typeof phone === "string" && /^[+0-9 ()-]{8,25}$/.test(phone);
}

export function formatChileanPhone(phone: string) {
  const trimmed = phone.trim();
  if (!/^(?:\+56|0056|56)?[0-9 ()-]+$/.test(trimmed)) return trimmed;

  const compact = trimmed.replace(/[ ()-]/g, '');
  const national = compact.replace(/^(?:\+56|0056|56)(?=\d{9}$)/, '');
  const mobile = /^(9)(\d{4})(\d{4})$/.exec(national);
  if (mobile) return `+56 ${mobile[1]} ${mobile[2]} ${mobile[3]}`;

  const landline = /^([2-7]\d)(\d{3})(\d{4})$/.exec(national);
  return landline ? `+56 ${landline[1]} ${landline[2]} ${landline[3]}` : trimmed;
}

export function validContact(name: unknown, email: unknown, phone: unknown) {
  return validContactName(name) && validContactEmail(email) && validContactPhone(phone);
}
