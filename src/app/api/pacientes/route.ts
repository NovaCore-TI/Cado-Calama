import { NextRequest } from "next/server";
import { accessFailure, privateJson, requireDoctor } from "@/lib/doctor-auth";
import { readDoctorRecords } from "@/lib/doctor-records";

export async function GET(request: NextRequest) {
  try {
    const { doctor } = await requireDoctor(request);
    const data = await readDoctorRecords(doctor.id, "pacientes");
    return privateJson({ ok: true, data });
  } catch (error) {
    return accessFailure(error);
  }
}
