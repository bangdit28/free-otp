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
            listenToRanges(); // Panggil setelah negara dimuat
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

        rangeListTbody.innerHTML = ''; // Kosongkan setelah agregasi selesai
        if (Object.keys(aggregatedRanges).length === 0) {
            rangeListTbody.innerHTML = '<tr><td colspan="4" class="text-center">Tidak ada range untuk kombinasi ini.</td></tr>';
            return;
        }

        for (const rangeName in aggregatedRanges) {
            const rangeData = aggregatedRanges[rangeName];
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${rangeName}</td>
                <td><span class="badge bg-success">${rangeData.available}</span></td>
                <td>${rangeData.total}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteRange('${service}', '${country}', '${rangeName}')">
                        <i class="bi bi-trash"></i> Hapus
                    </button>
                </td>
            `;
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
            stockPath.update(updates).then(() => { alert(`Berhasil menghapus ${deletedCount} nomor dari range "${rangeName}".`); });
        } else {
            alert(`Tidak ada nomor yang tersedia untuk dihapus dari range "${rangeName}".`);
        }
    });
}

serviceSelect.addEventListener('change', () => { updateStockCount(); listenToRanges(); });
countrySelect.addEventListener('change', () => { updateStockCount(); listenToRanges(); });

// ======================================================
// BAGIAN 2: MANAJEMEN PESANAN
// ======================================================
function assignNumberToOrder(userId, orderId, service, country) { /* ... (Tidak berubah) ... */ }
function sendOtp(button) { /* ... (Tidak berubah) ... */ }
function checkAndSetPlaceholder() { /* ... (Tidak berubah) ... */ }
function attachListenersToUser(userId) { /* ... (Tidak berubah) ... */ }
ordersRef.on('child_added', (userSnapshot) => { /* ... (Tidak berubah) ... */ });
ordersRef.once('value', (snapshot) => { /* ... (Tidak berubah) ... */ });

// ======================================================
// BAGIAN 3: MANAJEMEN DEPOSIT
// ======================================================
function approveDeposit(depositId) { /* ... (Tidak berubah) ... */ }
function listenToDepositRequests() { /* ... (Tidak berubah) ... */ }
listenToDepositRequests();
