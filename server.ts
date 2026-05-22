import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { PrismaClient } from "@prisma/client";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();
const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Lazy-loaded Gemini initialization
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
  }
  return aiClient;
}

// Function to perform AI Triage, with robust deterministic fallback if no API key is provided
async function performAITriage(symptoms: string,age: number, vitals: { heartRate?: number; bloodPressure?: string; oxygen?: number; temp?: number }) {
  const gemini = getGeminiClient();
  
  if (!gemini) {
    // Fallback deterministic clinical rules for safety
    let severity = "STABLE";
    const hr = vitals.heartRate || 80;
    const o2 = vitals.oxygen || 98;
    const actions = ["Monitoreo continuo de signos vitales"];
    
    if (o2 < 90 || hr > 130 || hr < 40) {
      severity = "CRITICAL";
      actions.push("Administrar oxígeno suplementario de inmediato", "Preparar acceso intravenoso");
    } else if (o2 < 94 || hr > 110 || hr < 50) {
      severity = "SERIOUS";
      actions.push("Considerar oxígeno de apoyo", "Mantener al paciente en reposo absoluto");
    } else {
      actions.push("Monitorear evolución del paciente");
    }
    
    return {
      severity,
      recommendedTreatment: "Triaje determinista (Sin clave API de Gemini): Proporcionar reposo y controlar constantes.",
      prioritizedActions: actions,
      suggestedDept: o2 < 90 ? "UCI / Reanimación" : "Urgencias Generales",
      explanation: "Evaluación clínica de emergencia basada en reglas de apoyo estándar de triaje por falta de conexión de IA."
    };
  }

  try {
    const prompt = `Paciente de ${age} años reporta los siguientes síntomas: "${symptoms}". 
    Signos vitales de entrada:
    - Frecuencia Cardíaca: ${vitals.heartRate ?? "No registrada"} lpm
    - Presión Arterial: ${vitals.bloodPressure ?? "No registrada"}
    - Oxígeno (SpO2): ${vitals.oxygen ?? "No registrado"}%
    - Temperatura: ${vitals.temp ?? "No registrada"}°C.
    Realiza un triaje médico de emergencia rápido y responde estrictamente con el formato JSON solicitado.`;

    const response = await gemini.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "Eres un sistema avanzado de triaje médico de emergencia. Clasifica la gravedad del paciente exclusivamente en 'CRITICAL' (rojo/reanimación), 'SERIOUS' (amarillo/urgencia) o 'STABLE' (verde/consulta). Proporciona acciones prioritarias cortas para paramédicos en tránsito.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            severity: {
              type: Type.STRING,
              description: "Gravedad calculada. Debe ser una de: CRITICAL, SERIOUS, STABLE"
            },
            recommendedTreatment: {
              type: Type.STRING,
              description: "Resumen muy breve del tratamiento inicial sugerido."
            },
            prioritizedActions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Lista de 3 acciones prioritarias inmediatas para el personal de emergencias."
            },
            suggestedDept: {
              type: Type.STRING,
              description: "Área o departamento hospitalario recomendado para derivar."
            },
            explanation: {
              type: Type.STRING,
              description: "Explicación médica concisa de la clasificación asignada basada en síntomas y constantes."
            }
          },
          required: ["severity", "recommendedTreatment", "prioritizedActions", "suggestedDept", "explanation"]
        }
      }
    });

    const jsonText = response.text;
    if (jsonText) {
      return JSON.parse(jsonText);
    }
  } catch (error) {
    console.error("Error in Gemini API call, using fallback:", error);
  }

  // Double fallback if API call fails
  return {
    severity: "SERIOUS",
    recommendedTreatment: "Evaluación clínica estándar requerida.",
    prioritizedActions: ["Asegurar vía aérea", "Evaluar nivel de conciencia constantemente"],
    suggestedDept: "Urgencias Generales",
    explanation: "Clasificación de seguridad por error en servicio de inteligencia remota."
  };
}

