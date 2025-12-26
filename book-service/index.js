const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = process.env.JWT_SECRET || 'kunci_cadangan_jika_env_gagal';

app.use(cors());
app.use(express.json());

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: 5432,
});

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: "Akses ditolak: Butuh Token" });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ message: "Token tidak valid" });
        req.user = user;
        next();
    });
};

// --- ENDPOINT INIT DB (UPDATE STRUKTUR TABEL) ---
app.get('/init-db', async (req, res) => {
    try {
        // Tabel Buku (Tambah kolom category)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS books (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                author VARCHAR(255),
                category VARCHAR(100),  -- Kolom Baru
                stock INTEGER DEFAULT 0
            );
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS borrowings (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                user_name VARCHAR(100),
                book_id INTEGER NOT NULL,
                borrow_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Reset Data
        await pool.query('TRUNCATE TABLE books RESTART IDENTITY CASCADE');

        // Isi Data Dummy dengan Kategori
        await pool.query(`
            INSERT INTO books (title, author, category, stock) VALUES 
            ('Belajar Microservices', 'Fulan', 'Teknologi', 5),
            ('Tutorial Docker Lengkap', 'Fulana', 'Teknologi', 3),
            ('Resep Masakan Padang', 'Budi', 'Kuliner', 0),
            ('Algoritma & Struktur Data', 'Rina', 'Edukasi', 12),
            ('Dasar-Dasar Python', 'Andi', 'Teknologi', 8),
            ('Mastering React JS', 'Siti', 'Teknologi', 5),
            ('Keamanan Jaringan', 'Joko', 'Teknologi', 4),
            ('Kecerdasan Buatan (AI)', 'Eko', 'Sains', 6),
            ('Desain UI/UX Modern', 'Dian', 'Desain', 7);
        `);

        res.send("Database berhasil di-reset dengan kategori buku!");
    } catch (err) {
        res.status(500).send(err.toString());
    }
});

app.get('/books', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM books ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Database Error" });
    }
});

app.post('/borrow', authenticateToken, async (req, res) => {
    const { bookId } = req.body;
    const { id: userId, username } = req.user;

    try {
        const bookCheck = await pool.query('SELECT * FROM books WHERE id = $1', [bookId]);
        if (bookCheck.rows.length === 0) return res.status(404).json({ message: "Buku tidak ditemukan" });
        const book = bookCheck.rows[0];
        if (book.stock <= 0) return res.status(400).json({ message: "Stok buku habis!" });

        await pool.query('UPDATE books SET stock = stock - 1 WHERE id = $1', [bookId]);
        await pool.query('INSERT INTO borrowings (user_id, user_name, book_id) VALUES ($1, $2, $3)', [userId, username, bookId]);

        res.json({ message: "Peminjaman Berhasil!", remaining_stock: book.stock - 1 });
    } catch (err) {
        res.status(500).json({ message: "Gagal memproses peminjaman" });
    }
});

app.post('/return', authenticateToken, async (req, res) => {
    const { bookId } = req.body;
    const userId = req.user.id;
    try {
        const check = await pool.query('SELECT * FROM borrowings WHERE user_id = $1 AND book_id = $2', [userId, bookId]);
        if (check.rows.length === 0) return res.status(400).json({ message: "Anda tidak sedang meminjam buku ini." });

        await pool.query('DELETE FROM borrowings WHERE user_id = $1 AND book_id = $2', [userId, bookId]);
        await pool.query('UPDATE books SET stock = stock + 1 WHERE id = $1', [bookId]);
        res.json({ message: "Buku berhasil dikembalikan." });
    } catch (err) {
        res.status(500).json({ message: "Gagal mengembalikan buku" });
    }
});

// --- UPDATE: TAMBAH BUKU DENGAN KATEGORI ---
app.post('/books', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Hanya Admin!" });

    const { title, author, category, stock } = req.body; // Terima category
    try {
        await pool.query(
            'INSERT INTO books (title, author, category, stock) VALUES ($1, $2, $3, $4)', 
            [title, author, category, stock]
        );
        res.json({ message: "Buku berhasil ditambahkan!" });
    } catch (err) {
        res.status(500).json({ message: "Gagal menambah buku" });
    }
});

// 6. Hapus Buku (ADMIN ONLY) - UPDATE: Hapus Riwayat Dulu
app.delete('/books/:id', authenticateToken, async (req, res) => {
    // Cek Role Admin
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Hanya Admin!" });

    const { id } = req.params;
    try {
        // LANGKAH 1: Hapus dulu semua riwayat peminjaman buku ini
        // (Agar tidak error Foreign Key Constraint)
        await pool.query('DELETE FROM borrowings WHERE book_id = $1', [id]);

        // LANGKAH 2: Baru hapus bukunya
        const result = await pool.query('DELETE FROM books WHERE id = $1', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Buku tidak ditemukan" });
        }

        res.json({ message: "Buku berhasil dihapus beserta riwayat peminjamannya!" });
    } catch (err) {
        console.error(err); // Cetak error di terminal biar ketahuan
        res.status(500).json({ message: "Gagal menghapus buku (Server Error)" });
    }
});

// ... (Kode endpoint delete sebelumnya) ...

// 7. Update Buku (ADMIN ONLY) - Edit Judul, Penulis, Kategori, & Stok
app.put('/books/:id', authenticateToken, async (req, res) => {
    // Cek Role
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Hanya Admin!" });

    const { id } = req.params;
    const { title, author, category, stock } = req.body;

    try {
        const result = await pool.query(
            'UPDATE books SET title = $1, author = $2, category = $3, stock = $4 WHERE id = $5',
            [title, author, category, stock, id]
        );

        if (result.rowCount === 0) return res.status(404).json({ message: "Buku tidak ditemukan" });
        res.json({ message: "Data buku berhasil diperbarui!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Gagal mengupdate buku" });
    }
});

// ... (app.listen di sini) ...

app.listen(PORT, () => {
    console.log(`Book Service jalan di port ${PORT}`);
});
