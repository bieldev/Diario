import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { pushApi } from '../api/push.js'
import { usePushNotifications } from '../hooks/usePushNotifications.js'

const FEEDING_OPTIONS = [
  { value: 120, label: '2h' },
  { value: 180, label: '3h' },
  { value: 240, label: '4h' },
  { value: 300, label: '5h' },
]
const SLEEP_OPTIONS = [
  { value: 120, label: '2h' },
  { value: 180, label: '3h' },
  { value: 240, label: '4h' },
  { value: 300, label: '5h' },
  { value: 360, label: '6h' },
]

function Toggle({ value, onChange, disabled }) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
        value ? 'bg-violet-600' : 'bg-gray-300 dark:bg-slate-600'
      } ${disabled ? 'opacity-40' : ''}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
        value ? 'translate-x-6' : 'translate-x-0'
      }`} />
    </button>
  )
}

function OptionRow({ label, sub, right }) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-gray-50 dark:border-violet-900/20 last:border-0">
      <div>
        <p className="text-sm font-semibold dark:text-white">{label}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{sub}</p>}
      </div>
      {right}
    </div>
  )
}

function IntervalSelect({ options, value, onChange, disabled }) {
  return (
    <select
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      disabled={disabled}
      className="text-sm font-bold text-violet-600 dark:text-violet-400 bg-transparent border-none outline-none cursor-pointer disabled:opacity-40"
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

export function NotificationsScreen() {
  const qc = useQueryClient()
  const { isSupported, permission, subscribed, loading: subLoading, error: subError, subscribe, unsubscribe } = usePushNotifications()
  const [testSent, setTestSent] = useState(false)

  const { data: settings, isLoading } = useQuery({
    queryKey: ['push-settings'],
    queryFn:  pushApi.getSettings,
  })

  const updateMutation = useMutation({
    mutationFn: pushApi.updateSettings,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['push-settings'] }),
  })

  const testMutation = useMutation({
    mutationFn: pushApi.sendTest,
    onSuccess:  () => { setTestSent(true); setTimeout(() => setTestSent(false), 3000) },
  })

  const set = (field, value) => {
    updateMutation.mutate({ [field]: value ? 1 : 0 })
  }
  const setNum = (field, value) => updateMutation.mutate({ [field]: value })

  const isActive    = subscribed && !!settings?.enabled
  const canSettings = subscribed && settings

  // ─── Status do sistema ────────────────────────────────────────────────────
  const statusInfo = () => {
    if (!isSupported)        return { icon: '⚠️', text: 'Não suportado neste browser', color: 'text-amber-500' }
    if (permission === 'denied') return { icon: '🚫', text: 'Permissão negada — habilite nas configurações do browser', color: 'text-red-500' }
    if (!subscribed)         return { icon: '🔕', text: 'Notificações desativadas', color: 'text-gray-400' }
    if (!settings?.enabled)  return { icon: '⏸️', text: 'Pausadas (ativadas mas silenciadas)', color: 'text-amber-500' }
    return { icon: '🔔', text: 'Ativas e funcionando', color: 'text-emerald-500' }
  }
  const status = statusInfo()

  return (
    <div className="px-4 pb-4 overflow-y-auto overscroll-y-none h-full">
      <div className="pt-5 pb-4">
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">🔔 Notificações</h1>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Push — funciona com o app fechado</p>
      </div>

      {/* Status card */}
      <div className="bg-white dark:bg-[#1e1640] rounded-2xl p-4 shadow-sm mb-4 flex items-center gap-3">
        <span className="text-2xl">{status.icon}</span>
        <p className={`text-sm font-semibold ${status.color}`}>{status.text}</p>
      </div>

      {/* Ativar / desativar push */}
      <div className="bg-white dark:bg-[#1e1640] rounded-2xl shadow-sm mb-4 px-4">
        <OptionRow
          label="Ativar notificações push"
          sub={subscribed ? 'Este dispositivo está inscrito' : 'Receba alertas mesmo com o app fechado'}
          right={
            <Toggle
              value={subscribed}
              onChange={subscribed ? unsubscribe : subscribe}
              disabled={subLoading || !isSupported || permission === 'denied'}
            />
          }
        />
        {subLoading && <p className="text-xs text-gray-400 pb-3">Aguardando permissão...</p>}
        {subError   && <p className="text-xs text-red-400 pb-3">{subError}</p>}
      </div>

      {/* Configurações (só aparece quando inscrito) */}
      {canSettings && (
        <>
          <div className="bg-white dark:bg-[#1e1640] rounded-2xl shadow-sm mb-4 px-4">
            <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider pt-4 pb-1">Lembretes</p>

            <OptionRow
              label="Ativo"
              sub="Pausa todos os lembretes sem desinscrever"
              right={
                <Toggle
                  value={!!settings.enabled}
                  onChange={v => set('enabled', v)}
                />
              }
            />

            <OptionRow
              label="🤱 Lembrete de mamada"
              sub="Avisa se Helena não mamou no intervalo"
              right={
                <IntervalSelect
                  options={FEEDING_OPTIONS}
                  value={settings.feeding_interval_min}
                  onChange={v => setNum('feeding_interval_min', v)}
                  disabled={!settings.enabled}
                />
              }
            />

            <OptionRow
              label="😴 Sono muito longo"
              sub="Avisa se Helena estiver dormindo demais"
              right={
                <IntervalSelect
                  options={SLEEP_OPTIONS}
                  value={settings.long_sleep_min}
                  onChange={v => setNum('long_sleep_min', v)}
                  disabled={!settings.enabled}
                />
              }
            />

            <OptionRow
              label="📊 Resumo diário às 21h"
              sub="Mamadas, fraldas e sono do dia"
              right={
                <Toggle
                  value={!!settings.daily_summary}
                  onChange={v => set('daily_summary', v)}
                  disabled={!settings.enabled}
                />
              }
            />
          </div>

          <div className="bg-white dark:bg-[#1e1640] rounded-2xl shadow-sm mb-4 px-4">
            <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider pt-4 pb-1">Silêncio</p>

            <OptionRow
              label="🌙 Horário silencioso"
              sub={`Sem lembretes entre ${settings.quiet_start}h e ${settings.quiet_end}h`}
              right={
                <Toggle
                  value={!!settings.quiet_hours}
                  onChange={v => set('quiet_hours', v)}
                  disabled={!settings.enabled}
                />
              }
            />
            <p className="text-xs text-gray-400 dark:text-slate-500 pb-3">
              O alerta de sono longo sempre é enviado, mesmo no horário silencioso.
            </p>
          </div>

          {/* Botão de teste */}
          <button
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending || testSent}
            className="w-full py-3.5 rounded-2xl text-sm font-bold bg-white dark:bg-[#1e1640] text-violet-600 dark:text-violet-400 shadow-sm disabled:opacity-50 mb-4"
          >
            {testSent ? '✓ Notificação enviada!' : testMutation.isPending ? 'Enviando...' : '🧪 Enviar notificação de teste'}
          </button>
        </>
      )}

      {/* Instruções iOS */}
      {isSupported && permission === 'default' && !subscribed && (
        <div className="bg-violet-50 dark:bg-violet-950/30 rounded-2xl p-4 text-sm text-violet-700 dark:text-violet-300">
          <p className="font-bold mb-1">📱 No iPhone (iOS 16.4+)</p>
          <p className="text-xs leading-relaxed">
            As notificações push só funcionam quando o app está instalado na tela inicial.
            Toque em <strong>compartilhar → Adicionar à tela de início</strong> e depois ative aqui.
          </p>
        </div>
      )}
    </div>
  )
}
