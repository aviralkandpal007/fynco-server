const express = require('express')
const path = require('path')
const dotenv = require('dotenv')
const cookieParser = require('cookie-parser')
const logger = require('morgan')
const routes = require('./lib/routes/routes')
const MongoService = require('./lib/services/mongo')
const cors = require('cors')
const languageMiddleware = require('./lib/middleware/languageMiddleware')
const uploadPaths = require('./lib/util/uploadPaths')

dotenv.config()

const app = express()

MongoService.connect().catch((err) => {
  console.error('Mongo connection failed:', err.message)
})

app.use(logger('dev'))
app.use(cors({
  origin: process.env.WEB_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language', 'X-Language', 'X-Language-Code'],
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))
app.use('/uploads', express.static(uploadPaths.getUploadsDir()))
app.use(languageMiddleware)

app.use('/app', routes.getRouter())

module.exports = app
