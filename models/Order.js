const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userEmail: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    paymentMethod: { type: String, required: true },
    items: { type: Array, required: true }, // Cart items ka pura array
    total: { type: Number, required: true },
    status: { type: String, default: 'Pending' },
    date: { type: String, default: () => new Date().toLocaleDateString() }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);