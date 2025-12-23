/*
---------------------------------------------------------------------------
-----  edit API di 'https://www.npoint.io/docs/9fa8c98562a2ea022180'  -----
-----  edit storage di 'https://cahya12.imgbb.com/'------------------------
*/

const express = require('express')
const path = require('path')
const mysql = require('mysql')
const bodyParser = require('body-parser')
const bcrypt = require('bcrypt');
const ExcelJS = require('exceljs')
const XLSX = require('xlsx')
const fs = require('fs').promises
const FS = require('fs')
const multer = require('multer');
const cors = require('cors');
const axios = require('axios')
const cloudinary = require('cloudinary').v2;
const chalk = require('chalk')

const database = require('./database')
const log = require('./function')
const port = process.env.PORT || 3000;

const app = express();
const http = require('http')
const server = http.createServer(app)
const { Server } = require('socket.io');
const { Result } = require('postcss');
const io = new Server(server);

require('dotenv').config();

app.set("view engine", "ejs")
app.set("views", "views")

app.use(cors());
app.use('/uploads', express.static('database/uploads'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const USERS_DB_API = 'https://api.npoint.io/9fa8c98562a2ea022180'
const IMAGE_DB_API = 'be609c2a49aebeea873f25e30de14354'


cloudinary.config({ 
  cloud_name: 'dletlnbxo', 
  api_key: '743855163489845', 
  api_secret: 'R72Ac5ehK3QxEVm4GrpP3tP9Nv8' 
});

const dbConfig = {
  host: '2z2d2x.h.filess.io', // Ganti dengan host Filess.io Anda 
  user: 'bkstudio_db_sheepeyeup', // Ganti dengan username Anda 
  password: 'bc3db81e45df11fd0b82535fdd8653cceb29d12e', // Ganti dengan password Anda 
  database: 'bkstudio_db_sheepeyeup', // Ganti dengan nama database Anda 
  port: 3307
}
let db;


const storage = multer.memoryStorage();

const imageFileFilter = (req, file, cb) => {
  // Periksa MIME type
  if (file.mimetype.startsWith('image/*') || 
  file.mimetype.startsWith('vidio/*') ||
  file.mimetype.startsWith('audio/*') ||
  file.mimetype.startsWith('text/*') ||
  file.mimetype.startsWith('application/*')) {
    cb(null, true); // Terima file
  } else {
    // Tolak file dan berikan error
    // Penting: kita set error di cb, ini akan ditangkap di MulterError
    cb(new Error('Format file tidak valid. Hanya JPEG, PNG, atau GIF yang diizinkan.'), false);
  }
};
  
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Batas ukuran 5MB
  // fileFilter: imageFileFilter // Terapkan filter gambar
});
  
let myUserName = ""
let status = 'offline';
let ifLogin = false
function connectToDatabase() {
  db = mysql.createConnection(dbConfig)

  db.connect((error) => {
    if (error) {
      console.log(chalk.red(log.error("gagal menyambung ke database")))
      setTimeout(connectToDatabase, 1000);
      return
    }
    console.log(chalk.blue(log.info("berhasil tersambung ke database")))
  });

  db.on('error', (err) => {
    console.error(chalk.red(log.error("database error: ", err)))
    db.end();
    setTimeout(connectToDatabase, 1000);
    return
  })
  
  db.on('close', () => {
    console.log(chalk.red(log.error("koneksi database terputus")))
    setTimeout(connectToDatabase, 1000);
    return
  })
}
connectToDatabase()

let addUser = false

app.get('/home', (req, res) => {
  const myuser = req.query.username;
  const sql = "SELECT * FROM typechat"
  db.query(sql, (err, result) => {
    const users = JSON.parse(JSON.stringify(result));
    console.log('hasil database ->', users)
    res.render('index', { users: users, myUser: myuser, login: ifLogin});
    ifLogin = false
  });
})