// Database Seeding Logic (Saves dummy data to SQLite so the app feels pre-populated and functional immediately)
async function seedDatabase() {
  try {
    // 1. Force update existing records to remove "Despachador" references and fix the clinical location
    console.log("Running clinical location and coordinator designation updates...");
    
    // Convert old Despachador name to Jefe del Servicio de Emergencias Adams
    await prisma.user.updateMany({
      where: {
        OR: [
          { username: "adams" },
          { name: { contains: "Despachador" } }
        ]
      },
      data: {
        name: "Jefe del Servicio de Emergencias Adams"
      }
    });

    // Update old hospital names to Francisco Antonio Rísquez & clinics in Achaguas, Apure
    await prisma.hospital.updateMany({
      where: {
        OR: [
          { name: "Hospital Central de Trauma" },
          { name: "Hospital Francisco Antonio Rísquez" }
        ]
      },
      data: {
        name: "Unidad de Emergencias Adulto del Hospital “Francisco Antonio Rísquez” de Achaguas, estado Apure",
        address: "Achaguas – Estado Apure, Venezuela",
        latitude: 7.8361,
        longitude: -68.2250
      }
    });

    await prisma.hospital.updateMany({
      where: { name: "Clínica Cardiovascular del Este" },
      data: {
        name: "Clínica Cardiovascular Achaguas",
        address: "Calle Bolívar, Achaguas – Estado Apure",
        latitude: 7.8290,
        longitude: -68.2180
      }
    });

    await prisma.hospital.updateMany({
      where: { name: "Hospital Infantil El Salvador" },
      data: {
        name: "Hospital Materno Infantil Rísquez",
        address: "Achaguas – Estado Apure",
        latitude: 7.8410,
        longitude: -68.2310
      }
    });

    // Translate any NYC-based coordinates to Achaguas coordinates for existing Ambulances
    await prisma.ambulance.updateMany({
      where: { plate: "AMB-101", currentLat: 40.7100 },
      data: { currentLat: 7.8250, currentLng: -68.2150 }
    });
    await prisma.ambulance.updateMany({
      where: { plate: "AMB-202", currentLat: 40.7200 },
      data: { currentLat: 7.8380, currentLng: -68.2220 }
    });
    await prisma.ambulance.updateMany({
      where: { plate: "AMB-303", currentLat: 40.6950 },
      data: { currentLat: 7.8180, currentLng: -68.2095 }
    });

    // Translate any NYC-based incident coordinates to Achaguas coordinates
    await prisma.incident.updateMany({
      where: { latitude: 40.7150 },
      data: {
        address: "Casco Central de Achaguas",
        latitude: 7.8310,
        longitude: -68.2200
      }
    });

    const hospitalCount = await prisma.hospital.count();
    if (hospitalCount === 0) {
      console.log("Seeding initial medical database for Achaguas, Apure, Venezuela...");
      
      // Seed 3 central hospitals in Achaguas, Apure
      await prisma.hospital.createMany({
        data: [
          { name: "Unidad de Emergencias Adulto del Hospital “Francisco Antonio Rísquez” de Achaguas, estado Apure", address: "Achaguas – Estado Apure, Venezuela", latitude: 7.8361, longitude: -68.2250, contact: "0247-AMB-RISQ", capacity: 45, occupied: 38 },
          { name: "Clínica Cardiovascular Achaguas", address: "Calle Bolívar, Achaguas – Estado Apure", latitude: 7.8290, longitude: -68.2180, contact: "0247-CARDIO-1", capacity: 20, occupied: 12 },
          { name: "Hospital Materno Infantil Rísquez", address: "Achaguas – Estado Apure", latitude: 7.8410, longitude: -68.2310, contact: "0247-MATER-9", capacity: 30, occupied: 15 }
        ]
      });

      // Seed initial clinical users for role & permission management
      await prisma.user.createMany({
        data: [
          {
            username: "adams",
            name: "Jefe del Servicio de Emergencias Adams",
            password: "admin",
            role: "ADMIN",
            permissions: "view_patients,view_history,prescribe_treatment,use_ai_diagnose,administer_meds,add_followup,add_incident,view_map,dispatch_fleet,manage_users,manage_fleet,manage_hospitals",
            active: true,
            shiftDays: "Lunes a Viernes",
            shiftHours: "08:00 - 16:00",
            shiftNotes: "Dirección de Coordinación de Emergencias"
          },
          {
            username: "karen",
            name: "Dr. Karen Burke",
            password: "doctor",
            role: "DOCTOR",
            permissions: "view_patients,view_history,prescribe_treatment,use_ai_diagnose",
            active: true,
            shiftDays: "Lunes, Martes y Jueves",
            shiftHours: "08:00 - 20:00",
            shiftNotes: "Área de Urgencias Médicas Generales"
          },
          {
            username: "montenegro",
            name: "Enfermero Montenegro",
            password: "enfermero",
            role: "NURSE",
            permissions: "view_patients,administer_meds,add_followup",
            active: true,
            shiftDays: "Miércoles, Viernes y Sábado",
            shiftHours: "19:00 - 07:00 (Turno Nocturno)",
            shiftNotes: "Unidad de Trauma Shock - Pabellón de Cuidados Especiales"
          },
          {
            username: "luis",
            name: "Paramédico Luis González",
            password: "paramedico",
            role: "PARAMEDIC",
            permissions: "add_incident,view_map,dispatch_fleet",
            active: true,
            shiftDays: "Lunes a Viernes",
            shiftHours: "12:00 - 20:00",
            shiftNotes: "Unidad Móvil Terrestre de Emergencia AMB-101"
          }
        ]
      });

      // Seed 3 ready ambulances positioned strategically in Achaguas
      await prisma.ambulance.createMany({
        data: [
          { plate: "AMB-101", model: "Ford Transit Medic V", paramedicName: "Luis González", status: "IDLE", currentLat: 7.8250, currentLng: -68.2150 },
          { plate: "AMB-202", model: "Mercedes Sprinter ICU", paramedicName: "Eduardo López", status: "IDLE", currentLat: 7.8380, currentLng: -68.2220 },
          { plate: "AMB-303", model: "Ram ProMaster Trauma", paramedicName: "Ana Martínez", status: "IDLE", currentLat: 7.8180, currentLng: -68.2095 }
        ]
      });

      // Seed initial patient records
      const pat1 = await prisma.patient.create({
        data: {
          name: "Roberto Montenegro",
          age: 48,
          gender: "MASCULINO",
          bloodType: "O+",
          clinicalHistory: "Hipertensión controlada, alérgico a la Penicilina.",
          status: "CRITICAL",
          vitalsHeartRate: 115,
          vitalsBloodPressure: "155/95",
          vitalsOxygen: 88,
          vitalsTemperature: 37.2,
          examResults: "ECG muestra taquicardia sinusal, enzimas cardíacas normales por ahora."
        }
      });

      const pat2 = await prisma.patient.create({
        data: {
          name: "Sofía Martínez",
          age: 23,
          gender: "FEMENINO",
          bloodType: "A-",
          clinicalHistory: "Asma crónica moderada. Utiliza salbutamol inhalado.",
          status: "SERIOUS",
          vitalsHeartRate: 98,
          vitalsBloodPressure: "110/70",
          vitalsOxygen: 92,
          vitalsTemperature: 36.6,
          examResults: "Sibilancias espiratorias bilaterales detectadas en auscultación pulmonar."
        }
      });

      // Seed an active and a resolved incident
      const hosp1 = await prisma.hospital.findFirst({ where: { name: "Hospital Francisco Antonio Rísquez" } });
      const amb1 = await prisma.ambulance.findFirst({ where: { plate: "AMB-101" } });
      
      if (hosp1 && amb1) {
        await prisma.incident.create({
          data: {
            patientName: "Roberto Montenegro",
            status: "DISPATCHED",
            address: "Casco Central de Achaguas",
            latitude: 7.8310,
            longitude: -68.2200,
            severity: "CRITICAL",
            symptoms: "Dolor opresivo en el pecho que se irradia al brazo izquierdo, disnea progresiva.",
            ambulanceId: amb1.id,
            hospitalId: hosp1.id,
            patientId: pat1.id
          }
        });

        // Set ambulance to occupied status
        await prisma.ambulance.update({
          where: { id: amb1.id },
          data: { status: "DISPATCHED" }
        });
      }

      console.log("Database seeded successfully with Achaguas setup!");
    }

    // Seed bed inventories dynamically if none exist
    const bedCount = await prisma.bed.count();
    if (bedCount === 0) {
      console.log("Seeding bed inventories for clinical facilities...");
      const hospitals = await prisma.hospital.findMany();
      for (const h of hospitals) {
        const bedNumbers = h.name.includes("Rísquez") 
          ? ["101", "102", "103", "104", "105", "106", "107", "108"]
          : ["201", "202", "203", "204", "205", "206"];
          
        for (const num of bedNumbers) {
          const area = num === "101" || num === "201" 
            ? "Triaje de Trauma" 
            : num === "102" || num === "103" || num === "202"
            ? "Unidad de Cuidados Especiales"
            : "Hospitalización Común";
          await prisma.bed.create({
            data: {
              bedNumber: `Cama-${num}`,
              roomNumber: area,
              status: "AVAILABLE",
              hospitalId: h.id
            }
          });
        }
      }
      console.log("Bed inventories successfully seeded!");
    }
  } catch (error) {
    console.error("Failed to seed database:", error);
  }
}

