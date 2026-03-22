const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    rating: { type: Number, default: 0 },
    reviews: { type: Number, default: 0 },
    icon: { type: String }, // Base64 image
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true }, // Parent Shop ka reference
    stock: { type: Number, required: true, default: 10 } // 👇 NAYI LINE: Default 10 items rakh diye hain
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);