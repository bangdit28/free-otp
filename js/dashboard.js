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
const userBalanceEl = document.getElementById('user-balance');
const submitDepositBtn = document.getElementById('submit-deposit-btn');
const depositAmountInput = document.getElementById('deposit-amount');
const depositAlert = document.getElementById('deposit-alert');
const activeTimers = {};

let currentUserId = null;
let currentUserBalance = 0;
let servicePrice = 0;

// --- Logika Menu Mobile ---
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
menuToggle.addEventListener('click', () => { document.body.classList.toggle('sidebar-open'); });
sidebarOverlay.addEventListener('click', () => { document.body.classList.remove('sidebar-open'); });

// ======================================================
// FUNGSI MEMUAT KONFIGURASI
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
        } else {
            countrySelect.innerHTML = '<option>Tidak ada negara</option>';
            getOrderBtn.disabled = true;
        }
    });
}

function loadServiceConfig(service, country) {
    const priceRef = database.ref(`config/services/${service}/${country}`);
    priceRef.on('value', (snapshot) => {
        const priceData = snapshot.val();
        if (priceData) {
            document.getElementById('base-price').textContent = `Rp ${priceData.basePrice.toLocaleString('id-ID')}`;
            document.getElementById('promo-price').textContent = `Rp ${priceData.promoPrice.toLocaleString('id-ID')}`;
            servicePrice = priceData.promoPrice;
        }
    });
}

function listenToUserBalance() {
    if (!currentUserId) return;
    const balanceRef = database.ref(`users/${currentUserId}/balance`);
    balanceRef.on('value', (snapshot) => {
        const balance = snapshot.val() || 0;
        currentUserBalance = balance;
        userBalanceEl.textContent = `Rp ${balance.toLocaleString('id-ID')}`;
    });
}

// ======================================================
// BAGIAN 1: AUTHENTICATION GUARD & SETUP
// ======================================================
auth.onAuthStateChanged(user => {
    if (user) {
        currentUserId = user.uid;
        loadUserOrders();
        loadCountries();
        listenToUserBalance();
        loadServiceConfig('facebook', 'indonesia');
    } else {
        window.location.href = 'index.html';
    }
});
logoutBtn.addEventListener('click', () => { auth.signOut(); });

// ======================================================
// BAGIAN 2: LOGIKA UTAMA
// ======================================================
function loadUserOrders() { /* ... (Tidak berubah dari versi sebelumnya) ... */ }
function addOrUpdateOrderRow(orderId, data) { /* ... (Tidak berubah dari versi sebelumnya) ... */ }

getOrderBtn.addEventListener('click', () => {
    if (!currentUserId || !countrySelect.value) return;
    if (currentUserBalance < servicePrice) {
        alert("Saldo tidak cukup! Silakan lakukan deposit terlebih dahulu.");
        return;
    }
    const orderId = database.ref().child('orders').push().key;
    const serviceName = 'Facebook';
    const selectedCountry = countrySelect.value;
    const newOrderData = {
        serviceName: serviceName, price: servicePrice, status: 'waiting_number',
        phoneNumber: '', otpCode: '', country: selectedCountry,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };
    const newBalance = currentUserBalance - servicePrice;
    const updates = {};
    updates[`/orders/${currentUserId}/${orderId}`] = newOrderData;
    updates[`/users/${currentUserId}/balance`] = newBalance;
    database.ref().update(updates).catch(err => alert("Terjadi kesalahan: " + err.message));
});

function cancelOrder(orderId) { /* ... (Tidak berubah dari versi sebelumnya) ... */ }
function finishOrder(orderId) { /* ... (Tidak berubah dari versi sebelumnya) ... */ }

submitDepositBtn.addEventListener('click', () => {
    const amount = parseInt(depositAmountInput.value);
    if (!amount || amount < 10000) {
        depositAlert.textContent = "Jumlah deposit minimal Rp 10.000.";
        depositAlert.className = 'alert alert-danger';
        return;
    }
    const depositId = database.ref().child('deposit_requests').push().key;
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    const depositData = {
        userId: currentUser.uid, userEmail: currentUser.email, amount: amount,
        status: 'pending', createdAt: firebase.database.ServerValue.TIMESTAMP
    };
    database.ref(`deposit_requests/${depositId}`).set(depositData).then(() => {
        depositAmountInput.value = '';
        depositAlert.textContent = "Permintaan deposit berhasil diajukan.";
        depositAlert.className = 'alert alert-success';
        setTimeout(() => depositAlert.className = 'alert d-none', 4000);
    });
});

// ======================================================
// BAGIAN 3: FUNGSI UTILITAS
// ======================================================
function startTimer(orderId, seconds) { /* ... (Tidak berubah dari versi sebelumnya) ... */ }
function formatTime(s) { /* ... (Tidak berubah dari versi sebelumnya) ... */ }
function copyToClipboard(text,el){ /* ... (Tidak berubah dari versi sebelumnya) ... */ }
