
const express = require('express');
const authController = require('../controllers/auth_controller');

/// reference for all the auth base routes
class AuthRouter {
    constructor() {
        this.router = express.Router();
        this.initializeRoutes();
    }

    initializeRoutes() {
        this.router.post('/login', authController.login);
    }

    getRouter() {
        return this.router;
    }
}

module.exports = new AuthRouter();