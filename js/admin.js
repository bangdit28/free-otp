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
const countryListUl = document.getElementById('country-list-ul');
const addCountryBtn = document.getElementById('add-country-btn');
const newCountryNameInput = document.getElementById('new-country-name');
const countryFeedback = document.getElementById('country-feedback');
const ordersRef = database.ref('orders');
const numberStockRef = database.ref('number_stock');
const configRef = database.ref('config');
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
// BAGIAN BARU: MANAJEMEN NEGARA
// ======================================================

function showCountryFeedback(message, isSuccess = true) {
    countryFeedback.textContent = message;
    countryFeedback.className = isSuccess ? 'form-text mt-2 text-success' : 'form-text mt-2 text-danger';
    setTimeout(() => countryFeedback.textContent = '', 3000);
}

function refreshCountryListModal(countries) {
    countryListUl.innerHTML = '';
    if (Object.keys(countries).length === 0) {
        countryListUl.innerHTML = '<li class="list-group-item bg-dark text-white">Belum ada negara.</li>';
        return;
    }
    for (const key in countries) {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center bg-dark text-white border-secondary';
        li.textContent = countries[key];
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-sm btn-outline-danger';
        deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';
        deleteBtn.onclick = () => deleteCountry(key);
        li.appendChild(deleteBtn);
        countryListUl.appendChild(li);
    }
}

function addCountry() {
    const countryName = newCountryNameInput.value.trim();
    if (!countryName) {
        showCountryFeedback("Nama negara tidak boleh kosong.", false);
        return;
    }
    const countryKey = countryName.toLowerCase().replace(/\s+/g, '-');
    configRef.child('countries').child(countryKey).set(countryName)
        .then(() => {
            showCountryFeedback(`"${countryName}" berhasil ditambahkan.`);
            newCountryNameInput.value = '';
        })
        .catch(error => showCountryFeedback("Gagal: " + error.message, false));
}

function deleteCountry(countryKey) {
    if (!confirm(`Anda yakin ingin menghapus negara ini? Stok nomor yang terkait TIDAK akan ikut terhapus.`)) {
        return;
    }
    configRef.child('countries').child(countryKey).remove()
        .then(() => showCountryFeedback("Negara berhasil dihapus."))
        .catch(error => showCountryFeedback("Gagal menghapus: " + error.message, false));
}

addCountryBtn.addEventListener('click', addCountry);

// ======================================================
// FUNGSI MEMUAT KONFIGURASI
// ======================================================
function loadConfig() {
    configRef.on('value', (snapshot) => {
        const config = snapshot.val() || {};
        const countries = config.countries || {};
        refreshCountryListModal(countries);
        const currentCountry = countrySelect.value;
        countrySelect.innerHTML = '';
        if (Object.keys(countries).length > 0) {
            for (const key in countries) {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = countries[key];
                countrySelect.appendChild(option);
            }
            if (currentCountry && countries[currentCountry]) {
                countrySelect.value = currentCountry;
            }
        } else {
            countrySelect.innerHTML = '<option>Tambahkan negara</option>';
        }
        updateStockCount();
        listenToRanges();
    });
}
loadConfig();

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
// BAGIAN 2: MANAJEMEN PESANAN
// ======================================================
function assignNumberToOrder(userId, orderId, service, country) { /* ... (Tidak berubah) ... */ }
function sendOtp(button) { /* ... (Tidak berubah) ... */ }
function checkAndSetPlaceholder() {
    if (tableBody.children.length === 0 || (tableBody.children.length === 1 && tableBody.firstElementChild.classList.contains('placeholder-row'))) {
        tableBody.innerHTML = '<tr class="placeholder-row"><td colspan="5" class="text-center">Tidak ada pesanan aktif.</td></tr>';
    } else {
        const placeholder = tableBody.querySelector('.placeholder-row');
        if (placeholder) placeholder.remove();
    }
}

