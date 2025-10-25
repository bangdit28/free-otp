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
const stockCountDisplay = document.getElementById('stock-count-display');
const feedbackMessage = document.getElementById('feedback-message');

// ======================================================
// BAGIAN 1: MANAJEMEN STOK (TIDAK BERUBAH)
// ======================================================
function showFeedback(message, isError = false) { /* ... (Kode sama persis seperti sebelumnya) ... */ }
addStockBtn.addEventListener('click', () => { /* ... (Kode sama persis seperti sebelumnya) ... */ });
numberStockRef.child('facebook_indonesia').orderByChild('status').equalTo('available').on('value', (snapshot) => { stockCountDisplay.textContent = snapshot.numChildren(); });
// (Pastikan Anda menyalin-tempel kode lengkap untuk fungsi-fungsi di atas dari file Anda sebelumnya)


// ======================================================
// BAGIAN 2: MANAJEMEN PESANAN (LOGIKA BARU YANG SUDAH DIPERBAIKI)
// ======================================================

function assignNumberToOrder(userId, orderId, service) {
    const stockRef = numberStockRef.child(service);
    stockRef.orderByChild('status').equalTo('available').limitToFirst(1).once('value', (snapshot) => {
        if (snapshot.exists()) {
            const stockId = Object.keys(snapshot.val())[0];
            const stockData = snapshot.val()[stockId];
            const updates = {};
            updates[`/orders/${userId}/${orderId}/phoneNumber`] = stockData.number;
            updates[`/orders/${userId}/${orderId}/status`] = 'waiting_otp';
            updates[`/number_stock/${service}/${stockId}/status`] = 'in_use';
            updates[`/number_stock/${service}/${stockId}/orderId`] = orderId;
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
    if (otpCode) {
        database.ref(`orders/${userId}/${orderId}`).update({
            otpCode: otpCode,
            status: 'completed'
        });
    } else {
        alert('Kode OTP tidak boleh kosong!');
    }
}

function checkAndSetPlaceholder() {
    if (tableBody.children.length === 0) {
        tableBody.innerHTML = '<tr class="placeholder-row"><td colspan="5" class="text-center">Tidak ada pesanan aktif.</td></tr>';
    } else {
        const placeholder = tableBody.querySelector('.placeholder-row');
        if (placeholder) placeholder.remove();
    }
}

// ---- FUNGSI UTAMA UNTUK MEMASANG LISTENER ----
function attachListenersToUser(userId) {
    const userOrdersRef = database.ref(`orders/${userId}`);

    // Listener untuk PESANAN BARU dari pengguna ini
    userOrdersRef.on('child_added', (orderSnapshot) => {
        const orderId = orderSnapshot.key;
        const order = orderSnapshot.val();

        // Filter di sini: Hanya proses jika statusnya menunggu & belum ada di tabel
        if (order.status === 'waiting_number' && !document.getElementById(`order-${orderId}`)) {
            checkAndSetPlaceholder();
            
            const row = document.createElement('tr');
            row.id = `order-${orderId}`;
            row.innerHTML = `
                <td>${orderId.substring(0, 8)}...</td>
                <td>${order.serviceName}</td>
                <td class="phone-cell"><span class="text-warning">Mencari...</span></td>
                <td><input type="text" class="form-control otp-input" placeholder="Masukkan OTP"></td>
                <td>
                    <button class="btn btn-success btn-send-otp" data-user-id="${userId}" data-order-id="${orderId}" onclick="sendOtp(this)">Kirim</button>
                </td>
            `;
            tableBody.appendChild(row);
            assignNumberToOrder(userId, orderId, 'facebook_indonesia');
        }
    });

    // Listener untuk PERUBAHAN pada pesanan yang sudah ada
    userOrdersRef.on('child_changed', (orderSnapshot) => {
        const orderId = orderSnapshot.key;
        const order = orderSnapshot.val();
        const row = document.getElementById(`order-${orderId}`);
        if (!row) return;

        const completedStatuses = ['completed', 'expired', 'finished_by_user'];
        if (completedStatuses.includes(order.status)) {
            row.style.opacity = '0';
            setTimeout(() => { row.remove(); checkAndSetPlaceholder(); }, 500);
            return;
        }

        const phoneCell = row.querySelector('.phone-cell');
        if (order.status === 'out_of_stock') {
            phoneCell.innerHTML = '<strong><span class="text-danger">STOK HABIS!</span></strong>';
        } else if (order.phoneNumber) {
            phoneCell.innerHTML = `<strong>${order.phoneNumber}</strong>`;
        }
    });
}

// ---- TITIK MASUK UTAMA ----
// 1. Listen untuk setiap user yang ADA atau BARU ditambahkan
ordersRef.on('child_added', (userSnapshot) => {
    const userId = userSnapshot.key;
    attachListenersToUser(userId); // Pasang listener lengkap untuk user tersebut
});

// Pengecekan awal saat halaman dimuat
ordersRef.once('value', (snapshot) => {
    if (!snapshot.exists()) {
        checkAndSetPlaceholder();
    }
});
