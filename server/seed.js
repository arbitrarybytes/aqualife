// Force a fresh reseed of demo data:  npm run reseed
import { seed } from './db.js'

seed()
console.log('[db] reseed complete')
process.exit(0)
