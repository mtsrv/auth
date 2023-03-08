import { Router } from 'itty-router'
import {
  // Registration
  generateRegistrationOptions,
  verifyRegistrationResponse,
  // Authentication
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server'

import { response } from './modules/response'
import { knex } from './modules/knex'

const router = Router()

router.get('/', (_, env) => {
  return response({ service: 'mtsrv-auth', version: env.VERSION })
})

router.get('/users', async (request, env) => {
  const selectQuery = knex('users').toString()
  const { results: users } = await env.db.prepare(selectQuery).all()

  return response({ users })
})

router.get('/register/:username', async (request, env) => {
  const { username } = request.params

  const query = knex('users').where({ userName: username }).toString()
  const { results: users } = await env.db.prepare(query).all()

  if (Array.isArray(users) && users.length > 0) {
    return response({ oops: 'username already taken' }, { status: 400 })
  }

  const user = { userName: username }
  const options = generateRegistrationOptions({
    rpName: 'mtsrv',
    rpID: 'mtsrv',
    ...user
  })

  user.userChallenge = options.challenge

  const insertQuery = knex('users').insert(user).toString()
  const result = await env.db.prepare(insertQuery).run()

  return response({ result, options })
})

router.all('*', () => {
  return response({ oops: 'route not found' }, { status: 404 })
})

export default { fetch: router.handle }
