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

// --- Variabel Global ---
let currentUserId = null;
let currentUserBalance = 0;
const SERVICE_PRICE = 1500; // HARGA TETAP UNTUK STABILITAS

// --- Logika Menu Mobile ---
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
menuToggle.addEventListener('click', () => {
    document.body.classList.toggle('sidebar-open');
});
sidebarOverlay.addEventListener('click', () => {
    document.body.classList.remove('sidebar-open');
});

// ======================================================
// FUNGSI MEMUAT KONFIGURASI (HANYA NEGARA)
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
    } else {
        window.location.href = 'index.html';
    }
});

logoutBtn.addEventListener('click', () => {
    auth.signOut();
});

// ======================================================
// BAGIAN 2: LOGIKA UTAMA
// ======================================================

function loadUserOrders() {
    if (!currentUserId) return;
    const userOrdersRef = database.ref(`orders/${currentUserId}`);

    userOrdersRef.on('child_added', (snapshot) => {
        const orderId = snapshot.key;
        const orderData = snapshot.val();
        if (orderData.status !== 'finished_by_user') {
            addOrUpdateOrderRow(orderId, orderData);
        }
    });

    userOrdersRef.on('child_changed', (snapshot) => {
        const orderId = snapshot.key;
        const orderData = snapshot.val();
        if (orderData.status === 'finished_by_user') {
            const row = document.getElementById(`order-${orderId}`);
            if (row) row.remove();
        } else {
            addOrUpdateOrderRow(orderId, orderData);
        }
    });

    userOrdersRef.on('child_removed', (snapshot) => {
        const orderId = snapshot.key;
        const row = document.getElementById(`order-${orderId}`);
        if (row) row.remove();
    });
}

function addOrUpdateOrderRow(orderId, data) {
    let row = document.getElementById(`order-${orderId}`);
    if (!row) {
        row = document.createElement('tr');
        row.id = `order-${orderId}`;
        activeOrdersTbody.prepend(row);
    }

    let phoneHTML = `<div class="spinner-border spinner-border-sm" role="status"></div>`;
    if (data.status === 'out_of_stock') {
        phoneHTML = `<span class="text-danger fw-bold">Stok Habis</span>`;
    } else if (data.phoneNumber) {
        phoneHTML = `${data.phoneNumber} <i class="bi bi-clipboard copy-icon" onclick="copyToClipboard('${data.phoneNumber}', this)"></i>`;
    }

    let otpHTML = data.otpCode ? `<span class="otp-code">${data.otpCode}</span> <i class="bi bi-clipboard copy-icon" onclick="copyToClipboard('${data.otpCode}', this)"></i>` : '<div class="spinner-border spinner-border-sm"></div>';

    let actionHTML = `<div class="spinner-border spinner-border-sm" role="status"></div>`;
    if (data.status === 'waiting_otp' || (data.phoneNumber && !data.otpCode)) {
        actionHTML = `<button class="btn btn-sm btn-cancel" onclick="cancelOrder('${orderId}')"><i class="bi bi-x-circle"></i> Batal</button>`;
    } else if (data.otpCode) {
        actionHTML = `<button class="btn btn-sm btn-success action-btn" onclick="finishOrder('${orderId}')"><i class="bi bi-check-lg"></i> Selesai</button>`;
    } else if (data.status === 'out_of_stock') {
        actionHTML = `<i class="bi bi-x-circle-fill text-danger"></i>`;
    }

    row.innerHTML = `
        <td>${data.serviceName}</td>
        <td class="phone-cell">${phoneHTML}</td>
        <td class="otp-cell">${otpHTML}</td>
        <td class="timer-cell">--:--</td>
        <td class="status-cell">${actionHTML}</td>
    `;

    const createdAt = data.createdAt || Date.now();
    const timeElapsed = (Date.now() - createdAt) / 1000;
    const remainingSeconds = Math.round(600 - timeElapsed);

    if (remainingSeconds > 0) {
        startTimer(orderId, remainingSeconds);
    } else {
        const timerCell = row.querySelector('.timer-cell');
        timerCell.textContent = "Expired";
        if (data.status !== 'finished_by_user') {
            setTimeout(() => {
                const row = document.getElementById(`order-${orderId}`);
                if (row) {
                    row.remove();
                }
            }, 3000);
        }
    }
}

