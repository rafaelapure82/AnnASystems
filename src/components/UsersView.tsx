import React, { useState, useEffect } from "react";
import { User } from "../types";
import QRCode from "qrcode";
import { 
  Users, 
  UserPlus, 
  Shield, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Edit2, 
  CheckSquare, 
  Square,
  Key,
  ShieldCheck,
  Search,
  Check,
  X,
  Clock,
  Printer,
  Download,
  Upload,
  UserCircle,
  CreditCard
} from "lucide-react";

interface UsersViewProps {
  currentSimulatedUserId: number | null;
  onRefreshAll: () => void;
}

const PERMISSIONS_DICTIONARY = [
  { key: "view_patients", name: "Ver Pacientes", desc: "Permite ver el directorio clínico de pacientes bajo cuidado." },
  { key: "view_history", name: "Ver Historial Completo", desc: "Permite auditar el historial de triaje y evoluciones pasadas." },
  { key: "prescribe_treatment", name: "Prescribir Tratamientos", desc: "Permite emitir prescripciones de fármacos y dosis." },
  { key: "use_ai_diagnose", name: "Soporte Clínico por IA", desc: "Permite invocar el análisis predictivo de diagnósticos por IA (Gemini)." },
  { key: "administer_meds", name: "Administrar Medicamentos", desc: "Permite verificar el correcto lote y dosis de fármaco aplicados." },
  { key: "add_followup", name: "Registrar Notas de Evolución", desc: "Permite añadir observaciones vitales en la hoja de enfermería." },
  { key: "add_incident", name: "Reportar Incidentes de Emergencia", desc: "Permite dar de alta despachos de ambulancia en tránsito." },
  { key: "view_map", name: "Monitorear GPS Satelital", desc: "Permite acceder a la consola interactiva de ubicaciones satelitales." },
  { key: "dispatch_fleet", name: "Controlar Despachos & Derivación", desc: "Permite asignar ambulancia y hospital receptor a incidentes." },
  { key: "manage_users", name: "Administrar Usuarios & Permisos", desc: "Acceso total para revocar, crear, y delegar roles y accesos." },
  { key: "manage_fleet", name: "Mantenimiento de Flota", desc: "Permite regular estados de disponibilidad de vehículos." },
  { key: "manage_hospitals", name: "Modificar Capacidad Hospitalaria", desc: "Permite actualizar ocupación de camas de recepción." }
];

const DEFAULT_PERMISSIONS_BY_ROLE: Record<string, string[]> = {
  ADMIN: ["view_patients", "view_history", "prescribe_treatment", "use_ai_diagnose", "administer_meds", "add_followup", "add_incident", "view_map", "dispatch_fleet", "manage_users", "manage_fleet", "manage_hospitals"],
  DOCTOR: ["view_patients", "view_history", "prescribe_treatment", "use_ai_diagnose"],
  NURSE: ["view_patients", "administer_meds", "add_followup"],
  PARAMEDIC: ["add_incident", "view_map", "dispatch_fleet"]
};

