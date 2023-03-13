import { generateRegistrationOptions, verifyRegistrationResponse } from '@simplewebauthn/server'
import { isoBase64URL } from '@simplewebauthn/server/helpers'
import { Router } from 'itty-router'

import { response } from '../modules/response'
import { knex } from '../modules/knex'

export const router = Router()

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
    expectedRPID: 'localhost',
    requireUserVerification: false
  }).catch(err => console.log(err))

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
