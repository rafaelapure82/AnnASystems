import React, { useState, useEffect } from "react";
import { Ambulance, Hospital, Incident } from "../types";
import { Ambulance as AmbIcon, ShieldAlert, Heart, Activity, Thermometer, User, MapPin, Brain, Loader2, Sparkles, CheckCircle } from "lucide-react";

interface ParamedicViewProps {
  ambulances: Ambulance[];
  hospitals: Hospital[];
  onAddIncident: (data: any) => Promise<any>;
  onRefresh: () => void;
}

export default function ParamedicView({ ambulances, hospitals, onAddIncident, onRefresh }: ParamedicViewProps) {
  // Form State
  const [patientName, setPatientName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("MASCULINO");
  const [symptoms, setSymptoms] = useState("");
  const [address, setAddress] = useState("");
  
  // Vitals
  const [heartRate, setHeartRate] = useState("");
  const [bloodPressure, setBloodPressure] = useState("");
  const [oxygen, setOxygen] = useState("");
  const [temperature, setTemperature] = useState("");

  // Coordinates
  const [latitude, setLatitude] = useState((40.70 + Math.random() * 0.03).toFixed(4));
  const [longitude, setLongitude] = useState((-74.01 + Math.random() * 0.02).toFixed(4));

  // Dispatch details
  const [assignedAmbulanceId, setAssignedAmbulanceId] = useState("");
  const [notifiedHospitalId, setNotifiedHospitalId] = useState("");

  // AI Triage State
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiResult, setAiResult] = useState<{
    severity: string;
    recommendedTreatment: string;
    prioritizedActions: string[];
    suggestedDept: string;
    explanation: string;
  } | null>(null);

  // Success message State
  const [successMsg, setSuccessMsg] = useState("");

  // Doctor Selection States
  const [doctors, setDoctors] = useState<any[]>([]);
  const [assignedDoctorId, setAssignedDoctorId] = useState("");
  const [assignedDoctorName, setAssignedDoctorName] = useState("");

  useEffect(() => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const activeDocs = data.filter((u: any) => u.role === "DOCTOR" && u.active);
          setDoctors(activeDocs);
        }
      })
      .catch((err) => console.error("Error loading doctors:", err));
  }, []);

  const handleDoctorChange = (val: string) => {
    setAssignedDoctorId(val);
    const doc = doctors.find((d) => d.id.toString() === val);
    setAssignedDoctorName(doc ? doc.name : "");
  };

  // Refresh coordinates with random NYC area
  const generateRandomCoords = () => {
    setLatitude((40.695 + Math.random() * 0.035).toFixed(4));
    setLongitude((-74.015 + Math.random() * 0.025).toFixed(4));
    setSuccessMsg("Coordenadas GPS actualizadas vía satélite.");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  // Run AI Triago before creating, using Gemini Server-Side
  const handleAITriage = async () => {
    if (!symptoms) {
      alert("Por favor, ingrese primero los síntomas del paciente para realizar el Triaje de IA.");
      return;
    }
    setLoadingAI(true);
    setAiResult(null);

    try {
      const response = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName: patientName || "Identidad Reservada",
          address: address || "Calle en curso de Geodecodificación",
          latitude,
          longitude,
          symptoms,
          age: age || "30",
          gender,
          assignedDoctorId: assignedDoctorId || null,
          assignedDoctorName: assignedDoctorName || null
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAiResult(data.aiTriage);
        
        // Populate dispatch suggestions if incident saved
        const incId = data.incident.id;
        
        // Auto-select first hospital that has space as suggestion, and idle ambulance
        const availableHospital = hospitals.find(h => h.capacity - h.occupied > 0);
        if (availableHospital) {
          setNotifiedHospitalId(availableHospital.id.toString());
        }
        const availableAmb = ambulances.find(a => a.status === "IDLE");
        if (availableAmb) {
          setAssignedAmbulanceId(availableAmb.id.toString());
        }

        // Trigger updates in background
        if (availableAmb || availableHospital) {
          await fetch(`/api/incidents/${incId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ambulanceId: availableAmb?.id,
              hospitalId: availableHospital?.id,
              severity: data.aiTriage.severity
            })
          });
        }

        // Also save custom vitals directly to the created patient record
        if (heartRate || bloodPressure || oxygen || temperature) {
          await fetch(`/api/patients/${data.incident.patientId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              vitalsHeartRate: heartRate,
              vitalsBloodPressure: bloodPressure,
              vitalsOxygen: oxygen,
              vitalsTemperature: temperature
            })
          });
        }

        setSuccessMsg(`¡Emergencia Médica registrada con éxito! Paciente #${data.incident.patientId}.`);
        onRefresh();
        
        // Clear forms except AI view comfort
        setPatientName("");
        setAge("");
        setSymptoms("");
        setAddress("");
        setHeartRate("");
        setBloodPressure("");
        setOxygen("");
        setTemperature("");
        setAssignedDoctorId("");
        setAssignedDoctorName("");
      } else {
        alert("Ocurrió un error al procesar la emergencia.");
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión con el núcleo de emergencias.");
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in text-slate-800">
      {/* Registration Form (Left Column) */}
      <div className="lg:col-span-7 bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-lg bg-red-50 text-red-600 border border-red-100">
            <AmbIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase">Registro de Paciente e Incidente</h2>
            <p className="text-xs text-slate-500 font-semibold font-mono">MODULO DE PARAMÉDICOS EN TIEMPO REAL</p>
          </div>
        </div>

        {successMsg && (
          <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs py-3 px-4 rounded-lg flex items-center gap-2 font-medium">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleAITriage(); }} className="space-y-5">
          {/* Section 1: Patient Affiliation */}
          <div className="space-y-3">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">1. FILIACIÓN DEL PACIENTE</span>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-6">
                <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-mono">Nombre Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-slate-450" />
                  <input 
                    type="text" 
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="E.g. Roberto Montenegro"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-white"
                  />
                </div>
              </div>
              <div className="md:col-span-3 col-span-6">
                <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-mono">Edad</label>
                <input 
                  type="number" 
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="Años"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-white"
                  required
                />
              </div>
              <div className="md:col-span-3 col-span-6">
                <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-mono">Género</label>
                <select 
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-red-500 focus:bg-white cursor-pointer font-semibold"
                >
                  <option value="MASCULINO">Masculino</option>
                  <option value="FEMENINO">Femenino</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
            </div>
            
            {/* Médico de Turno Dropdown */}
            <div className="mt-3">
              <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-mono font-bold text-red-650">
                Asignación de Médico de Turno
              </label>
              <select
                value={assignedDoctorId}
                onChange={(e) => handleDoctorChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-red-500 focus:bg-white cursor-pointer font-semibold transition-all hover:bg-slate-100"
              >
                <option value="">-- No Asignar / En Cola General --</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id.toString()}>
                    {d.name} ({d.shiftHours || "Horario Clínico"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 2: Clinical Vitals */}
          <div className="space-y-3">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">2. CONSTANTES VITALES</span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <label className="flex items-center gap-1 text-[10px] font-bold text-red-600 font-mono tracking-wider mb-1">
                  <Heart className="w-3 h-3 text-red-500" /> FC (LPM)
                </label>
                <input 
                  type="number" 
                  value={heartRate}
                  onChange={(e) => setHeartRate(e.target.value)}
                  placeholder="80"
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-center text-slate-800 font-bold focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="flex items-center gap-1 text-[10px] font-bold text-amber-600 font-mono tracking-wider mb-1">
                  <Activity className="w-3 h-3 text-amber-500" /> P.A. (mmHg)
                </label>
                <input 
                  type="text" 
                  value={bloodPressure}
                  onChange={(e) => setBloodPressure(e.target.value)}
                  placeholder="120/80"
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-center text-slate-800 font-bold focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="flex items-center gap-1 text-[10px] font-bold text-blue-600 font-mono tracking-wider mb-1">
                  <Sparkles className="w-3 h-3 text-blue-500" /> SatO2 (%)
                </label>
                <input 
                  type="number" 
                  value={oxygen}
                  onChange={(e) => setOxygen(e.target.value)}
                  placeholder="98"
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-center text-slate-800 font-bold focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 font-mono tracking-wider mb-1">
                  <Thermometer className="w-3 h-3 text-emerald-500" /> Temp (°C)
                </label>
                <input 
                  type="number" 
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  placeholder="36.5"
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-center text-slate-800 font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Incident Details & GPS Location */}
          <div className="space-y-3">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">3. DETALLES DEL INCIDENTE Y GEOLOCALIZACIÓN</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-mono">Dirección o Punto de Referencia</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-450" />
                  <input 
                    type="text" 
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Calle Real con Cruce Independencia"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-white"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-mono">Satélite GPS (Lat, Lng)</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={`${latitude}, ${longitude}`}
                    disabled
                    className="flex-1 px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-500 font-mono select-none"
                  />
                  <button 
                    type="button" 
                    onClick={generateRandomCoords}
                    className="px-3 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-[10px] text-red-600 font-mono font-bold cursor-pointer transition-colors"
                  >
                    Ping GPS
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-mono">Síntomas Reportados / Cuadro Clínico</label>
              <textarea 
                rows={3}
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="Dolor torácico opresivo de inicio agudo, dificultad respiratoria severa, sudoración fría excesiva..."
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-white"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <button 
              type="submit" 
              disabled={loadingAI}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-black font-sans tracking-widest shadow-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01]"
            >
              {loadingAI ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>PROCESANDO TRIAJE MÉDICO IA...</span>
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 text-red-100" />
                  <span>REGISTRAR Y REALIZAR TRIAJE IA</span>
                </>
              )}
            </button>
            <div className="text-[10px] text-slate-400 font-semibold font-sans leading-relaxed flex items-center">
              * El sistema enviará los datos clínicos al modelo Gemini para clasificar inmediatamente el estatus de emergencia y sugerir medidas asistenciales inmediatas.
            </div>
          </div>
        </form>
      </div>

      {/* AI Triage Feedback (Right Column) */}
      <div className="lg:col-span-5 flex flex-col gap-5">
        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm flex-1 flex flex-col min-h-[400px]">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
            <Sparkles className="w-5 h-5 text-red-500 animate-pulse" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">CÓMPUTO CLÍNICO IA</h3>
          </div>

          {aiResult ? (
            <div className="space-y-5 animate-fade-in flex-1 flex flex-col justify-between">
              <div>
                {/* Severity Badge */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Gravedad Asignada</span>
                  <span className={`px-3 py-1 text-[11px] font-bold font-mono uppercase rounded-full ${
                    aiResult.severity === "CRITICAL" ? "bg-red-50 border border-red-200 text-red-600" :
                    aiResult.severity === "SERIOUS" ? "bg-amber-50 border border-amber-200 text-amber-700" :
                    "bg-emerald-50 border border-emerald-250 text-emerald-600"
                  }`}>
                    ⚠️ {aiResult.severity}
                  </span>
                </div>

                {/* suggested area */}
                <div className="mb-4">
                  <span className="block text-[9px] font-bold font-mono uppercase text-slate-400 tracking-wider">Derivación Sugerida</span>
                  <p className="text-xs font-bold text-slate-800 mt-0.5 uppercase tracking-wide bg-slate-50 px-2 py-1 rounded inline-block">{aiResult.suggestedDept}</p>
                </div>

                {/* Treatment summary */}
                <div className="mb-4">
                  <span className="block text-[9px] font-bold font-mono uppercase text-slate-400 tracking-wider">Tratamiento Recomendado</span>
                  <p className="text-xs text-slate-600 leading-relaxed mt-0.5 border-l-2 border-l-red-500 pl-2 lg:text-[11px]">{aiResult.recommendedTreatment}</p>
                </div>

                {/* Prioritized Actions */}
                <div className="mb-4">
                  <span className="block text-[9px] font-bold font-mono uppercase text-slate-400 tracking-wider mb-2">Acciones de Triaje Inmediatas</span>
                  <ul className="space-y-1.5">
                    {aiResult.prioritizedActions.map((act, index) => (
                      <li key={index} className="flex gap-2 items-start text-xs text-slate-600 font-semibold leading-relaxed">
                        <span className="font-mono text-slate-600 text-[10px] bg-slate-100 border border-slate-200 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">{index+1}</span>
                        <span className="leading-snug">{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Triage Justification */}
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-lg mt-4">
                <span className="block text-[8px] font-bold font-mono uppercase text-slate-400 mb-1">Análisis Fisiopatológico</span>
                <p className="text-[10px] text-slate-500 italic font-semibold leading-snug">"{aiResult.explanation}"</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
              {loadingAI ? (
                <div className="space-y-3">
                  <Loader2 className="w-10 h-10 animate-spin text-red-500 mx-auto" />
                  <p className="text-xs font-semibold text-slate-500">Analizando constantes vitales, sintomatología compleja y estimando estabilidad cardiovascular...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Brain className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="text-xs font-semibold">Esperando registro de incidente. Las métricas de triaje y la orden de operaciones IA aparecerán aquí una vez que registre una emergencia.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
