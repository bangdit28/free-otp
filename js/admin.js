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
const countryListUl = document.getElementById('country-list-ul'); // Baru
const addCountryBtn = document.getElementById('add-country-btn'); // Baru
const newCountryNameInput = document.getElementById('new-country-name'); // Baru
const ordersRef = database.ref('orders');
const numberStockRef = database.ref('number_stock');
const configRef = database.ref('config'); // Referensi baru
const addStockBtn = document.getElementById('add-stock-btn');
// ... (Sisa elemen DOM sama seperti sebelumnya)

// ======================================================
// BAGIAN BARU: MANAJEMEN NEGARA
// ======================================================

function refreshCountryListModal(countries) {
    countryListUl.innerHTML = '';
    for (const key in countries) {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center bg-dark text-white';
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
        alert("Nama negara tidak boleh kosong.");
        return;
    }
    const countryKey = countryName.toLowerCase().replace(/\s+/g, ''); // Contoh: "Hong Kong" -> "hongkong"
    
    configRef.child('countries').child(countryKey).set(countryName)
        .then(() => {
            newCountryNameInput.value = '';
            // Data akan otomatis di-refresh oleh listener di loadCountries
        })
        .catch(error => alert("Gagal menambah negara: " + error.message));
}

function deleteCountry(countryKey) {
    if (!confirm(`Anda yakin ingin menghapus negara ini? Stok yang terkait TIDAK akan dihapus.`)) {
        return;
    }
    configRef.child('countries').child(countryKey).remove()
        .catch(error => alert("Gagal menghapus negara: " + error.message));
}

addCountryBtn.addEventListener('click', addCountry);

// ======================================================
// FUNGSI MEMUAT KONFIGURASI (DIPERBARUI)
// ======================================================

function loadConfig() {
    configRef.on('value', (snapshot) => {
        const config = snapshot.val() || {};
        const countries = config.countries || {};
        
        // 1. Perbarui Modal
        refreshCountryListModal(countries);
        
        // 2. Perbarui Dropdown Utama
        const currentCountry = countrySelect.value;
        countrySelect.innerHTML = '';
        if (Object.keys(countries).length > 0) {
            for (const key in countries) {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = countries[key];
                countrySelect.appendChild(option);
            }
            // Coba pertahankan negara yang dipilih sebelumnya
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
// ... (Fungsi-fungsi di sini TIDAK BERUBAH) ...
function showFeedback(message, isError = false) { /* ... */ }
addStockBtn.addEventListener('click', () => { /* ... */ });
function updateStockCount() { /* ... */ }
function listenToRanges() { /* ... */ }
function deleteRange(service, country, rangeName) { /* ... */ }
function deleteOldStock() { /* ... */ }
serviceSelect.addEventListener('change', () => { updateStockCount(); listenToRanges(); });
countrySelect.addEventListener('change', () => { updateStockCount(); listenToRanges(); });


// ======================================================
// BAGIAN 2: MANAJEMEN PESANAN (PERBAIKAN BUG)
// ======================================================
function assignNumberToOrder(userId, orderId, service, country) { /* ... (Tidak berubah) ... */ }
function sendOtp(button) { /* ... (Tidak berubah) ... */ }
function checkAndSetPlaceholder() { /* ... (Tidak berubah) ... */ }

// FUNGSI UTAMA YANG DIPERBAIKI UNTUK MENGHILANGKAN BUG TAMPILAN
function attachListenersToUser(userId) {
    const userOrdersRef = database.ref(`orders/${userId}`);

    const processOrderSnapshot = (orderSnapshot) => {
        const orderId = orderSnapshot.key;
        const order = orderSnapshot.val();

        // PENGECEKAN KETAT: Abaikan jika data bukan objek valid atau tidak punya status
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
            let phoneHTML = (order.status === 'waiting_otp' && order.phoneNumber) ? `<strong>${order.phoneNumber}</strong>` : `<span class="text-warning">Mencari...</span>`;
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
    
    // Dengarkan untuk pesanan BARU
    userOrdersRef.on('child_added', processOrderSnapshot);

    // Dengarkan untuk perubahan (misal: status jadi completed atau dapat nomor)
    userOrdersRef.on('child_changed', (snapshot) => {
        const orderId = snapshot.key;
        const order = snapshot.val();
        const row = document.getElementById(`order-${orderId}`);
        if (!row) return;

        const inactiveStatuses = ['completed', 'expired', 'finished_by_user', 'canceled'];
        if (inactiveStatuses.includes(order.status)) {
            row.remove(); checkAndSetPlaceholder(); return;
        }

        const phoneCell = row.querySelector('.phone-cell');
        if (order.status === 'out_of_stock') {
            phoneCell.innerHTML = '<strong><span class="text-danger">STOK HABIS!</span></strong>';
        } else if (order.phoneNumber) {
            phoneCell.innerHTML = `<strong>${order.phoneNumber}</strong>`;
        }
    });

    // Dengarkan untuk pesanan yang dihapus (dibatalkan oleh user)
    userOrdersRef.on('child_removed', (snapshot) => {
        const row = document.getElementById(`order-${snapshot.key}`);
        if (row) { row.remove(); checkAndSetPlaceholder(); }
    });
}

ordersRef.on('child_added', (userSnapshot) => {
    if (typeof userSnapshot.val() === 'object' && userSnapshot.val() !== null) {
        attachListenersToUser(userSnapshot.key);
    }
});

// Jalankan sekali saat load untuk menangkap semua pesanan yang sudah aktif
ordersRef.once('value', (snapshot) => {
    if (!snapshot.exists()) {
        checkAndSetPlaceholder();
        return;
    }
    snapshot.forEach(userSnapshot => {
        if (typeof userSnapshot.val() === 'object' && userSnapshot.val() !== null) {
            userSnapshot.forEach(orderSnapshot => {
                // Jalankan logika yang sama seperti 'child_added'
                // (Ini sedikit redundan dengan listener di atas, tapi memastikan semua state tertangkap saat refresh)
                const order = orderSnapshot.val();
                if (order && (order.status === 'waiting_number' || order.status === 'waiting_otp')) {
                    // Logic to add row if not exists... (sudah dicakup oleh listener 'on')
                }
            });
        }
    });
});


// ======================================================
// BAGIAN 3: MANAJEMEN DEPOSIT
// ======================================================
// ... (Fungsi approveDeposit dan listenToDepositRequests tidak berubah) ...
listenToDepositRequests();
