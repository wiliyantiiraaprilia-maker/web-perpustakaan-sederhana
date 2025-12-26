const AUTH_API = 'http://localhost:4000';
const BOOK_API = 'http://localhost:5000';
let allBooks = []; // Simpan data buku lokal untuk mempermudah edit

// --- AUTHENTICATION ---
async function handleLogin(event) {
    event.preventDefault();
    const usernameInput = document.getElementById('username').value;
    const passwordInput = document.getElementById('password').value;
    const alertBox = document.getElementById('login-alert');

    try {
        const response = await fetch(`${AUTH_API}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: usernameInput, password: passwordInput })
        });
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('username', data.user.username);
            localStorage.setItem('role', data.user.role);
            
            alertBox.className = 'alert alert-success';
            alertBox.innerText = 'Login Berhasil!';
            alertBox.classList.remove('d-none');
            setTimeout(() => { window.location.href = 'index.html'; }, 1000);
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        alertBox.className = 'alert alert-danger';
        alertBox.innerText = error.message;
        alertBox.classList.remove('d-none');
    }
}

function handleLogout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

function checkLoginStatus() {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const navLogin = document.getElementById('nav-login');
    const navUser = document.getElementById('nav-user');
    const usernameDisplay = document.getElementById('username-display');

    if (token && navUser) {
        navLogin.classList.add('d-none');
        navUser.classList.remove('d-none');
        usernameDisplay.innerText = username;
    } else if (navLogin) {
        navLogin.classList.remove('d-none');
        navUser.classList.add('d-none');
    }
}

// --- LOAD BUKU ---
async function loadBooks() {
    const listContainer = document.getElementById('book-list');
    if (!listContainer) return;

    const role = localStorage.getItem('role');
    listContainer.innerHTML = '<div class="col-12 text-center"><div class="spinner-border text-primary"></div></div>';

    try {
        const response = await fetch(`${BOOK_API}/books`);
        allBooks = await response.json(); // Simpan ke variabel global
        listContainer.innerHTML = '';
        
        const placeholderImages = [
            "https://picsum.photos/id/24/400/600", "https://picsum.photos/id/20/400/600",
            "https://picsum.photos/id/3/400/600", "https://picsum.photos/id/367/400/600",
            "https://picsum.photos/id/119/400/600", "https://picsum.photos/id/180/400/600",
            "https://picsum.photos/id/2/400/600", "https://picsum.photos/id/48/400/600",
            "https://picsum.photos/id/60/400/600"
        ];

        allBooks.forEach((book, index) => {
            const isStockEmpty = book.stock <= 0;
            const imageUrl = placeholderImages[index % placeholderImages.length];
            let actionButton = '';

            if (role === 'admin') {
                // ADMIN: Tombol Edit (Kuning) & Hapus (Merah)
                actionButton = `
                    <div class="d-flex gap-2 mt-2">
                        <button onclick="enableEditMode(${book.id})" class="btn btn-primary flex-grow-1 fw-bold">
                            <i class="bi bi-plus-lg"></i> Tambah Stok
                        </button>
                        <button onclick="deleteBook(${book.id})" class="btn btn-danger flex-grow-1 fw-bold">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                `;
            } else {
                // USER: Pinjam / Kembalikan
                const btnState = isStockEmpty ? 'btn-secondary disabled' : 'btn-primary';
                actionButton = `
                    <button onclick="borrowBook(${book.id})" class="btn ${btnState} w-100 fw-bold" ${isStockEmpty ? 'disabled' : ''}>
                        ${isStockEmpty ? 'Habis' : 'Pinjam'}
                    </button>
                    <button onclick="returnBook(${book.id})" class="btn btn-outline-success w-100 mt-2 fw-bold">Kembalikan</button>
                `;
            }

            const card = `
                <div class="col-md-4 mb-4">
                    <div class="card h-100 shadow-sm border-0">
                        <div class="card-img-wrapper position-relative" style="height:250px; overflow:hidden;">
                            <img src="${imageUrl}" class="card-img-top" style="object-fit:cover; height:100%; width:100%;">
                            <span class="position-absolute top-0 end-0 badge bg-warning text-dark m-2">${book.category || 'Umum'}</span>
                        </div>
                        <div class="card-body">
                            <h5 class="card-title fw-bold text-truncate">${book.title}</h5>
                            <h6 class="card-subtitle mb-2 text-muted">${book.author}</h6>
                            <p class="text-muted small">Stok: <strong>${book.stock}</strong></p>
                            ${actionButton}
                        </div>
                    </div>
                </div>
            `;
            listContainer.innerHTML += card;
        });

        const adminPanel = document.getElementById('admin-panel');
        if (role === 'admin' && adminPanel) adminPanel.classList.remove('d-none');

    } catch (error) {
        listContainer.innerHTML = '<div class="alert alert-danger">Gagal memuat data.</div>';
    }
}

// --- LOGIKA FORM (CREATE & UPDATE) ---

// 1. Fungsi Mengaktifkan Mode Edit (Saat tombol Edit diklik)
function enableEditMode(id) {
    const book = allBooks.find(b => b.id === id);
    if (!book) return;

    // Isi form dengan data buku yang dipilih
    document.getElementById('editBookId').value = book.id;
    document.getElementById('newTitle').value = book.title;
    document.getElementById('newAuthor').value = book.author;
    document.getElementById('newCategory').value = book.category;
    document.getElementById('newStock').value = book.stock;

    // Ubah Tampilan Tombol
    document.getElementById('btn-submit').innerHTML = '<i class="bi bi-check-lg"></i> Update';
    document.getElementById('btn-submit').classList.replace('btn-success', 'btn-primary');
    document.getElementById('btn-cancel').classList.remove('d-none');
    
    // Scroll ke atas agar admin sadar form sudah terisi
    document.getElementById('admin-panel').scrollIntoView({ behavior: 'smooth' });
}

// 2. Fungsi Reset Form (Kembali ke Mode Tambah)
function resetForm() {
    document.getElementById('editBookId').value = '';
    document.getElementById('newTitle').value = '';
    document.getElementById('newAuthor').value = '';
    document.getElementById('newCategory').value = '';
    document.getElementById('newStock').value = '';

    document.getElementById('btn-submit').innerHTML = '<i class="bi bi-plus-lg"></i>';
    document.getElementById('btn-submit').classList.replace('btn-primary', 'btn-success');
    document.getElementById('btn-cancel').classList.add('d-none');
}

// 3. Handle Submit (Bisa Create atau Update)
async function handleBookForm(event) {
    event.preventDefault();
    const token = localStorage.getItem('token');
    
    const id = document.getElementById('editBookId').value;
    const title = document.getElementById('newTitle').value;
    const author = document.getElementById('newAuthor').value;
    const category = document.getElementById('newCategory').value;
    const stock = document.getElementById('newStock').value;

    // Tentukan: INI UPDATE atau CREATE?
    const isEdit = id !== ""; 
    const url = isEdit ? `${BOOK_API}/books/${id}` : `${BOOK_API}/books`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ title, author, category, stock })
        });

        if (response.ok) {
            alert(isEdit ? "Buku berhasil diperbarui!" : "Buku berhasil ditambahkan!");
            resetForm(); // Bersihkan form
            loadBooks(); // Reload daftar
        } else {
            alert("Gagal memproses data.");
        }
    } catch (e) { alert("Error koneksi"); }
}

// --- FUNGSI HAPUS ---
async function deleteBook(id) {
    if(!confirm("Yakin hapus buku ini?")) return;
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${BOOK_API}/books/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const res = await response.json();
        alert(res.message);
        if(response.ok) loadBooks();
    } catch (e) { alert("Error koneksi"); }
}

// --- FUNGSI USER ---
async function borrowBook(bookId) {
    const token = localStorage.getItem('token');
    if (!token) { alert("Harap login dulu!"); return; }
    if (!confirm("Pinjam buku ini?")) return;

    try {
        const response = await fetch(`${BOOK_API}/borrow`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ bookId })
        });
        const res = await response.json();
        alert(res.message);
        if(response.ok) loadBooks();
    } catch (e) { alert("Error koneksi"); }
}

async function returnBook(bookId) {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
        const response = await fetch(`${BOOK_API}/return`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ bookId })
        });
        const res = await response.json();
        alert(res.message);
        if(response.ok) loadBooks();
    } catch (e) { alert("Error koneksi"); }
}
