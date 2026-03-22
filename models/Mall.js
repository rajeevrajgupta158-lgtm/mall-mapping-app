const mongoose = require('mongoose');

const mallSchema = new mongoose.Schema({
    name: { type: String, required: true },
    location: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String }, // Base64 image store karne ke liye
    shops: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Shop' }] // Ek mall mein multiple shops
}, { timestamps: true });

module.exports = mongoose.model('Mall', mallSchema);