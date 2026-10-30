export const FEELING_OPTIONS = [
  { id: "tranquilo", label: "Me siento tranquilo/a" },
  { id: "nervioso", label: "Tengo algunas inquietudes" },
  { id: "fobia", label: "Me cuesta dar este paso" },
  { id: "no_responde", label: "Prefiero no responder" },
] as const;

export function normalizeFeeling(value: unknown) {
  return FEELING_OPTIONS.find(option => option.id === value || option.label === value)?.id ?? null;
}
