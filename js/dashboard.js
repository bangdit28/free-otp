// Ganti dengan konfigurasi Firebase Anda
const firebaseConfig = {
    apiKey: "AIza...",
    authDomain: "your-project-id.firebaseapp.com",
    databaseURL: "https://your-project-id-default-rtdb.firebaseio.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "...",
    appId: "..."
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// --- Elemen DOM ---
const getOrderBtn = document.getElementById('getOrderBtn');
const activeOrdersTbody = document.getElementById('active-orders-tbody');
const logoutBtn = document.getElementById('logout-btn');
const activeTimers = {};

let currentUserId = null;

// ======================================================
// BAGIAN 1: AUTHENTICATION GUARD & SETUP
// ======================================================

auth.onAuthStateChanged(user => {
    if (user) {
        // Pengguna sudah login, simpan UID dan muat datanya
        currentUserId = user.uid;
        loadUserOrders();
    } else {
        // Pengguna tidak login, tendang kembali ke halaman login
        window.location.href = 'login.html';
    }
});

logoutBtn.addEventListener('click', () => {
    auth.signOut();
});

// ======================================================
// BAGIAN 2: LOGIKA UTAMA (PERSISTENCE & REAL-TIME)
// ======================================================

function loadUserOrders() {
    if (!currentUserId) return;
    const userOrdersRef = database.ref(`orders/${currentUserId}`);

    // Listener ini akan memuat semua pesanan awal & pesanan baru
    userOrdersRef.on('child_added', (snapshot) => {
        const orderId = snapshot.key;
        const orderData = snapshot.val();
        
        // Hanya tampilkan yang belum selesai atau kedaluwarsa
        if (orderData.status !== 'finished_by_user') {
            addOrUpdateOrderRow(orderId, orderData);
        }
    });
    
    // Listener ini akan menangani update pada pesanan yang sudah ada
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

    // Listener ini menangani jika pesanan dihapus dari database
     userOrdersRef.on('child_removed', (snapshot) => {
        const orderId = snapshot.key;
        const row = document.getElementById(`order-${orderId}`);
        if (row) row.remove();
    });
}


function addOrUpdateOrderRow(orderId, data) {
    let row = document.getElementById(`order-${orderId}`);
    if (!row) { // Jika baris belum ada, buat baru
        row = document.createElement('tr');
        row.id = `order-${orderId}`;
        activeOrdersTbody.prepend(row);
    }
    
    // --- Nomor Telepon ---
    let phoneHTML = `<div class="spinner-border spinner-border-sm" role="status"></div>`;
    if (data.status === 'out_of_stock') {
        phoneHTML = `<span class="text-danger fw-bold">Stok Habis</span>`;
    } else if (data.phoneNumber) {
        phoneHTML = `${data.phoneNumber} <i class="bi bi-clipboard copy-icon" onclick="copyToClipboard('${data.phoneNumber}', this)"></i>`;
    }

    // --- Kode OTP ---
    let otpHTML = data.otpCode ? `<span class="otp-code">${data.otpCode}</span> <i class="bi bi-clipboard copy-icon" onclick="copyToClipboard('${data.otpCode}', this)"></i>` : '<div class="spinner-border spinner-border-sm"></div>';

    // --- Aksi / Status ---
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

    // --- Logika Timer ---
    const createdAt = data.createdAt || Date.now();
    const timeElapsed = (Date.now() - createdAt) / 1000;
    const remainingSeconds = Math.round(600 - timeElapsed);

    if (remainingSeconds > 0) {
        startTimer(orderId, remainingSeconds);
    } else {
        const timerCell = row.querySelector('.timer-cell');
        timerCell.textContent = "Expired";
        // Hapus otomatis jika sudah expired dan belum selesai
        if(data.status !== 'finished_by_user') {
             setTimeout(() => {
                if(document.getElementById(`order-${orderId}`)){
                    document.getElementById(`order-${orderId}`).remove();
                }
            }, 3000); // Hapus setelah 3 detik
        }
    }
}

getOrderBtn.addEventListener('click', () => {
    if (!currentUserId) return;

    const orderId = database.ref().child('orders').push().key;
    const serviceName = 'Facebook'; 
    const newOrderData = {
        serviceName,
        price: 1500,
        status: 'waiting_number',
        phoneNumber: '',
        otpCode: '',
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };

    database.ref(`orders/${currentUserId}/${orderId}`).set(newOrderData);
});

// Fungsi finishOrder (dipanggil dari tombol "Selesai")
function finishOrder(orderId) {
    if (!currentUserId) return;
    // Ubah status di Firebase, listener 'child_changed' akan menghapus barisnya dari UI
    database.ref(`orders/${currentUserId}/${orderId}`).update({ status: 'finished_by_user' });
}

// ======================================================
// BAGIAN 3: FUNGSI UTILITAS (TIMER, COPY)
// ======================================================
function startTimer(orderId, seconds) {
    if (activeTimers[orderId]) clearInterval(activeTimers[orderId]);
    const timerCell = document.querySelector(`#order-${orderId} .timer-cell`);
    if(!timerCell) return;
    
    let remaining = seconds;
    timerCell.textContent = formatTime(remaining);

    activeTimers[orderId] = setInterval(() => {
        remaining--;
        timerCell.textContent = formatTime(remaining);
        if (remaining <= 0) {
            clearInterval(activeTimers[orderId]);
            timerCell.textContent = "Expired";
            // Hapus otomatis setelah 3 detik
            setTimeout(() => {
                const row = document.getElementById(`order-${orderId}`);
                if (row) row.remove();
            }, 3000);
        }
    }, 1000);
}
function formatTime(s) { const m=Math.floor(s/60); return `${m}:${(s%60)<10?'0':''}${s%60}`; }
function copyToClipboard(text,el){navigator.clipboard.writeText(text).then(()=>{const i=el.className;el.className='bi bi-check-lg text-success';setTimeout(()=>el.className=i,1500)})}
