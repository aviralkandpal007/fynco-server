/// Auth controller to handle authentication related requests
class AuthController {
    constructor() {
        this.login = this.login.bind(this);
        this.register = this.register.bind(this);
    }

    login(req, res) {
        // handle login logic here
        res.send('Login controller');
    }

    register(req, res) {
        // handle registration logic here
        res.send('Register controller');
    }
}

module.exports = new AuthController();