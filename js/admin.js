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

const tableBody = document.getElementById('orders-table-body');
// ... (kode manajemen stok lainnya tetap sama) ...
const addStockBtn = document.getElementById('add-stock-btn');
const numberTextarea = document.getElementById('number-textarea');
const serviceSelect = document.getElementById('service-select');
const stockCountDisplay = document.getElementById('stock-count-display');
const feedbackMessage = document.getElementById('feedback-message');
const ordersRef = database.ref('orders');
const numberStockRef = database.ref('number_stock');

// ... (KODE MANAJEMEN STOK DARI SEBELUMNYA DI-PASTE DI SINI, TIDAK ADA PERUBAHAN) ...
// (Saya singkat agar tidak terlalu panjang, tapi pastikan kode manajemen stok Anda ada di sini)
function showFeedback(message, isError = false) { /* ... */ }
addStockBtn.addEventListener('click', () => { /* ... */ });
numberStockRef.child('facebook_indonesia').orderByChild('status').equalTo('available').on('value', (snapshot) => { stockCountDisplay.textContent = snapshot.numChildren(); });


// ======================================================
// BAGIAN 2: MANAJEMEN PESANAN (STRUKTUR DATA BARU)
// ======================================================

function assignNumberToOrder(userId, orderId, service) {
    const stockRef = numberStockRef.child(service);
    stockRef.orderByChild('status').equalTo('available').limitToFirst(1).once('value', (snapshot) => {
        if (snapshot.exists()) {
            const stockId = Object.keys(snapshot.val())[0];
            const stockData = snapshot.val()[stockId];
            const updates = {};
            // PATH BARU: menyertakan userId
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
    const { userId, orderId } = button.dataset; // Ambil userId dan orderId
    const otpInput = button.closest('tr').querySelector('.otp-input');
    const otpCode = otpInput.value;
    if (otpCode) {
        // PATH BARU: menyertakan userId
        database.ref(`orders/${userId}/${orderId}`).update({
            otpCode: otpCode,
            status: 'completed'
        });
    } else {
        alert('Kode OTP tidak boleh kosong!');
    }
}

// Listener BARU untuk struktur data nested (users -> orders)
ordersRef.on('value', (snapshot) => {
    tableBody.innerHTML = '';
    const allUsersOrders = snapshot.val();
    let hasActiveOrder = false;

    if (!allUsersOrders) {
        tableBody.innerHTML = '<tr class="placeholder-row"><td colspan="5" class="text-center">Tidak ada pesanan aktif.</td></tr>';
        return;
    }

    // Loop pertama: untuk setiap user
    for (const userId in allUsersOrders) {
        const userOrders = allUsersOrders[userId];
        // Loop kedua: untuk setiap pesanan dari user tersebut
        for (const orderId in userOrders) {
            const order = userOrders[orderId];

            if (order.status === 'waiting_number') {
                assignNumberToOrder(userId, orderId, 'facebook_indonesia');
            }

            if (order.status !== 'completed' && order.status !== 'expired' && order.status !== 'finished_by_user') {
                 hasActiveOrder = true;
                const row = document.createElement('tr');
                row.id = `order-${orderId}`;
                
                let phoneHTML = order.phoneNumber ? `<strong>${order.phoneNumber}</strong>` : `<span class="text-warning">Mencari...</span>`;
                if(order.status === 'out_of_stock') phoneHTML = `<strong class="text-danger">STOK HABIS!</strong>`;

                row.innerHTML = `
                    <td>${orderId.substring(0, 8)}...</td>
                    <td>${order.serviceName}</td>
                    <td class="phone-cell">${phoneHTML}</td>
                    <td><input type="text" class="form-control otp-input" placeholder="Masukkan OTP"></td>
                    <td>
                        <button class="btn btn-success btn-send-otp" data-user-id="${userId}" data-order-id="${orderId}" onclick="sendOtp(this)">Kirim</button>
                    </td>
                `;
                tableBody.appendChild(row);
            }
        }
    }
    
    if (!hasActiveOrder) {
        tableBody.innerHTML = '<tr class="placeholder-row"><td colspan="5" class="text-center">Tidak ada pesanan aktif.</td></tr>';
    }
});
