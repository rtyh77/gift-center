(function() {
    // ==========================================
    // 1. إعدادات وتكوين Firebase
    // ==========================================
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

    // 🛡️ دالة تعقيم ونظافة البيانات أمنياً
    function sanitizeInput(str) {
        if (typeof str !== 'string') return str;
        return str.replace(/[<>'"&]/g, '').trim();
    }

    // ==========================================
    // 2. وظائف جمع البصمة الرقمية للجهاز (Client-Side)
    // ==========================================

    // أ. كشف AdBlocker
    async function checkAdBlocker() {
        try {
            const googleAds = new Request('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', { method: 'HEAD', mode: 'no-cors' });
            await fetch(googleAds);
            return false;
        } catch (e) {
            return true;
        }
    }

    // ب. كشف البطارية
    async function getBatteryInfo() {
        if ('getBattery' in navigator) {
            try {
                const battery = await navigator.getBattery();
                return {
                    level: Math.round(battery.level * 100) + '%',
                    charging: battery.charging ? 'متصل بالشاحن ⚡' : 'غير متصل 🔋'
                };
            } catch (e) {
                return { level: 'غير معروف', charging: 'غير معروف' };
            }
        }
        return { level: 'غير مدعوم', charging: 'غير مدعوم' };
    }

    // ج. كشف موديل ونوع الجهاز تلقائياً
    async function getDeviceModel() {
        const ua = navigator.userAgent;
        let detectedBrand = "";
        let rawModel = "";

        if (navigator.userAgentData) {
            if (navigator.userAgentData.brands) {
                const brandList = navigator.userAgentData.brands.map(b => b.brand);
                const knownBrands = ['Xiaomi', 'Redmi', 'POCO', 'Samsung', 'OPPO', 'Vivo', 'Realme', 'OnePlus', 'Google', 'Huawei', 'Honor'];
                const foundBrand = knownBrands.find(b => brandList.some(brand => brand.toLowerCase().includes(b.toLowerCase())));
                if (foundBrand) detectedBrand = foundBrand;
            }

            if (navigator.userAgentData.getHighEntropyValues) {
                try {
                    const uaData = await navigator.userAgentData.getHighEntropyValues(["model"]);
                    if (uaData.model && uaData.model.trim() !== "") {
                        rawModel = uaData.model.trim();
                    }
                } catch (e) {}
            }
        }

        if (!rawModel || rawModel === "Android Device") {
            const match = ua.match(/\(([^;]+);[^\)]*Build\/([^\);]+)/i) || ua.match(/Android[^;]+; ([^;\)]+)/i);
            if (match && match[1]) {
                rawModel = match[1].replace(/Linux;/i, '').trim();
            }
        }

        if (!detectedBrand) {
            if (/Xiaomi|Redmi|POCO/i.test(ua) || /2409|2201|2302|2312/i.test(rawModel)) {
                detectedBrand = "Xiaomi / Redmi";
            } else if (/Samsung|SM-/i.test(ua) || /^SM-/i.test(rawModel)) {
                detectedBrand = "Samsung";
            } else if (/Huawei|HONOR/i.test(ua)) {
                detectedBrand = "Huawei/Honor";
            } else if (/OPPO/i.test(ua)) {
                detectedBrand = "OPPO";
            } else if (/Realme/i.test(ua)) {
                detectedBrand = "Realme";
            } else if (/Vivo/i.test(ua)) {
                detectedBrand = "Vivo";
            } else if (/Pixel/i.test(ua)) {
                detectedBrand = "Google Pixel";
            } else {
                detectedBrand = "Android Device";
            }
        }

        let finalDeviceName = rawModel || "Android Device";
        if (detectedBrand && !rawModel.toLowerCase().includes(detectedBrand.toLowerCase())) {
            finalDeviceName = `${detectedBrand} (${rawModel})`;
        }

        if (/android/i.test(ua)) {
            return { type: 'هاتف ذكي (Android)', detail: finalDeviceName };
        } else if (/iPhone|iPad|iPod/i.test(ua)) {
            return { type: 'هاتف/آيباد (iOS)', detail: 'Apple Device' };
        } else if (/Windows/i.test(ua)) {
            return { type: 'كمبيوتر (Windows)', detail: 'PC / Laptop' };
        } else if (/Macintosh/i.test(ua)) {
            return { type: 'كمبيوتر (Mac)', detail: 'MacBook / Mac' };
        } else if (/Linux/i.test(ua)) {
            return { type: 'نظام (Linux)', detail: 'Linux PC' };
        }
        return { type: 'جهاز غير معروف', detail: 'Unknown' };
    }

    // د. جلب الـ IP والموقع الجغرافي المتقدم مع دمج استعلامات الخادم الطرفي (Edge/Vercel Data)
    async function getIPData() {
        try {
            const ipRes = await fetch('https://ipwho.is/');
            if (!ipRes.ok) throw new Error("Primary API Failed");
            const data = await ipRes.json();
            
            if (!data.success) throw new Error("API Limit");

            return {
                ip: data.ip,
                country_name: data.country || 'غير معروف',
                region: data.region || 'غير معروف',
                city: data.city || 'غير معروف',
                postal: data.postal || 'غير متوفر',
                latitude: data.latitude || null,
                longitude: data.longitude || null,
                org: data.connection ? data.connection.isp : 'غير معروف',
                network: data.connection ? data.connection.org : 'غير معروف'
            };
        } catch (err) {
            try {
                const fallbackRes = await fetch('https://freeipapi.com/api/json');
                const fallbackData = await fallbackRes.json();
                return {
                    ip: fallbackData.ipAddress,
                    country_name: fallbackData.countryName || 'غير معروف',
                    region: fallbackData.regionName || 'غير معروف',
                    city: fallbackData.cityName || 'غير معروف',
                    postal: fallbackData.zipCode || 'غير متوفر',
                    latitude: fallbackData.latitude || null,
                    longitude: fallbackData.longitude || null,
                    org: 'غير معروف',
                    network: 'غير معروف'
                };
            } catch (e) {
                return { ip: 'Unknown IP', country_name: 'غير معروف' };
            }
        }
    }

    // ==========================================
    // 3. الاتصال بالخادم المعزول Vercel Serverless
    // ==========================================
    async function verifyWithVercelServer() {
        try {
            const response = await fetch("https://vercel-backend-beryl-chi.vercel.app/api/check", {
                method: "POST",
                headers: { "Content-Type": "application/json" }
            });
            if (!response.ok) return { suspicious: false, is_vpn: false, risk_score: "LOW" };
            return await response.json();
        } catch (error) {
            console.error("Vercel Security Error:", error);
            return { suspicious: false, is_vpn: false, risk_score: "LOW" };
        }
    }

    // ==========================================
    // 4. جمع البيانات وإرسالها لـ Firebase + تطبيق الحظر
    // ==========================================
    async function collectVisitorIntelligence() {
        try {
            // تشغيل جميع مهام الفحص بالتوازي لضمان أقصى سرعة أداء
            const [ipData, vercelSecurity, hasAdBlock, batteryInfo, deviceMeta] = await Promise.all([
                getIPData(),
                verifyWithVercelServer(),
                checkAdBlocker(),
                getBatteryInfo(),
                getDeviceModel()
            ]);

            // بناء هيكل البيانات المطور والجاهز للتخزين
            const visitorPayload = {
                ip: sanitizeInput(ipData.ip || 'Unknown IP'),
                country: sanitizeInput(ipData.country_name || 'غير معروف'),
                region: sanitizeInput(ipData.region || 'غير معروف'),
                city: sanitizeInput(ipData.city || 'غير معروف'),
                zip: sanitizeInput(ipData.postal || 'غير متوفر'),
                latitude: ipData.latitude || null,
                longitude: ipData.longitude || null,
                isp: sanitizeInput(ipData.org || 'غير معروف'),
                network_type: sanitizeInput(ipData.network || 'غير معروف'),
                device_timezone: sanitizeInput(Intl.DateTimeFormat().resolvedOptions().timeZone || 'غير معروف'),
                device_language: sanitizeInput(navigator.language || 'غير معروف'),
                device_type: sanitizeInput(deviceMeta.type),
                device_model: sanitizeInput(deviceMeta.detail),
                screen_resolution: `${window.screen.width}x${window.screen.height}`,
                cpu_cores: navigator.hardwareConcurrency || 'غير معروف',
                ram_gb: navigator.deviceMemory ? `${navigator.deviceMemory} GB` : 'غير معروف',
                battery_level: sanitizeInput(batteryInfo.level),
                battery_charging: sanitizeInput(batteryInfo.charging),
                adblock_active: hasAdBlock ? 'مفعل 🛡️' : 'غير مفعل ❌',
                
                // نتائج تقييم الخادم الطرفي المعزول
                is_vpn: vercelSecurity.is_vpn || false,
                risk_score: vercelSecurity.risk_score || 'LOW',
                user_agent: sanitizeInput(navigator.userAgent),
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };

            // إرسال البيانات فوراً إلى مجموعة visitors في قاعدة بيانات Firestore
            await db.collection("visitors").add(visitorPayload);

            // اتخاذ القرار الأمني بناءً على معايير خادم Vercel
            if (vercelSecurity.suspicious) {
                document.body.innerHTML = "<h1 style='color:red; text-align:center; margin-top:20%;'>⚠️ Access Denied / تم رفض الوصول</h1>";
            }

        } catch (err) {
            console.error("Error logging visitor data: ", err);
        }
    }

    // تشغيل الفحص التلقائي بمجرد اكتمال تحميل هيكل المستند
    window.addEventListener('DOMContentLoaded', collectVisitorIntelligence);
})();
