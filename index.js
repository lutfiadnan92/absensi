document.addEventListener("DOMContentLoaded", () => {
  // -- 1. INISIALISASI JSON STORAGE (LocalStorage) --
  // Konsep ini menggantikan IndexedDB. Menyimpan format JSON murni
  // menyerupai cara kerja 2 file JSON terpisah.

  // "File" 1: credentials.json
  const defaultCredentials = { username: "admin", password: "admin123" };
  if (!localStorage.getItem("credentials_json")) {
    localStorage.setItem("credentials_json", JSON.stringify(defaultCredentials));
  }

  // "File" 2: attendance.json
  let records = [];
  if (localStorage.getItem("attendance_json")) {
    records = JSON.parse(localStorage.getItem("attendance_json"));
  } else {
    localStorage.setItem("attendance_json", JSON.stringify([]));
  }

  // Referensi Elemen DOM
  const loginContainer = document.getElementById("login-container");
  const appContainer = document.getElementById("app-container");
  const loginForm = document.getElementById("login-form");
  const logoutBtn = document.getElementById("logout-btn");

  const form = document.getElementById("attendance-form");
  const nameInput = document.getElementById("name");
  const statusInput = document.getElementById("status");
  const tableBody = document.getElementById("table-body");
  const emptyState = document.getElementById("empty-state");
  const clearAllBtn = document.getElementById("clear-all-btn");
  const dateDisplay = document.getElementById("current-date");
  const exportPdfBtn = document.getElementById("export-pdf-btn");

  // Set Tanggal Hari Ini di Header
  const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  dateDisplay.textContent = new Date().toLocaleDateString("id-ID", options);

  // Cek apakah ada sesi login
  if (sessionStorage.getItem("isLoggedIn") === "true") {
    showApp();
  }

  // -- 2. FUNGSI NAVIGASI UI --
  function showApp() {
    loginContainer.classList.add("hidden");
    appContainer.classList.remove("hidden");
    loadDataJSON();
  }

  function showLogin() {
    appContainer.classList.add("hidden");
    loginContainer.classList.remove("hidden");
    const usernameInput = document.getElementById("username");
    usernameInput.value = "";
    document.getElementById("password").value = "";
    setTimeout(() => usernameInput.focus(), 100);
  }

  // -- 3. EVENT LISTENER LOGIN & LOGOUT --
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const userVal = document.getElementById("username").value.trim();
    const passVal = document.getElementById("password").value;

    // Membaca dari "file" credentials_json
    const creds = JSON.parse(localStorage.getItem("credentials_json"));

    if (userVal === creds.username && passVal === creds.password) {
      sessionStorage.setItem("isLoggedIn", "true");
      showApp();
    } else {
      Swal.fire({
        icon: "error",
        title: "Gagal Login",
        text: "Username atau Password salah!",
        confirmButtonColor: "#2563eb", // Warna biru dari tailwind
      });
    }
  });

  logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem("isLoggedIn");
    showLogin();
  });

  // -- 4. FUNGSI PENYIMPANAN DATA (JSON CRUD) --
  function saveToJSON() {
    localStorage.setItem("attendance_json", JSON.stringify(records));
  }

  function loadDataJSON() {
    records = JSON.parse(localStorage.getItem("attendance_json")) || [];
    renderTable();
  }

  function addRecordJSON(record) {
    records.push(record);
    saveToJSON();
    renderTable();
  }

  function deleteRecordJSON(id) {
    records = records.filter((record) => record.id !== id);
    saveToJSON();
    renderTable();
  }

  function clearAllJSON() {
    records = [];
    saveToJSON();
    renderTable();
  }

  // -- 5. FUNGSI RENDER TABEL & PDF (Dipertahankan dari sebelumnya) --
  function renderTable() {
    tableBody.innerHTML = "";

    if (records.length === 0) {
      emptyState.classList.remove("hidden");
      clearAllBtn.classList.add("hidden");
      tableBody.parentElement.classList.add("hidden");
    } else {
      emptyState.classList.add("hidden");
      clearAllBtn.classList.remove("hidden");
      tableBody.parentElement.classList.remove("hidden");

      records.forEach((record, index) => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-gray-50 transition-colors";

        let statusColor = "bg-green-100 text-green-800"; // Hadir
        if (record.status === "Tidak Hadir") statusColor = "bg-red-100 text-red-800";
        else if (record.status === "Izin") statusColor = "bg-yellow-100 text-yellow-800";
        else if (record.status === "Sakit") statusColor = "bg-orange-100 text-orange-800";

        const timeDisplay = record.status === "Hadir" ? record.time : "-";

        tr.innerHTML = `
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${index + 1}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">${record.name}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm">
                                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor}">
                                    ${record.status}
                                </span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${timeDisplay}</td>
                            <td class="no-export px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                <button onclick="deleteRecord(${record.id})" class="text-red-500 hover:text-red-700 transition-colors" title="Hapus">
                                    <svg class="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                            </td>
                        `;
        tableBody.appendChild(tr);
      });
    }
  }

  // Global Wrapper agar fungsi Hapus dapat diakses tombol onClick di HTML
  window.deleteRecord = function (id) {
    Swal.fire({
      title: "Hapus Data?",
      text: "Anda yakin ingin menghapus data absen ini?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444", // Warna merah
      cancelButtonColor: "#9ca3af", // Warna abu-abu
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal",
    }).then((result) => {
      if (result.isConfirmed) {
        deleteRecordJSON(id);
        Swal.fire({
          title: "Terhapus!",
          text: "Data absen berhasil dihapus.",
          icon: "success",
          confirmButtonColor: "#2563eb",
          timer: 1500,
          showConfirmButton: false,
        });
      }
    });
  };

  // Event Submit Form Absensi
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = nameInput.value.trim();
    const status = statusInput.value;
    const now = new Date();
    const time = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

    if (name) {
      const newRecord = {
        id: Date.now(),
        name: name,
        status: status,
        time: time,
      };
      // Simpan ke JSON Array
      addRecordJSON(newRecord);

      nameInput.value = "";
      statusInput.value = "Hadir";

      // Notifikasi sukses (Toast)
      const Toast = Swal.mixin({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      });
      Toast.fire({
        icon: "success",
        title: "Data berhasil disimpan",
      });
    }
  });

  // Event Hapus Semua Data
  clearAllBtn.addEventListener("click", () => {
    Swal.fire({
      title: "Hapus SEMUA Data?",
      text: "PERINGATAN! Seluruh data absen akan dihapus secara permanen.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#9ca3af",
      confirmButtonText: "Ya, Kosongkan!",
      cancelButtonText: "Batal",
    }).then((result) => {
      if (result.isConfirmed) {
        clearAllJSON();
        Swal.fire({
          title: "Dikosongkan!",
          text: "Seluruh data telah dihapus.",
          icon: "success",
          confirmButtonColor: "#2563eb",
          timer: 1500,
          showConfirmButton: false,
        });
      }
    });
  });

  // Event Export PDF
  exportPdfBtn.addEventListener("click", () => {
    if (records.length === 0) return;

    const jenisSambungInput = document.getElementById("jenis-sambung").value.trim();
    const jenisSambung = jenisSambungInput ? jenisSambungInput : "-";
    const pdfDate = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    let tableRows = "";
    records.forEach((record, index) => {
      const timeDisplay = record.status === "Hadir" ? record.time : "-";
      tableRows += `
                        <tr>
                            <td style="border: 1px solid #000; padding: 10px; text-align: center;">${index + 1}</td>
                            <td style="border: 1px solid #000; padding: 10px; text-transform: capitalize;">${record.name}</td>
                            <td style="border: 1px solid #000; padding: 10px; text-align: center;">${record.status}</td>
                            <td style="border: 1px solid #000; padding: 10px; text-align: center;">${timeDisplay}</td>
                        </tr>
                    `;
    });

    const pdfContent = `
                    <div style="font-family: Arial, sans-serif; padding: 20px; color: #000; background-color: #fff;">
                        <h2 style="text-align: center; margin-bottom: 5px; font-size: 20px; font-weight: bold; text-transform: uppercase;">
                            Absensi ${jenisSambung}
                        </h2>
                        <p style="text-align: center; margin-top: 0; margin-bottom: 20px; font-size: 14px; color: #555;">
                            ${pdfDate}
                        </p>
                        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px;">
                            <thead>
                                <tr style="background-color: #f2f2f2;">
                                    <th style="border: 1px solid #000; padding: 10px; text-align: center; width: 10%;">No</th>
                                    <th style="border: 1px solid #000; padding: 10px; text-align: left; width: 45%;">Nama</th>
                                    <th style="border: 1px solid #000; padding: 10px; text-align: center; width: 25%;">Status</th>
                                    <th style="border: 1px solid #000; padding: 10px; text-align: center; width: 20%;">Waktu</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tableRows}
                            </tbody>
                        </table>
                    </div>
                `;

    const opt = {
      margin: [0.5, 0.5, 0.5, 0.5],
      filename: `Laporan_Absensi_${new Date().toISOString().split("T")[0]}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
    };

    html2pdf()
      .set(opt)
      .from(pdfContent)
      .save()
      .catch((err) => {
        console.error("Gagal export PDF:", err);
      });
  });
});
