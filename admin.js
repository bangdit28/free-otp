// ======================================================
// !! PENTING !! GANTI DENGAN KONFIGURASI FIREBASE ANDA
// ======================================================
const firebaseConfig = {
  apiKey: "AIzaSyA1zcoV_V33awRZXxhwK8-4m1_qrfMGL_U",
  authDomain: "jasa-otp-56b5d.firebaseapp.com",
  databaseURL: "https://jasa-otp-56b5d-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "jasa-otp-56b5d",
  storageBucket: "jasa-otp-56b5d.firebasestorage.app",
  messagingSenderId: "807138993237",
  appId: "1:807138993237:web:2ff9266337570e4dad20dc"
};

// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// --- Elemen DOM ---
const tableBody = document.getElementById('orders-table-body');

// Referensi ke 'orders' di database
const ordersRef = database.ref('orders');

// Dengarkan perubahan pada semua order
ordersRef.on('value', (snapshot) => {
    tableBody.innerHTML = ''; // Kosongkan tabel setiap ada update
    const orders = snapshot.val();

    if (!orders) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Tidak ada pesanan.</td></tr>';
        return;
    }

    let hasActiveOrder = false;
    // Loop melalui setiap order
    for (const orderId in orders) {
        const order = orders[orderId];

        // Hanya tampilkan order yang belum selesai (statusnya bukan 'completed')
        if (order.status !== 'completed' && order.status !== 'expired') {
            hasActiveOrder = true;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${orderId}</td>
                <td>${order.serviceName}</td>
                <td>
                    <input type="text" class="form-control phone-input" data-order-id="${orderId}" placeholder="Masukkan nomor HP" value="${order.phoneNumber || ''}">
                </td>
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

    // Tambahkan event listener untuk tombol dan input yang baru dibuat
    addEventListenersToControls();
});

function addEventListenersToControls() {
    // Event listener untuk input nomor telepon
    document.querySelectorAll('.phone-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const orderId = e.target.dataset.orderId;
            const phoneNumber = e.target.value;
            // Update nomor telepon di Firebase
            database.ref('orders/' + orderId).update({
                phoneNumber: phoneNumber,
                status: 'waiting_otp'
            });
        });
    });

    // Event listener untuk tombol 'Kirim'
    document.querySelectorAll('.btn-send-otp').forEach(button => {
        button.addEventListener('click', (e) => {
            const orderId = e.target.dataset.orderId;
            const otpInput = e.target.closest('tr').querySelector('.otp-input');
            const otpCode = otpInput.value;

            if (otpCode) {
                // Update kode OTP dan status di Firebase
                database.ref('orders/' + orderId).update({
                    otpCode: otpCode,
                    status: 'completed'
                }).then(() => {
                    console.log(`OTP untuk ${orderId} berhasil dikirim.`);
                });
            } else {
                alert('Kode OTP tidak boleh kosong!');
            }
        });
    });
}
