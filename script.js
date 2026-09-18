/* =========================================================
   Visitor Analytics - Gift Center
   Firebase Firestore + Multi-source IP/Geo information
   Compatible with the current admin.html
   ========================================================= */

/* =========================
   1) Firebase Configuration
   ========================= */

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


/* =========================
   2) Settings
   ========================= */

const NETWORK_WORKER_URL = "";

// مهلة طلبات GeoIP حتى لا يتوقف حفظ الزائر
const API_TIMEOUT = 5000;


/* =========================
   3) General Helpers
   ========================= */

function safeValue(value, fallback = "غير متوفر") {
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    value === "null" ||
    value === "undefined"
  ) {
    return fallback;
  }

  return value;
}


function cleanString(value) {
  if (value === undefined || value === null) return "";

  return String(value)
    .trim()
    .replace(/\s+/g, " ")
    .substring(0, 500);
}


function isValidIP(ip) {
  if (!ip) return false;

  const value = String(ip).trim();

  // IPv4
  const ipv4 =
    /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

  // IPv6
  const ipv6 = /^[0-9a-fA-F:]+$/;

  return ipv4.test(value) || (value.includes(":") && ipv6.test(value));
}


function normalizeBoolean(value) {
  if (value === true || value === false) return value;

  if (value === "true") return true;
  if (value === "false") return false;

  return null;
}


/* =========================
   4) Fetch With Timeout
   ========================= */

async function fetchWithTimeout(url, options = {}, timeout = API_TIMEOUT) {
  const controller = new AbortController();

  const timer = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    return response;
  } finally {
    clearTimeout(timer);
  }
}


async function fetchJSON(url, options = {}, timeout = API_TIMEOUT) {
  const response = await fetchWithTimeout(url, options, timeout);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return await response.json();
}


/* =========================
   5) Device Information
   ========================= */

function getDeviceInfo() {
  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const vendor = navigator.vendor || "";

  let deviceType = "Desktop";

  if (/tablet|ipad/i.test(ua)) {
    deviceType = "Tablet";
  } else if (
    /mobile|android|iphone|ipod|windows phone/i.test(ua)
  ) {
    deviceType = "Mobile";
  }

  let osName = "غير متوفر";
  let osVersion = "";

  // Android
  let match = ua.match(/Android\s([0-9.]+)/i);

  if (match) {
    osName = "Android";
    osVersion = match[1];
  }

  // iPhone / iPad
  if (/iPhone|iPad|iPod/i.test(ua)) {
    osName = "iOS";

    const iosMatch = ua.match(/OS\s([0-9_]+)/i);

    if (iosMatch) {
      osVersion = iosMatch[1].replace(/_/g, ".");
    }
  }

  // Windows
  if (/Windows NT/i.test(ua)) {
    osName = "Windows";

    const win = ua.match(/Windows NT\s([0-9.]+)/i);

    if (win) {
      const versions = {
        "10.0": "10/11",
        "6.4": "10",
        "6.3": "8.1",
        "6.2": "8",
        "6.1": "7"
      };

      osVersion = versions[win[1]] || win[1];
    }
  }

  // macOS
  if (/Mac OS X/i.test(ua) && !/iPhone|iPad|iPod/i.test(ua)) {
    osName = "macOS";

    const mac = ua.match(/Mac OS X\s?([0-9_\.]+)/i);

    if (mac) {
      osVersion = mac[1].replace(/_/g, ".");
    }
  }

  // Linux
  if (/Linux/i.test(ua) && !/Android/i.test(ua)) {
    osName = "Linux";
  }

  // Chrome
  let browser = "غير متوفر";
  let browserVersion = "";

  let chrome = ua.match(/Chrome\/([0-9.]+)/i);

  if (chrome && !/Edg|OPR/i.test(ua)) {
    browser = "Chrome";
    browserVersion = chrome[1];
  }

  // Edge
  let edge = ua.match(/Edg\/([0-9.]+)/i);

  if (edge) {
    browser = "Edge";
    browserVersion = edge[1];
  }

  // Firefox
  let firefox = ua.match(/Firefox\/([0-9.]+)/i);

  if (firefox) {
    browser = "Firefox";
    browserVersion = firefox[1];
  }

  // Opera
  let opera = ua.match(/OPR\/([0-9.]+)/i);

  if (opera) {
    browser = "Opera";
    browserVersion = opera[1];
  }

  // Samsung Browser
  let samsung = ua.match(/SamsungBrowser\/([0-9.]+)/i);

  if (samsung) {
    browser = "Samsung Internet";
    browserVersion = samsung[1];
  }

  // Safari
  if (
    /Safari/i.test(ua) &&
    !/Chrome|CriOS|FxiOS|Edg|OPR|SamsungBrowser/i.test(ua)
  ) {
    browser = "Safari";

    const safari = ua.match(/Version\/([0-9.]+)/i);

    if (safari) {
      browserVersion = safari[1];
    }
  }

  return {
    device_type: deviceType,

    // الاسم الأساسي
    operating_system:
      osVersion && osVersion !== "غير متوفر"
        ? `${osName} ${osVersion}`
        : osName,

    operating_system_name: osName,
    operating_system_version: osVersion || "غير متوفر",

    browser:
      browserVersion && browserVersion !== "غير متوفر"
        ? `${browser} ${browserVersion}`
        : browser,

    browser_version: browserVersion || "غير متوفر",

    platform: platform || "غير متوفر",
    vendor: vendor || "غير متوفر",

    user_agent: ua || "غير متوفر"
  };
}


