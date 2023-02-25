import { Router } from 'itty-router'
import {
  // Registration
  generateRegistrationOptions,
  verifyRegistrationResponse,
  // Authentication
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server'

const response = (body, opts = {}) => {
  return new Response(JSON.stringify(body), {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, OPTIONS, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json'
    },
    status: 200,
    ...opts
  })
}

const router = Router()
let users = []

router.get('/', (_, env) => {
  return response({ service: 'mtsrv-auth', version: env.VERSION })
})

router.get('/users', (request, env) => {
  return response({ users })
})

router.get('/register/:username', async (request, env) => {
  const { username } = request.params

  const user = {
    userID: Math.floor(Math.random() * 1000),
    userName: username
  }

  const options = generateRegistrationOptions({
    rpName: 'mtsrv',
    rpID: 'mtsrv',
    ...user
  })

  user.challenge = options.challenge
  users.push(user)

  return response({ options })
})

router.all('*', () => {
  return response({ oops: 'route not found' }, { status: 404 })
})

export default { fetch: router.handle }
