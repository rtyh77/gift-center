// ============================================================
// Visitor Analytics PRO - script.js
// ============================================================
// الإصدار المطور
// - Multi-source IP / GeoIP
// - Browser / Device intelligence
// - Network measurements
// - VPN / Proxy / Hosting indicators
// - Cloudflare Worker ready
// ============================================================


// ============================================================
// 1. Firebase
// ============================================================

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
// 2. إعدادات النظام
// ============================================================

// اتركه فارغًا الآن.
// في المرحلة القادمة سنضع هنا رابط Cloudflare Worker.
// مثال:
// const NETWORK_WORKER_URL = "https://your-worker.workers.dev";
//
const NETWORK_WORKER_URL = "";


// ============================================================
// 3. أدوات مساعدة
// ============================================================

function safeValue(value, fallback = "غير معروف") {
  return (
    value !== undefined &&
    value !== null &&
    value !== ""
  )
    ? value
    : fallback;
}


function cleanString(value) {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  return String(value).trim();
}


function isValidIP(ip) {
  if (!ip) return false;

  const value = String(ip).trim();

  // IPv4
  const ipv4 =
    /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

  // IPv6
  const ipv6 =
    /^[0-9a-fA-F:]{2,45}$/;

  return ipv4.test(value) || ipv6.test(value);
}


function normalizeBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (
    value === "true" ||
    value === "1" ||
    value === 1
  ) {
    return true;
  }

  if (
    value === "false" ||
    value === "0" ||
    value === 0
  ) {
    return false;
  }

  return null;
}


// ============================================================
// 4. معلومات الجهاز والمتصفح
// ============================================================

function getDeviceInfo() {

  const ua =
    navigator.userAgent || "";

  let deviceType = "Desktop";

  if (
    /tablet|ipad|playbook|silk/i.test(ua)
  ) {
    deviceType = "Tablet";

  } else if (
    /mobile|android|iphone|ipod|windows phone/i.test(ua)
  ) {
    deviceType = "Mobile";
  }


  let os = "غير معروف";
  let osVersion = "";


  // Android
  if (/Android/i.test(ua)) {

    const match =
      ua.match(/Android\s([0-9.]+)/i);

    os = "Android";

    if (match) {
      osVersion = match[1];
    }

  }

  // iOS
  else if (/iPhone|iPad|iPod/i.test(ua)) {

    const match =
      ua.match(/OS\s([0-9_]+)/i);

    os = "iOS";

    if (match) {
      osVersion =
        match[1].replace(/_/g, ".");
    }

  }

  // Windows
  else if (/Windows NT/i.test(ua)) {

    os = "Windows";

    const match =
      ua.match(/Windows NT\s([0-9.]+)/i);

    if (match) {
      const versions = {
        "10.0": "10/11",
        "6.4": "10",
        "6.3": "8.1",
        "6.2": "8",
        "6.1": "7"
      };

      osVersion =
        versions[match[1]] ||
        match[1];
    }

  }

  // macOS
  else if (/Mac OS X/i.test(ua)) {

    os = "macOS";

    const match =
      ua.match(/Mac OS X\s?([0-9_\.]+)/i);

    if (match) {
      osVersion =
        match[1].replace(/_/g, ".");
    }

  }

  // Linux
  else if (/Linux/i.test(ua)) {
    os = "Linux";
  }


  let browser = "غير معروف";
  let browserVersion = "";


  if (/Edg\//i.test(ua)) {

    browser = "Microsoft Edge";

    const match =
      ua.match(/Edg\/([0-9.]+)/i);

    if (match) {
      browserVersion = match[1];
    }

  }

  else if (/OPR\//i.test(ua)) {

    browser = "Opera";

    const match =
      ua.match(/OPR\/([0-9.]+)/i);

    if (match) {
      browserVersion = match[1];
    }

  }

  else if (
    /Chrome\//i.test(ua) &&
    !/Edg\//i.test(ua) &&
    !/OPR\//i.test(ua)
  ) {

    browser = "Google Chrome";

    const match =
      ua.match(/Chrome\/([0-9.]+)/i);

    if (match) {
      browserVersion = match[1];
    }

  }

  else if (/Firefox\//i.test(ua)) {

    browser = "Mozilla Firefox";

    const match =
      ua.match(/Firefox\/([0-9.]+)/i);

    if (match) {
      browserVersion = match[1];
    }

  }

  else if (
    /Safari\//i.test(ua) &&
    !/Chrome\//i.test(ua)
  ) {

    browser = "Safari";

    const match =
      ua.match(/Version\/([0-9.]+)/i);

    if (match) {
      browserVersion = match[1];
    }
  }


  return {
    device_type: deviceType,

    operating_system:
      osVersion
        ? `${os} ${osVersion}`
        : os,

    operating_system_name:
      os,

    operating_system_version:
      osVersion || "غير متوفر",

    browser: browser,

    browser_version:
      browserVersion || "غير متوفر",

    user_agent:
      ua,

    platform:
      safeValue(
        navigator.platform,
        "غير متوفر"
      ),

    vendor:
      safeValue(
        navigator.vendor,
        "غير متوفر"
      )
  };
}


