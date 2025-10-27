// Ganti dengan konfigurasi Firebase Anda
const firebaseConfig = {
    const firebaseConfig = {
  apiKey: "AIzaSyC8iKBFA9rZBnXqSmN8sxSSJ-HlazvM_rM",
  authDomain: "freeotp-f99d4.firebaseapp.com",
  databaseURL: "https://freeotp-f99d4-default-rtdb.firebaseio.com",
  projectId: "freeotp-f99d4",
  storageBucket: "freeotp-f99d4.firebasestorage.app",
  messagingSenderId: "236669593071",
  appId: "1:236669593071:web:fe780ee2580df4aeea021a"
};

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
    const countriesRef = database.ref('config/countries');
    countriesRef.once('value', (snapshot) => {
        const countries = snapshot.val();
        if (countries) {
            countrySelect.innerHTML = '';
            for (const key in countries) {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = countries[key];
                countrySelect.appendChild(option);
            }
            updateStockCount();
            listenToRanges();
        } else {
            countrySelect.innerHTML = '<option>Konfigurasi negara!</option>';
        }
    });
}
loadCountries();

// ======================================================
// BAGIAN 1: MANAJEMEN STOK & RANGE
// ======================================================
function showFeedback(message, isError = false) { /* ... (Fungsi lengkap ada di versi sebelumnya, tidak berubah) ... */ }
addStockBtn.addEventListener('click', () => { /* ... (Fungsi lengkap ada di versi sebelumnya, tidak berubah) ... */ });
function updateStockCount() { /* ... (Fungsi lengkap ada di versi sebelumnya, tidak berubah) ... */ }
function listenToRanges() { /* ... (Fungsi lengkap ada di versi sebelumnya, tidak berubah) ... */ }
function deleteRange(service, country, rangeName) { /* ... (Fungsi lengkap ada di versi sebelumnya, tidak berubah) ... */ }
function deleteOldStock() { /* ... (Fungsi lengkap ada di versi sebelumnya, tidak berubah) ... */ }
serviceSelect.addEventListener('change', () => { updateStockCount(); listenToRanges(); });
countrySelect.addEventListener('change', () => { updateStockCount(); listenToRanges(); });

// ======================================================
// BAGIAN 2: MANAJEMEN PESANAN
// ======================================================
function assignNumberToOrder(userId, orderId, service, country) {
    const stockRef = numberStockRef.child(service).child(country);
    stockRef.orderByChild('status').equalTo('available').limitToFirst(1).once('value', (snapshot) => {
        if (snapshot.exists()) {
            const stockId = Object.keys(snapshot.val())[0];
            const stockData = snapshot.val()[stockId];
            const updates = {};
            updates[`/orders/${userId}/${orderId}/phoneNumber`] = stockData.number;
            updates[`/orders/${userId}/${orderId}/status`] = 'waiting_otp';
            updates[`/orders/${userId}/${orderId}/stockId`] = stockId;
            updates[`/orders/${userId}/${orderId}/stockService`] = service;
            updates[`/orders/${userId}/${orderId}/stockCountry`] = country;
            updates[`/number_stock/${service}/${country}/${stockId}/status`] = 'in_use';
            updates[`/number_stock/${service}/${country}/${stockId}/orderId`] = orderId;
            database.ref().update(updates);
        } else {
            database.ref(`/orders/${userId}/${orderId}/status`).set('out_of_stock');
        }
    });
}

function sendOtp(button) {
    const { userId, orderId } = button.dataset;
    const otpInput = button.closest('tr').querySelector('.otp-input');
    const otpCode = otpInput.value.trim();
    if (!otpCode) { alert('Kode OTP tidak boleh kosong!'); return; }
    const orderRef = database.ref(`orders/${userId}/${orderId}`);
    orderRef.once('value', (snapshot) => {
        const orderData = snapshot.val();
        if (!orderData || !orderData.stockId) { console.error("Tidak bisa menemukan jejak stok!"); return; }
        const updates = {};
        updates[`/orders/${userId}/${orderId}/otpCode`] = otpCode;
        updates[`/orders/${userId}/${orderId}/status`] = 'completed';
        const { stockService, stockCountry, stockId } = orderData;
        updates[`/number_stock/${stockService}/${stockCountry}/${stockId}/status`] = 'finished';
        database.ref().update(updates);
    });
}

function checkAndSetPlaceholder() {
    if (tableBody.children.length === 0 || (tableBody.children.length === 1 && tableBody.firstElementChild.classList.contains('placeholder-row'))) {
        tableBody.innerHTML = '<tr class="placeholder-row"><td colspan="5" class="text-center">Tidak ada pesanan aktif.</td></tr>';
    } else {
        const placeholder = tableBody.querySelector('.placeholder-row');
        if (placeholder) placeholder.remove();
    }
}

function attachListenersToUser(userId) {
    const userOrdersRef = database.ref(`orders/${userId}`);
    userOrdersRef.on('child_added', (orderSnapshot) => {
        const orderId = orderSnapshot.key;
        const order = orderSnapshot.val();
        const activeStatuses = ['waiting_number', 'waiting_otp'];
        if (activeStatuses.includes(order.status) && !document.getElementById(`order-${orderId}`)) {
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
            row.innerHTML = `<td>${orderId.substring(0,8)}...</td><td>${order.serviceName} (${order.country})</td><td class="phone-cell">${phoneHTML}</td><td><input type="text" class="form-control otp-input" placeholder="Masukkan OTP"></td><td><button class="btn btn-success btn-send-otp" data-user-id="${userId}" data-order-id="${orderId}" onclick="sendOtp(this)">Kirim</button></td>`;
            tableBody.appendChild(row);
        }
    });
    userOrdersRef.on('child_changed', (orderSnapshot) => {
        const orderId = orderSnapshot.key;
        const order = orderSnapshot.val();
        const row = document.getElementById(`order-${orderId}`);
        if (!row) return;
        const completedStatuses = ['completed', 'expired', 'finished_by_user'];
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
    const userId = userSnapshot.key;
    attachListenersToUser(userId);
});
ordersRef.once('value', (snapshot) => {
    if (!snapshot.exists()) {
        checkAndSetPlaceholder();
    }
});

// ======================================================
// BAGIAN 3: MANAJEMEN DEPOSIT
// =========================
