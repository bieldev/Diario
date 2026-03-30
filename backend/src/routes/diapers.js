import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { diaperQueries, startOfDay } from '../db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIAPER_PHOTOS_DIR = join(__dirname, '../../../data/diaper-photos')
mkdirSync(DIAPER_PHOTOS_DIR, { recursive: true })

function diaperPhotoPath(id) {
  return join(DIAPER_PHOTOS_DIR, `${id}.jpg`)
}

function diaperWithUrl(row) {
  if (!row) return row
  return {
    ...row,
    photo_url: row.photo_path ? `/api/diapers/${row.id}/photo` : null,
  }
}

export async function diaperRoutes(fastify) {
  fastify.get('/', async () => diaperQueries.all.all().map(diaperWithUrl))

  fastify.get('/today', async () => diaperQueries.today.all({ start: startOfDay() }).map(diaperWithUrl))

  fastify.post('/', async (request, reply) => {
    const { contents } = request.body
    if (!['xixi', 'coco', 'ambos'].includes(contents)) {
      return reply.status(400).send({ error: 'Conteúdo inválido' })
    }
    const time = Date.now()
    const result = diaperQueries.insert.run({ contents, time })
    return { id: Number(result.lastInsertRowid), contents, time }
  })

  fastify.patch('/:id', async (request, reply) => {
    const id = Number(request.params.id)
    const row = diaperQueries.byId.get({ id })
    if (!row) return reply.status(404).send({ error: 'Não encontrado' })

    const { contents, time, note, imageData } = request.body

    if (contents && !['xixi', 'coco', 'ambos'].includes(contents)) {
      return reply.status(400).send({ error: 'Conteúdo inválido' })
    }

    // Atualiza conteúdo/horário se enviado
    if (contents || time) {
      diaperQueries.update.run({ id, contents: contents ?? row.contents, time: time ?? row.time })
    }

    // Atualiza nota e foto se enviado
    if (note !== undefined || imageData !== undefined) {
      let photo_path = row.photo_path ?? null
      if (imageData) {
        const base64 = imageData.replace(/^data:image\/\w+;base64,/, '')
        writeFileSync(diaperPhotoPath(id), Buffer.from(base64, 'base64'))
        photo_path = diaperPhotoPath(id)
      }
      diaperQueries.updateNote.run({ id, note: note ?? row.note ?? null, photo_path })
    }

    return diaperWithUrl(diaperQueries.byId.get({ id }))
  })

  // Serve foto vinculada à fralda
  fastify.get('/:id/photo', async (req, reply) => {
    const id = Number(req.params.id)
    const row = diaperQueries.byId.get({ id })
    if (!row?.photo_path) return reply.status(404).send({ error: 'Foto não encontrada' })
    reply.header('Content-Type', 'image/jpeg')
    reply.header('Cache-Control', 'public, max-age=31536000')
    const { createReadStream } = await import('fs')
    return reply.send(createReadStream(row.photo_path))
  })

  fastify.delete('/:id', async (request, reply) => {
    const id = Number(request.params.id)
    const row = diaperQueries.byId.get({ id })
    if (!row) return reply.status(404).send({ error: 'Não encontrado' })
    diaperQueries.delete.run({ id })
    return { ok: true }
  })
}
