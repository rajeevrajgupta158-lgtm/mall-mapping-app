const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, required: true },
    mallId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mall', required: true }, // Parent Mall ka reference
    icon: { type: String }, // Base64 image
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }] // Ek shop mein multiple products
}, { timestamps: true });

module.exports = mongoose.model('Shop', shopSchema);