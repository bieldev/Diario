import { createReadStream, writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { photoQueries } from '../db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PHOTOS_DIR = join(__dirname, '../../../data/photos')
mkdirSync(PHOTOS_DIR, { recursive: true })

function filePath(id) {
  return join(PHOTOS_DIR, `${id}.jpg`)
}

export async function photoRoutes(fastify) {
  // GET /api/photos
  fastify.get('/', async () => {
    const rows = photoQueries.all.all()
    return rows.map(r => ({ ...r, url: `/api/photos/${r.id}/image` }))
  })

  // POST /api/photos — { imageData: "data:image/jpeg;base64,...", note?, date? }
  fastify.post('/', async (req, reply) => {
    const { imageData, note, date } = req.body
    if (!imageData) return reply.status(400).send({ error: 'imageData obrigatório' })

    const created_at = Date.now()
    const photoDate = date || created_at

    const result = photoQueries.insert.run({ date: photoDate, note: note || null, created_at })
    const id = result.lastInsertRowid

    // Salva o arquivo usando o id como nome
    const base64 = imageData.replace(/^data:image\/\w+;base64,/, '')
    writeFileSync(filePath(id), Buffer.from(base64, 'base64'))

    return reply.status(201).send({ id, url: `/api/photos/${id}/image` })
  })

  // GET /api/photos/:id/image — serve o arquivo
  fastify.get('/:id/image', async (req, reply) => {
    const id = Number(req.params.id)
    const row = photoQueries.byId.get({ id })
    if (!row) return reply.status(404).send({ error: 'Foto não encontrada' })

    const path = filePath(id)
    if (!existsSync(path)) return reply.status(404).send({ error: 'Arquivo não encontrado' })

    reply.header('Content-Type', 'image/jpeg')
    reply.header('Cache-Control', 'public, max-age=31536000, immutable')
    return reply.send(createReadStream(path))
  })

  // PATCH /api/photos/:id — atualiza nota
  fastify.patch('/:id', async (req, reply) => {
    const id = Number(req.params.id)
    const row = photoQueries.byId.get({ id })
    if (!row) return reply.status(404).send({ error: 'Foto não encontrada' })
    photoQueries.update.run({ note: req.body.note ?? null, id })
    return { ok: true }
  })

  // DELETE /api/photos/:id
  fastify.delete('/:id', async (req, reply) => {
    const id = Number(req.params.id)
    const row = photoQueries.byId.get({ id })
    if (!row) return reply.status(404).send({ error: 'Foto não encontrada' })
    const path = filePath(id)
    if (existsSync(path)) unlinkSync(path)
    photoQueries.delete.run({ id })
    return { ok: true }
  })
}
