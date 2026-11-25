import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { logError } from '../lib/errorLog'
import { formatPowerPrecise } from '../lib/formatPower'
import { buildHeroPowerPreview, type HeroPowerPreview } from '../lib/heroPowerImport'
import type { Member } from '../lib/types'

interface HeroPowerUploadProps {
  members: Member[]
  onDone: () => void
}

const buttonCls =
  'bg-game-card border border-game-accent text-gray-300 font-semibold px-4 py-1.5 rounded-lg text-sm hover:border-game-primary hover:text-white transition-colors disabled:opacity-50'

// Owner tool: upload a lastwarrank.com alliance page saved from the browser, preview the THP
// changes, then apply them. Replaces the sync's scrape, which the site's bot check now blocks.
export function HeroPowerUpload({ members, onDone }: HeroPowerUploadProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [reading, setReading] = useState(false)
  const [preview, setPreview] = useState<HeroPowerPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target
    const file = input.files?.[0]
    // Reset so choosing the same file again still fires onChange.
    input.value = ''
    if (!file) return

    setReading(true)
    setPreview(null)
    setError(null)
    setResult(null)
    try {
      setPreview(buildHeroPowerPreview(await file.text(), members))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setReading(false)
      setOpen(true)
    }
  }

  function close() {
    setOpen(false)
    setPreview(null)
    setError(null)
  }

  async function handleApply() {
    if (!preview) return
    setApplying(true)
    const errors: string[] = []
    let updated = 0
    for (const c of preview.changes) {
      const { error: updateError } = await supabase.from('members').update({ THP: c.newTHP }).eq('id', c.id)
      if (updateError) {
        errors.push(`${c.name}: ${updateError.message}`)
        logError('HeroPowerUpload.apply', updateError)
      } else {
        updated++
      }
    }
    setApplying(false)
    close()
    onDone()
    const message = t('members.heroPowerImport.result', { count: updated })
    setResult(errors.length > 0 ? `${message}. ${t('members.heroPowerImport.errorsPrefix', { errors: errors.join('; ') })}` : message)
    setTimeout(() => setResult(null), errors.length > 0 ? 15000 : 5000)
  }

  return (
    <>
      <input ref={inputRef} type="file" accept=".html,.htm,text/html" className="hidden" onChange={handleFile} />
      <button onClick={() => inputRef.current?.click()} disabled={reading || applying} className={buttonCls}>
        {reading ? t('members.heroPowerImport.reading') : t('members.heroPowerImport.button')}
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-game-card border border-game-accent rounded-2xl w-full max-w-md p-5 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className="text-game-primary font-bold">{t('members.heroPowerImport.button')}</h2>
              <button onClick={close} disabled={applying} className="text-gray-400 hover:text-white text-xl leading-none">
                ×
              </button>
            </div>

            {error && (
              <p className="text-game-highlight text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2 break-words">{error}</p>
            )}

            {preview && (
              <div className="space-y-3 overflow-y-auto min-h-0">
                <p className="text-sm text-gray-300">
                  {t('members.heroPowerImport.summary', {
                    rows: preview.rowCount,
                    matched: preview.matchedCount,
                    changes: preview.changes.length,
                  })}
                </p>
                {preview.changes.length === 0 ? (
                  <p className="text-sm text-gray-400">{t('members.heroPowerImport.noChanges')}</p>
                ) : (
                  <ul className="text-sm divide-y divide-game-accent border border-game-accent rounded-lg">
                    {preview.changes.map((c) => (
                      <li key={c.id} className="flex justify-between gap-3 px-3 py-1.5">
                        <span className="text-white truncate">{c.name}</span>
                        <span className="text-gray-300 whitespace-nowrap">
                          {formatPowerPrecise(c.oldTHP)} → {formatPowerPrecise(c.newTHP)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {preview.unmatched.length > 0 && (
                  <p className="text-xs text-gray-400">
                    {t('members.heroPowerImport.notOnPage', { names: preview.unmatched.join(', ') })}
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={close} disabled={applying} className={buttonCls}>
                {t('members.heroPowerImport.cancel')}
              </button>
              {preview && (
                <button
                  onClick={handleApply}
                  disabled={applying || preview.changes.length === 0}
                  className="bg-game-primary text-game-dark font-semibold px-4 py-1.5 rounded-lg text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {applying ? t('members.heroPowerImport.applying') : t('members.heroPowerImport.apply')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="fixed bottom-24 right-4 z-[60] bg-green-900 border border-green-600 text-green-300 text-sm font-medium px-5 py-3 rounded-xl shadow-lg max-w-sm">
          {result}
        </div>
      )}
    </>
  )
}
