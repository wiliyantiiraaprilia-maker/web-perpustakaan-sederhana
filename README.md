


# Simple Library Microservices

Project latihan implementasi arsitektur Microservices sederhana.
Tech stack: **Node.js (Express), PostgreSQL, Docker & Docker Compose.**

Sistem ini memisahkan service antara **Auth** (User management) dan **Book** (Inventory & Peminjaman).

---

## Service List

| Service | Port | Keterangan |
| :--- | :--- | :--- |
| **Auth Service** | `:4000` | Login, Register, Generate Token (JWT) |
| **Book Service** | `:5000` | CRUD Buku, Stok, Pinjam/Kembali |
| **Frontend** | `:8080` | Web Interface (HTML/Bootstrap/JS) |
| **Database** | `:5432` | PostgreSQL (User & Library DB) |

---

## Cara Jalanin (Local)

Pastikan Docker udah nyala, terus run command ini:

```bash
docker-compose up -d --build

```

### Setup Database (Wajib run sekali di awal)

Karena database masih kosong, hit endpoint ini di browser buat bikin tabel & seed data dummy:

1. **Setup User:** Buka `http://localhost:4000/init-db`
2. **Setup Buku:** Buka `http://localhost:5000/init-db`

Kalo udah, buka webnya di: **`http://localhost:8080`**

---

## Dokumentasi API

### 1. Auth Service (`:4000`)

#### Login (Dapet Token)

* **POST** `/login`
* **Body:**
```json
{
  "username": "admin",
  "password": "admin"
}

```


* **Response:** Simpan `token` yang didapet buat request ke service buku.

---

### 2. Book Service (`:5000`)

> **Note:** Semua request (kecuali GET books) wajib pake Header:
> `Authorization: Bearer <paste_token_disini>`

#### List Buku (Public)

* **GET** `/books`
* Response: List semua buku + sisa stok.

#### Tambah Buku (Admin Only)

* **POST** `/books`
* **Body:**
```json
{
  "title": "Judul Buku",
  "author": "Penulis",
  "category": "Teknologi",
  "stock": 10
}

```



#### Edit Buku (Admin Only)

* **PUT** `/books/:id`
* **Body:** (Sama kayak Create, sesuaikan field yg mau diubah).

#### Hapus Buku (Admin Only)

* **DELETE** `/books/:id`
* *Note:* Bakal ngehapus history peminjaman buku ini juga (Cascade).

#### Pinjam Buku

* **POST** `/borrow`
* **Body:** `{ "bookId": 1 }`
* *Syarat:* Stok harus > 0.

#### Balikin Buku

* **POST** `/return`
* **Body:** `{ "bookId": 1 }`

---

## Akun Demo

Buat ngetes fitur beda role:

1. **Admin**
* User: `admin`
* Pass: `admin`
* *Bisa:* Tambah/Edit/Hapus buku.


2. **User Biasa**
* User: `budi`
* Pass: `budi123`
* *Bisa:* Cuma pinjam & balikin buku.



---

## Catatan Dev

* Kalo mau reset data total, run `docker-compose down -v` terus up lagi.
* Frontend pake `fetch` native, config URL API ada di `frontend/script.js`.
