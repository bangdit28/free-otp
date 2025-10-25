// ======================================================
// !! PENTING !! GANTI DENGAN KONFIGURASI FIREBASE ANDA
// ======================================================
const firebaseConfig = {
      apiKey: "AIzaSyC8iKBFA9rZBnXqSmN8sxSSJ-HlazvM_rM",
  authDomain: "freeotp-f99d4.firebaseapp.com",
  databaseURL: "https://freeotp-f99d4-default-rtdb.firebaseio.com",
  projectId: "freeotp-f99d4",
  storageBucket: "freeotp-f99d4.firebasestorage.app",
  messagingSenderId: "236669593071",
  appId: "1:236669593071:web:fe780ee2580df4aeea021a"
};

// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// --- Elemen DOM ---
const tableBody = document.getElementById('orders-table-body');
const addStockBtn = document.getElementById('add-stock-btn');
const numberTextarea = document.getElementById('number-textarea');
const serviceSelect = document.getElementById('service-select');
const stockCountDisplay = document.getElementById('stock-count-display');
const feedbackMessage = document.getElementById('feedback-message');

// --- Referensi Database ---
const ordersRef = database.ref('orders');
const numberStockRef = database.ref('number_stock');


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
    if (!numbersRaw) {
        showFeedback('Kolom nomor tidak boleh kosong.', true);
        return;
    }
    const numbers = numbersRaw.split('\n').map(n => n.trim()).filter(n => n.length > 0);
    if (numbers.length > 100) {
        showFeedback('Maksimal 100 nomor sekali tambah.', true);
        return;
    }
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
// BAGIAN 2: MANAJEMEN PESANAN (STRATEGI BARU ANTI-NGEDIP)
// ======================================================

function assignNumberToOrder(orderId, service) {
    const stockRef = numberStockRef.child(service);
    stockRef.orderByChild('status').equalTo('available').limitToFirst(1).once('value', (snapshot) => {
        if (snapshot.exists()) {
            const stockId = Object.keys(snapshot.val())[0];
            const stockData = snapshot.val()[stockId];
            const updates = {};
            updates[`/orders/${orderId}/phoneNumber`] = stockData.number;
            updates[`/orders/${orderId}/status`] = 'waiting_otp';
            updates[`/number_stock/${service}/${stockId}/status`] = 'in_use';
            updates[`/number_stock/${service}/${stockId}/orderId`] = orderId;
            database.ref().update(updates);
        } else {
            database.ref(`/orders/${orderId}/status`).set('out_of_stock');
        }
    });
}

function sendOtp(button) {
    const orderId = button.dataset.orderId;
    const otpInput = button.closest('tr').querySelector('.otp-input');
    const otpCode = otpInput.value;

    if (otpCode) {
        // Update status pesanan menjadi 'completed'
        ordersRef.child(orderId).update({
            otpCode: otpCode,
            status: 'completed'
        });
        // Tidak perlu menghapus baris di sini, listener child_changed akan menanganinya
    } else {
        alert('Kode OTP tidak boleh kosong!');
    }
}

// ---- LISTENER BARU YANG LEBIH CERDAS ----

// 1. Saat ada pesanan BARU masuk
ordersRef.orderByChild('status').equalTo('waiting_number').on('child_added', (snapshot) => {
    const orderId = snapshot.key;
    const order = snapshot.val();
    
    // Cegah duplikasi jika halaman di-refresh
    if(document.getElementById(`order-${orderId}`)) return;

    // Hapus placeholder "Tidak ada pesanan" jika ada
    const placeholder = tableBody.querySelector('.placeholder-row');
    if (placeholder) placeholder.remove();

    // Buat baris baru
    const row = document.createElement('tr');
    row.id = `order-${orderId}`; // Beri ID unik pada baris
    row.innerHTML = `
        <td>${orderId}</td>
        <td>${order.serviceName}</td>
        <td class="phone-cell"><span class="text-warning">Mencari nomor...</span></td>
        <td>
            <input type="text" class="form-control otp-input" placeholder="Masukkan kode OTP">
        </td>
        <td>
            <button class="btn btn-success btn-send-otp" data-order-id="${orderId}" onclick="sendOtp(this)">Kirim</button>
        </td>
    `;
    tableBody.appendChild(row);

    // Otomatis carikan nomor untuk pesanan baru ini
    assignNumberToOrder(orderId, 'facebook_indonesia');
});

// 2. Saat pesanan yang SUDAH ADA berubah (misal: dapat nomor, atau statusnya jadi completed)
ordersRef.on('child_changed', (snapshot) => {
    const orderId = snapshot.key;
    const order = snapshot.val();
    const row = document.getElementById(`order-${orderId}`);

    if (!row) return; // Jika baris tidak ada di DOM, abaikan

    // Jika pesanan selesai, hapus barisnya dari tabel secara mulus
    if (order.status === 'completed' || order.status === 'expired') {
        row.style.opacity = '0';
        setTimeout(() => row.remove(), 500); // Hapus setelah animasi fade out
        return;
    }

    // Jika nomor telepon diperbarui atau stok habis
    const phoneCell = row.querySelector('.phone-cell');
    if (order.status === 'out_of_stock') {
        phoneCell.innerHTML = '<strong><span class="text-danger">STOK HABIS!</span></strong>';
    } else if (order.phoneNumber) {
        phoneCell.innerHTML = `<strong>${order.phoneNumber}</strong>`;
    }
});

// Tampilkan placeholder jika tidak ada pesanan aktif saat halaman pertama kali dimuat
ordersRef.once('value', (snapshot) => {
    if (!snapshot.exists() || Object.values(snapshot.val()).every(o => o.status === 'completed' || o.status === 'expired')) {
        tableBody.innerHTML = '<tr class="placeholder-row"><td colspan="5" class="text-center">Tidak ada pesanan aktif.</td></tr>';
    }
});
