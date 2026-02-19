/// express router for user-related routes
const express = require('express');
/// controller for the user-related routes
const userController = require('../controllers/user_controller');

/// reference for all the user-related routes
class UserRouter {
    constructor() {
        this.router = express.Router();
        this.initializeRoutes();
    }

    initializeRoutes() {
        // Define user-related routes here
        this.router.get('/profile', userController.getProfile);
    }

    getRouter() {
        return this.router;
    }
}

module.exports = new UserRouter();