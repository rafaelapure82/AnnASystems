export interface Ambulance {
  id: number;
  plate: string;
  model: string;
  paramedicName: string;
  status: "IDLE" | "DISPATCHED" | "MAINTENANCE";
  currentLat: number;
  currentLng: number;
}

export interface Hospital {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  contact: string;
  capacity: number;
  occupied: number;
}

export interface Treatment {
  id: number;
  patientId: number;
  doctorName: string;
  prescription: string;
  status: "PRESCRIBED" | "ADMINISTERED" | "SUSPENDED";
  createdAt: string;
  updatedAt: string;
}

export interface FollowUp {
  id: number;
  patientId: number;
  nurseName: string;
  notes: string;
  medicationAdministered: boolean;
  administeredAt: string | null;
  createdAt: string;
}

export interface Patient {
  id: number;
  name: string;
  age: number;
  gender: string;
  bloodType: string | null;
  clinicalHistory: string | null;
  status: "CRITICAL" | "SERIOUS" | "STABLE" | "DISCHARGED";
  vitalsHeartRate: number | null;
  vitalsBloodPressure: string | null;
  vitalsOxygen: number | null;
  vitalsTemperature: number | null;
  examResults: string | null;
  assignedDoctorId?: number | null;
  assignedDoctorName?: string | null;
  treatments?: Treatment[];
  followUps?: FollowUp[];
  incidents?: Incident[];
  bed?: Bed | null;
  createdAt: string;
}

export interface Bed {
  id: number;
  bedNumber: string;
  roomNumber: string;
  status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE";
  hospitalId: number;
  hospital?: Hospital;
  patientId: number | null;
  patient?: Patient | null;
  createdAt: string;
  updatedAt: string;
}

export interface Incident {
  id: number;
  patientName: string | null;
  status: "PENDING" | "DISPATCHED" | "RESOLVED";
  address: string;
  latitude: number;
  longitude: number;
  severity: "CRITICAL" | "SERIOUS" | "STABLE";
  symptoms: string;
  ambulanceId: number | null;
  ambulance?: Ambulance | null;
  hospitalId: number | null;
  hospital?: Hospital | null;
  patientId: number | null;
  patient?: Patient | null;
  createdAt: string;
  updatedAt: string;
}

export interface SystemStats {
  totalPatients: number;
  activeEmergencies: number;
  criticalPatientsCount: number;
  bedsAvailable: number;
  totalBeds: number;
}

export interface User {
  id: number;
  username: string;
  name: string;
  password?: string;
  role: "PARAMEDIC" | "DOCTOR" | "NURSE" | "ADMIN";
  permissions: string; // Comma-separated list of individual permissions
  active: boolean;
  shiftDays?: string;
  shiftHours?: string;
  shiftNotes?: string;
  photo?: string | null;
  createdAt: string;
  updatedAt: string;
}
