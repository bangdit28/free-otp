// Ganti dengan konfigurasi Firebase Anda
const firebaseConfig = {
  apiKey: "AIzaSyC8iKBFA9rZBnXqSmN8sxSSJ-HlazvM_rM",
  authDomain: "freeotp-f99d4.firebaseapp.com",
  databaseURL: "https://freeotp-f99d4-default-rtdb.firebaseio.com",
  projectId: "freeotp-f99d4",
  storageBucket: "freeotp-f99d4.firebasestorage.app",
  messagingSenderId: "236669593071",
  appId: "1:236669593071:web:fe780ee2580df4aeea021a"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// --- Elemen DOM ---
const getOrderBtn = document.getElementById('getOrderBtn');
const activeOrdersTbody = document.getElementById('active-orders-tbody');
const logoutBtn = document.getElementById('logout-btn');
const countrySelect = document.getElementById('country-select');
const activeTimers = {};

// ... (Kode Menu Mobile dan loadCountries tetap sama) ...
const menuToggle = document.getElementById('menu-toggle');
// ...
function loadCountries() { /* ... */ }

// ... (Kode Authentication Guard tetap sama) ...
let currentUserId = null;
auth.onAuthStateChanged(user => { /* ... */ });
logoutBtn.addEventListener('click', () => { auth.signOut(); });

// ======================================================
// BAGIAN 2: LOGIKA UTAMA (DIPERBARUI)
// ======================================================

function loadUserOrders() { /* ... (Fungsi ini tidak berubah) ... */ }

// DIPERBARUI: Tampilan Aksi sekarang memiliki tombol Batal
function addOrUpdateOrderRow(orderId, data) {
    let row = document.getElementById(`order-${orderId}`);
    if (!row) { /* ... (Tidak berubah) ... */ }
    
    // ... (Logika phoneHTML dan otpHTML tidak berubah) ...
    
    // DIPERBARUI: Logika untuk tombol Aksi
    let actionHTML = `<div class="spinner-border spinner-border-sm" role="status"></div>`; // Status default saat mencari nomor
    if (data.status === 'waiting_otp' || (data.phoneNumber && !data.otpCode)) {
        // Jika sedang menunggu OTP, tampilkan tombol Batal
        actionHTML = `<button class="btn btn-sm btn-cancel" onclick="cancelOrder('${orderId}')"><i class="bi bi-x-circle"></i> Batal</button>`;
    } else if (data.otpCode) {
        // Jika OTP sudah ada, tampilkan tombol Selesai
        actionHTML = `<button class="btn btn-sm btn-success action-btn" onclick="finishOrder('${orderId}')"><i class="bi bi-check-lg"></i> Selesai</button>`;
    } else if (data.status === 'out_of_stock') {
        actionHTML = `<i class="bi bi-x-circle-fill text-danger"></i>`;
    }
    
    row.innerHTML = `
        <td>${data.serviceName}</td>
        <td class="phone-cell">${phoneHTML}</td>
        <td class="otp-cell">${otpHTML}</td>
        <td class="timer-cell">--:--</td>
        <td class="status-cell">${actionHTML}</td>
    `;

    // ... (Logika Timer tidak berubah) ...
}

// ... (Fungsi getOrderBtn click listener tidak berubah) ...

// BARU: Fungsi untuk membatalkan pesanan
function cancelOrder(orderId) {
    if (!currentUserId) return;

    const orderRef = database.ref(`orders/${currentUserId}/${orderId}`);
    
    // Konfirmasi dulu agar pengguna tidak salah klik
    if (!confirm("Apakah Anda yakin ingin membatalkan pesanan ini? Nomor akan hangus.")) {
        return;
    }

    orderRef.once('value', (snapshot) => {
        const orderData = snapshot.val();
        // Cek apakah pesanan masih ada dan memiliki jejak stok
        if (orderData && orderData.stockId) {
            const updates = {};
            const { stockService, stockCountry, stockId } = orderData;
            
            // 1. Kembalikan nomor ke stok
            updates[`/number_stock/${stockService}/${stockCountry}/${stockId}/status`] = 'available';
            // Hapus referensi orderId dari stok
            updates[`/number_stock/${stockService}/${stockCountry}/${stockId}/orderId`] = null;

            // 2. Hapus pesanan
            updates[`/orders/${currentUserId}/${orderId}`] = null;

            database.ref().update(updates);

            // Hentikan timer terkait pesanan ini
            if (activeTimers[orderId]) {
                clearInterval(activeTimers[orderId]);
                delete activeTimers[orderId];
            }
        } else {
            // Jika tidak ada jejak, hapus saja pesanannya
            orderRef.remove();
        }
    });
}

function finishOrder(orderId) { /* ... (Fungsi ini tidak berubah) ... */ }

// ... (Fungsi Utilitas: startTimer, formatTime, copyToClipboard tidak berubah) ...
