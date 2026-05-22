import React, { useState, useEffect } from "react";
import { User } from "../types";
import InsaludLogo from "./InsaludLogo";
import AnimatedAmbulance from "./AnimatedAmbulance";
import { 
  Lock, 
  User as UserIcon, 
  ShieldAlert, 
  Users, 
  Key, 
  RefreshCw, 
  Activity, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  Hospital,
  Clock
} from "lucide-react";

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Quick pre-set users list fetched on load for the "Quick Access" panel
  const [usersList, setUsersList] = useState<User[]>([]);
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    fetchUsers();

    // Setup digital clock inside login
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1005);
    return () => clearInterval(interval);
  }, []);

  const fetchUsers = async () => {
    setFetchingUsers(true);
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } catch (err) {
      console.error("No se pudo cargar la lista para acceso rápido", err);
    } finally {
      setFetchingUsers(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMsg("Debe ingresar el usuario y la contraseña.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password
        })
      });

      const data = await res.json();
      if (res.ok) {
        onLoginSuccess(data as User);
      } else {
        setErrorMsg(data.error || "Falla de credenciales");
      }
    } catch (err) {
      setErrorMsg("Falla de red. Verifique que el servidor esté activo.");
    } finally {
      setLoading(false);
    }
  };

  // Preset click autofill and auto login option
  const handleQuickSelect = (u: User) => {
    setUsername(u.username);
    setPassword(u.password || "123456"); // Uses preseeded pass optionally
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-zinc-950 to-black flex flex-col justify-between text-slate-100 font-sans relative overflow-hidden" id="login-view-container">
      
      {/* Decorative ambient background lights */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/4 w-[450px] h-[450px] bg-blue-600/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* TOP HEADER */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-white/[0.06] backdrop-blur relative z-10">
        <div className="flex items-center gap-3">
          <InsaludLogo variant="icon" className="w-[38px] h-[38px] drop-shadow-[0_2px_8px_rgba(0,133,208,0.25)]" />
          <div>
            <h1 className="text-[11.5px] font-black tracking-widest text-white uppercase">AnnASystems</h1>
            <p className="text-[8.5px] font-mono font-bold text-red-500 uppercase">INSALUD APURE / RED HOSPITALARIA</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[9px] font-mono text-slate-450 block font-bold">RED ESTADO APURE</span>
            <span className="text-[10px] font-mono text-emerald-400 block font-black">ONLINE ●</span>
          </div>
          <div className="h-8 w-[1px] bg-white/[0.08] hidden sm:block"></div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/5 border border-white/[0.08] text-slate-350 font-mono text-[11px]">
            <Clock className="w-3 h-3 text-red-400 animate-pulse" />
            <span>{currentTime || "13:15:30"}</span>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 flex flex-col lg:flex-row items-center justify-center gap-12 relative z-10">
        
        {/* LEFT PANEL: Informative and aesthetic branding (Achaguas Emergencies stats) */}
        <div className="flex-1 space-y-6 max-w-lg lg:text-left text-center flex flex-col justify-center items-center lg:items-start">
          <div className="w-56 bg-white/[0.02] p-4 rounded-2xl border border-white/[0.08] shadow-2xl backdrop-blur-sm relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 to-red-500/0 opacity-60 pointer-events-none"></div>
            <InsaludLogo variant="full" className="w-full relative z-10 drop-shadow-[0_4px_16px_rgba(0,133,208,0.15)]" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-950/40 border border-red-900/30 rounded-full text-red-400 text-[9.5px] uppercase font-bold tracking-widest font-mono">
            📌 Central de Emergencias de Apure v3.0
          </div>
          
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight uppercase leading-none">
            Coordinación Sanitaria <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-rose-450">Achaguas, Venezuela</span>
          </h2>
          
          <p className="text-xs text-slate-400 leading-relaxed font-sans font-medium">
            Bienvenido al portal oficial de control de triaje, derivación de ambulancias y saturación de camas clínicas para el municipio Achaguas. Unifique la respuesta de emergencias entre la Unidad de Emergencias Adulto del Hospital “Francisco Antonio Rísquez” de Achaguas, estado Apure y los centros asistenciales periféricos de forma digital.
          </p>

          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/[0.06]">
            <div className="p-3 bg-white/5 border border-white/[0.05] rounded-xl text-center md:text-left">
              <span className="text-[9px] font-mono uppercase tracking-widest text-slate-450 block font-bold">Respuesta</span>
              <span className="text-lg font-black text-white font-mono mt-0.5 block">TIEMPO REAL</span>
            </div>
            <div className="p-3 bg-white/5 border border-white/[0.05] rounded-xl text-center md:text-left">
              <span className="text-[9px] font-mono uppercase tracking-widest text-slate-450 block font-bold">Tecnología</span>
              <span className="text-lg font-black text-blue-400 font-mono mt-0.5 block">AnnASystems</span>
            </div>
            <div className="p-3 bg-white/5 border border-white/[0.05] rounded-xl text-center md:text-left">
              <span className="text-[9px] font-mono uppercase tracking-widest text-slate-450 block font-bold">Seguridad</span>
              <span className="text-lg font-black text-emerald-400 font-mono mt-0.5 block">SEC-ACCESS</span>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: The credentials form & quick simulate controls */}
        <div className="w-full max-w-md bg-slate-900/45 backdrop-blur-md border border-white/[0.08] p-6 rounded-2xl shadow-2xl relative">
          
          <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-red-500 to-transparent"></div>

          <div className="space-y-4">
            <div>
              <h3 className="text-md font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-red-500 shrink-0" />
                <span>Acceder al Sistema</span>
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Ingrese sus credenciales de funcionario para validarse.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-xl flex items-start gap-2 text-xs text-red-200 uppercase font-mono tracking-wider font-semibold animate-shake">
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Credentials Login Form */}
            <form onSubmit={handleLogin} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[9.5px] font-mono text-slate-400 uppercase font-black block">Nombre de Usuario (@)</label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="E.g. adams"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/[0.1] rounded-xl text-xs text-white placeholder-slate-500 font-medium text-slate-200 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-mono"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9.5px] font-mono text-slate-400 uppercase font-black block">Contraseña de Funcionario</label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="w-full pl-10 pr-10 py-2 bg-black/40 border border-white/[0.1] rounded-xl text-xs text-white placeholder-slate-500 font-medium text-slate-200 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-2.5 text-slate-500 hover:text-slate-300 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-650 hover:bg-red-700 active:bg-red-800 disabled:bg-slate-800 disabled:text-slate-500 text-white font-black tracking-widest text-[10.5px] py-2.5 px-4 rounded-xl shadow-lg border border-red-550 transition-all cursor-pointer flex items-center justify-center gap-2 uppercase"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Verificando Credenciales...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Autenticar Acceso</span>
                  </>
                )}
              </button>
            </form>

            {/* PRE-CONVERGENCIA CLINICAL TEST PANEL AT BOTTOM */}
            <div className="pt-4 border-t border-white/[0.06] space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-[9.5px] font-mono text-slate-450 uppercase font-black tracking-wider flex items-center gap-1">
                  <Users className="w-3 h-3 text-red-500" />
                  <span>Acceso Rápido / Simulación de Roles</span>
                </span>
                {fetchingUsers && <RefreshCw className="w-3 h-3 text-red-500 animate-spin" />}
              </div>

              <p className="text-[9px] text-slate-400 leading-snug">
                Haga clic sobre un funcionario del roster para rellenar instantáneamente su usuario y su clave clínica configurada de prueba:
              </p>

              <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1">
                {usersList.length === 0 ? (
                  <div className="col-span-2 text-center text-[9px] font-mono text-slate-500 py-3">
                    Cargando roster de funcionarios...
                  </div>
                ) : (
                  usersList.map((u: User) => {
                    const isSelected = username === u.username;
                    const roleColor = u.role === "ADMIN" 
                      ? "text-rose-400" 
                      : u.role === "DOCTOR" 
                      ? "text-blue-400" 
                      : u.role === "NURSE" 
                      ? "text-amber-400" 
                      : "text-emerald-400";
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleQuickSelect(u)}
                        className={`p-2 rounded-xl text-left border transition-all text-[10px] select-none ${
                          isSelected 
                            ? "bg-red-550/15 border-red-505" 
                            : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.12]"
                        }`}
                      >
                        <div className="font-extrabold text-white truncate leading-tight uppercase">{u.name}</div>
                        <div className="flex justify-between font-mono text-[8px] mt-0.5 font-bold uppercase">
                          <span className={roleColor}>{u.role}</span>
                          <span className="text-slate-500">Clave: {u.password}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Ambulance Track with animation above the footer */}
      <div className="w-full bg-black/10 border-t border-white/[0.04]">
        <AnimatedAmbulance />
      </div>

      {/* FOOTER */}
      <footer className="px-6 py-3.5 border-t border-white/[0.06] flex flex-col md:flex-row justify-between items-center text-[9.5px] text-slate-450 font-mono uppercase bg-black/25 relative z-10">
        <div>RED APURE CENTRAL COORD - ADAMS RESCUE UNIT</div>
        <div className="flex gap-4 items-center mt-2 md:mt-0">
          <span>ALMACÉN: SQLITE ENCRIPTADO</span>
          <span className="text-emerald-400 font-extrabold">● SERVIDOR ACTIVO</span>
        </div>
      </footer>

    </div>
  );
}
