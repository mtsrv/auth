import { Router } from 'itty-router'

import { response } from '../modules/response'

export const router = Router()

router.get('/', (_, env) => {
  return response({ service: 'mtsrv-auth', version: env.VERSION })
})
