import Fastify from 'fastify'
import cors from '@fastify/cors'
import staticFiles from '@fastify/static'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'

import { feedingRoutes } from './routes/feedings.js'
import { diaperRoutes } from './routes/diapers.js'
import { sleepRoutes } from './routes/sleeps.js'
import { dashboardRoutes } from './routes/dashboard.js'
import { historyRoutes } from './routes/history.js'
import { measurementRoutes } from './routes/measurements.js'
import { pushRoutes } from './routes/push.js'
import { photoRoutes } from './routes/photos.js'
import { startScheduler } from './services/scheduler.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const fastify = Fastify({
  logger: process.env.NODE_ENV !== 'production',
})

// ─── Plugins ─────────────────────────────────────────────────────────────────
await fastify.register(cors, {
  origin: process.env.ALLOWED_ORIGIN || true,
})

// ─── API Routes ───────────────────────────────────────────────────────────────
fastify.register(feedingRoutes,     { prefix: '/api/feedings' })
fastify.register(diaperRoutes,      { prefix: '/api/diapers' })
fastify.register(sleepRoutes,       { prefix: '/api/sleeps' })
fastify.register(dashboardRoutes,   { prefix: '/api/dashboard' })
fastify.register(historyRoutes,     { prefix: '/api/history' })
fastify.register(measurementRoutes, { prefix: '/api/measurements' })
fastify.register(pushRoutes,        { prefix: '/api/push' })
fastify.register(photoRoutes,       { prefix: '/api/photos' })

// ─── Serve frontend em produção ───────────────────────────────────────────────
const DIST = join(__dirname, '../../frontend/dist')

if (existsSync(DIST)) {
  await fastify.register(staticFiles, { root: DIST, prefix: '/' })

  fastify.setNotFoundHandler((request, reply) => {
    if (!request.url.startsWith('/api')) {
      reply.sendFile('index.html')
    } else {
      reply.status(404).send({ error: 'Rota não encontrada' })
    }
  })
}

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 3001
const HOST = process.env.HOST || '0.0.0.0'

try {
  await fastify.listen({ port: PORT, host: HOST })
  console.log(`✅ Backend rodando em http://${HOST}:${PORT}`)
  startScheduler()
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
