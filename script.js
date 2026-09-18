// ============================================================
// Visitor Analytics - script.js
// ============================================================

// 1. Firebase
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


// ============================================================
// 2. أدوات مساعدة
// ============================================================

function safeValue(value, fallback = "غير معروف") {
  return value !== undefined &&
         value !== null &&
         value !== ""
    ? value
    : fallback;
}


// ============================================================
// 3. معلومات الجهاز
// ============================================================

function getDeviceInfo() {
  const ua = navigator.userAgent || "";

  let deviceType = "Desktop";

  if (/tablet|ipad/i.test(ua)) {
    deviceType = "Tablet";
  } else if (/mobile|android|iphone|ipod/i.test(ua)) {
    deviceType = "Mobile";
  }

  let os = "غير معروف";

  if (/Android/i.test(ua)) {
    const match = ua.match(/Android\s([0-9.]+)/i);
    os = match ? `Android ${match[1]}` : "Android";
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    const match = ua.match(/OS\s([0-9_]+)/i);
    os = match ? `iOS ${match[1].replace(/_/g, ".")}` : "iOS";
  } else if (/Windows NT/i.test(ua)) {
    os = "Windows";
  } else if (/Mac OS X/i.test(ua)) {
    os = "macOS";
  } else if (/Linux/i.test(ua)) {
    os = "Linux";
  }

  let browser = "غير معروف";

  if (/Edg\//i.test(ua)) {
    browser = "Microsoft Edge";
  } else if (/OPR\//i.test(ua)) {
    browser = "Opera";
  } else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) {
    browser = "Google Chrome";
  } else if (/Firefox\//i.test(ua)) {
    browser = "Mozilla Firefox";
  } else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) {
    browser = "Safari";
  }

  return {
    device_type: deviceType,
    operating_system: os,
    browser: browser,
    user_agent: ua
  };
}


// ============================================================
// 4. معلومات الشاشة والمتصفح
// ============================================================

function getDisplayInfo() {
  return {
    screen_width: window.screen?.width || null,
    screen_height: window.screen?.height || null,

    screen_available_width:
      window.screen?.availWidth || null,

    screen_available_height:
      window.screen?.availHeight || null,

    viewport_width:
      window.innerWidth || null,

    viewport_height:
      window.innerHeight || null,

    pixel_ratio:
      window.devicePixelRatio || 1,

    color_depth:
      window.screen?.colorDepth || null,

    orientation:
      window.screen?.orientation?.type || "غير معروف"
  };
}


// ============================================================
// 5. معلومات اللغة والمنطقة الزمنية
// ============================================================

function getLocaleInfo() {
  let timezone = "غير معروف";

  try {
    timezone =
      Intl.DateTimeFormat()
        .resolvedOptions()
        .timeZone || "غير معروف";
  } catch (e) {}

  return {
    device_timezone: timezone,
    device_language: navigator.language || "غير معروف",

    languages:
      Array.isArray(navigator.languages)
        ? navigator.languages.join(", ")
        : safeValue(navigator.language)
  };
}


// ============================================================
// 6. معلومات الاتصال
// ============================================================

function getNetworkInfo() {
  const connection =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection;

  if (!connection) {
    return {
      network_type: "غير متاح",
      effective_type: "غير متاح",
      downlink_mbps: null,
      rtt_ms: null,
      save_data: null
    };
  }

  return {
    network_type: safeValue(connection.type, "غير معروف"),
    effective_type: safeValue(
      connection.effectiveType,
      "غير معروف"
    ),

    downlink_mbps:
      typeof connection.downlink === "number"
        ? connection.downlink
        : null,

    rtt_ms:
      typeof connection.rtt === "number"
        ? connection.rtt
        : null,

    save_data:
      typeof connection.saveData === "boolean"
        ? connection.saveData
        : null
  };
}


// ============================================================
// 7. خصائص الجهاز المتاحة
// ============================================================

function getHardwareInfo() {
  return {
    hardware_concurrency:
      navigator.hardwareConcurrency || null,

    device_memory_gb:
      navigator.deviceMemory || null,

    max_touch_points:
      navigator.maxTouchPoints || 0,

    cookie_enabled:
      navigator.cookieEnabled ?? null,

    do_not_track:
      navigator.doNotTrack || null,

    online:
      navigator.onLine ?? null
  };
}


// ============================================================
// 8. معلومات الصفحة
// ============================================================