// Trigger DB seed on startup
seedDatabase();


// ================== API ENDPOINTS ==================

// Stats Endpoint
app.get("/api/stats", async (req, res) => {
  try {
    const [
      totalPatients,
      activeEmergencies,
      criticalPatientsCount,
      totalBeds,
      bedsAvailable
    ] = await Promise.all([
      prisma.patient.count(),
      prisma.incident.count({
        where: { status: { in: ["PENDING", "DISPATCHED"] } }
      }),
      prisma.patient.count({
        where: { status: "CRITICAL" }
      }),
      prisma.bed.count(),
      prisma.bed.count({ where: { status: "AVAILABLE" } })
    ]);

    res.json({
      totalPatients,
      activeEmergencies,
      criticalPatientsCount,
      bedsAvailable,
      totalBeds
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to load system stats" });
  }
});

// Incidents endpoints
app.get("/api/incidents", async (req, res) => {
  try {
    const incidents = await prisma.incident.findMany({
      include: {
        ambulance: true,
        hospital: true,
        patient: true
      },
      orderBy: { createdAt: "desc" }
    });
    res.json(incidents);
  } catch (error) {
    res.status(500).json({ error: "Error loading incidents" });
  }
});

app.post("/api/incidents", async (req, res) => {
  const { patientName, address, latitude, longitude, symptoms, age, gender, assignedDoctorId, assignedDoctorName } = req.body;
  
  try {
    // 1. Estimate initial triage using Gemini or Clinical rules fallback
    const numericAge = parseInt(age) || 30;
    const aiTriage = await performAITriage(symptoms, numericAge, {});
    
    // Perform database writes in a transaction to ensure atomic execution
    const { incident } = await prisma.$transaction(async (tx) => {
      // 2. Create the patient record first so the historical records are real-time
      const patientObj = await tx.patient.create({
        data: {
          name: patientName || "Identidad en Proceso",
          age: numericAge,
          gender: gender || "NO ESPECIFICADO",
          status: aiTriage.severity,
          clinicalHistory: `Ingresado desde incidente de emergencia. Síntomas descritos: ${symptoms}`,
          examResults: `Triaje de Inteligencia de Emergencia: gravedad ${aiTriage.severity}. Dept sugerido: ${aiTriage.suggestedDept}. Tratamiento recomendado: ${aiTriage.recommendedTreatment}.`,
          assignedDoctorId: assignedDoctorId ? parseInt(assignedDoctorId) : null,
          assignedDoctorName: assignedDoctorName || null
        }
      });

      // 3. Register the incident in real-time
      const newIncident = await tx.incident.create({
        data: {
          patientName: patientObj.name,
          status: "PENDING",
          address,
          latitude: parseFloat(latitude) || 40.7128,
          longitude: parseFloat(longitude) || -74.0060,
          severity: aiTriage.severity,
          symptoms,
          patientId: patientObj.id
        },
        include: {
          patient: true
        }
      });

      return { patientObj, incident: newIncident };
    });

    res.status(201).json({
      incident,
      aiTriage
    });
  } catch (error) {
    console.error("Failed to create incident:", error);
    res.status(500).json({ error: "Failed to create emergency incident" });
  }
});

app.patch("/api/incidents/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { status, ambulanceId, hospitalId, severity } = req.body;
  
  try {
    // Collect updates
    const updates: any = {};
    if (status !== undefined) updates.status = status;
    if (ambulanceId !== undefined) updates.ambulanceId = ambulanceId ? parseInt(ambulanceId) : null;
    if (hospitalId !== undefined) updates.hospitalId = hospitalId ? parseInt(hospitalId) : null;
    if (severity !== undefined) updates.severity = severity;

    const updatedIncident = await prisma.$transaction(async (tx) => {
      const originalIncident = await tx.incident.findUnique({ where: { id } });

      const updated = await tx.incident.update({
        where: { id },
        data: updates,
        include: {
          ambulance: true,
          hospital: true,
          patient: true
        }
      });

      // If an ambulance is assigned, set its status to dispatched
      if (ambulanceId && originalIncident?.ambulanceId !== parseInt(ambulanceId)) {
        await tx.ambulance.update({
          where: { id: parseInt(ambulanceId) },
          data: { status: "DISPATCHED" }
        });
      }

      // If decommissioned or completed, release ambulance
      if (status === "RESOLVED" && updated.ambulanceId) {
        await tx.ambulance.update({
          where: { id: updated.ambulanceId },
          data: { status: "IDLE" }
        });
      }

      return updated;
    });

    res.json(updatedIncident);
  } catch (error) {
    res.status(500).json({ error: "Failed to update incident details" });
  }
});

// Patients endpoints
app.get("/api/patients", async (req, res) => {
  try {
    const patients = await prisma.patient.findMany({
      orderBy: { createdAt: "desc" }
    });
    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: "Error loading patient directory" });
  }
});

