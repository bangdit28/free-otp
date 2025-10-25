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
// (Elemen DOM untuk manajemen stok)
const addStockBtn = document.getElementById('add-stock-btn');
const numberTextarea = document.getElementById('number-textarea');
const serviceSelect = document.getElementById('service-select');
const stockCountDisplay = document.getElementById('stock-count-display');
const feedbackMessage = document.getElementById('feedback-message');


// ======================================================
// BAGIAN 1: MANAJEMEN STOK (TIDAK BERUBAH)
// ======================================================
function showFeedback(message, isError = false) {
    feedbackMessage.textContent = message;
    feedbackMessage.className = isError ? 'mt-2 text-danger' : 'mt-2 text-success';
    setTimeout(() => feedbackMessage.textContent = '', 4000);
}
addStockBtn.addEventListener('click', () => {
    const selectedService = serviceSelect.value;
    const numbersRaw = numberTextarea.value.trim();
    if (!numbersRaw) { showFeedback('Kolom nomor tidak boleh kosong.', true); return; }
    const numbers = numbersRaw.split('\n').map(n => n.trim()).filter(n => n.length > 0);
    if (numbers.length > 100) { showFeedback('Maksimal 100 nomor sekali tambah.', true); return; }
    addStockBtn.disabled = true;
    addStockBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Menambahkan...';
    let successCount = 0;
    const totalNumbers = numbers.length;
    numbers.forEach(number => {
        const newStockEntry = { number: number, status: 'available', addedAt: firebase.database.ServerValue.TIMESTAMP };
        numberStockRef.child(selectedService).push(newStockEntry, (error) => {
            if (!error) successCount++;
            if (successCount === totalNumbers) {
                 showFeedback(`Berhasil menambahkan ${successCount} nomor baru.`);
                 numberTextarea.value = '';
                 addStockBtn.disabled = false;
                 addStockBtn.innerHTML = '<i class="bi bi-plus-circle-fill"></i> Tambah Stok';
            }
        });
    });
});
numberStockRef.child('facebook_indonesia').orderByChild('status').equalTo('available').on('value', (snapshot) => {
    stockCountDisplay.textContent = snapshot.numChildren();
});


// ======================================================
// BAGIAN 2: MANAJEMEN PESANAN (STRATEGI BARU UNTUK MEMPERBAIKI BUG)
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
    if (tableBody.children.length === 0 || (tableBody.children.length === 1 && tableBody.firstElementChild.classList.contains('placeholder-row'))) {
        tableBody.innerHTML = '<tr class="placeholder-row"><td colspan="5" class="text-center">Tidak ada pesanan aktif.</td></tr>';
    } else {
        const placeholder = tableBody.querySelector('.placeholder-row');
        if (placeholder) placeholder.remove();
    }
}

// ---- LISTENER BARU YANG LEBIH CERDAS DAN ANTI-BUG ----

// 1. Dijalankan untuk setiap PENGGUNA yang memiliki pesanan
ordersRef.on('child_added', (userSnapshot) => {
    const userId = userSnapshot.key;
    const userOrdersRef = database.ref(`orders/${userId}`);

    // 2. Dijalankan untuk setiap PESANAN BARU dari pengguna tersebut
    userOrdersRef.orderByChild('status').equalTo('waiting_number').on('child_added', (orderSnapshot) => {
        const orderId = orderSnapshot.key;
        const order = orderSnapshot.val();

        if (document.getElementById(`order-${orderId}`)) return;
        checkAndSetPlaceholder(); // Hapus placeholder jika ada

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
    });

    // 3. Dijalankan saat pesanan yang sudah ada di tabel BERUBAH
    userOrdersRef.on('child_changed', (orderSnapshot) => {
        const orderId = orderSnapshot.key;
        const order = orderSnapshot.val();
        const row = document.getElementById(`order-${orderId}`);

        if (!row) return;

        // Jika pesanan selesai (completed) atau dihapus oleh user (finished_by_user), hapus barisnya
        const completedStatuses = ['completed', 'expired', 'finished_by_user'];
        if (completedStatuses.includes(order.status)) {
            row.style.opacity = '0';
            setTimeout(() => {
                row.remove();
                checkAndSetPlaceholder(); // Cek lagi apakah tabel jadi kosong
            }, 500);
            return;
        }

        // Update sel nomor telepon jika berubah
        const phoneCell = row.querySelector('.phone-cell');
        if
