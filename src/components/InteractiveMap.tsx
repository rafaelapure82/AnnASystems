import React, { useState } from "react";
import { Ambulance, Hospital, Incident } from "../types";
import { MapPin, Activity, ShieldAlert, Crosshair, Users, ZoomIn, ZoomOut, Compass } from "lucide-react";

interface MapProps {
  incidents: Incident[];
  ambulances: Ambulance[];
  hospitals: Hospital[];
  selectedIncidentId?: number | null;
  onSelectIncident?: (id: number) => void;
}

export default function InteractiveMap({
  incidents,
  ambulances,
  hospitals,
  selectedIncidentId,
  onSelectIncident
}: MapProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [hoveredItem, setHoveredItem] = useState<{
    type: "incident" | "ambulance" | "hospital";
    name: string;
    description: string;
    x: number;
    y: number;
  } | null>(null);

  // Map limits: bounds for GPS latitude [7.8100, 7.8600] and longitude [-68.2500, -68.2000] (Achaguas, Estado Apure, Venezuela)
  const latMin = 7.8100;
  const latMax = 7.8600;
  const lngMin = -68.2500;
  const lngMax = -68.2000;

  // Convert GPS Coordinates to SVG Viewport (Width: 800, Height: 500)
  const mapWidth = 800;
  const mapHeight = 500;

  const getCoordinates = (lat: number, lng: number) => {
    // Linear normalization
    const x = ((lng - lngMin) / (lngMax - lngMin)) * mapWidth;
    // Note: Latitudes increase upwards, but SVG Y goes downwards
    const y = mapHeight - ((lat - latMin) / (latMax - latMin)) * mapHeight;
    return { x, y };
  };

  return (
    <div className="relative bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden group">
      {/* Map Control Bar */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 shadow-sm font-semibold">
        <Compass className="w-4 h-4 text-red-500 rotate-12" />
        <span className="font-mono text-[9px] tracking-wider text-slate-500">CANVAS GPS ACTIVO</span>
        <div className="w-[1px] h-3 bg-slate-200 mx-1"></div>
        <button 
          onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 2.5))}
          className="p-1 hover:text-red-600 font-bold transition-all"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button 
          onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, 0.75))}
          className="p-1 hover:text-red-600 font-bold transition-all"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
      </div>

      {/* Map Legend */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5 bg-white/95 backdrop-blur-md p-3 rounded-lg border border-slate-200 text-[10px] font-mono text-slate-700 shadow-sm">
        <div className="flex items-center gap-2 text-red-600">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
          </span>
          <span>Incidente Crítico</span>
        </div>
        <div className="flex items-center gap-2 text-amber-600">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          <span>Incidente Serio</span>
        </div>
        <div className="flex items-center gap-2 text-emerald-600">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Hospital Receptor</span>
        </div>
        <div className="flex items-center gap-2 text-cyan-600">
          <span className="w-2 h-2 rounded bg-cyan-500"></span>
          <span>Unidad de Ambulancia</span>
        </div>
      </div>

      {/* Vector/Tactical Map Stage */}
      <div className="w-full overflow-auto">
        <svg
          viewBox={`0 0 ${mapWidth} ${mapHeight}`}
          className="w-full h-auto bg-[#EDF1F7] transition-transform duration-300 transform origin-center"
          style={{ transform: `scale(${zoomLevel})` }}
          id="tactical-svg-canvas"
        >
          {/* Subtle Grid Backdrop */}
          <defs>
            <pattern id="mapGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0, 0, 0, 0.04)" strokeWidth="1" />
            </pattern>
            <radialGradient id="ambGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="critGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#mapGrid)" />

          {/* Beautiful high-contrast blue East River Path Outline */}
          <path
            d="M 120 -50 C 180 80, 240 180, 290 280 C 340 380, 480 430, 560 550 L 850 550 L 850 -50 Z"
            fill="rgba(191, 219, 254, 0.4)"
            stroke="rgba(147, 197, 253, 0.5)"
            strokeWidth="2"
          />

          {/* Main Simulated Highways */}
          <path d="M -50 150 Q 400 120, 850 310" fill="none" stroke="rgba(255, 255, 255, 0.7)" strokeWidth="8" />
          <path d="M -50 400 Q 300 250, 850 100" fill="none" stroke="rgba(255, 255, 255, 0.5)" strokeWidth="4" />
          <path d="M 200 -50 L 200 550" fill="none" stroke="rgba(0, 0, 0, 0.03)" strokeWidth="3" />
          <path d="M 600 -50 L 600 550" fill="none" stroke="rgba(0, 0, 0, 0.03)" strokeWidth="3" />

          {/* Render Hospitals */}
          {hospitals.map((hospital) => {
            const { x, y } = getCoordinates(hospital.latitude, hospital.longitude);
            const utilization = hospital.occupied / hospital.capacity;
            return (
              <g 
                key={hospital.id}
                onMouseEnter={() => setHoveredItem({
                  type: "hospital",
                  name: hospital.name,
                  description: `${hospital.address} | Camas ocupadas: ${hospital.occupied}/${hospital.capacity} (${Math.round(utilization * 105)}%)`,
                  x, y
                })}
                onMouseLeave={() => setHoveredItem(null)}
                className="cursor-help"
              >
                {/* Glow ring based on available capacity */}
                <circle cx={x} cy={y} r="16" fill="rgba(16, 185, 129, 0.15)" stroke="rgba(16, 185, 129, 0.4)" strokeDasharray="3,3" />
                <circle cx={x} cy={y} r="8" fill="#10b981" />
                {/* Red cross representation */}
                <path d={`M ${x-4} ${y} L ${x+4} ${y} M ${x} ${y-4} L ${x} ${y+4}`} stroke="#fff" strokeWidth="2" />
                {/* Text Label */}
                <text x={x + 12} y={y + 4} fill="#1e293b" fontSize="9" fontWeight="700" className="font-sans select-none pointer-events-none drop-shadow">
                  {hospital.name.split(" ").slice(0, 2).join(" ")}
                </text>
              </g>
            );
          })}

          {/* Render Ambulances */}
          {ambulances.map((ambulance) => {
            const { x, y } = getCoordinates(ambulance.currentLat, ambulance.currentLng);
            const isDispatched = ambulance.status === "DISPATCHED";
            
            return (
              <g 
                key={ambulance.id}
                onMouseEnter={() => setHoveredItem({
                  type: "ambulance",
                  name: `Ambulancia ${ambulance.plate}`,
                  description: `Paramédico: ${ambulance.paramedicName} | Estado: ${ambulance.status === "DISPATCHED" ? "Asignada a Emergencia" : "Libre/Disponible"}`,
                  x, y
                })}
                onMouseLeave={() => setHoveredItem(null)}
                className="cursor-help transition-all duration-500"
              >
                {/* Glow ring */}
                {isDispatched && (
                  <circle cx={x} cy={y} r="22" fill="url(#ambGlow)" />
                )}
                
                {/* Vehicle Base Circle */}
                <rect 
                  x={x-6} 
                  y={y-6} 
                  width="12" 
                  height="12" 
                  rx="3" 
                  fill={isDispatched ? "#0284c7" : "#64748b"} 
                  className={isDispatched ? "animate-pulse" : ""}
                />
                
                {/* Siren strobe light effect */}
                {isDispatched && (
                  <circle cx={x} cy={y-3} r="2" fill="#ef4444" className="animate-ping" />
                )}
                
                {/* Unit Text Label */}
                <text x={x - 14} y={y - 10} fill="#0369a1" fontSize="8" fontWeight="700" className="font-mono select-none pointer-events-none">
                  {ambulance.plate}
                </text>
              </g>
            );
          })}

          {/* Render Incidents */}
          {incidents.filter(inc => inc.status !== "RESOLVED").map((incident) => {
            const { x, y } = getCoordinates(incident.latitude, incident.longitude);
            const isCritical = incident.severity === "CRITICAL";
            const isSelected = selectedIncidentId === incident.id;
            
            return (
              <g 
                key={incident.id}
                onClick={() => onSelectIncident?.(incident.id)}
                onMouseEnter={() => setHoveredItem({
                  type: "incident",
                  name: incident.patientName || "Identidad Reservada",
                  description: `Sintomas: ${incident.symptoms.slice(0, 50)}... | Gravedad: ${incident.severity} | Estado: ${incident.status}`,
                  x, y
                })}
                onMouseLeave={() => setHoveredItem(null)}
                className="cursor-pointer"
              >
                {/* Outer radar warning ring */}
                <circle 
                  cx={x} 
                  cy={y} 
                  r={isSelected ? 30 : 18} 
                  fill="none" 
                  stroke={isCritical ? "#ef4444" : "#f59e0b"} 
                  strokeWidth="1.5" 
                  className={isCritical ? "animate-ping opacity-60" : "opacity-45"}
                  style={{ animationDuration: "1.8s" }}
                />

                {/* Ambient glow */}
                <circle cx={x} cy={y} r="14" fill={isCritical ? "url(#critGlow)" : "rgba(245, 158, 11, 0.15)"} />

                {/* Target reticle for active selection */}
                {isSelected && (
                  <g>
                    <path d={`M ${x-20} ${y} L ${x-10} ${y} M ${x+10} ${y} L ${x+20} ${y}`} stroke="#ef4444" strokeWidth="2" />
                    <path d={`M ${x} ${y-20} L ${x} ${y-10} M ${x} ${y+10} L ${x} ${y+20}`} stroke="#ef4444" strokeWidth="2" />
                    <circle cx={x} cy={y} r="18" fill="none" stroke="#ef4444" strokeWidth="1" strokeDasharray="2,2" />
                  </g>
                )}

                {/* Actual Pin Point */}
                <circle 
                  cx={x} 
                  cy={y} 
                  r={isSelected ? "7" : "5"} 
                  fill={isCritical ? "#ef4444" : "#f59e0b"} 
                  stroke="#ffffff" 
                  strokeWidth="1.5" 
                />
                
                {/* Signal alert tag indicators */}
                <text x={x + 10} y={y - 8} fill={isCritical ? "#991b1b" : "#92400e"} fontSize="8" fontWeight="700" className="font-mono bg-white/90 px-1 py-0.5 rounded shadow-sm uppercase tracking-wider">
                  {isCritical ? "CRIT" : "SER"}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover/Tooltip absolute panel */}
        {hoveredItem && (
          <div 
            className="absolute z-20 pointer-events-none bg-white border border-slate-200 p-3 rounded-lg shadow-lg max-w-sm"
            style={{
              left: `${Math.min(hoveredItem.x + 15, mapWidth - 250)}px`,
              top: `${Math.min(hoveredItem.y - 45, mapHeight - 80)}px`
            }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              {hoveredItem.type === "hospital" && <Activity className="w-3.5 h-3.5 text-emerald-600" />}
              {hoveredItem.type === "ambulance" && <Compass className="w-3.5 h-3.5 text-cyan-600" />}
              {hoveredItem.type === "incident" && <ShieldAlert className="w-3.5 h-3.5 text-red-600 animate-pulse" />}
              <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider">{hoveredItem.type}</span>
            </div>
            <h4 className="text-xs font-bold text-slate-800 mb-0.5">{hoveredItem.name}</h4>
            <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">{hoveredItem.description}</p>
          </div>
        )}
      </div>

      <div className="bg-slate-50 px-4 py-2 text-center text-[10px] text-slate-500 font-mono tracking-wider border-t border-slate-100 flex justify-between items-center">
        <span>RED METROPOLITANA: ACHAGUAS - APURE</span>
        <span>CENTRALIZADO EN TIEMPO REAL: GPS ACTIVO</span>
      </div>
    </div>
  );
}
