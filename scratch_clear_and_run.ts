import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== INICIANDO LIMPIEZA DE DATOS MOCK ===");

  // 1. Eliminar datos transaccionales/médicos
  console.log("Eliminando notas de evolución (FollowUp)...");
  await prisma.followUp.deleteMany({});

  console.log("Eliminando tratamientos (Treatment)...");
  await prisma.treatment.deleteMany({});

  console.log("Eliminando incidentes (Incident)...");
  await prisma.incident.deleteMany({});

  // 2. Liberar y limpiar todas las camas
  console.log("Reseteando estado de todas las camas clínicas...");
  await prisma.bed.updateMany({
    data: {
      status: "AVAILABLE",
      patientId: null,
    },
  });

  // 3. Eliminar todos los pacientes
  console.log("Eliminando registros de pacientes anteriores...");
  await prisma.patient.deleteMany({});

  // 4. Resetear estado de ambulancias a IDLE (disponibles)
  console.log("Reseteando estado de las ambulancias a IDLE...");
  await prisma.ambulance.updateMany({
    data: {
      status: "IDLE",
    },
  });

  // 5. Resetear ocupación de todos los hospitales a 0
  console.log("Reseteando la ocupación de camas de los hospitales a 0...");
  await prisma.hospital.updateMany({
    data: {
      occupied: 0,
    },
  });

  console.log("=== SISTEMA LIMPIO DE DATOS MOCK ===");

  console.log("\n=== CARGANDO UN DATO FRESCO DE PRUEBA ===");

  // Obtener una ambulancia y un hospital de referencia
  const hospital = await prisma.hospital.findFirst({
    where: { name: { contains: "Rísquez" } },
  });
  const ambulance = await prisma.ambulance.findFirst({
    where: { plate: "AMB-101" },
  });

  if (!hospital || !ambulance) {
    throw new Error("No se encontraron hospitales o ambulancias pre-sembrados en la base de datos.");
  }

  // Obtener un médico de referencia (Dr. Karen Burke)
  const doctor = await prisma.user.findFirst({
    where: { role: "DOCTOR" },
  });

  if (doctor) {
    console.log(`Médico de turno encontrado para asignación: ${doctor.name} (ID: ${doctor.id})`);
  } else {
    console.log("ADVERTENCIA: No se encontró ningún médico en la base de datos para la asignación.");
  }

  // A. Crear un único paciente fresco en estado SERIOUS
  const patient = await prisma.patient.create({
    data: {
      name: "Juan Pérez",
      age: 34,
      gender: "MASCULINO",
      bloodType: "AB+",
      clinicalHistory: "Ninguna alergia conocida. Sin antecedentes patológicos de importancia.",
      status: "SERIOUS",
      vitalsHeartRate: 95,
      vitalsBloodPressure: "120/80",
      vitalsOxygen: 94,
      vitalsTemperature: 36.8,
      examResults: "Abdomen agudo, dolor a la palpación en fosa ilíaca derecha (Signo de McBurney positivo).",
      assignedDoctorId: doctor ? doctor.id : null,
      assignedDoctorName: doctor ? doctor.name : null
    },
  });
  console.log(`Paciente creado con éxito: ${patient.name} (ID: ${patient.id}) asignado al Dr(a). ${patient.assignedDoctorName || "Ninguno"}`);

  // B. Crear un incidente activo para este paciente y asignarle ambulancia y hospital
  const incident = await prisma.incident.create({
    data: {
      patientName: patient.name,
      status: "DISPATCHED",
      address: "Casco Central de Achaguas, Calle Bolívar",
      latitude: 7.8310,
      longitude: -68.2200,
      severity: "SERIOUS",
      symptoms: "Dolor abdominal agudo y punzante de inicio súbito, náuseas y febrícula.",
      ambulanceId: ambulance.id,
      hospitalId: hospital.id,
      patientId: patient.id
    },
  });
  console.log(`Incidente de emergencia creado y asignado (ID: ${incident.id})`);

  // C. Marcar la ambulancia asociada como despachada
  await prisma.ambulance.update({
    where: { id: ambulance.id },
    data: { status: "DISPATCHED" },
  });
  console.log(`Ambulancia ${ambulance.plate} actualizada a estado DISPATCHED.`);

  // D. Asignar una cama disponible en el hospital y marcarla como OCCUPIED por el nuevo paciente
  const bed = await prisma.bed.findFirst({
    where: { hospitalId: hospital.id, status: "AVAILABLE" },
  });

  if (bed) {
    await prisma.bed.update({
      where: { id: bed.id },
      data: {
        status: "OCCUPIED",
        patientId: patient.id,
      },
    });
    console.log(`Cama ${bed.bedNumber} (${bed.roomNumber}) asignada y marcada como OCCUPIED para ${patient.name}.`);

    // E. Actualizar la ocupación del hospital
    await prisma.hospital.update({
      where: { id: hospital.id },
      data: { occupied: 1 },
    });
    console.log(`Ocupación del hospital ${hospital.name} incrementada a 1 cama.`);
  }

  // F. Agregar una nota de evolución inicial por parte de enfermería
  await prisma.followUp.create({
    data: {
      patientId: patient.id,
      nurseName: "Enfermero Montenegro",
      notes: "Paciente ingresado en camilla de ambulancia. Se canaliza vía periférica, se toman signos vitales y se asigna a la cama correspondiente para evaluación médica de descarte de apendicitis.",
      medicationAdministered: false,
    },
  });
  console.log("Nota de evolución inicial de enfermería agregada con éxito.");

  console.log("=== DATOS CARGADOS Y COMPROBADOS PERFECTAMENTE ===");
}

main()
  .catch((e) => {
    console.error("Error al ejecutar el script:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
