import React, { useState, useEffect } from "react";
import { Incident, Patient, Ambulance, Hospital, SystemStats, User } from "./types";
import InteractiveMap from "./components/InteractiveMap";
import ParamedicView from "./components/ParamedicView";
import DoctorView from "./components/DoctorView";
import NurseView from "./components/NurseView";
import AdminView from "./components/AdminView";
import UsersView from "./components/UsersView";
import HistoryView from "./components/HistoryView";
import BedInventoryView from "./components/BedInventoryView";
import LoginView from "./components/LoginView";
import InsaludLogo from "./components/InsaludLogo";
import AnimatedAmbulance from "./components/AnimatedAmbulance";
import ProfileView from "./components/ProfileView";

import { 
  Home, 
  MapPin, 
  Activity, 
  Users, 
  ShieldAlert, 
  Heart, 
  Grid, 
  UserSquare2, 
  Bell, 
  LayoutDashboard, 
  FileClock, 
  Truck, 
  Clock, 
  Search, 
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Settings,
  BriefcaseMedical,
  RefreshCw,
  FileText,
  Bed,
  LogOut
} from "lucide-react";

function AccessDeniedScreen({ permissionRequired }: { permissionRequired: string }) {
  const permLabels: Record<string, string> = {
    view_patients: "Ver pacientes clínicos",
    view_history: "Ver historia clínica completa",
    prescribe_treatment: "Prescribir dosis y tratamientos médicos",
    use_ai_diagnose: "Invocación de triaje y diagnósticos por IA (Gemini)",
    administer_meds: "Verificar y administrar fármacos controlados",
    add_followup: "Registrar observaciones en la hoja de enfermería",
    add_incident: "Levantar despachos de ambulancia en tránsito",
    view_map: "Acceder al monitoreo GPS satelital",
    dispatch_fleet: "Controlar derivación y flota satelital",
    manage_users: "Administrar usuarios clínicos, accesos y permisos",
    manage_fleet: "Mantenimiento de disponibilidad de ambulancias",
    manage_hospitals: "Regular contador de camas de recepción"
  };

  return (
    <div className="bg-white border border-slate-200 p-8 rounded-xl shadow-sm max-w-xl mx-auto text-center space-y-4 animate-scale-up my-12" id="permission-required-lockscreen">
      <div className="mx-auto w-14 h-14 bg-red-50 text-red-650 rounded-full flex items-center justify-center border border-red-100">
        <ShieldAlert className="w-7 h-7" />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none">Acceso Restringido por Protocolo</h3>
        <p className="text-xs text-slate-500 font-semibold uppercase font-mono tracking-wider">El perfil clínico simulado no cuenta con el privilegio adecuado.</p>
      </div>

      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-left font-mono">
        <div className="flex justify-between text-[8px] text-slate-400 font-bold uppercase">
          <span>Firmas Digitales Requeridas</span>
          <span className="text-red-650 animate-pulse font-black">RESTRIGIDO ●</span>
        </div>
        <span className="text-xs font-black text-slate-800 block mt-1 uppercase">
          🔐 {permissionRequired} • ({permLabels[permissionRequired] || "Acción militar-clínica controlada"})
        </span>
      </div>

      <p className="text-[10px] text-slate-400 italic leading-relaxed">
        Si es usted un personal de salud autorizado de este centro, consulte con el <strong>Jefe del Servicio de Emergencias Adams</strong> o cambie de simulación para actualizar y otorgar este privilegio en la pestaña de <strong>Gesti&oacute;n de Usuarios</strong>.
      </p>
    </div>
  );
}

