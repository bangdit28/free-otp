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
// BAGIAN 1: MANAJEMEN STOK
// ======================================================

// Tampilkan pesan feedback ke admin
function showFeedback(message, isError = false) {
    feedbackMessage.textContent = message;
    feedbackMessage.className = isError ? 'mt-2 text-danger' : 'mt-2 text-success';
    setTimeout(() => feedbackMessage.textContent = '', 4000);
}

// Event listener untuk tombol tambah stok
addStockBtn.addEventListener('click', () => {
    const selectedService = serviceSelect.value;
    const numbersRaw = numberTextarea.value.trim();

    if (!numbersRaw) {
        showFeedback('Kolom nomor tidak boleh kosong.', true);
        return;
    }

    // Pisahkan nomor berdasarkan baris baru, hapus spasi, dan saring baris kosong
    const numbers = numbersRaw.split('\n')
        .map(n => n.trim())
        .filter(n => n.length > 0);
    
    if (numbers.length > 100) {
        showFeedback('Maksimal 100 nomor sekali tambah.', true);
        return;
    }
    
    addStockBtn.disabled = true;
    addStockBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Menambahkan...';
    
    let successCount = 0;
    const totalNumbers = numbers.length;

    numbers.forEach(number => {
        const newStockEntry = {
            number: number,
            status: 'available', // Status: available, in_use
            addedAt: firebase.database.ServerValue.TIMESTAMP
        };
        // Gunakan push() untuk membuat ID unik untuk setiap nomor
        numberStockRef.child(selectedService).push(newStockEntry, (error) => {
            if (!error) {
                successCount++;
            }
            if (successCount === totalNumbers) {
                 showFeedback(`Berhasil menambahkan ${successCount} nomor baru.`);
                 numberTextarea.value = ''; // Kosongkan textarea
                 addStockBtn.disabled = false;
                 addStockBtn.innerHTML = '<i class="bi bi-plus-circle-fill"></i> Tambah Stok';
            }
        });
    });
});

// Listener untuk menghitung dan menampilkan jumlah stok yang 'available'
numberStockRef.child('facebook_indonesia').orderByChild('status').equalTo('available').on('value', (snapshot) => {
    stockCountDisplay.textContent = snapshot.numChildren(); // numChildren() efisien untuk menghitung
});

// ======================================================
// BAGIAN 2: MANAJEMEN PESANAN (DENGAN OTOMATISASI)
// ======================================================

// Fungsi untuk secara otomatis mengambil nomor dari stok dan memberikannya ke pesanan
function assignNumberToOrder(orderId, service) {
    const stockRef = numberStockRef.child(service);

    // Cari 1 nomor yang statusnya 'available'
    stockRef.orderByChild('status').equalTo('available').limitToFirst(1).once('value', (snapshot) => {
        if (snapshot.exists()) {
            const stockId = Object.keys(snapshot.val())[0];
            const stockData = snapshot.val()[stockId];
            
            // Siapkan multi-path update untuk memastikan kedua operasi (update order & stok) terjadi bersamaan
            const updates = {};
            updates[`/orders/${orderId}/phoneNumber`] = stockData.number;
            updates[`/orders/${orderId}/status`] = 'waiting_otp';
            updates[`/number_stock/${service}/${stockId}/status`] = 'in_use';
            updates[`/number_stock/${service}/${stockId}/orderId`] = orderId; // Tandai nomor dipakai order mana

            database.ref().update(updates);

        } else {
            // Stok habis!
            database.ref(`/orders/${orderId}/status`).set('out_of_stock');
        }
    });
}

// Listener utama untuk semua pesanan
ordersRef.on('value', (snapshot) => {
    tableBody.innerHTML = '';
    const orders = snapshot.val();

    if (!orders) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Tidak ada pesanan.</td></tr>';
        return;
    }

    let hasActiveOrder = false;
    for (const orderId in orders) {
        const order = orders[orderId];

        // Otomatisasi: Jika ada pesanan baru, langsung carikan nomor
        if (order.status === 'waiting_number') {
            assignNumberToOrder(orderId, 'facebook_indonesia'); // Asumsi layanan dari serviceSelect
        }
        
        // Hanya tampilkan yang belum selesai
        if (order.status !== 'completed' && order.status !== 'expired') {
            hasActiveOrder = true;
            let phoneNumberDisplay = '';
            
            if(order.status === 'out_of_stock') {
                phoneNumberDisplay = '<span class="text-danger">STOK HABIS!</span>';
            } else if (order.phoneNumber) {
                phoneNumberDisplay = order.phoneNumber;
            } else {
                phoneNumberDisplay = '<span class="text-warning">Mencari nomor...</span>';
            }
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${orderId}</td>
                <td>${order.serviceName}</td>
                <td><strong>${phoneNumberDisplay}</strong></td>
                <td>
                    <input type="text" class="form-control otp-input" placeholder="Masukkan kode OTP">
                </td>
                <td>
                    <button class="btn btn-success btn-send-otp" data-order-id="${orderId}">Kirim</button>
                </td>
            `;
            tableBody.appendChild(row);
        }
    }

    if (!hasActiveOrder) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Tidak ada pesanan aktif.</td></tr>';
    }
    
    addSendOtpListeners();
});

function addSendOtpListeners() {
    document.querySelectorAll('.btn-send-otp').forEach(button => {
        button.addEventListener('click', (e) => {
            const orderId = e.target.dataset.orderId;
            const otpInput = e.target.closest('tr').querySelector('.otp-input');
            const otpCode = otpInput.value;

            if (otpCode) {
                ordersRef.child(orderId).update({
                    otpCode: otpCode,
                    status: 'completed'
                });
            } else {
                alert('Kode OTP tidak boleh kosong!');
            }
        });
    });
}