/* =========================
   6) User Agent Client Hints
   ========================= */

async function getUserAgentData() {
  const result = {
    user_agent_data_available: false,
    ua_mobile: null,
    ua_platform: "",
    ua_platform_version: "",
    ua_architecture: "",
    ua_bitness: "",
    ua_model: ""
  };

  try {
    if (
      !navigator.userAgentData ||
      typeof navigator.userAgentData.getHighEntropyValues !== "function"
    ) {
      return result;
    }

    result.user_agent_data_available = true;

    result.ua_mobile =
      normalizeBoolean(navigator.userAgentData.mobile);

    result.ua_platform =
      cleanString(navigator.userAgentData.platform);

    const hints =
      await navigator.userAgentData.getHighEntropyValues([
        "platformVersion",
        "architecture",
        "bitness",
        "model"
      ]);

    result.ua_platform_version =
      cleanString(hints.platformVersion);

    result.ua_architecture =
      cleanString(hints.architecture);

    result.ua_bitness =
      cleanString(hints.bitness);

    result.ua_model =
      cleanString(hints.model);

  } catch (error) {
    // Client Hints اختيارية وقد تكون محجوبة
  }

  return result;
}


/* =========================
   7) Display Information
   ========================= */

function getDisplayInfo() {
  const screenObj = window.screen || {};

  let orientation = "غير متوفر";
  let orientationAngle = null;

  try {
    if (screenObj.orientation) {
      orientation =
        screenObj.orientation.type || "غير متوفر";

      orientationAngle =
        typeof screenObj.orientation.angle === "number"
          ? screenObj.orientation.angle
          : null;
    } else {
      orientation =
        window.innerWidth > window.innerHeight
          ? "landscape"
          : "portrait";
    }
  } catch (e) {}

  return {
    screen_width:
      Number.isFinite(screenObj.width)
        ? screenObj.width
        : null,

    screen_height:
      Number.isFinite(screenObj.height)
        ? screenObj.height
        : null,

    screen_available_width:
      Number.isFinite(screenObj.availWidth)
        ? screenObj.availWidth
        : null,

    screen_available_height:
      Number.isFinite(screenObj.availHeight)
        ? screenObj.availHeight
        : null,

    viewport_width:
      Number.isFinite(window.innerWidth)
        ? window.innerWidth
        : null,

    viewport_height:
      Number.isFinite(window.innerHeight)
        ? window.innerHeight
        : null,

    // الاسم الجديد
    pixel_ratio:
      Number.isFinite(window.devicePixelRatio)
        ? window.devicePixelRatio
        : null,

    // اسم متوافق مع بعض النسخ القديمة من admin
    device_pixel_ratio:
      Number.isFinite(window.devicePixelRatio)
        ? window.devicePixelRatio
        : null,

    color_depth:
      Number.isFinite(screenObj.colorDepth)
        ? screenObj.colorDepth
        : null,

    pixel_depth:
      Number.isFinite(screenObj.pixelDepth)
        ? screenObj.pixelDepth
        : null,

    orientation,
    orientation_angle: orientationAngle
  };
}


/* =========================
   8) Locale / Language
   ========================= */

