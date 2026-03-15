import dotenv from 'dotenv'

dotenv.config()

import app from './src/index.js'

const PORT = process.env.PORT || 5001

app.listen(PORT, () => {
  console.log(`🚀 BabyClaw Backend Server running on http://localhost:${PORT}`)
  console.log(`📝 Stream endpoint: POST http://localhost:${PORT}/stream`)
  console.log(`📋 Example: curl -X POST http://localhost:${PORT}/stream -H "Content-Type: application/json" --no-buffer -d '{"prompt": "Hello!"}'`)
})