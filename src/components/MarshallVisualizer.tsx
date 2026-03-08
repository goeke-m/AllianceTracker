import type { MemberWithWAD } from '../lib/types'

interface MarshallVisualizerProps {
  positions: MemberWithWAD[]
  marshallName?: string
}

const GRID_SIZE = 7
const CENTER = 3

function getCellRing(row: number, col: number): 0 | 1 | 2 | 3 {
  const dist = Math.max(Math.abs(row - CENTER), Math.abs(col - CENTER))
  if (dist === 0) return 0
  if (dist === 1) return 1
  if (dist === 2) return 2
  return 3
}

const RING_BG: Record<0 | 1 | 2 | 3, string> = {
  0: '#C85A00', // Marshall - orange
  1: '#2B4A8A', // Ring 1 - blue
  2: '#2E7A42', // Ring 2 - green
  3: '#7A4F1E', // Ring 3 - brown
}

const RING_EMPTY_BG: Record<1 | 2 | 3, string> = {
  1: '#1a3060',
  2: '#1a4a28',
  3: '#4a2e0e',
}

type CellRing = 0 | 1 | 2 | 3

interface GridCell {
  row: number
  col: number
  ring: CellRing
  member: MemberWithWAD | null
}

export function MarshallVisualizer({
  positions,
  marshallName = 'MARSHALL',
}: MarshallVisualizerProps) {
  // Sort members by slotIndex within each ring
  const byRing: Record<1 | 2 | 3, MemberWithWAD[]> = {
    1: positions.filter((p) => p.ring === 1).sort((a, b) => a.slotIndex - b.slotIndex),
    2: positions.filter((p) => p.ring === 2).sort((a, b) => a.slotIndex - b.slotIndex),
    3: positions.filter((p) => p.ring === 3).sort((a, b) => a.slotIndex - b.slotIndex),
  }

  // Track how many members we've consumed per ring as we scan in reading order
  const counters: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 }

  // Build flat cell list in reading order
  const cells: GridCell[] = []
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const ring = getCellRing(row, col)
      if (ring === 0) {
        cells.push({ row, col, ring: 0, member: null })
      } else {
        const member = byRing[ring][counters[ring]] ?? null
        counters[ring]++
        cells.push({ row, col, ring, member })
      }
    }
  }

  return (
    <div className="flex flex-col items-center w-full">
      <div
        className="w-full rounded-xl border border-game-accent bg-black p-1"
        style={{ maxWidth: 560 }}
      >
        <div
          className="grid w-full"
          style={{
            gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
            gap: 3,
          }}
        >
          {cells.map(({ row, col, ring, member }) => {
            if (ring === 0) {
              return (
                <div
                  key={`${row}-${col}`}
                  style={{ backgroundColor: RING_BG[0], aspectRatio: '1' }}
                  className="flex flex-col items-center justify-center text-white font-bold rounded-sm p-0.5"
                >
                  <span className="text-[7px] opacity-75 leading-none">MARSHALL</span>
                  <span className="text-[10px] leading-tight text-center break-words">
                    {marshallName.slice(0, 10)}
                  </span>
                </div>
              )
            }

            const bg = member ? RING_BG[ring] : RING_EMPTY_BG[ring]

            return (
              <div
                key={`${row}-${col}`}
                style={{ backgroundColor: bg, aspectRatio: '1' }}
                className="flex items-center justify-center text-white text-center rounded-sm p-0.5 leading-tight"
              >
                {member && (
                  <span
                    className="font-semibold break-words w-full text-center"
                    style={{ fontSize: 'clamp(7px, 1.6vw, 11px)' }}
                  >
                    {member.name}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: RING_BG[1] }} />
          Ring 1 (R4/R5)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: RING_BG[2] }} />
          Ring 2
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: RING_BG[3] }} />
          Ring 3
        </span>
      </div>
    </div>
  )
}
