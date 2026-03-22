// ===== API & Data State =====
const API_URL = '/api';
let dbData = { malls: [], shops: [], products: [], orders: [] };

let cart = [];
let currentUser = null;
let currentMallId = null;
let currentShopId = null;
let currentProductId = null;

// ===== Helper: Convert Image to Base64 =====
function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// ===== Fetch Data from Database =====
async function fetchAllData() {
    try {
        const [mallsRes, shopsRes, productsRes, ordersRes] = await Promise.all([
            fetch(`${API_URL}/malls`),
            fetch(`${API_URL}/shops`),
            fetch(`${API_URL}/products`),
            fetch(`${API_URL}/orders`)
        ]);
        
        dbData.malls = await mallsRes.json();
        dbData.shops = await shopsRes.json();
        dbData.products = await productsRes.json();
        dbData.orders = await ordersRes.json();
        
        console.log("✅ Data loaded from MongoDB!");
        // UI Refresh agar koi page khula hai
        if (document.getElementById('mallsTableBody')) populateAdminTables();
        if (document.getElementById('mallsContainer').innerHTML !== '') loadUserDashboard();
    } catch (err) {
        console.error("❌ Error fetching data:", err);
        showNotification("Failed to connect to database!");
    }
}

// ===== Navigation Functions =====
function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) targetScreen.classList.add('active');
}

// ===== REAL AUTHENTICATION LOGIC =====
async function adminLogin(event) {
    event.preventDefault();
    const emailValue = document.getElementById('adminEmail').value.trim();
    const passwordValue = document.getElementById('adminPassword').value.trim();
    
    // Admin ke liye hum abhi simple check rakh rahe hain (demo admin)
    if (emailValue === 'admin@mall.com' && passwordValue === 'admin123') {
        currentUser = { type: 'admin', email: emailValue };
        document.getElementById('adminEmail').value = '';
        document.getElementById('adminPassword').value = '';
        loadAdminDashboard();
        switchScreen('adminDashboard');
        showNotification('Admin Login Successful! 🛡️');
    } else { 
        alert('❌ Invalid Admin Credentials (Use admin@mall.com / admin123)'); 
    }
}

async function userLogin(event) {
    event.preventDefault();
    const email = document.getElementById('userEmail').value.trim();
    const password = document.getElementById('userPassword').value.trim();
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = { type: 'user', email: data.user.email, name: data.user.name };
            document.getElementById('userEmail').value = '';
            document.getElementById('userPassword').value = '';
            loadUserDashboard();
            switchScreen('userDashboard');
            showNotification(`Welcome back, ${data.user.name}! 👋`);
        } else {
            alert(`❌ ${data.message}`);
        }
    } catch (err) {
        console.error(err);
        alert('❌ Server error during login.');
    }
}

async function userRegister(event) {
    event.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            document.getElementById('regName').value = '';
            document.getElementById('regEmail').value = '';
            document.getElementById('regPassword').value = '';
            showNotification('Registration successful! Please login. ✅');
            switchScreen('userLoginScreen'); // Wapas login page par bhejo
        } else {
            alert(`❌ ${data.message}`);
        }
    } catch (err) {
        console.error(err);
        alert('❌ Server error during registration.');
    }
}

// ===== User Dashboard =====
function loadUserDashboard() {
    const container = document.getElementById('mallsContainer');
    container.innerHTML = '';
    dbData.malls.forEach((mall) => container.appendChild(createMallCard(mall)));
}

function createMallCard(mall) {
    const card = document.createElement('div');
    card.className = 'mall-card';
    let imageHTML = mall.image && mall.image.startsWith('data:image') 
        ? `<img src="${mall.image}" style="width:100%; height:100%; object-fit:cover;">` : `<i class="fas fa-shopping-mall"></i>`;
    card.innerHTML = `
        <div class="mall-image">${imageHTML}</div>
        <div class="mall-info">
            <h3 class="mall-name">${mall.name}</h3>
            <div class="mall-location"><i class="fas fa-map-marker-alt"></i><span>${mall.location}</span></div>
            <p class="mall-description">${mall.description}</p>
            <span class="shops-count">${mall.shops ? mall.shops.length : 0} Shops</span>
        </div>`;
    card.addEventListener('click', () => { currentMallId = mall._id; viewShops(mall._id); });
    return card;
}

function viewShops(mallId) {
    const mall = dbData.malls.find(m => m._id === mallId);
    document.getElementById('mallTitle').textContent = mall ? mall.name : 'Mall';
    const container = document.getElementById('shopsContainer');
    container.innerHTML = '';
    
    // Sirf wahi shop dikhao jinka mallId is mall ke _id se match kare
    const mallShops = dbData.shops.filter(s => s.mallId === mallId);
    mallShops.forEach(shop => container.appendChild(createShopCard(shop)));
    switchScreen('shopsScreen');
}

function createShopCard(shop) {
    const card = document.createElement('div');
    card.className = 'shop-card';
    let logoHTML = shop.icon && shop.icon.startsWith('data:image')
        ? `<img src="${shop.icon}" style="width:100%; height:100%; object-fit:cover; border-radius:15px;">` : `<i class="fas fa-store"></i>`;
    card.innerHTML = `
        <div class="shop-logo">${logoHTML}</div>
        <h3 class="shop-name">${shop.name}</h3>
        <span class="shop-category">${shop.category}</span>`;
    card.addEventListener('click', () => { currentShopId = shop._id; viewProducts(shop._id); });
    return card;
}

