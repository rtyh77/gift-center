// استيراد مكتبات Firebase المباشرة
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// إعدادات Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD60g3bc-e6h9JMRUR3eKcD5oRO2rAb4vQ",
  authDomain: "beauty-store-4f012.firebaseapp.com",
  projectId: "beauty-store-4f012",
  storageBucket: "beauty-store-4f012.firebasestorage.app",
  messagingSenderId: "1053116874470",
  appId: "1:1053116874470:web:32a41e8ce3e089d1920527"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let currentVisitorIP = "غير معروف";

// دالة جلب الـ IP العام المباشر
async function getUserIP() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const response = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
        clearTimeout(timeoutId);
        const data = await response.json();
        if (data && data.ip) return data.ip.trim();
    } catch (e1) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            const response = await fetch('https://api64.ipify.org?format=json', { signal: controller.signal });
            clearTimeout(timeoutId);
            const data = await response.json();
            if (data && data.ip) return data.ip.trim();
        } catch (e2) {
            return "غير معروف";
        }
    }
    return "غير معروف";
}

// تسجبل زيارة الزبون فور دخوله الموقع
async function trackInstantVisit() {
    currentVisitorIP = await getUserIP();
    
    // منع تسجيل الزيارات غير المعروفة إذا فشل الاتصال
    if (currentVisitorIP === "غير معروف") return;

    try {
        await addDoc(collection(db, "visitors"), {
            ipAddress: currentVisitorIP,
            userAgent: navigator.userAgent,
            visitedAt: serverTimestamp()
        });
        console.log("تم تسجيل زيارة IP بنجاح:", currentVisitorIP);
    } catch (error) {
        console.error("خطأ أثناء تسجيل الزيارة:", error);
    }
}

// عناصر السلة والموقع
let cart = [];
const productsGrid = document.getElementById('productsGrid');
const cartCount = document.getElementById('cartCount');
const cartModal = document.getElementById('cartModal');
const cartItems = document.getElementById('cartItems');
const totalAmount = document.getElementById('totalAmount');
const checkoutModal = document.getElementById('checkoutModal');

// جلب المنتجات من قاعدة البيانات
async function loadProducts() {
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        if (productsGrid) productsGrid.innerHTML = "";
        
        if (querySnapshot.empty) {
            if (productsGrid) productsGrid.innerHTML = "<p style='grid-column: 1/-1; text-align: center; padding: 20px;'>لا توجد منتجات معروضة حالياً.</p>";
            return;
        }

        querySnapshot.forEach((doc) => {
            const product = doc.data();
            const productCard = `
                <div class="product-card" data-category="${product.category || 'all'}">
                    <img src="${product.image || 'https://via.placeholder.com/200'}" alt="${product.name}">
                    <div class="product-info">
                        <div class="product-title">${product.name}</div>
                        <div class="product-price">${product.price} د.ج</div>
                        <button class="add-to-cart-btn" onclick="addToCart('${doc.id}', '${product.name}', ${product.price})">
                            إضافة للسلة
                        </button>
                    </div>
                </div>
            `;
            if (productsGrid) productsGrid.innerHTML += productCard;
        });
    } catch (error) {
        console.error("خطأ في جلب المنتجات:", error);
    }
}

// إضافة منتج للسلة
window.addToCart = function(id, name, price) {
    const existing = cart.find(item => item.id === id);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ id, name, price, qty: 1 });
    }
    updateCartUI();
};

// تحديث واجهة السلة
function updateCartUI() {
    if (cartCount) cartCount.innerText = cart.reduce((total, item) => total + item.qty, 0);
    if (cartItems) {
        cartItems.innerHTML = "";
        let total = 0;

        cart.forEach(item => {
            total += item.price * item.qty;
            cartItems.innerHTML += `
                <div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">
                    <span>${item.name} (x${item.qty})</span>
                    <span>${item.price * item.qty} د.ج</span>
                </div>
            `;
        });

        if (totalAmount) totalAmount.innerText = `${total} د.ج`;
    }
}

// التحكم بالحوارات (Modals)
const cartBtn = document.getElementById('cartBtn');
const closeCart = document.getElementById('closeCart');
const checkoutBtn = document.getElementById('checkoutBtn');
const cancelOrder = document.getElementById('cancelOrder');

if (cartBtn) cartBtn.addEventListener('click', () => cartModal.style.display = 'flex');
if (closeCart) closeCart.addEventListener('click', () => cartModal.style.display = 'none');
if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
        if (cart.length === 0) return alert("السلة فارغة!");
        cartModal.style.display = 'none';
        checkoutModal.style.display = 'flex';
    });
}
if (cancelOrder) cancelOrder.addEventListener('click', () => checkoutModal.style.display = 'none');

// إرسال الطلب إلى Firebase
const orderForm = document.getElementById('orderForm');
if (orderForm) {
    orderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('custName').value;
        const phone = document.getElementById('custPhone').value;
        const address = document.getElementById('custAddress').value;

        try {
            await addDoc(collection(db, "orders"), {
                customerName: name,
                phone: phone,
                address: address,
                ipAddress: currentVisitorIP, // استخدام الـ IP المجلوب فور الدخول
                items: cart,
                total: cart.reduce((t, i) => t + (i.price * i.qty), 0),
                createdAt: serverTimestamp()
            });

            alert("تم إرسال طلبك بنجاح!");
            cart = [];
            updateCartUI();
            checkoutModal.style.display = 'none';
        } catch (error) {
            console.error("خطأ أثناء إرسال الطلب:", error);
        }
    });
}

// التشغيل الفوري عند فتح المتصفح
trackInstantVisit();
loadProducts();