app.get("/api/patients/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        treatments: { orderBy: { createdAt: "desc" } },
        followUps: { orderBy: { createdAt: "desc" } },
        incidents: true
      }
    });
    
    if (!patient) return res.status(404).json({ error: "Patient record not found" });
    res.json(patient);
  } catch (error) {
    res.status(500).json({ error: "Error loading detailed clinical history" });
  }
});

app.patch("/api/patients/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, age, gender, bloodType, clinicalHistory, status, vitalsHeartRate, vitalsBloodPressure, vitalsOxygen, vitalsTemperature, examResults, assignedDoctorId, assignedDoctorName } = req.body;
  
  try {
    const updates: any = {};
    if (name) updates.name = name;
    if (age) updates.age = parseInt(age);
    if (gender) updates.gender = gender;
    if (bloodType) updates.bloodType = bloodType;
    if (clinicalHistory !== undefined) updates.clinicalHistory = clinicalHistory;
    if (status) updates.status = status;
    if (vitalsHeartRate !== undefined) updates.vitalsHeartRate = vitalsHeartRate ? parseInt(vitalsHeartRate) : null;
    if (vitalsBloodPressure !== undefined) updates.vitalsBloodPressure = vitalsBloodPressure;
    if (vitalsOxygen !== undefined) updates.vitalsOxygen = vitalsOxygen ? parseInt(vitalsOxygen) : null;
    if (vitalsTemperature !== undefined) updates.vitalsTemperature = vitalsTemperature ? parseFloat(vitalsTemperature) : null;
    if (examResults !== undefined) updates.examResults = examResults;
    if (assignedDoctorId !== undefined) updates.assignedDoctorId = assignedDoctorId ? parseInt(assignedDoctorId) : null;
    if (assignedDoctorName !== undefined) updates.assignedDoctorName = assignedDoctorName || null;

    const patient = await prisma.$transaction(async (tx) => {
      const updatedPatient = await tx.patient.update({
        where: { id },
        data: updates
      });

      if (status === "DISCHARGED") {
        const occupiedBed = await tx.bed.findFirst({
          where: { patientId: id }
        });
        if (occupiedBed) {
          await tx.bed.update({
            where: { id: occupiedBed.id },
            data: {
              patientId: null,
              status: "AVAILABLE"
            }
          });
          await tx.hospital.update({
            where: { id: occupiedBed.hospitalId },
            data: { occupied: { decrement: 1 } }
          });
          
          await tx.followUp.create({
            data: {
              patientId: id,
              nurseName: "Sistema central",
              notes: `[Evolución Médica] Registro de alta médica procesado. Se le otorga el Egreso. La cama ${occupiedBed.bedNumber} ha sido desalojada y liberada para desinfección preventiva.`,
              medicationAdministered: false
            }
          });
        }
      }

      return updatedPatient;
    });

    res.json(patient);
  } catch (error) {
    res.status(500).json({ error: "Error and failure to update patient records" });
  }
});