function viewProducts(shopId) {
    const shop = dbData.shops.find(s => s._id === shopId);
    document.getElementById('shopTitle').textContent = shop ? shop.name : 'Shop';
    const container = document.getElementById('productsContainer');
    container.innerHTML = '';
    
    const shopProducts = dbData.products.filter(p => p.shopId === shopId);
    shopProducts.forEach(product => container.appendChild(createProductCard(product)));
    switchScreen('productsScreen');
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    const stars = '⭐'.repeat(Math.floor(product.rating || 0));
    let imgHTML = product.icon && product.icon.startsWith('data:image')
        ? `<img src="${product.icon}" style="width:100%; height:100%; object-fit:cover;">` : `<i class="fas fa-shopping-bag" style="font-size: 3rem;"></i>`;
    
    // Stock Check Logic
    let stockHtml = product.stock > 0 
        ? `<div style="color: #00d9ff; font-size: 0.85rem; margin-bottom: 5px; font-weight: bold;"><i class="fas fa-box"></i> In Stock: ${product.stock}</div>`
        : `<div style="color: #ff006e; font-size: 0.85rem; margin-bottom: 5px; font-weight: bold;"><i class="fas fa-times-circle"></i> Out of Stock</div>`;

    let buttonHtml = product.stock > 0
        ? `<button type="button" class="add-to-cart-quick" onclick="openProductModal('${product._id}')"><i class="fas fa-shopping-bag"></i> View Details</button>`
        : `<button type="button" class="add-to-cart-quick" disabled style="background: #444; cursor: not-allowed; opacity: 0.7;">Sold Out</button>`;

    card.innerHTML = `
        <div class="product-image">${imgHTML}</div>
        <div class="product-info">
            <h4 class="product-name">${product.name}</h4>
            <div class="product-rating"><div class="stars">${stars}</div><span class="rating-text">(${product.reviews || 0})</span></div>
            ${stockHtml}
            <div class="product-price">₹${product.price.toFixed(2)}</div>
            ${buttonHtml}
        </div>`;
    return card;
}

// ===== Cart & Modals =====
function openProductModal(productId) {
    const product = dbData.products.find(p => p._id === productId);
    currentProductId = productId;
    const stars = '⭐'.repeat(Math.floor(product.rating || 0));
    const imgDiv = document.getElementById('productModalImage');
    if (product.icon && product.icon.startsWith('data:image')) {
        imgDiv.style.backgroundImage = `url(${product.icon})`;
        imgDiv.style.backgroundSize = 'cover'; imgDiv.style.backgroundPosition = 'center'; imgDiv.innerHTML = '';
    } else {
        imgDiv.style.backgroundImage = `linear-gradient(135deg, #ff006e, #b500ff)`;
        imgDiv.innerHTML = `<i class="fas fa-shopping-bag" style="font-size: 5rem; color: white; display:flex; align-items:center; height:100%; justify-content:center;"></i>`;
    }
    document.getElementById('productModalName').textContent = product.name;
    document.getElementById('productModalDescription').textContent = `High-quality ${product.name} - Premium selection`;
    document.getElementById('productModalRating').innerHTML = stars;
    document.getElementById('productModalRatingText').textContent = `${product.reviews} reviews`;
    document.getElementById('productModalPrice').textContent = `₹${product.price.toFixed(2)}`;
    document.getElementById('quantityInput').value = 1;
    document.getElementById('productModal').classList.add('active');
}

function closeProductModal() { document.getElementById('productModal').classList.remove('active'); }
function increaseQuantity() { const input = document.getElementById('quantityInput'); input.value = parseInt(input.value) + 1; }
function decreaseQuantity() { const input = document.getElementById('quantityInput'); if (parseInt(input.value) > 1) input.value = parseInt(input.value) - 1; }

function addCurrentProductToCart() {
    const product = dbData.products.find(p => p._id === currentProductId);
    const quantity = parseInt(document.getElementById('quantityInput').value);
    const existingItem = cart.find(item => item._id === currentProductId);
    
    // Check Stock
    const totalRequested = existingItem ? existingItem.quantity + quantity : quantity;
    if (totalRequested > product.stock) {
        alert(`❌ Sorry! Only ${product.stock} items are left in stock.`);
        return; 
    }

    if (existingItem) existingItem.quantity += quantity;
    else cart.push({ _id: currentProductId, name: product.name, price: product.price, quantity: quantity });
    updateCartBadge(); updateCartDisplay(); closeProductModal(); showNotification('Added to cart! 🛒');
}

function toggleCart() { document.getElementById('cartSidebar').classList.toggle('active'); }
function updateCartBadge() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.querySelectorAll('.cart-badge').forEach(badge => badge.textContent = totalItems);
}

