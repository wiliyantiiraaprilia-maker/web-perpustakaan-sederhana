const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 4000;
const SECRET_KEY = process.env.JWT_SECRET || 'kunci_rahasia';

// --- PERBAIKAN DI SINI (app.use bukan app.user) ---
app.use(cors());
app.use(express.json());

// Konfigurasi Database User
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: 5432,
});

// Endpoint Init DB
app.get('/init-db', async (req, res) => {
  try {
    await pool.query('DROP TABLE IF EXISTS users');
    await pool.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(50) NOT NULL,
        role VARCHAR(20) DEFAULT 'user'
      );
    `);
    await pool.query(`
      INSERT INTO users (username, password, role) VALUES 
      ('admin', 'admin', 'admin'),
      ('budi', 'budi123', 'user'); 
    `);
    res.send("Database User Siap! (Admin & User dibuat)");
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

// Endpoint Login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) return res.status(401).json({ message: "User tidak ditemukan" });

    const user = result.rows[0];
    if (user.password !== password) return res.status(401).json({ message: "Password salah" });

    const payload = { id: user.id, username: user.username, role: user.role };
    const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' });

    res.json({ message: "Login Berhasil!", token, user: payload });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

app.listen(PORT, () => {
  console.log(`Auth Service jalan di port ${PORT}`);
});
