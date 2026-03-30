import { measurementQueries, configQueries } from '../db.js'

export async function measurementRoutes(fastify) {
  // ─── Birth date (persisted in config table) ───────────────────────────────
  fastify.get('/birth-date', async () => {
    const row = configQueries.get.get({ key: 'birth_date' })
    return { value: row?.value || null }
  })

  fastify.post('/birth-date', async (req) => {
    configQueries.set.run({ key: 'birth_date', value: req.body.value })
    return { ok: true }
  })

  fastify.get('/', async () => measurementQueries.all.all())

  fastify.post('/', async (request, reply) => {
    const { date, weight, height } = request.body
    if (!date) return reply.status(400).send({ error: 'Data obrigatória' })
    if (weight == null && height == null) {
      return reply.status(400).send({ error: 'Informe peso ou altura' })
    }
    const result = measurementQueries.insert.run({
      date,
      weight: weight ?? null,
      height: height ?? null,
    })
    return measurementQueries.byId.get({ id: result.lastInsertRowid })
  })

  fastify.patch('/:id', async (request, reply) => {
    const id = Number(request.params.id)
    const row = measurementQueries.byId.get({ id })
    if (!row) return reply.status(404).send({ error: 'Não encontrado' })

    const { date, weight, height } = request.body
    measurementQueries.update.run({
      id,
      date:   date   ?? row.date,
      weight: weight !== undefined ? weight : row.weight,
      height: height !== undefined ? height : row.height,
    })
    return measurementQueries.byId.get({ id })
  })

  fastify.delete('/:id', async (request, reply) => {
    const id = Number(request.params.id)
    const row = measurementQueries.byId.get({ id })
    if (!row) return reply.status(404).send({ error: 'Não encontrado' })
    measurementQueries.delete.run({ id })
    return { ok: true }
  })
}
