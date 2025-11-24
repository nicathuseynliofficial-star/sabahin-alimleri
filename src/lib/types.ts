import type { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  id: string;
  username: string;
  role: 'commander' | 'sub-commander';
  assignedUnitId?: string;
  canSeeAllUnits?: boolean;
}

export interface MilitaryUnit {
  id: string;
  name: string;
  commanderUsername: string;
  status: 'operating' | 'offline' | 'alert';
  location: {
    lat: number;
    lng: number;
  };
}

export interface MapObject {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
  };
  assignedUnitId: string;
  terrainType: string;
  proximityToPopulatedAreas: 'high' | 'medium' | 'low';
  knownEnemyPatrolRoutes: string;
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
