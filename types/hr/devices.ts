export type DeviceStatusExtended = "ACTIVE" | "INACTIVE" | "LOST" | "RETURNED";

export interface Device {
  id: number;
  orgId: string;
  userId: string;
  deviceType: string;
  deviceName: string;
  serialNumber: string | null;
  brand: string | null;
  model: string | null;
  notes: string | null;
  assignedDate: Date | string | null;
  returnDate: Date | string | null;
  status: DeviceStatusExtended | null;
  user?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
}

export interface CreateDeviceInput {
  userId: string;
  deviceType: string;
  deviceName: string;
  serialNumber?: string;
  brand?: string;
  model?: string;
  notes?: string;
  assignedDate?: Date | string;
}

export interface UpdateDeviceInput {
  deviceId: number;
  userId?: string;
  deviceType?: string;
  deviceName?: string;
  serialNumber?: string;
  brand?: string;
  model?: string;
  notes?: string;
  status?: DeviceStatusExtended;
  returnDate?: Date | string;
}

export interface DeleteDeviceInput {
  deviceId: number;
}
