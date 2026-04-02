import { historyQueries, db } from '../db.js'

export async function historyRoutes(fastify) {
  fastify.get('/', async (request) => {
    const limit  = Math.min(Number(request.query.limit)  || 30, 100)
    const offset = Number(request.query.offset) || 0
    const type   = request.query.type

    if (type === 'feeding') {
      const items = db.prepare(`
        SELECT f.id, 'feeding' AS type, f.startTime AS sortTime,
               f.breast, f.startTime, f.endTime, f.duration, NULL AS contents, NULL AS time, f.breast_log,
               fn.burp, fn.hiccup, fn.spit_up, fn.behavior, fn.note AS note, NULL AS photo_path
        FROM feedings f LEFT JOIN feeding_notes fn ON fn.feeding_id = f.id
        ORDER BY sortTime DESC LIMIT ? OFFSET ?
      `).all(limit, offset)
      const total = db.prepare(`SELECT COUNT(*) as n FROM feedings`).get().n
      return { items, total }
    }
    if (type === 'diaper') {
      const items = db.prepare(`
        SELECT id, 'diaper' AS type, time AS sortTime,
               NULL as breast, NULL as startTime, NULL as endTime, NULL as duration,
               contents, time, NULL as breast_log, NULL as burp, NULL as hiccup,
               NULL as spit_up, NULL as behavior, note, photo_path
        FROM diapers ORDER BY sortTime DESC LIMIT ? OFFSET ?
      `).all(limit, offset)
      const total = db.prepare(`SELECT COUNT(*) as n FROM diapers`).get().n
      return { items, total }
    }
    if (type === 'sleep') {
      const items = db.prepare(`
        SELECT id, 'sleep' AS type, startTime AS sortTime,
               NULL as breast, startTime, endTime, duration,
               NULL as contents, NULL as time, NULL as breast_log,
               NULL as burp, NULL as hiccup, NULL as spit_up, NULL as behavior, NULL as note, NULL as photo_path
        FROM sleeps ORDER BY sortTime DESC LIMIT ? OFFSET ?
      `).all(limit, offset)
      const total = db.prepare(`SELECT COUNT(*) as n FROM sleeps`).get().n
      return { items, total }
    }

    const items = historyQueries.page.all({ limit, offset })
    const { total } = historyQueries.count.get()
    return { items, total }
  })

  fastify.get('/export', async (request, reply) => {
    const feedings = db.prepare(`
      SELECT f.*, fn.burp, fn.hiccup, fn.spit_up, fn.behavior, fn.note AS obs_note
      FROM feedings f LEFT JOIN feeding_notes fn ON fn.feeding_id = f.id
      ORDER BY f.startTime ASC
    `).all()
    const diapers  = db.prepare(`SELECT * FROM diapers ORDER BY time ASC`).all()
    const sleeps   = db.prepare(`SELECT * FROM sleeps ORDER BY startTime ASC`).all()

    const fmt = (ts) => new Date(ts).toLocaleString('pt-BR')
    const dur = (s) => {
      if (!s) return ''
      const h = Math.floor(s / 3600)
      const m = Math.floor((s % 3600) / 60)
      const sec = s % 60
      return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${sec}s` : `${sec}s`
    }
    const escapeCsv = (v) => {
      if (v == null) return ''
      const s = String(v)
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
    }

    const rows = ['Tipo,Data,Hora inicio,Hora fim,Duracao,Detalhes,Observacoes']

    for (const f of feedings) {
      const breast = f.breast === 'E' ? 'Esquerdo' : f.breast === 'D' ? 'Direito' : 'Ambos'
      const obs = []
      if (f.burp)   obs.push('Arrotou')
      if (f.hiccup) obs.push('Soluçou')
      if (f.spit_up && f.spit_up !== 'nao') obs.push(f.spit_up === 'pouquinho' ? 'Regurgitou pouco' : 'Regurgitou muito')
      if (f.behavior) obs.push({ dormiu: 'Dormiu', calmo: 'Calmo', agitado: 'Agitado', chorou: 'Chorou' }[f.behavior] ?? f.behavior)
      if (f.obs_note) obs.push(f.obs_note)
      rows.push([
        'Mamada',
        new Date(f.startTime).toLocaleDateString('pt-BR'),
        fmt(f.startTime),
        f.endTime ? fmt(f.endTime) : '',
        dur(f.duration),
        `Peito ${breast}`,
        escapeCsv(obs.join(' | ')),
      ].join(','))
    }
    for (const d of diapers) {
      const c = d.contents === 'xixi' ? 'Xixi' : d.contents === 'coco' ? 'Coco' : 'Xixi + Coco'
      rows.push([
        'Fralda',
        new Date(d.time).toLocaleDateString('pt-BR'),
        fmt(d.time),
        '', '',
        c,
        escapeCsv(d.note),
      ].join(','))
    }
    for (const s of sleeps) {
      rows.push([
        'Sono',
        new Date(s.startTime).toLocaleDateString('pt-BR'),
        fmt(s.startTime),
        s.endTime ? fmt(s.endTime) : '',
        dur(s.duration),
        '', '',
      ].join(','))
    }

    reply.header('Content-Type', 'text/csv; charset=utf-8')
    reply.header('Content-Disposition', 'attachment; filename="diario-helena.csv"')
    return rows.join('\n')
  })
}
