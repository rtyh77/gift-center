// 1. إعدادات Firebase الخاص بمتجرك
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "beauty-store-4f012.firebaseapp.com",
    projectId: "beauty-store-4f012",
    storageBucket: "beauty-store-4f012.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// 2. تهيئة Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// 3. دالة جلب البيانات وتخزينها
async function logVisitor() {
    try {
        // جلب الـ IP والتفاصيل الجغرافية عبر API يدعم HTTPS
        const response = await fetch('https://ipapi.co/json/');
        const geoData = await response.json();

        // تجهيز المستند للتخزين
        const visitorData = {
            ip: geoData.ip || "Unknown IP",
            country: geoData.country_name || "غير معروف",
            region: geoData.region || "غير معروف",
            city: geoData.city || "غير معروف",
            zip: geoData.postal || "غير متوفر",
            isp: geoData.org || geoData.asn || "غير معروف",
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        // إرسال البيانات إلى Firestore
        await db.collection("visitors").add(visitorData);
        console.log("SUCCESS: Visitor logged successfully!");
    } catch (error) {
        console.error("ERROR logging visitor:", error);
    }
}

// تشغيل الدالة فور فتح الصفحة
document.addEventListener('DOMContentLoaded', logVisitor);
