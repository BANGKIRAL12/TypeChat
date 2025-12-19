const express = require('express')
const path = require('path')
const mysql = require('mysql')
const bodyParser = require('body-parser')
const bcrypt = require('bcrypt');
const ExcelJS = require('exceljs')
const XLSX = require('xlsx')
const fs = require('fs')

const database = require('./database')
const port = process.env.PORT || 3000;

const app = express();
const http = require('http')
const server = http.createServer(app)
const { Server } = require('socket.io')
const io = new Server(server);

app.set("view engine", "ejs")
app.set("views", "views")

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const db = mysql.createConnection({
  host: "2z2d2x.h.filess.io",
  database: "bkstudio_db_sheepeyeup",
  user: "bkstudio_db_sheepeyeup",
  password: "bc3db81e45df11fd0b82535fdd8653cceb29d12e"
});

let myUserName = ""
let ifLogin = false
db.connect((error) => {
  if (error) {
    console.log(error)
    return res.status(500).send("error bro")
  }
  console.log('database connected...')

  let addUser = false

  app.get('/home', (req, res) => {
    const myuser = req.query.username;
    const status = req.query.status;
    const statusColor = status == 'online' ? 'bg-green-500' : 'bg-gray-300';
    const sql = "SELECT * FROM typechat"
    db.query(sql, (err, result) => {
      const users = JSON.parse(JSON.stringify(result));
      console.log('hasil database ->', users)
      res.render('index', { users: users, myUser: myuser, login: ifLogin, status: {color: statusColor}});
      ifLogin = false
    });
  })

  app.post('/login', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    const checkQuery = 'SELECT COUNT(*) AS count FROM typechat WHERE (username, password) = (?, ?)';
    db.query(checkQuery, [username, password], (err, result) => {
      if (err) {
        console.log("error saat mengecek data: " + err);
        return;
      }

      const userCount = result[0].count;

      if (userCount > 0) {
        console.log(`user ${username} terdaftar`)
        myUserName = username
        // jalankan fungsi login
        ifLogin = true
        res.redirect('/home?username=' + req.body.username + '&status=online')
      }
      else {
        console.log("tidak terdaftar")
        function a() {
          res.send(`<script>alert('akun anda tidak terdaftar. daftarkan akun baru');</script>`); 
          res.redirect('/')
        }
      }
    })

  });
  app.post("/tambah", (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    const checkQuery = 'SELECT COUNT(*) AS count FROM typechat WHERE username = ?';
    db.query(checkQuery, [username], (err, result) => {
      if (err) {
        console.log("error saat mengecek data: " + err);
        return;
      }

      const userCount = result[0].count;

      if (userCount > 0) {
        console.log(`user ${username} sudah terdaftar`)
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
          fungsiTambahan(addUser, myUserName)
          res.redirect('/')
        });
        
      }
    })
  });


});

async function fungsiTambahan(addUser, myUserName) {
  if (addUser) {
    console.log('hy bro')
    makeNewDatabase(myUserName)
    const sql = "SELECT * FROM typechat"
    db.query(sql, (err, result) => {
      if (err) {
        console.log(err)
      }
  
      result.forEach((user) => {
        console.log(user)
        addNewUserToDatabase(user.username, myUserName)
        addNewUserToDatabase(myUserName, user.username) 
      })
    });
    
  }
  addUser = false
}

async function makeNewDatabase(namaFile) {
  const filePath = path.join(__dirname, 'database', namaFile);

  try {
    // 1. Buat Workbook (Wadah buku)
    const workbook = XLSX.utils.book_new();

    const worksheet = XLSX.utils.aoa_to_sheet([]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, filePath + '.xlsx');

    console.log(`✅ Workbook kosong berhasil dibuat: ${namaFile}`);
    
  } catch (error) {
    console.error("❌ Gagal membuat workbook:", error.message);
}
}

