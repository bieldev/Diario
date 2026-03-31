import { useState, useEffect } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { historyApi } from '../api/history.js'
import { feedingsApi } from '../api/feedings.js'
import { diapersApi } from '../api/diapers.js'
import { sleepsApi } from '../api/sleeps.js'
import { PageHeader } from '../components/PageHeader.jsx'
import { formatTime, formatDuration, formatDate, groupByDay } from '../utils/format.js'

const PAGE_SIZE = 30

function msToDatetimeLocal(ms) {
  if (!ms) return ''
  const d = new Date(ms)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function breastSegmentsSummary(breastLog) {
  if (!breastLog) return null
  try {
    const segments = JSON.parse(breastLog)
    if (segments.length <= 1) return null
    return segments.map(s =>
      `${s.breast === 'E' ? '← E' : s.breast === 'D' ? 'D →' : '↔'} ${formatDuration(s.duration)}`
    ).join(' · ')
  } catch { return null }
}

function feedingNotesBadges(item) {
  const tags = []
  if (item.burp)   tags.push('💨 Arrotou')
  if (item.hiccup) tags.push('😮 Soluçou')
  if (item.spit_up && item.spit_up !== 'nao') tags.push(`🤢 ${item.spit_up === 'pouquinho' ? 'Regurgitou pouco' : 'Regurgitou muito'}`)
  if (item.behavior === 'dormiu')  tags.push('😴 Dormiu')
  if (item.behavior === 'calmo')   tags.push('😌 Calmo')
  if (item.behavior === 'agitado') tags.push('😣 Agitado')
  if (item.behavior === 'chorou')  tags.push('😭 Chorou')
  return tags
}

function logMeta(item) {
  if (item.type === 'feeding') {
    const breast = item.breast === 'E' ? 'Esquerdo' : item.breast === 'D' ? 'Direito' : 'Ambos'
    const segments = breastSegmentsSummary(item.breast_log)
    const notes = feedingNotesBadges(item)
    const base = segments
      ? `${formatTime(item.startTime)} · ${formatDuration(item.duration)} · ${segments}`
      : `${formatTime(item.startTime)} · ${formatDuration(item.duration)}`
    return {
      emoji: '🤱', bg: 'bg-pink-50 dark:bg-pink-950/40',
      label: `Mamada — peito ${breast}`,
      sub: notes.length > 0 ? `${base} · ${notes.join(' · ')}` : base,
    }
  }
  if (item.type === 'diaper') {
    const label = item.contents === 'xixi' ? 'Xixi' : item.contents === 'coco' ? 'Coco' : 'Xixi + Coco'
    const emoji = item.contents === 'xixi' ? '💧' : item.contents === 'coco' ? '💩' : '💧💩'
    return {
      emoji, bg: 'bg-amber-50 dark:bg-amber-950/40',
      label: `Fralda — ${label}`,
      sub: item.note ? `${formatTime(item.time)} · ${item.note}` : formatTime(item.time),
      photo_url: item.photo_path ? `/api/diapers/${item.id}/photo` : null,
    }
  }
  return {
    emoji: '😴', bg: 'bg-sky-50 dark:bg-sky-950/40',
    label: 'Sono',
    sub: `${formatTime(item.startTime)} → ${item.endTime ? formatTime(item.endTime) : '...'} · ${formatDuration(item.duration)}`,
  }
}

// ─── Edit form state by type ──────────────────────────────────────────────────
function initEditState(item) {
  if (item.type === 'feeding') {
    let segments = null
    if (item.breast_log) {
      try {
        const parsed = JSON.parse(item.breast_log)
        if (parsed.length > 1) segments = parsed.map(s => ({ breast: s.breast, duration: s.duration }))
      } catch {}
    }
    return { breast: item.breast, startTime: msToDatetimeLocal(item.startTime), endTime: msToDatetimeLocal(item.endTime), segments }
  }
  if (item.type === 'diaper') {
    return { contents: item.contents, time: msToDatetimeLocal(item.time) }
  }
  return { startTime: msToDatetimeLocal(item.startTime), endTime: msToDatetimeLocal(item.endTime) }
}

// ─── Edit form UI ─────────────────────────────────────────────────────────────
function EditForm({ item, onSave, onCancel, isSaving }) {
  const [form, setForm] = useState(() => initEditState(item))
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const inputCls = 'w-full rounded-xl border border-gray-200 dark:border-violet-900/40 bg-gray-50 dark:bg-[#130f2a] px-3 py-2 text-sm dark:text-white'
  const labelCls = 'text-xs font-bold text-gray-500 dark:text-slate-400 mb-1 block'

  return (
    <div className="flex flex-col gap-3">
      {item.type === 'feeding' && (
        <>
          {form.segments ? (
            <div>
              <label className={labelCls}>Segmentos por peito</label>
              <div className="flex flex-col gap-2">
                {form.segments.map((seg, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 dark:text-slate-500 w-4 shrink-0">{i + 1}.</span>
                    <div className="flex gap-1">
                      {[['E', '← E'], ['D', 'D →']].map(([v, l]) => (
                        <button
                          key={v}
                          onClick={() => {
                            const segs = form.segments.map((s, j) => j === i ? { ...s, breast: v } : s)
                            set('segments', segs)
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors
                            ${seg.breast === v
                              ? 'bg-pink-500 text-white border-pink-500'
                              : 'bg-gray-50 dark:bg-[#130f2a] text-gray-600 dark:text-slate-300 border-gray-200 dark:border-violet-900/40'}`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        type="number" min="0"
                        value={Math.floor(seg.duration / 60)}
                        onChange={e => {
                          const mins = Math.max(0, Number(e.target.value))
                          const segs = form.segments.map((s, j) => j === i ? { ...s, duration: mins * 60 + (s.duration % 60) } : s)
                          set('segments', segs)
                        }}
                        className="w-14 rounded-lg border border-gray-200 dark:border-violet-900/40 bg-gray-50 dark:bg-[#130f2a] px-2 py-1.5 text-sm text-center dark:text-white"
                      />
                      <span className="text-xs text-gray-400">min</span>
                      <input
                        type="number" min="0" max="59"
                        value={seg.duration % 60}
                        onChange={e => {
                          const secs = Math.min(59, Math.max(0, Number(e.target.value)))
                          const segs = form.segments.map((s, j) => j === i ? { ...s, duration: Math.floor(s.duration / 60) * 60 + secs } : s)
                          set('segments', segs)
                        }}
                        className="w-14 rounded-lg border border-gray-200 dark:border-violet-900/40 bg-gray-50 dark:bg-[#130f2a] px-2 py-1.5 text-sm text-center dark:text-white"
                      />
                      <span className="text-xs text-gray-400">seg</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className={labelCls}>Peito</label>
              <div className="flex gap-2">
                {[['E', '← Esquerdo'], ['D', 'Direito →'], ['A', '↔ Ambos']].map(([v, l]) => (
                  <button
                    key={v}
                    onClick={() => set('breast', v)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors
                      ${form.breast === v
                        ? 'bg-pink-500 text-white border-pink-500'
                        : 'bg-gray-50 dark:bg-[#130f2a] text-gray-600 dark:text-slate-300 border-gray-200 dark:border-violet-900/40'}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className={labelCls}>Início</label>
            <input type="datetime-local" className={inputCls} value={form.startTime} onChange={e => set('startTime', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Fim</label>
            <input type="datetime-local" className={inputCls} value={form.endTime} onChange={e => set('endTime', e.target.value)} />
          </div>
        </>
      )}

      {item.type === 'diaper' && (
        <>
          <div>
            <label className={labelCls}>Tipo</label>
            <div className="flex gap-2">
              {[['xixi', '💧 Xixi'], ['coco', '💩 Coco'], ['ambos', '💧💩 Ambos']].map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => set('contents', v)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors
                    ${form.contents === v
                      ? 'bg-amber-400 text-white border-amber-400'
                      : 'bg-gray-50 dark:bg-[#130f2a] text-gray-600 dark:text-slate-300 border-gray-200 dark:border-violet-900/40'}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>Horário</label>
            <input type="datetime-local" className={inputCls} value={form.time} onChange={e => set('time', e.target.value)} />
          </div>
        </>
      )}

      {item.type === 'sleep' && (
        <>
          <div>
            <label className={labelCls}>Início</label>
            <input type="datetime-local" className={inputCls} value={form.startTime} onChange={e => set('startTime', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Fim</label>
            <input type="datetime-local" className={inputCls} value={form.endTime} onChange={e => set('endTime', e.target.value)} />
          </div>
        </>
      )}

      <div className="flex gap-2 mt-1">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-gray-100 dark:bg-violet-950/40 text-gray-500 dark:text-slate-400"
        >
          Cancelar
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={isSaving}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-violet-600 text-white disabled:opacity-50"
        >
          {isSaving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}

// ─── Bottom sheet ─────────────────────────────────────────────────────────────
function ActionSheet({ item, onClose, onDelete, onEdit, isDeleting }) {
  const { emoji, label, sub } = logMeta(item)
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-violet-900/30">
        <span className="text-2xl">{emoji}</span>
        <div>
          <p className="font-bold text-sm dark:text-white">{label}</p>
          <p className="text-xs text-gray-400 dark:text-slate-400">{sub}</p>
        </div>
      </div>
      <button
        onClick={onEdit}
        className="w-full py-3 rounded-xl text-sm font-bold bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400"
      >
        ✏️ Editar
      </button>
      <button
        onClick={onDelete}
        disabled={isDeleting}
        className="w-full py-3 rounded-xl text-sm font-bold bg-red-50 dark:bg-red-950/30 text-red-500 disabled:opacity-50"
      >
        {isDeleting ? 'Excluindo...' : '🗑️ Excluir'}
      </button>
      <button
        onClick={onClose}
        className="w-full py-3 rounded-xl text-sm font-bold bg-gray-100 dark:bg-[#130f2a] text-gray-500 dark:text-slate-400"
      >
        Cancelar
      </button>
    </div>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────
function downloadCsv() {
  window.open('/api/history/export', '_blank')
}

export function HistoryScreen() {
  const queryClient = useQueryClient()
  const [selectedItem, setSelectedItem] = useState(null)  // action sheet
  const [editingItem, setEditingItem]   = useState(null)  // edit form

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['history'],
    queryFn: ({ pageParam = 0 }) => historyApi.get({ limit: PAGE_SIZE, offset: pageParam }),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.items.length, 0)
      return loaded < lastPage.total ? loaded : undefined
    },
    initialPageParam: 0,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['history'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const deleteMutation = useMutation({
    mutationFn: (item) => {
      if (item.type === 'feeding') return feedingsApi.delete(item.id)
      if (item.type === 'diaper')  return diapersApi.delete(item.id)
      return sleepsApi.delete(item.id)
    },
    onSuccess: () => { invalidate(); setSelectedItem(null) },
  })

  const updateMutation = useMutation({
    mutationFn: ({ item, form }) => {
      if (item.type === 'feeding') {
        let breast = form.breast
        let extraFields = {}
        if (form.segments) {
          const unique = [...new Set(form.segments.map(s => s.breast))]
          breast = unique.length > 1 ? 'A' : unique[0]
          extraFields = {
            breast_log: JSON.stringify(form.segments),
            duration: form.segments.reduce((acc, s) => acc + s.duration, 0),
          }
        }
        return feedingsApi.update(item.id, {
          breast,
          startTime: form.startTime ? new Date(form.startTime).getTime() : undefined,
          endTime:   form.endTime   ? new Date(form.endTime).getTime()   : undefined,
          ...extraFields,
        })
      }
      if (item.type === 'diaper') {
        return diapersApi.update(item.id, {
          contents: form.contents,
          time:     form.time ? new Date(form.time).getTime() : undefined,
        })
      }
      return sleepsApi.update(item.id, {
        startTime: form.startTime ? new Date(form.startTime).getTime() : undefined,
        endTime:   form.endTime   ? new Date(form.endTime).getTime()   : undefined,
      })
    },
    onSuccess: () => { invalidate(); setEditingItem(null); setSelectedItem(null) },
  })

  const allItems = data?.pages.flatMap(p => p.items) ?? []
  const total    = data?.pages[0]?.total ?? 0
  const groups   = groupByDay(allItems, item => item.sortTime)

  const closeSheet = () => { setSelectedItem(null); setEditingItem(null) }

  // Sobe o sheet quando teclado/seletor abre no iOS (visual viewport < layout viewport)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  useEffect(() => {
    if (!selectedItem) { setKeyboardHeight(0); return }
    const vv = window.visualViewport
    if (!vv) return
    const update = () => {
      const kh = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      setKeyboardHeight(kh)
    }
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [selectedItem])

  return (
    <div className="px-4 pb-4 overflow-y-auto overscroll-y-none h-full">
      <div className="flex items-center justify-between pt-5 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">📋 Histórico</h1>
          {data && <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{total} registros</p>}
        </div>
        <button
          onClick={downloadCsv}
          className="bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 text-xs font-bold px-3 py-2 rounded-xl border border-violet-100 dark:border-violet-900/40"
        >
          ↓ Exportar CSV
        </button>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-[#1e1640] rounded-xl h-14 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && allItems.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 opacity-40">
          <span className="text-5xl mb-3">📭</span>
          <p className="text-sm font-semibold text-gray-500">Nenhum registro ainda</p>
        </div>
      )}

      {groups.map(({ ts, items: dayItems }) => (
        <div key={ts} className="mb-5">
          <h2 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider capitalize mb-2">
            {formatDate(ts)}
          </h2>
          <div className="flex flex-col gap-2">
            {dayItems.map((item, i) => {
              const { emoji, bg, label, sub, photo_url } = logMeta(item)
              return (
                <button
                  key={`${item.type}-${item.id}-${i}`}
                  onClick={() => { setEditingItem(null); setSelectedItem(item) }}
                  className="bg-white dark:bg-[#1e1640] rounded-xl px-4 py-3 shadow-sm flex items-center gap-3 transition-colors text-left w-full active:scale-[0.98]"
                >
                  <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center text-lg shrink-0`}>{emoji}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate dark:text-white">{label}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-400 truncate">{sub}</p>
                  </div>
                  {photo_url && (
                    <img src={photo_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                  )}
                  <span className="text-gray-300 dark:text-slate-600 text-xs">›</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="w-full py-3 mt-2 mb-4 rounded-xl text-sm font-bold bg-white dark:bg-[#1e1640] text-violet-600 dark:text-violet-400 shadow-sm disabled:opacity-50"
        >
          {isFetchingNextPage ? 'Carregando...' : `Carregar mais (${total - allItems.length} restantes)`}
        </button>
      )}

      {/* Bottom sheet overlay */}
      {selectedItem && (
        <div className="fixed inset-x-0 top-0 z-[60] flex flex-col justify-end" style={{ bottom: keyboardHeight }} onClick={closeSheet}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative bg-white dark:bg-[#1e1640] rounded-t-3xl shadow-2xl flex flex-col"
            style={{ maxHeight: '85vh' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-200 dark:bg-violet-800 rounded-full mx-auto mt-4 mb-3 shrink-0" />
            <div className="overflow-y-auto overscroll-y-none px-5 pb-8">
              {editingItem ? (
                <EditForm
                  item={editingItem}
                  onCancel={() => setEditingItem(null)}
                  onSave={(form) => updateMutation.mutate({ item: editingItem, form })}
                  isSaving={updateMutation.isPending}
                />
              ) : (
                <ActionSheet
                  item={selectedItem}
                  onClose={closeSheet}
                  onEdit={() => setEditingItem(selectedItem)}
                  onDelete={() => deleteMutation.mutate(selectedItem)}
                  isDeleting={deleteMutation.isPending}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
