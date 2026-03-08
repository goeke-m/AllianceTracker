// Seed script: inserts all OPNz members into PocketBase
// Usage: PB_EMAIL=admin@example.com PB_PASSWORD=secret node scripts/seed-members.js

import PocketBase from 'pocketbase'

const PB_URL = process.env.VITE_PB_URL || 'https://opnz-pocketbase.fly.dev'
const PB_EMAIL = process.env.PB_EMAIL
const PB_PASSWORD = process.env.PB_PASSWORD

if (!PB_EMAIL || !PB_PASSWORD) {
  console.error('Error: PB_EMAIL and PB_PASSWORD environment variables are required.')
  console.error('Usage: PB_EMAIL=admin@x.com PB_PASSWORD=secret node scripts/seed-members.js')
  process.exit(1)
}

const rankMap = { R1: 1, R2: 2, R3: 3, R4: 4, R5: 5 }

// Parse values like "146.6M" -> 146600000, or "0.00" -> 0, or null -> null
function parsePower(val) {
  if (val == null) return null
  const s = String(val).trim()
  if (s === '0.00' || s === '0') return 0
  if (s.endsWith('M')) return Math.round(parseFloat(s) * 1_000_000)
  return parseFloat(s) || null
}

const members = [
  { "name": "Ruthless cajun", "Rank": "R4", "THP": "146.6", "Squad 1 Power": "45.8M", "Squad 1 Type": "Air", "Squad 2 Power": "38.5M", "Squad 2 Type": "Tank", "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Gigiyy", "Rank": "R3", "THP": "147.4", "Squad 1 Power": "44.4M", "Squad 1 Type": "Tank", "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "BaconALcH3MiST", "Rank": "R4", "THP": "122.9", "Squad 1 Power": "40.8M", "Squad 1 Type": "Air", "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "SammiX 삼미", "Rank": "R3", "THP": "107.8", "Squad 1 Power": "37.0M", "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "deezzz420", "Rank": "R4", "THP": "107.4", "Squad 1 Power": "36.1M", "Squad 1 Type": "Air", "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Dhilldo", "Rank": "R4", "THP": "116.7", "Squad 1 Power": "35.4M", "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Be BetteR", "Rank": "R3", "THP": "101.2", "Squad 1 Power": "35.3M", "Squad 1 Type": "Tank", "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Jacksonrebel", "Rank": "R3", "THP": "94.3", "Squad 1 Power": "32.9M", "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "50 Cal Diplomacy", "Rank": "R3", "THP": "100.0", "Squad 1 Power": "32.5M", "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "ELLIOT5", "Rank": "R4", "THP": "93.2", "Squad 1 Power": "31.9M", "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "PAINisthebestTeacher", "Rank": "R5", "THP": "83.9", "Squad 1 Power": "31.91M", "Squad 1 Type": "Tank", "Squad 2 Power": "24.91M", "Squad 2 Type": "Air", "Avg VS Pts": 0.0, "Availability": null },
  { "name": "ShadowMohawk", "Rank": "R4", "THP": "85.4", "Squad 1 Power": "31.7M", "Squad 1 Type": "Tank", "Squad 2 Power": "25.5M", "Squad 2 Type": "Air", "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Saucy808", "Rank": "R4", "THP": "86.6", "Squad 1 Power": "31.4M", "Squad 1 Type": "Tank", "Squad 2 Power": "26.3M", "Squad 2 Type": "Air", "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Guilherra", "Rank": "R3", "THP": "90.2", "Squad 1 Power": "31.3M", "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "CockaMaemie", "Rank": "R3", "THP": "79.5", "Squad 1 Power": "31.2M", "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Paxaz", "Rank": "R3", "THP": "84.0", "Squad 1 Power": "31.0M", "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "skibidi rizz toilet5", "Rank": "R4", "THP": "83.6", "Squad 1 Power": "30.8M", "Squad 1 Type": "Tank", "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "GHOST BR", "Rank": "R3", "THP": "82.7", "Squad 1 Power": "30.7M", "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "KABRAL9", "Rank": "R3", "THP": "85.2", "Squad 1 Power": "30.7M", "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "MavKel", "Rank": "R3", "THP": "90.1", "Squad 1 Power": "30.5M", "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "WapitiDreaming", "Rank": "R4", "THP": "85.5", "Squad 1 Power": "30.4M", "Squad 1 Type": "Tank", "Squad 2 Power": "24.3M", "Squad 2 Type": "Air", "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Shadows1983", "Rank": "R3", "THP": "86.0", "Squad 1 Power": "30.4M", "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "lunacyde", "Rank": "R3", "THP": "94.1", "Squad 1 Power": "30.2M", "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Andressita31", "Rank": "R3", "THP": "79.9", "Squad 1 Power": "30.1M", "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "JoSto03", "Rank": "R3", "THP": "84.5", "Squad 1 Power": "29.9M", "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "GatitoTriste", "Rank": "R4", "THP": "78.2", "Squad 1 Power": "29.6M", "Squad 1 Type": "Tank", "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Thiagoksp", "Rank": "R3", "THP": "84.0", "Squad 1 Power": "29.5M", "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "stonerD", "Rank": "R3", "THP": "79.1", "Squad 1 Power": "29.4M", "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Abycon", "Rank": "R3", "THP": "75.7", "Squad 1 Power": "29.3M", "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Captain Phoenix", "Rank": "R2", "THP": "87.5", "Squad 1 Power": "29.3M", "Squad 1 Type": "Tank", "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "DestructorDeSnacks", "Rank": "R3", "THP": "87.0", "Squad 1 Power": "29.2M", "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "GenioFonseca", "Rank": "R3", "THP": "78.8", "Squad 1 Power": "29.2M", "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Echo Magistrada", "Rank": "R3", "THP": "81.2", "Squad 1 Power": "29.1M", "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Alfredm87", "Rank": "R3", "THP": "91.2", "Squad 1 Power": "28.3M", "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Fancyfootwork", "Rank": "R3", "THP": "83.1", "Squad 1 Power": "27.2M", "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Argus III", "Rank": "R3", "THP": "82.9", "Squad 1 Power": "27.0M", "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "BeastMachine", "Rank": "R3", "THP": "83.4", "Squad 1 Power": "26.9M", "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "JU STARS", "Rank": "R3", "THP": "24.0", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Acid Hologram", "Rank": "R3", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Amélie POulain", "Rank": "R3", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "DazMiq", "Rank": "R3", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Dioguines", "Rank": "R3", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Dredd Pirate Roberts", "Rank": "R3", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "DRMAlito", "Rank": "R3", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Duval and Co", "Rank": "R3", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Emma Ö", "Rank": "R3", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Flores 19", "Rank": "R3", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "GoyeliCR", "Rank": "R3", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Jboo1027", "Rank": "R3", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "jcruzrico", "Rank": "R3", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Kimy Q", "Rank": "R3", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "km1180", "Rank": "R3", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "kokis Titito", "Rank": "R3", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Laprada", "Rank": "R3", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Liveone", "Rank": "R3", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "LuffyJr", "Rank": "R3", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "LuffyRdz", "Rank": "R3", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Luis René", "Rank": "R3", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Luisbolter", "Rank": "R3", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Mestre yoda", "Rank": "R3", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "millmj08", "Rank": "R3", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "MõistMeatSocket", "Rank": "R3", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "MONKY LUFFY", "Rank": "R3", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "My name JeFF", "Rank": "R3", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "nicki", "Rank": "R3", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Papa Penu", "Rank": "R3", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "PenséQueEraFacil", "Rank": "R3", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "pol0loco", "Rank": "R3", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "ponygirlrocks11", "Rank": "R3", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "RepoMan6060", "Rank": "R3", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "SGT SMOKER", "Rank": "R3", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Simplemente Val", "Rank": "R3", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "SimplySmk", "Rank": "R3", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "SirFred1", "Rank": "R3", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "TainaraPompeu", "Rank": "R3", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Taiska Valk", "Rank": "R3", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Thomas Callahan III", "Rank": "R3", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Vikernes 666", "Rank": "R3", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "XMEIGA", "Rank": "R3", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "XxX Bradley XxX", "Rank": "R3", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "XxX Sparky XxX", "Rank": "R3", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "AustinPOwers", "Rank": "R2", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "ChessM", "Rank": "R2", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Comandante Pico", "Rank": "R2", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Craig D03", "Rank": "R2", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Jon McCall22", "Rank": "R2", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Leonnoo", "Rank": "R2", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Martin 2525", "Rank": "R2", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Michdab", "Rank": "R2", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Slapya", "Rank": "R2", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "11daniella", "Rank": "R1", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "4dr13L", "Rank": "R1", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "DAN140296", "Rank": "R1", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Grand Emperor Viejo", "Rank": "R1", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "King Arthur 500", "Rank": "R1", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Luffycita", "Rank": "R1", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "MINI ME", "Rank": "R1", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Mushroom Helmet", "Rank": "R1", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Reiley", "Rank": "R1", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
  { "name": "Roeezz", "Rank": "R1", "THP": "0.00", "Squad 1 Power": null, "Squad 1 Type": null, "Squad 2 Power": null, "Squad 2 Type": null, "Avg VS Pts": 0.0, "Availability": null },
]

async function main() {
  const pb = new PocketBase(PB_URL)

  console.log(`Connecting to ${PB_URL}...`)
  try {
    await pb.collection('_superusers').authWithPassword(PB_EMAIL, PB_PASSWORD)
  } catch {
    await pb.admins.authWithPassword(PB_EMAIL, PB_PASSWORD)
  }
  console.log('Authenticated as admin.')

  const validRanks = new Set(['R1', 'R2', 'R3', 'R4', 'R5'])
  let created = 0
  let updated = 0
  let failed = 0

  for (const m of members) {
    const commanderName = m.Commander ?? m.name
    if (!commanderName) {
      console.warn(`  Skipping entry — no name: ${JSON.stringify(m)}`)
      continue
    }
    if (!validRanks.has(m.Rank)) {
      console.warn(`  Skipping ${commanderName} — invalid rank "${m.Rank}"`)
      continue
    }

    const data = {
      name: commanderName,
      Rank: m.Rank,
      THP: parsePower(m.THP),
      S1_Power: parsePower(m['Squad 1 Power']),
      S1_Type: m['Squad 1 Type'] ?? null,
      S2_Power: parsePower(m['Squad 2 Power']),
      S2_Type: m['Squad 2 Type'] ?? null,
      Strike_Team: false,
      Availability: m.Availability ?? null,
    }

    try {
      const escaped = commanderName.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
      const existing = await pb.collection('members').getFirstListItem(`name="${escaped}"`)
      const result = await pb.collection('members').update(existing.id, data)
      console.log(`  ~ updated  ${commanderName} — THP:${result.THP ?? 'null'} S1_Power:${result.S1_Power ?? 'null'}`)
      updated++
    } catch {
      try {
        await pb.collection('members').create(data)
        console.log(`  + created  ${commanderName} (${m.Rank})`)
        created++
      } catch (err) {
        console.error(`  ! FAILED   ${commanderName}: ${err?.message ?? err}`)
        failed++
      }
    }
  }

  console.log(`
Done: ${created} created, ${updated} updated, ${failed} failed.`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
