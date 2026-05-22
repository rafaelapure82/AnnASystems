import React, { useState, useEffect } from "react";
import { Patient, Treatment, FollowUp, Incident } from "../types";
import { 
  FileText, 
  Search, 
  Clock, 
  Activity, 
  Printer, 
  Sparkles, 
  CheckCircle, 
  XCircle, 
  Stethoscope, 
  Layers, 
  Plus, 
  AlertCircle, 
  BadgeAlert,
  Thermometer,
  CalendarDays,
  Heart,
  Wind,
  User,
  PlusCircle,
  TrendingDown
} from "lucide-react";

interface HistoryViewProps {
  patients: Patient[];
  onAddTreatment?: (patientId: number, prescription: string) => Promise<any>;
  onAddFollowUp?: (patientId: number, notes: string, medAdministered: boolean) => Promise<any>;
  onRefreshAll: () => void;
  currentRole: "PARAMEDIC" | "DOCTOR" | "NURSE" | "ADMIN";
  currentUserName: string;
}

interface AISummaryResponse {
  clinicalStatusSummary: string;
  aiCorrelativeDiagnosis: string;
  actionPlan: string[];
  epicrisisSynthesized: string;
  dispositionRecommendation: string;
}

// Map database state status to beautiful Spanish badges with colors
const getStatusDisplay = (status: string) => {
  switch (status) {
    case "CRITICAL":
      return {
        label: "CRÍTICO",
        bg: "bg-rose-50 text-rose-700 border-rose-200",
        badge: "bg-rose-600 text-white font-black shadow-sm shadow-rose-200 border border-rose-500",
        pill: "bg-rose-100 text-rose-800 border border-rose-200 text-[10px]"
      };
    case "SERIOUS":
      return {
        label: "GRAVE",
        bg: "bg-amber-50 text-amber-700 border-amber-200",
        badge: "bg-amber-500 text-white font-black shadow-sm shadow-amber-100 border border-amber-400",
        pill: "bg-amber-100 text-amber-805 border border-amber-200 text-[10px]"
      };
    case "STABLE":
      return {
        label: "ESTABLE",
        bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        badge: "bg-emerald-600 text-white font-black shadow-sm shadow-emerald-100 border border-emerald-500",
        pill: "bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px]"
      };
    case "DISCHARGED":
      return {
        label: "DADO DE ALTA",
        bg: "bg-blue-50 text-blue-700 border-blue-200",
        badge: "bg-blue-600 text-white font-black shadow-sm shadow-blue-100 border border-blue-500",
        pill: "bg-blue-100 text-blue-800 border border-blue-200 text-[10px]"
      };
    default:
      return {
        label: "ESTABLE",
        bg: "bg-slate-50 text-slate-700 border-slate-200",
        badge: "bg-slate-600 text-white font-black border border-slate-500",
        pill: "bg-slate-100 text-slate-800 text-[10px]"
      };
  }
};

// Compute initials from a name string
const getInitials = (name: string) => {
  if (!name) return "P";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
};