// PERBAIKAN BUG "KIRIM OTP BANYAK"
const activeOrders = new Set();
function attachListenersToUser(userId) {
    const userOrdersRef = database.ref(`orders/${userId}`);
    const activeStatuses = ['waiting_number', 'waiting_otp'];

    const handleOrder = (orderSnapshot) => {
        const orderId = orderSnapshot.key;
        const order = orderSnapshot.val();

        if (typeof order !== 'object' || order === null || !order.status) {
            return;
        }

        const isOrderActive = activeStatuses.includes(order.status);

        if (isOrderActive) {
            activeOrders.add(orderId); // Tandai sebagai aktif
            const rowExists = document.getElementById(`order-${orderId}`);
            if (!rowExists) {
                checkAndSetPlaceholder();
                if (order.status === 'waiting_number') {
                    assignNumberToOrder(userId, orderId, order.serviceName.toLowerCase(), order.country);
                }
                const row = document.createElement('tr');
                row.id = `order-${orderId}`;
                let phoneHTML = (order.status === 'waiting_otp' && order.phoneNumber) ? `<strong>${order.phoneNumber}</strong>` : `<span class="text-warning">Mencari...</span>`;
                const countryDisplay = order.country ? `(${order.country.toUpperCase()})` : '';
                row.innerHTML = `<td>${orderId.substring(0,8)}...</td><td>${order.serviceName} ${countryDisplay}</td><td class="phone-cell">${phoneHTML}</td><td><input type="text" class="form-control otp-input" placeholder="Masukkan OTP"></td><td><button class="btn btn-success btn-send-otp" data-user-id="${userId}" data-order-id="${orderId}" onclick="sendOtp(this)">Kirim</button></td>`;
                tableBody.appendChild(row);
            }
        }
    };

    userOrdersRef.on('child_added', handleOrder);
    userOrdersRef.on('child_changed', (snapshot) => {
        const orderId = snapshot.key;
        const order = snapshot.val();
        if (!activeOrders.has(orderId) && activeStatuses.includes(order.status)) {
            handleOrder(snapshot); // Proses jika order menjadi aktif lagi
        } else {
            const row = document.getElementById(`order-${orderId}`);
            if (!row) return;
            const inactiveStatuses = ['completed', 'expired', 'finished_by_user', 'canceled'];
            if (inactiveStatuses.includes(order.status)) {
                row.remove();
                activeOrders.delete(orderId);
                checkAndSetPlaceholder();
                return;
            }
            const phoneCell = row.querySelector('.phone-cell');
            if (order.status === 'out_of_stock') {
                phoneCell.innerHTML = '<strong><span class="text-danger">STOK HABIS!</span></strong>';
            } else if (order.phoneNumber) {
                phoneCell.innerHTML = `<strong>${order.phoneNumber}</strong>`;
            }
        }
    });

    userOrdersRef.on('child_removed', (snapshot) => {
        const row = document.getElementById(`order-${snapshot.key}`);
        if (row) {
            row.remove();
            activeOrders.delete(snapshot.key);
            checkAndSetPlaceholder();
        }
    });
}

ordersRef.on('child_added', (userSnapshot) => {
    if (typeof userSnapshot.val() === 'object' && userSnapshot.val() !== null) {
        attachListenersToUser(userSnapshot.key);
    }
});
ordersRef.once('value', (snapshot) => {
    snapshot.forEach(userSnapshot => {
        if (typeof userSnapshot.val() === 'object' && userSnapshot.val() !== null) {
            userSnapshot.forEach(orderSnapshot => {
                const order = orderSnapshot.val();
                if (order && (order.status === 'waiting_number' || order.status === 'waiting_otp')) {
                    // Cukup pasang listener, tidak perlu proses manual di sini
                }
            });
        }
    });
    checkAndSetPlaceholder();
});

// ======================================================
// BAGIAN 3: MANAJEMEN DEPOSIT
// ======================================================
function approveDeposit(depositId) { /* ... (Tidak berubah) ... */ }
function listenToDepositRequests() { /* ... (Tidak berubah) ... */ }
listenToDepositRequests();