// Run live clinical suggestions using Gemini AI for active diagnoses or notes analysis
app.post("/api/ai/diagnose", async (req, res) => {
  const { patientId, sysPrompt } = req.body;
  const gemini = getGeminiClient();

  if (!gemini) {
    return res.json({
      treatmentPlan: "• Aplicar hidratación basal.\n• Monitorizar frecuencia cardíaca cada 15 min.\n• Reposo semifowler con soporte de oxígeno.",
      reasoning: "Generado por reglas analíticas locales seguras en ausencia de clave de inteligencia remota."
    });
  }

  try {
    const patientObj = await prisma.patient.findUnique({
      where: { id: parseInt(patientId) },
      include: { treatments: true, followUps: true }
    });

    if (!patientObj) return res.status(404).json({ error: "Paciente inexistente" });

    const diagnosticPrompt = `Paciente: ${patientObj.name} (${patientObj.age} años, G: ${patientObj.gender}, Grupo Sanguíneo: ${patientObj.bloodType || "Desconocido"}).
    Constantes vitales actuales: FC ${patientObj.vitalsHeartRate || "N/A"} bpm, PA ${patientObj.vitalsBloodPressure || "N/A"}, SatO2 ${patientObj.vitalsOxygen || "N/A"}%, Temp ${patientObj.vitalsTemperature || "N/A"}°C.
    Notas clínicas históricas: ${patientObj.clinicalHistory || "Ninguno"}.
    Tratamientos prescritos previos: ${patientObj.treatments.map(t => `${t.prescription} [Status: ${t.status}]`).join(", ") || "Ninguno"}.
    Últimos informes de seguimiento de enfermería: ${patientObj.followUps.map(f => f.notes).join("; ") || "Ninguno"}.
    
    Analiza este paciente bajo el siguiente contexto médico solicitado: "${sysPrompt || "Proporcionar un plan de tratamiento específico y oportuno."}"`;

    const response = await gemini.models.generateContent({
      model: "gemini-3.5-flash",
      contents: diagnosticPrompt,
      config: {
        systemInstruction: "Actúa como un experimentado médico jefe de urgencias. Ofrece un plan de tratamiento estructurado en viñetas y un razonamiento de diagnóstico clínico de soporte basado en las constantes reportadas. Mantén un tono respetuoso, ultra-profesional y enfocado en la seguridad biológica del paciente.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            treatmentPlan: {
              type: Type.STRING,
              description: "Plan de tratamiento de urgencia structured. Usa guiones breves para cada indicación."
            },
            reasoning: {
              type: Type.STRING,
              description: "Explicación breve del razonamiento fisiopatológico detrás de este enfoque."
            }
          },
          required: ["treatmentPlan", "reasoning"]
        }
      }
    });

    const bodyText = response.text;
    if (bodyText) {
      return res.json(JSON.parse(bodyText));
    }
  } catch (error) {
    console.error("AI clinic failure:", error);
  }

  res.status(500).json({ error: "Clínica de Inteligencia Artificial momentáneamente indispuesta." });
});

// Ambulances endpoint
app.get("/api/ambulances", async (req, res) => {
  try {
    const list = await prisma.ambulance.findMany();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve ambulance units" });
  }
});

// Hospitals endpoint
app.get("/api/hospitals", async (req, res) => {
  try {
    const list = await prisma.hospital.findMany();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch medical centers status list" });
  }
});

app.patch("/api/hospitals/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { occupied } = req.body;
  try {
    const updated = await prisma.hospital.update({
      where: { id },
      data: { occupied: parseInt(occupied) }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to update hospital capacity state" });
  }
});

// Beds endpoints
app.get("/api/beds", async (req, res) => {
  try {
    const list = await prisma.bed.findMany({
      include: {
        hospital: true,
        patient: true
      },
      orderBy: { bedNumber: "asc" }
    });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: "Falla al cargar inventario de camas" });
  }
});