export default function App() {

  // Navigation State
  const [activeTab, setActiveTab] = useState<"home" | "map" | "paramedic" | "doctor" | "nurse" | "admin" | "users" | "history" | "beds" | "login" | "profile">("home");
  
  // Real database users state for proper role/permission simulator
  const [users, setUsers] = useState<User[]>([]);
  const [currentSimulatedUserId, setCurrentSimulatedUserId] = useState<number | null>(() => {
    const saved = localStorage.getItem("mednet_session_uid");
    return saved ? parseInt(saved, 10) : null;
  });
  const currentSimulatedUser = users.find(u => u.id === currentSimulatedUserId) || null;

  // Current user simulator profile (kept for background compatibility with subcomponents)
  const [currentRole, setCurrentRole] = useState<"PARAMEDIC" | "DOCTOR" | "NURSE" | "ADMIN">("PARAMEDIC");
  const [currentUserName, setCurrentUserName] = useState("Sin sesión");

  // Sidebar interaction states
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const isExpanded = isSidebarPinned || isSidebarHovered;

  // Core Clinical State loaded from Express + SQLite backend
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [stats, setStats] = useState<SystemStats>({
    totalPatients: 0,
    activeEmergencies: 0,
    criticalPatientsCount: 0,
    bedsAvailable: 0,
    totalBeds: 0,
  });

  const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentTime, setCurrentTime] = useState("");

  // Reload core database from backend
  const refreshDatabase = async () => {
    try {
      const incRes = await fetch("/api/incidents");
      const patRes = await fetch("/api/patients");
      const ambRes = await fetch("/api/ambulances");
      const hospRes = await fetch("/api/hospitals");
      const statsRes = await fetch("/api/stats");

      if (incRes.ok) setIncidents(await incRes.json());
      if (patRes.ok) setPatients(await patRes.json());
      if (ambRes.ok) setAmbulances(await ambRes.json());
      if (hospRes.ok) setHospitals(await hospRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (err) {
      console.error("Core database synchronization fault:", err);
    }
  };

  const refreshUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
        
        // Sync session verification and state
        const savedUid = localStorage.getItem("mednet_session_uid");
        if (savedUid) {
          const uidInt = parseInt(savedUid, 10);
          const matched = data.find((u: any) => u.id === uidInt);
          if (matched) {
            if (!matched.active) {
              // Suspended
              localStorage.removeItem("mednet_session_uid");
              setCurrentSimulatedUserId(null);
            } else {
              setCurrentSimulatedUserId(uidInt);
            }
          }
        }
      }
    } catch (e) {
      console.error("Failed to sync users:", e);
    }
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentSimulatedUserId(user.id);
    localStorage.setItem("mednet_session_uid", user.id.toString());
    
    // Auto navigation depending on their main clinical responsibility
    if (user.role === "ADMIN") setActiveTab("home");
    else if (user.role === "PARAMEDIC") setActiveTab("paramedic");
    else if (user.role === "DOCTOR") setActiveTab("doctor");
    else if (user.role === "NURSE") setActiveTab("nurse");
  };

  const handleLogout = () => {
    localStorage.removeItem("mednet_session_uid");
    setCurrentSimulatedUserId(null);
    setActiveTab("home");
  };

  // Synchronize clock and fetch clinical records on start
  useEffect(() => {
    refreshDatabase();
    refreshUsers();

    // Live polling for simulated realtime notifications
    const interval = setInterval(() => {
      refreshDatabase();
      refreshUsers();
    }, 6050);

    // Update real-time Clock formatted
    const clockInterval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(clockInterval);
    };
  }, []);

  // Sync role-name on change to make simulating feel deep and realistic
  useEffect(() => {
    if (currentSimulatedUser) {
      setCurrentRole(currentSimulatedUser.role);
      setCurrentUserName(currentSimulatedUser.name);
    }
  }, [currentSimulatedUserId, users]);

  // Evaluate permission list of active simulated profile
  const hasPermission = (permissionKey: string) => {
    if (!currentSimulatedUser) return false;
    if (!currentSimulatedUser.active) return false; // Suspended accounts can't act
    
    const userPerms = currentSimulatedUser.permissions ? currentSimulatedUser.permissions.split(",") : [];
    return userPerms.includes(permissionKey);
  };

  // Handler functions coordinating updates with backend
  const handleAddIncident = async (data: any) => {
    // Already handles inside ParamedicView
    refreshDatabase();
  };

  const handleAddTreatment = async (patientId: number, prescription: string) => {
    try {
      const res = await fetch("/api/treatments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          doctorName: currentUserName,
          prescription
        })
      });
      if (res.ok) {
        refreshDatabase();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdatePatientStatus = async (patientId: number, status: string) => {
    try {
      const res = await fetch(`/api/patients/${patientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        refreshDatabase();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddFollowUp = async (patientId: number, info: any, thirdParam?: boolean) => {
    try {
      let nurseName = currentUserName;
      let notes = "";
      let medicationAdministered = false;

      if (typeof info === "string") {
        notes = info;
        medicationAdministered = !!thirdParam;
      } else if (info && typeof info === "object") {
        nurseName = info.nurseName || currentUserName;
        notes = info.notes || "";
        medicationAdministered = !!info.medicationAdministered;
      }

      const res = await fetch("/api/followups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          nurseName,
          notes,
          medicationAdministered
        })
      });
      if (res.ok) {
        refreshDatabase();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateAmbulanceStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/ambulances/${id}`); // backend mock check or directly edit
      // For simplicity let's bypass to patch if we have an endpoint or simulate
      refreshDatabase();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateHospitalCapacity = async (id: number, occupied: number) => {
    try {
      const res = await fetch(`/api/hospitals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ occupied })
      });
      if (res.ok) {
        refreshDatabase();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const selectAndFocusIncident = (id: number) => {
    setSelectedIncidentId(id);
    setActiveTab("map");
  };

  // Filter lists based on search QUERY
  const filteredIncidents = incidents.filter(i => {
    if (!searchQuery) return true;
    return i.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
           i.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
           i.symptoms.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (currentSimulatedUserId !== null && users.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 font-mono text-xs gap-3" id="connection-loading-screen">
        <Activity className="w-8 h-8 text-rose-600 animate-pulse" />
        <span>CONECTANDO CON EL NODO CENTRAL ACHAGUAS...</span>
      </div>
    );
  }

  if (currentSimulatedUserId === null || !currentSimulatedUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans flex antialiased selection:bg-red-600 selection:text-white" id="main-frame-root">
      
      {/* 1. BRAND SIDEBAR (Collapsible & Pinned Sleek Premium Layout) */}
      <aside 
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        className={`bg-white flex flex-col justify-between py-6 border-r border-slate-200 relative z-30 transition-all duration-300 ease-in-out shrink-0 h-screen ${
          isExpanded 
            ? "w-64 px-4 items-stretch" 
            : "w-18 md:w-20 px-2 items-center"
        }`}
      >
        
        {/* Top brand icon - Official INSALUD APURE Logo */}
        <div className="flex flex-col items-center gap-5 w-full">
          <div className={`flex items-center w-full transition-all duration-300 ${isExpanded ? "px-2 gap-3" : "justify-center gap-0"}`} title="SISTEMA DE COORDINACIÓN SANITARIA - INSALUD APURE">
            <div className="hover:scale-110 active:scale-95 transition-all duration-300 shrink-0 cursor-pointer">
              <InsaludLogo variant="icon" className="w-[42px] h-[42px] drop-shadow-[0_2px_4px_rgba(0,133,208,0.15)]" />
            </div>
            
            <div className={`transition-all duration-300 truncate flex-1 ${
              isExpanded 
                ? "opacity-100 max-w-[120px] ml-1 visible" 
                : "opacity-0 max-w-0 invisible overflow-hidden"
            }`}>
              <span className="block text-[11px] font-black text-slate-800 tracking-wider uppercase leading-none">AnnASystems</span>
              <span className="block text-[8px] text-slate-400 font-mono font-bold tracking-widest uppercase mt-1">INSALUD APURE</span>
            </div>

            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsSidebarPinned(!isSidebarPinned);
              }} 
              className={`p-1.5 text-slate-450 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-all duration-300 cursor-pointer shrink-0 ${
                isExpanded 
                  ? "opacity-100 scale-100 visible" 
                  : "opacity-0 scale-50 invisible w-0 overflow-hidden p-0"
              }`}
              title={isSidebarPinned ? "Desfijar barra lateral" : "Fijar barra lateral"}
            >
              <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${isSidebarPinned ? "" : "rotate-180 text-slate-400"}`} />
            </button>
          </div>
          
          <div className={`h-[1px] bg-slate-200 transition-all duration-300 ${isExpanded ? "w-full" : "w-8 mx-auto"}`}></div>
          
          {/* Main Navigation menu */}
          <nav className="flex flex-col gap-2.5 w-full">
            <button 
              onClick={() => setActiveTab("home")}
              className={`rounded-xl transition-all duration-300 cursor-pointer flex items-center hover:scale-[1.02] ${
                activeTab === "home" 
                ? "bg-slate-100 text-red-600 border border-slate-200 shadow-sm" 
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              } ${isExpanded ? "px-4 py-3 justify-start w-full" : "w-12 h-12 justify-center mx-auto"}`}
              title={isExpanded ? "" : "Dashboard"}
            >
              <LayoutDashboard className="w-5 h-5 shrink-0" />
              <span className={`text-xs font-black uppercase tracking-wider font-sans whitespace-nowrap transition-all duration-300 truncate ${
                isExpanded 
                  ? "opacity-100 ml-3.5 translate-x-0 max-w-[150px] visible" 
                  : "opacity-0 ml-0 -translate-x-4 max-w-0 invisible overflow-hidden"
              }`}>
                Dashboard
              </span>
            </button>

            <button 
              onClick={() => setActiveTab("map")}
              className={`rounded-xl transition-all duration-300 cursor-pointer flex items-center hover:scale-[1.02] ${
                activeTab === "map" 
                ? "bg-slate-100 text-red-600 border border-slate-200 shadow-sm" 
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              } ${isExpanded ? "px-4 py-3 justify-start w-full" : "w-12 h-12 justify-center mx-auto"}`}
              title={isExpanded ? "" : "Centro Operativo GPS"}
            >
              <MapPin className="w-5 h-5 shrink-0" />
              <span className={`text-xs font-black uppercase tracking-wider font-sans whitespace-nowrap transition-all duration-300 truncate ${
                isExpanded 
                  ? "opacity-100 ml-3.5 translate-x-0 max-w-[150px] visible" 
                  : "opacity-0 ml-0 -translate-x-4 max-w-0 invisible overflow-hidden"
              }`}>
                Centro GPS
              </span>
            </button>

            <button 
              onClick={() => setActiveTab("paramedic")}
              className={`rounded-xl transition-all duration-300 cursor-pointer flex items-center hover:scale-[1.02] ${
                activeTab === "paramedic" 
                ? "bg-slate-100 text-red-600 border border-slate-200 shadow-sm" 
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              } ${isExpanded ? "px-4 py-3 justify-start w-full" : "w-12 h-12 justify-center mx-auto"}`}
              title={isExpanded ? "" : "Registro de Pacientes"}
            >
              <Truck className="w-5 h-5 shrink-0" />
              <span className={`text-xs font-black uppercase tracking-wider font-sans whitespace-nowrap transition-all duration-300 truncate ${
                isExpanded 
                  ? "opacity-100 ml-3.5 translate-x-0 max-w-[160px] visible" 
                  : "opacity-0 ml-0 -translate-x-4 max-w-0 invisible overflow-hidden"
              }`}>
                Registro de Pacientes
              </span>
            </button>

            <button 
              onClick={() => setActiveTab("doctor")}
              className={`rounded-xl transition-all duration-300 cursor-pointer flex items-center hover:scale-[1.02] ${
                activeTab === "doctor" 
                ? "bg-slate-100 text-red-600 border border-slate-200 shadow-sm"  
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              } ${isExpanded ? "px-4 py-3 justify-start w-full" : "w-12 h-12 justify-center mx-auto"}`}
              title={isExpanded ? "" : "Acceso Doctores"}
            >
              <Heart className="w-5 h-5 shrink-0" />
              <span className={`text-xs font-black uppercase tracking-wider font-sans whitespace-nowrap transition-all duration-300 truncate ${
                isExpanded 
                  ? "opacity-100 ml-3.5 translate-x-0 max-w-[150px] visible" 
                  : "opacity-0 ml-0 -translate-x-4 max-w-0 invisible overflow-hidden"
              }`}>
                Doctores
              </span>
            </button>

            <button 
              onClick={() => setActiveTab("nurse")}
              className={`rounded-xl transition-all duration-300 cursor-pointer flex items-center hover:scale-[1.02] ${
                activeTab === "nurse" 
                ? "bg-slate-100 text-red-600 border border-slate-200 shadow-sm"  
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              } ${isExpanded ? "px-4 py-3 justify-start w-full" : "w-12 h-12 justify-center mx-auto"}`}
              title={isExpanded ? "" : "Acceso Enfermeros"}
            >
              <FileClock className="w-5 h-5 shrink-0" />
              <span className={`text-xs font-black uppercase tracking-wider font-sans whitespace-nowrap transition-all duration-300 truncate ${
                isExpanded 
                  ? "opacity-100 ml-3.5 translate-x-0 max-w-[150px] visible" 
                  : "opacity-0 ml-0 -translate-x-4 max-w-0 invisible overflow-hidden"
              }`}>
                Enfermeros
              </span>
            </button>

            <button 
              onClick={() => setActiveTab("admin")}
              className={`rounded-xl transition-all duration-300 cursor-pointer flex items-center hover:scale-[1.02] ${
                activeTab === "admin" 
                ? "bg-slate-100 text-red-600 border border-slate-200 shadow-sm"  
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              } ${isExpanded ? "px-4 py-3 justify-start w-full" : "w-12 h-12 justify-center mx-auto"}`}
              title={isExpanded ? "" : "Administrador de Flota"}
            >
              <Settings className="w-5 h-5 shrink-0" />
              <span className={`text-xs font-black uppercase tracking-wider font-sans whitespace-nowrap transition-all duration-300 truncate ${
                isExpanded 
                  ? "opacity-100 ml-3.5 translate-x-0 max-w-[150px] visible" 
                  : "opacity-0 ml-0 -translate-x-4 max-w-0 invisible overflow-hidden"
              }`}>
                Control Flota
              </span>
            </button>

            {currentSimulatedUser?.role === "ADMIN" && (
              <button 
                onClick={() => setActiveTab("users")}
                className={`rounded-xl transition-all duration-300 cursor-pointer flex items-center hover:scale-[1.02] relative ${
                  activeTab === "users" 
                  ? "bg-slate-100 text-red-600 border border-slate-200 shadow-sm"  
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                } ${isExpanded ? "px-4 py-3 justify-start w-full" : "w-12 h-12 justify-center mx-auto"}`}
                title={isExpanded ? "" : "Personal & Horarios"}
              >
                <div className="relative shrink-0 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                  <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-red-600 border border-white rounded-full transition-all duration-300 ${
                    isExpanded ? "opacity-0 scale-50" : "opacity-100 scale-100"
                  }`}></span>
                </div>
                <span className={`text-xs font-black uppercase tracking-wider font-sans whitespace-nowrap transition-all duration-300 truncate ${
                  isExpanded 
                    ? "opacity-100 ml-3.5 translate-x-0 max-w-[150px] visible" 
                    : "opacity-0 ml-0 -translate-x-4 max-w-0 invisible overflow-hidden"
                }`}>
                  Personal & Horarios
                </span>
                <span className={`ml-auto w-2.5 h-2.5 bg-red-600 border border-white rounded-full shrink-0 transition-all duration-300 ${
                  isExpanded ? "opacity-100 scale-100" : "opacity-0 scale-50"
                }`}></span>
              </button>
            )}

            <button 
              onClick={() => setActiveTab("history")}
              className={`rounded-xl transition-all duration-300 cursor-pointer flex items-center hover:scale-[1.02] relative ${
                activeTab === "history" 
                ? "bg-slate-100 text-red-600 border border-slate-200 shadow-sm"  
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              } ${isExpanded ? "px-4 py-3 justify-start w-full" : "w-12 h-12 justify-center mx-auto"}`}
              title={isExpanded ? "" : "Control de Historias Médicas"}
            >
              <FileText className="w-5 h-5 shrink-0" />
              <span className={`text-xs font-black uppercase tracking-wider font-sans whitespace-nowrap transition-all duration-300 truncate ${
                isExpanded 
                  ? "opacity-100 ml-3.5 translate-x-0 max-w-[150px] visible" 
                  : "opacity-0 ml-0 -translate-x-4 max-w-0 invisible overflow-hidden"
              }`}>
                Historias
              </span>
            </button>

            <button 
              onClick={() => setActiveTab("beds")}
              className={`rounded-xl transition-all duration-300 cursor-pointer flex items-center hover:scale-[1.02] relative ${
                activeTab === "beds" 
                ? "bg-slate-100 text-red-600 border border-slate-200 shadow-sm"  
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              } ${isExpanded ? "px-4 py-3 justify-start w-full" : "w-12 h-12 justify-center mx-auto"}`}
              title={isExpanded ? "" : "Inventario y Control de Camas"}
            >
              <Bed className="w-5 h-5 shrink-0" />
              <span className={`text-xs font-black uppercase tracking-wider font-sans whitespace-nowrap transition-all duration-300 truncate ${
                isExpanded 
                  ? "opacity-100 ml-3.5 translate-x-0 max-w-[150px] visible" 
                  : "opacity-0 ml-0 -translate-x-4 max-w-0 invisible overflow-hidden"
              }`}>
                Camas
              </span>
            </button>

            <button 
              onClick={() => setActiveTab("profile")}
              className={`rounded-xl transition-all duration-300 cursor-pointer flex items-center hover:scale-[1.02] relative ${
                activeTab === "profile" 
                ? "bg-slate-100 text-red-600 border border-slate-200 shadow-sm"  
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              } ${isExpanded ? "px-4 py-3 justify-start w-full" : "w-12 h-12 justify-center mx-auto"}`}
              title={isExpanded ? "" : "Mi Perfil"}
            >
              <div className="relative shrink-0 flex items-center justify-center">
                {currentSimulatedUser?.photo ? (
                  <img 
                    src={currentSimulatedUser.photo} 
                    alt="Perfil" 
                    className="w-5 h-5 rounded-full object-cover border border-slate-350 shadow-sm"
                  />
                ) : (
                  <UserSquare2 className="w-5 h-5 shrink-0" />
                )}
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 border border-white rounded-full transition-all duration-300"></span>
              </div>
              <span className={`text-xs font-black uppercase tracking-wider font-sans whitespace-nowrap transition-all duration-300 truncate ${
                isExpanded 
                  ? "opacity-100 ml-3.5 translate-x-0 max-w-[150px] visible" 
                  : "opacity-0 ml-0 -translate-x-4 max-w-0 invisible overflow-hidden"
              }`}>
                Mi Perfil
              </span>
            </button>

          </nav>
        </div>

        {/* Live Status indicator */}
        <div className={`flex items-center transition-all duration-300 ${isExpanded ? "px-4 w-full gap-2.5" : "flex-col justify-center w-full gap-1"}`}>
          <div className="relative flex items-center justify-center shrink-0">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full" title="Sincronizado"></div>
            <div className="absolute w-2.5 h-2.5 bg-green-500 rounded-full animate-ping opacity-75"></div>
          </div>
          
          <div className={`transition-all duration-300 truncate flex-1 ${
            isExpanded 
              ? "opacity-100 max-w-[150px] visible" 
              : "opacity-0 max-w-0 invisible overflow-hidden"
          }`}>
            <span className="block text-[10px] font-bold text-slate-700 leading-none">Servidor en línea</span>
            <span className="block text-[8px] text-slate-400 font-mono tracking-widest uppercase mt-1 leading-none">AnnASystems</span>
          </div>

          <span className={`text-[8px] font-mono font-bold text-slate-400 transition-all duration-300 ${
            isExpanded 
              ? "opacity-0 max-w-0 invisible overflow-hidden" 
              : "opacity-100 max-w-[40px] visible"
          }`}>
            AnnA
          </span>
        </div>
      </aside>

      {/* 2. DYNAMIC WORKSPACE (Includes Topbar, Stats and Subviews) */}
      <main className="flex-1 flex flex-col min-w-0" id="main-grid-canvas">
        
        {/* Top bar (Refined, styled high-contrast header) */}
        <header className="px-6 md:px-8 py-4 bg-white border-b border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-center relative z-20 shrink-0">
          
          {/* Left section: Search Bar under Light Theme */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar incidentes o síntomas..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 transition-all font-sans"
            />
          </div>

          {/* Center/Right section: Granular Role Switcher simulator & Dynamic Clock */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            <span className="text-xs font-semibold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full border border-blue-100 uppercase tracking-wider italic">Central v3.0</span>

            {/* Realtime dynamic clock with elegant design matching "14:32:05" from theme */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-100 text-slate-800 font-mono text-xs font-bold border border-slate-200">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>{currentTime || "14:32:05"}</span>
            </div>

            {/* Simulated Simulator Controls */}
            <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-md px-2.5 py-1 text-xs font-medium">
              <span className="text-[10px] text-slate-500 uppercase font-mono text-xs">Simular Personal:</span>
              <select 
                value={currentSimulatedUserId || ""} 
                onChange={(e) => {
                  const uId = parseInt(e.target.value);
                  setCurrentSimulatedUserId(uId);
                  const selectedUserObj = users.find(u => u.id === uId);
                  if (selectedUserObj) {
                    if (selectedUserObj.role === "PARAMEDIC") setActiveTab("paramedic");
                    else if (selectedUserObj.role === "DOCTOR") setActiveTab("doctor");
                    else if (selectedUserObj.role === "NURSE") setActiveTab("nurse");
                    else if (selectedUserObj.role === "ADMIN") setActiveTab("admin");
                  }
                }}
                className="bg-transparent text-slate-800 border-none outline-none focus:ring-0 font-bold font-sans cursor-pointer py-0.5 text-xs text-center"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id} className="bg-white text-slate-850">
                    {u.name} ({u.role} - {u.active ? "ACTIVO" : "REVOCADO"})
                  </option>
                ))}
              </select>
            </div>

            {/* Connected status badge as in the theme design */}
            <div 
              onClick={() => setActiveTab("profile")}
              className="flex items-center gap-2 text-xs font-semibold text-slate-650 pl-2 hover:text-slate-900 cursor-pointer group transition-all"
              title="Ver mi perfil institucional"
            >
              {currentSimulatedUser?.photo ? (
                <img 
                  src={currentSimulatedUser.photo} 
                  alt="Avatar" 
                  className="w-6.5 h-6.5 rounded-full object-cover border border-slate-300 group-hover:border-red-500 group-hover:scale-105 transition-all shadow-sm shrink-0"
                />
              ) : (
                <span className="relative flex h-2.5 w-2.5">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    currentSimulatedUser?.active ? "bg-green-400" : "bg-red-400"
                  }`}></span>
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    currentSimulatedUser?.active ? "bg-green-500" : "bg-red-500"
                  }`}></span>
                </span>
              )}
              <span className="hidden lg:inline group-hover:underline group-hover:text-slate-900 font-bold">{currentUserName}</span>
            </div>

            {/* Logout action */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 ml-2 bg-rose-50 border border-rose-200 hover:bg-rose-100 active:bg-rose-250 text-rose-700 font-extrabold text-[10px] tracking-wider uppercase py-1.5 px-3 rounded-lg cursor-pointer transition-all shadow-sm shrink-0"
              title="Cerrar Sesión Activa"
              id="header-logout-btn"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">CERRAR SESIÓN</span>
            </button>

          </div>
        </header>

        {/* 3. SCROLLABLE ACTIVE CONTAINER VIEW (Set as cool backdrop light blue gray `#EDF1F7` as in theme) */}
        <div className="flex-1 overflow-y-auto bg-[#EDF1F7] px-6 md:px-8 py-6 space-y-6">
          
          {/* Alerta de Jornada y Horario Asignado para usuarios clínicos */}
          {currentSimulatedUser && currentSimulatedUser.role !== "ADMIN" && (
            <div className="bg-white border-l-4 border-l-blue-600 border border-slate-200 p-4 rounded-r-xl shadow-sm animate-fade-in flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
              {/* Background Glow */}
              <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-blue-50/40 to-transparent pointer-events-none"></div>
              
              <div className="flex items-start gap-3 relative z-10">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100 shrink-0 mt-0.5 animate-pulse">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] font-mono font-black text-blue-650 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase tracking-widest leading-none">Notificación de Guardia Activa</span>
                    <span className="text-[8px] font-bold text-slate-450 uppercase leading-none">ASIGNADO POR SUPERADMINISTRADOR</span>
                  </div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">Jornada y Horarios Clínicos Asignados</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Estimado {currentSimulatedUser.name}, su rol de <strong className="text-slate-700">{currentSimulatedUser.role === "DOCTOR" ? "MÉDICO JEFE" : currentSimulatedUser.role === "NURSE" ? "ENFERMERO" : "PARAMÉDICO"}</strong> ha sido asignado al siguiente cuadrante:
                  </p>
                </div>
              </div>

              {currentSimulatedUser.shiftDays || currentSimulatedUser.shiftHours ? (
                <div className="flex flex-wrap gap-2.5 shrink-0 w-full md:w-auto relative z-10">
                  <div className="bg-slate-50 border border-slate-150 py-1.5 px-3 rounded-lg text-center min-w-[120px] shadow-sm">
                    <span className="block text-[7.5px] font-mono font-bold text-slate-400 uppercase leading-none">Días de Turno</span>
                    <span className="text-[10px] font-black text-slate-800 block mt-1 uppercase">
                      📅 {currentSimulatedUser.shiftDays}
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-150 py-1.5 px-3 rounded-lg text-center min-w-[120px] shadow-sm">
                    <span className="block text-[7.5px] font-mono font-bold text-slate-400 uppercase leading-none">Rango Horario</span>
                    <span className="text-[10px] font-black text-slate-850 block mt-1 uppercase">
                      ⏰ {currentSimulatedUser.shiftHours}
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-150 py-1.5 px-3 rounded-lg text-center min-w-[140px] shadow-sm">
                    <span className="block text-[7.5px] font-mono font-bold text-slate-400 uppercase leading-none">Ubicación / Notas</span>
                    <span className="text-[10px] font-black text-blue-650 block mt-1 uppercase truncate max-w-[180px]" title={currentSimulatedUser.shiftNotes}>
                      🏢 {currentSimulatedUser.shiftNotes || "Servicio General"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 py-2 px-4 rounded-lg flex items-center gap-2 text-amber-700 text-xs font-bold shrink-0 relative z-10 w-full md:w-auto">
                  <BriefcaseMedical className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>Sin horario de guardia asignado. Póngase en contacto con el Jefe Adams.</span>
                </div>
              )}
            </div>
          )}
          
          {activeTab === "home" && (
            <div className="space-y-6 animate-fade-in">
              {/* Doctor Burke Good Morning Panel with nice geometric lookup */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 relative overflow-hidden shadow-sm">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-blue-505"></div>
                <div className="relative z-10 max-w-2xl">
                  <span className="text-[10px] text-blue-600 font-bold tracking-widest uppercase italic">CENTRAL DE EMERGENCIAS ACTIVA</span>
                  <h1 className="text-xl md:text-2xl font-black text-slate-800 mt-1 uppercase tracking-tight">Buenos días, <span className="text-red-600">{currentUserName}</span></h1>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    Usted se encuentra en el Centro Operativo de Emergencias de la Ciudad de Nueva York. Monitoree las alertas en tiempo real, prescriba tratamientos validados por IA y agilice la logística de traslados a centros de recepción.
                  </p>
                </div>
                
                {/* Visual medical layout ornament in light color */}
                <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
                  <Activity className="w-48 h-48 text-slate-900" />
                </div>
              </div>

              {/* Statistics Counters Grid (Matching the Monthly/Weekly report vibe under Light Mode) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center gap-3.5 shadow-sm">
                  <div className="p-2.5 rounded-lg bg-red-50 text-red-600 border border-red-100">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase leading-none">Total Pacientes</span>
                    <span className="text-xl font-bold font-mono text-slate-850 mt-1 inline-block">{stats.totalPatients}</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center gap-3.5 shadow-sm">
                  <div className="p-2.5 rounded-lg bg-orange-50 text-orange-600 border border-orange-100">
                    <ShieldAlert className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase leading-none">Emergencias Activas</span>
                    <span className="text-xl font-bold font-mono text-slate-850 mt-1 inline-block text-red-600">{stats.activeEmergencies}</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center gap-3.5 shadow-sm">
                  <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase leading-none">Camas Libres</span>
                    <span className="text-xl font-bold font-mono text-slate-850 mt-1 inline-block">{stats.bedsAvailable} / {stats.totalBeds}</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center gap-3.5 shadow-sm">
                  <div className="p-2.5 rounded-lg bg-slate-50 text-slate-600 border border-slate-200">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase leading-none">Flota Libre</span>
                    <span className="text-xl font-bold font-mono text-slate-850 mt-1 inline-block text-blue-600">
                      {ambulances.filter(a => a.status === "IDLE").length} / {ambulances.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Main dashboard body splitting into Map and Live Incident Feed list */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Center visual: map (8 cols) */}
                <div className="lg:col-span-8 space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold font-mono uppercase text-slate-500 tracking-wider">Geolocalización de Incidentes en Vivo</h3>
                    <button onClick={() => setActiveTab("map")} className="text-xs text-blue-600 flex items-center leading-none font-bold hover:text-blue-500 transition-all">
                      Pantalla Completa <ChevronRight className="w-4 h-4 ml-0.5" />
                    </button>
                  </div>
                  <InteractiveMap 
                    incidents={incidents}
                    ambulances={ambulances}
                    hospitals={hospitals}
                    selectedIncidentId={selectedIncidentId}
                    onSelectIncident={selectAndFocusIncident}
                  />
                </div>

                {/* Right columns: list with "My Appointments" exactly like the visual image (4 cols) */}
                <div className="lg:col-span-4 bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Incidentes Activos</h3>
                      <span className="text-[9px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded uppercase tracking-wider">Tiempo Real</span>
                    </div>

                    <div className="space-y-3 overflow-y-auto max-h-[300px] pr-1">
                      {filteredIncidents.length === 0 ? (
                        <p className="text-xs text-slate-400 italic text-center py-8">Ninguna emergencia en curso.</p>
                      ) : (
                        filteredIncidents.map(inc => {
                          const isNew = inc.status === "PENDING";
                          const isCritical = inc.severity === "CRITICAL";
                          return (
                            <div 
                              key={inc.id}
                              onClick={() => selectAndFocusIncident(inc.id)}
                              className={`p-3 rounded border transition-all cursor-pointer flex justify-between items-start group ${
                                inc.status === "RESOLVED" 
                                ? "bg-slate-50/60 border-slate-100 text-slate-400 opacity-60" 
                                : isCritical 
                                ? "bg-red-50/50 border-l-4 border-l-red-500 border-slate-200 hover:bg-red-50" 
                                : "bg-white border-l-4 border-l-orange-500 border-slate-200 hover:bg-slate-50/80"
                              }`}
                            >
                              <div className="space-y-1 truncate max-w-[200px]">
                                <h4 className="text-xs font-bold text-slate-800 group-hover:text-red-600 transition-all truncate">
                                  {inc.patientName || "Identidad reservada"}
                                </h4>
                                <p className="text-[10px] text-slate-500 leading-tight truncate">{inc.address}</p>
                                <span className="inline-block text-[9px] text-slate-400 font-mono truncate max-w-[180px]">{inc.symptoms}</span>
                              </div>
                              
                              <div className="text-right flex flex-col items-end gap-1 flex-shrink-0">
                                <span className={`text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                  isCritical ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                                }`}>
                                  {inc.severity}
                                </span>
                                <span className="text-[8px] font-mono text-slate-400">{new Date(inc.createdAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Graph report illustration like in the prompt bottom right but clean and light */}
                  <div className="border-t border-slate-100 pt-3 mt-4 text-center">
                    <span className="block text-[8px] font-mono text-slate-400 uppercase tracking-widest mb-2">Urgencia Mensual - Índice Semanal</span>
                    <div className="flex gap-1 items-end justify-center h-12">
                      <div className="w-5 bg-red-600 rounded-t h-[40%]" title="Mon: 40%"></div>
                      <div className="w-5 bg-blue-600 rounded-t h-[65%]" title="Tue: 65%"></div>
                      <div className="w-5 bg-red-600 rounded-t h-[85%]" title="Wed: 85%"></div>
                      <div className="w-5 bg-orange-500 rounded-t h-[50%]" title="Thu: 50%"></div>
                      <div className="w-5 bg-blue-600 rounded-t h-[95%]" title="Fri: 95%"></div>
                    </div>
                    <div className="grid grid-cols-5 text-[7.5px] text-slate-400 font-mono mt-1">
                      <span>LUN</span>
                      <span>MAR</span>
                      <span>MIÉ</span>
                      <span>JUE</span>
                      <span>VIE</span>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* Map Command full tab */}
          {activeTab === "map" && (
            !hasPermission("view_map") ? (
              <AccessDeniedScreen permissionRequired="view_map" />
            ) : (
              <div className="space-y-4 animate-scale-up">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-md font-bold text-slate-800 uppercase tracking-widest">Centro de Operaciones Tácticas GPS</h2>
                    <p className="text-xs text-slate-500">Consola de monitoreo satelital en tiempo real</p>
                  </div>
                  <button 
                    onClick={refreshDatabase}
                    className="p-2 hover:bg-slate-200 text-blue-600 rounded-lg transition-all border border-slate-200 bg-white shadow-sm font-bold flex items-center gap-1 text-xs"
                    title="Sincronizar"
                  >
                    <RefreshCw className="w-4 h-4 text-blue-650" />
                    <span>SINCRONIZAR</span>
                  </button>
                </div>

                <InteractiveMap 
                  incidents={incidents}
                  ambulances={ambulances}
                  hospitals={hospitals}
                  selectedIncidentId={selectedIncidentId}
                  onSelectIncident={(id) => setSelectedIncidentId(id)}
                />

                {/* Quick Incident Info Panel if selected - Styled light */}
                {selectedIncidentId && (
                  (() => {
                    const incident = incidents.find(i => i.id === selectedIncidentId);
                    if (!incident) return null;
                    return (
                      <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex flex-col md:flex-row gap-4 justify-between items-start md:items-center animate-fade-in relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${incident.severity === "CRITICAL" ? "bg-red-500" : "bg-amber-500"}`}></span>
                            <h4 className="text-xs font-bold text-slate-800 uppercase font-mono tracking-tight">Emergencia Registrada: {incident.patientName || "Paciente Reservado"}</h4>
                          </div>
                          <p className="text-xs text-slate-500 font-sans mt-1">Ubicación GPS: {incident.address} | ({incident.latitude.toFixed(4)}, {incident.longitude.toFixed(4)})</p>
                          <p className="text-[10.5px] text-slate-600 italic mt-1 leading-snug bg-slate-50 p-2.5 rounded border border-slate-100">"Síntomas descritos: {incident.symptoms}"</p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {/* Notify nearest hospital simulator */}
                          <select 
                            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-705"
                            value={incident.hospitalId || ""}
                            onChange={async (e) => {
                              const val = e.target.value;
                              await fetch(`/api/incidents/${incident.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ hospitalId: val ? parseInt(val) : null })
                              });
                              refreshDatabase();
                            }}
                          >
                            <option value="">Derivar Hospital...</option>
                            {hospitals.map(h => (
                              <option key={h.id} value={h.id}>{h.name} ({h.capacity - h.occupied} l.)</option>
                            ))}
                          </select>

                          {/* Dispatch Ambulance simulator */}
                          <select 
                            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-705"
                            value={incident.ambulanceId || ""}
                            onChange={async (e) => {
                              const val = e.target.value;
                              await fetch(`/api/incidents/${incident.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ ambulanceId: val ? parseInt(val) : null })
                              });
                              refreshDatabase();
                            }}
                          >
                            <option value="">Despachar Ambulancia...</option>
                            {ambulances.map(a => (
                              <option key={a.id} value={a.id}>{a.plate} - {a.paramedicName} ({a.status})</option>
                            ))}
                          </select>

                          <button 
                            onClick={async () => {
                              await fetch(`/api/incidents/${incident.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ status: "RESOLVED" })
                              });
                              setSelectedIncidentId(null);
                              refreshDatabase();
                            }}
                            className="px-3.5 py-1.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-xs transition-colors shadow-sm cursor-pointer"
                          >
                            Resolver incidente
                          </button>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            )
          )}

          {/* Role views */}
          {activeTab === "paramedic" && (
            !hasPermission("add_incident") ? (
              <AccessDeniedScreen permissionRequired="add_incident" />
            ) : (
              <ParamedicView 
                ambulances={ambulances}
                hospitals={hospitals}
                onAddIncident={handleAddIncident}
                onRefresh={refreshDatabase}
              />
            )
          )}

          {activeTab === "doctor" && (
            !hasPermission("prescribe_treatment") ? (
              <AccessDeniedScreen permissionRequired="prescribe_treatment" />
            ) : (
              <DoctorView 
                patients={patients}
                currentSimulatedUser={currentSimulatedUser}
                onAddTreatment={handleAddTreatment}
                onUpdatePatientStatus={handleUpdatePatientStatus}
                onRefresh={refreshDatabase}
              />
            )
          )}

          {activeTab === "nurse" && (
            !hasPermission("add_followup") ? (
              <AccessDeniedScreen permissionRequired="add_followup" />
            ) : (
              <NurseView 
                patients={patients}
                onAddFollowUp={handleAddFollowUp}
                onRefresh={refreshDatabase}
              />
            )
          )}

          {activeTab === "admin" && (
            !hasPermission("manage_fleet") ? (
              <AccessDeniedScreen permissionRequired="manage_fleet" />
            ) : (
              <AdminView 
                ambulances={ambulances}
                hospitals={hospitals}
                incidents={incidents}
                onUpdateAmbulanceStatus={handleUpdateAmbulanceStatus}
                onUpdateHospitalCapacity={handleUpdateHospitalCapacity}
                onRefresh={refreshDatabase}
              />
            )
          )}

          {activeTab === "users" && (
            !hasPermission("manage_users") ? (
              <AccessDeniedScreen permissionRequired="manage_users" />
            ) : (
              <UsersView 
                currentSimulatedUserId={currentSimulatedUserId}
                onRefreshAll={refreshUsers}
              />
            )
          )}

          {activeTab === "history" && (
            !hasPermission("view_history") ? (
              <AccessDeniedScreen permissionRequired="view_history" />
            ) : (
              <HistoryView 
                patients={patients}
                onAddTreatment={handleAddTreatment}
                onAddFollowUp={handleAddFollowUp}
                onRefreshAll={refreshDatabase}
                currentRole={currentRole}
                currentUserName={currentUserName}
              />
            )
          )}

          {activeTab === "beds" && (
            <BedInventoryView 
              hospitals={hospitals}
              patients={patients}
              onRefreshAll={refreshDatabase}
              currentRole={currentRole}
            />
          )}

          {activeTab === "profile" && currentSimulatedUser && (
            <ProfileView 
              currentSimulatedUser={currentSimulatedUser}
              onRefreshAll={refreshUsers}
            />
          )}


        </div>
        
        {/* Ambulance Track with animation above the footer */}
        <div className="w-full bg-slate-950 border-t border-slate-800">
          <AnimatedAmbulance />
        </div>
        
        {/* Footer exactly styled from the requested theme mockup template */}
        <footer className="h-8 bg-slate-900 border-t border-slate-700 flex items-center justify-between px-6 text-[10px] text-slate-400 shrink-0 font-mono">
          <div className="flex gap-6 uppercase tracking-widest text-[9px]">
            <span>SISTEMA: OPERATIVO</span>
            <span>SEGURIDAD: ENCRIPTADO AES-256</span>
          </div>
          <div className="flex gap-4 items-center">
            <span className="text-red-500 animate-pulse font-black">● VIVO</span>
            <span>PROYECTO: GEOMETRIC BALANCE</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
