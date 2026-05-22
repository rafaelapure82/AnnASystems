# Guía de Instalación y Despliegue de AnnASystems

Esta guía proporciona las instrucciones detalladas paso a paso para clonar, configurar, compilar y ejecutar **AnnASystems** en cualquier otra computadora local, ya sea utilizando contenedores Docker o de manera nativa con Node.js.

---

## 📋 Requisitos del Sistema

Antes de iniciar la instalación, asegúrese de tener instaladas las siguientes herramientas en la computadora de destino:

### Método A: Despliegue con Docker (Recomendado)
- **Docker Desktop** (con soporte para Docker Compose).
- **Git** (opcional, para clonar el repositorio).

### Método B: Despliegue Nativo (Desarrollo)
- **Node.js** (Versión 20.x LTS o superior recomendado).
- **npm** (Viene integrado con Node.js).
- **SQLite** (El motor de base de datos corre sin servidor, por lo que no requiere instalación previa).
- **Git** (opcional).

---

## 🚀 Método 1: Despliegue con Docker (El más Rápido)

Este método es ideal para producción o demostraciones rápidas locales, ya que Docker se encarga de empaquetar de forma aislada todas las dependencias de Node.js, compilación de TypeScript/Vite y esquemas de base de datos.

### Paso 1: Descargar los archivos del proyecto
Copie la carpeta del proyecto a la nueva computadora o clónela con Git:
```bash
git clone <url-del-repositorio> AnnASystems
cd AnnASystems
```

### Paso 2: Configurar las Variables de Entorno
Cree un archivo llamado `.env` en la raíz del proyecto (puede duplicar el `.env.example` si existe) con el siguiente contenido:
```env
# Clave de API opcional para el triaje clínico automatizado con Inteligencia Artificial (Gemini)
# Reemplace "MY_GEMINI_API_KEY" con su clave real de Google AI Studio si desea triaje inteligente en vivo.
GEMINI_API_KEY="MY_GEMINI_API_KEY"

# Ruta de conexión interna para SQLite
DATABASE_URL="file:/app/prisma/dev.db"
```

> [!TIP]
> Si no se configura una clave de Gemini válida, el sistema conmutará automáticamente a un **motor de triaje determinista basado en reglas clínicas de seguridad (SpO2, Frecuencia Cardíaca, etc.)**, por lo que el sistema seguirá operando perfectamente sin fallar.

### Paso 3: Construir e Iniciar los Contenedores
Ejecute el siguiente comando en su terminal (dentro de la carpeta raíz del proyecto):
```bash
docker compose up -d --build
```

### Paso 4: Inicializar la Base de Datos dentro del Contenedor
Una vez creados los contenedores, sincronice el esquema de base de datos SQLite y realice el primer cargue de datos semilla en caliente:
```bash
# 1. Empujar el esquema de Prisma a la base de datos local SQLite
docker compose exec annasystems npx prisma db push

# 2. Ejecutar la semilla inicial para cargar personal de salud, hospitales y un incidente limpio de prueba
docker compose exec annasystems npx tsx scratch_clear_and_run.ts
```

¡Listo! Abra su navegador e ingrese a: **`http://localhost:3000`**

---

## 🛠️ Método 2: Ejecución Nativa (Ideal para Desarrollo y Modificaciones)

Si desea modificar el código fuente en vivo o no cuenta con Docker instalado en la computadora destino, puede correr el servidor localmente en Node.js.

### Paso 1: Instalar dependencias
Desde la terminal en la raíz del proyecto, instale las librerías requeridas:
```bash
npm install
```

### Paso 2: Crear el archivo de entorno `.env`
Cree el archivo `.env` en la raíz con la ruta local a la base de datos:
```env
GEMINI_API_KEY="MY_GEMINI_API_KEY"
DATABASE_URL="file:./prisma/dev.db"
```

### Paso 3: Inicializar la Base de Datos local
Sincronice Prisma y cargue los datos de inicialización:
```bash
# Sincroniza el esquema prisma/schema.prisma
npx prisma db push

# Limpia cualquier residuo y carga la configuración clínica inicial de Achaguas, Apure
npx tsx scratch_clear_and_run.ts
```

### Paso 4: Ejecutar en Modo de Desarrollo
Inicie el servidor y el cliente reactivo:
```bash
npm run dev
```
El servidor de desarrollo se iniciará en **`http://localhost:3000`** con soporte para cambios en caliente (Hot Module Replacement).

### Paso 5: Compilar para producción (Opcional)
Para generar el bundle optimizado sin correr en modo de desarrollo:
```bash
# Compila React con Vite y empaqueta el servidor con Esbuild
npm run build

# Inicia la aplicación en modo producción
npm start
```

---

## 👥 Credenciales de Acceso (Roster Simulado)

Al abrir la aplicación, puede ingresar utilizando cualquiera de los siguientes perfiles precargados para verificar los roles y permisos del sistema:

| Nombre del Personal | Rol Clínico | Nombre de Usuario | Contraseña | Permisos Clave |
| :--- | :--- | :--- | :--- | :--- |
| **Jefe Adams** | `ADMIN` (Superadmin) | `adams` | `admin` | Control total, Roster, Horarios, Carnés |
| **Dr. Karen Burke** | `DOCTOR` (Médico Jefe) | `karen` | `doctor` | Prescripción, Triaje Gemini, Hoja Médica |
| **Enfermero Montenegro** | `NURSE` (Enfermero) | `montenegro` | `enfermero` | Evolución clínica, Administración Fármacos |
| **Paramédico Luis González**| `PARAMEDIC` (Paramédico) | `luis` | `paramedico` | GPS, Ambulancia, Registro de Incidentes |

---

## 🔍 Resolución de Problemas Comunes (FAQ)

### ❌ Error `413 (Payload Too Large)` al subir fotos carné
- **Causa**: El JSON enviado supera el límite inicial de Express.
- **Solución**: Asegúrese de contar con la última versión de `server.ts` donde se definió `app.use(express.json({ limit: "50mb" }))`. Si vuelve a ocurrir en otras rutas personalizadas, verifique que los middlewares no estén limitados en reversa.

### ❌ Error al imprimir o descargar credenciales
- **Causa**: El navegador tiene activado el bloqueador de ventanas emergentes (*pop-ups*).
- **Solución**: Al hacer clic en "Imprimir Credencial", el navegador mostrará una alerta en la barra de direcciones. Elija **"Permitir siempre ventanas emergentes de http://localhost:3000"** e intente de nuevo.

### ❌ Base de datos bloqueada (`Database is locked` / SQLite)
- **Causa**: Múltiples hilos intentan escribir de forma síncrona en el archivo `prisma/dev.db`.
- **Solución**: Reinicie el contenedor de Docker para cerrar cualquier descriptor de archivo residual (`docker compose restart`). En SQLite local, evite abrir la base de datos con visualizadores externos en modo de edición simultánea.

### ❌ El mapa GPS interactivo no carga o sale en gris
- **Causa**: Falta de conexión a internet para descargar las teselas de OpenStreetMap.
- **Solución**: El mapa utiliza Leaflet.js cargado de manera descentralizada. Requiere conexión activa en el computador cliente para descargar la cartografía en vivo de las coordenadas en **Achaguas, Apure**.
