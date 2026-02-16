// express server
const express = require('express');
// dot env to load env variables from .env file
const dotenv = require('dotenv');

// load env variables from .env file
dotenv.config();

// create express app
const app = express();
app.use(express.json());



// define a route handler for the default home page
app.get('/', (req, res) => {
    res.send('Hello World!');
});

const PORT = process.env.PORT || 3000;

// start the express server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}).on('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
});
