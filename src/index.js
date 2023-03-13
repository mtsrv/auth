import { Router } from 'itty-router'

import { router as register } from './routes/register'
import { router as login } from './routes/login'

import { response } from './modules/response'
import { knex } from './modules/knex'

const router = Router()

router.get('/', (_, env) => {
  return response({ service: 'mtsrv-auth', version: env.VERSION })
})

router.get('/users', async (request, env) => {
  const selectQuery = knex('users').toString()
  const { results: users } = await env.db.prepare(selectQuery).all()

  for (const user of users) {
    const credentialQuery = knex('credentials').where({ userID: user.userID }).toString()
    const { results: credentials } = await env.db.prepare(credentialQuery).all()
    user.userCredentials = credentials
  }

  return response({ users })
})

router.all('/register/*', register.handle)
router.all('/login/*', login.handle)

router.options('*', () => response())
router.all('*', () => response({ oops: 'route not found' }, { status: 404 }))

export default { fetch: router.handle }
