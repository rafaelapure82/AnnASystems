import React, { useState, useEffect } from "react";
import { Patient, Treatment, User } from "../types";
import { Sparkles, Activity, FileSpreadsheet, ShieldAlert, Heart, Calendar, Command, Loader2, ListTodo, Plus, CheckCircle2 } from "lucide-react";

interface DoctorViewProps {
  patients: Patient[];
  currentSimulatedUser: User | null;
  onAddTreatment: (patientId: number, prescription: string) => Promise<any>;
  onUpdatePatientStatus: (patientId: number, status: string) => Promise<any>;
  onRefresh: () => void;
}

export default function DoctorView({
  patients,
  currentSimulatedUser,
  onAddTreatment,
  onUpdatePatientStatus,
  onRefresh
}: DoctorViewProps) {
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  
  // Doctor custom prescription inputs
  const [prescriptionText, setPrescriptionText] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [prescribiendo, setPrescribiendo] = useState(false);

  // Doctor Patient Filter Toggle (defaults to showing active doctor's patients)
  const [onlyMyPatients, setOnlyMyPatients] = useState(true);

  // Derived filtered patients list
  const displayedPatients = patients.filter(p => {
    if (onlyMyPatients && currentSimulatedUser && currentSimulatedUser.role === "DOCTOR") {
      return p.assignedDoctorId === currentSimulatedUser.id;
    }
    return true;
  });

  // IA Advisor panel state
  const [aiDocNotes, setAiDocNotes] = useState("");
  const [loadingAIDoc, setLoadingAIDoc] = useState(false);
  const [aiReport, setAiReport] = useState<{
    treatmentPlan: string;
    reasoning: string;
  } | null>(null);

  // Live Alerts filtered by active toggle selection
  const criticalPatients = displayedPatients.filter(p => p.status === "CRITICAL" || p.status === "SERIOUS");

  // Fetch full clinical details once patient is selected
  useEffect(() => {
    if (selectedPatientId) {
      fetchPatientClinicalDetails(selectedPatientId);
    } else {
      setSelectedPatient(null);
      setAiReport(null);
    }
  }, [selectedPatientId]);

  const fetchPatientClinicalDetails = async (id: number) => {
    try {
      const res = await fetch(`/api/patients/${id}`);
      if (res.ok) {
        const fullPatient = await res.json();
        setSelectedPatient(fullPatient);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handlePrescriptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !prescriptionText) return;

    setPrescribiendo(true);
    try {
      await onAddTreatment(selectedPatientId, prescriptionText);
      setPrescriptionText("");
      // Reload details to display new list
      await fetchPatientClinicalDetails(selectedPatientId);
    } catch (err) {
      console.error(err);
    } finally {
      setPrescribiendo(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedPatientId) return;
    setUpdatingStatus(true);
    try {
      await onUpdatePatientStatus(selectedPatientId, newStatus);
      await fetchPatientClinicalDetails(selectedPatientId);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Consult Gemini medical advisory client-side connector
  const fetchAIDoctorAdvisor = async () => {
    if (!selectedPatientId) return;
    setLoadingAIDoc(true);
    setAiReport(null);
    
    try {
      const response = await fetch("/api/ai/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatientId,
          sysPrompt: aiDocNotes || "Proporcionar soporte farmacológico detallado para este cuadro agudo de emergencia."
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAiReport(data);
      } else {
        alert("No se pudo obtener la recomendación médica de la IA.");
      }
    } catch (err) {
      console.error(err);
      alert("Error contactando con el núcleo consultor.");
    } finally {
      setLoadingAIDoc(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in text-slate-800">
      
      {/* LEFT: Live Alerts & Patient Directory (4 cols) */}
      <div className="lg:col-span-4 flex flex-col gap-4">
        {/* Filtro Mis Pacientes - Premium Glassmorphic Switch */}
        {currentSimulatedUser && currentSimulatedUser.role === "DOCTOR" && (
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white p-4 rounded-xl shadow-md border border-slate-800 space-y-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-xl"></div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></div>
                <span className="text-[10px] font-mono tracking-widest text-rose-350 font-bold uppercase">ÁREA DE ASIGNACIÓN</span>
              </div>
              <span className="text-[8px] font-mono font-bold bg-white/10 px-2 py-0.5 rounded uppercase tracking-wider text-indigo-250 border border-white/5">
                Dr. {currentSimulatedUser.name.split(" ").slice(-1)[0] || currentSimulatedUser.username}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div>
                <h4 className="text-xs font-black uppercase tracking-tight text-white">Filtrado de Turno</h4>
                <p className="text-[9px] text-slate-400 font-medium font-sans">
                  {onlyMyPatients ? "Mostrando sólo MIS Pacientes Asignados" : "Mostrando TODOS los Pacientes del Centro"}
                </p>
              </div>
              
              {/* Premium Slider Switch */}
              <button
                type="button"
                onClick={() => setOnlyMyPatients(!onlyMyPatients)}
                className={`relative inline-flex h-5.5 w-10.5 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  onlyMyPatients ? "bg-rose-600" : "bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    onlyMyPatients ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* Critical Alerts Banner */}
        <div className="bg-white border border-red-200 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-600 animate-pulse" />
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Alertas de Emergencia</h3>
            </div>
            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-red-100 text-red-700">
              {criticalPatients.length} Activos
            </span>
          </div>

          {criticalPatients.length === 0 ? (
            <p className="text-[11px] text-slate-400 py-4 text-center font-semibold font-mono">No hay emergencias agudas activas.</p>
          ) : (
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {criticalPatients.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPatientId(p.id)}
                  className={`w-full text-left p-2.5 rounded-lg border flex items-center justify-between transition-all group cursor-pointer ${
                    selectedPatientId === p.id 
                      ? "bg-red-50 border-red-300" 
                      : "bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  <div>
                    <h4 className="text-xs font-black text-slate-900 truncate max-w-[150px]">{p.name}</h4>
                    <p className="text-[10px] text-slate-500 font-bold font-mono mt-0.5">{p.age} años | {p.gender.slice(0, 3)}</p>
                    {p.assignedDoctorName && (
                      <div className="mt-1 flex items-center gap-1 text-[8.5px] font-mono text-red-800 bg-red-105 border border-red-200 px-1 rounded uppercase tracking-wider w-fit">
                        <span>👤 {p.assignedDoctorName}</span>
                      </div>
                    )}
                  </div>
                  <span className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                    p.status === "CRITICAL" ? "bg-red-100 text-red-700 border border-red-200" : "bg-amber-100 text-amber-800 border border-amber-200"
                  }`}>
                    🔴 {p.status}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Directory Card */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
            <FileSpreadsheet className="w-4 h-4 text-slate-700" />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Directorio Clínico</h3>
          </div>
          
          <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[350px] pr-1">
            {displayedPatients.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPatientId(p.id)}
                className={`w-full text-left p-2.5 rounded-lg flex items-center justify-between transition-all border cursor-pointer ${
                  selectedPatientId === p.id 
                    ? "bg-slate-100 border-slate-300" 
                    : "bg-slate-50 hover:bg-slate-100 border-slate-150 hover:border-slate-250"
                }`}
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{p.name || "Identidad reservada"}</h4>
                  <p className="text-[9px] text-slate-500 font-semibold truncate max-w-[180px] mt-0.5">{p?.clinicalHistory?.slice(0, 35)}...</p>
                  {p.assignedDoctorName ? (
                    <div className="mt-1 flex items-center gap-1 text-[8.5px] font-mono text-indigo-600 font-bold bg-indigo-50 border border-indigo-100 px-1.5 py-0.2 rounded w-fit uppercase">
                      <span>👤 {p.assignedDoctorName}</span>
                    </div>
                  ) : (
                    <div className="mt-1 flex items-center gap-1 text-[8.5px] font-mono text-slate-400 font-semibold bg-slate-100 px-1.5 py-0.2 rounded w-fit uppercase">
                      <span>👤 SIN ASIGNAR</span>
                    </div>
                  )}
                </div>
                <span className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                  p.status === "CRITICAL" ? "bg-red-50 text-red-700 border border-red-100" :
                  p.status === "SERIOUS" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                  p.status === "STABLE" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                  "bg-slate-200 text-slate-600"
                }`}>
                  {p.status}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT: Patient Clinical Workspace & AI Support (8 cols) */}
      <div className="lg:col-span-8">
        {selectedPatient ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-scale-up">
            
            {/* Clinical Overview & Action panel */}
            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4">
              {/* Header */}
              <div className="border-b border-slate-100 pb-3 flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{selectedPatient.name}</h3>
                  <p className="text-xs text-slate-500 font-semibold">{selectedPatient.age} años | Grupo: <span className="text-red-600 font-mono font-bold">{selectedPatient.bloodType || "O+"}</span></p>
                  {selectedPatient.assignedDoctorName && (
                    <div className="mt-1.5 flex items-center gap-1 text-[9px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded-full uppercase tracking-wider w-fit">
                      <span>👤 Médico Asignado: {selectedPatient.assignedDoctorName}</span>
                    </div>
                  )}
                </div>
                
                {/* Status Toggle buttons */}
                <div className="flex gap-1">
                  {["STABLE", "SERIOUS", "CRITICAL"].map(st => (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(st)}
                      disabled={updatingStatus}
                      className={`text-[8px] font-mono px-1.5 py-1 rounded transition-all font-bold cursor-pointer ${
                        selectedPatient.status === st 
                          ? st === "CRITICAL" ? "bg-red-600 text-white" : st === "SERIOUS" ? "bg-amber-500 text-slate-900" : "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vitals indicators */}
              <div className="grid grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center">
                <div>
                  <span className="block text-[8px] font-mono text-red-600 font-bold uppercase">FC</span>
                  <span className="text-xs font-black font-mono text-slate-800">{selectedPatient.vitalsHeartRate || "--"} <span className="text-[8px] text-slate-400">lpm</span></span>
                </div>
                <div>
                  <span className="block text-[8px] font-mono text-amber-600 font-bold uppercase">P.A.</span>
                  <span className="text-xs font-black font-mono text-slate-800">{selectedPatient.vitalsBloodPressure || "--"}</span>
                </div>
                <div>
                  <span className="block text-[8px] font-mono text-blue-600 font-bold uppercase">SatO2</span>
                  <span className="text-xs font-black font-mono text-slate-800">{selectedPatient.vitalsOxygen || "--"}<span className="text-[8px] text-slate-400">%</span></span>
                </div>
                <div>
                  <span className="block text-[8px] font-mono text-emerald-600 font-bold uppercase">Temp</span>
                  <span className="text-xs font-black font-mono text-slate-800">{selectedPatient.vitalsTemperature || "--"}<span className="text-[8px] text-slate-400">°C</span></span>
                </div>
              </div>

              {/* Medical History Section */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-700">
                <span className="block text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-1">Antecedentes Clínicos</span>
                <p className="text-[11px] font-semibold text-slate-650 leading-normal">{selectedPatient.clinicalHistory || "Sin antecedentes registrados en el triage preliminar."}</p>
                
                {selectedPatient.examResults && (
                  <div className="mt-2.5 border-t border-slate-200 pt-2.5">
                    <span className="block text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-1">Exámenes Médicos / Alertas</span>
                    <p className="text-[11px] text-slate-600 font-semibold font-sans leading-normal">{selectedPatient.examResults}</p>
                  </div>
                )}
              </div>

              {/* Treatment Form */}
              <form onSubmit={handlePrescriptionSubmit} className="space-y-2">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Prescribir Nuevo Tratamiento</label>
                <div className="relative">
                  <input
                    type="text"
                    value={prescriptionText}
                    onChange={(e) => setPrescriptionText(e.target.value)}
                    placeholder="E.g. Iniciar Bolo de Amiodarona 150mg IV en 10 min..."
                    className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-white font-semibold"
                    required
                  />
                  <button
                    type="submit"
                    disabled={prescribiendo}
                    className="absolute right-1.5 top-1.5 px-2 py-1 bg-red-650 hover:bg-red-700 text-white rounded-md disabled:opacity-50 transition-colors font-bold text-[10px] cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </form>

              {/* Treatments History */}
              <div className="space-y-2">
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono border-b border-slate-150 pb-1">Ordenes Registradas</span>
                <div className="max-h-[140px] overflow-y-auto space-y-2 pr-1">
                  {!selectedPatient.treatments || selectedPatient.treatments.length === 0 ? (
                    <p className="text-[10px] text-slate-400 font-semibold font-mono italic py-2 text-center">No se han emitido indicaciones farmacológicas hoy.</p>
                  ) : (
                    selectedPatient.treatments.map((tr: Treatment) => (
                      <div key={tr.id} className="bg-slate-50 p-2.5 border border-slate-200 rounded-lg flex items-center justify-between text-xs font-semibold text-slate-705">
                        <div>
                          <p className="font-bold text-slate-800">{tr.prescription}</p>
                          <p className="text-[9px] text-slate-450 mt-0.5 font-mono uppercase font-bold text-slate-400">Indicado por Dr(a). {tr.doctorName}</p>
                        </div>
                        <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                          tr.status === "ADMINISTERED" 
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                            : "bg-red-50 border-red-200 text-red-600 animate-pulse"
                        }`}>
                          {tr.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* AI clinical advisor Assistant workspace */}
            <div className="bg-indigo-50/50 border border-indigo-200 p-5 rounded-xl shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 border-b border-indigo-100 pb-2 mb-3">
                  <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Asistente Clínico IA (Gemini)</h3>
                </div>

                <p className="text-[10.5px] text-slate-500 font-semibold leading-relaxed mb-4">
                  Analiza el cuadro del paciente para sugerir pautas recomendadas en base a protocolos internacionales de urgencias médicas.
                </p>

                <div className="space-y-2.5">
                  <label className="block text-[9px] text-indigo-600 font-bold font-mono uppercase tracking-widest">Contexto Consultivo de Especialidad</label>
                  <textarea
                    rows={2}
                    value={aiDocNotes}
                    onChange={(e) => setAiDocNotes(e.target.value)}
                    placeholder="Describa el dilema específico, p. ej.: '¿Cuáles son las indicaciones de heparina si presenta infarto?'"
                    className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>

                {/* Recommendation box */}
                {aiReport ? (
                  <div className="mt-4 bg-white border border-indigo-200 p-3.5 rounded-lg space-y-2.5 max-h-[190px] overflow-y-auto pr-1 animate-fade-in shadow-xs text-slate-800">
                    <div>
                      <span className="block text-[8px] font-mono font-bold text-indigo-700 uppercase tracking-widest leading-none">Pauta Farmacológica Sugerida</span>
                      <div className="text-[11px] text-slate-700 font-semibold mt-1 space-y-1">
                        {aiReport.treatmentPlan.split("\n").map((line, idx) => (
                          <p key={idx} className="leading-snug">{line}</p>
                        ))}
                      </div>
                    </div>
                    <div className="border-t border-indigo-100 pt-2">
                      <span className="block text-[8px] font-mono font-bold text-slate-400 uppercase tracking-wider">Consideración Fisiológica</span>
                      <p className="text-[9.5px] text-slate-500 font-semibold italic leading-snug mt-0.5">"{aiReport.reasoning}"</p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 text-center text-slate-400 text-[10px] font-bold font-mono py-8 border border-slate-200 rounded-lg border-dashed bg-white">
                    PULSE EL BOTÓN INFERIOR PARA INVOCAR CONSEJO IA.
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={fetchAIDoctorAdvisor}
                disabled={loadingAIDoc}
                className="w-full py-2.5 mt-4 bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.01] text-white rounded-lg text-xs font-black tracking-widest transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {loadingAIDoc ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>CONSULTANDO PROTOCOLOS...</span>
                  </>
                ) : (
                  <>
                    <Command className="w-4 h-4 text-indigo-200" />
                    <span>CONSULTAR ASISTENTE IA</span>
                  </>
                )}
              </button>
            </div>

          </div>
        ) : (
          <div className="bg-white border border-slate-200 p-12 rounded-xl shadow-sm text-center text-slate-400">
            <Heart className="w-14 h-14 text-slate-350 mx-auto mb-4" />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-1">Estrategia Integradora de Consulta Múltiple</h3>
            <p className="text-xs max-w-sm mx-auto font-semibold text-slate-500 leading-normal">Seleccione un paciente de las Alertas en Vivo o del Directorio Clínico izquierdo para ver sus constantes, prescribir drogas vasoactivas o consultar con el Asistente Clínico de IA.</p>
          </div>
        )}
      </div>
    </div>
  );
}
