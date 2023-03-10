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
  const selectQuery = knex('users').toString()
  const { results: users } = await env.db.prepare(selectQuery).all()

  for (const user of users) {
    const credentialQuery = knex('credentials').where({ userID: user.userID }).toString()
    const { results: credentials } = await env.db.prepare(credentialQuery).all()
    user.userCredentials = credentials
  }

  return response({ users })
})

router.post('/register/options', async (request, env) => {
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

router.post('/register/verify', async (request, env) => {
  const { username, registrationResponse } = await request.json()

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

router.post('/login/options', async (request, env) => {
  const { username } = await request.json()

  const query = knex('users').where({ userName: username }).toString()
  const user = await env.db.prepare(query).first()

  if (!user) {
    return response({ oops: 'username not found' }, { status: 400 })
  }

  const credentialQuery = knex('credentials').where({ userID: user.userID }).toString()
  const { results: credentials } = await env.db.prepare(credentialQuery).all()

  const options = generateAuthenticationOptions({
    userVerification: 'preferred',
    rpID: 'localhost',
    allowCredentials: credentials.map((credential) => ({
      id: isoBase64URL.toBuffer(credential.credentialID),
      type: 'public-key'
    }))
  })

  const updateQuery = knex('users')
    .where({ userID: user.userID })
    .update('userChallenge', options.challenge)
    .toString()

  const results = await env.db.prepare(updateQuery).run()
  return response({ results, options })
})


router.post('/login/verify', async (request, env) => {
  const { username, authenticationResponse } = await request.json()

  const query = knex('users').where({ userName: username }).toString()
  const user = await env.db.prepare(query).first()

  if (!user) {
    return response({ oops: 'username not found' }, { status: 400 })
  }

  const credentialQuery = knex('credentials').where({ userID: user.userID }).toString()
  const { results: credentials } = await env.db.prepare(credentialQuery).all()

  const authenticator = credentials.find((credential) => credential.credentialID === authenticationResponse.id)

  if (!authenticator) {
    return response({ oops: 'credentials not found' }, { status: 400 })
  }

  authenticator.credentialPublicKey = isoBase64URL.toBuffer(authenticator.credentialPublicKey)

  const verification = await verifyAuthenticationResponse({
    response: authenticationResponse,
    expectedChallenge: user.userChallenge,
    expectedOrigin: 'http://localhost:5173',
    expectedRPID: 'localhost',
    authenticator,
  })

  return response({ verification })
})

router.options('*', () => {
  return response({})
})

router.all('*', () => {
  return response({ oops: 'route not found' }, { status: 404 })
})

export default { fetch: router.handle }
