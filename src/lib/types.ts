import type { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  id: string;
  username: string;
  password?: string; // Made optional as it's not always needed client-side
  role: 'commander' | 'sub-commander';
  assignedUnitId?: string;
  canSeeAllUnits?: boolean;
}

export interface MilitaryUnit {
  id: string;
  name: string;
  commanderId: string;
  status: 'operational' | 'offline' | 'alert';
  latitude: number;
  longitude: number;
  mapId: string; // To associate unit with a specific map
}

export interface OperationTarget {
  id: string;
  name: string;
  assignedUnitId: string;
  latitude: number; // This will store the Y percentage
  longitude: number; // This will store the X percentage
  status: 'pending' | 'active' | 'passive';
  mapId: string; // To associate target with a specific map
}


export interface Decoy {
  id: string;
  publicName: string; // e.g. "Bölük Alfa"
  latitude: number;
  longitude: number;
  operationTargetId: string;
}
