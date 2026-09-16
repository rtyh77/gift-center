// ==================== منصة متجر لمسة جمال ====================

// تخزين المنتجات
let products = [
    { id: 1, name: "عطر فرنسي فاخر", price: 2500, image: "https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=300&h=200&fit=crop" },
    { id: 2, name: "كريم العناية بالبشرة", price: 1800, image: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=300&h=200&fit=crop" },
    { id: 3, name: "قناع الوجه الطبيعي", price: 1200, image: "https://images.unsplash.com/photo-1556479318-cc4d19b90cc2?w=300&h=200&fit=crop" },
    { id: 4, name: "مجموعة العناية الكاملة", price: 4500, image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=300&h=200&fit=crop" },
    { id: 5, name: "لوشن الجسم المرطب", price: 1500, image: "https://images.unsplash.com/photo-1512385537326-ab7ae9b6eccc?w=300&h=200&fit=crop" },
    { id: 6, name: "صابون طبيعي عضوي", price: 800, image: "https://images.unsplash.com/photo-1599599810694-b5ac4dd93549?w=300&h=200&fit=crop" }
];

// تخزين السلة
let cart = [];

// ==================== تحميل المنتجات ====================
function loadProducts() {
    const productsGrid = document.getElementById('productsGrid');
    productsGrid.innerHTML = '';

    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <img src="${product.image}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/300x200?text=${product.name}'">
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                <p class="product-price">${product.price} د.ج</p>
                <button class="add-to-cart-btn" onclick="addToCart(${product.id})">أضف للسلة 🛒</button>
            </div>
        `;
        productsGrid.appendChild(card);
    });
}

// ==================== إدارة السلة ====================
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({ ...product, quantity: 1 });
    }

    updateCartCount();
    showNotification(`تم إضافة ${product.name} للسلة ✓`);
}

function updateCartCount() {
    const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
    document.getElementById('cartCount').textContent = cartCount;
}

function displayCart() {
    const cartItems = document.getElementById('cartItems');
    cartItems.innerHTML = '';

    if (cart.length === 0) {
        cartItems.innerHTML = '<p style="text-align:center; color:#94a3b8;">السلة فارغة</p>';
    } else {
        cart.forEach((item, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.style.cssText = 'padding:10px; border-bottom:1px solid #334155; display:flex; justify-content:space-between; align-items:center;';
            itemDiv.innerHTML = `
                <div>
                    <div style="font-weight:bold;">${item.name}</div>
                    <div style="color:#94a3b8; font-size:0.9rem;">الكمية: ${item.quantity}</div>
                </div>
                <div style="text-align:center;">
                    <div style="color:var(--accent-gold); font-weight:bold;">${item.price * item.quantity} د.ج</div>
                    <button onclick="removeFromCart(${index})" style="background:#dc2626; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; margin-top:5px;">حذف</button>
                </div>
            `;
            cartItems.appendChild(itemDiv);
        });
    }

    updateTotalAmount();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartCount();
    displayCart();
}

function updateTotalAmount() {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById('totalAmount').textContent = total + ' د.ج';
}

// ==================== العمليات ====================
function openCartModal() {
    displayCart();
    document.getElementById('cartModal').style.display = 'flex';
}

function closeCartModal() {
    document.getElementById('cartModal').style.display = 'none';
}

function closeCheckoutModal() {
    document.getElementById('checkoutModal').style.display = 'none';
}

function openCheckout() {
    if (cart.length === 0) {
        showNotification('السلة فارغة! أضف منتجات أولاً', 'error');
        return;
    }
    document.getElementById('cartModal').style.display = 'none';
    document.getElementById('checkoutModal').style.display = 'flex';
}

// ==================== معالجة الطلب ====================
document.addEventListener('DOMContentLoaded', function() {
    loadProducts();

    // أزرار الإغلاق
    document.getElementById('cartBtn').addEventListener('click', openCartModal);
    document.getElementById('closeCart').addEventListener('click', closeCartModal);
    document.getElementById('cancelOrder').addEventListener('click', closeCheckoutModal);
    document.getElementById('checkoutBtn').addEventListener('click', openCheckout);

    // معالجة نموذج الطلب
    document.getElementById('orderForm').addEventListener('submit', function(e) {
        e.preventDefault();

        const name = document.getElementById('custName').value;
        const phone = document.getElementById('custPhone').value;
        const address = document.getElementById('custAddress').value;

        // التحقق من البيانات
        if (!name || !phone || !address) {
            showNotification('يرجى ملء جميع الحقول', 'error');
            return;
        }

        // بناء رسالة الطلب
        let orderMessage = `*طلب جديد من لمسة جمال* 🎁\n\n`;
        orderMessage += `*بيانات العميل:*\n`;
        orderMessage += `الاسم: ${name}\n`;
        orderMessage += `الهاتف: ${phone}\n`;
        orderMessage += `العنوان: ${address}\n\n`;
        orderMessage += `*المنتجات:*\n`;

        let totalPrice = 0;
        cart.forEach((item, index) => {
            const itemTotal = item.price * item.quantity;
            orderMessage += `${index + 1}. ${item.name} × ${item.quantity} = ${itemTotal} د.ج\n`;
            totalPrice += itemTotal;
        });

        orderMessage += `\n*الإجمالي: ${totalPrice} د.ج*`;

        // إرسال عبر WhatsApp
        const whatsappNumber = '213656708603';
        const encodedMessage = encodeURIComponent(orderMessage);
        const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;

        // فتح الواتساب
        window.open(whatsappLink, '_blank');

        // تنظيف
        cart = [];
        updateCartCount();
        document.getElementById('orderForm').reset();
        closeCheckoutModal();
        showNotification('تم إرسال الطلب بنجاح! ✓', 'success');
    });

    // إغلاق النوافذ بالضغط خارجها
    window.addEventListener('click', function(e) {
        const cartModal = document.getElementById('cartModal');
        const checkoutModal = document.getElementById('checkoutModal');

        if (e.target === cartModal) closeCartModal();
        if (e.target === checkoutModal) closeCheckoutModal();
    });
});

// ==================== إشعارات ====================
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#dc2626' : '#10b981'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 3000);
}

// ==================== إضافة أنيميشن الشرائح ====================
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);