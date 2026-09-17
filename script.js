// 1. تهيئة Firebase بالمفاتيح الحقيقية
const firebaseConfig = {
  apiKey: "AIzaSyD60g3bc-e6h9JMRUR3eKcD5oRO2rAb4vQ",
  authDomain: "beauty-store-4f012.firebaseapp.com",
  projectId: "beauty-store-4f012",
  storageBucket: "beauty-store-4f012.firebasestorage.app",
  messagingSenderId: "1053116874470",
  appId: "1:1053116874470:web:32a41e8ce3e089d1920527"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// دالة تحديد نوع شبكة الاتصال
function getNetworkType(isMobileFromApi) {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (connection) {
        const type = connection.type;
        const effectiveType = connection.effectiveType;

        if (type === 'wifi') return "Wi-Fi 📶";
        if (type === 'cellular') return `بيانات هاتف (${effectiveType ? effectiveType.toUpperCase() : '4G/5G'}) 📱`;
        if (type === 'ethernet') return "كابل / Ethernet 💻";

        if (effectiveType) {
            if (effectiveType === '4g') return "بيانات هاتف / Wi-Fi (4G) 📶";
            if (effectiveType === '3g') return "شبكة الجيل الثالث (3G) 📱";
            if (effectiveType === '2g' || effectiveType === 'slow-2g') return "شبكة ضعيفة (2G) 📱";
        }
    }

    if (isMobileFromApi) {
        return "بيانات هاتف (Cellular) 📱";
    }

    return "شبكة إنترنت / Wi-Fi 📶";
}

// دالة تسجيل الزائر الرئيسية
async function logVisitor() {
    // لمنع إعادة التسجيل المتكرر في نفس الجلسة عند التحديث
    if (sessionStorage.getItem('visitor_logged')) {
        console.log("Visitor already logged in this session.");
        return;
    }

    try {
        // جلب البيانات عبر خدمة ipapi السريعة والآمنة
        const response = await fetch('https://ipapi.co/json/');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();

        const ip = data.ip || "Unknown IP";
        const country = data.country_name || "غير معروف";
        const region = data.region || "غير معروف";
        const city = data.city || "غير معروف";
        const zip = data.postal || "غير متوفر";
        let isp = data.org || data.asn || "غير معروف";

        // فحص الـ VPN / Proxy / Cloud Hosting
        const ispLower = isp.toLowerCase();
        const knownProxyISPs = [
            "scaleway", "digitalocean", "linode", "aws", "vultr", 
            "vpn", "proxy", "mullvad", "nordvpn", "expressvpn", 
            "tor", "cloudflare", "hosting", "datacenter"
        ];
        
        const isVpnDetected = knownProxyISPs.some(k => ispLower.includes(k));

        if (isVpnDetected) {
            isp = `${isp} (مُفعّل VPN/Proxy ⚠️)`;
        }

        // تحديد نوع الاتصال
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const networkType = getNetworkType(isMobile);

        // تجهيز بيانات الزائر بنفس التنسيق المتوافق مع اللوحة
        const visitorData = {
            ip: ip,
            country: country,
            region: region,
            city: city,
            zip: zip,
            isp: isp,
            network_type: networkType,
            timestamp: firebase.firestore.FieldValue.serverTimestamp() // حقل توقيت سيرفر الموحد
        };

        saveToFirestore(visitorData);

    } catch (error) {
        console.error("ERROR logging visitor via Primary API, trying fallback...", error);
        fallbackLogVisitor();
    }
}

// دالة احتياطية في حالة حظر أو فشل API الأول
async function fallbackLogVisitor() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        
        const visitorData = {
            ip: data.ip || "Unknown IP",
            country: "غير معروف",
            region: "غير معروف",
            city: "غير معروف",
            zip: "غير متوفر",
            isp: "غير معروف",
            network_type: getNetworkType(false),
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        saveToFirestore(visitorData);
    } catch (e) {
        console.error("Fallback logging failed:", e);
    }
}

function saveToFirestore(visitorData) {
    db.collection("visitors").add(visitorData)
        .then(() => {
            console.log("SUCCESS: Visitor logged successfully!");
            sessionStorage.setItem('visitor_logged', 'true');
        })
        .catch(err => console.error("Firestore error:", err));
}

// تنفيذ الدالة فور اكتمال تحميل الصفحة
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', logVisitor);
} else {
    logVisitor();
}
