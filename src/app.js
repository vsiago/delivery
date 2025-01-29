import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import userRoutes from './routes/userRoutes.js'
import { connectDB } from './config/db.js'
dotenv.config()

const app = express()

// Middlewares
app.use(cors())
app.use(express.json())

// Rotas
app.use('/api/users', userRoutes)

const PORT = process.env.PORT || 5000
connectDB()

app.listen(PORT, () => console.log(`Server runing ${PORT}`))