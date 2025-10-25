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
    return Date.now().toString(36);
}

function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

function startTimer(orderId, remainingSeconds) {
    if (activeTimers[orderId]) clearInterval(activeTimers[orderId]);

    const timerCell = document.querySelector(`#order-${orderId} .timer-cell`);
    if (!timerCell) return;

    let seconds = remainingSeconds;
    activeTimers[orderId] = setInterval(() => {
        seconds--;
        if (seconds >= 0) {
            timerCell.textContent = formatTime(seconds);
        } else {
            clearInterval(activeTimers[orderId]);
            timerCell.textContent = "Expired";
            // Opsional: Update status di Firebase
            database.ref('orders/'' + orderId).update({ status: 'expired' });
        }
    }, 1000);
}

function addOrderToTable(orderId, orderData) {
    if (document.getElementById(`order-${orderId}`)) return; // Jangan tambahkan jika sudah ada

    const row = document.createElement('tr');
    row.id = `order-${orderId}`;
    
    // Tentukan status awal
    const phone = orderData.phoneNumber || 'Menunggu nomor...';
    const otp = orderData.otpCode ? `<span class="otp-code">${orderData.otpCode}</span>` : '<div class="spinner-border spinner-border-sm"></div>';
    
    row.innerHTML = `
        <td>${orderData.serviceName}</td>
        <td class="phone-cell">${phone}</td>
        <td class="otp-cell">${otp}</td>
        <td class="timer-cell">10:00</td>
        <td class="status-cell"><i class="bi bi-hourglass-split"></i></td>
    `;
    activeOrdersTbody.prepend(row);

    listenToOrderUpdates(orderId);
}

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

        // Update Nomor Telepon
        const phoneCell = row.querySelector('.phone-cell');
        if (data.phoneNumber && phoneCell.innerHTML.includes('Menunggu')) {
            phoneCell.innerHTML = `${data.phoneNumber} <i class="bi bi-clipboard copy-icon" onclick="copyToClipboard('${data.phoneNumber}')"></i>`;
        }
        
        // Update Kode OTP
        const otpCell = row.querySelector('.otp-cell');
        if (data.otpCode) {
            otpCell.innerHTML = `<span class="otp-code">${data.otpCode}</span> <i class="bi bi-clipboard copy-icon" onclick="copyToClipboard('${data.otpCode}')"></i>`;
            row.querySelector('.status-cell').innerHTML = `<i class="bi bi-check-circle-fill text-success"></i>`;
            
            // Hentikan timer & listener
            if (activeTimers[orderId]) clearInterval(activeTimers[orderId]);
            orderRef.off();
        } else {
            // Jalankan timer jika belum berjalan
            const timeElapsed = (Date.now() - data.createdAt) / 1000;
            const remainingSeconds = Math.round(600 - timeElapsed);
            if (!activeTimers[orderId] && remainingSeconds > 0) {
                 startTimer(orderId, remainingSeconds);
            }
        }
    });
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Teks disalin!');
    });
}

// --- Event Listener ---
getOrderBtn.addEventListener('click', () => {
    const orderId = generateUniqueId();
    const serviceName = 'Facebook'; // Ambil dari data-attribute jika ada banyak layanan

    const newOrderData = {
        serviceName: serviceName,
        price: 1500,
        status: 'waiting_number',
        phoneNumber: '',
        otpCode: '',
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };

    // Tulis ke Firebase
    database.ref('orders/' + orderId).set(newOrderData)
        .then(() => {
            console.log(`Pesanan ${orderId} berhasil dibuat.`);
            // Buat baris placeholder sementara sebelum data Firebase kembali
            const placeholderData = { serviceName, createdAt: Date.now() };
            addOrderToTable(orderId, placeholderData);
        })
        .catch(err => console.error("Gagal membuat pesanan:", err));

});