// ============================================================
// 5. User-Agent Client Hints
// ============================================================

async function getUserAgentData() {

  try {

    if (
      !navigator.userAgentData
    ) {
      return {
        available: false
      };
    }


    const uaData =
      navigator.userAgentData;


    let highEntropy = {};

    if (
      typeof uaData.getHighEntropyValues ===
      "function"
    ) {

      try {

        highEntropy =
          await uaData.getHighEntropyValues([
            "architecture",
            "bitness",
            "model",
            "platform",
            "platformVersion",
            "uaFullVersion",
            "fullVersionList",
            "formFactors"
          ]);

      } catch (e) {
        console.warn(
          "Client Hints unavailable:",
          e
        );
      }
    }


    return {

      available: true,

      mobile:
        uaData.mobile ?? null,

      platform:
        safeValue(
          highEntropy.platform ||
          uaData.platform,
          "غير متوفر"
        ),

      platform_version:
        safeValue(
          highEntropy.platformVersion,
          "غير متوفر"
        ),

      architecture:
        safeValue(
          highEntropy.architecture,
          "غير متوفر"
        ),

      bitness:
        safeValue(
          highEntropy.bitness,
          "غير متوفر"
        ),

      model:
        safeValue(
          highEntropy.model,
          "غير متوفر"
        ),

      brands:
        Array.isArray(uaData.brands)
          ? uaData.brands
              .map(
                item =>
                  `${item.brand} ${item.version}`
              )
              .join(" | ")
          : "غير متوفر",

      full_version_list:
        Array.isArray(
          highEntropy.fullVersionList
        )
          ? highEntropy.fullVersionList
              .map(
                item =>
                  `${item.brand} ${item.version}`
              )
              .join(" | ")
          : "غير متوفر",

      form_factors:
        Array.isArray(
          highEntropy.formFactors
        )
          ? highEntropy.formFactors.join(", ")
          : "غير متوفر"
    };

  } catch (error) {

    return {
      available: false
    };
  }
}


// ============================================================
// 6. الشاشة والمتصفح
// ============================================================

function getDisplayInfo() {

  const screenObject =
    window.screen || {};


  return {

    screen_width:
      screenObject.width || null,

    screen_height:
      screenObject.height || null,

    screen_available_width:
      screenObject.availWidth || null,

    screen_available_height:
      screenObject.availHeight || null,

    viewport_width:
      window.innerWidth || null,

    viewport_height:
      window.innerHeight || null,

    pixel_ratio:
      window.devicePixelRatio || null,

    color_depth:
      screenObject.colorDepth || null,

    pixel_depth:
      screenObject.pixelDepth || null,

    orientation:
      screenObject.orientation?.type ||
      "غير متوفر",

    orientation_angle:
      screenObject.orientation?.angle ??
      null
  };
}


