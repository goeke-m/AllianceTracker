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
  created: string;
  updated: string;
  expand?: {
    Conductor: Member;
    VIP: Member;
  };
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
