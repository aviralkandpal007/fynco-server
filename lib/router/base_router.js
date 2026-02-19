const express = require('express');
const authRouter = require('./auth_router');
const userRouter = require('./user_router');

/// reference for all the base routes of the application
/// this is the main router that will be used to mount all other module routers
class BaseRouter {
    constructor() {
        this.router = express.Router();
        this.initializeRouter();
    }

    initializeRouter() {
        // mount all module routers here
        this.router.use('/auth', authRouter.getRouter());
        this.router.use('/user', userRouter.getRouter());
    }

    getRouter() {
        return this.router;
    }
}

module.exports = new BaseRouter();