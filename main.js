// ======================================================
// !! PENTING !! GANTI DENGAN KONFIGURASI FIREBASE ANDA
// ======================================================
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project-id.firebaseapp.com",
  databaseURL: "https://your-project-id-default-rtdb.firebaseio.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};

// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// --- Elemen DOM ---
const orderButtons = document.querySelectorAll('.btn-order');
const otpModal = new bootstrap.Modal(document.getElementById('otpModal'));
const serviceNameEl = document.getElementById('serviceName');
const phoneNumberEl = document.getElementById('phoneNumberDisplay');
const otpCodeEl = document.getElementById('otpCodeDisplay');
const otpStatusTextEl = document.getElementById('otpStatusText');
const orderIdEl = document.getElementById('orderIdDisplay');

// Fungsi untuk membuat ID unik
function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Tambahkan event listener ke setiap tombol 'Pesan'
orderButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        const serviceItem = e.target.closest('.service-list-item');
        const serviceId = serviceItem.dataset.serviceId;
        const serviceName = serviceItem.dataset.serviceName;
        const price = serviceItem.dataset.price;
        const orderId = generateUniqueId();

        // Tampilkan data awal di modal
        serviceNameEl.textContent = serviceName;
        orderIdEl.textContent = orderId;
        phoneNumberEl.textContent = 'Menunggu nomor dari admin...';
        otpCodeEl.innerHTML = `<div class="spinner-border" role="status"></div> <span id="otpStatusText">Menunggu kode...</span>`;
        
        // Tampilkan modal
        otpModal.show();

        // Buat entri baru di Firebase
        const orderRef = database.ref('orders/' + orderId);
        orderRef.set({
            serviceName: serviceName,
            price: price,
            status: 'waiting_number', // Status awal
            phoneNumber: '',
            otpCode: '',
            timestamp: firebase.database.ServerValue.TIMESTAMP
        }).then(() => {
            console.log(`Pesanan ${orderId} berhasil dibuat.`);
            // Mulai mendengarkan perubahan pada pesanan ini
            listenToOrderUpdates(orderId);
        });
    });
});

// Fungsi untuk mendengarkan update dari Firebase
function listenToOrderUpdates(orderId) {
    const orderRef = database.ref('orders/' + orderId);
    
    orderRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        // Update nomor telepon jika sudah diisi admin
        if (data.phoneNumber) {
            phoneNumberEl.textContent = data.phoneNumber;
        }

        // Update kode OTP jika sudah diisi admin
        if (data.otpCode) {
            otpCodeEl.innerHTML = `<h2 class="fw-bold text-success">${data.otpCode}</h2>`;
            // Berhenti mendengarkan setelah OTP diterima untuk menghemat resource
            orderRef.off(); 
        }

        // Handle status lain (misal: kedaluwarsa, dibatalkan)
        if (data.status === 'expired') {
            otpCodeEl.innerHTML = `<p class="text-danger">Pesanan Kedaluwarsa.</p>`;
            orderRef.off();
        }
    });
}
