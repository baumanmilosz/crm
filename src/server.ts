import 'dotenv/config'
import { app } from './app'

const PORT = process.env.PORT ?? 3000

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`Swagger docs: http://localhost:${PORT}/api/docs`)
})