async function addNewUserToDatabase(namaFile, namaSheetBaru) {
  let workbook;
  namaFile = namaFile + ".xlsx"
  const filePath = path.join(__dirname, 'database', namaFile);
  
  const dataAoA = ["waktu", "pengirim", "message"]

  try {
    workbook = XLSX.readFile(filePath);
    console.log(`📂 Membuka file '${namaFile}'...`);

    if (workbook.Sheets[namaSheetBaru]) {
      console.error(`❌ Gagal: Sheet dengan nama "${namaSheetBaru}" sudah ada!`);
      return;
    }

  } 
  catch (error) {
    // Jika file tidak ditemukan, kita buat Workbook baru
    console.log("⚠️ File tidak ditemukan, membuat file baru...");
    workbook = XLSX.utils.book_new();
  }

  const worksheetBaru = XLSX.utils.aoa_to_sheet([dataAoA]);
  XLSX.utils.book_append_sheet(workbook, worksheetBaru, namaSheetBaru);

  try {
    XLSX.writeFile(workbook, filePath);
    console.log(`✅ Berhasil menambahkan sheet "${namaSheetBaru}" ke dalam '${namaFile}'`);
  } catch (e) {
    console.error("❌ Gagal menyimpan. Pastikan file Excel sedang TIDAK DIBUKA.");
  }
}
function ambilDataChatDatabase(namaFile, namaSheet) {
  const filePath = path.join(__dirname, 'database', namaFile + '.xlsx');
  if (!fs.existsSync(filePath)) {
      console.error(`❌ Error: File tidak ditemukan di: ${filePath}`);
      return null;
  }

  try {
      const workbook = XLSX.readFile(filePath);
      const worksheet = workbook.Sheets[namaSheet];

      if (!worksheet) {
          console.error(`❌ Error: Sheet dengan nama "${namaSheet}" tidak ditemukan dalam file.`);
          // Tampilkan daftar sheet yang tersedia untuk membantu user
          console.log(`   Sheet yang tersedia: [${workbook.SheetNames.join(', ')}]`);
          return null;
      }

      const dataJson = XLSX.utils.sheet_to_json(worksheet); 
      
      return dataJson;

  } catch (error) {
      console.error("❌ Gagal membaca atau mengkonversi file XLSX:", error.message);
      return null;
  }
}
function addDatasToDatabase(namaFile, namaSheet, dataTambahan) {
  const filePath = path.join(__dirname, 'database', namaFile + '.xlsx');
    
  if (!fs.existsSync(filePath)) {
      console.error(`❌ Gagal: File tidak ditemukan di: ${filePath}.`);
      return;
  }

  try {
      const workbook = XLSX.readFile(filePath);
      const worksheet = workbook.Sheets[namaSheet];

      if (!worksheet) {
          console.error(`❌ Gagal: Sheet dengan nama "${namaSheet}" tidak ditemukan dalam file.`);
          return;
      }

      XLSX.utils.sheet_add_json(worksheet, [dataTambahan], { 
          skipHeader: true, 
          origin: -1 
      });
      XLSX.writeFile(workbook, filePath);
      
      console.log(`✅ ${dataTambahan.length} baris data berhasil ditambahkan ke sheet "${namaSheet}".`);

  } catch (error) {
      console.error("❌ Terjadi kesalahan saat menambahkan data:", error.message);
  }
}

io.on("connection", (socket) => {
  socket.on("selectUser", (data) => {
    console.log('DATA => ', data) 
    const newData = {
      mydb: ambilDataChatDatabase(data.myUser, data.userSelect),
      userdb: ambilDataChatDatabase(data.userSelect, data.myUser)
    }
    socket.emit("selectUser1", newData)
  })
  socket.on("message", (data) => {
    addDatasToDatabase(data.myUser, data.userSelect, data.message)
    addDatasToDatabase(data.userSelect, data.myUser, data.message)

    const newData = {
      mydb: ambilDataChatDatabase(data.myUser, data.userSelect),
      userdb: ambilDataChatDatabase(data.userSelect, data.myUser)
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
})

server.listen(port, () => {
  console.log("server ready....")

});


