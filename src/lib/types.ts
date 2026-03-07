export interface Member {
  id: string;
  name: string;
  rank: number; // 1-5
  created: string;
  updated: string;
}

export interface DamageLog {
  id: string;
  member_id: string;
  damage: number;
  event_date: string;
  notes?: string;
  created: string;
}

export interface PBUser {
  id: string;
  email: string;
  is_admin: boolean;
}

export interface MemberWithWAD {
  id: string;
  name: string;
  rank: number;
  wad: number;
  ring: 1 | 2 | 3;
  slotIndex: number;
  isStrategicCore: boolean;
}

export type Page = 'map' | 'schedule' | 'admin';

export interface JsonImportEntry {
  name?: string;
  player?: string;
  member?: string;
  damage: number;
  date?: string;
  event_date?: string;
}
