import { diaperQueries, startOfDay } from '../db.js'

export async function diaperRoutes(fastify) {
  fastify.get('/', async () => diaperQueries.all.all())

  fastify.get('/today', async () => diaperQueries.today.all({ start: startOfDay() }))

  fastify.post('/', async (request, reply) => {
    const { contents } = request.body
    if (!['xixi', 'coco', 'ambos'].includes(contents)) {
      return reply.status(400).send({ error: 'Conteúdo inválido' })
    }
    const time = Date.now()
    const result = diaperQueries.insert.run({ contents, time })
    return { id: result.lastInsertRowid, contents, time }
  })

  fastify.patch('/:id', async (request, reply) => {
    const id = Number(request.params.id)
    const row = diaperQueries.byId.get({ id })
    if (!row) return reply.status(404).send({ error: 'Não encontrado' })

    const { contents, time } = request.body
    if (contents && !['xixi', 'coco', 'ambos'].includes(contents)) {
      return reply.status(400).send({ error: 'Conteúdo inválido' })
    }
    diaperQueries.update.run({ id, contents: contents ?? row.contents, time: time ?? row.time })
    return diaperQueries.byId.get({ id })
  })

  fastify.delete('/:id', async (request, reply) => {
    const id = Number(request.params.id)
    const row = diaperQueries.byId.get({ id })
    if (!row) return reply.status(404).send({ error: 'Não encontrado' })
    diaperQueries.delete.run({ id })
    return { ok: true }
  })
}