// ============================================================
// 7. اللغة والمنطقة الزمنية
// ============================================================

function getLocaleInfo() {

  let timezone =
    "غير معروف";

  let timezoneOffset =
    null;


  try {

    timezone =
      Intl.DateTimeFormat()
        .resolvedOptions()
        .timeZone ||
      "غير معروف";

  } catch (e) {}


  try {

    timezoneOffset =
      new Date().getTimezoneOffset();

  } catch (e) {}


  return {

    device_timezone:
      timezone,

    device_language:
      navigator.language ||
      "غير معروف",

    languages:
      Array.isArray(
        navigator.languages
      )
        ? navigator.languages.join(", ")
        : safeValue(
            navigator.language
          ),

    timezone_offset_minutes:
      timezoneOffset
  };
}


// ============================================================
// 8. معلومات الاتصال الأصلية من المتصفح
// ============================================================

function getNetworkInfo() {

  const connection =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection;


  if (!connection) {

    return {

      network_api_available: false,

      network_type:
        "غير متاح",

      effective_network_type:
        "غير متاح",

      downlink_mbps:
        null,

      downlink_max_mbps:
        null,

      rtt_ms:
        null,

      save_data:
        null
    };
  }


  return {

    network_api_available:
      true,

    network_type:
      safeValue(
        connection.type,
        "غير معروف"
      ),

    effective_network_type:
      safeValue(
        connection.effectiveType,
        "غير معروف"
      ),

    downlink_mbps:
      typeof connection.downlink === "number"
        ? connection.downlink
        : null,

    downlink_max_mbps:
      typeof connection.downlinkMax === "number"
        ? connection.downlinkMax
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
// 9. قياس RTT فعلي
// ============================================================

async function measureRealRTT() {

  try {

    const start =
      performance.now();


    // طلب صغير إلى نفس الموقع.
    // الهدف قياس زمن الوصول التقريبي من المتصفح
    // وليس معرفة IP أو تجاوز VPN.

    const url =
      window.location.origin +
      "/?__network_probe=" +
      Date.now();


    await fetch(
      url,
      {
        method: "HEAD",
        cache: "no-store",
        credentials: "omit"
      }
    );


    const end =
      performance.now();


    const rtt =
      Math.round(end - start);


    if (
      Number.isFinite(rtt) &&
      rtt >= 0
    ) {
      return rtt;
    }

  } catch (error) {

    // بعض الاستضافات لا تدعم HEAD.
  }


  return null;
}


// ============================================================
// 10. خصائص الجهاز
// ============================================================

function getHardwareInfo() {

  return {

    hardware_concurrency:
      navigator.hardwareConcurrency ||
      null,

    device_memory_gb:
      typeof navigator.deviceMemory ===
      "number"
        ? navigator.deviceMemory
        : null,

    max_touch_points:
      navigator.maxTouchPoints ||
      0,

    cookie_enabled:
      typeof navigator.cookieEnabled ===
      "boolean"
        ? navigator.cookieEnabled
        : null,

    do_not_track:
      navigator.doNotTrack ??
      null,

    global_privacy_control:
      navigator.globalPrivacyControl ??
      null,

    online:
      typeof navigator.onLine ===
      "boolean"
        ? navigator.onLine
        : null,

    pdf_viewer_enabled:
      navigator.pdfViewerEnabled ??
      null,

    webdriver:
      navigator.webdriver ??
      null
  };
}


// ============================================================
// 11. معلومات الصفحة
// ============================================================

function getPageInfo() {

  return {

    page_url:
      window.location.href,

    page_path:
      window.location.pathname ||
      "/",

    page_title:
      document.title ||
      "بدون عنوان",

    referrer:
      document.referrer ||
      "مباشرة / غير معروف",

    origin:
      window.location.origin ||
      "غير معروف"
  };
}


// ============================================================
// 12. معرف الجلسة
// ============================================================

function getSessionId() {

  let sessionId =
    sessionStorage.getItem(
      "visitor_session_id"
    );


  if (!sessionId) {

    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID ===
        "function"
    ) {

      sessionId =
        crypto.randomUUID();

    } else {

      sessionId =
        Date.now().toString(36) +
        "-" +
        Math.random()
          .toString(36)
          .substring(2);
    }


    sessionStorage.setItem(
      "visitor_session_id",
      sessionId
    );
  }


  return sessionId;
}


// ============================================================
// 13. API #1 — ipapi
// ============================================================

async function fetchIPAPI() {

  const response =
    await fetch(
      "https://ipapi.co/json/",
      {
        method: "GET",
        cache: "no-store"
      }
    );


  if (!response.ok) {

    throw new Error(
      `ipapi HTTP ${response.status}`
    );
  }


  const data =
    await response.json();


  if (!isValidIP(data.ip)) {
    throw new Error(
      "ipapi returned invalid IP"
    );
  }


  return {

    source:
      "ipapi.co",

    ip:
      data.ip,

    country:
      data.country_name,

    country_code:
      data.country_code,

    region:
      data.region,

    city:
      data.city,

    postal:
      data.postal,

    latitude:
      data.latitude,

    longitude:
      data.longitude,

    timezone:
      data.timezone,

    utc_offset:
      data.utc_offset,

    asn:
      data.asn,

    organization:
      data.org,

    continent_code:
      data.continent_code,

    currency:
      data.currency,

    raw:
      data
  };
}


// ============================================================
// 14. API #2 — ipwho.is
// ============================================================

async function fetchIPWho() {

  const response =
    await fetch(
      "https://ipwho.is/",
      {
        method: "GET",
        cache: "no-store"
      }
    );


  if (!response.ok) {

    throw new Error(
      `ipwho.is HTTP ${response.status}`
    );
  }


  const data =
    await response.json();


  if (
    data.success === false ||
    !isValidIP(data.ip)
  ) {

    throw new Error(
      "ipwho.is returned invalid data"
    );
  }


  return {

    source:
      "ipwho.is",

    ip:
      data.ip,

    country:
      data.country,

    country_code:
      data.country_code,

    region:
      data.region,

    city:
      data.city,

    postal:
      data.postal,

    latitude:
      data.latitude,

    longitude:
      data.longitude,

    timezone:
      data.timezone?.id,

    utc_offset:
      data.timezone?.utc,

    asn:
      data.connection?.asn
        ? `AS${data.connection.asn}`
        : null,

    organization:
      data.connection?.org,

    continent_code:
      data.continent_code,

    isp:
      data.connection?.isp,

    success:
      data.success,

    raw:
      data
  };
}


// ============================================================
// 15. Public IP فقط — fallback
// ============================================================

async function fetchIPOnly() {

  const endpoints = [

    "https://api64.ipify.org?format=json",

    "https://api.ipify.org?format=json"
  ];


  for (
    const endpoint of endpoints
  ) {

    try {

      const response =
        await fetch(
          endpoint,
          {
            method: "GET",
            cache: "no-store"
          }
        );


      if (!response.ok) {
        continue;
      }


      const data =
        await response.json();


      if (
        isValidIP(data.ip)
      ) {

        return {
          ip: data.ip,
          source:
            endpoint.includes("api64")
              ? "ipify64"
              : "ipify"
        };
      }

    } catch (e) {}
  }


  return {
    ip: "غير معروف",
    source: "none"
  };
}


// ============================================================
// 16. جمع GeoIP من عدة مصادر
// ============================================================

async function getMultiSourceIPInformation() {

  const results = [];


  // نستعلم بالتوازي لتقليل وقت الانتظار.

  const responses =
    await Promise.allSettled([

      fetchIPAPI(),

      fetchIPWho()
    ]);


  for (
    const result of responses
  ) {

    if (
      result.status ===
      "fulfilled"
    ) {

      results.push(
        result.value
      );
    }
  }


  // ----------------------------------------------------------
  // إذا فشل المصدران
  // ----------------------------------------------------------

  if (!results.length) {

    const fallback =
      await fetchIPOnly();


    return {

      ip:
        fallback.ip,

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

      latitude:
        null,

      longitude:
        null,

      timezone:
        "غير معروف",

      utc_offset:
        "غير معروف",

      asn:
        "غير معروف",

      organization:
        "غير معروف",

      continent_code:
        "غير معروف",

      currency:
        "غير معروف",

      isp:
        "غير معروف",

      geo_sources:
        fallback.source,

      geo_source_count:
        0,

      geo_consensus:
        "غير متوفر"
    };
  }


  // ----------------------------------------------------------
  // اختيار البيانات
  // ----------------------------------------------------------

  const first =
    results[0];


  const second =
    results[1] || null;


  // إذا اختلف IP بين المصادر،
  // نحتفظ بالأمر بدل افتراض أن أحدهما صحيح.

  const ipValues =
    results
      .map(
        item => item.ip
      )
      .filter(
        isValidIP
      );


  const uniqueIPs =
    [...new Set(ipValues)];


  let finalIP =
    first.ip;


  if (
    uniqueIPs.length === 1
  ) {

    finalIP =
      uniqueIPs[0];

  } else if (
    uniqueIPs.length > 1
  ) {

    finalIP =
      uniqueIPs.join(" | ");
  }


  // ----------------------------------------------------------
  // مقارنة المصادر
  // ----------------------------------------------------------

  const countryCodes =
    results
      .map(
        item => item.country_code
      )
      .filter(Boolean);


  const cities =
    results
      .map(
        item => item.city
      )
      .filter(Boolean);


  const countriesMatch =
    countryCodes.length > 1 &&
    new Set(countryCodes).size === 1;


  const citiesMatch =
    cities.length > 1 &&
    new Set(cities).size === 1;


  let consensus =
    "مصدر واحد";


  if (
    results.length >= 2
  ) {

    if (
      countriesMatch &&
      citiesMatch
    ) {

      consensus =
        "توافق قوي";

    } else if (
      countriesMatch
    ) {

      consensus =
        "توافق الدولة";

    } else {

      consensus =
        "اختلاف بين المصادر";
    }
  }


  // ----------------------------------------------------------
  // دمج البيانات
  // ----------------------------------------------------------

  function firstAvailable(field) {

    for (
      const item of results
    ) {

      if (
        item[field] !==
          undefined &&
        item[field] !==
          null &&
        item[field] !== ""
      ) {

        return item[field];
      }
    }


    return null;
  }


  return {

    ip:
      finalIP,

    country:
      firstAvailable("country") ||
      "غير معروف",

    country_code:
      firstAvailable("country_code") ||
      "غير معروف",

    region:
      firstAvailable("region") ||
      "غير معروف",

    city:
      firstAvailable("city") ||
      "غير معروف",

    postal:
      firstAvailable("postal") ||
      "غير متوفر",

    latitude:
      firstAvailable("latitude"),

    longitude:
      firstAvailable("longitude"),

    timezone:
      firstAvailable("timezone") ||
      "غير معروف",

    utc_offset:
      firstAvailable("utc_offset") ||
      "غير معروف",

    asn:
      firstAvailable("asn") ||
      "غير معروف",

    organization:
      firstAvailable("organization") ||
      "غير معروف",

    continent_code:
      firstAvailable("continent_code") ||
      "غير معروف",

    currency:
      firstAvailable("currency") ||
      "غير معروف",

    isp:
      firstAvailable("isp") ||
      "غير معروف",

    geo_sources:
      results
        .map(
          item => item.source
        )
        .join(", "),

    geo_source_count:
      results.length,

    geo_consensus:
      consensus,

    ip_agreement:
      uniqueIPs.length === 1
        ? "متطابق"
        : uniqueIPs.length > 1
          ? "مختلف"
          : "غير متوفر"
  };
}


// ============================================================
// 17. تحليل الشبكة
// ============================================================

function analyzeNetworkProvider(
  ipData
) {

  const organization =
    String(
      ipData.organization ||
      ""
    ).toLowerCase();


  const isp =
    String(
      ipData.isp ||
      ""
    ).toLowerCase();


  const asn =
    String(
      ipData.asn ||
      ""
    ).toLowerCase();


  const text =
    `${organization} ${isp} ${asn}`;


  const hostingIndicators = [

    "hosting",
    "host",
    "datacenter",
    "data center",
    "cloud",
    "server",
    "digitalocean",
    "amazon",
    "aws",
    "google cloud",
    "google llc",
    "microsoft azure",
    "azure",
    "linode",
    "vultr",
    "scaleway",
    "ovh",
    "hetzner",
    "leaseweb",
    "contabo",
    "oracle cloud"
  ];


  const vpnIndicators = [

    "vpn",
    "nordvpn",
    "mullvad",
    "expressvpn",
    "surfshark",
    "proton",
    "windscribe",
    "tunnelbear"
  ];


  const proxyIndicators = [

    "proxy",
    "proxies",
    "anonymous"
  ];


  const torIndicators = [

    "tor"
  ];


  const hostingMatches =
    hostingIndicators.filter(
      keyword =>
        text.includes(keyword)
    );


  const vpnMatches =
    vpnIndicators.filter(
      keyword =>
        text.includes(keyword)
    );


  const proxyMatches =
    proxyIndicators.filter(
      keyword =>
        text.includes(keyword)
    );


  const torMatches =
    torIndicators.filter(
      keyword =>
        text.includes(keyword)
    );


  let classification =
    "غير محدد";


  let confidence = 0;


  if (
    vpnMatches.length
  ) {

    classification =
      "VPN محتمل";

    confidence = 85;

  } else if (
    proxyMatches.length
  ) {

    classification =
      "Proxy محتمل";

    confidence = 80;

  } else if (
    torMatches.length
  ) {

    classification =
      "Tor محتمل";

    confidence = 90;

  } else if (
    hostingMatches.length
  ) {

    classification =
      "Hosting / Datacenter";

    confidence = 80;

  }


  // مؤشرات الهاتف المحمول
  const mobileKeywords = [

    "mobile",
    "telecom",
    "communications",
    "mobilis",
    "ooredoo",
    "djezzy",
    "orange",
    "vodafone",
    "telefonica",
    "telekom",
    "cellular"
  ];


  const mobileMatches =
    mobileKeywords.filter(
      keyword =>
        text.includes(keyword)
    );


  return {

    network_classification:
      classification,

    network_confidence:
      confidence,

    hosting_detected:
      hostingMatches.length > 0,

    vpn_detected:
      vpnMatches.length > 0,

    proxy_detected:
      proxyMatches.length > 0,

    tor_indicator:
      torMatches.length > 0,

    mobile_provider_indicator:
      mobileMatches.length > 0,

    hosting_matches:
      hostingMatches.join(", ") ||
      "لا يوجد",

    vpn_matches:
      vpnMatches.join(", ") ||
      "لا يوجد",

    proxy_matches:
      proxyMatches.join(", ") ||
      "لا يوجد",

    provider:
      safeValue(
        ipData.organization ||
        ipData.isp,
        "غير معروف"
      )
  };
}


// ============================================================
// 18. تجميع كل المعلومات
// ============================================================

async function collectVisitorData() {

  // IP / GeoIP
  const ipData =
    await getMultiSourceIPInformation();


  // الجهاز
  const deviceInfo =
    getDeviceInfo();


  // Client Hints
  const userAgentData =
    await getUserAgentData();


  // الشاشة
  const displayInfo =
    getDisplayInfo();


  // اللغة
  const localeInfo =
    getLocaleInfo();


  // الشبكة
  const networkInfo =
    getNetworkInfo();


  // Hardware
  const hardwareInfo =
    getHardwareInfo();


  // الصفحة
  const pageInfo =
    getPageInfo();


  // تحليل الشبكة
  const networkAnalysis =
    analyzeNetworkProvider(
      ipData
    );


  // قياس RTT فعلي
  const measuredRTT =
    await measureRealRTT();


  // Session
  const sessionId =
    getSessionId();


  return {

    // ========================================================
    // IP / GEO
    // ========================================================

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

    isp:
      ipData.isp,

    continent:
      ipData.continent_code,

    currency:
      ipData.currency,

    geo_sources:
      ipData.geo_sources,

    geo_source_count:
      ipData.geo_source_count,

    geo_consensus:
      ipData.geo_consensus,

    ip_agreement:
      ipData.ip_agreement,


    // ========================================================
    // NETWORK INTELLIGENCE
    // ========================================================

    network_classification:
      networkAnalysis.network_classification,

    network_confidence:
      networkAnalysis.network_confidence,

    hosting_detected:
      networkAnalysis.hosting_detected,

    vpn_detected:
      networkAnalysis.vpn_detected,

    proxy_detected:
      networkAnalysis.proxy_detected,

    tor_indicator:
      networkAnalysis.tor_indicator,

    mobile_provider_indicator:
      networkAnalysis.mobile_provider_indicator,

    hosting_matches:
      networkAnalysis.hosting_matches,

    vpn_matches:
      networkAnalysis.vpn_matches,

    proxy_matches:
      networkAnalysis.proxy_matches,


    // ========================================================
    // DEVICE
    // ========================================================

    device_type:
      deviceInfo.device_type,

    operating_system:
      deviceInfo.operating_system,

    operating_system_name:
      deviceInfo.operating_system_name,

    operating_system_version:
      deviceInfo.operating_system_version,

    browser:
      deviceInfo.browser,

    browser_version:
      deviceInfo.browser_version,

    platform:
      deviceInfo.platform,

    vendor:
      deviceInfo.vendor,

    user_agent:
      deviceInfo.user_agent,


    // ========================================================
    // CLIENT HINTS
    // ========================================================

    user_agent_data_available:
      userAgentData.available,

    ua_mobile:
      userAgentData.mobile ??
      null,

    ua_platform:
      userAgentData.platform ??
      "غير متوفر",

    ua_platform_version:
      userAgentData.platform_version ??
      "غير متوفر",

    ua_architecture:
      userAgentData.architecture ??
      "غير متوفر",

    ua_bitness:
      userAgentData.bitness ??
      "غير متوفر",

    ua_model:
      userAgentData.model ??
      "غير متوفر",

    ua_brands:
      userAgentData.brands ??
      "غير متوفر",

    ua_full_version_list:
      userAgentData.full_version_list ??
      "غير متوفر",

    ua_form_factors:
      userAgentData.form_factors ??
      "غير متوفر",


    // ========================================================
    // LOCALE
    // ========================================================

    device_timezone:
      localeInfo.device_timezone,

    device_language:
      localeInfo.device_language,

    languages:
      localeInfo.languages,

    timezone_offset_minutes:
      localeInfo.timezone_offset_minutes,


    // ========================================================
    // CONNECTION
    // ========================================================

    network_api_available:
      networkInfo.network_api_available,

    network_type:
      networkInfo.network_type,

    effective_network_type:
      networkInfo.effective_network_type,

    downlink_mbps:
      networkInfo.downlink_mbps,

    downlink_max_mbps:
      networkInfo.downlink_max_mbps,

    rtt_ms:
      networkInfo.rtt_ms,

    measured_rtt_ms:
      measuredRTT,

    save_data:
      networkInfo.save_data,


    // ========================================================
    // DISPLAY
    // ========================================================

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

    pixel_depth:
      displayInfo.pixel_depth,

    orientation:
      displayInfo.orientation,

    orientation_angle:
      displayInfo.orientation_angle,


    // ========================================================
    // HARDWARE
    // ========================================================

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

    global_privacy_control:
      hardwareInfo.global_privacy_control,

    online:
      hardwareInfo.online,

    pdf_viewer_enabled:
      hardwareInfo.pdf_viewer_enabled,

    webdriver:
      hardwareInfo.webdriver,


    // ========================================================
    // PAGE
    // ========================================================

    page_url:
      pageInfo.page_url,

    page_path:
      pageInfo.page_path,

    page_title:
      pageInfo.page_title,

    referrer:
      pageInfo.referrer,

    origin:
      pageInfo.origin,


    // ========================================================
    // SESSION
    // ========================================================

    session_id:
      sessionId,

    timestamp:
      firebase.firestore.FieldValue.serverTimestamp()
  };
}


// ============================================================
// 19. حفظ البيانات
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
// 20. التسجيل الرئيسي
// ============================================================

async function logVisitor() {

  // منع التسجيل المتكرر في نفس Session
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

    console.log(
      "Collecting visitor intelligence..."
    );


    const visitorData =
      await collectVisitorData();


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


    // محاولة IP احتياطية
    await fallbackLogVisitor();
  }
}


