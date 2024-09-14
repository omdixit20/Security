const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    title: String,
    url: String
});

module.exports = mongoose.model('Document', documentSchema);
