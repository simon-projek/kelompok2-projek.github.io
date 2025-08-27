const express = require('express')
const sqlite3 = require('sqlite3').verbose()
const cors = require('cors')
const bcrypt = require('bcryptjs')

const app = express()
const PORT = 3000

// Middleware
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Inisialisasi Database
const db = new sqlite3.Database('./mami_cafe.db', (err) => {
  if (err) return console.error('Error connecting to database:', err.message)
  console.log('Successfully connected to the SQLite database.')
  db.run(
    `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        profile_pic_base64 TEXT NOT NULL
    )`,
    (err) => {
      if (err) return console.error('Error creating table:', err.message)
      console.log("Table 'users' is ready.")
    }
  )
})

// Endpoint: [POST] /register
app.post('/register', async (req, res) => {
  // ... (Kode registrasi Anda tetap sama persis, tidak perlu diubah)
  try {
    const { username, password, profilePic } = req.body
    if (!username || !password || !profilePic)
      return res
        .status(400)
        .json({ status: 'error', message: 'Missing required fields.' })
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)
    const sql =
      'INSERT INTO users (username, password, profile_pic_base64) VALUES (?, ?, ?)'
    db.run(sql, [username, hashedPassword, profilePic], function (err) {
      if (err) {
        if (err.errno === 19)
          return res
            .status(409)
            .json({ status: 'error', message: 'Username sudah digunakan.' })
        throw err
      }
      res
        .status(201)
        .json({ status: 'success', message: 'User registered successfully.' })
    })
  } catch (error) {
    res
      .status(500)
      .json({
        status: 'error',
        message: error.message || 'An internal server error occurred.',
      })
  }
})

// Endpoint: [POST] /login
app.post('/login', (req, res) => {
  // ... (Kode login Anda tetap sama persis, tidak perlu diubah)
  try {
    const { username, password } = req.body
    if (!username || !password)
      return res
        .status(400)
        .json({ status: 'error', message: 'Missing required fields.' })
    const sql = 'SELECT * FROM users WHERE username = ?'
    db.get(sql, [username], async (err, user) => {
      if (err) throw err
      if (!user)
        return res
          .status(401)
          .json({ status: 'error', message: 'Username atau password salah.' })
      const isMatch = await bcrypt.compare(password, user.password)
      if (!isMatch)
        return res
          .status(401)
          .json({ status: 'error', message: 'Username atau password salah.' })
      res.json({
        status: 'success',
        user: { username: user.username, profilePic: user.profile_pic_base64 },
      })
    })
  } catch (error) {
    res
      .status(500)
      .json({
        status: 'error',
        message: error.message || 'An internal server error occurred.',
      })
  }
})

// ==========================================================
// ENDPOINT BARU: [POST] /update-profile
// ==========================================================
app.post('/update-profile', (req, res) => {
  try {
    const { currentUsername, newUsername, newProfilePic } = req.body
    if (!currentUsername || !newUsername) {
      return res
        .status(400)
        .json({ status: 'error', message: 'Username tidak boleh kosong.' })
    }

    // Kita membangun query secara dinamis
    let sql
    let params
    if (newProfilePic) {
      // Jika ada foto profil baru
      sql = `UPDATE users SET username = ?, profile_pic_base64 = ? WHERE username = ?`
      params = [newUsername, newProfilePic, currentUsername]
    } else {
      // Jika hanya ganti nama
      sql = `UPDATE users SET username = ? WHERE username = ?`
      params = [newUsername, currentUsername]
    }

    db.run(sql, params, function (err) {
      if (err) {
        if (err.errno === 19) {
          return res
            .status(409)
            .json({
              status: 'error',
              message: 'Username baru sudah digunakan oleh orang lain.',
            })
        }
        throw err
      }
      if (this.changes === 0) {
        return res
          .status(404)
          .json({ status: 'error', message: 'Pengguna tidak ditemukan.' })
      }
      // Kirim kembali data pengguna yang sudah diperbarui
      res.json({
        status: 'success',
        message: 'Profil berhasil diperbarui.',
        user: {
          username: newUsername,
          profilePic: newProfilePic, // Akan null jika tidak diganti, diurus oleh frontend
        },
      })
    })
  } catch (error) {
    res
      .status(500)
      .json({
        status: 'error',
        message: error.message || 'Terjadi kesalahan internal.',
      })
  }
})

// Menjalankan Server
app.listen(PORT, () => {
  console.log(
    `[STATUS] Server is running efficiently on http://localhost:${PORT}`
  )
})