function getLocaleInfo() {
  let timezone = "غير متوفر";

  try {
    timezone =
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      "غير متوفر";
  } catch (e) {}

  let language = navigator.language || "";

  let languages = [];

  try {
    languages = Array.isArray(navigator.languages)
      ? navigator.languages
      : language
        ? [language]
        : [];
  } catch (e) {}

  let offset = null;

  try {
    offset = new Date().getTimezoneOffset();
  } catch (e) {}

  return {
    device_timezone: timezone,

    device_language:
      language || "غير متوفر",

    languages:
      languages.length
        ? languages.join(", ")
        : "غير متوفر",

    timezone_offset_minutes:
      typeof offset === "number"
        ? offset
        : null
  };
}


/* =========================
   9) Network API
   ========================= */

function getNetworkInfo() {
  const connection =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection ||
    null;

  if (!connection) {
    return {
      network_api_available: false,
      network_type: "غير مدعوم",
      effective_network_type: "غير مدعوم",
      effective_type: "غير مدعوم",
      downlink_mbps: null,
      downlink: null,
      downlink_max_mbps: null,
      rtt_ms: null,
      rtt: null,
      save_data: null
    };
  }

  const networkType =
    cleanString(connection.type);

  const effective =
    cleanString(connection.effectiveType);

  const downlink =
    typeof connection.downlink === "number"
      ? connection.downlink
      : null;

  const downlinkMax =
    typeof connection.downlinkMax === "number"
      ? connection.downlinkMax
      : null;

  const rtt =
    typeof connection.rtt === "number"
      ? connection.rtt
      : null;

  const saveData =
    normalizeBoolean(connection.saveData);

  return {
    network_api_available: true,

    network_type:
      networkType || "غير متوفر",

    effective_network_type:
      effective || "غير متوفر",

    // توافق admin.html الحالي
    effective_type:
      effective || "غير متوفر",

    downlink_mbps: downlink,
    downlink: downlink,

    downlink_max_mbps: downlinkMax,

    rtt_ms: rtt,
    rtt: rtt,

    save_data: saveData
  };
}


/* =========================
   10) Real Request RTT
   ========================= */

async function measureRealRTT() {
  const url = window.location.origin + "/favicon.ico";

  const start = performance.now();

  try {
    await fetchWithTimeout(
      url + "?rtt=" + Date.now(),
      {
        method: "HEAD",
        cache: "no-store"
      },
      3000
    );

    const elapsed =
      Math.round(performance.now() - start);

    return elapsed;
  } catch (error) {
    return null;
  }
}


/* =========================
   11) Hardware Information
   ========================= */

function getHardwareInfo() {
  let cookiesEnabled = null;

  try {
    cookiesEnabled =
      typeof navigator.cookieEnabled === "boolean"
        ? navigator.cookieEnabled
        : null;
  } catch (e) {}

  let dnt = null;

  try {
    dnt = navigator.doNotTrack || null;
  } catch (e) {}

  let gpc = null;

  try {
    gpc =
      typeof navigator.globalPrivacyControl === "boolean"
        ? navigator.globalPrivacyControl
        : null;
  } catch (e) {}

  let online = null;

  try {
    online =
      typeof navigator.onLine === "boolean"
        ? navigator.onLine
        : null;
  } catch (e) {}

  let pdfViewer = null;

  try {
    pdfViewer =
      typeof navigator.pdfViewerEnabled === "boolean"
        ? navigator.pdfViewerEnabled
        : null;
  } catch (e) {}

  let webdriver = null;

  try {
    webdriver =
      typeof navigator.webdriver === "boolean"
        ? navigator.webdriver
        : null;
  } catch (e) {}

  const cores =
    typeof navigator.hardwareConcurrency === "number"
      ? navigator.hardwareConcurrency
      : null;

  const memory =
    typeof navigator.deviceMemory === "number"
      ? navigator.deviceMemory
      : null;

  const touch =
    typeof navigator.maxTouchPoints === "number"
      ? navigator.maxTouchPoints
      : null;

  return {
    hardware_concurrency: cores,

    // القيمة قد تكون تقريبية ومقربة من المتصفح
    device_memory_gb: memory,

    // توافق admin.html
    device_memory: memory,

    max_touch_points: touch,

    cookie_enabled: cookiesEnabled,

    // توافق admin.html
    cookies_enabled: cookiesEnabled,

    do_not_track: dnt,

    global_privacy_control: gpc,

    online,

    pdf_viewer_enabled: pdfViewer,

    webdriver
  };
}


/* =========================
   12) Page Information
   ========================= */

