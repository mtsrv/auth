import { Router } from 'itty-router'

import { response } from '../modules/response'
import { knex } from '../modules/knex'

export const router = Router()

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
