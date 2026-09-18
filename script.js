// 1. تهيئة Firebase
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

// قاموس ترجمة سريع وأساسي للبلدان والمدن الشائعة
const translationMap = {
    "Algeria": "الجزائر", "Egypt": "مصر", "Saudi Arabia": "المملكة العربية السعودية",
    "Morocco": "المغرب", "Tunisia": "تونس", "United Arab Emirates": "الإمارات",
    "France": "فرنسا", "Germany": "ألمانيا", "Netherlands": "هولندا", "United States": "الولايات المتحدة",
    "Algiers": "الجزائر العاصمة", "Oran": "وهران", "Constantine": "قسنطينة",
    "Annaba": "عنابة", "Blida": "البليدة", "Setif": "سطيف", "Batna": "باتنة",
    "Djelfa": "الجلفة", "Sidi Bel Abbes": "سيدي بلعباس", "Biskra": "بسكرة",
    "Tebessa": "تبسة", "El Oued": "الوادي", "Skikda": "سكيكدة", "Tiaret": "تيارت",
    "Bejaia": "بجاية", "Tlemcen": "تلمسان", "Ouargla": "ورقلة", "Mostaganem": "مستغانم",
    "Bordj Bou Arreridj": "برج بوعريريج", "Chlef": "الشلف", "Souk Ahras": "سوق أهراس",
    "Medea": "المدية", "El Tarf": "الطارف", "Bechar": "بشار", "Relizane": "غليزان"
};

function translateText(text) {
    if (!text) return "غير معروف";
    return translationMap[text] || text;
}

// دالة متقدمة لكشف تسريب WebRTC (مع تصفية العناوين المحلية 192.168 / 10.x)
function getRealIPWebRTC() {
    return new Promise((resolve) => {
        try {
            const rtc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
            rtc.createDataChannel("");
            
            rtc.onicecandidate = (event) => {
                if (!event.candidate) return;
                const ipMatch = /([0-9]{1,3}(\.[0-9]{1,3}){3})/.exec(event.candidate.candidate);
                if (ipMatch) {
                    const candidateIP = ipMatch[1];
                    // استبعاد العناوين المحلية (Local IPs) لضمان جلب العام فقط
                    if (!candidateIP.startsWith("192.168.") && !candidateIP.startsWith("10.") && !candidateIP.startsWith("172.")) {
                        resolve(candidateIP);
                        rtc.close();
                    }
                }
            };

            rtc.createOffer()
                .then(offer => rtc.setLocalDescription(offer))
                .catch(() => resolve(null));

            setTimeout(() => resolve(null), 1200);
        } catch (e) {
            resolve(null);
        }
    });
}

// تحديد نوع الاتصال بدقة
function detectDetailedNetwork() {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    let type = conn ? conn.type : "unknown";
    let effectiveType = conn ? conn.effectiveType : "4g";
    let downlink = conn ? conn.downlink : 10;

    if (type === 'wifi' || (!isMobile && type !== 'cellular')) {
        return `<span style="color: #00ff66; font-weight: bold;">Wi-Fi 📶</span>`;
    }

    let netGen = "4G";
    if (effectiveType === 'slow-2g' || effectiveType === '2g') netGen = "2G";
    else if (effectiveType === '3g') netGen = "3G";
    else if (effectiveType === '4g') netGen = downlink >= 20 ? "5G / 4G+" : "4G";

    return `<span style="color: #ffcc00; font-weight: bold;">بيانات هاتف (${netGen}) 📱</span>`;
}

// نظام جلب البيانات المترابط (Multi-Provider Fallback)
async function fetchGeoData() {
    // المزود الأول: ipWhois (دعم ممتازة للـ HTTPS واللغة العربية)
    try {
        const res = await fetch('https://ipwho.is/?lang=ar');
        if (res.ok) {
            const d = await res.json();
            if (d.success) {
                return {
                    ip: d.ip,
                    country: d.country || "غير معروف",
                    region: d.region || "غير معروف",
                    city: d.city || "غير معروف",
                    zip: d.postal || "غير متوفر",
                    isp: d.connection ? d.connection.isp || d.connection.org : "غير معروف",
                    is_vpn: d.security ? (d.security.vpn || d.security.proxy || d.security.tor) : false
                };
            }
        }
    } catch (e) { console.warn("Provider 1 failed, switching to Provider 2..."); }

    // المزود الثاني: ipapi.co (خدمة موثوقة عالمياً)
    try {
        const res = await fetch('https://ipapi.co/json/');
        if (res.ok) {
            const d = await res.json();
            return {
                ip: d.ip,
                country: translateText(d.country_name),
                region: translateText(d.region),
                city: translateText(d.city),
                zip: d.postal || "غير متوفر",
                isp: d.org || d.asn || "غير معروف",
                is_vpn: false
            };
        }
    } catch (e) { console.warn("Provider 2 failed, switching to Provider 3..."); }

    // المزود الثالث: ipify + myip احتياطي للطوارئ
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        const d = await res.json();
        return {
            ip: d.ip,
            country: "غير معروف", region: "غير معروف", city: "غير معروف",
            zip: "غير متوفر", isp: "غير معروف", is_vpn: false
        };
    } catch (e) {
        return null;
    }
}

// دالة تسجيل الزائر الرئيسية
async function logVisitor() {
    if (sessionStorage.getItem('visitor_logged')) {
        console.log("Visitor already logged.");
        return;
    }

    try {
        const [geoData, realIPWebRTC] = await Promise.all([
            fetchGeoData(),
            getRealIPWebRTC()
        ]);

        if (!geoData) throw new Error("All GeoIP services failed.");

        let isp = geoData.isp;
        const ispLower = isp.toLowerCase();
        const knownVPNs = ["scaleway", "digitalocean", "linode", "aws", "vultr", "vpn", "proxy", "mullvad", "nordvpn", "expressvpn", "tor", "hosting"];
        
        const vpnFlag = geoData.is_vpn || knownVPNs.some(k => ispLower.includes(k));

        if (vpnFlag && !isp.includes("VPN")) {
            isp = `${isp} (مُفعّل VPN/Proxy ⚠️)`;
        }

        const visitorData = {
            ip: geoData.ip,
            real_ip_webrtc: realIPWebRTC || "غير مسرب / محمي",
            device_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "غير معروف",
            device_language: navigator.language || "غير معروف",
            country: geoData.country,
            region: geoData.region,
            city: geoData.city,
            zip: geoData.zip,
            isp: isp,
            network_type: detectDetailedNetwork(),
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        db.collection("visitors").add(visitorData)
            .then(() => {
                console.log("SUCCESS: Visitor logged!");
                sessionStorage.setItem('visitor_logged', 'true');
            })
            .catch(err => console.error("Firestore error:", err));

    } catch (error) {
        console.error("Critical logging error:", error);
    }
}

// التشغيل الفوري
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', logVisitor);
} else {
    logVisitor();
}
