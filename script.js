import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==================== Firebase Configuration ====================
const firebaseConfig = {
  apiKey: "AIzaSyD60g3bc-e6h9JMRUR3eKcD5oRO2rAb4vQ",
  authDomain: "beauty-store-4f012.firebaseapp.com",
  projectId: "beauty-store-4f012",
  storageBucket: "beauty-store-4f012.firebasestorage.app",
  messagingSenderId: "1053116874470",
  appId: "1:1053116874470:web:32a41e8ce3e089d1920527"
};

// تهيئة تطبيق الفايربيس وقاعدة البيانات
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==================== دالة تسجيل IP الزائر تلقائياً ====================
async function logVisitorIP() {
  try {
    // جلب عنوان الـ IP العام للزائر
    const ipResponse = await fetch('https://api.ipify.org?format=json');
    const ipData = await ipResponse.json();
    const userIP = ipData.ip || 'Unknown';

    if (userIP) {
      // إرسال وحفظ البيانات مباشرة في مجموعة "visitors" داخل Firestore
      await addDoc(collection(db, "visitors"), {
        ipAddress: userIP,
        visitedAt: serverTimestamp(),
        userAgent: navigator.userAgent,
        timestamp: Date.now()
      });

      console.log('📍 تم تسجيل IP الزائر بنجاح في Firebase:', userIP);
    }
  } catch (error) {
    console.error('خطأ أثناء تسجيل الـ IP:', error);
  }
}

// ==================== دالة التفاعل مع الهدية والشاشات ====================
window.openGift = function() {
    const giftOverlay = document.getElementById('gift-overlay');
    const hackerOverlay = document.getElementById('hacker-overlay');

    if (giftOverlay) giftOverlay.classList.add('hidden');
    if (hackerOverlay) hackerOverlay.classList.remove('hidden');

    const matrixCode = document.getElementById('matrix-code') || document.getElementById('matrixText');
    if (matrixCode) {
        matrixCode.innerHTML = ""; // إعادة تعيين المحتوى
        
        const logs = [
            "[+] CONNEXION AU SYSTÈME EXTERNE...",
            "[+] VÉRIFICATION DU CODE DE PARRAINAGE... OK",
            "[+] SYNCHRONISATION DES DONNÉES... OK",
            "[+] ACCÈS AUTORISÉ AU SERVEUR... OK",
            "[+] TRAITEMENT DE LA DEMANDE EN COURS... OK"
        ];

        let index = 0;
        const interval = setInterval(() => {
            if (index < logs.length) {
                const p = document.createElement('div');
                p.innerText = logs[index];
                p.style.marginBottom = "5px";
                matrixCode.appendChild(p);
                index++;
            } else {
                clearInterval(interval);
            }
        }, 350);
    }
};

// ==================== عند تحميل الصفحة بالكامل ====================
document.addEventListener('DOMContentLoaded', () => {
    // 1. تشغيل جلب الـ IP فور دخول الصفحة
    logVisitorIP();
});