app.post('/upload', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      console.log(chalk.yellow(log.warning("gagal mengupload file. file tidak ditemukan")))
      return res.status(400).json({ message: 'File tidak ditemukan.' });
    }

    const targetUser = req.body.targetUser; 
    
    // Ambil nama file asli tanpa ekstensi untuk dijadikan Public ID
    const originalName = path.parse(req.file.originalname).name;
    const uniqueSuffix = Date.now();

    // 1. Proses Upload ke Cloudinary
    const uploadToCloudinary = () => {
      return new Promise((resolve, reject) => {
        // Ambil ekstensi asli (misal: .docx atau .pdf)
        const fileExtension = path.extname(req.file.originalname); 
        const originalName = path.parse(req.file.originalname).name;
        const uniqueSuffix = Date.now();
    
        const stream = cloudinary.uploader.upload_stream(
          { 
            resource_type: "auto", // Biarkan Cloudinary mendeteksi tipe file
            folder: "chat_uploads",
            // PENTING: Tambahkan ekstensi di public_id agar file tidak "raw" tanpa format
            public_id: `${originalName}-${uniqueSuffix}${fileExtension}`, 
            use_filename: true,
            unique_filename: false // Kita sudah buat unik dengan timestamp
          },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        stream.end(req.file.buffer);
      });
    };

    const cloudResult = await uploadToCloudinary();
    // --- DI SINI ANDA SIMPAN METADATA KE DATABASE ---
    // File fisik sudah tersimpan di: req.file.path
    
    const fileData = {
      id: Date.now(), // Menggunakan timesamp sebagai ID sederhana untuk contoh
      filename: req.file.originalname,
      // path: req.file.path, // Path file di server
      type: "file",
      url: cloudResult.secure_url, 
      format: cloudResult.format, // URL publik untuk diakses
      size: cloudResult.bytes,
      mimeType: cloudResult.resource_type,
      uploadedAt: new Date().toISOString()
    };

    console.log(chalk.blue(log.info("berhasil mengupload file ke cloudinary")))

    res.status(200).json({
      status: 'success',
      message: 'Gambar berhasil diupload dan metadata dicatat.',
      data: fileData
    });

  } catch (error) {
    let errorMessage = 'Terjadi kesalahan server saat upload.';
    
    // Menangani error dari Multer (misalnya ukuran file terlalu besar atau filter file)
    if (error instanceof multer.MulterError) {
      errorMessage = `Upload gagal: ${error.message}`;
    } else if (error.message.includes('Format file tidak valid')) {
        errorMessage = error.message;
    }

    console.error(chalk.red(log.error("gagal saat mengupload file: ", error)));
    res.status(400).json({ 
      message: errorMessage, 
      error: error.message 
    });
  }
});

app.post('/login', (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const checkQuery = 'SELECT COUNT(*) AS count FROM typechat WHERE (username, password) = (?, ?)';
  db.query(checkQuery, [username, password], (err, result) => {
    if (err) {
      console.log(chalk.red(log.error("error saat mengrcek data: " + err)))
      return;
    }

    const userCount = result[0].count;

    if (userCount > 0) {
      console.log(chalk.blue(log.info(`user ${username} telah masuk`)))
      myUserName = username
      // jalankan fungsi login
      ifLogin = true
      res.redirect('/home?username=' + req.body.username + '&status=online')
    }
    else {
      console.log(chalk.yellow(log.warning("user mencoba masuk dengan akun tidak terdaftar")))
      // res.send(`<script>alert('akun anda tidak terdaftar. daftarkan akun baru');</script>`); 
      res.redirect('/')
    }
  })

});
app.post("/tambah", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const checkQuery = 'SELECT COUNT(*) AS count FROM typechat WHERE username = ?';
  db.query(checkQuery, [username], (err, result) => {
    if (err) {
      console.log(chalk.red(log.error("error saat mengecek data: " + err)));
      return;
    }

    const userCount = result[0].count;

    if (userCount > 0) {
      console.log(chalk.yellow(log.warning("user mendaftarkan aku yang sudah terdaftar")))
      res.redirect('/')
    }
    else {
      const insertSql = `INSERT INTO typechat (username, password) VALUES ( '${req.body.username}', '${req.body.password}');`
      db.query(insertSql, (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).send("Gagal mendaftarkan user.");
        }
        myUserName = req.body.username;
        addUser = true
        console.log(chalk.blue(log.info(`user ${myUserName} telah mendaftar`)))
        fungsiTambahan(addUser, myUserName)
        res.redirect('/')
      });
      
    }
  })
});

