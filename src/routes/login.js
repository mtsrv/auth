import { generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server'
import { isoBase64URL } from '@simplewebauthn/server/helpers'
import { Router } from 'itty-router'

import { response } from '../modules/response'
import { knex } from '../modules/knex'

export const router = Router()

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
    requireUserVerification: false,
    authenticator,
  })

  if (!verification.verified) {
    return response({ oops: 'verification failed' }, { status: 400 })
  }

  return response({ verification })
})
