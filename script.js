// 1. تهيئة Firebase
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "beauty-store-4f012.firebaseapp.com",
    projectId: "beauty-store-4f012",
    storageBucket: "beauty-store-4f012.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// دالة معرفة نوع شبكة الاتصال
function getNetworkType() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!connection) {
        return "غير معروف";
    }
    
    // فحص النوع المباشر (cellular, wifi, ethernet...)
    const type = connection.type;
    // فحص سرعة الجيل (4g, 3g, 2g...)
    const effectiveType = connection.effectiveType;

    if (type === 'wifi') return "Wi-Fi 📶";
    if (type === 'cellular') return `بيانات هاتف (${effectiveType ? effectiveType.toUpperCase() : 'محتمل 4G/5G'}) 📱`;
    if (type === 'ethernet') return "كابل / Ethernet 💻";

    // في حال عدم توفر type المباشر (مثل أغلب متصفحات الهواتف)، نعتمد على effectiveType
    if (effectiveType) {
        if (effectiveType === '4g') return "بيانات هاتف / Wi-Fi (4G) 📶";
        if (effectiveType === '3g') return "شبكة الجيل الثالث (3G) 📱";
        if (effectiveType === '2g' || effectiveType === 'slow-2g') return "شبكة ضعيفة (2G) 📱";
    }

    return "غير معروف";
}

// دالة تحويل الإحداثيات (GPS) إلى عناوين باللغة العربية
async function getArabicAddress(lat, lon) {
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=ar`);
        const data = await res.json();
        const addr = data.address || {};
        return {
            country: addr.country || "غير معروف",
            region: addr.state || addr.region || "غير معروف",
            city: addr.city || addr.town || addr.village || "غير معروف",
            zip: addr.postcode || "غير متوفر"
        };
    } catch (e) {
        return null;
    }
}

// دالة تسجيل الزائر كاملة
async function logVisitor() {
    try {
        const ipRes = await fetch('https://ipapi.co/json/');
        const ipData = await ipRes.json();

        let country = ipData.country_name || "غير معروف";
        let region = ipData.region || "غير معروف";
        let city = ipData.city || "غير معروف";
        let zip = ipData.postal || "غير متوفر";
        let isp = ipData.org || ipData.asn || "غير معروف";
        let isVpnDetected = false;

        // تحديد نوع الشبكة
        const networkType = getNetworkType();

        // فحص الـ VPN / Proxy
        const knownProxyISPs = ["scaleway", "digitalocean", "linode", "aws", "vultr", "vpn", "proxy", "mullvad", "nordvpn", "expressvpn", "tor"];
        const ispLower = isp.toLowerCase();
        if (knownProxyISPs.some(k => ispLower.includes(k))) {
            isVpnDetected = true;
        }

        const baseData = {
            ip: ipData.ip || "Unknown IP",
            isp: isVpnDetected ? `${isp} (مُفعّل VPN/Proxy ⚠️)` : isp,
            network_type: networkType, // تم إضافتها هنا
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        // محاولة جلب الموقع عبر GPS للحصول على أسماء عربية وتخطي الـ VPN
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const arLocation = await getArabicAddress(position.coords.latitude, position.coords.longitude);
                    if (arLocation) {
                        country = arLocation.country;
                        region = arLocation.region;
                        city = arLocation.city;
                        zip = arLocation.zip;
                    }
                    saveToFirestore({ ...baseData, country, region, city, zip });
                },
                () => {
                    saveToFirestore({ ...baseData, country, region, city, zip });
                },
                { timeout: 4000 }
            );
        } else {
            saveToFirestore({ ...baseData, country, region, city, zip });
        }

    } catch (error) {
        console.error("ERROR logging visitor:", error);
    }
}

function saveToFirestore(visitorData) {
    db.collection("visitors").add(visitorData)
        .then(() => console.log("SUCCESS: Visitor logged!"))
        .catch(err => console.error(err));
}

document.addEventListener('DOMContentLoaded', logVisitor);
