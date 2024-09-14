const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    is2FAEnabled: { type: Boolean, default: false },
    twoFA: {
        secret: String
    }
});

module.exports = mongoose.model('User', userSchema);
