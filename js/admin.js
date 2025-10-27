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
const rangeListTbody = document.getElementById('range-list-tbody');
const ordersRef = database.ref('orders');
const numberStockRef = database.ref('number_stock');
const addStockBtn = document.getElementById('add-stock-btn');
const numberTextarea = document.getElementById('number-textarea');
const serviceSelect = document.getElementById('service-select');
const countrySelect = document.getElementById('country-select');
const rangeNameInput = document.getElementById('range-name-input');
const stockCountDisplay = document.getElementById('stock-count-display');
const feedbackMessage = document.getElementById('feedback-message');
const depositRequestsTbody = document.getElementById('deposit-requests-tbody');
const depositRequestsRef = database.ref('deposit_requests');

// ======================================================
// FUNGSI MEMUAT NEGARA
// ======================================================
function loadCountries() {
    // ... (Tidak berubah dari versi sebelumnya) ...
}
loadCountries();

// ======================================================
// BAGIAN 1: MANAJEMEN STOK & RANGE
// ======================================================
function showFeedback(message, isError = false) { /* ... (Tidak berubah) ... */ }
addStockBtn.addEventListener('click', () => { /* ... (Tidak berubah) ... */ });
function updateStockCount() { /* ... (Tidak berubah) ... */ }
function listenToRanges() { /* ... (Tidak berubah) ... */ }
function deleteRange(service, country, rangeName) { /* ... (Tidak berubah) ... */ }
function deleteOldStock() { /* ... (Tidak berubah) ... */ }
serviceSelect.addEventListener('change', () => { updateStockCount(); listenToRanges(); });
countrySelect.addEventListener('change', () => { updateStockCount(); listenToRanges(); });

// ======================================================
// BAGIAN 2: MANAJEMEN PESANAN (DIPERBARUI)
// ======================================================
function assignNumberToOrder(userId, orderId, service, country) { /* ... (Tidak berubah) ... */ }
function sendOtp(button) { /* ... (Tidak berubah) ... */ }
function checkAndSetPlaceholder() { /* ... (Tidak berubah) ... */ }

// DIPERBARUI SECARA SIGNIFIKAN: Logika listener
function attachListenersToUser(userId) {
    const userOrdersRef = database.ref(`orders/${userId}`);

    const processOrder = (orderSnapshot) => {
        const orderId = orderSnapshot.key;
        const order = orderSnapshot.val();

        // PENGECEKAN KETAT: Abaikan jika data tidak lengkap atau bukan objek yang valid
        if (typeof order !== 'object' || order === null || !order.status) {
            return;
        }

        const activeStatuses = ['waiting_number', 'waiting_otp'];
        const isOrderActive = activeStatuses.includes(order.status);
        const rowExists = document.getElementById(`order-${orderId}`);

        if (isOrderActive && !rowExists) {
            checkAndSetPlaceholder();
            
            if (order.status === 'waiting_number') {
                assignNumberToOrder(userId, orderId, order.serviceName.toLowerCase(), order.country);
            }

            const row = document.createElement('tr');
            row.id = `order-${orderId}`;
            
            let phoneHTML = `<span class="text-warning">Mencari...</span>`;
            if (order.status === 'waiting_otp' && order.phoneNumber) {
                phoneHTML = `<strong>${order.phoneNumber}</strong>`;
            }

            // PERBAIKAN BUG "UNDEFINED": Cek dulu properti 'country' sebelum menampilkannya
            const countryDisplay = order.country ? `(${order.country.toUpperCase()})` : '';
            
            row.innerHTML = `
                <td>${orderId.substring(0, 8)}...</td>
                <td>${order.serviceName} ${countryDisplay}</td>
                <td class="phone-cell">${phoneHTML}</td>
                <td><input type="text" class="form-control otp-input" placeholder="Masukkan OTP"></td>
                <td>
                    <button class="btn btn-success btn-send-otp" data-user-id="${userId}" data-order-id="${orderId}" onclick="sendOtp(this)">Kirim</button>
                </td>
            `;
            tableBody.appendChild(row);
        }
    };

    // Panggil untuk setiap anak yang baru ditambahkan
    userOrdersRef.on('child_added', processOrder);

    // Panggil juga untuk setiap anak yang sudah ada saat listener pertama kali dipasang
    userOrdersRef.once('value', (snapshot) => {
        snapshot.forEach(childSnapshot => {
            processOrder(childSnapshot);
        });
    });

    userOrdersRef.on('child_changed', (orderSnapshot) => {
        const orderId = orderSnapshot.key;
        const order = orderSnapshot.val();
        const row = document.getElementById(`order-${orderId}`);
        if (!row) return;

        const completedStatuses = ['completed', 'expired', 'finished_by_user', 'canceled'];
        if (completedStatuses.includes(order.status)) {
            row.remove();
            checkAndSetPlaceholder();
            return;
        }
        
        const phoneCell = row.querySelector('.phone-cell');
        if (order.status === 'out_of_stock') {
            phoneCell.innerHTML = '<strong><span class="text-danger">STOK HABIS!</span></strong>';
        } else if (order.phoneNumber) {
            phoneCell.innerHTML = `<strong>${order.phoneNumber}</strong>`;
        }
    });

    userOrdersRef.on('child_removed', (orderSnapshot) => {
        const orderId = orderSnapshot.key;
        const row = document.getElementById(`order-${orderId}`);
        if (row) {
            row.remove();
            checkAndSetPlaceholder();
        }
    });
}

ordersRef.on('child_added', (userSnapshot) => {
    // PENGECEKAN KETAT: Pastikan data user adalah objek sebelum memasang listener
    if (typeof userSnapshot.val() === 'object' && userSnapshot.val() !== null) {
        const userId = userSnapshot.key;
        attachListenersToUser(userId);
    }
});

ordersRef.once('value', (snapshot) => {
    if (!snapshot.exists()) {
        checkAndSetPlaceholder();
    }
});

// ======================================================
// BAGIAN 3: MANAJEMEN DEPOSIT
// ======================================================
function approveDeposit(depositId) { /* ... (Tidak berubah) ... */ }
function listenToDepositRequests() { /* ... (Tidak berubah) ... */ }
listenToDepositRequests();
