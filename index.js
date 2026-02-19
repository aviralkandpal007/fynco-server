// express server
const express = require('express');
// dot env to load env variables from .env file
const dotenv = require('dotenv');
// base router to set up all routes
const baseRouter = require('./lib/router/base_router.js');

// load env variables from .env file
dotenv.config();

// create express app
const app = express();
app.use(express.json());

// base route for all api routes
app.use('/api', baseRouter.getRouter());

const PORT = process.env.PORT || 3000;

// start the express server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}).on('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
});