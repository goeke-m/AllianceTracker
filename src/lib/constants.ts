import type { StormConfig } from './types'

export const OWNER_USER_ID = 'edac282d-fd53-4353-8af8-c6b7c3f7480d'

export const ALLIANCE_MAX_MEMBERS = 100

export const DESERT_STORM_CONFIG: StormConfig = {
  eventType: 'ds',
  label: 'Desert Storm',
  participantCap: 20,
  substituteCap: 10,
  attendanceStatuses: ['present', 'no_show', 'subbed_in'],
}

export const CANYON_STORM_CONFIG: StormConfig = {
  eventType: 'canyon',
  label: 'Canyon Storm',
  participantCap: 20,
  substituteCap: 0,
  attendanceStatuses: ['present', 'no_show'],
}

export const SEASONS: number[] = [5, 6]
