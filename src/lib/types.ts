export type RankValue = 'R1' | 'R2' | 'R3' | 'R4' | 'R5';
export type SquadType = 'Tank' | 'Air' | 'Missile';

export interface Member {
  id: string;
  name: string;
  Rank: RankValue;
  THP?: number;
  S1_Power?: number;
  S1_Type?: SquadType;
  S2_Power?: number;
  S2_Type?: SquadType;
  Strike_Team?: boolean;
  Availability?: string;
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

export interface PBUser {
  id: string;
  email: string;
  is_admin: boolean;
}

export interface MemberWithWAD {
  id: string;
  name: string;
  Rank: RankValue;
  rankNum: number; // 1-5, derived from Rank
  wad: number;
  ring: 1 | 2 | 3;
  slotIndex: number;
  isStrategicCore: boolean;
}

export interface TrainEntry {
  id: string;
  date: string; // YYYY-MM-DD
  conductor: string; // member id
  vip: string; // member id
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface OotoEntry {
  id: string;
  member_id: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type Page = 'map' | 'schedule' | 'out' | 'admin' | 'tech' | 'kills' | 'friends';

export interface KillListEntry {
  id: string;
  name: string;
  server: string;
  reason?: string;
  created_at: string;
}

export interface FriendsListEntry {
  id: string;
  name: string;
  server: string;
  reason?: string;
  created_at: string;
}

export interface AllianceTechStatus {
  key: 'current' | 'next'
  tech_name: string
  category: 'development' | 'war'
  updated_at: string
}

export interface Demerit {
  id: string;
  member_id: string;
  date: string; // YYYY-MM-DD
  note: string;
  created_at: string;
}

export interface VsPoint {
  id: string;
  member_id: string;
  week_ending: string; // YYYY-MM-DD
  points: number;
  created_at: string;
}

export interface JsonImportEntry {
  name?: string;
  player?: string;
  member?: string;
  damage: number;
  date?: string;
  event_date?: string;
}
