import React, { useState, useEffect } from "react";
import { Bed, Hospital, Patient } from "../types";
import { 
  Plus, 
  HelpCircle, 
  Hospital as HospIcon, 
  Layers, 
  UserPlus, 
  UserMinus, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Activity, 
  RefreshCw, 
  FileClock, 
  ChevronRight,
  ClipboardList
} from "lucide-react";

interface BedInventoryViewProps {
  hospitals: Hospital[];
  patients: Patient[];
  onRefreshAll: () => void;
  currentRole: "PARAMEDIC" | "DOCTOR" | "NURSE" | "ADMIN";
}

export default function BedInventoryView({
  hospitals,
  patients,
  onRefreshAll,
  currentRole
}: BedInventoryViewProps) {
  const [beds, setBeds] = useState<Bed[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedHospitalFilter, setSelectedHospitalFilter] = useState<string>("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");
  
  // Bed assignment states
  const [assigningBedId, setAssigningBedId] = useState<number | null>(null);
  const [searchPatientQuery, setSearchPatientQuery] = useState("");
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Load beds dynamically on component load & state changes
  useEffect(() => {
    fetchBeds();
  }, []);

  const fetchBeds = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/beds");
      if (res.ok) {
        const data = await res.json();
        setBeds(data);
      }
    } catch (err) {
      console.error("Falla al cargar inventario de camas:", err);
    } finally {
      setLoading(false);
    }
  };

  const showStatus = (text: string, type: "success" | "error") => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  };

  // Assign patient to bed
  const handleAssignPatient = async (bedId: number, patientId: number) => {
    try {
      const res = await fetch(`/api/beds/${bedId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId })
      });

      if (res.ok) {
        showStatus("¡Paciente asignado con éxito! Cama e inventario actualizado.", "success");
        setAssigningBedId(null);
        fetchBeds();
        onRefreshAll();
      } else {
        const err = await res.json();
        showStatus(err.error || "Error al asignar paciente.", "error");
      }
    } catch (err) {
      showStatus("Falla de red al intentar asignar la cama.", "error");
    }
  };

  // Release patient from bed
  const handleReleasePatient = async (bedId: number) => {
    if (!window.confirm("¿Está seguro de querer liberar esta cama? El paciente quedará registrado sin cama asignada.")) {
      return;
    }

    try {
      const res = await fetch(`/api/beds/${bedId}/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      if (res.ok) {
        showStatus("¡Cama liberada correctamente en el inventario!", "success");
        fetchBeds();
        onRefreshAll();
      } else {
        showStatus("No se pudo liberar la cama especificada.", "error");
      }
    } catch (err) {
      showStatus("Error de conexión al liberar la cama.", "error");
    }
  };

  // Toggle Bed Maintenance Status
  const handleToggleMaintenance = async (bedId: number, currentStatus: string) => {
    const nextStatus = currentStatus === "MAINTENANCE" ? "AVAILABLE" : "MAINTENANCE";
    try {
      const res = await fetch(`/api/beds/${bedId}/maintenance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });

      if (res.ok) {
        showStatus(`Estado de la cama cambiado a: ${nextStatus === "MAINTENANCE" ? "MANTENIMIENTO" : "DISPONIBLE"}`, "success");
        fetchBeds();
        onRefreshAll();
      } else {
        showStatus("Falla al regular el mantenimiento de la cama.", "error");
      }
    } catch (err) {
      showStatus("Error de red.", "error");
    }
  };

  // Auxiliary formatting of patient status for badges
  const getPatientBadgeClasses = (status: string) => {
    switch (status) {
      case "CRITICAL":
        return "bg-rose-100 text-rose-800 border-rose-200";
      case "SERIOUS":
        return "bg-amber-100 text-amber-800 border-amber-205";
      case "STABLE":
        return "bg-emerald-100 text-emerald-800 border-emerald-202";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  // Filter beds
  const filteredBeds = beds.filter(bed => {
    const matchHospital = selectedHospitalFilter === "ALL" || bed.hospitalId.toString() === selectedHospitalFilter;
    const matchStatus = selectedStatusFilter === "ALL" || bed.status === selectedStatusFilter;
    return matchHospital && matchStatus;
  });

  // Get list of patients who do not currently occupy any bed
  const unassignedPatients = patients.filter(pat => {
    if (pat.status === "DISCHARGED") return false; // Discharged patients don't need a bed
    // Check if patient occupies any bed in our local state lists
    const isOccupying = beds.some(b => b.patientId === pat.id);
    return !isOccupying;
  });

  // Filter unassigned patients by search query
  const searchedUnassignedPatients = unassignedPatients.filter(pat => 
    pat.name.toLowerCase().includes(searchPatientQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-slate-800 animate-fade-in" id="bed-inventory-view">
      
      {/* Bed inventory status alert banner */}
      {statusMessage && (
        <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 animate-slide-up border ${
          statusMessage.type === "success" 
            ? "bg-slate-900 border-slate-850 text-emerald-400" 
            : "bg-rose-900 border-rose-800 text-rose-200"
        }`}>
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider">{statusMessage.text}</span>
        </div>
      )}

      {/* Header and statistics metrics */}
      <div className="bg-gradient-to-r from-red-650 to-rose-600 p-6 rounded-2xl text-white shadow-lg space-y-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-red-200 animate-pulse" />
              <span className="text-[10px] font-mono tracking-widest font-black uppercase text-red-200">Panel Centralizado</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight mt-1 uppercase">Inventario y Asignación de Camas</h2>
            <p className="text-xs text-red-100 max-w-xl font-medium mt-1">
              Registre ingresos directamente a camas operativas en tiempo real. Mantenga el control absoluto de la capacidad de recepción en Achaguas, Apure.
            </p>
          </div>

          <button
            onClick={() => { fetchBeds(); onRefreshAll(); }}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white font-black tracking-widest text-[10px] uppercase py-2.5 px-4 rounded-xl border border-white/25 cursor-pointer backdrop-blur transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Actualizar Datos</span>
          </button>
        </div>

        {/* Global Bed Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 relative z-10">
          <div className="bg-white/10 p-3.5 rounded-xl border border-white/15">
            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-red-200 block">Camas Totales en Red</span>
            <span className="text-xl font-black mt-1 block font-mono">{beds.length}</span>
            <span className="text-[9px] opacity-75 block font-mono mt-0.5">ESTADO ACTIVO DE COORDINACIÓN</span>
          </div>

          <div className="bg-emerald-500/15 p-3.5 rounded-xl border border-emerald-500/20">
            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-emerald-200 block">Beds Disponibles (Libres)</span>
            <span className="text-xl font-black text-emerald-250 mt-1 block font-mono">
              {beds.filter(b => b.status === "AVAILABLE").length}
            </span>
            <span className="text-[9px] text-emerald-200 block font-mono mt-0.5">LISTAS PARA ASIGNACIÓN</span>
          </div>

          <div className="bg-amber-500/15 p-3.5 rounded-xl border border-amber-500/20">
            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-amber-200 block">Saturación / Ocupación</span>
            <span className="text-xl font-black text-amber-250 mt-1 block font-mono">
              {(() => {
                const total = beds.length;
                const occ = beds.filter(b => b.status === "OCCUPIED").length;
                return total > 0 ? `${Math.round((occ / total) * 100)}%` : "0%";
              })()}
            </span>
            <span className="text-[9px] text-amber-200 block font-mono mt-0.5">
              {beds.filter(b => b.status === "OCCUPIED").length} PACIENTES ACOSTADOS
            </span>
          </div>
        </div>
      </div>

      {/* Main filter cockpit */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col sm:flex-row justify-between gap-4 items-center">
        
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div>
            <label className="block text-[9px] font-mono text-slate-400 uppercase font-black mb-1">Filtrar por Hospital</label>
            <select
              value={selectedHospitalFilter}
              onChange={(e) => setSelectedHospitalFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold py-1.5 px-3 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Todos los Hospitales</option>
              {hospitals.map(h => (
                <option key={h.id} value={h.id.toString()}>{h.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[9px] font-mono text-slate-400 uppercase font-black mb-1">Estado de Cama</label>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold py-1.5 px-3 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Cualquier Estado</option>
              <option value="AVAILABLE">DISPONIBLE</option>
              <option value="OCCUPIED">OCUPADA</option>
              <option value="MAINTENANCE">MANTENIMIENTO</option>
            </select>
          </div>
        </div>

        <div className="text-xs font-mono text-slate-500 font-bold self-end sm:self-center">
          Mostrando {filteredBeds.length} de {beds.length} camas
        </div>
      </div>

      {/* Bed inventory list layout (Grid of Bed cards) */}
      {loading && beds.length === 0 ? (
        <div className="text-center py-16 text-slate-400 font-mono">
          <Activity className="w-8 h-8 animate-pulse text-rose-600 mx-auto mb-2" />
          <span>Consultando planos y asignaciones sanitarias locales...</span>
        </div>
      ) : filteredBeds.length === 0 ? (
        <div className="bg-stone-50 border border-slate-200 rounded-xl p-12 text-center text-slate-500 font-mono text-xs">
          No se encontraron camas activas que cumplan los filtros seleccionados.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredBeds.map(bed => {
            const isOccupied = bed.status === "OCCUPIED";
            const isMaintenance = bed.status === "MAINTENANCE";
            const isAvailable = bed.status === "AVAILABLE";

            // Style of card depending on status
            const cardBg = isOccupied 
              ? "bg-indigo-50/40 border-indigo-200 text-slate-800 hover:border-indigo-300"
              : isMaintenance
              ? "bg-rose-50/40 border-rose-150 text-slate-600 hover:border-rose-250"
              : "bg-emerald-50/10 border-emerald-200 text-slate-800 hover:border-emerald-300";

            return (
              <div 
                key={bed.id} 
                className={`border rounded-2xl p-4.5 transition-all hover:shadow-md flex flex-col justify-between space-y-4 ${cardBg}`}
              >
                {/* Header of bed */}
                <div className="space-y-1">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[9px] font-mono uppercase tracking-widest font-black text-slate-400">
                      CAMA HOSPITALARIA
                    </span>
                    
                    {/* Status Badge */}
                    <span className={`text-[8px] font-black tracking-widest uppercase px-2 py-0.5 rounded-md ${
                      isOccupied 
                        ? "bg-indigo-600 text-white" 
                        : isMaintenance 
                        ? "bg-rose-600 text-white" 
                        : "bg-emerald-650 text-white"
                    }`}>
                      {isOccupied ? "OCUPADA" : isMaintenance ? "MANTENIMIENTO" : "DISPONIBLE"}
                    </span>
                  </div>

                  <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5 mt-1">
                    <span className="bg-slate-100 text-slate-800 text-[10.5px] px-2.5 py-0.5 rounded font-mono font-black border uppercase">
                      {bed.bedNumber}
                    </span>
                    <span className="text-xs text-slate-400 font-mono font-medium">| {bed.roomNumber}</span>
                  </h3>

                  <p className="text-[10px] text-slate-500 font-semibold uppercase leading-tight mt-1 flex items-center gap-1.5">
                    <HospIcon className="w-3.5 h-3.5 text-slate-450 shrink-0" />
                    <span className="truncate">{bed.hospital?.name || `Hospital ID: ${bed.hospitalId}`}</span>
                  </p>
                </div>

                {/* Patient Occupier Details if occupied */}
                <div className="py-2.5 px-3 rounded-xl border border-slate-100 bg-white/80 shrink-0 space-y-1.5 min-h-[75px] flex flex-col justify-center">
                  {isOccupied && bed.patient ? (
                    <div>
                      <span className="block text-[8px] font-mono tracking-wider font-extrabold text-slate-400 uppercase leading-none">OCUPADA POR:</span>
                      <h4 className="text-xs font-black text-slate-800 uppercase mt-1 leading-tight truncate">{bed.patient.name}</h4>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[9px] font-mono text-slate-500 font-bold">{bed.patient.age} años • {bed.patient.gender[0]}</span>
                        <span className="text-slate-300">•</span>
                        <span className={`text-[8.5px] font-mono font-black px-1.5 rounded uppercase border ${getPatientBadgeClasses(bed.patient.status)}`}>
                          {bed.patient.status}
                        </span>
                      </div>
                    </div>
                  ) : isMaintenance ? (
                    <div className="text-center py-2 text-rose-800 text-[10px] font-sans font-medium">
                      <AlertTriangle className="w-4 h-4 text-rose-600 mx-auto mb-1 animate-pulse" />
                      <span>Cama desinfectándose o bajo mantenimiento estructural.</span>
                    </div>
                  ) : (
                    <div className="text-center py-2 text-emerald-800 text-[10.5px] font-bold uppercase tracking-wider">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                      <span>DISPONIBLE</span>
                    </div>
                  )}
                </div>

                {/* Operations & Interactive control cockpit for this bed */}
                <div className="space-y-2 pt-1 border-t border-slate-100 font-mono">
                  
                  {/* Actions depending on status */}
                  {isAvailable && (
                    <button
                      onClick={() => {
                        setAssigningBedId(bed.id);
                        setSearchPatientQuery("");
                      }}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black tracking-widest text-[9.5px] py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 uppercase"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-emerald-350" />
                      <span>Asignar Paciente</span>
                    </button>
                  )}

                  {isOccupied && (
                    <button
                      onClick={() => handleReleasePatient(bed.id)}
                      className="w-full bg-white hover:bg-slate-50 text-rose-700 border border-rose-205 font-black tracking-widest text-[9.5px] py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 uppercase"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                      <span>Liberar Cama</span>
                    </button>
                  )}

                  {/* Maintenance Button Toggle */}
                  {!isOccupied && (
                    <button
                      onClick={() => handleToggleMaintenance(bed.id, bed.status)}
                      className={`w-full text-[8.5px] font-black uppercase py-1 px-3.5 rounded-lg border text-center cursor-pointer transition-colors ${
                        isMaintenance 
                          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200" 
                          : "bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200"
                      }`}
                    >
                      {isMaintenance ? "✓ COMPLETAR MANTENIMIENTO" : "⚠ ENVIAR A MANTENIMIENTO"}
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* INTERACTIVE ASSIGNMENT DRAWER/MODAL PILL */}
      {assigningBedId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-350 rounded-2xl shadow-2xl w-full max-w-md p-5 animate-scale-up space-y-4">
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-rose-550 animate-bounce" />
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Asignar Cama</h3>
                  <span className="text-[9px] text-slate-400 font-mono tracking-wider font-bold">CAMA SELECCIONADA #{assigningBedId}</span>
                </div>
              </div>
              <button
                onClick={() => setAssigningBedId(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer font-black text-xs uppercase bg-slate-100 p-1 rounded-md"
              >
                Cerrar
              </button>
            </div>

            {/* Patients Search */}
            <div className="space-y-1.5">
              <label className="text-[9.5px] text-slate-500 font-mono font-black uppercase">1. Buscar ingresos activos sin cama</label>
              <input
                type="text"
                placeholder="Escribe el nombre del paciente..."
                value={searchPatientQuery}
                onChange={(e) => setSearchPatientQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-rose-500 placeholder:text-slate-400 text-slate-850"
              />
            </div>

            {/* List of eligible patients */}
            <div className="space-y-2">
              <span className="text-[9.5px] text-slate-450 font-mono font-black uppercase block">
                2. Selecciona un paciente ({unassignedPatients.length} disponibles)
              </span>
              
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 border rounded-xl p-2 bg-slate-50/50 custom-scrollbar">
                {searchedUnassignedPatients.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 font-mono text-[10px]">
                    No se hallaron pacientes elegibles activos sin cama.
                  </div>
                ) : (
                  searchedUnassignedPatients.map(pat => (
                    <div
                      key={pat.id}
                      onClick={() => handleAssignPatient(assigningBedId, pat.id)}
                      className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-rose-550/10 hover:border-rose-300 transition-all group"
                    >
                      <div>
                        <h4 className="text-xs font-black text-slate-800 uppercase group-hover:text-rose-700">{pat.name}</h4>
                        <span className="text-[9px] font-mono text-slate-400 font-semibold">{pat.age} AÑOS • {pat.gender} • GS: {pat.bloodType || "N/A"}</span>
                      </div>
                      
                      <button className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-slate-100 group-hover:bg-rose-650 group-hover:text-white text-slate-700 py-1 px-2.5 rounded-lg border transition-all">
                        <span>Asignar</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Tip about admitting new emergencies */}
            <p className="text-[9.5px] text-slate-400 leading-snug font-mono italic">
              * Nota: Si un paciente no aparece en la lista, asegúrese de registrar su triaje desde la pestaña de Paramédicos para ingresarlo oficialmente al sistema de salud.
            </p>

          </div>
        </div>
      )}

    </div>
  );
}
