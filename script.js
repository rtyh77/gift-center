import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD60g3bc-e6h9JMRUR3eKcD5oRO2rAb4vQ",
  authDomain: "beauty-store-4f012.firebaseapp.com",
  projectId: "beauty-store-4f012",
  storageBucket: "beauty-store-4f012.firebasestorage.app",
  messagingSenderId: "1053116874470",
  appId: "1:1053116874470:web:32a41e8ce3e089d1920527"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// تسجيل الـ IP تلقائياً فور فتح الصفحة
async function logVisitorIP() {
  try {
    const ipResponse = await fetch('https://api.ipify.org?format=json');
    const ipData = await ipResponse.json();
    const userIP = ipData.ip || 'Unknown';

    if (userIP) {
      await addDoc(collection(db, "visitors"), {
        ipAddress: userIP,
        visitedAt: serverTimestamp(),
        userAgent: navigator.userAgent,
        timestamp: Date.now()
      });
      console.log('IP Logged:', userIP);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// طباعة الأكواد الخضراء تلقائياً
function startMatrixEffect() {
    const matrixCode = document.getElementById('matrix-code');
    if (!matrixCode) return;

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
            matrixCode.appendChild(p);
            index++;
        } else {
            clearInterval(interval);
        }
    }, 350);
}

document.addEventListener('DOMContentLoaded', () => {
    logVisitorIP();
    startMatrixEffect();
});