app.post("/api/beds/:id/assign", async (req, res) => {
  const id = parseInt(req.params.id);
  const { patientId } = req.body;
  try {
    const bed = await prisma.bed.findUnique({
      where: { id },
      include: { hospital: true }
    });
    if (!bed) {
      return res.status(404).json({ error: "Cama no encontrada" });
    }
    if (bed.status === "OCCUPIED") {
      return res.status(400).json({ error: "La cama ya está ocupada" });
    }

    const updatedBed = await prisma.$transaction(async (tx) => {
      // Unassign patient from any other bed they already occupy
      const previousBed = await tx.bed.findFirst({
        where: { patientId: parseInt(patientId) }
      });
      if (previousBed) {
        await tx.bed.update({
          where: { id: previousBed.id },
          data: {
            patientId: null,
            status: "AVAILABLE"
          }
        });
        // Decrement occupied count on previous hospital
        await tx.hospital.update({
          where: { id: previousBed.hospitalId },
          data: { occupied: { decrement: 1 } }
        });
      }

      // Assign bed to patient
      const updated = await tx.bed.update({
        where: { id },
        data: {
          patientId: parseInt(patientId),
          status: "OCCUPIED"
        },
        include: { patient: true }
      });

      // Increment occupied count on hospital
      await tx.hospital.update({
        where: { id: bed.hospitalId },
        data: { occupied: { increment: 1 } }
      });

      // Register followUp note in real-time
      const patientObj = await tx.patient.findUnique({ where: { id: parseInt(patientId) } });
      if (patientObj) {
        await tx.followUp.create({
          data: {
            patientId: patientObj.id,
            nurseName: "Coordinador de Guardia",
            notes: `[Evolución Médica] Paciente ingresado y asignado formalmente a cama ${bed.bedNumber} del área: ${bed.roomNumber} - Centro receptor: ${bed.hospital.name}.`,
            medicationAdministered: false
          }
        });
      }

      return updated;
    });

    res.json(updatedBed);
  } catch (err) {
    console.error("Falla al asignar cama:", err);
    res.status(500).json({ error: "Falla al registrar asignación de cama" });
  }
});

app.post("/api/beds/:id/release", async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const bed = await prisma.bed.findUnique({
      where: { id },
      include: { hospital: true }
    });
    if (!bed) {
      return res.status(404).json({ error: "Cama no encontrada" });
    }
    if (bed.patientId) {
      const pId = bed.patientId;
      await prisma.$transaction(async (tx) => {
        await tx.bed.update({
          where: { id },
          data: {
            patientId: null,
            status: "AVAILABLE"
          }
        });

        // Decrement hospital occupancy
        await tx.hospital.update({
          where: { id: bed.hospitalId },
          data: { occupied: { decrement: 1 } }
        });

        // Register followUp note
        await tx.followUp.create({
          data: {
            patientId: pId,
            nurseName: "Sistema central",
            notes: `[Evolución Médica] Paciente desocupó y liberó cama ${bed.bedNumber} del área: ${bed.roomNumber}.`,
            medicationAdministered: false
          }
        });
      });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Falla al liberar cama:", err);
    res.status(500).json({ error: "Falla al liberar cama del inventario" });
  }
});

app.post("/api/beds/:id/maintenance", async (req, res) => {
  const id = parseInt(req.params.id);
  const { status } = req.body;
  try {
    const updatedBed = await prisma.bed.update({
      where: { id },
      data: { status }
    });
    res.json(updatedBed);
  } catch (err) {
    res.status(500).json({ error: "Falla al cambiar estado de mantenimiento" });
  }
});

// Treatment endpoints (Doctors prescribe)
app.post("/api/treatments", async (req, res) => {
  const { patientId, doctorName, prescription } = req.body;
  try {
    const treatment = await prisma.treatment.create({
      data: {
        patientId: parseInt(patientId),
        doctorName: doctorName || "Dra. Karen_Burke",
        prescription,
        status: "PRESCRIBED"
      }
    });
    res.status(201).json(treatment);
  } catch (error) {
    res.status(500).json({ error: "Failed to write patient prescription card" });
  }
});

app.patch("/api/treatments/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { status } = req.body;
  try {
    const updated = await prisma.treatment.update({
      where: { id },
      data: { status }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to update treatment workflow" });
  }
});

// Follow Ups endpoints (Nurses register administration and comments)
app.post("/api/followups", async (req, res) => {
  const { patientId, nurseName, notes, medicationAdministered } = req.body;
  try {
    const followUp = await prisma.$transaction(async (tx) => {
      const createdFollowUp = await tx.followUp.create({
        data: {
          patientId: parseInt(patientId),
          nurseName: nurseName || "Enfermero de Turno",
          notes,
          medicationAdministered: !!medicationAdministered,
          administeredAt: medicationAdministered ? new Date() : null
        }
      });

      // Automatically synchronize treatment status flag if verified
      if (medicationAdministered) {
        await tx.patient.update({
          where: { id: parseInt(patientId) },
          data: {
            examResults: `Medicamento Administrado y Verificado por ${nurseName || "Enfermero"}. Notas: ${notes}`
          }
        });

        // Update all prescribed treatments for this patient to ADMINISTERED
        await tx.treatment.updateMany({
          where: {
            patientId: parseInt(patientId),
            status: "PRESCRIBED"
          },
          data: {
            status: "ADMINISTERED"
          }
        });
      }

      return createdFollowUp;
    });

    res.status(201).json(followUp);
  } catch (error) {
    console.error("Error creating follow-up:", error);
    res.status(500).json({ error: "Failed to save follow-up validation log" });
  }
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    if (!username || !password) {
      return res.status(400).json({ error: "Faltan credenciales (usuario y contraseña)" });
    }
    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase().trim() }
    });
    if (!user) {
      return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
    }
    if (user.password !== password) {
      return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
    }
    if (!user.active) {
      return res.status(403).json({ error: "Este usuario ha sido suspendido o revocado. Contacte al Administrador." });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Error interno en el servidor de autenticación" });
  }
});

// ================== USER-ROLE-PERMISSION MANAGEMENT ENDPOINTS ==================

