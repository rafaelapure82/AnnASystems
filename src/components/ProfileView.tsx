import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { User } from "../types";
import { 
  UserCircle, 
  Lock, 
  Upload, 
  Printer, 
  Clock, 
  ShieldCheck, 
  CreditCard,
  X,
  AlertCircle,
  Shield
} from "lucide-react";

interface ProfileViewProps {
  currentSimulatedUser: User | null;
  onRefreshAll: () => void;
}

export default function ProfileView({ currentSimulatedUser, onRefreshAll }: ProfileViewProps) {
  const [nameInput, setNameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [photoInput, setPhotoInput] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"details" | "card">("card"); // Default to showing the beautiful card first!
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Sync inputs with simulated user
  useEffect(() => {
    if (currentSimulatedUser) {
      setNameInput(currentSimulatedUser.name);
      setPhotoInput(currentSimulatedUser.photo || null);
    }
  }, [currentSimulatedUser]);

  // Generate QR Code dynamically
  useEffect(() => {
    if (currentSimulatedUser) {
      const payload = {
        id: currentSimulatedUser.id,
        username: currentSimulatedUser.username,
        name: currentSimulatedUser.name,
        role: currentSimulatedUser.role,
        status: currentSimulatedUser.active ? "ACTIVO" : "INACTIVO",
        system: "AnnASystems - INSALUD APURE"
      };
      QRCode.toDataURL(JSON.stringify(payload), {
        width: 150,
        margin: 1,
        color: {
          dark: "#0f172a",
          light: "#ffffff"
        }
      })
      .then(url => setQrCodeUrl(url))
      .catch(err => console.error("Error generating QR code in Profile:", err));
    } else {
      setQrCodeUrl("");
    }
  }, [currentSimulatedUser, nameInput]);

  if (!currentSimulatedUser) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] text-slate-400">
        <AlertCircle className="w-12 h-12 mb-2 text-slate-350 animate-bounce" />
        <p className="text-xs font-semibold uppercase tracking-wider font-mono">No se detecta un usuario clínico en simulación activa.</p>
      </div>
    );
  }

  // Handle Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      showToast("El nombre completo no puede estar vacío.", "error");
      return;
    }

    setSaving(true);
    try {
      const body: any = {
        name: nameInput,
        photo: photoInput
      };
      if (passwordInput.trim()) {
        body.password = passwordInput;
      }

      const res = await fetch(`/api/users/${currentSimulatedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        showToast("¡Perfil actualizado con éxito!");
        setPasswordInput(""); // Clear password field
        // Reactive synchronisation loop!
        onRefreshAll();
      } else {
        const errData = await res.json();
        showToast(errData.error || "No se pudo guardar la información del perfil.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error de red al sincronizar perfil.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Printable ID Card Function
  const handlePrintCard = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showToast("No se pudo abrir la ventana de impresión. Compruebe si tiene bloqueadores de ventanas emergentes.", "error");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Carné Institucional - ${currentSimulatedUser.name}</title>
          <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800;900&family=Inter:wght@400;600;750;900&display=swap" rel="stylesheet">
          <style>
            body {
              margin: 0;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              background-color: #f8fafc;
              font-family: 'Outfit', 'Inter', sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .card-container {
              width: 320px;
              height: 500px;
              background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
              border-radius: 20px;
              padding: 24px;
              box-sizing: border-box;
              color: #ffffff;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              align-items: center;
              border: 3px solid #dc2626;
              box-shadow: 0 10px 25px rgba(0,0,0,0.3);
              position: relative;
              overflow: hidden;
            }
            .card-container::before {
              content: '';
              position: absolute;
              top: 0; left: 0; right: 0; bottom: 0;
              background: radial-gradient(circle at top right, rgba(220, 38, 38, 0.18), transparent 60%);
              pointer-events: none;
            }
            .card-header {
              text-align: center;
              width: 100%;
              border-bottom: 1px solid rgba(255,255,255,0.1);
              padding-bottom: 12px;
            }
            .govt {
              font-size: 7.5px;
              letter-spacing: 1.5px;
              font-weight: 800;
              color: #94a3b8;
              text-transform: uppercase;
              margin: 0;
            }
            .dept {
              font-size: 10px;
              letter-spacing: 2px;
              font-weight: 900;
              color: #dc2626;
              text-transform: uppercase;
              margin: 3px 0 0 0;
            }
            .sys {
              font-size: 8px;
              font-weight: 600;
              color: #cbd5e1;
              margin-top: 2px;
            }
            .photo-frame {
              width: 130px;
              height: 130px;
              border-radius: 50%;
              border: 3px solid #dc2626;
              overflow: hidden;
              display: flex;
              align-items: center;
              justify-content: center;
              background-color: #1e293b;
              box-shadow: 0 4px 10px rgba(0,0,0,0.5);
              margin: 15px 0;
            }
            .photo-frame img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            .photo-frame svg {
              width: 65px;
              height: 65px;
              color: #475569;
            }
            .user-name {
              font-size: 17px;
              font-weight: 900;
              text-transform: uppercase;
              text-align: center;
              margin: 0;
              letter-spacing: -0.5px;
              color: #ffffff;
            }
            .user-role {
              font-size: 9.5px;
              font-weight: 800;
              letter-spacing: 2px;
              background-color: rgba(220, 38, 38, 0.15);
              border: 1px solid rgba(220, 38, 38, 0.3);
              color: #f87171;
              padding: 3.5px 12px;
              border-radius: 9999px;
              text-transform: uppercase;
              margin-top: 6px;
            }
            .shift-info {
              font-size: 8px;
              font-weight: 600;
              color: #94a3b8;
              margin-top: 8px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              text-align: center;
            }
            .card-footer {
              width: 100%;
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-top: 1px solid rgba(255,255,255,0.1);
              padding-top: 12px;
              margin-top: auto;
            }
            .barcode-container {
              display: flex;
              flex-direction: column;
              align-items: flex-start;
            }
            .barcode-line {
              font-family: monospace;
              font-size: 13px;
              letter-spacing: -1.2px;
              color: #ffffff;
              font-weight: bold;
              opacity: 0.85;
            }
            .barcode-text {
              font-size: 7px;
              font-family: monospace;
              color: #94a3b8;
              margin-top: 2px;
              letter-spacing: 1px;
            }
            .qr-container {
              width: 70px;
              height: 70px;
              background-color: #ffffff;
              padding: 4px;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .qr-container img {
              width: 100%;
              height: 100%;
            }
            @media print {
              body {
                background: none;
              }
              .card-container {
                box-shadow: none;
                border: 3px solid #000000;
              }
            }
          </style>
        </head>
        <body>
          <div class="card-container">
            <div class="card-header">
              <div class="govt">República Bolivariana de Venezuela</div>
              <div class="dept">Insalud Apure</div>
              <div class="sys">AnnASystems - Credencial Clínica</div>
            </div>
            
            <div class="photo-frame">
              ${photoInput ? `<img src="${photoInput}" />` : `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:65px; height:65px; color:#475569;">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              `}
            </div>

            <div style="display: flex; flex-direction: column; align-items: center;">
              <div class="user-name">${nameInput}</div>
              <div class="user-role">${currentSimulatedUser.role === "ADMIN" ? "SUPERADMINISTRADOR" : currentSimulatedUser.role}</div>
              <div class="shift-info">
                ${currentSimulatedUser.shiftDays ? `Jornada: ${currentSimulatedUser.shiftDays}` : "Jornada General"}
                <br/>
                ${currentSimulatedUser.shiftHours ? `Turno: ${currentSimulatedUser.shiftHours}` : ""}
              </div>
            </div>

            <div class="card-footer">
              <div class="barcode-container">
                <div class="barcode-line">||||| | |||| || || | |||</div>
                <div class="barcode-text">CLINIC-ID-${String(currentSimulatedUser.id).padStart(4, "0")}</div>
              </div>
              
              <div class="qr-container">
                <img src="${qrCodeUrl}" />
              </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in text-slate-800" id="profile-module-container">
      
      {/* LEFT PANEL: Editing settings and Shift assignment review (7 columns) */}
      <div className="lg:col-span-7 bg-white border border-slate-200 p-5 rounded-xl shadow-sm h-[650px] flex flex-col justify-between" id="profile-edit-section">
        <div className="space-y-4 overflow-y-auto pr-1 flex-1 pb-4">
          
          {/* Section Header */}
          <div className="flex items-center gap-2 border-b border-slate-150 pb-3 mb-2 shrink-0">
            <UserCircle className="w-5 h-5 text-red-650" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Mi Perfil Clínico</h3>
          </div>

          <p className="text-[10px] text-slate-500 font-semibold font-mono tracking-wider uppercase leading-snug mb-4 shrink-0">
            Gestione su fotografía institucional tipo carné, actualice su nombre o contraseña de acceso, y verifique su jornada laboral.
          </p>

          {/* Toast Alert */}
          {toastMessage && (
            <div className={`mb-3.5 p-2.5 rounded-lg border text-xs font-bold transition-all animate-scale-up py-2 px-3 flex items-center gap-2 shrink-0 ${
              toastMessage.type === "success" 
                ? "bg-green-50 border-green-200 text-green-700" 
                : "bg-red-50 border-red-200 text-red-700"
            }`}>
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>{toastMessage.text}</span>
            </div>
          )}

          {/* Setting Form fields */}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            
            {/* Passport Photo Selector with interactive preview */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center gap-4">
              <div className="shrink-0 relative">
                {photoInput ? (
                  <img 
                    src={photoInput} 
                    alt="Tu foto carné" 
                    className="w-20 h-20 rounded-full object-cover border-2 border-red-650 shadow-md"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                    <UserCircle className="w-10 h-10" />
                  </div>
                )}
                {photoInput && (
                  <button
                    type="button"
                    onClick={() => setPhotoInput(null)}
                    className="absolute -top-1 -right-1 bg-red-600 hover:bg-red-750 text-white rounded-full p-0.5 cursor-pointer shadow-sm border border-white"
                    title="Remover foto"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="flex-1 space-y-1">
                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">Foto de tipo carné</span>
                <p className="text-[9px] text-slate-400 font-mono">Cargue su foto institucional tipo carné. Formato óptimo cuadrado (Max 1MB).</p>
                
                <label className="inline-flex items-center gap-1 bg-white hover:bg-slate-50 border border-slate-250 text-slate-700 hover:text-slate-800 text-[10px] font-bold px-2.5 py-1.5 rounded-lg cursor-pointer transition-all shadow-sm">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{photoInput ? "CAMBIAR FOTO" : "SELECCIONAR FOTO"}</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 1024 * 1024) {
                          showToast("La foto de carné no debe exceder 1MB.", "error");
                          return;
                        }
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setPhotoInput(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Grid of details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono mb-1">Nombre Completo</label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Tu nombre completo"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-red-500 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono mb-1">Nombre de Usuario (@)</label>
                <input
                  type="text"
                  value={currentSimulatedUser.username}
                  disabled
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono mb-1">Rol en el Roster</label>
                <input
                  type="text"
                  value={currentSimulatedUser.role === "ADMIN" ? "SUPERADMINISTRADOR" : currentSimulatedUser.role}
                  disabled
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono mb-1">Nueva Contraseña</label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Dejar en blanco si no desea cambiarla"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-red-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Shift Assignment Alert - Clinicians Shift Details display */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2.5 mt-2">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                <Clock className="w-4 h-4 text-red-650" />
                <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Guardia y Jornada Asignada (Superadmin)</span>
              </div>
              {currentSimulatedUser.shiftDays || currentSimulatedUser.shiftHours ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-white border border-slate-150 p-2.5 rounded-lg">
                    <span className="block text-[8px] font-mono text-slate-450 font-bold uppercase leading-none">Días de Guardia</span>
                    <span className="text-[11px] font-black text-slate-800 block mt-1 uppercase">
                      📅 {currentSimulatedUser.shiftDays || "No asignados"}
                    </span>
                  </div>
                  <div className="bg-white border border-slate-150 p-2.5 rounded-lg">
                    <span className="block text-[8px] font-mono text-slate-450 font-bold uppercase leading-none">Horario de Guardia</span>
                    <span className="text-[11px] font-black text-slate-800 block mt-1 uppercase">
                      ⏰ {currentSimulatedUser.shiftHours || "No asignado"}
                    </span>
                  </div>
                  {currentSimulatedUser.shiftNotes && (
                    <div className="bg-white border border-slate-150 p-2.5 rounded-lg col-span-2">
                      <span className="block text-[8px] font-mono text-slate-450 font-bold uppercase leading-none">Área de Servicio / Notas</span>
                      <span className="text-[10px] font-semibold text-slate-700 block mt-1 uppercase">
                        🏢 {currentSimulatedUser.shiftNotes}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[10.5px] text-slate-500 italic">No tiene jornadas o turnos específicos asignados actualmente por el superadministrador.</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white rounded-lg text-xs font-black tracking-widest uppercase cursor-pointer shadow-md transition-all active:scale-95 flex items-center gap-1.5"
              >
                {saving ? "SINCRONIZANDO..." : "GUARDAR CAMBIOS"}
              </button>
            </div>

          </form>
        </div>
      </div>

      {/* RIGHT PANEL: Live preview of Printable Carné (5 columns) */}
      <div className="lg:col-span-5 bg-white border border-slate-200 p-5 rounded-xl shadow-sm h-[650px] flex flex-col justify-between items-center" id="profile-card-section">
        
        {/* Tab switch inside preview panel */}
        <div className="flex border border-slate-200 bg-slate-100/85 p-1 rounded-xl w-full shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("card")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "card"
                ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                : "text-slate-555 hover:text-slate-800"
            }`}
          >
            <CreditCard className="w-4 h-4 text-red-650" />
            <span>Carné en Vivo</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("details")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "details"
                ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                : "text-slate-555 hover:text-slate-800"
            }`}
          >
            <Shield className="w-4 h-4 text-red-650" />
            <span>Mis Privilegios</span>
          </button>
        </div>

        {/* Tab Body */}
        {activeTab === "card" ? (
          <div className="flex flex-col items-center gap-4 py-4 animate-fade-in flex-1 justify-center w-full">
            {/* Card Container */}
            <div 
              id="clinical-id-card"
              className="w-[280px] h-[400px] rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 border-2 border-red-650 shadow-2xl p-5 flex flex-col justify-between items-center text-white relative overflow-hidden shrink-0"
            >
              {/* Decorative Glow */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(220,38,38,0.15),transparent_60%)] pointer-events-none" />

              {/* Card Header */}
              <div className="text-center w-full border-b border-white/10 pb-2 z-10">
                <span className="block text-[6px] tracking-[1.5px] uppercase font-bold text-slate-400 leading-none">REPÚBLICA BOLIVARIANA DE VENEZUELA</span>
                <span className="block text-[8.5px] tracking-[2px] uppercase font-black text-red-500 mt-1 leading-none">INSALUD APURE</span>
                <span className="block text-[7px] font-semibold text-slate-350 mt-1 leading-none">AnnASystems • Credencial</span>
              </div>

              {/* Avatar Photo Frame with status badge */}
              <div className="relative z-10 mt-1">
                <div className="w-24 h-24 rounded-full border-2 border-red-655 overflow-hidden bg-slate-800 flex items-center justify-center shadow-lg">
                  {photoInput ? (
                    <img src={photoInput} alt="Tu foto carné" className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle className="w-12 h-12 text-slate-550" />
                  )}
                </div>
                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[7.5px] font-black tracking-widest bg-red-600 border border-red-500 text-white px-2.5 py-0.5 rounded-full uppercase shadow-md leading-none whitespace-nowrap">
                  {currentSimulatedUser.role === "ADMIN" ? "SUPERADMIN" : currentSimulatedUser.role}
                </span>
              </div>

              {/* User Info */}
              <div className="text-center mt-2.5 z-10 flex-1 flex flex-col justify-center">
                <h4 className="text-sm font-black tracking-tight text-white uppercase leading-tight max-w-[240px] line-clamp-1">{nameInput || currentSimulatedUser.name}</h4>
                <p className="text-[8px] text-slate-400 font-mono mt-0.5">@{currentSimulatedUser.username}</p>
                
                <p className="text-[7.5px] text-slate-300 font-semibold font-mono tracking-wider uppercase mt-2 max-w-[240px] truncate leading-relaxed">
                  {currentSimulatedUser.shiftDays ? `📅 ${currentSimulatedUser.shiftDays}` : "📅 Jornada General"}
                  {currentSimulatedUser.shiftHours && <><br />⏰ {currentSimulatedUser.shiftHours}</>}
                </p>
              </div>

              {/* Card Footer with QR and barcode */}
              <div className="w-full flex justify-between items-center border-t border-white/10 pt-2.5 mt-auto z-10">
                <div className="flex flex-col items-start leading-none font-mono">
                  <span className="text-[10px] tracking-[-1px] font-bold text-white opacity-80">||||| | |||| || || | |||</span>
                  <span className="text-[6.5px] font-semibold text-slate-450 mt-1 uppercase tracking-wider">CLINIC-ID-{String(currentSimulatedUser.id).padStart(4, "0")}</span>
                </div>

                {/* QR Code Container */}
                <div className="w-12 h-12 bg-white p-1 rounded-lg flex items-center justify-center shadow-md">
                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="QR de tu credencial" className="w-full h-full" />
                  ) : (
                    <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">
                      <span className="text-[6px]">GEN</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Print Trigger */}
            <button
              type="button"
              onClick={handlePrintCard}
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-750 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg cursor-pointer transition-all shadow-md hover:scale-105 active:scale-95 shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Credencial</span>
            </button>
          </div>
        ) : (
          <div className="w-full flex-1 overflow-y-auto space-y-3.5 py-4 px-2">
            <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">Privilegios individuales autorizados</span>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-semibold text-slate-700 leading-relaxed space-y-2">
              <p className="border-b border-slate-200 pb-2 mb-2 font-mono text-[10px] text-slate-500 uppercase">SU ROL POSEE ACCESO A LAS SIGUIENTES FUNCIONES:</p>
              {currentSimulatedUser.permissions ? (
                currentSimulatedUser.permissions.split(",").map(perm => (
                  <div key={perm} className="flex items-center gap-2 bg-white border border-slate-150 py-1.5 px-3 rounded-lg font-mono text-[9px] font-bold text-slate-800 uppercase tracking-wide">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span>{perm.replace(/_/g, " ")}</span>
                  </div>
                ))
              ) : (
                <p className="italic text-slate-400 text-[10px]">No posee permisos asignados individuales.</p>
              )}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
