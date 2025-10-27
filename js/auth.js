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
const database = firebase.database();
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const alertMessage = document.getElementById('alert-message');
function showAlert(message, type = 'danger') {
    alertMessage.textContent = message;
    alertMessage.className = `alert alert-${type}`;
}
auth.onAuthStateChanged(user => { if (user) { window.location.href = 'dashboard.html'; } });
loginBtn.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    if (!email || !password) { showAlert('Email dan password harus diisi.'); return; }
    auth.signInWithEmailAndPassword(email, password).catch(error => { showAlert(error.message); });
});
registerBtn.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    if (!email || !password) { showAlert('Email dan password harus diisi.'); return; }
    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
            const user = userCredential.user;
            database.ref('users/' + user.uid).set({ email: user.email, balance: 0 });
        })
        .catch(error => { showAlert(error.message); });
});