function getPageInfo() {
  return {
    page_url:
      window.location.href || "غير متوفر",

    page_path:
      window.location.pathname || "غير متوفر",

    page_title:
      document.title || "غير متوفر",

    referrer:
      document.referrer || "مباشر / غير متوفر",

    origin:
      window.location.origin || "غير متوفر"
  };
}


/* =========================
   13) Session ID
   ========================= */

function getSessionId() {
  const key = "visitor_session_id";

  try {
    let sessionId =
      sessionStorage.getItem(key);

    if (sessionId) {
      return sessionId;
    }

    sessionId =
      "sess_" +
      Date.now().toString(36) +
      "_" +
      Math.random()
        .toString(36)
        .substring(2, 10);

    sessionStorage.setItem(
      key,
      sessionId
    );

    return sessionId;

  } catch (error) {
    return (
      "sess_" +
      Date.now().toString(36) +
      "_" +
      Math.random()
        .toString(36)
        .substring(2, 10)
    );
  }
}


/* =========================
   14) IP API - ipapi.co
   ========================= */

async function fetchIPAPI() {
  try {
    const data =
      await fetchJSON(
        "https://ipapi.co/json/",
        {},
        API_TIMEOUT
      );

    const ip =
      cleanString(data.ip);

    return {
      source: "ipapi.co",

      ip:
        isValidIP(ip)
          ? ip
          : "",

      country:
        cleanString(data.country_name),

      country_code:
        cleanString(data.country_code),

      region:
        cleanString(data.region),

      city:
        cleanString(data.city),

      postal:
        cleanString(data.postal),

      latitude:
        typeof data.latitude === "number"
          ? data.latitude
          : null,

      longitude:
        typeof data.longitude === "number"
          ? data.longitude
          : null,

      timezone:
        cleanString(data.timezone),

      utc_offset:
        cleanString(data.utc_offset),

      asn:
        cleanString(data.asn),

      organization:
        cleanString(data.org),

      isp:
        cleanString(data.org),

      continent:
        cleanString(data.continent_code),

      currency:
        cleanString(data.currency)
    };

  } catch (error) {
    return null;
  }
}


/* =========================
   15) IP API - ipwho.is
   ========================= */

async function fetchIPWho() {
  try {
    const data =
      await fetchJSON(
        "https://ipwho.is/",
        {},
        API_TIMEOUT
      );

    if (data.success === false) {
      return null;
    }

    const connection =
      data.connection || {};

    const ip =
      cleanString(data.ip);

    return {
      source: "ipwho.is",

      ip:
        isValidIP(ip)
          ? ip
          : "",

      country:
        cleanString(data.country),

      country_code:
        cleanString(data.country_code),

      region:
        cleanString(data.region),

      city:
        cleanString(data.city),

      postal:
        cleanString(data.postal),

      latitude:
        typeof data.latitude === "number"
          ? data.latitude
          : null,

      longitude:
        typeof data.longitude === "number"
          ? data.longitude
          : null,

      timezone:
        cleanString(
          data.timezone &&
          (
            data.timezone.id ||
            data.timezone
          )
        ),

      utc_offset:
        cleanString(
          data.timezone &&
          data.timezone.utc
        ),

      asn:
        cleanString(connection.asn),

      organization:
        cleanString(connection.org),

      isp:
        cleanString(connection.isp),

      continent:
        cleanString(data.continent_code),

      currency:
        data.currency
          ? cleanString(
              data.currency.code ||
              data.currency
            )
          : ""
    };

  } catch (error) {
    return null;
  }
}


/* =========================
   16) IP Only Fallback
   ========================= */

async function fetchIPOnly() {
  const endpoints = [
    "https://api.ipify.org?format=json",
    "https://api64.ipify.org?format=json"
  ];

  for (const endpoint of endpoints) {
    try {
      const data =
        await fetchJSON(
          endpoint,
          {},
          3000
        );

      const ip =
        cleanString(data.ip);

      if (isValidIP(ip)) {
        return ip;
      }

    } catch (error) {}
  }

  return "";
}


/* =========================
   17) Cloudflare Worker
   =========================
   
   إذا وضعت رابط Worker في:
   NETWORK_WORKER_URL
   
   يجب أن يعيد JSON مثل:
   {
     "ip": "...",
     "country": "...",
     "country_code": "...",
     "region": "...",
     "city": "...",
     "postal": "...",
     "latitude": 0,
     "longitude": 0,
     "timezone": "...",
     "asn": "...",
     "organization": "...",
     "isp": "..."
   }
*/

