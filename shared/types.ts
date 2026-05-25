/**
 * Unified type exports
 * Import shared types from this single entry point.
 */

export type * from "../drizzle/schema";
export * from "./_core/errors";

export interface StoreSession {
  storeId: number;
  storeName: string;
  phoneNumber: string;
  subscriptionExpiresAt?: Date | string | null;
  token?: string;
}

export interface AdminSession {
  adminId: number;
  username: string;
  token?: string;
}

export interface OrderItem {
  id: number;
  storeId: number;
  pickupTime: Date | string;
  mealContent: string;
  phoneLastThree: string;
  note?: string | null;
  createdAt: Date | string;
}