function updateCartDisplay() {
    const container = document.getElementById('cartItems');
    container.innerHTML = '';
    let total = 0;
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity; total += itemTotal;
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div class="cart-item-info"><h4>${item.name}</h4><p>₹${item.price.toFixed(2)} each</p></div>
            <div class="cart-item-actions">
                <input type="number" class="cart-item-qty" value="${item.quantity}" min="1" onchange="updateCartItemQuantity('${item._id}', this.value)">
                <button type="button" class="remove-btn" onclick="removeFromCart('${item._id}')">Remove</button>
            </div>`;
        container.appendChild(cartItem);
    });
    document.getElementById('cartTotal').textContent = `₹${total.toFixed(2)}`;
}

function updateCartItemQuantity(productId, quantity) {
    const item = cart.find(i => i._id === productId);
    const product = dbData.products.find(p => p._id === productId); 

    if (item && product) { 
        let newQty = Math.max(1, parseInt(quantity));
        
        // Limit to Max Stock
        if (newQty > product.stock) {
            alert(`❌ Maximum stock available is ${product.stock}`);
            newQty = product.stock; 
        }

        item.quantity = newQty;
        updateCartDisplay(); 
        updateCartBadge(); 
    }
}

function removeFromCart(productId) {
    cart = cart.filter(item => item._id !== productId);
    updateCartDisplay(); updateCartBadge(); showNotification('Removed from cart');
}

// ===== Checkout Process (Database Connected) =====
function closeCartSidebar() {
    document.getElementById('cartSidebar').classList.remove('active');
}

function processCheckout() {
    if (cart.length === 0) return showNotification('Your cart is empty! 🛒');
    closeCartSidebar(); 
    document.getElementById('checkoutAddress').value = '';
    document.getElementById('checkoutPhone').value = '';
    document.getElementById('checkoutPayment').value = 'Cash on Delivery';
    const checkoutModal = document.getElementById('checkoutModal');
    checkoutModal.style.display = 'flex'; 
    checkoutModal.classList.add('active');
}

function closeCheckoutModal() { 
    const checkoutModal = document.getElementById('checkoutModal');
    checkoutModal.style.display = 'none';
    checkoutModal.classList.remove('active'); 
}

async function submitOrder(event) {
    event.preventDefault();
    const address = document.getElementById('checkoutAddress').value.trim();
    const phone = document.getElementById('checkoutPhone').value.trim();
    const paymentMethod = document.getElementById('checkoutPayment').value;

    if (paymentMethod === 'Net Banking') {
        alert('❌ Net Banking is currently under maintenance. Please select Cash on Delivery.');
        return;
    }

    showNotification('Processing your order... ⏳');
    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    const newOrder = {
        userEmail: currentUser ? currentUser.email : 'guest@user.com',
        phone: phone, address: address, paymentMethod: paymentMethod,
        items: [...cart], total: totalAmount, status: 'Pending'
    };
    
    try {
        await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newOrder)
        });
        
        cart = []; updateCartBadge(); updateCartDisplay(); closeCheckoutModal();
        showNotification('Order placed successfully! 🎉');
        await fetchAllData(); 
    } catch (err) {
        showNotification('Error placing order! ❌');
        console.error(err);
    }
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
        background: linear-gradient(135deg, #ff006e, #00d9ff); color: white;
        padding: 15px 30px; border-radius: 10px; font-weight: 600; z-index: 9999;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2500);
}

// ===== Admin Dashboard =====
function loadAdminDashboard() { populateAdminTables(); }

function populateAdminTables() {
    const mallsBody = document.getElementById('mallsTableBody');
    if(mallsBody) {
        mallsBody.innerHTML = '';
        dbData.malls.forEach(mall => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${mall.name}</td><td>${mall.location}</td><td>${mall.description.substring(0,30)}...</td>
                <td class="action-buttons">
                    <button type="button" class="edit-btn" onclick="editMall('${mall._id}')"><i class="fas fa-edit"></i> Edit</button>
                    <button type="button" class="delete-btn" onclick="deleteMall('${mall._id}')"><i class="fas fa-trash"></i> Delete</button>
                </td>`;
            mallsBody.appendChild(row);
        });
    }
    
    const shopsBody = document.getElementById('shopsTableBody');
    if(shopsBody) {
        shopsBody.innerHTML = '';
        dbData.shops.forEach(shop => {
            const mall = dbData.malls.find(m => m._id === shop.mallId);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${shop.name}</td><td>${mall ? mall.name : 'Unknown'}</td><td>${shop.category}</td>
                <td class="action-buttons">
                    <button type="button" class="edit-btn" onclick="editShop('${shop._id}')"><i class="fas fa-edit"></i> Edit</button>
                    <button type="button" class="delete-btn" onclick="deleteShop('${shop._id}')"><i class="fas fa-trash"></i> Delete</button>
                </td>`;
            shopsBody.appendChild(row);
        });
    }
    
    const productsBody = document.getElementById('productsTableBody');
    if(productsBody) {
        productsBody.innerHTML = '';
        dbData.products.forEach(product => {
            const shop = dbData.shops.find(s => s._id === product.shopId);
            const row = document.createElement('tr');
            const stars = '⭐'.repeat(Math.floor(product.rating || 0));
            
            let stockStyle = product.stock > 5 ? 'color: green;' : 'color: red; font-weight: bold;';
            
            row.innerHTML = `
                <td>${product.name}</td><td>${shop ? shop.name : 'N/A'}</td>
                <td>₹${product.price.toFixed(2)}</td>
                <td style="${stockStyle}">${product.stock !== undefined ? product.stock : 0} units</td>
                <td>${stars}</td>
                <td class="action-buttons">
                    <button type="button" class="edit-btn" onclick="editProduct('${product._id}')"><i class="fas fa-edit"></i> Edit</button>
                    <button type="button" class="delete-btn" onclick="deleteProduct('${product._id}')"><i class="fas fa-trash"></i> Delete</button>
                </td>`;
            productsBody.appendChild(row);
        });
    }

    const ordersBody = document.getElementById('ordersTableBody');
    if(ordersBody) {
        ordersBody.innerHTML = '';
        dbData.orders.forEach(order => {
            const row = document.createElement('tr');
            const itemsText = order.items.map(i => `${i.name} (x${i.quantity})`).join(', ');
            const statusBg = order.status === 'Pending' ? 'rgba(255, 190, 11, 0.2)' : 'rgba(0, 208, 132, 0.2)';
            const statusColor = order.status === 'Pending' ? 'var(--accent-color)' : 'var(--success-color)';
            
            row.innerHTML = `
                <td>#ORD-${order._id.substring(order._id.length-6)}</td>
                <td><strong>${order.userEmail}</strong><br><small style="color: var(--text-secondary);"><i class="fas fa-phone"></i> ${order.phone}</small></td>
                <td><small>${order.address.length > 20 ? order.address.substring(0,20)+'...' : order.address}</small><br><span style="color: var(--secondary-color); font-size: 0.8rem; font-weight: 600;"><i class="fas fa-wallet"></i> ${order.paymentMethod}</span></td>
                <td>${itemsText.length > 25 ? itemsText.substring(0, 22) + '...' : itemsText}</td>
                <td>₹${order.total.toFixed(2)}</td>
                <td><span style="padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: bold; background: ${statusBg}; color: ${statusColor};">${order.status}</span></td>
                <td class="action-buttons">
                    ${order.status === 'Pending' ? `<button type="button" class="edit-btn" onclick="completeOrder('${order._id}')"><i class="fas fa-check"></i> Complete</button>` : ''}
                    <button type="button" class="delete-btn" onclick="deleteOrder('${order._id}')"><i class="fas fa-trash"></i> Delete</button>
                </td>`;
            ordersBody.appendChild(row);
        });
    }
}

function switchAdminView(viewName, clickEvent) {
    document.querySelectorAll('.admin-view').forEach(view => view.classList.remove('active'));
    document.getElementById(viewName + 'View').classList.add('active');
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    clickEvent.target.classList.add('active');
}

// ===== Admin Order APIs =====
async function completeOrder(orderId) {
    try {
        await fetch(`${API_URL}/orders/${orderId}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'Completed' })
        });
        showNotification('Order marked as Completed! ✅');
        await fetchAllData();
    } catch (err) { console.error(err); }
}

