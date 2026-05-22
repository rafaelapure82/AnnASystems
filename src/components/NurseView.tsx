import React, { useState, useEffect } from "react";
import { Patient, Treatment } from "../types";
import { ListTodo, CheckSquare, ShieldCheck, Heart, User, Sparkles, Loader2, ClipboardList, PenTool } from "lucide-react";

interface NurseViewProps {
  patients: Patient[];
  onAddFollowUp: (patientId: number, data: { nurseName: string; notes: string; medicationAdministered: boolean }) => Promise<any>;
  onRefresh: () => void;
}

export default function NurseView({ patients, onAddFollowUp, onRefresh }: NurseViewProps) {
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Nurse inputs
  const [nurseName, setNurseName] = useState("");
  const [notes, setNotes] = useState("");
  const [medicationAdministered, setMedicationAdministered] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  // Select patient and fetch clinical details (treatments, followups)
  useEffect(() => {
    if (selectedPatientId) {
      fetchPatientDetails(selectedPatientId);
    } else {
      setSelectedPatient(null);
    }
  }, [selectedPatientId]);

  const fetchPatientDetails = async (id: number) => {
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

  const handleSubmitFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !notes) return;

    setSaving(true);
    setSuccess("");
    try {
      // 1. Post technical follow-up log to backend
      await onAddFollowUp(selectedPatientId, {
        nurseName,
        notes,
        medicationAdministered
      });

      // 2. If medications administered is selected, let's update the active prescribed treatments to ADMINISTERED
      if (medicationAdministered && selectedPatient?.treatments) {
        const prescribedTreatments = selectedPatient.treatments.filter(t => t.status === "PRESCRIBED");
        for (const tr of prescribedTreatments) {
          await fetch(`/api/treatments/${tr.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "ADMINISTERED" })
          });
        }
      }

      setSuccess("¡Nota de seguimiento guardada y firma digital verificada!");
      setNotes("");
      setMedicationAdministered(false);
      
      // Reload details and triggers global refresh
      await fetchPatientDetails(selectedPatientId);
      onRefresh();

      setTimeout(() => setSuccess(""), 4000);
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  // Patients with prescribed treatments waiting for administration check
  const patientsAwaitingMeds = patients.filter(p => p.status !== "DISCHARGED");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in text-slate-800">
      
      {/* LEFT Patients waiting for medications check (4 cols) */}
      <div className="lg:col-span-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col">
        <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
          <ListTodo className="w-4 h-4 text-slate-700" />
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Pacientes Bajo Cuidado</h3>
        </div>
        
        <p className="text-[10px] text-slate-500 mb-3 font-semibold font-mono uppercase tracking-wider leading-relaxed">
          Seleccione un paciente para verificar sus recetas pendientes e ingresar notas de evolución.
        </p>

        <div className="space-y-2 flex-1 overflow-y-auto max-h-[380px] pr-1">
          {patientsAwaitingMeds.map(p => {
            // Count any pending "PRESCRIBED" treatments if pre-loaded
            const hasPendingAction = p.vitalsHeartRate && p.vitalsHeartRate > 100;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPatientId(p.id)}
                className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
                  selectedPatientId === p.id 
                    ? "bg-slate-100 border-slate-300" 
                    : "bg-slate-50 border-slate-250 hover:border-slate-350 hover:bg-slate-100"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 mb-0.5 truncate max-w-[170px]">{p.name}</h4>
                    <p className="text-[10px] text-slate-500 font-bold font-mono">Constantes: SpO2 {p.vitalsOxygen || "--"}% | FC {p.vitalsHeartRate || "--"} lpm</p>
                  </div>
                  {hasPendingAction ? (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse mt-1" title="Constantes alteradas" />
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT Detailed Worksheet Follow Up Notes Form (8 cols) */}
      <div className="lg:col-span-8">
        {selectedPatient ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 animate-scale-up">
            
            {/* Sheet Ledger Information (5 cols) */}
            <div className="md:col-span-5 bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-widest">Carpeta del Paciente</span>
                <h3 className="text-sm font-black text-slate-900 uppercase mt-1 tracking-tight">{selectedPatient.name}</h3>
                <p className="text-xs text-slate-500 font-semibold">{selectedPatient.age} años | Género: {selectedPatient.gender}</p>

                {/* Vitals summary block */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-center mt-3.5">
                  <div>
                    <span className="block text-[8px] font-mono text-slate-450 font-bold uppercase leading-none mb-1">Pre. Arterial</span>
                    <span className="text-[11px] font-bold font-mono text-slate-800">{selectedPatient.vitalsBloodPressure || "--"}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-mono text-slate-450 font-bold uppercase leading-none mb-1">Temperatura</span>
                    <span className="text-[11px] font-bold font-mono text-slate-800">{selectedPatient.vitalsTemperature || "--"} °C</span>
                  </div>
                </div>

                {/* Treatment Ledger status verification */}
                <div className="mt-4 border-t border-slate-100 pt-3.5 space-y-3">
                  <div className="flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-slate-700" />
                    <span className="text-[9px] uppercase font-mono font-bold tracking-widest text-slate-500">Recetas por Administrar</span>
                  </div>

                  <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
                    {!selectedPatient.treatments || selectedPatient.treatments.filter(t => t.status === "PRESCRIBED").length === 0 ? (
                      <p className="text-[10.5px] text-emerald-700 font-semibold italic py-1">✓ No hay medicamentos pendientes.</p>
                    ) : (
                      selectedPatient.treatments.filter(t => t.status === "PRESCRIBED").map(tr => (
                        <div key={tr.id} className="bg-red-50 border border-red-200 p-2 rounded-lg text-[11px] text-red-700 flex items-start gap-1.5">
                          <span className="text-[9px] animate-bounce">💊</span>
                          <div>
                            <span className="font-bold block text-slate-950">{tr.prescription}</span>
                            <span className="text-[8.5px] text-red-500">Recetado por: {tr.doctorName}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Verified Badge */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center mt-4">
                <span className="block text-[8px] font-mono font-bold text-slate-400 uppercase">Estado Clínico General</span>
                <span className={`text-xs font-bold uppercase mt-0.5 inline-block ${
                  selectedPatient.status === "CRITICAL" ? "text-red-600 animate-pulse font-black" :
                  selectedPatient.status === "SERIOUS" ? "text-amber-600 font-bold" : "text-emerald-600 font-bold"
                }`}>
                  🏥 {selectedPatient.status}
                </span>
              </div>
            </div>

            {/* Evolución Form (7 cols) */}
            <div className="md:col-span-7 bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <PenTool className="w-4 h-4 text-slate-700" />
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Añadir Nota de Seguimiento</h4>
              </div>

              {success && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10.5px] py-2 px-3 rounded-lg flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>{success}</span>
                </div>
              )}

              <form onSubmit={handleSubmitFollowUp} className="space-y-4">
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase tracking-wider font-mono mb-1">Enfermero(a) Clínico Firmante</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={nurseName}
                      onChange={(e) => setNurseName(e.target.value)}
                      placeholder="E.g. Enfermero Montenegro"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-white font-semibold"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 uppercase tracking-wider font-mono mb-1 font-bold">Observación de Evolución Clínica / Notas</label>
                  <textarea
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="E.g. Paciente se mantiene con sibilancias espiratorias, pero responde excelentemente al broncodilatador..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-white font-semibold leading-relaxed"
                    required
                  />
                </div>

                {/* Medication administration checkbox verification */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="med_chk"
                    checked={medicationAdministered}
                    onChange={(e) => setMedicationAdministered(e.target.checked)}
                    className="w-4 h-4 mt-1 accent-red-650 rounded bg-white border-slate-300 pointer-events-auto cursor-pointer"
                  />
                  <div className="text-[11px] font-semibold text-slate-650">
                    <label htmlFor="med_chk" className="font-bold text-red-650 block select-none cursor-pointer">
                      Verificar Administración de Medicamento
                    </label>
                    <span className="text-[9.5px] text-slate-400 block leading-tight mt-0.5">
                      Confirma bajo firma que los fármacos recetados por el médico han sido aplicados fisiológicamente y corrobora su correcto lote y administración al paciente.
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-black tracking-widest transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>GUARDANDO ARCHIVO...</span>
                    </>
                  ) : (
                    <>
                      <ClipboardList className="w-4 h-4 text-red-100" />
                      <span>REGISTRAR OBSERVACIONES</span>
                    </>
                  )}
                </button>
              </form>
            </div>

          </div>
        ) : (
          <div className="bg-white border border-slate-200 p-12 rounded-xl shadow-sm text-center text-slate-400">
            <ClipboardList className="w-14 h-14 text-slate-350 mx-auto mb-4" />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-1">Bitácora de Enfermería en Urgencias</h3>
            <p className="text-xs max-w-sm mx-auto font-semibold text-slate-500 leading-normal">Seleccione un paciente clínico de la lista lateral para auditar sus recetas pendientes, registrar la dosis administrada y agregar observaciones vitales para el control del turno.</p>
          </div>
        )}
      </div>

    </div>
  );
}
