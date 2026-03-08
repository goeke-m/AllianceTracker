import { useRef } from 'react'
import type { MemberWithWAD } from '../lib/types'
import { formatNumber } from '../lib/wad'

interface MarshallVisualizerProps {
  positions: MemberWithWAD[]
  marshallName?: string
}

const SVG_SIZE = 540
const CX = 270
const CY = 270
const RING_RADII = { 1: 90, 2: 185, 3: 270 }
const NODE_R = 22

function getRingSlotCount(ring: 1 | 2 | 3): number {
  return ring === 1 ? 8 : ring === 2 ? 16 : 24
}

function getNodePosition(
  ring: 1 | 2 | 3,
  slotIndex: number,
  totalSlots?: number
): { x: number; y: number } {
  const count = totalSlots ?? getRingSlotCount(ring)
  const radius = RING_RADII[ring]
  // Start from top (12 o'clock), go clockwise
  const angle = (slotIndex / count) * 2 * Math.PI - Math.PI / 2
  return {
    x: CX + radius * Math.cos(angle),
    y: CY + radius * Math.sin(angle),
  }
}

function rankColor(rank: number, isStrategicCore: boolean): string {
  if (rank >= 4) return '#c9a227' // gold for R4/R5
  if (isStrategicCore) return '#9b59b6' // purple for strategic (shouldn't occur by design)
  if (rank === 3) return '#4a90d9' // blue for R3
  if (rank === 2) return '#27ae60' // green for R2
  return '#7f8c8d' // gray for R1
}

function rankLabel(rank: number): string {
  return `R${rank}`
}

function abbreviate(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return name.slice(0, 6)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

export function MarshallVisualizer({
  positions,
  marshallName = 'MARSHALL',
}: MarshallVisualizerProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  const ring1 = positions.filter((p) => p.ring === 1)
  const ring2 = positions.filter((p) => p.ring === 2)
  const ring3 = positions.filter((p) => p.ring === 3)

  function handleExport() {
    const svg = svgRef.current
    if (!svg) return
    const serializer = new XMLSerializer()
    const svgStr = serializer.serializeToString(svg)
    const blob = new Blob([svgStr], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'marshall-map.svg'
    a.click()
    URL.revokeObjectURL(url)
  }

  function renderNode(member: MemberWithWAD, x: number, y: number) {
    const color = rankColor(member.rankNum, member.isStrategicCore)
    const abbr = abbreviate(member.name)
    return (
      <g key={member.id} transform={`translate(${x},${y})`}>
        <circle
          r={NODE_R}
          fill={color}
          stroke={member.isStrategicCore && member.rankNum < 4 ? '#e94560' : '#1a3a6e'}
          strokeWidth={2}
          opacity={0.92}
        />
        {member.rankNum >= 4 && (
          <circle r={NODE_R + 3} fill="none" stroke="#FFD700" strokeWidth={1.5} opacity={0.5} />
        )}
        <text
          textAnchor="middle"
          dominantBaseline="middle"
          y={-5}
          fontSize={abbr.length > 4 ? 7 : 8}
          fontWeight="700"
          fill="white"
        >
          {abbr}
        </text>
        <text
          textAnchor="middle"
          dominantBaseline="middle"
          y={6}
          fontSize={6}
          fill="rgba(255,255,255,0.75)"
        >
          {member.Rank}
        </text>
        <text
          textAnchor="middle"
          dominantBaseline="middle"
          y={14}
          fontSize={5.5}
          fill="rgba(255,255,255,0.6)"
        >
          {formatNumber(member.wad)}
        </text>
      </g>
    )
  }

  return (
    <div className="flex flex-col items-center">
      <div className="w-full overflow-hidden rounded-xl border border-game-accent bg-game-dark">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
          className="w-full h-auto"
          style={{ maxHeight: '70vh' }}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background */}
          <rect width={SVG_SIZE} height={SVG_SIZE} fill="#0d0d1a" />

          {/* Ring guidelines */}
          {([1, 2, 3] as const).map((ring) => (
            <circle
              key={ring}
              cx={CX}
              cy={CY}
              r={RING_RADII[ring]}
              fill="none"
              stroke="#1a3a6e"
              strokeWidth={1}
              strokeDasharray="4 4"
              opacity={0.5}
            />
          ))}

          {/* Ring labels */}
          {([1, 2, 3] as const).map((ring) => (
            <text
              key={`label-${ring}`}
              x={CX + RING_RADII[ring] - 8}
              y={CY - 4}
              fontSize={9}
              fill="#1a3a6e"
              opacity={0.8}
            >
              R{ring}
            </text>
          ))}

          {/* Ring 1 empty slots */}
          {Array.from({ length: 8 }).map((_, i) => {
            const filled = ring1.some((p) => p.slotIndex === i)
            if (filled) return null
            const { x, y } = getNodePosition(1, i)
            return (
              <circle
                key={`r1-empty-${i}`}
                cx={x}
                cy={y}
                r={NODE_R}
                fill="#1a3a6e"
                opacity={0.3}
                strokeDasharray="3 3"
                stroke="#4a90d9"
                strokeWidth={1}
              />
            )
          })}

          {/* Ring 2 strategic empty slots (first 3) */}
          {Array.from({ length: 3 }).map((_, i) => {
            const filled = ring2.some((p) => p.slotIndex === i && p.isStrategicCore)
            if (filled) return null
            const { x, y } = getNodePosition(2, i, 16)
            return (
              <circle
                key={`r2-strategic-empty-${i}`}
                cx={x}
                cy={y}
                r={NODE_R}
                fill="#2d1b4e"
                opacity={0.4}
                strokeDasharray="3 3"
                stroke="#c9a227"
                strokeWidth={1}
              />
            )
          })}

          {/* Marshall center */}
          <circle cx={CX} cy={CY} r={34} fill="#c9a227" opacity={0.15} />
          <circle cx={CX} cy={CY} r={28} fill="#c9a227" opacity={0.9} />
          <text
            x={CX}
            y={CY - 6}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={7}
            fontWeight="800"
            fill="#0d0d1a"
          >
            MARSHALL
          </text>
          <text
            x={CX}
            y={CY + 6}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={9}
            fontWeight="700"
            fill="#0d0d1a"
          >
            {marshallName.slice(0, 8)}
          </text>

          {/* Ring 1 nodes */}
          {ring1.map((m) => {
            const { x, y } = getNodePosition(1, m.slotIndex)
            return renderNode(m, x, y)
          })}

          {/* Ring 2 nodes */}
          {ring2.map((m) => {
            const { x, y } = getNodePosition(2, m.slotIndex, 16)
            return renderNode(m, x, y)
          })}

          {/* Ring 3 nodes */}
          {ring3.map((m) => {
            const total = Math.max(ring3.length, 1)
            const { x, y } = getNodePosition(3, m.slotIndex, total)
            return renderNode(m, x, y)
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-game-leadership inline-block" />
          R4/R5 Leadership
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-game-standard inline-block" />
          R3
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-green-600 inline-block" />
          R2
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-gray-500 inline-block" />
          R1
        </span>
      </div>

      <button
        onClick={handleExport}
        className="mt-4 px-5 py-2 bg-game-accent border border-game-gold text-game-gold rounded-lg text-sm font-medium hover:bg-game-gold hover:text-game-dark transition-colors"
      >
        Export Map (SVG)
      </button>
    </div>
  )
}
