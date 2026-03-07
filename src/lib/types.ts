export interface Member {
  id: string;
  name: string;
  rank: number; // 1-5
  created_at: string;
  updated_at: string;
}

export interface DamageLog {
  id: string;
  member_id: string;
  damage: number;
  event_date: string;
  notes?: string;
  created_at: string;
}

export interface MarshallPosition {
  id: string;
  name: string;
  rank: number;
  is_leadership: boolean;
  wad: number;
  ring_level: number;
  position_index: number;
}

export interface UserProfile {
  id: string;
  email: string;
  is_admin: boolean;
  created_at: string;
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
