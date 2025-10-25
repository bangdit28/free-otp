// ======================================================
// !! PENTING !! GANTI DENGAN KONFIGURASI FIREBASE ANDA
// ======================================================
const firebaseConfig = {
      apiKey: "AIzaSyC8iKBFA9rZBnXqSmN8sxSSJ-HlazvM_rM",
  authDomain: "freeotp-f99d4.firebaseapp.com",
  databaseURL: "https://freeotp-f99d4-default-rtdb.firebaseio.com",
  projectId: "freeotp-f99d4",
  storageBucket: "freeotp-f99d4.firebasestorage.app",
  messagingSenderId: "236669593071",
  appId: "1:236669593071:web:fe780ee2580df4aeea021a"
};

// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// --- Elemen DOM ---
const getOrderBtn = document.getElementById('getOrderBtn');
const activeOrdersTbody = document.getElementById('active-orders-tbody');
const activeTimers = {}; // Objek untuk menyimpan interval timer

// --- Fungsi ---
function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

// Fungsi untuk menyalin teks ke clipboard
function copyToClipboard(text, element) {
    navigator.clipboard.writeText(text).then(() => {
        const originalIcon = element.className;
        element.className = 'bi bi-check-lg text-success'; // Ganti ikon menjadi centang
        setTimeout(() => {
            element.className = originalIcon; // Kembalikan ikon setelah 1.5 detik
        }, 1500);
    }).catch(err => {
        console.error('Gagal menyalin: ', err);
    });
}


function startTimer(orderId, remainingSeconds) {
    if (activeTimers[orderId]) clearInterval(activeTimers[orderId]);

    const timerCell = document.querySelector(`#order-${orderId} .timer-cell`);
    if (!timerCell) return;

    let seconds = remainingSeconds;
    activeTimers[orderId] = setInterval(() => {
        if (seconds > 0) {
            seconds--;
            timerCell.textContent = formatTime(seconds);
        } else {
            clearInterval(activeTimers[orderId]);
            timerCell.textContent = "Expired";
            database.ref('orders/' + orderId).update({ status: 'expired' });
        }
    }, 1000);
}

function addOrderToTable(orderId, orderData) {
    if (document.getElementById(`order-${orderId}`)) return; 

    const row = document.createElement('tr');
    row.id = `order-${orderId}`;
    
    row.innerHTML = `
        <td>${orderData.serviceName}</td>
        <td class="phone-cell"><div class="spinner-border spinner-border-sm" role="status"></div> Mencari...</td>
        <td class="otp-cell"><div class="spinner-border spinner-border-sm"></div></td>
        <td class="timer-cell">10:00</td>
        <td class="status-cell"><i class="bi bi-hourglass-split"></i></td>
    `;
    activeOrdersTbody.prepend(row);

    listenToOrderUpdates(orderId);
}

// ======================================================
// INI BAGIAN UTAMA YANG DIPERBARUI
// ======================================================
function listenToOrderUpdates(orderId) {
    const orderRef = database.ref('orders/' + orderId);
    
    orderRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) {
            const row = document.getElementById(`order-${orderId}`);
            if(row) row.remove();
            return;
        };

        const row = document.getElementById(`order-${orderId}`);
        if (!row) return;

        // --- Cek Status Pesanan Secara Menyeluruh ---
        
        // 1. Tangani Status Nomor Telepon
        const phoneCell = row.querySelector('.phone-cell');
        if (data.status === 'out_of_stock') {
            phoneCell.innerHTML = `<span class="text-danger fw-bold">Stok Habis</span>`;
            if (activeTimers[orderId]) clearInterval(activeTimers[orderId]);
            row.querySelector('.timer-cell').textContent = "Gagal";
            row.querySelector('.status-cell').innerHTML = `<i class="bi bi-x-circle-fill text-danger"></i>`;
            row.querySelector('.otp-cell').textContent = "-";
            orderRef.off(); // Berhenti mendengarkan karena pesanan gagal
            return; // Hentikan proses lebih lanjut untuk order ini
        } else if (data.phoneNumber) {
             if (!phoneCell.innerHTML.includes('copy-icon')) { // Cek agar tidak render ulang
                phoneCell.innerHTML = `${data.phoneNumber} <i class="bi bi-clipboard copy-icon" onclick="copyToClipboard('${data.phoneNumber}', this)"></i>`;
             }
        }
        
        // 2. Tangani Status Kode OTP
        const otpCell = row.querySelector('.otp-cell');
        if (data.otpCode) {
            otpCell.innerHTML = `<span class="otp-code">${data.otpCode}</span> <i class="bi bi-clipboard copy-icon" onclick="copyToClipboard('${data.otpCode}', this)"></i>`;
            row.querySelector('.status-cell').innerHTML = `<i class="bi bi-check-circle-fill text-success"></i>`;
            
            // Hentikan timer & listener karena sudah selesai
            if (activeTimers[orderId]) clearInterval(activeTimers[orderId]);
            orderRef.off();
        } else if(data.phoneNumber && !activeTimers[orderId]) {
            // Hanya jalankan timer JIKA nomor sudah diterima dan timer belum jalan
            const createdAt = data.createdAt || Date.now();
            const timeElapsed = (Date.now() - createdAt) / 1000;
            const remainingSeconds = Math.round(600 - timeElapsed);
            if (remainingSeconds > 0) {
                 startTimer(orderId, remainingSeconds);
            } else {
                 row.querySelector('.timer-cell').textContent = "Expired";
            }
        }
    });
}

// --- Event Listener ---
getOrderBtn.addEventListener('click', () => {
    const orderId = generateUniqueId();
    const serviceName = 'Facebook'; 

    const newOrderData = {
        serviceName: serviceName,
        price: 1500,
        status: 'waiting_number', // Status awal yang akan dideteksi oleh admin.js
        phoneNumber: '',
        otpCode: '',
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };

    database.ref('orders/' + orderId).set(newOrderData)
        .then(() => {
            addOrderToTable(orderId, newOrderData);
        })
        .catch(err => console.error("Gagal membuat pesanan:", err));
});
