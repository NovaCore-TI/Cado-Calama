import test from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./helpers/load-ts.mjs";

test("Changing professional discards late private responses and public bookings never enter the dashboard cache", async () => {
  // Execute the real provider with deterministic hook storage and HTTP/Auth peers.
  // Effects (polling and browser listeners) are deliberately outside this unit test.
  const values = [];
  let cursor = 0;
  const react = {
    createContext: () => ({ Provider: "fixture-provider" }),
    useContext: () => null,
    useState(initial) {
      const index = cursor++;
      if (!(index in values))
        values[index] = typeof initial === "function" ? initial() : initial;
      return [
        values[index],
        (next) => {
          values[index] =
            typeof next === "function" ? next(values[index]) : next;
        },
      ];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in values)) values[index] = { current: initial };
      return values[index];
    },
    useCallback: (fn) => fn,
    useEffect: () => {},
  };
  let actor = "a",
    pauseA = false,
    releaseA,
    signalPending;
  const pending = new Promise((resolve) => {
    signalPending = resolve;
  });
  const doctor = (id) => ({
    id,
    nombre: `Doctor ${id}`,
    email: `${id}@example.invalid`,
    auth_user_id: `auth-${id}`,
  });
  const row = (id) => ({
    codigo: `own-${id}`,
    nombre_paciente: `Patient ${id}`,
    email_paciente: `${id}@example.invalid`,
    telefono_paciente: "12345678",
    fecha: "2099-01-01",
    hora: "19:00",
    estado_atencion: "Programada",
    created_at: "2099-01-01",
  });
  const response = (data) => Response.json({ ok: true, ...data });
  const fetchPeer = async (url, init = {}) => {
    if (url === "/api/auth/session") {
      if (init.method === "POST")
        actor = new Headers(init.headers).get("authorization").slice(-1);
      return response({ doctor: doctor(actor) });
    }
    if (url.startsWith("/api/blog")) return response({ data: [] });
    if (url.startsWith("/api/bloques"))
      return response({ slots: [], blockedDates: [] });
    if (url === "/api/orientaciones") {
      const captured = actor;
      if (pauseA && captured === "a") {
        pauseA = false;
        signalPending();
        return new Promise((resolve) => {
          releaseA = () => resolve(response({ data: [row(captured)] }));
        });
      }
      return response({ data: [row(captured)] });
    }
    throw Error("Unexpected HTTP call " + url);
  };
  const { CadoProvider } = loadTs(
    "src/context/CadoContext.tsx",
    {
      react,
      "@/lib/supabase": {
        checkSupabaseConnection: async () => ({ connected: true }),
        supabase: {
          auth: {
            signInWithPassword: async ({ email }) => ({
              data: { session: { access_token: `token-${email[0]}` } },
            }),
            signOut: async () => {},
          },
        },
      },
    },
    {},
    { fetch: fetchPeer },
  );
  const render = () => {
    cursor = 0;
    return CadoProvider({ children: null }).props.value;
  };
  let context = render();
  assert.equal(
    (await context.loginDoctor("a@example.invalid", "fixture")).ok,
    true,
  );
  context = render();
  assert.equal(context.appointments[0].id, "own-a");
  pauseA = true;
  const oldRefresh = context.refreshSupabaseData();
  await pending;
  assert.equal(
    (await context.loginDoctor("b@example.invalid", "fixture")).ok,
    true,
  );
  releaseA();
  await oldRefresh;
  context = render();
  assert.equal(context.doctorUser.nombre, "Doctor b");
  assert.deepEqual(
    Array.from(context.appointments, (a) => a.id),
    ["own-b"],
  );
  context.addAppointment({
    id: "public-booking-for-a",
    skipSupabaseSync: true,
    patientName: "Public patient",
    email: "public@example.invalid",
    phone: "12345678",
    date: "2099-01-01",
    time: "19:15",
    comfortProfile: {},
    meetLink: "",
  });
  context = render();
  assert.deepEqual(
    Array.from(context.appointments, (a) => a.id),
    ["own-b"],
  );
  await context.refreshSupabaseData();
});