function getPageInfo() {
  return {
    page_url: window.location.href,

    page_path:
      window.location.pathname || "/",

    page_title:
      document.title || "بدون عنوان",

    referrer:
      document.referrer || "مباشرة / غير معروف"
  };
}


// ============================================================
// 9. معرف جلسة محلي
// ============================================================

function getSessionId() {
  let sessionId =
    sessionStorage.getItem("visitor_session_id");

  if (!sessionId) {
    if (crypto?.randomUUID) {
      sessionId = crypto.randomUUID();
    } else {
      sessionId =
        Date.now().toString(36) +
        Math.random().toString(36).substring(2);
    }

    sessionStorage.setItem(
      "visitor_session_id",
      sessionId
    );
  }

  return sessionId;
}


// ============================================================
// 10. IP + GeoIP
// ============================================================

async function getIPInformation() {
  const response =
    await fetch("https://ipapi.co/json/", {
      method: "GET",
      cache: "no-store"
    });

  if (!response.ok) {
    throw new Error(
      `ipapi.co HTTP ${response.status}`
    );
  }

  const data = await response.json();

  return {
    ip: safeValue(data.ip, "غير معروف"),

    country:
      safeValue(data.country_name, "غير معروف"),

    country_code:
      safeValue(data.country_code, "غير معروف"),

    region:
      safeValue(data.region, "غير معروف"),

    city:
      safeValue(data.city, "غير معروف"),

    postal:
      safeValue(data.postal, "غير متوفر"),

    latitude:
      data.latitude ?? null,

    longitude:
      data.longitude ?? null,

    timezone:
      safeValue(data.timezone, "غير معروف"),

    utc_offset:
      safeValue(data.utc_offset, "غير معروف"),

    asn:
      safeValue(data.asn, "غير معروف"),

    organization:
      safeValue(data.org, "غير معروف"),

    currency:
      safeValue(data.currency, "غير معروف"),

    continent_code:
      safeValue(data.continent_code, "غير معروف")
  };
}


// ============================================================
// 11. مؤشر بسيط على VPN / Proxy / Datacenter
// ============================================================

function analyzeNetworkProvider(ipData) {
  const organization =
    String(ipData.organization || "").toLowerCase();

  const asn =
    String(ipData.asn || "").toLowerCase();

  const text =
    `${organization} ${asn}`;

  const indicators = [
    "vpn",
    "proxy",
    "hosting",
    "datacenter",
    "data center",
    "digitalocean",
    "amazon",
    "aws",
    "google cloud",
    "microsoft azure",
    "azure",
    "linode",
    "vultr",
    "scaleway",
    "mullvad",
    "nordvpn",
    "expressvpn",
    "cloudflare",
    "tor"
  ];

  const matches =
    indicators.filter(
      keyword => text.includes(keyword)
    );

  return {
    vpn_proxy_indicator:
      matches.length > 0
        ? "مؤشر محتمل"
        : "غير مكتشف",

    vpn_proxy_matches:
      matches.length > 0
        ? matches.join(", ")
        : "لا يوجد",

    provider:
      safeValue(ipData.organization, "غير معروف")
  };
}


// ============================================================
// 12. تسجيل الزائر
// ============================================================

