document.addEventListener("DOMContentLoaded", () => {
  /* -------------------------------------------------------------
                     1. INISIALISASI STORAGE (Kredensial, Data Absen, & Token)
                     ------------------------------------------------------------- */
  const defaultCredentials = { username: "admin", password: "admin123" };
  if (!localStorage.getItem("credentials_json")) {
    localStorage.setItem("credentials_json", JSON.stringify(defaultCredentials));
  }

  let records = [];
  if (localStorage.getItem("attendance_json")) {
    try {
      records = JSON.parse(localStorage.getItem("attendance_json"));
    } catch (e) {
      records = [];
    }
  } else {
    localStorage.setItem("attendance_json", JSON.stringify([]));
  }

  /* -------------------------------------------------------------
                     2. ELEMEN DOM & STATE MANAGEMENT
                     ------------------------------------------------------------- */
  const loginContainer = document.getElementById("login-container");
  const appContainer = document.getElementById("app-container");
  const loginForm = document.getElementById("login-form");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const logoutBtn = document.getElementById("logout-btn");

  const singleForm = document.getElementById("attendance-form");
  const nameInput = document.getElementById("name");
  const statusInput = document.getElementById("status");
  const tableBody = document.getElementById("table-body");
  const emptyState = document.getElementById("empty-state");
  const clearAllBtn = document.getElementById("clear-all-btn");
  const dateDisplay = document.getElementById("current-date");
  const exportPdfBtn = document.getElementById("export-pdf-btn");

  // DOM Tabs & Bulk Input
  const tabSingle = document.getElementById("tab-single");
  const tabBulk = document.getElementById("tab-bulk");
  const bulkContainer = document.getElementById("bulk-attendance-container");
  const bulkNames = document.getElementById("bulk-names");
  const btnGenerateBulk = document.getElementById("btn-generate-bulk");
  const bulkChecklistWrapper = document.getElementById("bulk-checklist-wrapper");
  const bulkListItems = document.getElementById("bulk-list-items");
  const btnSaveBulk = document.getElementById("btn-save-bulk");
  const btnBulkAllHadir = document.getElementById("btn-bulk-all-hadir");
  const btnBulkAllTidakHadir = document.getElementById("btn-bulk-all-tidakhadir");

  /* -------------------------------------------------------------
                     3. FUNGSI AUTHENTICATION & TOKEN SIMULATION (Access 2h, Refresh 7d)
                     ------------------------------------------------------------- */
  function createTokens(username) {
    const now = Date.now();
    const accessTokenExp = now + 2 * 60 * 60 * 1000; // 2 Jam
    const refreshTokenExp = now + 7 * 24 * 60 * 60 * 1000; // 7 Hari

    const accessToken = btoa(JSON.stringify({ username, exp: accessTokenExp }));
    const refreshToken = btoa(JSON.stringify({ username, exp: refreshTokenExp }));

    return { accessToken, refreshToken };
  }

  function verifyToken() {
    const tokenString = localStorage.getItem("auth_token_json");
    if (!tokenString) return false;

    try {
      const tokens = JSON.parse(tokenString);
      const now = Date.now();

      // Cek Access Token
      const accessData = JSON.parse(atob(tokens.accessToken));
      if (accessData.exp > now) {
        return true;
      }

      // Jika Access Token Kadaluarsa, Cek Refresh Token
      const refreshData = JSON.parse(atob(tokens.refreshToken));
      if (refreshData.exp > now) {
        // Terbitkan Access Token baru secara transparan
        const newTokens = createTokens(refreshData.username);
        localStorage.setItem("auth_token_json", JSON.stringify(newTokens));
        return true;
      }
    } catch (e) {
      return false;
    }
    return false;
  }

  function checkAuth() {
    if (verifyToken()) {
      loginContainer.classList.add("hidden");
      appContainer.classList.remove("hidden");
      updateDateDisplay();
      renderTable();
    } else {
      appContainer.classList.add("hidden");
      loginContainer.classList.remove("hidden");
      setTimeout(() => usernameInput.focus(), 100);
    }
  }

  // Submit Form Login
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const enteredUser = usernameInput.value.trim();
    const enteredPass = passwordInput.value.trim();

    const savedCreds = JSON.parse(localStorage.getItem("credentials_json"));

    if (enteredUser === savedCreds.username && enteredPass === savedCreds.password) {
      const tokens = createTokens(enteredUser);
      localStorage.setItem("auth_token_json", JSON.stringify(tokens));

      // Reset Input & Buka App
      usernameInput.value = "";
      passwordInput.value = "";
      checkAuth();

      Swal.fire({
        icon: "success",
        title: "Berhasil Login!",
        text: "Selamat datang di Aplikasi Absensi",
        timer: 1500,
        showConfirmButton: false,
      });
    } else {
      Swal.fire({
        icon: "error",
        title: "Gagal Login",
        text: "Username atau Password salah!",
        confirmButtonColor: "#2563eb",
      });
    }
  });

  // Logout
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("auth_token_json");
    checkAuth();
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "info",
      title: "Anda telah logout",
      showConfirmButton: false,
      timer: 2000,
    });
  });

  /* -------------------------------------------------------------
                     4. TAB NAVIGATION & BULK INPUT HANDLERS
                     ------------------------------------------------------------- */
  tabSingle.addEventListener("click", () => {
    singleForm.classList.remove("hidden");
    bulkContainer.classList.add("hidden");
    tabSingle.className =
      "font-semibold text-blue-600 border-b-2 border-blue-600 pb-2 text-sm focus:outline-none transition-all";
    tabBulk.className =
      "font-semibold text-gray-500 hover:text-blue-600 pb-2 text-sm focus:outline-none transition-all";
  });

  tabBulk.addEventListener("click", () => {
    singleForm.classList.add("hidden");
    bulkContainer.classList.remove("hidden");
    tabBulk.className =
      "font-semibold text-blue-600 border-b-2 border-blue-600 pb-2 text-sm focus:outline-none transition-all";
    tabSingle.className =
      "font-semibold text-gray-500 hover:text-blue-600 pb-2 text-sm focus:outline-none transition-all";
  });

  btnGenerateBulk.addEventListener("click", () => {
    const text = bulkNames.value.trim();
    if (!text) {
      Swal.fire({
        icon: "warning",
        title: "Teks Kosong",
        text: "Silakan masukkan daftar nama terlebih dahulu!",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    const namesArray = text
      .split("\n")
      .map((n) => n.trim())
      .filter((n) => n.length > 0);
    if (namesArray.length === 0) return;

    bulkListItems.innerHTML = "";
    namesArray.forEach((name) => {
      const div = document.createElement("div");
      div.className =
        "flex items-center justify-between p-2 hover:bg-gray-50 rounded border border-gray-100 text-sm";
      div.innerHTML = `
                        <span class="font-medium text-gray-800 capitalize bulk-item-name">${capitalize(name)}</span>
                        <select class="bulk-item-status px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm bg-white outline-none">
                            <option value="Hadir" selected>Hadir</option>
                            <option value="Tidak Hadir">Tidak Hadir</option>
                            <option value="Izin">Izin</option>
                            <option value="Sakit">Sakit</option>
                        </select>
                    `;
      bulkListItems.appendChild(div);
    });

    bulkChecklistWrapper.classList.remove("hidden");
  });

  btnBulkAllHadir.addEventListener("click", () => {
    document.querySelectorAll(".bulk-item-status").forEach((s) => (s.value = "Hadir"));
  });

  btnBulkAllTidakHadir.addEventListener("click", () => {
    document.querySelectorAll(".bulk-item-status").forEach((s) => (s.value = "Tidak Hadir"));
  });

  btnSaveBulk.addEventListener("click", () => {
    const itemNames = document.querySelectorAll(".bulk-item-name");
    const itemStatuses = document.querySelectorAll(".bulk-item-status");

    if (itemNames.length === 0) return;

    const duplicates = [];
    const toSave = [];

    itemNames.forEach((nameEl, index) => {
      const name = capitalize(nameEl.textContent.trim());
      const status = itemStatuses[index].value;

      // Penjagaan: Cek duplikasi di database dan di dalam batch input ini
      const existInRecords = records.some((r) => r.name.toLowerCase() === name.toLowerCase());
      const existInBatch = toSave.some((item) => item.name.toLowerCase() === name.toLowerCase());

      if (existInRecords || existInBatch) {
        if (!duplicates.includes(name)) {
          duplicates.push(name);
        }
      } else {
        toSave.push({ name, status });
      }
    });

    // Jika ditemukan nama duplikat, tampilkan peringatan
    if (duplicates.length > 0) {
      Swal.fire({
        icon: "warning",
        title: "Gagal Menyimpan (Duplikat)",
        html: `Nama berikut sudah ada di dalam daftar absensi atau ganda:<br><br><b>${duplicates.join(", ")}</b>`,
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    // Input Massal: Kolom Waktu selalu diisi "-" (waktu khusus untuk input satuan)
    toSave.forEach((item, index) => {
      records.push({
        id: Date.now() + index,
        name: item.name,
        status: item.status,
        time: "-",
      });
    });

    saveToStorage();
    renderTable();

    bulkNames.value = "";
    bulkListItems.innerHTML = "";
    bulkChecklistWrapper.classList.add("hidden");

    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: `${toSave.length} data berhasil disimpan!`,
      showConfirmButton: false,
      timer: 2000,
    });
  });

  /* -------------------------------------------------------------
                     5. DATA HELPER & SINGLE FORM HANDLERS
                     ------------------------------------------------------------- */
  function capitalize(str) {
    return str.toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
  }

  function saveToStorage() {
    localStorage.setItem("attendance_json", JSON.stringify(records));
  }

  function updateDateDisplay() {
    const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
    dateDisplay.textContent = new Date().toLocaleDateString("id-ID", options);
  }

  // Single Attendance Submit (Waktu dicatat khusus untuk Input Satuan)
  singleForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const nameValue = capitalize(nameInput.value.trim());
    const statusValue = statusInput.value;

    if (!nameValue) return;

    // Penjagaan: Cek apakah nama sudah ada dalam daftar absensi
    const isExist = records.some((r) => r.name.toLowerCase() === nameValue.toLowerCase());
    if (isExist) {
      Swal.fire({
        icon: "warning",
        title: "Nama Sudah Terdaftar",
        text: `Nama "${nameValue}" sudah ada di dalam daftar absensi!`,
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

    records.push({
      id: Date.now(),
      name: nameValue,
      status: statusValue,
      time: statusValue === "Hadir" ? timeStr : "-",
    });

    saveToStorage();
    renderTable();

    nameInput.value = "";
    nameInput.focus();

    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "Absensi dicatat!",
      showConfirmButton: false,
      timer: 1500,
    });
  });

  function renderTable() {
    tableBody.innerHTML = "";

    if (records.length === 0) {
      emptyState.classList.remove("hidden");
      clearAllBtn.classList.add("hidden");
      return;
    }

    emptyState.classList.add("hidden");
    clearAllBtn.classList.remove("hidden");

    records.forEach((record, index) => {
      const row = document.createElement("tr");

      let badgeClass = "bg-gray-100 text-gray-800";
      if (record.status === "Hadir") badgeClass = "bg-green-100 text-green-800";
      else if (record.status === "Tidak Hadir") badgeClass = "bg-red-100 text-red-800";
      else if (record.status === "Izin") badgeClass = "bg-yellow-100 text-yellow-800";
      else if (record.status === "Sakit") badgeClass = "bg-purple-100 text-purple-800";

      row.innerHTML = `
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${index + 1}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 capitalize">${record.name}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">
                            <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${badgeClass}">
                                ${record.status}
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${record.time}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                            <button onclick="deleteRecord(${record.id})" class="text-red-500 hover:text-red-700 transition-colors p-1" title="Hapus">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        </td>
                    `;
      tableBody.appendChild(row);
    });
  }

  window.deleteRecord = function (id) {
    Swal.fire({
      title: "Hapus data ini?",
      text: "Data yang dihapus tidak dapat dikembalikan!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, hapus!",
      cancelButtonText: "Batal",
    }).then((result) => {
      if (result.isConfirmed) {
        records = records.filter((record) => record.id !== id);
        saveToStorage();
        renderTable();
        Swal.fire("Terhapus!", "Data berhasil dihapus.", "success");
      }
    });
  };

  clearAllBtn.addEventListener("click", () => {
    Swal.fire({
      title: "Hapus Semua Data?",
      text: "Seluruh catatan absensi akan dikosongkan!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, kosongkan!",
      cancelButtonText: "Batal",
    }).then((result) => {
      if (result.isConfirmed) {
        records = [];
        saveToStorage();
        renderTable();
        Swal.fire("Berhasil!", "Semua data absensi telah dihapus.", "success");
      }
    });
  });

  /* -------------------------------------------------------------
                     6. EXPORT PDF FUNCTIONALITY
                     ------------------------------------------------------------- */
  exportPdfBtn.addEventListener("click", () => {
    if (records.length === 0) {
      Swal.fire({
        icon: "info",
        title: "Data Kosong",
        text: "Belum ada data absensi untuk dicetak!",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    const jenisSambungInput = document.getElementById("jenis-sambung").value.trim();
    const jenisSambung = jenisSambungInput ? jenisSambungInput : "Reguler";
    const pdfDate = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    let tableRows = "";
    records.forEach((record, index) => {
      tableRows += `
                        <tr>
                            <td style="border: 1px solid #000; padding: 8px; text-align: center;">${index + 1}</td>
                            <td style="border: 1px solid #000; padding: 8px; text-transform: capitalize;">${record.name}</td>
                            <td style="border: 1px solid #000; padding: 8px; text-align: center;">${record.status}</td>
                            <td style="border: 1px solid #000; padding: 8px; text-align: center;">${record.time}</td>
                        </tr>
                    `;
    });

    const pdfContent = `
                    <div style="font-family: Arial, sans-serif; padding: 20px; color: #000; background-color: #fff;">
                        <h2 style="text-align: center; margin-bottom: 5px; font-size: 20px; font-weight: bold; text-transform: uppercase;">
                            Absensi ${jenisSambung}
                        </h2>
                        <p style="text-align: center; margin-top: 0; margin-bottom: 20px; font-size: 14px; color: #444;">
                            ${pdfDate}
                        </p>
                        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px;">
                            <thead>
                                <tr style="background-color: #f2f2f2;">
                                    <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 8%;">No</th>
                                    <th style="border: 1px solid #000; padding: 8px; text-align: left; width: 48%;">Nama</th>
                                    <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 24%;">Status</th>
                                    <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 20%;">Waktu</th>
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

  // Jalankan cek authentikasi awal
  checkAuth();
});
