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
const depositRequestsTbody = document.getElementById('deposit-requests-tbody');
const depositRequestsRef = database.ref('deposit_requests');

// ======================================================
// FUNGSI MEMUAT NEGARA
// ======================================================
function loadCountries() { /* ... (Tidak berubah dari versi sebelumnya) ... */ }
loadCountries();

// ======================================================
// BAGIAN 1: MANAJEMEN STOK
// ======================================================
function showFeedback(message, isError = false) { /* ... */ }
addStockBtn.addEventListener('click', () => { /* ... */ });
function updateStockCount() { /* ... */ }
serviceSelect.addEventListener('change', updateStockCount);
countrySelect.addEventListener('change', updateStockCount);

// ======================================================
// BAGIAN 2: MANAJEMEN PESANAN
// ======================================================
function assignNumberToOrder(userId, orderId, service, country) { /* ... */ }
function sendOtp(button) { /* ... */ }
function checkAndSetPlaceholder() { /* ... */ }
function attachListenersToUser(userId) { /* ... */ }
ordersRef.on('child_added', (userSnapshot) => { /* ... */ });
ordersRef.once('value', (snapshot) => { /* ... */ });

// ======================================================
// BAGIAN 3: MANAJEMEN DEPOSIT (BARU)
// ======================================================
function approveDeposit(depositId) {
    const requestRef = depositRequestsRef.child(depositId);
    requestRef.once('value', (snapshot) => {
        const requestData = snapshot.val();
        if (!requestData || requestData.status !== 'pending') {
            alert("Permintaan ini sudah diproses atau tidak valid.");
            return;
        }
        const { userId, amount } = requestData;
        const userBalanceRef = database.ref(`users/${userId}/balance`);
        userBalanceRef.transaction((currentBalance) => {
            return (currentBalance || 0) + amount;
        }, (error, committed) => {
            if (error) {
                alert("Gagal memperbarui saldo: " + error);
            } else if (committed) {
                requestRef.update({ status: 'completed' });
            }
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
        row.innerHTML = `
            <td>${data.userEmail}</td>
            <td>Rp ${data.amount.toLocaleString('id-ID')}</td>
            <td>${date}</td>
            <td>
                <button class="btn btn-sm btn-success" onclick="approveDeposit('${depositId}')">Setujui</button>
            </td>
        `;
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
