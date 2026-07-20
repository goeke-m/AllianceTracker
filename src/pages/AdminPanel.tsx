import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MemberManager } from '../components/MemberManager'
import { DemeritManager } from '../components/DemeritManager'
import { VsPointManager } from '../components/VsPointManager'
import { ErrorLogManager } from '../components/ErrorLogManager'
import { useMarshallData } from '../hooks/useMarshallData'
import { useAuth } from '../hooks/useAuth'
import { OWNER_USER_ID } from '../lib/constants'

type AdminTab = 'members' | 'demerits' | 'vs points' | 'errors'

const TAB_LABEL_KEYS: Record<AdminTab, string> = {
  members: 'admin.tabMembers',
  demerits: 'admin.tabDemerits',
  'vs points': 'admin.tabVsPoints',
  errors: 'admin.tabErrors',
}

export function AdminPanel() {
  const { t } = useTranslation()
  const { members, loading, error, refresh } = useMarshallData()
  const { user } = useAuth()
  const [tab, setTab] = useState<AdminTab>('members')

  return (
    <div className="p-4 pb-24 space-y-4">
      <h1 className="text-xl font-bold text-game-primary">{t('admin.title')}</h1>

      {loading && (
        <div className="text-center py-8 text-game-primary animate-pulse">{t('common.loading')}</div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-game-highlight text-sm">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="flex gap-1 border-b border-game-accent">
            {(['members', 'demerits', 'vs points'] as AdminTab[])
              .concat(user?.id === OWNER_USER_ID ? ['errors'] : [])
              .map((tabId) => (
                <button
                  key={tabId}
                  onClick={() => setTab(tabId)}
                  className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                    tab === tabId
                      ? 'border-game-primary text-game-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {t(TAB_LABEL_KEYS[tabId])}
                </button>
              ))}
          </div>

          {tab === 'members' && <MemberManager members={members} onRefresh={refresh} syncUserId={user?.id} />}
          {tab === 'demerits' && <DemeritManager members={members} />}
          {tab === 'vs points' && <VsPointManager members={members} />}
          {tab === 'errors' && user?.id === OWNER_USER_ID && <ErrorLogManager />}
        </>
      )}
    </div>
  )
}
