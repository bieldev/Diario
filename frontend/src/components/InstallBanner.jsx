import { useState } from 'react'
import { useInstallPrompt } from '../hooks/useInstallPrompt.js'

export function InstallBanner() {
  const { canInstall, install, isIos } = useInstallPrompt()
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('install_dismissed') === '1'
  )

  if (!canInstall || dismissed) return null

  const dismiss = () => {
    localStorage.setItem('install_dismissed', '1')
    setDismissed(true)
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 max-w-[430px] mx-auto px-4 pt-safe">
      <div className="mt-3 bg-white dark:bg-[#1e1640] rounded-2xl shadow-xl border border-violet-100 dark:border-violet-900/50 px-4 py-3 flex items-center gap-3">
        <img src="/pwa-192.png" alt="ícone" className="w-11 h-11 rounded-xl shrink-0" />

        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm dark:text-white leading-tight">Adicionar à tela inicial</p>
          {isIos ? (
            <p className="text-xs text-gray-400 dark:text-slate-400 mt-0.5 leading-tight">
              Toque em <span className="font-bold">compartilhar</span> →&nbsp;
              <span className="font-bold">Adicionar à tela de início</span>
            </p>
          ) : (
            <p className="text-xs text-gray-400 dark:text-slate-400 mt-0.5">Abrir como app, sem barra do browser</p>
          )}
        </div>

        {isIos ? (
          <button
            onClick={dismiss}
            className="text-gray-400 dark:text-slate-500 text-xl leading-none shrink-0 px-1"
          >
            ×
          </button>
        ) : (
          <div className="flex gap-2 shrink-0">
            <button
              onClick={dismiss}
              className="text-xs font-bold text-gray-400 dark:text-slate-500 px-2 py-1.5"
            >
              Agora não
            </button>
            <button
              onClick={install}
              className="text-xs font-bold bg-violet-600 text-white px-3 py-1.5 rounded-xl"
            >
              Instalar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