async function deleteOrder(orderId) {
    if (confirm('Are you sure you want to delete this order?')) {
        try {
            await fetch(`${API_URL}/orders/${orderId}`, { method: 'DELETE' });
            showNotification('Order deleted! 🗑️');
            await fetchAllData();
        } catch (err) { console.error(err); }
    }
}

// ===== Admin Mall APIs =====
function openAddMallModal() {
    document.getElementById('modalTitle').textContent = 'Add New Mall';
    document.getElementById('actionForm').innerHTML = `
        <div class="form-group"><label>Mall Name</label><input type="text" id="mallName" required></div>
        <div class="form-group"><label>Location</label><input type="text" id="mallLocation" required></div>
        <div class="form-group"><label>Description</label><textarea id="mallDescription" required></textarea></div>
        <div class="form-group"><label>Upload Mall Image</label><input type="file" id="mallImage" accept="image/*"></div>
        <div class="form-actions"><button type="button" class="submit-btn" onclick="saveMall()">Add</button><button type="button" class="cancel-btn" onclick="closeActionModal()">Cancel</button></div>`;
    document.getElementById('actionModal').classList.add('active');
}

async function saveMall() {
    const name = document.getElementById('mallName').value.trim();
    const location = document.getElementById('mallLocation').value.trim();
    const description = document.getElementById('mallDescription').value.trim();
    const imageFile = document.getElementById('mallImage').files[0];
    if (!name || !location || !description) return alert('❌ Fill all text fields!');
    
    let image = "🏢";
    if (imageFile) image = await getBase64(imageFile);
    
    try {
        await fetch(`${API_URL}/malls`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, location, description, image }) });
        closeActionModal(); showNotification('Mall added! ✨'); await fetchAllData();
    } catch (err) { console.error(err); }
}

function editMall(mallId) {
    const mall = dbData.malls.find(m => m._id === mallId);
    document.getElementById('modalTitle').textContent = 'Edit Mall';
    document.getElementById('actionForm').innerHTML = `
        <div class="form-group"><label>Mall Name</label><input type="text" value="${mall.name}" id="mallName" required></div>
        <div class="form-group"><label>Location</label><input type="text" value="${mall.location}" id="mallLocation" required></div>
        <div class="form-group"><label>Description</label><textarea id="mallDescription" required>${mall.description}</textarea></div>
        <div class="form-group"><label>Update Image</label><input type="file" id="mallImage" accept="image/*"></div>
        <div class="form-actions"><button type="button" class="submit-btn" onclick="updateMall('${mallId}')">Update</button><button type="button" class="cancel-btn" onclick="closeActionModal()">Cancel</button></div>`;
    document.getElementById('actionModal').classList.add('active');
}

