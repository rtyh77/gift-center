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

// دالة كشف الـ IP الحقيقي المسرب عبر WebRTC لتجاوز الـ VPN
function getRealIPWebRTC() {
    return new Promise((resolve) => {
        try {
            const rtc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
            rtc.createDataChannel("");
            
            rtc.onicecandidate = (event) => {
                if (!event.candidate) return;
                const ipMatch = /([0-9]{1,3}(\.[0-9]{1,3}){3})/.exec(event.candidate.candidate);
                if (ipMatch) {
                    resolve(ipMatch[1]);
                    rtc.close();
                }
            };

            rtc.createOffer()
                .then(offer => rtc.setLocalDescription(offer))
                .catch(() => resolve(null));

            setTimeout(() => resolve(null), 1500);
        } catch (e) {
            resolve(null);
        }
    });
}

// دالة تحديد نوع شبكة الاتصال وتنسيقها بدقة
function detectDetailedNetwork() {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    let type = "unknown";
    let effectiveType = "4g";
    let downlink = 10;

    if (conn) {
        type = conn.type || "unknown";
        effectiveType = conn.effectiveType || "4g";
        downlink = conn.downlink || 10;
    }

    if (type === 'wifi' || (!isMobileDevice && type !== 'cellular')) {
        return `<span style="color: #00ff66; font-weight: bold;">Wi-Fi 📶</span>`;
    }

    let netGeneration = "4G";

    if (effectiveType === 'slow-2g' || effectiveType === '2g') {
        netGeneration = "2G";
    } else if (effectiveType === '3g') {
        netGeneration = "3G";
    } else if (effectiveType === '4g') {
        if (downlink >= 20) {
            netGeneration = "5G / 4G+";
        } else {
            netGeneration = "4G";
        }
    }

    return `<span style="color: #ffcc00; font-weight: bold;">بيانات هاتف (${netGeneration}) 📱</span>`;
}

// دالة تسجيل الزائر الرئيسية (مُعدلة لضمان العمل ببروتوكول HTTPS وبدون حجب المتصفحات)
async function logVisitor() {
    if (sessionStorage.getItem('visitor_logged')) {
        console.log("Visitor already logged in this session.");
        return;
    }

    try {
        const realIPWebRTC = await getRealIPWebRTC();

        // استخدام ipapi.co الآمنة عبر HTTPS
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

        const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "غير معروف";
        const deviceLanguage = navigator.language || "غير معروف";
        const networkType = detectDetailedNetwork();

        const visitorData = {
            ip: ip,
            real_ip_webrtc: realIPWebRTC || "غير مسرب / محمي",
            device_timezone: deviceTimezone,
            device_language: deviceLanguage,
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
        console.error("ERROR logging visitor, trying fallback...", error);
        fallbackLogVisitor();
    }
}

// دالة احتياطية في حال تعثر الخدمة الرئيسية
async function fallbackLogVisitor() {
    try {
        const realIPWebRTC = await getRealIPWebRTC();
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        
        const visitorData = {
            ip: data.ip || "Unknown IP",
            real_ip_webrtc: realIPWebRTC || "غير مسرب / محمي",
            device_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "غير معروف",
            device_language: navigator.language || "غير معروف",
            country: "غير معروف",
            region: "غير معروف",
            city: "غير معروف",
            zip: "غير متوفر",
            isp: "غير معروف",
            network_type: detectDetailedNetwork(),
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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', logVisitor);
} else {
    logVisitor();
}
