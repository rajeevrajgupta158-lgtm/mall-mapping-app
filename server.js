const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Models Import
const Mall = require('./models/Mall');
const Shop = require('./models/Shop');
const Product = require('./models/Product');
const Order = require('./models/Order');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); 
app.use(express.static('public'));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Atlas Connected Successfully!'))
  .catch((err) => console.log('❌ MongoDB Connection Error: ', err));

  
// ==========================================
// 🔐 AUTHENTICATION APIs
// ==========================================
// User Registration (Signup)
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'Email already exists! Please login.' });

        // Hash the password for security
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create new user
        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();
        res.json({ message: 'Registration successful! You can now login.' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Invalid email or password!' });

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid email or password!' });

        // Login success
        res.json({ 
            message: 'Login successful!', 
            user: { name: user.name, email: user.email, role: user.role } 
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 🏢 MALL APIs
// ==========================================
// Get all malls
app.get('/api/malls', async (req, res) => {
    try { const malls = await Mall.find(); res.json(malls); } 
    catch (err) { res.status(500).json({ error: err.message }); }
});

// Add new mall
app.post('/api/malls', async (req, res) => {
    try { const newMall = new Mall(req.body); await newMall.save(); res.json(newMall); } 
    catch (err) { res.status(500).json({ error: err.message }); }
});

// Update mall
app.put('/api/malls/:id', async (req, res) => {
    try { const updatedMall = await Mall.findByIdAndUpdate(req.params.id, req.body, { new: true }); res.json(updatedMall); } 
    catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete mall
app.delete('/api/malls/:id', async (req, res) => {
    try { await Mall.findByIdAndDelete(req.params.id); res.json({ message: 'Mall deleted' }); } 
    catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 🏪 SHOP APIs
// ==========================================
app.get('/api/shops', async (req, res) => {
    try { const shops = await Shop.find(); res.json(shops); } 
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/shops', async (req, res) => {
    try { 
        const newShop = new Shop(req.body); 
        await newShop.save();
        // Update Mall's shop array
        await Mall.findByIdAndUpdate(req.body.mallId, { $push: { shops: newShop._id } });
        res.json(newShop); 
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/shops/:id', async (req, res) => {
    try { const updatedShop = await Shop.findByIdAndUpdate(req.params.id, req.body, { new: true }); res.json(updatedShop); } 
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/shops/:id', async (req, res) => {
    try { await Shop.findByIdAndDelete(req.params.id); res.json({ message: 'Shop deleted' }); } 
    catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 📦 PRODUCT APIs
// ==========================================
app.get('/api/products', async (req, res) => {
    try { const products = await Product.find(); res.json(products); } 
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/products', async (req, res) => {
    try { 
        const newProduct = new Product(req.body); 
        await newProduct.save(); 
        // Update Shop's product array
        await Shop.findByIdAndUpdate(req.body.shopId, { $push: { products: newProduct._id } });
        res.json(newProduct); 
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/products/:id', async (req, res) => {
    try { const updatedProduct = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true }); res.json(updatedProduct); } 
    catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 🚀 BULK UPLOAD API (CSV ke liye)
// ==========================================
app.post('/api/products/bulk', async (req, res) => {
    try {
        const productsData = req.body; // Array of products frontend se aayega
        
        if (!productsData || productsData.length === 0) {
            return res.status(400).json({ error: "No data received from frontend!" });
        }

        // Database mein ek sath saare products daal do
        const insertedProducts = await Product.insertMany(productsData);
        
        // Frontend ko Success message bhej do
        res.json({ 
            message: `${insertedProducts.length} products added successfully!`, 
            data: insertedProducts 
        });
    } catch (err) { 
        console.error("Bulk Upload Error:", err);
        res.status(500).json({ error: err.message }); 
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try { await Product.findByIdAndDelete(req.params.id); res.json({ message: 'Product deleted' }); } 
    catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 🛒 ORDER APIs
// ==========================================
app.get('/api/orders', async (req, res) => {
    try { const orders = await Order.find(); res.json(orders); } 
    catch (err) { res.status(500).json({ error: err.message }); }
});

// Fetch Order History for a specific user
app.get('/api/orders/history/:email', async (req, res) => {
    try {
        const userEmail = req.params.email;
        // Database se us email ke saare orders nikalna, latest wale pehle (sort)
        const userOrders = await Order.find({ userEmail: userEmail }).sort({ createdAt: -1 });
        
        res.status(200).json(userOrders);
    } catch (error) {
        console.error("Order history error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// 👇👇👇 YAHAN AAYA HAI NAYA LOGIC 👇👇👇
app.post('/api/orders', async (req, res) => {
    try { 
        const orderData = req.body;
        
        // 1. Order database me save karo
        const newOrder = new Order(orderData); 
        await newOrder.save(); 

        // 2. Loop chala kar database mein se actual Stock minus karo
        for (let i = 0; i < orderData.items.length; i++) {
            const item = orderData.items[i];
            
            // Product dhoondo aur uska stock minus kar do
            await Product.findByIdAndUpdate(
                item._id, 
                { $inc: { stock: -item.quantity } } 
            );
        }

        res.status(201).json(newOrder); 
    } 
    catch (err) { 
        console.error("Error placing order:", err);
        res.status(500).json({ error: err.message }); 
    }
});
// 👆👆👆 NAYA LOGIC YAHAN KHATAM 👆👆👆

app.put('/api/orders/:id', async (req, res) => {
    try { const updatedOrder = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true }); res.json(updatedOrder); } 
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/orders/:id', async (req, res) => {
    try { await Order.findByIdAndDelete(req.params.id); res.json({ message: 'Order deleted' }); } 
    catch (err) { res.status(500).json({ error: err.message }); }
});

// Server Listen
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
module.exports = app;