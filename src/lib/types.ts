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
  status: 'operating' | 'offline' | 'alert';
  location: {
    lat: number;
    lng: number;
  };
  mapId: string; // To associate unit with a specific map
}

export interface OperationTarget {
  id: string;
  name: string;
  assignedUnitId: string;
  location: {
    lat: number; // This will store the Y percentage
    lng: number; // This will store the X percentage
  };
  status: 'pending' | 'active' | 'completed';
  mapId: string; // To associate target with a specific map
}


export interface Decoy {
  id: string;
  location: {
    lat: number;
    lng: number;
  };
  reasoning: string;
  timestamp: Timestamp;
  originalTargetId: string;
}
