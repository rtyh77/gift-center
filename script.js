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

// قاموس ترجمة سريع للبلدان والمدن الشائعة
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

// 1. توليد بصمة فريدة للجهاز (Canvas & Device Fingerprinting)
// هذه البصمة ثابته للجهاز ولا تتغير حتى لو شغل الزائر VPN أو بدل الشبكة
function getDeviceFingerprint() {
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const txt = 'BrowserFingerprint_2026_v1';
        ctx.textBaseline = "top";
        ctx.font = "14px 'Arial'";
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = "#f60";
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = "#069";
        ctx.fillText(txt, 2, 15);
        ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
        ctx.fillText(txt, 4, 17);
        
        const b64 = canvas.toDataURL();
        let hash = 0;
        for (let i = 0; i < b64.length; i++) {
            const char = b64.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return "DEV-" + Math.abs(hash);
    } catch (e) {
        return "UNKNOWN-DEV";
    }
}

// 2. كشف تسريب WebRTC مع فحص العناوين المتقدم
function getRealIPWebRTC() {
    return new Promise((resolve) => {
        try {
            const rtc = new RTCPeerConnection({ 
                iceServers: [
                    { urls: "stun:stun.l.google.com:19302" },
                    { urls: "stun:stun1.l.google.com:19302" }
                ] 
            });
            rtc.createDataChannel("");
            
            rtc.onicecandidate = (event) => {
                if (!event.candidate) return;
                const ipMatch = /([0-9]{1,3}(\.[0-9]{1,3}){3})/.exec(event.candidate.candidate);
                if (ipMatch) {
                    const candidateIP = ipMatch[1];
                    // استبعاد عناوين الشبكة المحلية وتمرير الحقيقي فقط
                    if (!candidateIP.startsWith("192.168.") && !candidateIP.startsWith("10.") && !candidateIP.startsWith("172.")) {
                        resolve(candidateIP);
                        rtc.close();
                    }
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

// 3. تحديد نوع الاتصال وسرعة البيانات
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

// 4. نظام جلب البيانات المزدوج والمتقدم (Multi-Provider Fallback)
async function fetchGeoData() {
    // المزود الأول: ipWhois
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
                    timezone: d.timezone ? d.timezone.id : null,
                    isp: d.connection ? d.connection.isp || d.connection.org : "غير معروف",
                    is_vpn: d.security ? (d.security.vpn || d.security.proxy || d.security.tor || d.security.hosting) : false
                };
            }
        }
    } catch (e) { console.warn("Provider 1 failed, trying Provider 2..."); }

    // المزود الثاني: ipapi.co
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
                timezone: d.timezone || null,
                isp: d.org || d.asn || "غير معروف",
                is_vpn: false
            };
        }
    } catch (e) { console.warn("Provider 2 failed, trying Provider 3..."); }

    // المزود الثالث احتياطي
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        const d = await res.json();
        return {
            ip: d.ip,
            country: "غير معروف", region: "غير معروف", city: "غير معروف",
            zip: "غير متوفر", timezone: null, isp: "غير معروف", is_vpn: false
        };
    } catch (e) {
        return null;
    }
}

// 5. دالة التسجيل المتقدمة (تكتشف التزوير والـ VPN برمجياً)
async function logVisitor() {
    try {
        const [geoData, realIPWebRTC] = await Promise.all([
            fetchGeoData(),
            getRealIPWebRTC()
        ]);

        if (!geoData) throw new Error("All GeoIP services failed.");

        const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "غير معروف";
        const deviceLanguage = navigator.language || "غير معروف";
        const deviceFingerprint = getDeviceFingerprint();

        let isp = geoData.isp;
        const ispLower = isp.toLowerCase();
        
        // قائمة موسعة لمزودي الـ VPN والاستضافات
        const knownVPNs = [
            "scaleway", "digitalocean", "linode", "aws", "vultr", "vpn", "proxy", 
            "mullvad", "nordvpn", "expressvpn", "tor", "hosting", "google", "hetzner", "ovh"
        ];
        
        let isVpnDetected = geoData.is_vpn || knownVPNs.some(k => ispLower.includes(k));

        // كشف تزييف الـ VPN عن طريق مقارنة المنطقة الزمنية للـ IP والمنطقة الزمنية الحقيقية للجهاز
        let timezoneMismatch = false;
        if (geoData.timezone && deviceTimezone !== "غير معروف") {
            if (geoData.timezone !== deviceTimezone) {
                timezoneMismatch = true;
                isVpnDetected = true; // تعارض التوقيت هو دليل قطعي على استخدام VPN/Proxy
            }
        }

        // تنسيق نص المزود للتوضيح في لوحة التحكم
        if (isVpnDetected) {
            if (timezoneMismatch) {
                isp = `${isp} (VPN/Proxy كشف تعارض التوقيت ⚠️)`;
            } else if (!isp.includes("VPN")) {
                isp = `${isp} (مُفعّل VPN/Proxy ⚠️)`;
            }
        }

        const visitorData = {
            ip: geoData.ip,
            real_ip_webrtc: realIPWebRTC || "محمي / معزول",
            device_fingerprint: deviceFingerprint, // بصمة الجهاز لتتبعه حتى لو غيّر الـ VPN
            device_timezone: deviceTimezone,
            device_language: deviceLanguage,
            country: geoData.country,
            region: geoData.region,
            city: geoData.city,
            zip: geoData.zip,
            isp: isp,
            vpn_flag: isVpnDetected,
            network_type: detectDetailedNetwork(),
            screen_resolution: `${window.screen.width}x${window.screen.height}`,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        // التسجيل المباشر في قاعدة البيانات (تُنشئ وثيقة جديدة مع كل تحديث)
        await db.collection("visitors").add(visitorData);
        console.log("SUCCESS: Visitor log updated successfully with fingerprint!");

    } catch (error) {
        console.error("Critical logging error:", error);
    }
}

// تنفيذ الكود فور التحميل
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', logVisitor);
} else {
    logVisitor();
}
