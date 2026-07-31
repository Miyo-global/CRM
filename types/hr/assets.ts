import { AssetStatus } from "./common";

export interface Asset {
  id: number;
  orgId: string;
  name: string;
  type: string;
  serialNumber: string | null;
  brand: string | null;
  model: string | null;
  assignedTo: string | null;
  status: AssetStatus | null;
  purchaseDate: string | null;
  purchaseCost: string | null;
  location: string | null;
  notes: string | null;
  assignmentCount?: number;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
}

/** Inventory registration only — assignment is a separate PATCH lifecycle step. */
export interface CreateAssetInput {
  name: string;
  type: string;
  serialNumber: string;
  brand: string;
  model: string;
  purchaseDate: string;
  purchaseCost: number;
  location?: string;
  notes?: string;
}

export interface UpdateAssetInput {
  assetId: number;
  name?: string;
  type?: string;
  serialNumber?: string;
  brand?: string;
  model?: string;
  assignedTo?: string;
  status?: AssetStatus;
  purchaseDate?: string;
  purchaseCost?: number;
  location?: string;
  notes?: string;
  reassignmentReason?: string;
}