async function fetchNetworkWorker() {
  if (!NETWORK_WORKER_URL) {
    return null;
  }

  try {
    const data =
      await fetchJSON(
        NETWORK_WORKER_URL,
        {},
        API_TIMEOUT
      );

    if (!data) {
      return null;
    }

    return {
      source: "worker",

      ip:
        isValidIP(data.ip)
          ? data.ip
          : "",

      country:
        cleanString(data.country),

      country_code:
        cleanString(data.country_code),

      region:
        cleanString(data.region),

      city:
        cleanString(data.city),

      postal:
        cleanString(data.postal),

      latitude:
        typeof data.latitude === "number"
          ? data.latitude
          : null,

      longitude:
        typeof data.longitude === "number"
          ? data.longitude
          : null,

      timezone:
        cleanString(data.timezone),

      utc_offset:
        cleanString(data.utc_offset),

      asn:
        cleanString(data.asn),

      organization:
        cleanString(data.organization),

      isp:
        cleanString(data.isp),

      continent:
        cleanString(data.continent),

      currency:
        cleanString(data.currency)
    };

  } catch (error) {
    return null;
  }
}


/* =========================
   18) Multi-Source GeoIP
   ========================= */

async function getMultiSourceIPInformation() {
  const results =
    await Promise.allSettled([
      fetchNetworkWorker(),
      fetchIPAPI(),
      fetchIPWho()
    ]);

  const sources = [];

  for (const result of results) {
    if (
      result.status === "fulfilled" &&
      result.value
    ) {
      sources.push(result.value);
    }
  }

  // إذا لم نجد IP من GeoIP
  if (!sources.some(x => isValidIP(x.ip))) {
    const fallbackIP =
      await fetchIPOnly();

    if (fallbackIP) {
      sources.push({
        source: "ipify",

        ip: fallbackIP,

        country: "",
        country_code: "",
        region: "",
        city: "",
        postal: "",
        latitude: null,
        longitude: null,
        timezone: "",
        utc_offset: "",
        asn: "",
        organization: "",
        isp: "",
        continent: "",
        currency: ""
      });
    }
  }

  return sources;
}


/* =========================
   19) Choose Best Geo Data
   ========================= */

function chooseBestValue(sources, key) {
  for (const source of sources) {
    const value = source[key];

    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      return value;
    }
  }

  return null;
}


function chooseBestGeo(sources) {
  if (!sources || !sources.length) {
    return {
      ip: "",
      country: "",
      country_code: "",
      region: "",
      city: "",
      postal: "",
      latitude: null,
      longitude: null,
      timezone: "",
      utc_offset: "",
      asn: "",
      organization: "",
      isp: "",
      continent: "",
      currency: "",
      sources: [],
      source_count: 0,
      consensus: "غير متوفر"
    };
  }

  const ipValues =
    sources
      .map(x => x.ip)
      .filter(isValidIP);

  let consensus = "غير متوفر";

  if (ipValues.length) {
    const uniqueIPs =
      [...new Set(ipValues)];

    consensus =
      uniqueIPs.length === 1
        ? "متطابق"
        : "غير متطابق";
  }

  return {
    ip:
      chooseBestValue(sources, "ip") || "",

    country:
      chooseBestValue(sources, "country") || "",

    country_code:
      chooseBestValue(sources, "country_code") || "",

    region:
      chooseBestValue(sources, "region") || "",

    city:
      chooseBestValue(sources, "city") || "",

    postal:
      chooseBestValue(sources, "postal") || "",

    latitude:
      chooseBestValue(sources, "latitude"),

    longitude:
      chooseBestValue(sources, "longitude"),

    timezone:
      chooseBestValue(sources, "timezone") || "",

    utc_offset:
      chooseBestValue(sources, "utc_offset") || "",

    asn:
      chooseBestValue(sources, "asn") || "",

    organization:
      chooseBestValue(sources, "organization") || "",

    isp:
      chooseBestValue(sources, "isp") || "",

    continent:
      chooseBestValue(sources, "continent") || "",

    currency:
      chooseBestValue(sources, "currency") || "",

    sources:
      sources
        .map(x => x.source)
        .filter(Boolean),

    source_count:
      sources.length,

    consensus
  };
}


/* =========================
   20) Network Provider Analysis
   ========================= */