async function updateMall(mallId) {
    const name = document.getElementById('mallName').value.trim();
    const location = document.getElementById('mallLocation').value.trim();
    const description = document.getElementById('mallDescription').value.trim();
    const imageFile = document.getElementById('mallImage').files[0];
    if (!name || !location || !description) return alert('❌ Fill all text fields!');
    
    let bodyData = { name, location, description };
    if (imageFile) bodyData.image = await getBase64(imageFile);
    
    try {
        await fetch(`${API_URL}/malls/${mallId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyData) });
        closeActionModal(); showNotification('Mall updated! ✨'); await fetchAllData();
    } catch (err) { console.error(err); }
}

async function deleteMall(mallId) {
    if (confirm('Delete this mall?')) {
        try { await fetch(`${API_URL}/malls/${mallId}`, { method: 'DELETE' }); showNotification('Mall deleted'); await fetchAllData(); } 
        catch (err) { console.error(err); }
    }
}

// ===== Admin Shop APIs =====
function updateShopDropdown(mallId, targetSelectId, selectedShopId = null) {
    const shopSelect = document.getElementById(targetSelectId);
    shopSelect.innerHTML = '<option value="">Select a shop</option>';
    if (!mallId) return;
    const mallShops = dbData.shops.filter(s => s.mallId === mallId);
    mallShops.forEach(shop => {
        const isSelected = selectedShopId === shop._id ? 'selected' : '';
        shopSelect.innerHTML += `<option value="${shop._id}" ${isSelected}>${shop.name}</option>`;
    });
}

function openAddShopModal() {
    document.getElementById('modalTitle').textContent = 'Add New Shop';
    const mallOptions = dbData.malls.map(m => `<option value="${m._id}">${m.name}</option>`).join('');
    document.getElementById('actionForm').innerHTML = `
        <div class="form-group"><label>Shop Name</label><input type="text" id="shopName" required></div>
        <div class="form-group"><label>Category</label><input type="text" id="shopCategory" required></div>
        <div class="form-group"><label>Select Mall</label><select id="shopMall" required><option value="">Select</option>${mallOptions}</select></div>
        <div class="form-group"><label>Upload Shop Image</label><input type="file" id="shopImage" accept="image/*"></div>
        <div class="form-actions"><button type="button" class="submit-btn" onclick="saveShop()">Add</button><button type="button" class="cancel-btn" onclick="closeActionModal()">Cancel</button></div>`;
    document.getElementById('actionModal').classList.add('active');
}

async function saveShop() {
    const name = document.getElementById('shopName').value.trim();
    const category = document.getElementById('shopCategory').value.trim();
    const mallId = document.getElementById('shopMall').value;
    const imageFile = document.getElementById('shopImage').files[0];
    if (!name || !category || !mallId) return alert('❌ Fill all fields!');
    
    let icon = "🏪";
    if (imageFile) icon = await getBase64(imageFile);
    
    try {
        await fetch(`${API_URL}/shops`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, category, mallId, icon }) });
        closeActionModal(); showNotification('Shop added! ✨'); await fetchAllData();
    } catch (err) { console.error(err); }
}

function editShop(shopId) {
    const shop = dbData.shops.find(s => s._id === shopId);
    const mallOptions = dbData.malls.map(m => `<option value="${m._id}" ${m._id === shop.mallId ? 'selected' : ''}>${m.name}</option>`).join('');
    document.getElementById('modalTitle').textContent = 'Edit Shop';
    document.getElementById('actionForm').innerHTML = `
        <div class="form-group"><label>Shop Name</label><input type="text" value="${shop.name}" id="shopName" required></div>
        <div class="form-group"><label>Category</label><input type="text" value="${shop.category}" id="shopCategory" required></div>
        <div class="form-group"><label>Mall</label><select id="shopMall" required>${mallOptions}</select></div>
        <div class="form-group"><label>Update Image</label><input type="file" id="shopImage" accept="image/*"></div>
        <div class="form-actions"><button type="button" class="submit-btn" onclick="updateShop('${shopId}')">Update</button><button type="button" class="cancel-btn" onclick="closeActionModal()">Cancel</button></div>`;
    document.getElementById('actionModal').classList.add('active');
}

async function updateShop(shopId) {
    const name = document.getElementById('shopName').value.trim();
    const category = document.getElementById('shopCategory').value.trim();
    const mallId = document.getElementById('shopMall').value;
    const imageFile = document.getElementById('shopImage').files[0];
    if (!name || !category || !mallId) return alert('❌ Fill all fields!');
    
    let bodyData = { name, category, mallId };
    if (imageFile) bodyData.icon = await getBase64(imageFile);
    
    try {
        await fetch(`${API_URL}/shops/${shopId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyData) });
        closeActionModal(); showNotification('Shop updated! ✨'); await fetchAllData();
    } catch (err) { console.error(err); }
}

async function deleteShop(shopId) {
    if (confirm('Delete this shop?')) {
        try { await fetch(`${API_URL}/shops/${shopId}`, { method: 'DELETE' }); showNotification('Shop deleted'); await fetchAllData(); } 
        catch (err) { console.error(err); }
    }
}

