
const Response = require('../utils/base_response');

/// UserController handles user-related operations such as fetching user profiles, updating user information, etc.
class UserController {
    constructor() {
        this.getProfile = this.getProfile.bind(this);
    }

    getProfile(req, res) {
        res.json({ message: Response.success("User Profile Retrieved Successfully",{id:1012}) }); // Assuming user information is attached to the request object after authentication
    }
}

module.exports = new UserController();