function analyzeNetworkProvider(geo) {
  const text = [
    geo.organization,
    geo.isp,
    geo.asn
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const hostingKeywords = [
    "amazon",
    "aws",
    "google cloud",
    "google llc",
    "microsoft",
    "azure",
    "digitalocean",
    "ovh",
    "hetzner",
    "vultr",
    "linode",
    "oracle cloud",
    "contabo",
    "hostinger",
    "leaseweb",
    "datacamp",
    "choopa",
    "akamai"
  ];

  const vpnKeywords = [
    "nordvpn",
    "expressvpn",
    "surfshark",
    "protonvpn",
    "mullvad",
    "private internet access",
    "pia vpn",
    "cyberghost",
    "windscribe"
  ];

  const proxyKeywords = [
    "proxy",
    "vpn",
    "anonymizer",
    "privacy",
    "datacenter"
  ];

  const mobileKeywords = [
    "mobilis",
    "ooredoo",
    "djezzy",
    "telefonica",
    "vodafone",
    "orange",
    "t-mobile",
    "verizon",
    "at&t",
    "att mobility",
    "telecom",
    "cellular",
    "mobile"
  ];

  const hostingMatches =
    hostingKeywords.filter(k =>
      text.includes(k)
    );

  const vpnMatches =
    vpnKeywords.filter(k =>
      text.includes(k)
    );

  const proxyMatches =
    proxyKeywords.filter(k =>
      text.includes(k)
    );

  const mobileMatches =
    mobileKeywords.filter(k =>
      text.includes(k)
    );

  let classification = "غير محدد";
  let confidence = "منخفضة";

  if (vpnMatches.length) {
    classification = "VPN محتمل";
    confidence = "متوسطة";
  } else if (hostingMatches.length) {
    classification = "استضافة / Datacenter محتمل";
    confidence = "متوسطة";
  } else if (proxyMatches.length) {
    classification = "Proxy / Privacy محتمل";
    confidence = "منخفضة";
  } else if (mobileMatches.length) {
    classification = "شبكة جوال محتملة";
    confidence = "منخفضة";
  } else if (geo.isp || geo.organization) {
    classification = "مزود إنترنت عادي محتمل";
    confidence = "منخفضة";
  }

  return {
    network_classification: classification,

    network_confidence: confidence,

    hosting_detected:
      hostingMatches.length > 0,

    vpn_detected:
      vpnMatches.length > 0,

    proxy_detected:
      proxyMatches.length > 0,

    tor_indicator:
      text.includes("tor") &&
      (
        text.includes("tor exit") ||
        text.includes("torproject")
      ),

    mobile_provider_indicator:
      mobileMatches.length > 0,

    hosting_matches:
      hostingMatches,

    vpn_matches:
      vpnMatches,

    proxy_matches:
      proxyMatches
  };
}


/* =========================
   21) Base Visitor Data
   ========================= */

async function collectBaseVisitorData() {
  const device =
    getDeviceInfo();

  const uaData =
    await getUserAgentData();

  const display =
    getDisplayInfo();

  const locale =
    getLocaleInfo();

  const network =
    getNetworkInfo();

  const hardware =
    getHardwareInfo();

  const page =
    getPageInfo();

  const sessionId =
    getSessionId();

  let measuredRTT = null;

  try {
    measuredRTT =
      await measureRealRTT();
  } catch (e) {}

  return {
    ...device,
    ...uaData,
    ...display,
    ...locale,
    ...network,
    ...hardware,
    ...page,

    measured_rtt_ms:
      measuredRTT,

    session_id:
      sessionId,

    timestamp:
      firebase.firestore.FieldValue.serverTimestamp()
  };
}


/* =========================
   22) Build Geo Enrichment
   ========================= */

async function collectGeoEnrichment() {
  const sources =
    await getMultiSourceIPInformation();

  const geo =
    chooseBestGeo(sources);

  const networkAnalysis =
    analyzeNetworkProvider(geo);

  return {
    // IP / Geo
    ip:
      geo.ip,

    country:
      geo.country,

    country_code:
      geo.country_code,

    region:
      geo.region,

    city:
      geo.city,

    postal:
      geo.postal,

    geo_latitude:
      geo.latitude,

    geo_longitude:
      geo.longitude,

    // توافق admin.html
    lat:
      geo.latitude,

    lon:
      geo.longitude,

    geo_timezone:
      geo.timezone,

    utc_offset:
      geo.utc_offset,

    asn:
      geo.asn,

    organization:
      geo.organization,

    isp:
      geo.isp,

    continent:
      geo.continent,

    currency:
      geo.currency,

    geo_sources:
      geo.sources,

    geo_source_count:
      geo.source_count,

    geo_consensus:
      geo.consensus,

    ip_agreement:
      geo.consensus,

    ...networkAnalysis
  };
}


/* =========================
   23) Compatibility Aliases
   ========================= */

function addAdminCompatibilityFields(data) {
  return {
    ...data,

    // OS
    os:
      data.operating_system || "",

    // RAM
    device_memory:
      data.device_memory_gb ?? null,

    // Pixel ratio
    device_pixel_ratio:
      data.pixel_ratio ?? null,

    // Cookies
    cookies_enabled:
      data.cookie_enabled ?? null,

    // Network
    effective_type:
      data.effective_network_type || "",

    downlink:
      data.downlink_mbps ?? null,

    rtt:
      data.rtt_ms ?? null,

    // Geo
    lat:
      data.geo_latitude ?? null,

    lon:
      data.geo_longitude ?? null,

    // Older admin compatibility
    org:
      data.organization || ""
  };
}


/* =========================
   24) Save Visitor
   ========================= */

async function saveVisitor(data) {
  const finalData =
    addAdminCompatibilityFields(data);

  const docRef =
    await db
      .collection("visitors")
      .add(finalData);

  return docRef;
}


/* =========================
   25) Main Visitor Logger
   ========================= */

async function logVisitor() {
  try {

    // منع تسجيل نفس جلسة التصفح عدة مرات
    try {
      if (
        sessionStorage.getItem(
          "visitor_logged"
        ) === "1"
      ) {
        return;
      }
    } catch (e) {}

    /*
      المرحلة الأولى:
      جمع معلومات المتصفح والجهاز وحفظها فورًا.
      بهذه الطريقة لا نخسر الزيارة إذا فشل GeoIP.
    */

    const baseData =
      await collectBaseVisitorData();

    const docRef =
      await saveVisitor(baseData);

    /*
      نعتبر الزيارة مسجلة الآن.
    */

    try {
      sessionStorage.setItem(
        "visitor_logged",
        "1"
      );
    } catch (e) {}

    /*
      المرحلة الثانية:
      إثراء نفس الوثيقة بمعلومات IP / Geo.
    */

    try {
      const enrichment =
        await collectGeoEnrichment();

      await docRef.update(
        enrichment
      );

    } catch (geoError) {
      console.warn(
        "Geo enrichment failed:",
        geoError
      );
    }

  } catch (error) {

    console.error(
      "Visitor logging failed:",
      error
    );

    /*
      محاولة أخيرة لحفظ الحد الأدنى.
    */

    try {
      const fallback = {
        device_type:
          /Mobi|Android|iPhone/i.test(
            navigator.userAgent || ""
          )
            ? "Mobile"
            : "Desktop",

        operating_system:
          navigator.platform ||
          "غير متوفر",

        browser:
          navigator.userAgent ||
          "غير متوفر",

        user_agent:
          navigator.userAgent ||
          "غير متوفر",

        page_url:
          window.location.href,

        page_path:
          window.location.pathname,

        page_title:
          document.title || "",

        referrer:
          document.referrer || "",

        device_language:
          navigator.language || "",

        device_timezone:
          (() => {
            try {
              return Intl.DateTimeFormat()
                .resolvedOptions()
                .timeZone || "";
            } catch (e) {
              return "";
            }
          })(),

        session_id:
          getSessionId(),

        timestamp:
          firebase.firestore.FieldValue.serverTimestamp()
      };

      await saveVisitor(
        fallback
      );

      try {
        sessionStorage.setItem(
          "visitor_logged",
          "1"
        );
      } catch (e) {}

    } catch (fallbackError) {
      console.error(
        "Fallback visitor logging failed:",
        fallbackError
      );
    }
  }
}


/* =========================
   26) Online / Offline Listener
   ========================= */

window.addEventListener(
  "online",
  () => {
    console.log(
      "Network connection restored."
    );
  }
);

window.addEventListener(
  "offline",
  () => {
    console.log(
      "Network connection lost."
    );
  }
);


/* =========================
   27) Start
   ========================= */

if (
  document.readyState === "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      logVisitor();
    }
  );
} else {
  logVisitor();
  }
