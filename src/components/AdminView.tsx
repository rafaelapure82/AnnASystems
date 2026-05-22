import React, { useState } from "react";
import { Ambulance, Hospital, Incident } from "../types";
import { Hammer, Truck, Building2, MapPin, CheckCircle, TrendingUp, RefreshCw, AlertTriangle, Key } from "lucide-react";

interface AdminViewProps {
  ambulances: Ambulance[];
  hospitals: Hospital[];
  incidents: Incident[];
  onUpdateAmbulanceStatus: (id: number, status: string) => Promise<any>;
  onUpdateHospitalCapacity: (id: number, occupied: number) => Promise<any>;
  onRefresh: () => void;
}

export default function AdminView({
  ambulances,
  hospitals,
  incidents,
  onUpdateAmbulanceStatus,
  onUpdateHospitalCapacity,
  onRefresh
}: AdminViewProps) {
  
  const [selectedAmbId, setSelectedAmbId] = useState<number | null>(null);
  const [editingHospitalId, setEditingHospitalId] = useState<number | null>(null);
  const [hospitalOccupiedInput, setHospitalOccupiedInput] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const handleAmbulanceStatusChange = async (id: number, status: string) => {
    try {
      await onUpdateAmbulanceStatus(id, status);
      setActionSuccess(`Estado de Ambulancia #${id} actualizado a %${status}%`);
      onRefresh();
      setTimeout(() => setActionSuccess(""), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleHospitalCapacitySubmit = async (e: React.FormEvent, id: number) => {
    e.preventDefault();
    const parsed = parseInt(hospitalOccupiedInput);
    if (isNaN(parsed)) return;

    try {
      await onUpdateHospitalCapacity(id, parsed);
      setEditingHospitalId(null);
      setActionSuccess("Capacidad de Hospital actualizada exitosamente.");
      onRefresh();
      setTimeout(() => setActionSuccess(""), 4000);
    } catch (error) {
      console.error(error);
    }
  };

  const activeIncidents = incidents.filter(i => i.status !== "RESOLVED");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in text-slate-800">
      
      {/* Left: General Ambulance Command roster (7 cols) */}
      <div className="lg:col-span-7 bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-slate-705" />
            <h3 className="text-sm font-black text-slate-800 tracking-tight uppercase">Rúbrica de Flota de Ambulancias</h3>
          </div>
          <span className="text-[10px] font-mono font-bold text-slate-400">MONITOR CENTRAL DE FLOTA</span>
        </div>

        {actionSuccess && (
          <div className="bg-emerald-50 border border-emerald-250 text-emerald-750 text-xs py-2.5 px-4 rounded-lg font-semibold">
            {actionSuccess}
          </div>
        )}

        {/* Ambulances grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ambulances.map(amb => {
            return (
              <div key={amb.id} className="bg-slate-50 p-4 border border-slate-200 rounded-lg space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs bg-slate-200 text-slate-800 font-mono font-bold px-2 py-0.5 rounded">{amb.plate}</span>
                    <h4 className="text-[11.5px] font-black text-slate-900 mt-1 uppercase tracking-tight">{amb.model}</h4>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Paramédico: {amb.paramedicName}</p>
                  </div>
                  
                  <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${
                    amb.status === "DISPATCHED" ? "bg-red-50 border-red-200 text-red-650 animate-pulse" :
                    amb.status === "MAINTENANCE" ? "bg-amber-50 border-amber-200 text-amber-600" :
                    "bg-emerald-50 border-emerald-200 text-emerald-600"
                  }`}>
                    {amb.status}
                  </span>
                </div>

                <div className="flex gap-1.5 border-t border-slate-150 pt-2 text-[10px] justify-between items-center font-semibold">
                  <span className="text-slate-500 font-mono text-[9px]">Ubicación: {amb.currentLat.toFixed(3)}, {amb.currentLng.toFixed(3)}</span>
                  
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleAmbulanceStatusChange(amb.id, "IDLE")}
                      className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-[9px] font-black cursor-pointer uppercase transition-all shadow-sm"
                      title="Establecer Libre / Disponible"
                    >
                      IDLE
                    </button>
                    <button
                      onClick={() => handleAmbulanceStatusChange(amb.id, "MAINTENANCE")}
                      className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded text-[9px] font-black cursor-pointer uppercase transition-all shadow-sm"
                      title="Mantenimiento"
                    >
                      MANT
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Hospital occupancy Index (5 cols) */}
      <div className="lg:col-span-5 bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
          <Building2 className="w-5 h-5 text-slate-705" />
          <h3 className="text-sm font-black text-slate-800 tracking-tight uppercase">Control de Centros de Recepción</h3>
        </div>

        <div className="space-y-4">
          {hospitals.map(hosp => {
            const availableBeds = hosp.capacity - hosp.occupied;
            const percentage = (hosp.occupied / hosp.capacity) * 100;
            const isEditing = editingHospitalId === hosp.id;
            
            return (
              <div key={hosp.id} className="bg-slate-50 p-3.5 border border-slate-200 rounded-lg space-y-2.5">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">{hosp.name}</h4>
                    <span className="text-[9px] text-slate-500 font-bold font-mono uppercase">{hosp.address}</span>
                  </div>
                  <button
                    onClick={() => {
                      setEditingHospitalId(isEditing ? null : hosp.id);
                      setHospitalOccupiedInput(hosp.occupied.toString());
                    }}
                    className="px-2 py-1 text-[9.5px] cursor-pointer text-slate-700 hover:text-slate-900 font-bold border border-slate-350 rounded bg-white hover:bg-slate-100 shadow-sm transition-all"
                  >
                    {isEditing ? "Cancelar" : "Modificar"}
                  </button>
                </div>

                {isEditing ? (
                  <form onSubmit={(e) => handleHospitalCapacitySubmit(e, hosp.id)} className="flex gap-2 items-center">
                    <input
                      type="number"
                      max={hosp.capacity}
                      min="0"
                      value={hospitalOccupiedInput}
                      onChange={(e) => setHospitalOccupiedInput(e.target.value)}
                      className="w-20 px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800 font-bold focus:outline-none focus:border-red-500"
                      required
                    />
                    <span className="text-slate-500 text-xs font-semibold">/ {hosp.capacity} Camas</span>
                    <button type="submit" className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-black tracking-wider uppercase cursor-pointer shadow-sm transition-all">
                      Guardar
                    </button>
                  </form>
                ) : (
                  <div className="space-y-1.5">
                    {/* Linear Occupancy indicators */}
                    <div className="flex justify-between text-[10px] text-slate-500 font-semibold font-mono uppercase">
                      <span>Ocupación: <strong className="text-slate-900 font-mono font-bold">{hosp.occupied} / {hosp.capacity}</strong></span>
                      <span className={percentage > 85 ? "text-red-650 font-black" : "text-emerald-650"}>
                        {availableBeds} Libres {percentage > 85 && "⚠️"}
                      </span>
                    </div>

                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden border border-slate-250">
                      <div 
                        className={`h-full transition-all duration-300 rounded-full ${
                          percentage > 85 ? "bg-red-600" : percentage > 50 ? "bg-amber-505" : "bg-emerald-500"
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
