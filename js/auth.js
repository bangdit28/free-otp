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
const database = firebase.database(); // Tambahkan referensi database

// DOM Elements
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const alertMessage = document.getElementById('alert-message');

function showAlert(message, type = 'danger') {
    alertMessage.textContent = message;
    alertMessage.className = `alert alert-${type}`;
}

// Cek jika pengguna sudah login, langsung arahkan ke dashboard
auth.onAuthStateChanged(user => {
    if (user) {
        window.location.href = 'dashboard.html';
    }
});

// Handle Login
loginBtn.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    if (!email || !password) {
        showAlert('Email dan password harus diisi.');
        return;
    }
    auth.signInWithEmailAndPassword(email, password)
        .then(userCredential => {
            // Login berhasil, onAuthStateChanged akan handle redirect
        })
        .catch(error => {
            showAlert(error.message);
        });
});

// Handle Register
registerBtn.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    if (!email || !password) {
        showAlert('Email dan password harus diisi.');
        return;
    }
    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
            const user = userCredential.user;
            // BARU: Buat profil pengguna di database dengan saldo awal
            database.ref('users/' + user.uid).set({
                email: user.email,
                balance: 0 // Saldo awal
            });
            // onAuthStateChanged akan handle redirect
        })
        .catch(error => {
            showAlert(error.message);
        });
});