getOrderBtn.addEventListener('click', () => {
    if (!currentUserId || !countrySelect.value) return;

    if (currentUserBalance < SERVICE_PRICE) {
        alert("Saldo tidak cukup! Silakan lakukan deposit terlebih dahulu.");
        return;
    }

    const orderId = database.ref().child('orders').push().key;
    const serviceName = 'Facebook';
    const selectedCountry = countrySelect.value;

    const newOrderData = {
        serviceName: serviceName,
        price: SERVICE_PRICE,
        status: 'waiting_number',
        phoneNumber: '',
        otpCode: '',
        country: selectedCountry,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };

    const newBalance = currentUserBalance - SERVICE_PRICE;

    const updates = {};
    updates[`/orders/${currentUserId}/${orderId}`] = newOrderData;
    updates[`/users/${currentUserId}/balance`] = newBalance;

    database.ref().update(updates).catch(err => alert("Terjadi kesalahan: " + err.message));
});

function cancelOrder(orderId) {
    if (!currentUserId) return;
    if (!confirm("Apakah Anda yakin ingin membatalkan pesanan ini? Saldo akan dikembalikan.")) {
        return;
    }

    const orderRef = database.ref(`orders/${currentUserId}/${orderId}`);
    orderRef.once('value', (snapshot) => {
        const orderData = snapshot.val();
        if (orderData && orderData.stockId) {
            const updates = {};
            const {
                stockService,
                stockCountry,
                stockId,
                price
            } = orderData;

            updates[`/number_stock/${stockService}/${stockCountry}/${stockId}/status`] = 'available';
            updates[`/number_stock/${stockService}/${stockCountry}/${stockId}/orderId`] = null;
            updates[`/orders/${currentUserId}/${orderId}`] = null;
            updates[`/users/${currentUserId}/balance`] = currentUserBalance + price;

            database.ref().update(updates);

            if (activeTimers[orderId]) {
                clearInterval(activeTimers[orderId]);
                delete activeTimers[orderId];
            }
        } else {
            orderRef.remove();
        }
    });
}

function finishOrder(orderId) {
    if (!currentUserId) return;
    database.ref(`orders/${currentUserId}/${orderId}`).update({
        status: 'finished_by_user'
    });
}

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
        userId: currentUser.uid,
        userEmail: currentUser.email,
        amount: amount,
        status: 'pending',
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };

    database.ref(`deposit_requests/${depositId}`).set(depositData).then(() => {
        depositAmountInput.value = '';
        depositAlert.textContent = "Permintaan deposit berhasil diajukan.";
        depositAlert.className = 'alert alert-success';
        setTimeout(() => {
            depositAlert.className = 'alert d-none';
            depositAlert.textContent = '';
        }, 4000);
    });
});

// ======================================================
// BAGIAN 3: FUNGSI UTILITAS
// ======================================================

function startTimer(orderId, seconds) {
    if (activeTimers[orderId]) clearInterval(activeTimers[orderId]);
    const timerCell = document.querySelector(`#order-${orderId} .timer-cell`);
    if (!timerCell) return;

    let remaining = seconds;
    timerCell.textContent = formatTime(remaining);

    activeTimers[orderId] = setInterval(() => {
        remaining--;
        timerCell.textContent = formatTime(remaining);
        if (remaining <= 0) {
            clearInterval(activeTimers[orderId]);
            timerCell.textContent = "Expired";
            setTimeout(() => {
                const row = document.getElementById(`order-${orderId}`);
                if (row) row.remove();
            }, 3000);
        }
    }, 1000);
}

function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
}

function copyToClipboard(text, el) {
    navigator.clipboard.writeText(text).then(() => {
        const i = el.className;
        el.className = 'bi bi-check-lg text-success';
        setTimeout(() => el.className = i, 1500)
    })
}