export default function UsersView({ currentSimulatedUserId, onRefreshAll }: UsersViewProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Selected user for detail/editing edit mode
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // Form values
  const [usernameInput, setUsernameInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [roleInput, setRoleInput] = useState<"PARAMEDIC" | "DOCTOR" | "NURSE" | "ADMIN">("PARAMEDIC");
  const [activeInput, setActiveInput] = useState(true);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [shiftDaysInput, setShiftDaysInput] = useState("");
  const [shiftHoursInput, setShiftHoursInput] = useState("");
  const [shiftNotesInput, setShiftNotesInput] = useState("");
  const [photoInput, setPhotoInput] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"details" | "card">("details");
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  
  // Feedback notification
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
        if (data.length > 0 && !selectedUser) {
          // Default select first item
          setSelectedUser(data[0]);
        } else if (selectedUser) {
          // Keep current user selected updated
          const updatedSelected = data.find((u: User) => u.id === selectedUser.id);
          if (updatedSelected) {
            setSelectedUser(updatedSelected);
          }
        }
      } else {
        showToast("Error al cargar listado de usuarios", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Excepción de red al solicitar directiva de usuarios", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      const payload = {
        id: selectedUser.id,
        username: selectedUser.username,
        name: selectedUser.name,
        role: selectedUser.role,
        status: selectedUser.active ? "ACTIVO" : "INACTIVO",
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
      .catch(err => console.error("QR Code Gen error:", err));
    } else {
      setQrCodeUrl("");
    }
  }, [selectedUser]);

  const handleStartCreate = () => {
    setIsCreating(true);
    setIsEditing(false);
    setUsernameInput("");
    setNameInput("");
    setPasswordInput("");
    setRoleInput("PARAMEDIC");
    setActiveInput(true);
    setSelectedPermissions([...DEFAULT_PERMISSIONS_BY_ROLE.PARAMEDIC]);
    setShiftDaysInput("");
    setShiftHoursInput("");
    setShiftNotesInput("");
    setPhotoInput(null);
  };

  const handleStartEdit = (user: User) => {
    setIsEditing(true);
    setIsCreating(false);
    setUsernameInput(user.username);
    setNameInput(user.name);
    setPasswordInput(""); // Blank indicates keeping current password if unchanged
    setRoleInput(user.role);
    setActiveInput(user.active);
    setSelectedPermissions(user.permissions ? user.permissions.split(",") : []);
    setShiftDaysInput(user.shiftDays || "");
    setShiftHoursInput(user.shiftHours || "");
    setShiftNotesInput(user.shiftNotes || "");
    setPhotoInput(user.photo || null);
  };

  const handleRoleChange = (role: "PARAMEDIC" | "DOCTOR" | "NURSE" | "ADMIN") => {
    setRoleInput(role);
    // Autofill recommended permissions for role
    setSelectedPermissions([...DEFAULT_PERMISSIONS_BY_ROLE[role] || []]);
  };

  const handleTogglePermission = (permKey: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permKey) 
        ? prev.filter(p => p !== permKey) 
        : [...prev, permKey]
    );
  };

  // Submit User addition
  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput || !nameInput) {
      showToast("Complete los campos obligatorios", "error");
      return;
    }

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: usernameInput,
          name: nameInput,
          password: passwordInput || "123456",
          role: roleInput,
          permissions: selectedPermissions.join(","),
          active: activeInput,
          shiftDays: shiftDaysInput,
          shiftHours: shiftHoursInput,
          shiftNotes: shiftNotesInput,
          photo: photoInput
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`Usuario ${nameInput} creado exitosamente.`);
        await loadUsers();
        setIsCreating(false);
        onRefreshAll();
        // Highlight new user
        if (data && data.id) {
          setSelectedUser(data);
        }
      } else {
        showToast(data.error || "Fallo en creación del usuario", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Falla de red", "error");
    }
  };

  // Submit User update
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: usernameInput,
          name: nameInput,
          role: roleInput,
          password: passwordInput || undefined,
          permissions: selectedPermissions.join(","),
          active: activeInput,
          shiftDays: shiftDaysInput,
          shiftHours: shiftHoursInput,
          shiftNotes: shiftNotesInput,
          photo: photoInput
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`Parámetros de acceso para ${nameInput} sincronizados.`);
        await loadUsers();
        setIsEditing(false);
        onRefreshAll();
      } else {
        showToast(data.error || "Fallo al guardar modificaciones", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Excepción de comunicación de red", "error");
    }
  };

  // Delete profile record
  const handleDeleteUser = async (id: number, name: string) => {
    if (confirm(`¿Está seguro de que desea eliminar la cuenta de ${name}? Esta acción es irreversible.`)) {
      try {
        const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
        if (res.ok) {
          showToast(`El usuario ${name} fue removido del sistema.`);
          setSelectedUser(null);
          await loadUsers();
          onRefreshAll();
        } else {
          showToast("Error eliminando usuario de la base de datos", "error");
        }
      } catch (e) {
        showToast("Excepción de red", "error");
      }
    }
  };

  const handlePrintCard = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showToast("No se pudo abrir la ventana de impresión. Compruebe si tiene bloqueadores de ventanas emergentes.", "error");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Carné Institucional - ${selectedUser?.name}</title>
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
              ${selectedUser?.photo ? `<img src="${selectedUser.photo}" />` : `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:65px; height:65px; color:#475569;">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              `}
            </div>

            <div style="display: flex; flex-direction: column; align-items: center;">
              <div class="user-name">${selectedUser?.name}</div>
              <div class="user-role">${selectedUser?.role === "ADMIN" ? "SUPERADMINISTRADOR" : selectedUser?.role}</div>
              <div class="shift-info">
                ${selectedUser?.shiftDays ? `Jornada: ${selectedUser.shiftDays}` : "Jornada General"}
                <br/>
                ${selectedUser?.shiftHours ? `Turno: ${selectedUser.shiftHours}` : ""}
              </div>
            </div>

            <div class="card-footer">
              <div class="barcode-container">
                <div class="barcode-line">||||| | |||| || || | |||</div>
                <div class="barcode-text">CLINIC-ID-${String(selectedUser?.id || 0).padStart(4, "0")}</div>
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

  const filteredUsers = users.filter((u: User) => {
    if (!searchQuery) return true;
    return u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           u.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
           u.username.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in text-slate-800" id="users-module-container">
      
      {/* LEFT: Users master Roster (5 columns) */}
      <div className="lg:col-span-5 bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex flex-col h-[650px]" id="users-control-roster">
        <div className="flex items-center justify-between border-b border-slate-150 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-red-650" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Roster Clínico de Cuentas</h3>
          </div>
          <button
            onClick={handleStartCreate}
            className="flex items-center gap-1 hover:scale-105 transition-all text-[10.5px] font-black uppercase text-white bg-red-600 hover:bg-red-700 py-1.5 px-3 rounded-lg cursor-pointer shadow-sm"
            title="Registrar Usuario"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>NUEVO</span>
          </button>
        </div>

        {/* Informative subtitle */}
        <p className="text-[10px] text-slate-500 font-semibold font-mono tracking-wider uppercase mb-3.5 leading-snug">
          Establezca perfiles y asigne privilegios médicos para restringir de forma fisiológica las acciones en el aplicativo.
        </p>

        {/* Search filter in Roster */}
        <div className="relative mb-3.5 shrink-0">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, rol o usuario..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-red-500 transition-all text-slate-800"
          />
        </div>

        {/* Toast Status panel */}
        {toastMessage && (
          <div className={`mb-3.5 p-2.5 rounded-lg border text-xs font-bold transition-all animate-scale-up py-2 px-3 flex items-center gap-2 ${
            toastMessage.type === "success" 
              ? "bg-green-50 border-green-200 text-green-700" 
              : "bg-red-50 border-red-200 text-red-700"
          }`}>
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Users list wrapper */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <p className="text-xs text-slate-400 text-center py-10 font-mono">Buscando usuarios clínicos...</p>
          ) : filteredUsers.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-10">Ningún usuario coincide con los criterios.</p>
          ) : (
            filteredUsers.map((u: User) => {
              const isSelected = selectedUser?.id === u.id;
              const holdsPrivileges = u.role === "ADMIN";
              const isCurrentSessionUser = currentSimulatedUserId === u.id;
              
              return (
                <div
                  key={u.id}
                  onClick={() => {
                    setSelectedUser(u);
                    setIsEditing(false);
                    setIsCreating(false);
                  }}
                  className={`border p-3 rounded-lg cursor-pointer transition-all flex justify-between items-center ${
                    isSelected 
                      ? "bg-slate-100 border-slate-350 shadow-sm" 
                      : "bg-slate-50/50 hover:bg-slate-50 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="space-y-1 truncate max-w-[210px]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-xs font-black text-slate-800 tracking-tight">{u.name}</h4>
                      {isCurrentSessionUser && (
                        <span className="text-[8px] font-mono font-bold px-1.5 py-0.2 text-blue-600 bg-blue-50 border border-blue-100 rounded-full">EN SESIÓN</span>
                      )}
                    </div>
                    
                    <p className="text-[10px] text-slate-500 font-semibold font-mono uppercase">
                      @{u.username} • {u.role}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 self-center">
                    {/* Status badge and metadata icons */}
                    <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded border ${
                      u.active 
                        ? "bg-green-50 border-green-200 text-green-600" 
                        : "bg-red-50 border-red-150 text-red-500 line-through opacity-70"
                    }`}>
                      {u.active ? "ACTIVO" : "REVOCADO"}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT: User Detail display & Editing Checklist form (7 columns) */}
      <div className="lg:col-span-7 bg-white border border-slate-200 p-5 rounded-xl shadow-sm h-[650px] flex flex-col justify-between" id="user-details-and-form">
        
        {/* Form view (Edit or Create block) */}
        {isEditing || isCreating ? (
          <form onSubmit={isCreating ? handleSaveCreate : handleSaveEdit} className="h-full flex flex-col justify-between">
            <div className="space-y-4 overflow-y-auto pr-1 flex-1 pb-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-red-650" />
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                    {isCreating ? "Registrar Nuevo Funcionario" : "Modificar Permisos y Datos"}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setIsCreating(false);
                  }}
                  className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Photo Upload with Base64 converter */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center gap-4">
                <div className="shrink-0 relative">
                  {photoInput ? (
                    <img 
                      src={photoInput} 
                      alt="Foto carné" 
                      className="w-16 h-16 rounded-full object-cover border-2 border-red-650 shadow-sm"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                      <UserCircle className="w-8 h-8" />
                    </div>
                  )}
                  {photoInput && (
                    <button
                      type="button"
                      onClick={() => setPhotoInput(null)}
                      className="absolute -top-1 -right-1 bg-red-600 hover:bg-red-750 text-white rounded-full p-0.5 cursor-pointer shadow-sm border border-white"
                      title="Eliminar foto"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">Foto de tipo carné</span>
                  <p className="text-[9px] text-slate-400 font-mono">Cargue una foto tipo pasaporte cuadrada (Max 1MB).</p>
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
                            showToast("La foto de carné no debe exceder 1MB", "error");
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

              {/* Grid with Name / Password / Username */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="E.g. Dr. Arthur Pendelton"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-red-500 focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono mb-1">Nombre de Usuario (@)</label>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="E.g. pendelton"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-red-500 focus:bg-white"
                    required
                    disabled={isEditing} // Prevent username changes to preserve unique key in simple UI
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono mb-1">Rol Clínico Primario</label>
                  <select
                    value={roleInput}
                    onChange={(e) => handleRoleChange(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:border-red-500 focus:bg-white cursor-pointer"
                  >
                    <option value="PARAMEDIC">Paramédico (Fleet)</option>
                    <option value="DOCTOR">Médico Jefe (Clinical)</option>
                    <option value="NURSE">Enfermero de Planta (Meds)</option>
                    <option value="ADMIN">Administrador General (Admin)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono mb-1">
                    Contraseña / Clave {isEditing && <span className="text-slate-400 lowercase">(vacío para mantener)</span>}
                  </label>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder={isEditing ? "••••••••" : "E.g. 123456"}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-red-500 focus:bg-white"
                    required={isCreating}
                  />
                </div>
              </div>

              {/* Asignación de Horario y Jornada Laboral */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3.5">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <Clock className="w-4 h-4 text-red-650" />
                  <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Asignación de Jornada & Horarios</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono mb-1">Días de Guardia / Jornada</label>
                    <input
                      type="text"
                      value={shiftDaysInput}
                      onChange={(e) => setShiftDaysInput(e.target.value)}
                      placeholder="E.g. Lunes a Viernes, Fin de Semana"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-red-500"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {["Lunes a Viernes", "Lunes, Miércoles, Viernes", "Fines de Semana", "Guardia de 24h"].map(preset => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setShiftDaysInput(preset)}
                          className="text-[8px] bg-slate-200 hover:bg-slate-300 text-slate-700 px-1.5 py-0.5 rounded font-bold cursor-pointer"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono mb-1">Rango Horario / Turno</label>
                    <input
                      type="text"
                      value={shiftHoursInput}
                      onChange={(e) => setShiftHoursInput(e.target.value)}
                      placeholder="E.g. 07:00 - 19:00, 19:00 - 07:00"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-red-500"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {["08:00 - 16:00 (Turno Diurno)", "07:00 - 19:00 (Guardia 12h)", "19:00 - 07:00 (Guardia Nocturna)"].map(preset => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setShiftHoursInput(preset)}
                          className="text-[8px] bg-slate-200 hover:bg-slate-300 text-slate-700 px-1.5 py-0.5 rounded font-bold cursor-pointer"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono mb-1">Notas de Servicio / Área Asignada</label>
                  <input
                    type="text"
                    value={shiftNotesInput}
                    onChange={(e) => setShiftNotesInput(e.target.value)}
                    placeholder="E.g. Unidad de Trauma Shock, Quirófano de Urgencias"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* Status input toggle */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-bold text-slate-700 uppercase tracking-wide">Estado de Habilitación</span>
                  <span className="text-[9px] text-slate-400 font-mono">Desmarque para revocar de forma inmediata su acceso a las vistas.</span>
                </div>
                <input
                  type="checkbox"
                  id="user_status"
                  checked={activeInput}
                  onChange={(e) => setActiveInput(e.target.checked)}
                  className="w-4 h-4 text-red-650 rounded border-slate-300 accent-red-600 cursor-pointer"
                />
              </div>

              {/* Detailed permissions selection */}
              <div>
                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono mb-2">Concesión de Permisos Individuales</span>
                <div className="space-y-2 border border-slate-200 rounded-lg p-3 max-h-[220px] overflow-y-auto bg-slate-50/50">
                  {PERMISSIONS_DICTIONARY.map(p => {
                    const isChecked = selectedPermissions.includes(p.key);
                    return (
                      <div 
                        key={p.key} 
                        onClick={() => handleTogglePermission(p.key)}
                        className={`flex items-start gap-2.5 p-2 rounded-md border cursor-pointer hover:bg-slate-100 transition-all ${
                          isChecked 
                            ? "bg-slate-50 border-slate-300" 
                            : "bg-white/40 border-transparent text-slate-500"
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-red-650" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-black text-slate-800 leading-tight">{p.name}</span>
                            <span className="bg-slate-200 text-slate-800 text-[8px] font-mono font-semibold px-1 rounded uppercase tracking-wide">{p.key}</span>
                          </div>
                          <p className="text-[9px] text-slate-400 leading-snug mt-0.5 font-medium">{p.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Actions for Form submissions */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 mt-4">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setIsCreating(false);
                }}
                className="px-4 py-2 hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold uppercase cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-black tracking-widest uppercase cursor-pointer shadow-sm transition-all"
              >
                {isCreating ? "CREAR CUENTA" : "SINCRONIZAR CAMBIOS"}
              </button>
            </div>
          </form>
        ) : selectedUser ? (
          /* Normal View Mode */
          <div className="h-full flex flex-col justify-between" id="selected-user-detail-panel">
            <div className="space-y-4 overflow-y-auto pr-1 flex-1 pb-4 flex flex-col">
              {/* Header card with name, username and role */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg flex items-center justify-between shrink-0">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] font-mono tracking-widest text-slate-400 font-bold uppercase">FICHA DEL FUNCIONARIO</span>
                    <span className={`text-[8.5px] font-bold px-1.5 py-0.2 rounded border ${
                      selectedUser.active 
                        ? "bg-green-50 border-green-200 text-green-600" 
                        : "bg-red-50 border-red-150 text-red-500 line-through"
                    }`}>
                      {selectedUser.active ? "CONTRATO ACTIVO" : "ACCESO SUSPENDIDO"}
                    </span>
                  </div>
                  <h3 className="text-md font-black tracking-tight text-slate-900 mt-1 uppercase">{selectedUser.name}</h3>
                  <p className="text-[10.5px] text-slate-500 font-semibold font-mono uppercase tracking-wider leading-none mt-1">
                    @{selectedUser.username} • Rol Clínico: <strong className="text-slate-800">{selectedUser.role}</strong>
                  </p>
                </div>

                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    onClick={() => handleStartEdit(selectedUser)}
                    className="p-1.5 hover:bg-slate-200 rounded-lg text-blue-600 border border-slate-250 bg-white shadow-sm flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                    title="Editar perfil"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>MODIFICAR</span>
                  </button>
                  <button
                    onClick={() => handleDeleteUser(selectedUser.id, selectedUser.name)}
                    className="p-1.5 hover:bg-red-50 rounded-lg text-red-600 border border-red-200 bg-white shadow-sm flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                    title="Revocar usuario"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ELIMINAR</span>
                  </button>
                </div>
              </div>

              {/* Status Alert if Suspended */}
              {!selectedUser.active && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs py-2 px-3.5 rounded-lg flex items-center gap-2 shrink-0">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-semibold">Atención: El acceso de esta cuenta ha sido SUSPENDIDO. Ninguna credencial de este usuario será autorizada para simular en el aplicativo.</span>
                </div>
              )}

              {/* Sliding Tab Selector */}
              <div className="flex border border-slate-200 bg-slate-100/80 p-1 rounded-xl shrink-0 mt-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("details")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === "details"
                      ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                      : "text-slate-555 hover:text-slate-855"
                  }`}
                >
                  <UserCircle className="w-4 h-4 text-red-650" />
                  <span>Detalles y Privilegios</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("card")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === "card"
                      ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                      : "text-slate-555 hover:text-slate-855"
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-red-650" />
                  <span>Carné Institucional</span>
                </button>
              </div>

              {/* Conditional Tab Body Rendering */}
              {activeTab === "details" ? (
                <div className="space-y-4 flex-1">
                  {/* Horario y Jornada Laboral Asignada */}
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2.5">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                      <Clock className="w-4 h-4 text-red-650" />
                      <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Jornada Laboral & Guardia</span>
                    </div>
                    {selectedUser.shiftDays || selectedUser.shiftHours ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-white border border-slate-150 p-2.5 rounded-lg">
                          <span className="block text-[8px] font-mono text-slate-450 font-bold uppercase leading-none">Días de Turno</span>
                          <span className="text-[11px] font-black text-slate-800 block mt-1 uppercase truncate" title={selectedUser.shiftDays}>
                            📅 {selectedUser.shiftDays || "No asignados"}
                          </span>
                        </div>
                        <div className="bg-white border border-slate-150 p-2.5 rounded-lg">
                          <span className="block text-[8px] font-mono text-slate-450 font-bold uppercase leading-none">Horas de Guardia</span>
                          <span className="text-[11px] font-black text-slate-850 block mt-1 uppercase truncate" title={selectedUser.shiftHours}>
                            ⏰ {selectedUser.shiftHours || "No asignadas"}
                          </span>
                        </div>
                        <div className="bg-white border border-slate-150 p-2.5 rounded-lg">
                          <span className="block text-[8px] font-mono text-slate-450 font-bold uppercase leading-none">Área / Notas</span>
                          <span className="text-[11px] font-black text-blue-600 block mt-1 uppercase truncate" title={selectedUser.shiftNotes}>
                            🏢 {selectedUser.shiftNotes || "General"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10.5px] text-slate-500 italic">No se ha asignado una jornada laboral o rango horario a este usuario clínico aún.</p>
                    )}
                  </div>

                  {/* Grid of details: Created date, permissions summary count */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-md text-center">
                      <span className="block text-[8px] font-mono text-slate-450 font-bold uppercase leading-none">Miembro Desde</span>
                      <span className="text-[11px] font-bold text-slate-800 font-mono mt-1 block">
                        {new Date(selectedUser.createdAt).toLocaleDateString("es-ES")}
                      </span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-md text-center">
                      <span className="block text-[8px] font-mono text-slate-450 font-bold uppercase leading-none">Último Cambio</span>
                      <span className="text-[11px] font-bold text-slate-800 font-mono mt-1 block">
                        {new Date(selectedUser.updatedAt).toLocaleDateString("es-ES")}
                      </span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-md text-center col-span-2">
                      <span className="block text-[8px] font-mono text-slate-450 font-bold uppercase leading-none">Permisos Otorgados</span>
                      <span className="text-[11.5px] font-black text-red-650 uppercase mt-1 block">
                        {selectedUser.permissions ? selectedUser.permissions.split(",").length : 0} / {PERMISSIONS_DICTIONARY.length} PRIVILEGIOS
                      </span>
                    </div>
                  </div>

                  {/* Active privileges roster */}
                  <div className="space-y-2 flex-1 flex flex-col justify-end">
                    <span className="block text-[9.5px] text-slate-500 font-bold uppercase tracking-wider font-mono">Privilegios Otorgados Detalladamente</span>
                    <div className="border border-slate-200 rounded-lg p-3 grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[170px] overflow-y-auto bg-slate-50/20">
                      {PERMISSIONS_DICTIONARY.map(p => {
                        const permissionsList = selectedUser.permissions ? selectedUser.permissions.split(",") : [];
                        const isGranted = permissionsList.includes(p.key);
                        
                        return (
                          <div 
                            key={p.key} 
                            className={`p-2 rounded-lg border flex items-start gap-1.5 leading-tight ${
                              isGranted 
                                ? "bg-white border-slate-250 text-slate-850" 
                                : "bg-slate-50/50 border-slate-100 text-slate-450 opacity-60"
                            }`}
                          >
                            <div className="mt-0.5 shrink-0">
                              {isGranted ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-slate-300" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className={`text-[11.5px] leading-none font-bold ${isGranted ? "text-slate-850" : "text-slate-400"}`}>
                                  {p.name}
                                </span>
                              </div>
                              <span className="text-[8px] font-mono text-slate-400 block mt-0.5 uppercase tracking-wide font-bold">{p.key}</span>
                              <p className="text-[8.5px] text-slate-500 mt-0.5 leading-normal">{p.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 py-4 animate-fade-in flex-1 justify-center bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  {/* Card Container */}
                  <div 
                    id="clinical-id-card"
                    className="w-[280px] h-[400px] rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 border-2 border-red-650 shadow-2xl p-5 flex flex-col justify-between items-center text-white relative overflow-hidden shrink-0 animate-scale-up"
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
                        {selectedUser.photo ? (
                          <img src={selectedUser.photo} alt="Foto carné" className="w-full h-full object-cover" />
                        ) : (
                          <UserCircle className="w-12 h-12 text-slate-550" />
                        )}
                      </div>
                      <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[7.5px] font-black tracking-widest bg-red-600 border border-red-500 text-white px-2.5 py-0.5 rounded-full uppercase shadow-md leading-none whitespace-nowrap">
                        {selectedUser.role === "ADMIN" ? "SUPERADMIN" : selectedUser.role}
                      </span>
                    </div>

                    {/* User Info */}
                    <div className="text-center mt-2.5 z-10 flex-1 flex flex-col justify-center">
                      <h4 className="text-sm font-black tracking-tight text-white uppercase leading-tight max-w-[240px] line-clamp-1">{selectedUser.name}</h4>
                      <p className="text-[8px] text-slate-400 font-mono mt-0.5">@{selectedUser.username}</p>
                      
                      <p className="text-[7.5px] text-slate-300 font-semibold font-mono tracking-wider uppercase mt-2 max-w-[240px] truncate leading-relaxed">
                        {selectedUser.shiftDays ? `📅 ${selectedUser.shiftDays}` : "📅 Jornada General"}
                        {selectedUser.shiftHours && <><br />⏰ {selectedUser.shiftHours}</>}
                      </p>
                    </div>

                    {/* Card Footer with QR and barcode */}
                    <div className="w-full flex justify-between items-center border-t border-white/10 pt-2.5 mt-auto z-10">
                      <div className="flex flex-col items-start leading-none font-mono">
                        <span className="text-[10px] tracking-[-1px] font-bold text-white opacity-80">||||| | |||| || || | |||</span>
                        <span className="text-[6.5px] font-semibold text-slate-450 mt-1 uppercase tracking-wider">CLINIC-ID-{String(selectedUser.id).padStart(4, "0")}</span>
                      </div>

                      {/* QR Code Container */}
                      <div className="w-12 h-12 bg-white p-1 rounded-lg flex items-center justify-center shadow-md">
                        {qrCodeUrl ? (
                          <img src={qrCodeUrl} alt="QR de credencial" className="w-full h-full" />
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
                    className="flex items-center gap-1.5 bg-red-600 hover:bg-red-750 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg cursor-pointer transition-all shadow-md hover:scale-105 active:scale-95"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir Carné</span>
                  </button>
                </div>
              )}
            </div>

            {/* Simulated password hint legend in footer */}
            <div className="border-t border-slate-100 pt-3 mt-4 flex items-center justify-between text-[9px] text-slate-400 font-mono uppercase shrink-0">
              <span>CONTRASEÑA POR DEFECTO: "{selectedUser.password || "123456"}"</span>
              <span>AnnASystems CREDENTIAL SECURITY SYSTEM</span>
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="h-full flex flex-col justify-center items-center text-slate-400 text-center py-20 p-6">
            <Users className="w-14 h-14 text-slate-350 mb-3" />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-1">
              Ficha del Personal Clínico
            </h3>
            <p className="text-xs max-w-sm font-semibold text-slate-500 leading-normal">
              Seleccione un funcionario de la lista de cuentas clínicas de la izquierda para examinar sus perfiles, habilitar accesos temporales u otorgar autorizaciones individuales detalladas.
            </p>
          </div>
        )}

      </div>

    </div>
  );
}
