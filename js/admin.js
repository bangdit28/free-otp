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
function showFeedback(message, isError = false) {
    feedbackMessage.textContent = message;
    feedbackMessage.className = isError ? 'mb-2 text-danger' : 'mb-2 text-success';
    setTimeout(() => {
        feedbackMessage.textContent = '';
        feedbackMessage.className = '';
    }, 4000);
}

addStockBtn.addEventListener('click', () => {
    const service = serviceSelect.value;
    const country = countrySelect.value;
    const rangeName = rangeNameInput.value.trim();
    const numbersRaw = numberTextarea.value.trim();

    if (!rangeName) { showFeedback("Nama Range tidak boleh kosong.", true); return; }
    if (!numbersRaw) { showFeedback('Kolom nomor tidak boleh kosong.', true); return; }
    if (!country) { showFeedback("Negara belum dipilih.", true); return; }

    const numbers = numbersRaw.split('\n').map(n => n.trim()).filter(n => n.length > 0);
    if (numbers.length > 100) { showFeedback('Maksimal 100 nomor sekali tambah.', true); return; }

    addStockBtn.disabled = true;
    addStockBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

    const stockPath = numberStockRef.child(service).child(country);
    let successCount = 0;
    const totalNumbers = numbers.length;

    numbers.forEach(number => {
        const newStockEntry = {
            number: number,
            status: 'available',
            rangeName: rangeName,
            addedAt: firebase.database.ServerValue.TIMESTAMP
        };
        stockPath.push(newStockEntry, (error) => {
            if (!error) successCount++;
            if (successCount === totalNumbers) {
                showFeedback(`Berhasil menambahkan ${successCount} nomor baru.`, false);
                numberTextarea.value = '';
                rangeNameInput.value = '';
                addStockBtn.disabled = false;
                addStockBtn.innerHTML = 'Tambah';
            }
        });
    });
});

function updateStockCount() {
    const service = serviceSelect.value;
    const country = countrySelect.value;
    if (!service || !country) return;

    const stockPath = numberStockRef.child(service).child(country);
    stockPath.orderByChild('status').equalTo('available').on('value', (snapshot) => {
        stockCountDisplay.textContent = `${snapshot.numChildren()} nomor`;
    });
}

function listenToRanges() {
    const service = serviceSelect.value;
    const country = countrySelect.value;
    if (!service || !country) return;

    const stockPath = numberStockRef.child(service).child(country);
    stockPath.on('value', (snapshot) => {
        rangeListTbody.innerHTML = '<tr><td colspan="4" class="text-center">Memuat data range...</td></tr>';
        const numbers = snapshot.val();
        if (!numbers) {
            rangeListTbody.innerHTML = '<tr><td colspan="4" class="text-center">Tidak ada range untuk kombinasi ini.</td></tr>';
            return;
        }

        const aggregatedRanges = {};
        for (const stockId in numbers) {
            const numberData = numbers[stockId];
            if (!numberData.rangeName) continue;
            if (!aggregatedRanges[numberData.rangeName]) {
                aggregatedRanges[numberData.rangeName] = { total: 0, available: 0 };
            }
            aggregatedRanges[numberData.rangeName].total++;
            if (numberData.status === 'available') {
                aggregatedRanges[numberData.rangeName].available++;
            }
        }

        rangeListTbody.innerHTML = '';
        if (Object.keys(aggregatedRanges).length === 0) {
            rangeListTbody.innerHTML = '<tr><td colspan="4" class="text-center">Tidak ada range untuk kombinasi ini.</td></tr>';
            return;
        }

        for (const rangeName in aggregatedRanges) {
            const rangeData = aggregatedRanges[rangeName];
            const row = document.createElement('tr');
            row.innerHTML = `<td>${rangeName}</td><td><span class="badge bg-success">${rangeData.available}</span></td><td>${rangeData.total}</td><td><button class="btn btn-sm btn-danger" onclick="deleteRange('${service}', '${country}', '${rangeName}')"><i class="bi bi-trash"></i> Hapus</button></td>`;
            rangeListTbody.appendChild(row);
        }
    });
}

