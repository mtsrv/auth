import { Router } from 'itty-router'

import { router as register } from './routes/register'
import { router as login } from './routes/login'
import { router as version } from './routes/version'
import { router as users } from './routes/users'

import { response } from './modules/response'

const router = Router()

router.all('/*', version.handle)
router.all('/users/*', users.handle)
router.all('/register/*', register.handle)
router.all('/login/*', login.handle)

router.options('*', () => response())
router.all('*', () => response({ oops: 'route not found' }, { status: 404 }))

export default { fetch: router.handle }