async function logVisitor() {

  // منع تسجيل نفس الجلسة عدة مرات
  if (
    sessionStorage.getItem(
      "visitor_logged"
    )
  ) {
    console.log(
      "Visitor already logged in this session."
    );
    return;
  }

  try {

    // الحصول على بيانات IP
    const ipData =
      await getIPInformation();

    // معلومات الجهاز
    const deviceInfo =
      getDeviceInfo();

    // الشاشة
    const displayInfo =
      getDisplayInfo();

    // اللغة والمنطقة الزمنية
    const localeInfo =
      getLocaleInfo();

    // الشبكة
    const networkInfo =
      getNetworkInfo();

    // خصائص الجهاز
    const hardwareInfo =
      getHardwareInfo();

    // الصفحة
    const pageInfo =
      getPageInfo();

    // تحليل مزود الشبكة
    const networkAnalysis =
      analyzeNetworkProvider(ipData);

    // معرف الجلسة
    const sessionId =
      getSessionId();


    // ========================================================
    // البيانات النهائية
    // ========================================================

    const visitorData = {

      // ---------------- IP / GeoIP ----------------

      ip:
        ipData.ip,

      country:
        ipData.country,

      country_code:
        ipData.country_code,

      region:
        ipData.region,

      city:
        ipData.city,

      postal:
        ipData.postal,

      geo_latitude:
        ipData.latitude,

      geo_longitude:
        ipData.longitude,

      geo_timezone:
        ipData.timezone,

      utc_offset:
        ipData.utc_offset,

      asn:
        ipData.asn,

      organization:
        ipData.organization,

      continent:
        ipData.continent_code,


      // ---------------- VPN ----------------

      vpn_proxy_indicator:
        networkAnalysis.vpn_proxy_indicator,

      vpn_proxy_matches:
        networkAnalysis.vpn_proxy_matches,


      // ---------------- Device ----------------

      device_type:
        deviceInfo.device_type,

      operating_system:
        deviceInfo.operating_system,

      browser:
        deviceInfo.browser,

      user_agent:
        deviceInfo.user_agent,


      // ---------------- Locale ----------------

      device_timezone:
        localeInfo.device_timezone,

      device_language:
        localeInfo.device_language,

      languages:
        localeInfo.languages,


      // ---------------- Network ----------------

      network_type:
        networkInfo.network_type,

      effective_network_type:
        networkInfo.effective_type,

      downlink_mbps:
        networkInfo.downlink_mbps,

      rtt_ms:
        networkInfo.rtt_ms,

      save_data:
        networkInfo.save_data,


      // ---------------- Display ----------------

      screen_width:
        displayInfo.screen_width,

      screen_height:
        displayInfo.screen_height,

      screen_available_width:
        displayInfo.screen_available_width,

      screen_available_height:
        displayInfo.screen_available_height,

      viewport_width:
        displayInfo.viewport_width,

      viewport_height:
        displayInfo.viewport_height,

      pixel_ratio:
        displayInfo.pixel_ratio,

      color_depth:
        displayInfo.color_depth,

      orientation:
        displayInfo.orientation,


      // ---------------- Hardware ----------------

      hardware_concurrency:
        hardwareInfo.hardware_concurrency,

      device_memory_gb:
        hardwareInfo.device_memory_gb,

      max_touch_points:
        hardwareInfo.max_touch_points,

      cookie_enabled:
        hardwareInfo.cookie_enabled,

      do_not_track:
        hardwareInfo.do_not_track,

      online:
        hardwareInfo.online,


      // ---------------- Page ----------------

      page_url:
        pageInfo.page_url,

      page_path:
        pageInfo.page_path,

      page_title:
        pageInfo.page_title,

      referrer:
        pageInfo.referrer,


      // ---------------- Session ----------------

      session_id:
        sessionId,

      timestamp:
        firebase.firestore.FieldValue.serverTimestamp()
    };


    // حفظ البيانات
    await saveToFirestore(
      visitorData
    );

    console.log(
      "SUCCESS: Visitor logged successfully!",
      visitorData
    );

  } catch (error) {

    console.error(
      "Visitor logging failed:",
      error
    );

    // محاولة احتياطية
    await fallbackLogVisitor();
  }
}


// ============================================================
// 13. Fallback
// ============================================================

async function fallbackLogVisitor() {

  try {

    const response =
      await fetch(
        "https://api.ipify.org?format=json",
        {
          method: "GET",
          cache: "no-store"
        }
      );

    const data =
      await response.json();


    const visitorData = {

      ip:
        safeValue(
          data.ip,
          "غير معروف"
        ),

      country:
        "غير معروف",

      country_code:
        "غير معروف",

      region:
        "غير معروف",

      city:
        "غير معروف",

      postal:
        "غير متوفر",

      device_timezone:
        getLocaleInfo().device_timezone,

      device_language:
        navigator.language ||
        "غير معروف",

      network_type:
        getNetworkInfo().network_type,

      device_type:
        getDeviceInfo().device_type,

      operating_system:
        getDeviceInfo().operating_system,

      browser:
        getDeviceInfo().browser,

      page_url:
        window.location.href,

      referrer:
        document.referrer ||
        "مباشرة / غير معروف",

      session_id:
        getSessionId(),

      timestamp:
        firebase.firestore.FieldValue.serverTimestamp()
    };


    await saveToFirestore(
      visitorData
    );

  } catch (error) {

    console.error(
      "Fallback logging failed:",
      error
    );
  }
}


// ============================================================
// 14. Firebase
// ============================================================

async function saveToFirestore(
  visitorData
) {

  await db
    .collection("visitors")
    .add(visitorData);

  sessionStorage.setItem(
    "visitor_logged",
    "true"
  );
}


// ============================================================
// 15. بدء التسجيل
// ============================================================

if (
  document.readyState === "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    logVisitor
  );

} else {

  logVisitor();

    }