function deleteRange(service, country, rangeName) {
    if (!confirm(`Anda yakin ingin menghapus semua nomor yang TERSEDIA dari range "${rangeName}"?`)) return;
    const stockPath = numberStockRef.child(service).child(country);
    stockPath.orderByChild('rangeName').equalTo(rangeName).once('value', (snapshot) => {
        if (!snapshot.exists()) { alert("Range tidak ditemukan."); return; }
        const updates = {};
        let deletedCount = 0;
        snapshot.forEach((childSnapshot) => {
            const stockId = childSnapshot.key;
            const stockData = childSnapshot.val();
            if (stockData.status === 'available') {
                updates[stockId] = null;
                deletedCount++;
            }
        });
        if (deletedCount > 0) {
            stockPath.update(updates).then(() => {
                alert(`Berhasil menghapus ${deletedCount} nomor dari range "${rangeName}".`);
            });
        } else { alert(`Tidak ada nomor yang tersedia untuk dihapus dari range "${rangeName}".`); }
    });
}

function deleteOldStock() {
    const service = serviceSelect.value;
    const country = countrySelect.value;
    if (!service || !country) { alert("Silakan pilih Layanan dan Negara terlebih dahulu."); return; }
    if (!confirm(`Anda yakin ingin menghapus SEMUA nomor stok lama (tanpa range) yang TERSEDIA untuk ${service} - ${country}?`)) return;
    const stockPath = numberStockRef.child(service).child(country);
    stockPath.once('value', (snapshot) => {
        if (!snapshot.exists()) { alert("Tidak ada stok untuk kombinasi ini."); return; }
        const updates = {};
        let deletedCount = 0;
        snapshot.forEach((childSnapshot) => {
            const stockId = childSnapshot.key;
            const stockData = childSnapshot.val();
            if (!stockData.hasOwnProperty('rangeName') && stockData.status === 'available') {
                updates[stockId] = null;
                deletedCount++;
            }
        });
        if (deletedCount > 0) {
            stockPath.update(updates).then(() => {
                alert(`Pembersihan berhasil! ${deletedCount} nomor stok lama telah dihapus.`);
            });
        } else { alert("Tidak ada nomor stok lama yang tersedia untuk dihapus."); }
    });
}

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

ordersRef.on('value', (snapshot) => {
    tableBody.innerHTML = '';
    let hasActiveOrders = false;

    if (!snapshot.exists()) {
        tableBody.innerHTML = '<tr class="placeholder-row"><td colspan="5" class="text-center">Tidak ada pesanan aktif.</td></tr>';
        return;
    }

    snapshot.forEach(userSnapshot => {
        const userId = userSnapshot.key;
        const userOrders = userSnapshot.val();

        for (const orderId in userOrders) {
            const order = userOrders[orderId];

            if (typeof order === 'object' && order !== null && (order.status === 'waiting_number' || order.status === 'waiting_otp')) {
                hasActiveOrders = true;

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
                    <td><button class="btn btn-success btn-send-otp" data-user-id="${userId}" data-order-id="${orderId}" onclick="sendOtp(this)">Kirim</button></td>
                `;
                tableBody.appendChild(row);
            }
        }
    });

    if (!hasActiveOrders) {
        tableBody.innerHTML = '<tr class="placeholder-row"><td colspan="5" class="text-center">Tidak ada pesanan aktif.</td></tr>';
    }
});

// ======================================================
// BAGIAN 3: MANAJEMEN DEPOSIT
// ======================================================
function approveDeposit(depositId) {
    const requestRef = depositRequestsRef.child(depositId);
    requestRef.once('value', (snapshot) => {
        const requestData = snapshot.val();
        if (!requestData || requestData.status !== 'pending') { alert("Permintaan sudah diproses."); return; }
        const { userId, amount } = requestData;
        const userBalanceRef = database.ref(`users/${userId}/balance`);
        userBalanceRef.transaction((currentBalance) => { return (currentBalance || 0) + amount; }, 
        (error, committed) => {
            if (error) { alert("Gagal: " + error); } 
            else if (committed) { requestRef.update({ status: 'completed' }); }
        });
    });
}

function listenToDepositRequests() {
    depositRequestsRef.orderByChild('status').equalTo('pending').on('child_added', (snapshot) => {
        const depositId = snapshot.key;
        const data = snapshot.val();
        const date = new Date(data.createdAt).toLocaleString('id-ID');
        const row = document.createElement('tr');
        row.id = `deposit-${depositId}`;
        row.innerHTML = `<td>${data.userEmail}</td><td>Rp ${data.amount.toLocaleString('id-ID')}</td><td>${date}</td><td><button class="btn btn-sm btn-success" onclick="approveDeposit('${depositId}')">Setujui</button></td>`;
        depositRequestsTbody.appendChild(row);
    });
    depositRequestsRef.on('child_changed', (snapshot) => {
        if (snapshot.val().status !== 'pending') {
            const row = document.getElementById(`deposit-${snapshot.key}`);
            if (row) row.remove();
        }
    });
}
listenToDepositRequests();