export default function HistoryView({
  patients,
  onAddTreatment,
  onAddFollowUp,
  onRefreshAll,
  currentRole,
  currentUserName
}: HistoryViewProps) {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [detailedPatient, setDetailedPatient] = useState<Patient | null>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  
  // Quick clinical add notes inside cockpit
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteType, setNoteType] = useState<"EVOLUCION" | "ENFERMERIA" | "PRESCRIPCION">("EVOLUCION");
  const [noteText, setNoteText] = useState("");
  const [medAdministeredInput, setMedAdministeredInput] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  // AI-Epicrisis State
  const [aiSummary, setAiSummary] = useState<AISummaryResponse | null>(null);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Official Print Layout State
  const [showPrintModal, setShowPrintModal] = useState(false);

  useEffect(() => {
    if (patients.length > 0 && !selectedPatientId) {
      setSelectedPatientId(patients[0].id);
    }
  }, [patients]);

  useEffect(() => {
    if (selectedPatientId) {
      fetchDetailedPatient(selectedPatientId);
    } else {
      setDetailedPatient(null);
      setAiSummary(null);
    }
  }, [selectedPatientId]);

  useEffect(() => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const activeDocs = data.filter((u: any) => u.role === "DOCTOR" && u.active);
          setDoctors(activeDocs);
        }
      })
      .catch((err) => console.error("Error loading doctors in HistoryView:", err));
  }, []);

  const handleUpdateAssignedDoctor = async (docIdStr: string) => {
    if (!selectedPatientId) return;
    const docId = docIdStr ? parseInt(docIdStr) : null;
    const selectedDoc = doctors.find((d) => d.id === docId);
    const docName = selectedDoc ? selectedDoc.name : null;

    try {
      const response = await fetch(`/api/patients/${selectedPatientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedDoctorId: docId,
          assignedDoctorName: docName
        })
      });

      if (response.ok) {
        await fetchDetailedPatient(selectedPatientId);
        onRefreshAll();
      } else {
        alert("Error al actualizar la asignación médica.");
      }
    } catch (err) {
      console.error("Error updating assigned doctor:", err);
      alert("Error de red al actualizar la asignación.");
    }
  };

  const fetchDetailedPatient = async (id: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/patients/${id}`);
      if (res.ok) {
        const data = await res.json();
        setDetailedPatient(data);
      }
    } catch (e) {
      console.error("Failed to query detailed patient dossier:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAISummary = async () => {
    if (!selectedPatientId) return;
    setGeneratingAI(true);
    setAiError(null);
    setAiSummary(null);

    try {
      const res = await fetch(`/api/patients/${selectedPatientId}/ai-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        const data = await res.json();
        setAiSummary(data);
      } else {
        const errData = await res.json();
        setAiError(errData.error || "Falla al procesar la epícrises clínica.");
      }
    } catch (e) {
      setAiError("La conexión con el procesador clínico de Gemini falló.");
      console.error(e);
    } finally {
      setGeneratingAI(false);
    }
  };

  const submitQuickNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !noteText.trim()) return;
    setSavingNote(true);

    try {
      if (noteType === "PRESCRIPCION") {
        if (onAddTreatment) {
          await onAddTreatment(selectedPatientId, noteText);
        } else {
          // Fallback direct post
          await fetch(`/api/patients/${selectedPatientId}/treatments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prescription: noteText })
          });
        }
      } else if (noteType === "EVOLUCION") {
        const prefix = `[Evolución Médica] ${noteText}`;
        if (onAddFollowUp) {
          await onAddFollowUp(selectedPatientId, prefix, false);
        } else {
          await fetch(`/api/patients/${selectedPatientId}/follow-ups`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ notes: prefix, medicationAdministered: false })
          });
        }
      } else if (noteType === "ENFERMERIA") {
        const noteWithTag = `[Nota de Enfermería] ${noteText}`;
        if (onAddFollowUp) {
          await onAddFollowUp(selectedPatientId, noteWithTag, medAdministeredInput);
        } else {
          await fetch(`/api/patients/${selectedPatientId}/follow-ups`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ notes: noteWithTag, medicationAdministered: medAdministeredInput })
          });
        }
      }
      setNoteText("");
      setIsAddingNote(false);
      setMedAdministeredInput(false);
      // Reload view
      await fetchDetailedPatient(selectedPatientId);
      onRefreshAll();
    } catch (err) {
      console.error("Error signing new clinical note:", err);
    } finally {
      setSavingNote(false);
    }
  };

  // Filter patients based on searches and status levels
  const filteredPatients = patients.filter(p => {
    const spanishStatus = getStatusDisplay(p.status).label;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.gender.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.bloodType && p.bloodType.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          spanishStatus.toLowerCase().includes(searchQuery.toLowerCase());
    if (statusFilter === "ALL") return matchesSearch;
    return matchesSearch && p.status === statusFilter;
  });

  // Consolidate chronological timeline events in a single descending array
  const getTimelineEvents = (patient: Patient) => {
    const list: any[] = [];

    // Historical Incident (Admission / Arrival Call)
    if (patient.incidents) {
      patient.incidents.forEach((inc: Incident) => {
        list.push({
          id: `inc-${inc.id}`,
          type: "INGRESO",
          title: "Admisión de Emergencia",
          badgeType: "INGRESO",
          date: new Date(inc.createdAt),
          author: inc.ambulance?.paramedicName ? `Paramédico ${inc.ambulance.paramedicName}` : "Personal de Guardia",
          roleLabel: "Paramédico",
          content: `Ingreso al sistema reportado desde la dirección: ${inc.address}. Sintomatología de entrada descrita: "${inc.symptoms}". Despacho catalogado con gravedad ${inc.severity}.`,
          iconColor: "text-rose-500 bg-rose-50 border-rose-200",
          itemColor: "border-l-rose-500"
        });
      });
    }

    // Prescriptions (Treatments)
    if (patient.treatments) {
      patient.treatments.forEach((t: Treatment) => {
        list.push({
          id: `treat-${t.id}`,
          type: "PRESCRIPCION",
          title: "Prescripción Médica",
          badgeType: "Dr.",
          date: new Date(t.createdAt),
          author: `Dr/Dra. ${t.doctorName || "Especialista Clínico"}`,
          roleLabel: "Médico",
          content: `Prescripción farmacéutica: "${t.prescription}". Estado de suministro: ${t.status === "ADMINISTERED" ? "SUMINISTRADO" : "PENDIENTE DE APLICACIÓN"}.`,
          iconColor: "text-emerald-500 bg-emerald-50 border-emerald-200",
          itemColor: "border-l-emerald-500",
          isPrescription: true,
          status: t.status
        });
      });
    }

    // Follow-ups (Notes / Evoluciones)
    if (patient.followUps) {
      patient.followUps.forEach((f: FollowUp) => {
        const notesStr = f.notes || "";
        const isEvolucion = notesStr.includes("[Evolución Médica]");
        const cleanNotes = notesStr
          .replace("[Evolución Médica] ", "")
          .replace("[Nota de Enfermería] ", "");

        list.push({
          id: `follow-${f.id}`,
          type: isEvolucion ? "EVOLUCION" : "ENFERMERIA",
          title: isEvolucion ? "Evolución Médica" : "Nota de Enfermería",
          badgeType: isEvolucion ? "Dr." : "Enf.",
          date: new Date(f.createdAt),
          author: isEvolucion ? `Dr. ${f.nurseName || "Médico de Guardia"}` : `Enf. ${f.nurseName || "Licenciado en Enfermería"}`,
          roleLabel: isEvolucion ? "Médico" : "Enfermería",
          content: cleanNotes,
          medicationAdministered: f.medicationAdministered,
          iconColor: isEvolucion ? "text-indigo-500 bg-indigo-50 border-indigo-200" : "text-sky-500 bg-sky-50 border-sky-200",
          itemColor: isEvolucion ? "border-l-indigo-500" : "border-l-sky-500"
        });
      });
    }

    // Sort descending (newest clinical event first)
    return list.sort((a, b) => b.date.getTime() - a.date.getTime());
  };

  const timelineEvents = detailedPatient ? getTimelineEvents(detailedPatient) : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in text-slate-800" id="medical-records-dashboard">
      
      {/* 1. LEFT COLUMN: Directory, Search & Category Filters (4 cols) */}
      <div className="lg:col-span-4 bg-white border border-slate-205/80 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex flex-col h-[740px]">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
          <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none">Historias Clínicas</h3>
            <span className="text-[10px] text-slate-400 font-mono tracking-wider">ARCHIVO DE REGISTROS</span>
          </div>
          <span className="ml-auto text-[10px] font-mono font-bold bg-slate-100 px-2.5 py-0.5 rounded text-slate-600 block uppercase">
            {filteredPatients.length} REGISTRADOS
          </span>
        </div>

        {/* Directory Search & Filters */}
        <div className="space-y-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por paciente, sangre, estado..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 text-slate-800 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Styled status pills */}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {[
              { id: "ALL", label: "TODOS" },
              { id: "CRITICAL", label: "CRÍTICO" },
              { id: "SERIOUS", label: "GRAVE" },
              { id: "STABLE", label: "ESTABLE" },
              { id: "DISCHARGED", label: "ALTA" }
            ].map(lvl => (
              <button
                key={lvl.id}
                onClick={() => setStatusFilter(lvl.id)}
                className={`text-[9px] px-2.5 py-1 rounded-lg font-black tracking-wider uppercase transition-all cursor-pointer ${
                  statusFilter === lvl.id
                    ? "bg-slate-900 text-white shadow-sm shadow-slate-100"
                    : "bg-slate-100/70 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {lvl.label}
              </button>
            ))}
          </div>
        </div>

        {/* Patient Interactive Directory Items */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {filteredPatients.length === 0 ? (
            <div className="text-center py-12 text-slate-400 font-mono text-[11px]">
              No se hallaron expedientes coincidiendo con los criterios.
            </div>
          ) : (
            filteredPatients.map(p => {
              const isSelected = p.id === selectedPatientId;
              const { label, bg } = getStatusDisplay(p.status);

              return (
                <div
                  key={p.id}
                  onClick={() => {
                    setSelectedPatientId(p.id);
                    setAiSummary(null);
                    setAiError(null);
                    setIsAddingNote(false);
                  }}
                  className={`border p-3.5 rounded-xl cursor-pointer transition-all ${
                    isSelected 
                      ? "bg-rose-50/20 border-rose-300 shadow-sm" 
                      : "bg-slate-50/40 hover:bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="text-xs font-black text-slate-800 leading-tight uppercase">{p.name}</h4>
                      <p className="text-[10px] text-slate-500 font-semibold font-mono uppercase mt-1 flex items-center gap-1.5 flex-wrap">
                        <span>{p.gender}</span>
                        <span className="text-slate-300">•</span>
                        <span>{p.age} años</span>
                        <span className="text-slate-300">•</span>
                        <span className="font-bold text-slate-700 bg-slate-100 px-1 rounded">GS: {p.bloodType || "N/A"}</span>
                      </p>
                    </div>
                    <span className={`text-[8.5px] font-black tracking-wider px-2 py-0.5 rounded-lg border uppercase shrink-0 ${bg}`}>
                      {label}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. RIGHT COLUMN: Interactive Medical Dossier Cockpit (8 cols) */}
      <div className="lg:col-span-8 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow h-[740px] flex flex-col justify-between overflow-hidden">
        
        {loading ? (
          <div className="flex-1 flex flex-col justify-center items-center text-slate-400">
            <Activity className="w-10 h-10 animate-pulse text-rose-650 mb-2" />
            <span className="text-xs font-mono">Consolidando historial médico del paciente...</span>
          </div>
        ) : detailedPatient ? (
          <div className="flex-1 flex flex-col justify-between h-full overflow-hidden">
            
            {/* Header: Demographics, Initials, Simulated Avatar & Blood Highlight */}
            <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row gap-4 justify-between items-start shrink-0 bg-slate-50/45 p-4 rounded-xl border">
              
              <div className="flex items-start gap-3.5">
                {/* Profile Picture Simulated with Initials */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-rose-200 uppercase tracking-widest shrink-0">
                  {getInitials(detailedPatient.name)}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] font-mono tracking-wider font-bold text-slate-400 uppercase">Ficha Clínica de Emergencias #{detailedPatient.id}</span>
                    <span className={`text-[8px] tracking-widest font-black px-2 py-0.5 rounded-full uppercase ${getStatusDisplay(detailedPatient.status).badge}`}>
                      {getStatusDisplay(detailedPatient.status).label}
                    </span>
                  </div>
                  <h3 className="text-sm md:text-base font-black text-slate-900 tracking-tight uppercase">{detailedPatient.name}</h3>
                  
                  {/* Detailed Demographics */}
                  <div className="mt-1 flex flex-wrap gap-2 text-[10.5px] font-mono uppercase text-slate-600 font-semibold items-center">
                    <span>Edad: <strong className="text-slate-800">{detailedPatient.age} años</strong></span>
                    <span className="text-slate-300">|</span>
                    <span>Género: <strong className="text-slate-800">{detailedPatient.gender}</strong></span>
                    <span className="text-slate-300">|</span>
                    <span>Grupo Sanguíneo: <span className="bg-rose-100 text-rose-800 px-1.5 py-0.3 rounded-md font-black">{detailedPatient.bloodType || "NO REPORTADO"}</span></span>
                  </div>

                  {/* Real-time Doctor Assignment dropdown */}
                  <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Médico de Turno:</span>
                    <div className="flex items-center gap-1.5">
                      <select
                        value={detailedPatient.assignedDoctorId || ""}
                        onChange={(e) => handleUpdateAssignedDoctor(e.target.value)}
                        className="bg-slate-100/90 hover:bg-slate-200/90 text-[10px] font-bold text-slate-700 rounded-lg px-2 py-0.5 border border-slate-250 cursor-pointer focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono transition-all uppercase"
                      >
                        <option value="">-- Sin Médico Asignado --</option>
                        {doctors.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.shiftHours || "Horario Clínico"})
                          </option>
                        ))}
                      </select>
                      {detailedPatient.assignedDoctorName && (
                        <span className="text-[9px] font-mono font-black text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded uppercase animate-pulse">
                          ✓ En Tratamiento
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons: AI and Printable Report */}
              <div className="flex items-center gap-1.5 self-end md:self-start shrink-0">
                <button
                  onClick={handleGenerateAISummary}
                  disabled={generatingAI}
                  className="flex items-center gap-1.5 text-[9.5px] font-black tracking-widest uppercase bg-gradient-to-r from-purple-650 to-indigo-650 hover:opacity-90 text-white py-2 px-3 rounded-xl border border-purple-250 cursor-pointer shadow-sm transition-all disabled:opacity-40"
                  title="Auditoría clínica con Gemini"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{generatingAI ? "PROCESANDO..." : "EPÍCRISIS IA"}</span>
                </button>

                <button
                  onClick={() => setShowPrintModal(true)}
                  className="flex items-center gap-1.5 text-[9.5px] font-black tracking-widest uppercase text-slate-700 bg-white hover:bg-slate-50 border border-slate-205 py-2 px-3 rounded-xl cursor-pointer shadow-sm transition-all"
                  title="Imprimir Epicrisis Certificada"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>EXPEDIR</span>
                </button>
              </div>
            </div>

            {/* Critical Highlights Panel: Blood Type & Allergies Alert */}
            <div className="my-3 px-3 py-2 bg-rose-50/50 border border-rose-100 rounded-xl shrink-0 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-rose-900 leading-tight">
                <BadgeAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <div className="font-semibold text-[10.5px]">
                  <strong>ALERGIAS CRÍTICAS / HISTORIAL ACTIVO:</strong>{" "}
                  <span className="text-rose-800 capitalize font-medium">{detailedPatient.clinicalHistory || "Ninguno reportado hasta el momento."}</span>
                </div>
              </div>
              <div className="hidden sm:block text-right">
                <span className="text-[9px] font-mono uppercase bg-rose-200/50 text-rose-950 font-black px-2 py-0.5 rounded-lg border border-rose-200">
                  REF: SANGRE {detailedPatient.bloodType || "N/R"}
                </span>
              </div>
            </div>

            {/* Middle Workspace: Vitals grid, Diagnostic Details & Descending Timeline */}
            <div className="flex-1 overflow-y-auto py-2.5 grid grid-cols-1 md:grid-cols-12 gap-5 pr-1 content-start custom-scrollbar">
              
              {/* Vitals panel & Diagnostics (5 cols) */}
              <div className="md:col-span-5 space-y-4">
                
                {/* 4 Cards Grid of Vitals with Smart Color Interpretations */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3 shadow-inner">
                  <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2">
                    <Activity className="w-4 h-4 text-rose-600 animate-pulse" />
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider font-mono">Signos Vitales y Triaje</span>
                  </div>

                  {/* Vitals Grid */}
                  <div className="grid grid-cols-2 gap-2.5">
                    
                    {/* HR (Heart Rate / Frecuencia Cardíaca) */}
                    {(() => {
                      const value = detailedPatient.vitalsHeartRate;
                      // Threshold representation: High (>100) or low (<55) -> Amber alert
                      const isHigh = value ? value > 100 : false;
                      const isLow = value ? value < 55 : false;
                      const isAbnormal = isHigh || isLow;
                      const cardStyle = isAbnormal
                        ? "bg-amber-50 text-amber-900 border-amber-300 shadow-sm shadow-amber-50 animate-pulse"
                        : "bg-white border-slate-150 text-slate-855";
                      const textStyle = isAbnormal ? "text-amber-70s font-black" : "text-slate-800";

                      return (
                        <div className={`border p-2.5 rounded-xl text-center transition-colors ${cardStyle}`}>
                          <div className="flex items-center justify-center gap-1">
                            <Heart className="w-3 h-3 text-rose-500" />
                            <span className="text-[8.5px] text-slate-400 font-bold uppercase leading-none">Frec. Cardíaca</span>
                          </div>
                          <span className={`text-sm font-mono font-black mt-1.5 block ${textStyle}`}>
                            {value ? `${value} lpm` : "N/R"}
                          </span>
                          <span className="text-[7.5px] font-mono opacity-80 block uppercase leading-none mt-1">
                            {isHigh ? "Elevada" : isLow ? "Bradicardia" : "Normal"}
                          </span>
                        </div>
                      );
                    })()}

                    {/* SpO2 (Oxígeno) */}
                    {(() => {
                      const value = detailedPatient.vitalsOxygen;
                      const isLow = value ? value < 91 : false;
                      const cardStyle = isLow
                        ? "bg-rose-100 text-rose-900 border-rose-300 shadow-sm animate-pulse"
                        : "bg-white border-slate-150 text-slate-800";
                      const textStyle = isLow ? "text-rose-700 font-black" : "text-emerald-600 font-bold";

                      return (
                        <div className={`border p-2.5 rounded-xl text-center transition-colors ${cardStyle}`}>
                          <div className="flex items-center justify-center gap-1">
                            <Wind className="w-3 h-3 text-sky-500" />
                            <span className="text-[8.5px] text-slate-400 font-bold uppercase leading-none">Sat. Oxígeno</span>
                          </div>
                          <span className={`text-sm font-mono font-black mt-1.5 block ${textStyle}`}>
                            {value ? `${value}%` : "N/R"}
                          </span>
                          <span className="text-[7.5px] font-mono opacity-80 block uppercase leading-none mt-1">
                            {isLow ? "CRÍTICA BAJA" : "Estable"}
                          </span>
                        </div>
                      );
                    })()}

                    {/* Blood Pressure (Presión Arterial) */}
                    <div className="bg-white border border-slate-150 p-2.5 rounded-xl text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Activity className="w-3 h-3 text-violet-500" />
                        <span className="text-[8.5px] text-slate-400 font-bold uppercase leading-none">Presión Arterial</span>
                      </div>
                      <span className="text-xs font-mono font-black text-slate-800 mt-1.5 block truncate">
                        {detailedPatient.vitalsBloodPressure || "N/R"}
                      </span>
                      <span className="text-[7.5px] font-mono opacity-85 block uppercase leading-none mt-1 text-slate-400">
                        MmHg
                      </span>
                    </div>

                    {/* Temperature (Temperatura) */}
                    {(() => {
                      const value = detailedPatient.vitalsTemperature;
                      const isFever = value ? value > 37.8 : false;
                      const isHypo = value ? value < 35.5 : false;
                      const isAbnormal = isFever || isHypo;
                      const cardStyle = isAbnormal
                        ? "bg-rose-100 text-rose-900 border-rose-300 shadow-sm shadow-rose-50"
                        : "bg-white border-slate-150 text-slate-800";
                      const textStyle = isAbnormal ? "text-rose-700 font-black" : "text-slate-800";

                      return (
                        <div className={`border p-2.5 rounded-xl text-center transition-colors ${cardStyle}`}>
                          <div className="flex items-center justify-center gap-1">
                            <Thermometer className="w-3 h-3 text-orange-500" />
                            <span className="text-[8.5px] text-slate-400 font-bold uppercase leading-none">Temperatura</span>
                          </div>
                          <span className={`text-xs font-mono font-black mt-1.5 block ${textStyle}`}>
                            {value ? `${value}°C` : "N/R"}
                          </span>
                          <span className="text-[7.5px] font-mono opacity-80 block uppercase leading-none mt-1">
                            {isFever ? "Fiebre Anormal" : isHypo ? "Hipotermia" : "Estable"}
                          </span>
                        </div>
                      );
                    })()}

                  </div>
                </div>

                {/* Pre-existencias & Clinical History */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <User className="w-4 h-4 text-slate-500" />
                    <span className="text-[10px] font-black uppercase tracking-wider font-mono">Antecedentes Clínicos</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 text-slate-700 min-h-[70px]">
                    <p className="text-[11px] font-semibold leading-relaxed whitespace-pre-wrap font-sans">
                      {detailedPatient.clinicalHistory || "Sin antecedentes patológicos ordenados o alergias complementarias registradas."}
                    </p>
                  </div>
                </div>

                {/* AI / Triage Entrance assessment results */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <Stethoscope className="w-4 h-4 text-indigo-650" />
                    <span className="text-[10px] font-black uppercase tracking-wider font-mono">Evaluación de Entrada</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 text-slate-600 min-h-[70px]">
                    <p className="text-[11px] leading-relaxed italic font-medium whitespace-pre-wrap">
                      {detailedPatient.examResults || "No hay resultados diagnósticos complementarios registrados de entrada."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Chronological care Timeline of events & Forms (7 cols) */}
              <div className="md:col-span-7 space-y-4">
                
                {/* AI Summary display container if triggered */}
                {generatingAI && (
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 p-4 rounded-xl flex items-center justify-center gap-3 text-purple-800 animate-pulse shadow-sm">
                    <Sparkles className="w-5 h-5 text-purple-650 animate-spin" />
                    <div>
                      <span className="block text-xs font-black uppercase tracking-wider">Consultando Especialista IA de Gemini</span>
                      <span className="text-[10px] text-purple-500 font-mono tracking-wide">Analizando el total de ingresos, evoluciones de enfermería y prescipciones...</span>
                    </div>
                  </div>
                )}

                {aiError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{aiError}</span>
                  </div>
                )}

                {aiSummary && (
                  <div className="bg-gradient-to-br from-slate-900 to-indigo-950 border border-slate-800 p-4 rounded-2xl text-white shadow-lg animate-scale-up space-y-3 relative overflow-hidden" id="ai-epicrisis-card">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 rounded-full blur-2xl"></div>
                    
                    <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                      <Sparkles className="w-4 h-4 text-purple-400 animate-bounce" />
                      <h4 className="text-[10.5px] font-black uppercase tracking-widest text-indigo-200">EPÍCRISIS CLÍNICA ASISTIDA POR INTELIGENCIA ARTIFICIAL</h4>
                      <span className="ml-auto text-[8px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 font-bold uppercase">
                        {aiSummary.dispositionRecommendation}
                      </span>
                    </div>

                    <div className="space-y-3 text-[11px]">
                      <div>
                        <span className="text-[8px] font-mono text-purple-300 font-bold uppercase block leading-none">Diagnóstico de Correlación</span>
                        <p className="text-slate-100 leading-snug mt-1 font-semibold">{aiSummary.aiCorrelativeDiagnosis}</p>
                      </div>

                      <div>
                        <span className="text-[8px] font-mono text-purple-300 font-bold uppercase block leading-none">Sumario Crítico de Evolución</span>
                        <p className="text-slate-300 leading-relaxed mt-1">{aiSummary.clinicalStatusSummary}</p>
                      </div>

                      <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                        <span className="text-[8.5px] font-mono text-indigo-300 font-black uppercase block leading-none mb-1">Epicrisis de Egreso Consolidada</span>
                        <p className="text-slate-200 italic leading-relaxed">{aiSummary.epicrisisSynthesized}</p>
                      </div>

                      <div>
                        <span className="text-[8px] font-mono text-purple-300 font-bold uppercase block leading-none mb-1.5">Sugerencias y Cuidado Crítico</span>
                        <ul className="space-y-1 text-slate-350 list-disc list-inside">
                          {aiSummary.actionPlan.map((act, i) => (
                            <li key={i} className="leading-snug">
                              <span>{act}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Form to insert new interactive clinical notes */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl shadow-inner space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <PlusCircle className="w-4 h-4 text-rose-500" />
                      <span className="text-[10.5px] font-black text-slate-850 uppercase font-mono">Registrar Nota en Expediente</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <select
                        value={noteType}
                        onChange={(e) => setNoteType(e.target.value as any)}
                        className="bg-white border border-slate-200 text-[10px] font-bold rounded-lg px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-rose-500"
                      >
                        <option value="EVOLUCION">Evolución Médica</option>
                        <option value="ENFERMERIA">Nota de Enfermería</option>
                        <option value="PRESCRIPCION">Prescripción de Fármaco</option>
                      </select>
                    </div>
                  </div>

                  <form onSubmit={submitQuickNote} className="space-y-2.5">
                    <textarea
                      placeholder={
                        noteType === "PRESCRIPCION" 
                          ? "Fármaco, dosificación periódica, via de administración e indicaciones médicas obligatorias..."
                          : noteType === "EVOLUCION"
                          ? "Detallar evolución hemodinámica general, respuesta a terapias anteriores y opinión de especialista..."
                          : "Estado actual de enfermería, constantes actualizadas, grado de dolor autoreportado o medicaciones aplicadas..."
                      }
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      className="w-full bg-white border border-slate-250 rounded-xl p-3 text-[11.5px] font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                      rows={3}
                      required
                    />

                    <div className="flex items-center justify-between flex-wrap gap-2 pt-0.5">
                      {noteType === "ENFERMERIA" ? (
                        <div className="flex items-center gap-2 text-[10.5px] text-slate-700">
                          <input
                            type="checkbox"
                            id="med_administered"
                            checked={medAdministeredInput}
                            onChange={(e) => setMedAdministeredInput(e.target.checked)}
                            className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 accent-rose-600 cursor-pointer"
                          />
                          <label htmlFor="med_administered" className="font-bold cursor-pointer">Marcar como medicamento administrado</label>
                        </div>
                      ) : <div />}

                      <div className="flex items-center gap-2 ml-auto">
                        <button
                          type="button"
                          onClick={() => setNoteText("")}
                          className="px-3 py-1.5 hover:bg-slate-200 text-slate-600 border border-slate-300 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer"
                        >
                          Limpiar
                        </button>
                        <button
                          type="submit"
                          disabled={savingNote}
                          className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all hover:bg-slate-850 cursor-pointer disabled:opacity-40"
                        >
                          {savingNote ? "Guardando..." : "Firmar e Insertar Nota"}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>

                {/* Chronic Timeline Consola Container: Newest First */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Historial Clínico Cronológico (Más recientes primero)</span>
                    <span className="text-[9.5px] font-mono bg-slate-105 border px-2 py-0.5 rounded text-slate-500 font-black">
                      {timelineEvents.length} EVENTOS
                    </span>
                  </div>

                  {/* Descending Event Timeline Items */}
                  <div className="space-y-4 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100 max-h-[310px] overflow-y-auto pr-1 custom-scrollbar">
                    
                    {timelineEvents.length === 0 ? (
                      <p className="text-[11px] text-slate-400 font-mono py-12 text-center">No hay registros cronológicos vinculados a este expediente sanitario.</p>
                    ) : (
                      timelineEvents.map((ev) => (
                        <div key={ev.id} className={`relative pl-10 border-l-[3.5px] ${ev.itemColor} rounded-r-lg bg-slate-50/20 py-2 pr-3 transition-all hover:bg-slate-50/50`}>
                          
                          {/* Circle Icon Indicator */}
                          <div className={`absolute left-2.5 top-2.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${ev.iconColor}`}>
                            {ev.type === "INGRESO" ? <BadgeAlert className="w-3 h-3" /> :
                             ev.type === "PRESCRIPCION" ? <Stethoscope className="w-3 h-3" /> :
                             <Layers className="w-3 h-3" />}
                          </div>

                          <div className="space-y-1">
                            {/* Title, Date & Doctor/Nurse Badge */}
                            <div className="flex items-center gap-2 flex-wrap text-[11px]">
                              <span className="font-extrabold text-slate-850 uppercase tracking-tight">{ev.title}</span>
                              
                              <span className="px-2 py-0.2 rounded bg-slate-100 text-[9px] font-mono font-extrabold text-slate-600 border border-slate-200">
                                {ev.badgeType}
                              </span>

                              {ev.medicationAdministered && (
                                <span className="bg-emerald-50 text-emerald-700 text-[9.5px] font-bold px-1.5 rounded-md border border-emerald-200">
                                  ✓ Suministrado
                                </span>
                              )}

                              <span className="text-[10px] font-mono text-slate-400 ml-auto font-medium">
                                {ev.date.toLocaleString("es-ES", {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: false
                                })}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-600 leading-relaxed font-sans font-medium whitespace-pre-wrap">
                              {ev.content}
                            </p>

                            <div className="text-[9.5px] uppercase font-mono text-slate-400 font-bold flex items-center gap-1">
                              <span>FIRMADO POR:</span>
                              <span className="text-slate-600">{ev.author}</span>
                              <span className="text-slate-350">({ev.roleLabel})</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}

                  </div>
                </div>

              </div>

            </div>

            {/* Legal Security Disclaimer Footer */}
            <div className="border-t border-slate-100 pt-3.5 mt-3.5 shrink-0 flex items-center justify-between text-[9px] text-slate-400 font-mono uppercase font-bold tracking-wider">
              <span>CONFIDENCIALIDAD SANITARIA LEY DE SALUD PÚBLICA VENEZUELA</span>
              <span>SESIÓN CLÍNICA: {currentRole} - {currentUserName}</span>
            </div>

          </div>
        ) : (
          /* Empty State prompt when no patient is chosen */
          <div className="flex-1 flex flex-col justify-center items-center text-slate-400 text-center py-24 p-6 bg-slate-50/25 rounded-2xl border border-dashed">
            <FileText className="w-16 h-16 text-slate-300 mb-3 animate-pulse" />
            <h3 className="text-xs font-black text-slate-850 uppercase tracking-widest mb-1.5">
              Consola Central de Epícrises y Expedientes
            </h3>
            <p className="text-xs max-w-sm text-slate-500 font-semibold leading-relaxed">
              Consulte el listado de pacientes clínicos activos a la izquierda para inspeccionar sus evoluciones medibles, constantes, tratamientos ordenados e invocar la epícrises inteligente por IA.
            </p>
          </div>
        )}

      </div>


      {/* 3. PRINT PREVIEW MODAL (OFFICIAL COMPLIANCE EPÍCRISIS FORM) */}
      {showPrintModal && detailedPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white border border-slate-350 rounded-2xl shadow-2xl w-full max-w-3xl p-6 relative flex flex-col h-[90vh] shrink-0 text-slate-800">
            
            {/* Modal actions panel */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-50">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-slate-900 hover:bg-slate-850 text-white py-2 px-4 rounded-xl cursor-pointer font-sans shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>IMPRIMIR EXPEDIENTE</span>
              </button>
              <button
                onClick={() => setShowPrintModal(false)}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-800 cursor-pointer shadow-sm"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* PRINT BODY ELEMENT (Optimized for standard Venezuelan paper formats) */}
            <div className="flex-1 overflow-y-auto pr-1 pb-4 mt-6 font-sans space-y-6" id="printable-clinical-epicrisis">
              
              {/* Emergency logo head */}
              <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-end">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-rose-600 text-white font-black w-6 h-6 rounded-lg flex items-center justify-center text-sm">+</span>
                    <strong className="text-sm font-black tracking-widest text-slate-900 font-sans">RED DE SALUD - VENEZUELA</strong>
                  </div>
                  <p className="text-[9.5px] font-semibold text-slate-600 uppercase tracking-wide">
                    Unidad de Emergencias Adulto del Hospital “Francisco Antonio Rísquez” de Achaguas, estado Apure • Servicio de Emergencia y Soporte Vital
                  </p>
                  <p className="text-[8.5px] font-mono text-slate-400">ACHAGUAS – ESTADO APURE, VENEZUELA • CONSULTA CLÍNICA DE CONTROL</p>
                </div>

                <div className="text-right">
                  <span className="block text-[8.5px] font-mono font-black text-rose-600 tracking-wider">REGISTRO CLÍNICO VERIFICADO</span>
                  <span className="text-[10px] font-black font-mono mt-1 block bg-slate-100 px-3 py-1 rounded-lg text-slate-805 uppercase border">
                    EPÍCRISIS #MS-AP-{detailedPatient.id}-{new Date().getFullYear()}
                  </span>
                </div>
              </div>

              {/* Patient Core Profile */}
              <div className="bg-slate-50 p-4 border border-slate-205 rounded-xl space-y-2.5">
                <div className="flex justify-between text-[8px] font-mono font-black text-slate-400 uppercase tracking-widest">
                  <span>EXPEDIENTE CLÍNICO INTEGRAL CONFIDENCIAL</span>
                  <span>FECHA EXPEDICIÓN: {new Date().toLocaleDateString("es-ES")}</span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1 text-[11px]">
                  <div>
                    <span className="block text-[8.5px] font-bold text-slate-450 uppercase tracking-wider font-mono">Paciente</span>
                    <span className="text-xs font-black text-slate-900 uppercase block mt-1">{detailedPatient.name}</span>
                  </div>
                  <div>
                    <span className="block text-[8.5px] font-bold text-slate-450 uppercase tracking-wider font-mono">Demografía</span>
                    <span className="text-xs font-bold text-slate-850 block mt-1">{detailedPatient.age} AÑOS • {detailedPatient.gender}</span>
                  </div>
                  <div>
                    <span className="block text-[8.5px] font-bold text-slate-450 uppercase tracking-wider font-mono">Grupo Sanguíneo</span>
                    <span className="text-xs font-mono font-black text-rose-700 block mt-1 uppercase">{detailedPatient.bloodType || "N/R"}</span>
                  </div>
                  <div>
                    <span className="block text-[8.5px] font-bold text-slate-450 uppercase tracking-wider font-mono">Estado Actual</span>
                    <span className="text-xs font-black text-slate-900 block mt-1 uppercase">{getStatusDisplay(detailedPatient.status).label}</span>
                  </div>
                </div>
              </div>

              {/* Vitals overview */}
              <div className="space-y-2.5">
                <span className="block text-[9px] font-bold uppercase tracking-wider font-mono border-b border-slate-200 pb-1 text-slate-500">1. CONTROLES Y SIGNOS VITALES</span>
                <div className="grid grid-cols-4 gap-2.5 text-center text-slate-800 text-[11px]">
                  <div className="border border-slate-200 p-2.5 rounded-lg bg-slate-50/40">
                    <span className="text-[8px] font-mono text-slate-400 block uppercase font-bold leading-none">Frec. Cardíaca</span>
                    <strong className="text-xs font-mono block mt-1">{detailedPatient.vitalsHeartRate ? `${detailedPatient.vitalsHeartRate} lpm` : "N/R"}</strong>
                  </div>
                  <div className="border border-slate-200 p-2.5 rounded-lg bg-slate-50/40">
                    <span className="text-[8px] font-mono text-slate-400 block uppercase font-bold leading-none">Saturación SpO2</span>
                    <strong className="text-xs font-mono block mt-1">{detailedPatient.vitalsOxygen ? `${detailedPatient.vitalsOxygen}%` : "N/R"}</strong>
                  </div>
                  <div className="border border-slate-200 p-2.5 rounded-lg bg-slate-50/40">
                    <span className="text-[8px] font-mono text-slate-400 block uppercase font-bold leading-none">Presión Arterial</span>
                    <strong className="text-xs font-mono block mt-1">{detailedPatient.vitalsBloodPressure || "N/R"}</strong>
                  </div>
                  <div className="border border-slate-200 p-2.5 rounded-lg bg-slate-50/40">
                    <span className="text-[8px] font-mono text-slate-400 block uppercase font-bold leading-none">Temperatura</span>
                    <strong className="text-xs font-mono block mt-1">{detailedPatient.vitalsTemperature ? `${detailedPatient.vitalsTemperature}°C` : "N/R"}</strong>
                  </div>
                </div>
              </div>

              {/* Background and allergies */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[8.5px] font-bold font-mono uppercase text-slate-400 block border-b pb-0.5">Alergias / Antecedentos de Fondo</span>
                  <p className="text-[11px] text-slate-700 leading-relaxed font-sans font-medium whitespace-pre-wrap">
                    {detailedPatient.clinicalHistory || "Sin antecedentes pre-existentes reportados."}
                  </p>
                </div>
                <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[8.5px] font-bold font-mono uppercase text-slate-400 block border-b pb-0.5">Diagnóstico y Evaluación Inicial</span>
                  <p className="text-[11px] text-slate-700 leading-relaxed italic whitespace-pre-wrap">
                    {detailedPatient.examResults || "Clasificación ordinaria según protocolo médico de urgencias."}
                  </p>
                </div>
              </div>

              {/* Full clinical Timeline of notes */}
              <div className="space-y-2.5">
                <span className="block text-[9px] font-bold uppercase tracking-wider font-mono border-b border-slate-200 pb-1 text-slate-500">2. BITÁCORA SECUENCIAL CRONOLÓGICA</span>
                <div className="space-y-3 pl-2.5">
                  {timelineEvents.map((ev, i) => (
                    <div key={`p-ev-${i}`} className="space-y-1 pl-3 border-l-2 border-slate-400">
                      <div className="flex items-center gap-2 text-[10.5px]">
                        <strong className="text-slate-800 uppercase font-sans">{ev.title}</strong>
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 text-[8px] font-mono text-slate-500 uppercase border">
                          {ev.badgeType}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400">{ev.date.toLocaleString("es-ES")}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-sans leading-normal">
                        {ev.content}
                      </p>
                      <span className="text-[8.5px] text-slate-400 font-mono block">RESPONSABLE FIRMANTE: {ev.author} ({ev.roleLabel})</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI integration report if generated */}
              {aiSummary && (
                <div className="border border-indigo-200 p-4 bg-indigo-50/30 rounded-xl space-y-2">
                  <span className="text-[9px] font-black font-mono text-indigo-850 block uppercase tracking-widest border-b border-indigo-200 pb-1">3. CONSULTA DIAGNÓSTICA COMPLEMENTARIA IA</span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[10.5px]">
                    <div>
                      <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider font-mono">Orientación de Correlación</span>
                      <p className="text-slate-800 leading-relaxed font-semibold mt-1">{aiSummary.aiCorrelativeDiagnosis}</p>
                    </div>

                    <div>
                      <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider font-mono">Dictamen de Control Sintomático</span>
                      <p className="text-slate-700 leading-relaxed mt-1">{aiSummary.clinicalStatusSummary}</p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider font-mono">Síntesis para Egreso</span>
                    <p className="text-[11px] text-indigo-950 italic leading-relaxed bg-white p-2.5 rounded-lg border border-indigo-150 mt-1">{aiSummary.epicrisisSynthesized}</p>
                  </div>
                </div>
              )}

              {/* Bottom Stamp blocks and Signature */}
              <div className="pt-10 flex flex-col md:flex-row justify-between items-center gap-6">
                
                {/* Stamp */}
                <div className="text-center md:text-left space-y-1 font-mono">
                  <div className="border border-slate-300 px-3 py-1.5 bg-slate-50 flex items-center justify-center text-[11px] tracking-[6px] font-black w-44 text-slate-700 rounded-lg">
                    *EXP-AP-{detailedPatient.id}*
                  </div>
                  <span className="text-[8px] text-slate-400 block uppercase font-bold text-center">Código de Control Digital</span>
                </div>

                {/* Simulated signature field */}
                <div className="border-t border-dashed border-slate-400 w-56 pt-2 text-center">
                  <div className="text-[11px] italic font-black uppercase tracking-wider text-slate-800">{currentUserName}</div>
                  <span className="text-[9px] font-bold font-mono text-slate-500 block uppercase mt-0.5">{currentRole} • PERSONAL DE SALUD HABILITADO</span>
                  <span className="text-[8px] font-mono text-slate-400 block uppercase">HOSPFRANCISCORISQUEZ</span>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