async function fungsiTambahan(addUser, myUserName) {
  if (addUser) {
    console.log(chalk.blue(log.info(`menambahkan user ke database`)))
    await makeNewDatabase(myUserName)
    const sql = "SELECT * FROM typechat"
    db.query(sql, async (err, result) => {
      if (err) {
        console.log(chalk.red(log.error(err)))
      }
  
      for (const user of result) {
        console.log(user)
        await addNewUserToDatabase(myUserName, user.username) 
        await addNewUserToDatabase(user.username, myUserName)
      }
    });
    
  }
  addUser = false
}

async function makeNewDatabase(namaFile) {
  const getResponse = await axios.get(USERS_DB_API)
  let currentData = getResponse.data;

  if(!currentData[namaFile]) {
    currentData[namaFile] = {}
  }

  await axios.post(USERS_DB_API, currentData);
}

async function addNewUserToDatabase(namaFile, namaSheetBaru) {

  try {
    const getResponse = await axios.get(USERS_DB_API)
    let currentData = getResponse.data;

    if (!currentData[namaFile][namaSheetBaru]) {
      currentData[namaFile][namaSheetBaru] = [];
    }
    await axios.post(USERS_DB_API, currentData);
    
    console.log(chalk.blue(log.info(`berhasil menambahkan sheet user ${namaSheetBaru} ke database user ${namaFile}`)))
  } catch (err) {
    console.log(chalk.red(log.error(`gagal menambahkan sheet user ${namaSheetBaru} ke database user ${namaFile}`)))
  }
}

async function ambilDataChatDatabase(namaFile, namaSheet) {

  try {
    const data = await axios.get(USERS_DB_API)
    const datas = data.data
    const dataJson = datas[namaFile][namaSheet]
      
    return dataJson;

  } catch (error) {
    console.log(chalk.red(log.error(`gagal saat membaca data: ${error.message}`)))
    return null;
  }

}
async function addDatasToDatabase(namaFile, namaSheet, dataTambahan) {

  try {
    const data = await axios.get(USERS_DB_API);
    let dbContent = data.data;

    if (!dbContent[namaFile]) {
        console.error(`User ${namaFile} tidak ditemukan.`);
        return;
    }
    if (!dbContent[namaFile][namaSheet]) {
      dbContent[namaFile][namaSheet] = [];
    }

    dbContent[namaFile][namaSheet].push(dataTambahan);

    await axios.post(USERS_DB_API, dbContent);

  } catch (error) {
    console.log(chalk.red(log.error('terjadi kesalahan saat menambah data' + error.message)))
  }

}

io.on("connection", (socket) => {
  socket.on("selectUser", async (data) => {
    console.log('DATA => ', data) 
    const newData = {
      mydb: await ambilDataChatDatabase(data.myUser, data.userSelect),
      userdb: await ambilDataChatDatabase(data.userSelect, data.myUser)
    }
    socket.emit("selectUser1", newData)
  })
  socket.on("message", async (data) => {
    await addDatasToDatabase(data.myUser, data.userSelect, data.message)
    await addDatasToDatabase(data.userSelect, data.myUser, data.message)

    const newData = {
      mydb: await ambilDataChatDatabase(data.myUser, data.userSelect),
      userdb: await ambilDataChatDatabase(data.userSelect, data.myUser)
    }
    io.emit("message", newData)
    console.log(newData.mydb)
  })
  socket.on("login", (data) => {
    const newData = {
      user: myUserName,
      login: true
    }
    io.emit("login1", newData)
  })
  socket.on("statuse", (s) => {
    const statusColor = s == 'online' ? 'bg-green-500' : 'bg-gray-300';
    console.log("menerima status user sebagai: " + statusColor)
    io.emit("statuseU", statusColor)
  })
})

server.listen(3300, () => {
   console.log(chalk.blue(log.info("server berjalan di: 'http://localhost:3300'")))
});
