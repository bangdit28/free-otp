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
const database = firebase.database();

// --- Elemen DOM & Referensi ---
const tableBody = document.getElementById('orders-table-body');
const ordersRef = database.ref('orders');
const numberStockRef = database.ref('number_stock');
const addStockBtn = document.getElementById('add-stock-btn');
const numberTextarea = document.getElementById('number-textarea');
const serviceSelect = document.getElementById('service-select');
const countrySelect = document.getElementById('country-select');
const stockCountDisplay = document.getElementById('stock-count-display');
const feedbackMessage = document.getElementById('feedback-message');

// ... (Fungsi loadCountries dan Manajemen Stok lainnya tetap sama)
function loadCountries() { /* ... */ }
function showFeedback(message, isError = false) { /* ... */ }
addStockBtn.addEventListener('click', () => { /* ... */ });
function updateStockCount() { /* ... */ }
// Panggil fungsi-fungsi ini
loadCountries();
serviceSelect.addEventListener('change', updateStockCount);
countrySelect.addEventListener('change', updateStockCount);


// ======================================================
// BAGIAN 2: MANAJEMEN PESANAN (DIPERBARUI SECARA SIGNIFIKAN)
// ======================================================

// DIPERBARUI: Fungsi ini sekarang menyimpan jejak stok di dalam pesanan
function assignNumberToOrder(userId, orderId, service, country) {
    const stockRef = numberStockRef.child(service).child(country);
    stockRef.orderByChild('status').equalTo('available').limitToFirst(1).once('value', (snapshot) => {
        if (snapshot.exists()) {
            const stockId = Object.keys(snapshot.val())[0]; // ID unik dari nomor di stok
            const stockData = snapshot.val()[stockId];
            
            const updates = {};
            // 1. Update data pesanan
            updates[`/orders/${userId}/${orderId}/phoneNumber`] = stockData.number;
            updates[`/orders/${userId}/${orderId}/status`] = 'waiting_otp';
            // BARU: Simpan jejak stok di dalam pesanan agar bisa dilacak kembali
            updates[`/orders/${userId}/${orderId}/stockId`] = stockId; 
            updates[`/orders/${userId}/${orderId}/stockService`] = service;
            updates[`/orders/${userId}/${orderId}/stockCountry`] = country;

            // 2. Update data stok
            updates[`/number_stock/${service}/${country}/${stockId}/status`] = 'in_use';
            updates[`/number_stock/${service}/${country}/${stockId}/orderId`] = orderId;
            
            database.ref().update(updates);
        } else {
            database.ref(`/orders/${userId}/${orderId}/status`).set('out_of_stock');
        }
    });
}

// DIPERBARUI: Fungsi ini sekarang juga mengubah status stok menjadi 'finished'
function sendOtp(button) {
    const { userId, orderId } = button.dataset;
    const otpInput = button.closest('tr').querySelector('.otp-input');
    const otpCode = otpInput.value.trim();

    if (!otpCode) {
        alert('Kode OTP tidak boleh kosong!');
        return;
    }

    const orderRef = database.ref(`orders/${userId}/${orderId}`);
    
    // Ambil data pesanan sekali untuk mendapatkan jejak stok
    orderRef.once('value', (snapshot) => {
        const orderData = snapshot.val();
        if (!orderData || !orderData.stockId) {
            console.error("Tidak bisa menemukan jejak stok untuk pesanan ini!");
            return;
        }

        const updates = {};
        // 1. Update pesanan menjadi selesai
        updates[`/orders/${userId}/${orderId}/otpCode`] = otpCode;
        updates[`/orders/${userId}/${orderId}/status`] = 'completed';

        // 2. BARU: Gunakan jejak untuk mengunci nomor di stok secara permanen
        const { stockService, stockCountry, stockId } = orderData;
        updates[`/number_stock/${stockService}/${stockCountry}/${stockId}/status`] = 'finished'; // Status final

        database.ref().update(updates);
    });
}

// ... (Sisa fungsi checkAndSetPlaceholder dan attachListenersToUser TIDAK BERUBAH) ...
function checkAndSetPlaceholder() { /* ... */ }
function attachListenersToUser(userId) { /* ... */ }
ordersRef.on('child_added', (userSnapshot) => { /* ... */ });
ordersRef.once('value', (snapshot) => { /* ... */ });
