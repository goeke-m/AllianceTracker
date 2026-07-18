import { useTranslation } from 'react-i18next'
import type { MemberWithWAD } from '../lib/types'

interface MarshallVisualizerProps {
  positions: MemberWithWAD[]
  marshallName?: string
}

// Grid cell definitions matching the Marshall grid layout from the image.
// 'r45' cells are for R4/R5 members (blue), placed by damage rank.
// 'std' cells are for regular members (green/brown), placed by damage rank.
// rank is 1-indexed: rank 1 = highest damage.
type CellDef = { t: 'mg' } | { t: 'r45'; r: number } | { t: 'std'; r: number }

const S = (r: number): CellDef => ({ t: 'std', r })
const R = (r: number): CellDef => ({ t: 'r45', r })
const MG: CellDef = { t: 'mg' }

// 7x7 grid layout. Center is row 3, col 3.
const GRID_LAYOUT: CellDef[][] = [
  [S(34), S(26), S(18), S(14), S(19), S(27), S(35)],
  [S(33), S(10), S(2),  S(1),  S(3),  S(11), S(28)],
  [S(25), S(9),  R(5),  R(1),  R(6),  S(4),  S(20)],
  [S(17), R(9),  R(4),  MG,    R(2),  R(10), S(15)],
  [S(24), S(8),  R(8),  R(3),  R(7),  S(5),  S(21)],
  [S(32), S(13), S(7),  R(11), S(6),  S(12), S(29)],
  [S(37), S(31), S(23), S(16), S(22), S(30), S(36)],
]

const COLORS = {
  mg:        '#C85A00',
  r45:       '#2B4A8A',
  r45Empty:  '#1a3060',
  stdInner:  '#2E7A42',  // std ranks 1-13 (ring 2 distance)
  stdOuter:  '#7A4F1E',  // std ranks 14+ (ring 3 distance)
  stdInnerEmpty: '#1a4a28',
  stdOuterEmpty: '#4a2e0e',
}

export function MarshallVisualizer({
  positions,
  marshallName = 'MARSHALL',
}: MarshallVisualizerProps) {
  const { t } = useTranslation()
  // Sort R4/R5 and standard members by damage rank (slotIndex 0 = rank 1)
  const r45Members = positions
    .filter((p) => p.ring === 1)
    .sort((a, b) => a.slotIndex - b.slotIndex)
  const stdMembers = positions
    .filter((p) => p.ring === 2)
    .sort((a, b) => a.slotIndex - b.slotIndex)

  const flatCells = GRID_LAYOUT.flat()

  return (
    <div className="flex flex-col items-center w-full">
      <div
        className="w-full rounded-xl border border-game-accent bg-black p-1"
        style={{ maxWidth: 560 }}
      >
        <div
          className="grid w-full"
          style={{
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 3,
          }}
        >
          {flatCells.map((cell, i) => {
            if (cell.t === 'mg') {
              return (
                <div
                  key={i}
                  style={{ backgroundColor: COLORS.mg, aspectRatio: '1' }}
                  className="flex flex-col items-center justify-center text-white font-bold rounded-sm p-0.5"
                >
                  <span className="text-[7px] opacity-75 leading-none">{t('map.marshallCellLabel')}</span>
                  <span className="text-[10px] leading-tight text-center break-words">
                    {marshallName.slice(0, 10)}
                  </span>
                </div>
              )
            }

            const member =
              cell.t === 'r45'
                ? (r45Members[cell.r - 1] ?? null)
                : (stdMembers[cell.r - 1] ?? null)

            let bg: string
            if (cell.t === 'r45') {
              bg = member ? COLORS.r45 : COLORS.r45Empty
            } else if (cell.r <= 13) {
              bg = member ? COLORS.stdInner : COLORS.stdInnerEmpty
            } else {
              bg = member ? COLORS.stdOuter : COLORS.stdOuterEmpty
            }

            return (
              <div
                key={i}
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
          <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: COLORS.r45 }} />
          {t('map.legendR45')}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: COLORS.stdInner }} />
          {t('map.legendInner')}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: COLORS.stdOuter }} />
          {t('map.legendOuter')}
        </span>
      </div>
    </div>
  )
}
