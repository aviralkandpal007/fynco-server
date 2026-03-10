const express = require('express')
const path = require('path')
const dotenv = require('dotenv')
const cookieParser = require('cookie-parser')
const logger = require('morgan')
const routes = require('./routes/routes')
const MongoService = require('./services/mongo')
const cors = require('cors')

dotenv.config()

const app = express()

MongoService.connect().catch((err) => {
  console.error('Mongo connection failed:', err.message)
})

app.use(logger('dev'))
app.use(cors({
  origin: process.env.WEB_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))

app.use('/app', routes.getRouter())

module.exports = app
