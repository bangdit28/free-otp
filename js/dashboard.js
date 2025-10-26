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
const basePriceEl = document.getElementById('base-price');
const promoPriceEl = document.getElementById('promo-price');
const activeTimers = {};

let currentUserId = null;
let currentUserBalance = 0;
let servicePrice = null; // Ubah ke null untuk menandakan belum dimuat

// --- Logika Menu Mobile ---
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
menuToggle.addEventListener('click', () => { document.body.classList.toggle('sidebar-open'); });
sidebarOverlay.addEventListener('click', () => { document.body.classList.remove('sidebar-open'); });


// ======================================================
// FUNGSI MEMUAT KONFIGURASI (DIPERBARUI)
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
            // Setelah negara dimuat, panggil loadServiceConfig untuk negara pertama
            loadServiceConfig('facebook', countrySelect.value);
        } else {
            countrySelect.innerHTML = '<option>Tidak ada negara</option>';
            getOrderBtn.disabled = true;
        }
    });
}

function loadServiceConfig(service, country) {
    // Nonaktifkan tombol pesan saat harga sedang dimuat
    getOrderBtn.disabled = true;
    getOrderBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
    servicePrice = null; // Reset harga

    const priceRef = database.ref(`config/services/${service}/${country}`);
    priceRef.once('value', (snapshot) => { // Gunakan once() agar tidak terus menerus listen
        const priceData = snapshot.val();
        if (priceData) {
            basePriceEl.textContent = `Rp ${priceData.basePrice.toLocaleString('id-ID')}`;
            promoPriceEl.textContent = `Rp ${priceData.promoPrice.toLocaleString('id-ID')}`;
            servicePrice = priceData.promoPrice;
            getOrderBtn.disabled = false; // Aktifkan kembali tombol
            getOrderBtn.innerHTML = '<i class="bi bi-shield-lock-fill"></i> Dapatkan Nomor';
        } else {
            // Jika tidak ada konfigurasi harga untuk negara ini
            basePriceEl.textContent = `-`;
            promoPriceEl.textContent = `Tidak Tersedia`;
            // Tombol tetap nonaktif
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
        loadCountries(); // Cukup panggil ini, sisanya akan dipanggil berantai
        listenToUserBalance();
    } else {
        window.location.href = 'index.html';
    }
});
logoutBtn.addEventListener('click', () => { auth.signOut(); });

// BARU: Event listener untuk dropdown negara
countrySelect.addEventListener('change', () => {
    const selectedCountry = countrySelect.value;
    loadServiceConfig('facebook', selectedCountry);
});


// ======================================================
// BAGIAN 2: LOGIKA UTAMA
// ======================================================
function loadUserOrders() { /* ... (Tidak berubah) ... */ }
function addOrUpdateOrderRow(orderId, data) { /* ... (Tidak berubah) ... */ }

getOrderBtn.addEventListener('click', () => {
    if (!currentUserId || !countrySelect.value) return;
    
    // Perbarui pengecekan harga
    if (servicePrice === null) {
        alert("Harga belum dimuat, silakan coba lagi sesaat.");
        return;
    }
    
    if (currentUserBalance < servicePrice) {
        alert("Saldo tidak cukup! Silakan lakukan deposit terlebih dahulu.");
        return;
    }
    
    const orderId = database.ref().child('orders').push().key;
    const serviceName = 'Facebook';
    const selectedCountry = countrySelect.value;
    
    // Pastikan harga yang dikirim adalah harga yang valid
    const newOrderData = {
        serviceName: serviceName,
        price: servicePrice,
        status: 'waiting_number',
        phoneNumber: '',
        otpCode: '',
        country: selectedCountry,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };
    
    const newBalance = currentUserBalance - servicePrice;
    
    const updates = {};
    updates[`/orders/${currentUserId}/${orderId}`] = newOrderData;
    updates[`/users/${currentUserId}/balance`] = newBalance;
    
    database.ref().update(updates).catch(err => alert("Terjadi kesalahan: " + err.message));
});

function cancelOrder(orderId) { /* ... (Tidak berubah) ... */ }
function finishOrder(orderId) { /* ... (Tidak berubah) ... */ }
submitDepositBtn.addEventListener('click', () => { /* ... (Tidak berubah) ... */ });

// ======================================================
// BAGIAN 3: FUNGSI UTILITAS
// ======================================================
function startTimer(orderId, seconds) { /* ... (Tidak berubah) ... */ }
function formatTime(s) { /* ... (Tidak berubah) ... */ }
function copyToClipboard(text,el){ /* ... (Tidak berubah) ... */ }
