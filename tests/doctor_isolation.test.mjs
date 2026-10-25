import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { NextRequest } from "next/server.js";
import { loadTs, database } from "./helpers/load-ts.mjs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

test("Dashboard renders each database profile name without another doctor's identity", () => {
  const names = [
    "Dra. Antonia Fixture",
    "Dr. Bruno Fixture",
    "Dra. Camila Fixture",
  ];
  for (const name of names) {
    const Page = loadTs("src/app/admin/page.tsx", {
      "@/context/CadoContext": {
        useCado: () => ({
          doctorUser: {
            id: name,
            nombre: name,
            email: "fixture@example.invalid",
            rol: "Odontología",
          },
          isDoctorLoggedIn: true,
          authMethod: "supabase",
          appointments: [],
          questionnaires: [],
          availableSlots: [],
          blockedDates: [],
          blogPosts: [],
          doctorBlogPosts: [],
          supabaseStatus: {
            connected: true,
            tablesReady: true,
            latencyMs: 1,
            message: "Fixture",
          },
        }),
      },
    }).default;
    const html = renderToStaticMarkup(React.createElement(Page));
    assert.ok(html.includes(name));
    for (const other of names.filter((n) => n !== name))
      assert.equal(html.includes(other), false);
    assert.equal(html.includes("Javier Beiza"), false);
  }
});

