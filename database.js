const XLSX = require('xlsx')

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

module.exports = {
  addDatasToDatabase
}