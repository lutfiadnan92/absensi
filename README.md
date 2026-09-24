# 📝 Aplikasi Pencatatan Absensi Sederhana

Aplikasi berbasis web sederhana untuk mencatat kehadiran secara cepat dan mudah, dilengkapi dengan fitur export laporan ke dalam format PDF yang siap cetak. Aplikasi ini dirancang agar dapat berjalan langsung di peramban (browser) tanpa memerlukan setup server yang rumit.

## ✨ Fitur Utama

- **Pencatatan Cepat:** Mencatat nama dan status kehadiran (Hadir, Tidak Hadir, Izin, Sakit).
- **Pencatat Waktu Otomatis:** Sistem akan otomatis mencatat jam (HH:MM) saat data ditambahkan untuk mereka yang berstatus "Hadir".
- **Judul Laporan Kustom:** Terdapat input "Jenis Sambung" (misal: Shift Pagi, Sesi 1) yang akan dijadikan judul utama pada laporan PDF.
- **Auto Capitalize:** Otomatis mengubah format nama menjadi huruf kapital di awal kata (Capitalize) baik di tampilan web maupun laporan PDF.
- **Export PDF Siap Cetak:** Menghasilkan dokumen PDF berisikan tanggal laporan dan tabel bergaris (border) hitam-putih yang rapi dan profesional.
- **Manajemen Data:** Fitur untuk menghapus baris data tertentu atau menghapus seluruh data sekaligus.
- **Responsif:** Tampilan user interface yang modern dan menyesuaikan dengan layar perangkat (PC/Mobile).

## 🛠️ Teknologi yang Digunakan

Aplikasi ini dibangun dalam satu file utuh (Single-File App) menggunakan:
- **HTML5:** Sebagai kerangka struktur halaman.
- **Tailwind CSS (via CDN):** Untuk styling dan layout yang responsif dan modern.
- **Vanilla JavaScript:** Untuk logika aplikasi (menambah, menghapus, menampilkan data).
- **html2pdf.js (via CDN):** Library pihak ketiga untuk mengkonversi template HTML khusus menjadi file PDF.
- **Google Fonts (Inter):** Menggunakan jenis huruf yang bersih dan modern.

## 🚀 Cara Penggunaan

1. **Unduh File:** Simpan atau salin keseluruhan kode menjadi sebuah file dengan ekstensi `.html` (contoh: `absensi.html`).
2. **Jalankan Aplikasi:** Klik ganda (double-click) file `absensi.html` tersebut. File akan terbuka secara otomatis di browser bawaan Anda (Google Chrome, Firefox, Edge, atau Safari). *Pastikan perangkat Anda terhubung ke internet karena aplikasi ini memuat Tailwind CSS dan html2pdf dari CDN.*
3. **Persiapkan Judul:** Isi kolom **"Jenis Sambung"** di bagian atas jika Anda ingin mengatur judul khusus untuk laporan PDF Anda nanti.
4. **Catat Kehadiran:**
   - Masukkan **Nama Lengkap**.
   - Pilih **Status** dari menu *dropdown*.
   - Klik tombol **Simpan**. Data akan muncul di tabel bawah.
5. **Cetak Laporan:** Klik tombol **"Export PDF"** berwarna putih di sudut kanan atas (header). Aplikasi akan mengunduh file `.pdf` yang berisi tabel laporan rapi yang siap diprint.

## ⚠️ Catatan Penting

- **Penyimpanan Sementara:** Aplikasi ini menggunakan memori sementara (state) pada browser. Artinya, **jika Anda merefresh (F5) atau menutup tab halaman, semua data absensi yang belum di-export akan hilang.** Pastikan untuk selalu melakukan "Export PDF" jika pendataan sudah selesai.
- Laporan PDF dirancang dengan layout khusus yang terpisah dari tampilan web agar hasil cetakan tetap bersih (tanpa tombol aksi, warna latar yang tidak perlu, atau form input).

---
*Dibuat untuk memudahkan pencatatan absensi harian secara praktis dan efisien.*