test("Postgres: three professionals see only their own patients, appointments, questionnaires and comfort", async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE ROLE supabase_auth_admin;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;`);
    for (const name of fs
      .readdirSync("supabase/migrations")
      .filter((n) => n.endsWith(".sql"))
      .sort())
      await db.exec(fs.readFileSync("supabase/migrations/" + name, "utf8"));
    const doctors = [],
      codes = [],
      questionnaires = [];
    for (let i = 1; i <= 3; i++) {
      const user = (
        await db.query(
          "INSERT INTO auth.users VALUES(gen_random_uuid()) RETURNING id",
        )
      ).rows[0].id;
      const doctor = (
        await db.query(
          "INSERT INTO public.doctores(nombre,email,auth_user_id) VALUES($1,$2,$3) RETURNING id",
          [`Doctora de prueba ${i}`, `doctor${i}@example.invalid`, user],
        )
      ).rows[0].id;
      doctors.push(doctor);
      const q = (
        await db.query(
          "INSERT INTO public.cuestionarios_perfilamiento(motivo_consulta,nivel_temor,consentimiento_privacidad,draft_access_token) VALUES('Fixture','tranquilo',true,'PRIVATE_DRAFT') RETURNING id",
        )
      ).rows[0].id;
      questionnaires.push(q);
      await db.query(
        "INSERT INTO public.preferencias_confort(cuestionario_id,notas) VALUES($1,$2)",
        [q, `Private comfort ${i}`],
      );
      await db.query(
        "SELECT public.upsert_doctor_block($1,'2099-01-01',$2,'Disponible')",
        [doctor, `19:${String((i - 1) * 15).padStart(2, "0")}`],
      );
      const code = `doctor-fixture-${i}`;
      codes.push(code);
      await db.query(
        "SELECT public.reserve_orientation('2099-01-01',$1,$2,$3,'12345678',$4,$5,$6)",
        [
          `19:${String((i - 1) * 15).padStart(2, "0")}`,
          `Private patient ${i}`,
          `patient${i}@example.invalid`,
          code,
          String(i).repeat(64),
          q,
        ],
      );
    }
    // Unassigned historical records and unclaimed drafts belong to no doctor.
    await db.exec(`INSERT INTO public.cuestionarios_perfilamiento(motivo_consulta,nivel_temor) VALUES('Unclaimed','tranquilo');
      INSERT INTO public.orientaciones_citas(codigo,nombre_paciente,email_paciente,telefono_paciente,fecha,hora)
      VALUES('unassigned','Legacy','legacy@example.invalid','12345678','2099-02-01','19:00');`);
    await db.exec("SET ROLE service_role");
    for (let i = 0; i < 3; i++) {
      for (const resource of [
        "orientaciones",
        "pacientes",
        "cuestionarios",
        "confort",
      ]) {
        const rows = (
          await db.query("SELECT public.read_doctor_clinical($1,$2) data", [
            doctors[i],
            resource,
          ])
        ).rows[0].data;
        assert.equal(rows.length, 1, `${resource}: doctor ${i + 1}`);
        if (resource === "orientaciones") {
          assert.equal(rows[0].codigo, codes[i]);
          assert.equal(
            rows[0].cuestionarios_perfilamiento.id,
            questionnaires[i],
          );
          assert.equal("token_gestion" in rows[0], false);
          assert.equal(
            "draft_access_token" in rows[0].cuestionarios_perfilamiento,
            false,
          );
        }
        if (resource === "pacientes")
          assert.equal(rows[0].nombre_completo, `Private patient ${i + 1}`);
        if (resource === "cuestionarios")
          assert.equal(rows[0].id, questionnaires[i]);
        if (resource === "confort")
          assert.equal(rows[0].notas, `Private comfort ${i + 1}`);
      }
      const other = (i + 1) % 3;
      assert.deepEqual(
        (
          await db.query(
            "SELECT public.read_doctor_clinical($1,'orientaciones',$2) data",
            [doctors[i], codes[other]],
          )
        ).rows[0].data,
        [],
      );
      for (const action of ["estado", "derivacion", "cancelar", "reprogramar"])
        await assert.rejects(
          db.query(
            "SELECT public.manage_orientation($1,NULL,$2,$3,'2099-01-01','19:45','Realizada')",
            [codes[other], doctors[i], action],
          ),
        );
    }
    await assert.rejects(
      db.query(
        "SELECT public.upsert_doctor_block($1,'2099-01-01','19:00','Bloqueado')",
        [doctors[1]],
      ),
    );
    await db.query("SELECT public.set_date_block('2099-01-01',$1,true)", [
      doctors[0],
    ]);
    await db.query("SELECT public.set_date_block('2099-01-01',$1,false)", [
      doctors[1],
    ]);
    assert.equal(
      (
        await db.query(
          "SELECT count(*)::int n FROM public.fechas_bloqueadas WHERE doctor_id=$1",
          [doctors[0]],
        )
      ).rows[0].n,
      1,
    );
    await db.query(
      "SELECT public.upsert_doctor_block($1,'2099-01-01','19:45','Disponible')",
      [doctors[1]],
    );
    await db.query(
      "SELECT public.reserve_orientation('2099-01-01','19:45','Other patient','other@example.invalid','12345678','not-blocked-for-b',repeat('f',64))",
    );
    // A doctor's date block does not block another doctor's reservation.
    await assert.rejects(
      db.query(
        "SELECT public.manage_orientation($1,$2,$3,'estado',NULL,NULL,'Realizada')",
        [codes[0], "1".repeat(64), doctors[1]],
      ),
    );
    await db.exec("RESET ROLE");
    const owner = (
      await db.query(
        "SELECT r.rolname,r.rolbypassrls,r.rolcanlogin FROM pg_proc p JOIN pg_roles r ON r.oid=p.proowner WHERE p.oid='public.read_doctor_clinical(uuid,text,text)'::regprocedure",
      )
    ).rows[0];
    assert.equal(owner.rolname, "cado_clinical_reader");
    assert.equal(owner.rolbypassrls, false);
    assert.equal(owner.rolcanlogin, false);
    // Direct SQL without a WHERE still obeys ownership RLS in the gateway role.
    await db.exec("SET ROLE cado_clinical_reader");
    await db.query("SELECT set_config('cado.doctor_id',$1,false)", [
      doctors[0],
    ]);
    for (const table of [
      "pacientes",
      "orientaciones_citas",
      "cuestionarios_perfilamiento",
      "preferencias_confort",
    ])
      assert.equal(
        (await db.query(`SELECT count(*)::int n FROM public.${table}`)).rows[0]
          .n,
        1,
        table,
      );
    await assert.rejects(
      db.query("SELECT * FROM public.doctor_google_credentials"),
    );
    await assert.rejects(
      db.query("UPDATE public.pacientes SET nombre_completo='forbidden'"),
    );
    await db.exec("RESET ROLE; SET ROLE authenticated");
    await assert.rejects(
      db.query("SELECT public.read_doctor_clinical($1,'pacientes')", [
        doctors[0],
      ]),
    );
    await assert.rejects(db.query("SELECT * FROM public.pacientes"));
    await db.exec("RESET ROLE; SET ROLE anon");
    await assert.rejects(
      db.query("SELECT public.read_doctor_clinical($1,'pacientes')", [
        doctors[0],
      ]),
    );
  } finally {
    await db.close();
  }
});

for (const [route, resource] of [
  ["orientaciones", "orientaciones"],
  ["cuestionario", "cuestionarios"],
  ["confort", "confort"],
  ["pacientes", "pacientes"],
])
  test(`API ${route}: ignores another doctor ID supplied by the client`, async () => {
    let received;
    const api = loadTs(`src/app/api/${route}/route.ts`, {
      "@/lib/doctor-auth": {
        requireDoctor: async () => ({ doctor: { id: "verified-doctor" } }),
        privateJson: (v) => Response.json(v),
        accessFailure: () => new Response(null, { status: 503 }),
      },
      "@/lib/doctor-records": {
        readDoctorRecords: async (...args) => {
          received = args;
          return [{ id: "own-fixture" }];
        },
      },
    });
    const res = await api.GET(
      new NextRequest(
        "https://cado.example/api/" + route + "?doctor_id=someone-else",
      ),
    );
    assert.equal(res.status, 200);
    assert.equal(received[0], "verified-doctor");
    assert.equal(received[1], resource);
  });

test("Manual calendar retries select only the verified doctor; scheduler excludes unassigned rows", async () => {
  for (const scheduler of [false, true]) {
    const db = database(() => ({ data: [], error: null }));
    const api = loadTs(
      "src/app/api/internal/calendar-sync/route.ts",
      {
        "@/lib/server-db": { getServerDatabase: () => db },
        "@/lib/doctor-auth": {
          requireDoctor: async () => ({ doctor: { id: "verified-doctor" } }),
          privateJson: (v) => Response.json(v),
          accessFailure: () => new Response(null, { status: 503 }),
        },
        "@/lib/calendar-sync": { synchronizeAppointment: async () => {} },
      },
      { CRON_SECRET: "test-only-secret" },
    );
    await api.POST(
      new NextRequest("https://cado.example/api/internal/calendar-sync", {
        method: "POST",
        headers: scheduler ? { authorization: "Bearer test-only-secret" } : {},
      }),
    );
    assert.ok(
      db.calls[0].filters.some((f) =>
        scheduler
          ? f[0] === "not" && f[1] === "doctor_id"
          : f[0] === "eq" && f[1] === "doctor_id" && f[2] === "verified-doctor",
      ),
    );
  }
});

test("Google never uses another professional calendar when no doctor is assigned", async () => {
  const api = loadTs(
    "src/lib/google-calendar.ts",
    {
      "@/lib/google-tokens-store": {
        getDoctorGoogleCredentials: async () => {
          throw Error("Must not fetch another professional");
        },
        getAllConnectedDoctorTokens: async () => {
          throw Error("Must not enumerate calendars");
        },
      },
    },
    { GOOGLE_CLIENT_ID: "fake" },
  );
  const result = await api.createGoogleAppointmentEvent({
    codigo: "fixture",
    fecha: "2099-01-01",
    hora: "19:00",
    patientName: "Fixture",
  });
  assert.equal(result.eventId, null);
  assert.equal(result.meetLink, "");
  assert.equal(result.status, "Pendiente_Reintento");
});

test("Agenda changes use the verified doctor, ignoring a forged doctor ID", async () => {
  let received;
  const api = loadTs("src/app/api/bloques/route.ts", {
    "@/lib/server-db": {
      getServerDatabase: () => ({
        rpc: async (name, args) => {
          received = { name, args };
          return { data: { id: "fixture" }, error: null };
        },
      }),
    },
    "@/lib/doctor-auth": {
      requireDoctor: async () => ({ doctor: { id: "verified-doctor" } }),
      privateJson: (v) => Response.json(v),
      accessFailure: () => new Response(null, { status: 503 }),
    },
  });
  const response = await api.POST(
    new NextRequest("https://cado.example/api/bloques", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fecha: "2099-01-01",
        horaInicio: "19:00",
        doctor_id: "another-doctor",
      }),
    }),
  );
  assert.equal(response.status, 200);
  assert.equal(received.name, "upsert_doctor_block");
  assert.equal(received.args.p_doctor, "verified-doctor");
});

test("Private agenda shows only the current doctor and a date block does not hide another doctor publicly", async () => {
  const db = database((s) => ({
    error: null,
    data:
      s.table === "doctores"
        ? [{ id: "doctor-a" }, { id: "doctor-b" }]
        : s.table === "bloques_disponibilidad"
          ? [
              {
                doctor_id: "doctor-a",
                fecha: "2099-01-01",
                hora_inicio: "19:00",
                hora_fin: "19:15",
              },
              {
                doctor_id: "doctor-b",
                fecha: "2099-01-01",
                hora_inicio: "19:15",
                hora_fin: "19:30",
              },
            ]
          : s.table === "fechas_bloqueadas"
            ? [{ doctor_id: "doctor-a", fecha: "2099-01-01" }]
            : [],
  }));
  const api = loadTs("src/app/api/bloques/route.ts", {
    "@/lib/server-db": { getServerDatabase: () => db },
    "@/lib/doctor-auth": {
      requireDoctor: async () => ({ doctor: { id: "doctor-a" } }),
      privateJson: (v) => Response.json(v),
      accessFailure: () => new Response(null, { status: 503 }),
    },
  });
  const own = await (
    await api.GET(
      new NextRequest(
        "https://cado.example/api/bloques?admin=1&doctor_id=doctor-b",
      ),
    )
  ).json();
  assert.equal(own.slots.length, 0);
  assert.deepEqual(own.blockedDates, ["2099-01-01"]);
  const publicRows = await (
    await api.GET(new NextRequest("https://cado.example/api/bloques"))
  ).json();
  assert.equal(publicRows.slots.length, 1);
  assert.equal(publicRows.slots[0].hora, "19:15");
});

test("Verified session profile reflects database name changes for each of three identities", async () => {
  const names = [
    "Dra. Antonia Fixture",
    "Dr. Bruno Fixture",
    "Dra. Camila Fixture",
  ];
  for (let i = 0; i < 3; i++) {
    let profile = {
      id: "doctor-" + i,
      nombre: names[i],
      email: "doctor" + i + "@example.invalid",
      auth_user_id: "user-" + i,
    };
    const db = database((state) => ({
      data: state.filters.some(
        (f) => f[0] === "eq" && f[1] === "auth_user_id" && f[2] === "user-" + i,
      )
        ? profile
        : null,
      error: null,
    }));
    db.auth = {
      getUser: async () => ({
        data: { user: { id: "user-" + i } },
        error: null,
      }),
    };
    const env = {
      NEXT_PUBLIC_SUPABASE_URL: "https://fixture.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "fake",
      CADO_SESSION_SECRET: "fixture-only-".repeat(4),
    };
    const auth = loadTs("src/lib/doctor-auth.ts", {}, env);
    const route = loadTs(
      "src/app/api/auth/session/route.ts",
      { "@supabase/supabase-js": { createClient: () => db } },
      env,
    );
    const cookie =
      "cado_doctor_session=" + auth.issueProfessionalSession("token-" + i);
    const first = await (
      await route.GET(
        new NextRequest("https://cado.example/api/auth/session", {
          headers: { cookie },
        }),
      )
    ).json();
    assert.equal(first.doctor.nombre, names[i]);
    profile = { ...profile, nombre: "Nombre actualizado " + i };
    const second = await (
      await route.GET(
        new NextRequest("https://cado.example/api/auth/session", {
          headers: { cookie },
        }),
      )
    ).json();
    assert.equal(second.doctor.nombre, "Nombre actualizado " + i);
  }
});
