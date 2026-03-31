import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { photosApi } from '../api/photos.js'
import { PageHeader } from '../components/PageHeader.jsx'

// Redimensiona a imagem no canvas para no máximo maxSize px no lado maior
function resizeImage(file, maxSize = 1200) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > maxSize || height > maxSize) {
        if (width > height) { height = Math.round((height * maxSize) / width); width = maxSize }
        else                { width  = Math.round((width  * maxSize) / height); height = maxSize }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.src = url
  })
}

function groupByDay(photos) {
  const groups = {}
  for (const p of photos) {
    const d = new Date(p.date)
    d.setHours(0, 0, 0, 0)
    const key = d.getTime()
    if (!groups[key]) groups[key] = { ts: key, label: d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }), photos: [] }
    groups[key].photos.push(p)
  }
  return Object.values(groups).sort((a, b) => b.ts - a.ts)
}

function PhotoCard({ photo, onDelete, onEditNote }) {
  const [editing, setEditing] = useState(false)
  const [note, setNote] = useState(photo.note || '')
  const [confirmDel, setConfirmDel] = useState(false)

  function saveNote() {
    onEditNote(photo.id, note)
    setEditing(false)
  }

  return (
    <div className="bg-white dark:bg-[#1e1640] rounded-2xl overflow-hidden shadow-sm transition-colors">
      <img
        src={photo.url}
        alt={photo.note || 'Foto da Helena'}
        className="w-full aspect-square object-cover"
        loading="lazy"
      />
      <div className="p-3">
        {editing ? (
          <div className="flex gap-2">
            <input
              autoFocus
              value={note}
              onChange={e => setNote(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveNote()}
              placeholder="Adicionar legenda..."
              className="flex-1 text-sm border border-violet-200 dark:border-violet-800 rounded-lg px-2 py-1 bg-white dark:bg-[#130f2a] dark:text-white outline-none focus:ring-2 focus:ring-violet-400"
            />
            <button onClick={saveNote} className="text-xs font-bold text-violet-600 dark:text-violet-400 px-2">OK</button>
            <button onClick={() => { setEditing(false); setNote(photo.note || '') }} className="text-xs text-gray-400 px-1">✕</button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <p
              className="text-sm text-gray-600 dark:text-slate-300 flex-1 cursor-pointer"
              onClick={() => setEditing(true)}
            >
              {note || <span className="text-gray-300 dark:text-slate-600 italic">Adicionar legenda...</span>}
            </p>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => setEditing(true)} className="text-gray-300 dark:text-slate-600 hover:text-violet-500 text-base p-1">✏️</button>
              {confirmDel ? (
                <>
                  <button onClick={() => onDelete(photo.id)} className="text-xs font-bold text-red-500 px-1">Sim</button>
                  <button onClick={() => setConfirmDel(false)} className="text-xs text-gray-400 px-1">Não</button>
                </>
              ) : (
                <button onClick={() => setConfirmDel(true)} className="text-gray-300 dark:text-slate-600 hover:text-red-500 text-base p-1">🗑️</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function PhotosScreen() {
  const qc = useQueryClient()
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [previewDate, setPreviewDate] = useState(() => new Date().toISOString().slice(0, 10))

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ['photos'],
    queryFn: photosApi.getAll,
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => photosApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['photos'] }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, note }) => photosApi.update(id, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['photos'] }),
  })

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    try {
      const imageData = await resizeImage(file)
      const [y, m, d] = previewDate.split('-').map(Number)
      const date = new Date(y, m - 1, d, 12, 0, 0, 0).getTime()
      await photosApi.upload({ imageData, date })
      qc.invalidateQueries({ queryKey: ['photos'] })
    } catch (err) {
      setUploadError('Erro ao enviar foto. Verifique se o servidor está rodando.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const groups = groupByDay(photos)

  return (
    <div className="px-4 pb-4 overflow-y-auto overscroll-y-none h-full">
      <PageHeader emoji="📸" title="Diário de Fotos" subtitle="Memórias da Helena" />

      {/* Upload */}
      <div className="bg-white dark:bg-[#1e1640] rounded-2xl p-4 shadow-sm mb-5 transition-colors">
        <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3">Nova foto</p>
        <label className="text-xs text-gray-500 dark:text-slate-400 font-medium block mb-1">Data da foto</label>
        <input
          type="date"
          value={previewDate}
          onChange={e => setPreviewDate(e.target.value)}
          className="w-full text-sm border border-purple-100 dark:border-violet-800 rounded-xl px-3 py-2 bg-[#F5F0FF] dark:bg-[#130f2a] dark:text-white outline-none focus:ring-2 focus:ring-violet-400 mb-3"
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-violet-300 dark:border-violet-700 text-violet-500 dark:text-violet-400 hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <span className="text-sm font-medium">Enviando...</span>
          ) : (
            <>
              <span className="text-xl">📷</span>
              <span className="text-sm font-bold">Adicionar foto</span>
            </>
          )}
        </button>
        {uploadError && (
          <p className="mt-3 text-xs text-red-500 dark:text-red-400 font-medium">{uploadError}</p>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Timeline */}
      {isLoading && (
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-[#1e1640] rounded-2xl aspect-square animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && photos.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <span className="text-5xl">📷</span>
          <p className="text-gray-500 dark:text-slate-400 font-medium">Nenhuma foto ainda</p>
          <p className="text-sm text-gray-400 dark:text-slate-500">Adicione a primeira foto da Helena!</p>
        </div>
      )}

      {groups.map(group => (
        <div key={group.ts} className="mb-6">
          <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3 capitalize">
            {group.label}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {group.photos.map(photo => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                onDelete={(id) => deleteMutation.mutate(id)}
                onEditNote={(id, note) => updateMutation.mutate({ id, note })}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
