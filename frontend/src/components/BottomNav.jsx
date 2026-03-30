import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

const PRIMARY_TABS = [
  { to: '/',       emoji: '🏠', label: 'Início'  },
  { to: '/mamar',  emoji: '🤱', label: 'Mamar'   },
  { to: '/fralda', emoji: '👶', label: 'Fralda'  },
  { to: '/sono',   emoji: '😴', label: 'Sono'    },
]

const MORE_ITEMS = [
  { to: '/historico',    emoji: '📋', label: 'Histórico'     },
  { to: '/stats',        emoji: '📊', label: 'Estatísticas'  },
  { to: '/fotos',        emoji: '📸', label: 'Fotos'         },
  { to: '/crescimento',  emoji: '📏', label: 'Crescimento'   },
  { to: '/notificacoes', emoji: '🔔', label: 'Notificações'  },
]

const MORE_PATHS = MORE_ITEMS.map(i => i.to)

export function BottomNav({ activeType }) {
  const [showMore, setShowMore] = useState(false)
  const location = useLocation()
  const isMoreActive = MORE_PATHS.includes(location.pathname)

  return (
    <>
      {/* Overlay */}
      {showMore && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowMore(false)}
        />
      )}

      {/* More sheet */}
      {showMore && (
        <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-50 max-w-[430px] mx-auto bg-white dark:bg-[#1e1640] border border-purple-100 dark:border-violet-900/40 rounded-t-2xl shadow-2xl">
          <div className="w-10 h-1 bg-gray-200 dark:bg-slate-600 rounded-full mx-auto mt-2.5 mb-1" />
          <div className="grid grid-cols-3 gap-2 p-3 pb-4">
            {MORE_ITEMS.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setShowMore(false)}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl transition-colors duration-200
                   ${isActive
                     ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400'
                     : 'text-gray-500 dark:text-slate-400 active:bg-gray-50 dark:active:bg-slate-800'}`
                }
              >
                <span className="text-2xl leading-none">{item.emoji}</span>
                <span className="text-[11px] font-semibold">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      )}

      {/* Nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1e1640] border-t border-purple-100 dark:border-violet-900/40 flex safe-bottom shadow-[0_-4px_20px_rgba(124,58,237,0.08)] z-50 transition-colors duration-400">
        {PRIMARY_TABS.map(tab => {
          const hasActivity =
            (tab.to === '/mamar' && activeType === 'feeding') ||
            (tab.to === '/sono'  && activeType === 'sleep')

          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              onClick={() => setShowMore(false)}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-0.5 pt-2.5 pb-2 relative transition-colors
                 ${isActive ? 'text-violet-600 dark:text-violet-400' : 'text-gray-400 dark:text-slate-500'}`
              }
            >
              {({ isActive }) => (
                <>
                  {hasActivity && (
                    <span className="absolute top-1.5 right-[calc(50%-14px)] w-2 h-2 rounded-full bg-emerald-400 border-2 border-white dark:border-[#1e1640]" />
                  )}
                  <span className="text-xl leading-none">{tab.emoji}</span>
                  <span className={`text-[10px] font-bold tracking-tight ${isActive ? 'text-violet-600 dark:text-violet-400' : 'text-gray-400 dark:text-slate-500'}`}>
                    {tab.label}
                  </span>
                  {isActive && (
                    <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-violet-600 dark:bg-violet-400 rounded-t" />
                  )}
                </>
              )}
            </NavLink>
          )
        })}

        {/* Mais */}
        <button
          onClick={() => setShowMore(v => !v)}
          className={`flex-1 flex flex-col items-center gap-0.5 pt-2.5 pb-2 relative transition-colors
            ${isMoreActive || showMore ? 'text-violet-600 dark:text-violet-400' : 'text-gray-400 dark:text-slate-500'}`}
        >
          <span className="text-xl leading-none">•••</span>
          <span className={`text-[10px] font-bold tracking-tight ${isMoreActive || showMore ? 'text-violet-600 dark:text-violet-400' : 'text-gray-400 dark:text-slate-500'}`}>
            Mais
          </span>
          {(isMoreActive || showMore) && (
            <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-violet-600 dark:bg-violet-400 rounded-t" />
          )}
        </button>
      </nav>
    </>
  )
}
