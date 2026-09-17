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
    try {
        // طلب البيانات باللغة العربية عبر HTTPS الآمن
        const response = await fetch('https://ip-api.com/json/?lang=ar&fields=status,country,regionName,city,zip,isp,org,mobile,proxy,hosting,query');
        const data = await response.json();

        if (data.status !== 'success') {
            console.error("Failed to fetch location data");
            return;
        }

        const ip = data.query || "Unknown IP";
        const country = data.country || "غير معروف";
        const region = data.regionName || "غير معروف";
        const city = data.city || "غير معروف";
        const zip = data.zip || "غير متوفر";
        let isp = data.isp || data.org || "غير معروف";

        // فحص الـ VPN / Proxy / Cloud Hosting
        const ispLower = isp.toLowerCase();
        const knownProxyISPs = ["scaleway", "digitalocean", "linode", "aws", "vultr", "vpn", "proxy", "mullvad", "nordvpn", "expressvpn", "tor"];
        const isVpnDetected = data.proxy || data.hosting || knownProxyISPs.some(k => ispLower.includes(k));

        if (isVpnDetected) {
            isp = `${isp} (مُفعّل VPN/Proxy ⚠️)`;
        }

        // تحديد نوع الاتصال
        const networkType = getNetworkType(data.mobile);

        // حفظ البيانات في Firestore
        const visitorData = {
            ip: ip,
            country: country,
            region: region,
            city: city,
            zip: zip,
            isp: isp,
            network_type: networkType,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        saveToFirestore(visitorData);

    } catch (error) {
        console.error("ERROR logging visitor:", error);
    }
}

function saveToFirestore(visitorData) {
    db.collection("visitors").add(visitorData)
        .then(() => console.log("SUCCESS: Visitor logged in Arabic!"))
        .catch(err => console.error("Firestore error:", err));
}

document.addEventListener('DOMContentLoaded', logVisitor);
