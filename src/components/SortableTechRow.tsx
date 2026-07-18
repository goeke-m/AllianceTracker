import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTranslation } from 'react-i18next'
import type { AllianceTechQueueItem } from '../lib/types'

interface SortableTechRowProps {
  item: AllianceTechQueueItem
  displayNumber: number
  isAdmin: boolean
}

export function SortableTechRow({ item, displayNumber, isAdmin }: SortableTechRowProps) {
  const { t } = useTranslation()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-4 py-3 bg-game-card ${isDragging ? 'shadow-lg rounded-lg relative z-10' : ''}`}
    >
      <span className="text-xs text-gray-600 w-5 text-right shrink-0">{displayNumber}</span>
      <div className="flex-1 min-w-0">
        <span className="text-sm text-white">{item.tech_name}</span>
        <span className={`ml-2 text-xs px-1.5 py-0.5 rounded capitalize ${
          item.category === 'war'
            ? 'bg-game-highlight/20 text-game-highlight'
            : 'bg-game-standard/20 text-game-standard'
        }`}>
          {item.category}
        </span>
      </div>
      {isAdmin && (
        <button
          {...attributes}
          {...listeners}
          aria-label={t('tech.dragToReorder')}
          className="shrink-0 w-6 h-6 flex items-center justify-center text-gray-500 hover:text-white cursor-grab active:cursor-grabbing touch-none"
        >
          ⠿
        </button>
      )}
    </div>
  )
}