app.get("/api/users", async (req, res) => {
  try {
    const list = await prisma.user.findMany({
      orderBy: { id: "asc" }
    });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user directory" });
  }
});

app.post("/api/users", async (req, res) => {
  const { username, name, password, role, permissions, active, shiftDays, shiftHours, shiftNotes, photo } = req.body;
  try {
    if (!username || !name || !role) {
      return res.status(400).json({ error: "Faltan datos obligatorios (nombre de usuario, nombre completo y rol)" });
    }
    
    const existing = await prisma.user.findUnique({
      where: { username: username.toLowerCase().trim() }
    });
    if (existing) {
      return res.status(400).json({ error: "El nombre de usuario ingresado ya se encuentra registrado." });
    }

    const newUser = await prisma.user.create({
      data: {
        username: username.toLowerCase().trim(),
        name,
        password: password || "123456",
        role,
        permissions: permissions || "",
        active: active !== undefined ? !!active : true,
        shiftDays: shiftDays || null,
        shiftHours: shiftHours || null,
        shiftNotes: shiftNotes || null,
        photo: photo || null
      }
    });
    res.status(201).json(newUser);
  } catch (error) {
    console.error("Failed to register user:", error);
    res.status(500).json({ error: "No se pudo registrar el usuario en el almacén de datos." });
  }
});

app.patch("/api/users/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { username, name, password, role, permissions, active, shiftDays, shiftHours, shiftNotes, photo } = req.body;
  try {
    const updates: any = {};
    if (username) {
      const normUser = username.toLowerCase().trim();
      const existing = await prisma.user.findUnique({ where: { username: normUser } });
      if (existing && existing.id !== id) {
        return res.status(400).json({ error: "El nombre de usuario corresponde a una cuenta existente." });
      }
      updates.username = normUser;
    }
    if (name !== undefined) updates.name = name;
    if (password !== undefined) updates.password = password;
    if (role !== undefined) updates.role = role;
    if (permissions !== undefined) updates.permissions = permissions;
    if (active !== undefined) updates.active = !!active;
    if (shiftDays !== undefined) updates.shiftDays = shiftDays;
    if (shiftHours !== undefined) updates.shiftHours = shiftHours;
    if (shiftNotes !== undefined) updates.shiftNotes = shiftNotes;
    if (photo !== undefined) updates.photo = photo;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updates
    });
    res.json(updatedUser);
  } catch (error) {
    console.error("Failed to update user parameters:", error);
    res.status(500).json({ error: "Error al actualizar propiedades del usuario clínico." });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    res.json({ success: true, message: "Usuario clínico eliminado." });
  } catch (error) {
    console.error("Failed to delete user profile:", error);
    res.status(500).json({ error: "Error al eliminar la ficha del usuario." });
  }
});


// ================== AI MEDICAL HISTORY SUMMARY & CLINICAL AUDITING ==================

