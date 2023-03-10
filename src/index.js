import { Router } from 'itty-router'
import {
  // Registration
  generateRegistrationOptions,
  verifyRegistrationResponse,
  // Authentication
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server'

import { isoBase64URL } from '@simplewebauthn/server/helpers'

import { response } from './modules/response'
import { knex } from './modules/knex'

const router = Router()

router.get('/', (_, env) => {
  return response({ service: 'mtsrv-auth', version: env.VERSION })
})

router.get('/users', async (request, env) => {
  const selectQuery = knex('users').leftJoin('credentials', 'users.userID', 'credentials.userID').toString()
  const { results: users } = await env.db.prepare(selectQuery).all()

  return response({ users })
})

router.post('/option', async (request, env) => {
  const { username } = await request.json()

  const query = knex('users').where({ userName: username }).toString()
  const { results: users } = await env.db.prepare(query).all()

  if (Array.isArray(users) && users.length > 0) {
    return response({ oops: 'username already taken' }, { status: 400 })
  }

  const user = { userName: username }
  const options = generateRegistrationOptions({
    rpName: 'mtsrv',
    rpID: 'localhost',
    ...user
  })

  user.userChallenge = options.challenge

  const insertQuery = knex('users').insert(user).toString()
  const result = await env.db.prepare(insertQuery).run()

  return response({ result, options })
})

router.post('/register', async (request, env) => {
  const { username, registrationResponse } = await request.json()
  console.log(username, registrationResponse)

  const selectQuery = knex('users').where({ userName: username }).toString()
  const user = await env.db.prepare(selectQuery).first()

  if (!user) {
    return response({ oops: 'username not found' }, { status: 400 })
  }

  const verification = await verifyRegistrationResponse({
    response: registrationResponse,
    expectedChallenge: user.userChallenge,
    expectedOrigin: 'http://localhost:5173',
    expectedRPID: 'localhost'
  })

  if (!verification.verified) {
    return response({ oops: 'verification failed' }, { status: 400 })
  }

  const insertQuery = knex('credentials').insert({
    userID: user.userID,
    credentialID: isoBase64URL.fromBuffer(verification.registrationInfo.credentialID),
    credentialPublicKey: isoBase64URL.fromBuffer(verification.registrationInfo.credentialPublicKey),
    credentialCounter: verification.registrationInfo.counter
  }).toString()

  const result = await env.db.prepare(insertQuery).run()
  return response({ result })
})

router.options('*', () => {
  return response({})
})

router.all('*', () => {
  return response({ oops: 'route not found' }, { status: 404 })
})

export default { fetch: router.handle }