// ============================================================
// 21. Fallback
// ============================================================

async function fallbackLogVisitor() {

  try {

    const ipData =
      await fetchIPOnly();


    const deviceInfo =
      getDeviceInfo();


    const localeInfo =
      getLocaleInfo();


    const networkInfo =
      getNetworkInfo();


    const pageInfo =
      getPageInfo();


    const visitorData = {

      ip:
        safeValue(
          ipData.ip,
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

      geo_latitude:
        null,

      geo_longitude:
        null,

      geo_timezone:
        "غير معروف",

      utc_offset:
        "غير معروف",

      asn:
        "غير معروف",

      organization:
        "غير معروف",

      isp:
        "غير معروف",

      geo_sources:
        ipData.source,

      geo_source_count:
        0,

      geo_consensus:
        "Fallback",


      device_type:
        deviceInfo.device_type,

      operating_system:
        deviceInfo.operating_system,

      browser:
        deviceInfo.browser,

      browser_version:
        deviceInfo.browser_version,

      user_agent:
        deviceInfo.user_agent,


      device_timezone:
        localeInfo.device_timezone,

      device_language:
        localeInfo.device_language,

      languages:
        localeInfo.languages,


      network_type:
        networkInfo.network_type,

      effective_network_type:
        networkInfo.effective_network_type,

      downlink_mbps:
        networkInfo.downlink_mbps,

      rtt_ms:
        networkInfo.rtt_ms,

      save_data:
        networkInfo.save_data,


      page_url:
        pageInfo.page_url,

      page_path:
        pageInfo.page_path,

      page_title:
        pageInfo.page_title,

      referrer:
        pageInfo.referrer,


      session_id:
        getSessionId(),

      timestamp:
        firebase.firestore.FieldValue.serverTimestamp()
    };


    await saveToFirestore(
      visitorData
    );


    console.log(
      "Fallback visitor saved."
    );


  } catch (error) {

    console.error(
      "Fallback logging failed:",
      error
    );
  }
}


// ============================================================
// 22. مراقبة تغير الشبكة
// ============================================================

function attachNetworkListener() {

  const connection =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection;


  if (
    connection &&
    typeof connection.addEventListener ===
      "function"
  ) {

    connection.addEventListener(
      "change",
      () => {

        console.log(
          "Network connection changed:",
          getNetworkInfo()
        );
      }
    );
  }
}


// ============================================================
// 23. بدء النظام
// ============================================================

attachNetworkListener();


if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    logVisitor
  );

} else {

  logVisitor();
}