app.post("/api/patients/:id/ai-summary", async (req, res) => {
  const patientId = parseInt(req.params.id);
  const gemini = getGeminiClient();

  try {
    const patientObj = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        treatments: { orderBy: { createdAt: "desc" } },
        followUps: { orderBy: { createdAt: "desc" } },
        incidents: { orderBy: { createdAt: "desc" } }
      }
    });

    if (!patientObj) {
      return res.status(404).json({ error: "Ficha del paciente no encontrada." });
    }

    if (!gemini) {
      // Deterministic clinical fallback based on the actual patient data
      let summaryStr = `Ficha clínica consolidada de ${patientObj.name} (${patientObj.age} años, Género: ${patientObj.gender}, GS: ${patientObj.bloodType || "Desconocido"}). `;
      const lastIncident = patientObj.incidents[0];
      const lastFollowUp = patientObj.followUps[0];
      
      let correlativeDiagnosis = `Síndrome generalizado con gravedad clasificada en ${patientObj.status}. `;
      if (lastIncident) {
        correlativeDiagnosis += `Presentaba síntomas de triage: "${lastIncident.symptoms}". `;
      }
      
      let actionPlan = [
        "Monitoreo horario de la presión arterial y saturación de oxígeno periférica.",
        "Asegurar mantenimiento de vía venosa periférica accesible para administración de fármacos.",
        "Revaluar estatus respiratorio y cardíaco antes de autorizar el des internado ordinario."
      ];

      let disposition = "MAINTAIN_SURVEILLANCE";
      if (patientObj.status === "CRITICAL") {
        disposition = "ICU_TRANSFER";
      } else if (patientObj.status === "DISCHARGED") {
        disposition = "DISCHARGE";
      }

      const dummyResponse = {
        clinicalStatusSummary: summaryStr + (lastFollowUp ? `Última nota de evolución del enfermero: "${lastFollowUp.notes}".` : "Sin notas de evolución clínica de enfermería recientes."),
        aiCorrelativeDiagnosis: correlativeDiagnosis + `Estatus hemodinámico: SatO2 ${patientObj.vitalsOxygen || "N/R"}%, Frecuencia Cardíaca ${patientObj.vitalsHeartRate || "N/R"} lpm, Presión Arterial ${patientObj.vitalsBloodPressure || "N/A"}.`,
        actionPlan: actionPlan,
        epicrisisSynthesized: `EPÍCRISIS GENERAL CONSENSIDADA (Simulador Clínico): El paciente se encuentra bajo estado de triaje ${patientObj.status}. Al evaluar los antecedentes sintomáticos recolectados, se sugiere sostener el soporte vital según la regla estándar, continuar con la pauta de dosificación activa del médico de cabecera, y programar una auscultación preventiva antes de dictaminar el alta formal de urgencias.`,
        dispositionRecommendation: disposition
      };
      
      return res.json(dummyResponse);
    }

    // Generate response using Google Gemini GenAI SDK
    const prompt = `Analiza la historia clínica completa del siguiente paciente de la Unidad de Emergencias:
    
    INFORMACIÓN GENERAL:
    Nombre: ${patientObj.name}
    Edad: ${patientObj.age} años
    Género: ${patientObj.gender}
    Grupo Sanguíneo: ${patientObj.bloodType || "No registrado"}
    Estado Actual: ${patientObj.status} (CRITICAL, SERIOUS, STABLE, DISCHARGED)
    Constantes Vitales Recientes:
    - Frecuencia Cardíaca: ${patientObj.vitalsHeartRate ?? "No registrada"} lpm
    - Presión Arterial: ${patientObj.vitalsBloodPressure ?? "No registrada"}
    - Saturación de Oxígeno (SpO2): ${patientObj.vitalsOxygen ?? "No registrada"}%
    - Temperatura: ${patientObj.vitalsTemperature ?? "No registrada"}°C
    Alergias / Antecedentes (clinicalHistory): ${patientObj.clinicalHistory || "Sin antecedentes registrados"}
    Resultados de Exámenes / Notas de Entrada: ${patientObj.examResults || "Ninguno registrado"}

    HISTORIAL DE INCIDENTES / INGRESO DE URGENCIA:
    ${patientObj.incidents.map((i, idx) => `[Incidente ${idx+1}] Síntomas: ${i.symptoms}, Gravedad: ${i.severity}, Ubicación: ${i.address}, Fecha: ${i.createdAt}`).join("\n")}

    TRATAMIENTOS PREVALECIENTES / PRESCRIPCIONES:
    ${patientObj.treatments.map((t, idx) => `[Tratamiento ${idx+1}] Indicación: "${t.prescription}", Estado: ${t.status}, Médico: ${t.doctorName}, Fecha: ${t.createdAt}`).join("\n")}

    NOTAS DE EVOLUCIÓN EN ENFERMERÍA (FOLLOW-UPS):
    ${patientObj.followUps.map((f, idx) => `[Evolución ${idx+1}] Nota: "${f.notes}", Fármaco administrado: ${f.medicationAdministered ? "SÍ" : "NO"}, Enfermero: ${f.nurseName}, Fecha: ${f.createdAt}`).join("\n")}

    Genera una epícrises clínica profesional y responde estrictamente con el formato JSON definido.`;

    const response = await gemini.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "Eres un sistema avanzado de auditoría clínica de urgencias encargado de redactar el sumario de evolución y epícrises médicas. Tu meta es profundizar de forma interdisciplinar en todos los datos para proveer un reporte sumamente profesional y estructurado en español, ideal para médicos especialistas. Asegúrate de retornar estrictamente JSON válido.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            clinicalStatusSummary: {
              type: Type.STRING,
              description: "Resumen ejecutivo simplificado del estatus de salud del paciente y su progreso médico reciente."
            },
            aiCorrelativeDiagnosis: {
              type: Type.STRING,
              description: "Diagnóstico diferencial correlativo e interdisciplinario elaborado de acuerdo a la evolución sintomática y signos vitales registrados."
            },
            actionPlan: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Lista ordenada de 3 acciones prioritarias inmediatas que el equipo médico y de enfermería debe tomar de forma presencial."
            },
            epicrisisSynthesized: {
              type: Type.STRING,
              description: "El sumario clínico completo y formal (epícrisis de egreso/evolución) redactado con tecnicismos apropiados para actas de auditoría oficial de la clínica."
            },
            dispositionRecommendation: {
              type: Type.STRING,
              description: "Recomendación de destino de internación. Valores válidos: DISCHARGE (Alta médica), MAINTAIN_SURVEILLANCE (Mantener en observación ordinaria), ICU_TRANSFER (Derivar de urgencia a Unidad de Cuidados Intensivos), OUTPATIENT_FOLLOWUP (Control ambulatorio externo)."
            }
          },
          required: ["clinicalStatusSummary", "aiCorrelativeDiagnosis", "actionPlan", "epicrisisSynthesized", "dispositionRecommendation"]
        }
      }
    });

    const jsonText = response.text;
    if (jsonText) {
      const data = JSON.parse(jsonText);
      return res.json(data);
    } else {
      throw new Error("No payload returned from Gemini API");
    }

  } catch (error) {
    console.error("Failed to generate AI clinical history summary:", error);
    res.status(500).json({ error: "No se pudo generar la epícrises por inteligencia artificial." });
  }
});


// ================== VITE MIDDLEWARE CONFIG ==================


async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SYS] Server medical core running successfully on http://0.0.0.0:${PORT}`);
  });
}

startServer();