// ===== Admin Product APIs =====
function openAddProductModal() {
    document.getElementById('modalTitle').textContent = 'Add Products to Shop';
    const mallOptions = dbData.malls.map(m => `<option value="${m._id}">${m.name}</option>`).join('');
    
    document.getElementById('actionForm').innerHTML = `
        <div style="background: rgba(0,0,0,0.05); padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #ddd;">
            <h4 style="margin-top: 0; margin-bottom: 10px; color: var(--accent-color);">1. Select Destination Shop</h4>
            <div class="form-group"><label>Select Mall</label><select id="productMall" onchange="updateShopDropdown(this.value, 'productShop')" required><option value="">Select a mall</option>${mallOptions}</select></div>
            <div class="form-group"><label>Select Shop</label><select id="productShop" required><option value="">Select a shop</option></select></div>
        </div>

        <div style="display: flex; gap: 20px; flex-wrap: wrap;">
            
            <div style="flex: 1; min-width: 250px; background: rgba(0,0,0,0.02); padding: 15px; border-radius: 8px; border: 1px solid #eee;">
                <h4 style="margin-top: 0; margin-bottom: 15px; color: #333;"><i class="fas fa-keyboard"></i> Option A: Add Manually</h4>
                <div class="form-group"><label>Product Name</label><input type="text" id="productName"></div>
                <div class="form-group"><label>Price (₹)</label><input type="number" id="productPrice" step="0.01"></div>
                <div class="form-group"><label>Stock</label><input type="number" id="productStock" min="0" value="10"></div>
                <div class="form-group"><label>Rating (0-5)</label><input type="number" id="productRating" min="0" max="5" step="0.1"></div>
                <div class="form-group"><label>Reviews</label><input type="number" id="productReviews"></div>
                <div class="form-group"><label>Upload Image</label><input type="file" id="productImage" accept="image/*"></div>
                <button type="button" class="submit-btn" style="width: 100%;" onclick="saveProduct()">Add Single Product</button>
            </div>

            <div style="flex: 1; min-width: 250px; background: rgba(16, 185, 129, 0.1); padding: 15px; border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.3);">
                <h4 style="margin-top: 0; margin-bottom: 15px; color: #10b981;"><i class="fas fa-file-csv"></i> Option B: Bulk CSV Upload</h4>
                <p style="font-size: 0.85rem; color: #555; margin-bottom: 15px;">
                    Make sure your Excel/CSV has these exact 5 columns:<br><br>
                    <strong>name, price, stock, rating, reviews</strong>
                </p>
                <input type="file" id="modalCsvUpload" accept=".csv" style="display: none;" onchange="handleModalCSVUpload(event)">
                
                <button type="button" class="add-btn" style="width: 100%; background: #10b981; justify-content: center; padding: 12px;" onclick="document.getElementById('modalCsvUpload').click()">
                    <i class="fas fa-upload"></i> Select & Upload CSV
                </button>
            </div>
        </div>
        
        <div class="form-actions" style="margin-top: 20px; justify-content: flex-end;">
            <button type="button" class="cancel-btn" onclick="closeActionModal()">Close Window</button>
        </div>
    `;
    document.getElementById('actionModal').classList.add('active');
}

async function saveProduct() {
    const shopId = document.getElementById('productShop').value;
    const name = document.getElementById('productName').value.trim();
    const price = parseFloat(document.getElementById('productPrice').value);
    const stock = parseInt(document.getElementById('productStock').value);
    const rating = parseFloat(document.getElementById('productRating').value);
    const reviews = parseInt(document.getElementById('productReviews').value);
    const imageFile = document.getElementById('productImage').files[0];
    
    if (!shopId || !name || !price || !rating || isNaN(stock)) return alert('❌ Fill all fields correctly!');
    
    let icon = "📦";
    if (imageFile) icon = await getBase64(imageFile);
    
    try {
        await fetch(`${API_URL}/products`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, price, stock, rating, reviews, shopId, icon }) });
        closeActionModal(); showNotification('Product added! ✨'); await fetchAllData();
    } catch (err) { console.error(err); }
}

function editProduct(productId) {
    const product = dbData.products.find(p => p._id === productId);
    const currentShop = dbData.shops.find(s => s._id === product.shopId);
    const currentMallId = currentShop ? currentShop.mallId : '';
    const mallOptions = dbData.malls.map(m => `<option value="${m._id}" ${m._id === currentMallId ? 'selected' : ''}>${m.name}</option>`).join('');
    
    const currentStock = product.stock !== undefined ? product.stock : 0; 

    document.getElementById('modalTitle').textContent = 'Edit Product';
    document.getElementById('actionForm').innerHTML = `
        <div class="form-group"><label>Select Mall</label><select id="productMall" onchange="updateShopDropdown(this.value, 'productShop')" required><option value="">Select a mall</option>${mallOptions}</select></div>
        <div class="form-group"><label>Select Shop</label><select id="productShop" required><option value="">Select a shop</option></select></div>
        <div class="form-group"><label>Product Name</label><input type="text" value="${product.name}" id="productName" required></div>
        <div class="form-group"><label>Price (₹)</label><input type="number" value="${product.price}" id="productPrice" step="0.01" required></div>
        <div class="form-group"><label>Stock Quantity</label><input type="number" value="${currentStock}" id="productStock" min="0" required></div> <div class="form-group"><label>Rating</label><input type="number" value="${product.rating}" id="productRating" min="0" max="5" step="0.1" required></div>
        <div class="form-group"><label>Reviews</label><input type="number" value="${product.reviews}" id="productReviews" required></div>
        <div class="form-group"><label>Update Image</label><input type="file" id="productImage" accept="image/*"></div>
        <div class="form-actions"><button type="button" class="submit-btn" onclick="updateProduct('${productId}')">Update</button><button type="button" class="cancel-btn" onclick="closeActionModal()">Cancel</button></div>`;
    document.getElementById('actionModal').classList.add('active');
    
    if(currentMallId) updateShopDropdown(currentMallId, 'productShop', currentShop ? currentShop._id : null);
}

