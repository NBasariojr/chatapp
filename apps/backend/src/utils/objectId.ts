import { Types } from 'mongoose';

/**
 * Safely converts MongoDB ObjectId to string
 * @param id - ObjectId or string
 * @returns string representation of the ObjectId
 */
export function ObjectIdToString(id: Types.ObjectId | string): string {
  if (id instanceof Types.ObjectId) {
    return id.toHexString();
  }
  return String(id);
}

/**
 * Type guard to check if value is a MongoDB ObjectId
 * @param value - value to check
 * @returns true if value is an ObjectId
 */
export function isObjectId(value: any): value is Types.ObjectId {
  return value instanceof Types.ObjectId;
}
