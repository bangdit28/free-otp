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
const activeTimers = {};

// --- Logika Menu Mobile ---
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
menuToggle.addEventListener('click', () => { document.body.classList.toggle('sidebar-open'); });
sidebarOverlay.addEventListener('click', () => { document.body.classList.remove('sidebar-open'); });


// ======================================================
// FUNGSI UNTUK MEMUAT NEGARA DARI FIREBASE
// ======================================================
function loadCountries() {
    const countriesRef = database.ref('config/countries');
    countriesRef.once('value', (snapshot) => {
        const countries = snapshot.val();
        if (countries) {
            countrySelect.innerHTML = ''; // Kosongkan daftar yang ada
            for (const key in countries) {
                const option = document.createElement('option');
                option.value = key; // contoh: "indonesia"
                option.textContent = countries[key]; // contoh: "Indonesia"
                countrySelect.appendChild(option);
            }
        } else {
            // Beri tahu pengguna jika tidak ada negara yang dikonfigurasi
            countrySelect.innerHTML = '<option>Tidak ada negara</option>';
            getOrderBtn.disabled = true;
        }
    });
}


// ======================================================
// BAGIAN 1: AUTHENTICATION GUARD & SETUP
// ======================================================
let currentUserId = null;
auth.onAuthStateChanged(user => {
    if (user) {
        currentUserId = user.uid;
        loadUserOrders();
        loadCountries(); // Panggil fungsi untuk memuat negara saat user login
    } else {
        window.location.href = 'index.html';
    }
});
logoutBtn.addEventListener('click', () => { auth.signOut(); });


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
    
    let actionHTML = `<i class="bi bi-hourglass-split"></i>`;
    if (data.otpCode) {
        actionHTML = `<button class="btn btn-sm btn-success action-btn" onclick="finishOrder('${orderId}')"><i class="bi bi-check-lg"></i> Selesai</button>`;
    }
    if (data.status === 'out_of_stock') {
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
             setTimeout(() => { if (document.getElementById(`order-${orderId}`)) { document.getElementById(`order-${orderId}`).remove(); } }, 3000);
        }
    }
}

getOrderBtn.addEventListener('click', () => {
    if (!currentUserId || !countrySelect.value) return;

    const orderId = database.ref().child('orders').push().key;
    const serviceName = 'Facebook';
    const selectedCountry = countrySelect.value;

    const newOrderData = {
        serviceName: serviceName,
        price: 1500,
        status: 'waiting_number',
        phoneNumber: '',
        otpCode: '',
        country: selectedCountry,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };

    database.ref(`orders/${currentUserId}/${orderId}`).set(newOrderData);
});

function finishOrder(orderId) {
    if (!currentUserId) return;
    database.ref(`orders/${currentUserId}/${orderId}`).update({ status: 'finished_by_user' });
}

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
            setTimeout(() => { const row = document.getElementById(`order-${orderId}`); if (row) row.remove(); }, 3000);
        }
    }, 1000);
}
function formatTime(s) { const m=Math.floor(s/60); return `${m}:${(s%60)<10?'0':''}${s%60}`; }
function copyToClipboard(text,el){navigator.clipboard.writeText(text).then(()=>{const i=el.className;el.className='bi bi-check-lg text-success';setTimeout(()=>el.className=i,1500)})}