async function updateProduct(productId) {
    const shopId = document.getElementById('productShop').value;
    const name = document.getElementById('productName').value.trim();
    const price = parseFloat(document.getElementById('productPrice').value);
    const stock = parseInt(document.getElementById('productStock').value); 
    const rating = parseFloat(document.getElementById('productRating').value);
    const reviews = parseInt(document.getElementById('productReviews').value);
    const imageFile = document.getElementById('productImage').files[0];
    
    if (!shopId || !name || !price || !rating || isNaN(stock)) return alert('❌ Fill all fields correctly!');
    
    let bodyData = { name, price, stock, rating, reviews, shopId };
    if (imageFile) bodyData.icon = await getBase64(imageFile);
    
    try {
        await fetch(`${API_URL}/products/${productId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyData) });
        closeActionModal(); showNotification('Product updated! ✨'); await fetchAllData();
    } catch (err) { console.error(err); }
}

async function deleteProduct(productId) {
    if (confirm('Delete this product?')) {
        try { await fetch(`${API_URL}/products/${productId}`, { method: 'DELETE' }); showNotification('Product deleted'); await fetchAllData(); } 
        catch (err) { console.error(err); }
    }
}

function closeActionModal() { document.getElementById('actionModal').classList.remove('active'); }
function backToMalls() { switchScreen('userDashboard'); }
function backToShops() { currentShopId = null; switchScreen('shopsScreen'); }


// ===== Generate Categorized Print Report =====
function generatePrintReport() {
    if (!dbData || dbData.malls.length === 0) {
        showNotification('No data available to print! ❌');
        return;
    }

    showNotification('Generating Report... ⏳');

    let reportHTML = `
        <html>
        <head>
            <title>System Report - Mall Mapper</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 30px; color: #333; line-height: 1.6; }
                h1 { text-align: center; color: #ff006e; border-bottom: 2px solid #eee; padding-bottom: 15px; margin-bottom: 30px; }
                .mall-section { margin-bottom: 40px; border: 1px solid #ccc; padding: 20px; border-radius: 8px; page-break-inside: avoid; }
                .mall-title { font-size: 1.5rem; color: #00d9ff; margin-top: 0; margin-bottom: 15px; }
                .shop-section { margin-left: 20px; margin-top: 20px; border-left: 4px solid #ffbe0b; padding-left: 15px; page-break-inside: avoid; }
                .shop-title { font-size: 1.2rem; color: #555; margin-bottom: 10px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 0.95rem; }
                th { background-color: #f4f4f4; font-weight: bold; }
                .footer { text-align: center; margin-top: 50px; font-size: 0.85rem; color: #888; border-top: 1px solid #eee; padding-top: 15px; }
            </style>
        </head>
        <body>
            <h1>Mall Mapper - Master Data Report</h1>
    `;

    dbData.malls.forEach(mall => {
        reportHTML += `
            <div class="mall-section">
                <h2 class="mall-title">🏢 Mall: ${mall.name} <span style="color:#888; font-size:1rem;">(${mall.location})</span></h2>
        `;

        const mallShops = dbData.shops.filter(s => s.mallId === mall._id);
        
        if (mallShops.length === 0) {
            reportHTML += `<p style="color:#888; font-style:italic;">No shops registered in this mall yet.</p>`;
        } else {
            mallShops.forEach(shop => {
                reportHTML += `
                    <div class="shop-section">
                        <h3 class="shop-title">🏪 Shop: ${shop.name} <span style="color:#888; font-size:0.9rem;">[Category: ${shop.category}]</span></h3>
                `;

                const shopProducts = dbData.products.filter(p => p.shopId === shop._id);
                
                if (shopProducts.length === 0) {
                    reportHTML += `<p style="color:#888; font-style:italic; margin-left:10px;">No products available in this shop.</p>`;
                } else {
                    reportHTML += `
                        <table>
                            <thead>
                                <tr>
                                    <th>Product Name</th>
                                    <th>Price</th>
                                    <th>Rating</th>
                                    <th>Total Reviews</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;
                    
                    shopProducts.forEach(product => {
                        reportHTML += `
                            <tr>
                                <td>${product.name}</td>
                                <td>₹${product.price.toFixed(2)}</td>
                                <td>⭐ ${product.rating}</td>
                                <td>${product.reviews} reviews</td>
                            </tr>
                        `;
                    });
                    
                    reportHTML += `
                            </tbody>
                        </table>
                    `;
                }
                reportHTML += `</div>`; 
            });
        }
        reportHTML += `</div>`; 
    });

    reportHTML += `
            <div class="footer">Report generated securely from Admin Panel on: <strong>${new Date().toLocaleString()}</strong></div>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    printWindow.document.open();
    printWindow.document.write(reportHTML);
    printWindow.document.close();

    setTimeout(() => {
        printWindow.print();
    }, 500);
}

// ===== Order History =====
async function openOrderHistoryModal() {
    const modal = document.getElementById('orderHistoryModal');
    modal.style.display = 'flex'; 
    modal.classList.add('active'); 
    await fetchAndDisplayOrders();
}

function closeOrderHistoryModal() {
    const modal = document.getElementById('orderHistoryModal');
    modal.style.display = 'none';
    modal.classList.remove('active');
}

// Backend se data laakar HTML render karne ka function
async function fetchAndDisplayOrders() {
    const container = document.getElementById('orderHistoryContainer');
    container.innerHTML = '<h4>Loading your orders...</h4>';

    try {
        const email = currentUser.email; 
        
        const response = await fetch(`${API_URL}/orders/history/${email}`);
        const orders = await response.json();

        if (orders.length === 0) {
            container.innerHTML = '<h4>You have no past orders.</h4>';
            return;
        }

        let htmlContent = '';
        orders.forEach(order => {
            let statusColor = order.status === 'Completed' ? 'green' : 'orange';
            let itemsList = order.items.map(item => `${item.name} (x${item.quantity})`).join(', ');

            htmlContent += `
                <div class="glass-panel" style="margin-bottom: 15px; padding: 15px; border-left: 5px solid ${statusColor};">
                    <h4>Order ID: #${order._id.substring(0, 8).toUpperCase()}</h4>
                    <p><strong>Items:</strong> ${itemsList}</p>
                    <p><strong>Total Amount:</strong> ₹${order.total}</p>
                    <p><strong>Delivery Address:</strong> ${order.address}</p>
                    <p>
                        <strong>Status:</strong> 
                        <span style="color: ${statusColor}; font-weight: bold;">${order.status}</span>
                    </p>
                </div>
            `;
        });

        container.innerHTML = htmlContent;

    } catch (error) {
        console.error("Failed to fetch orders:", error);
        container.innerHTML = '<h4 style="color: red;">Error fetching order history.</h4>';
    }
}

// ===== ADMIN CSV UPLOAD LOGIC =====
async function handleModalCSVUpload(event) {
    const shopId = document.getElementById('productShop').value;
    if (!shopId) {
        alert("❌ Please select Mall and Shop first!");
        event.target.value = ''; 
        return;
    }

    const file = event.target.files[0];
    if (!file) return;

    showNotification("Reading CSV file... ⏳");
    const reader = new FileReader();
    
    reader.onload = async function(e) {
        try {
            const text = e.target.result;
            const rows = text.split(/\r?\n/).filter(row => row.trim() !== '');
            
            if (rows.length < 2) throw new Error("File empty hai ya sirf headings hain!");

            const separator = rows[0].includes(';') ? ';' : ',';
            const headers = rows[0].toLowerCase().split(separator).map(h => h.trim().replace(/"/g, '')); 
            
            const productsData = [];
            
            for(let i = 1; i < rows.length; i++) {
                const values = rows[i].split(separator).map(v => v.trim().replace(/"/g, ''));
                if (values.join('') === '') continue;

                let obj = {};
                headers.forEach((header, index) => {
                    let val = values[index];
                    if(header === 'price' || header === 'rating') obj[header] = parseFloat(val) || 0;
                    else if(header === 'stock' || header === 'reviews') obj[header] = parseInt(val) || 0;
                    else obj[header] = val || "Unnamed";
                });
                
                obj.icon = "📦"; 
                obj.shopId = shopId; 
                productsData.push(obj);
            }

            const response = await fetch(`${API_URL}/products/bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productsData)
            });

            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                throw new Error("Server Error! Check server.js file.");
            }

            const result = await response.json();
            
            if (response.ok) {
                showNotification(`✅ Success: ${result.message}`);
                closeActionModal(); 
                await fetchAllData(); 
            } else {
                alert("❌ SERVER ERROR: " + (result.error || "Unknown Error"));
            }
        } catch (error) {
            alert("❌ ERROR IS: " + error.message);
            console.error(error);
        } finally {
            event.target.value = ''; 
        }
    };
    reader.readAsText(file);
}

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', () => {
    // 🌍 Sabse pehle Data load karo server se
    fetchAllData();

    document.getElementById('adminBtn')?.addEventListener('click', (e) => { e.preventDefault(); switchScreen('adminLoginScreen'); });
    document.getElementById('userBtn')?.addEventListener('click', (e) => { e.preventDefault(); switchScreen('userLoginScreen'); });
    document.getElementById('adminBackBtn')?.addEventListener('click', () => switchScreen('loginScreen'));
    document.getElementById('userBackBtn')?.addEventListener('click', () => switchScreen('loginScreen'));
    document.getElementById('adminLoginForm')?.addEventListener('submit', adminLogin);
    document.getElementById('userLoginForm')?.addEventListener('submit', userLogin);
    document.getElementById('shopsBackBtn')?.addEventListener('click', backToMalls);
    document.getElementById('productsBackBtn')?.addEventListener('click', backToShops);
    document.getElementById('userCartBtn')?.addEventListener('click', toggleCart);
    document.getElementById('productsCartBtn')?.addEventListener('click', toggleCart);
    document.getElementById('userLogoutBtn')?.addEventListener('click', () => { cart = []; currentUser = null; switchScreen('loginScreen'); });
    document.getElementById('adminLogoutBtn')?.addEventListener('click', () => { cart = []; currentUser = null; switchScreen('loginScreen'); });
    document.getElementById('userRegisterForm')?.addEventListener('submit', userRegister);
    document.getElementById('registerBackBtn')?.addEventListener('click', () => switchScreen('loginScreen'));
});