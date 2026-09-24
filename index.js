document.addEventListener("DOMContentLoaded", () => {
  // Function untuk membuat Ikon PWA & Web Manifest secara Dinamis via Canvas
  function initPWAAssets() {
    const createPwaIcon = (size) => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");

      // Background Gradient Rounded Rect
      const grad = ctx.createLinearGradient(0, 0, size, size);
      grad.addColorStop(0, "#2563eb");
      grad.addColorStop(1, "#1d4ed8");

      const r = size * 0.22;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(r, 0);
      ctx.lineTo(size - r, 0);
      ctx.quadraticCurveTo(size, 0, size, r);
      ctx.lineTo(size, size - r);
      ctx.quadraticCurveTo(size, size, size - r, size);
      ctx.lineTo(r, size);
      ctx.quadraticCurveTo(0, size, 0, size - r);
      ctx.lineTo(0, r);
      ctx.quadraticCurveTo(0, 0, r, 0);
      ctx.closePath();
      ctx.fill();

      // Clipboard Board Icon Drawing
      const pad = size * 0.22;
      const w = size - pad * 2;
      const h = size - pad * 2;

      // White Clipboard Body
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      const br = size * 0.05;
      ctx.roundRect(pad, pad + size * 0.06, w, h - size * 0.06, br);
      ctx.fill();

      // Top Metal Clip
      ctx.fillStyle = "#93c5fd";
      ctx.beginPath();
      ctx.roundRect(pad + w * 0.25, pad, w * 0.5, size * 0.09, size * 0.02);
      ctx.fill();

      // Checklist items on board
      const lineH = size * 0.035;
      const startY = pad + size * 0.16;
      const gap = size * 0.09;

      for (let i = 0; i < 3; i++) {
        // Status Box
        ctx.fillStyle = i === 2 ? "#ef4444" : "#10b981";
        ctx.beginPath();
        ctx.roundRect(pad + w * 0.12, startY + i * gap, lineH * 1.5, lineH * 1.5, size * 0.01);
        ctx.fill();

        // Line text
        ctx.fillStyle = "#94a3b8";
        ctx.beginPath();
        ctx.roundRect(
          pad + w * 0.35,
          startY + i * gap + lineH * 0.25,
          w * 0.52,
          lineH,
          size * 0.01,
        );
        ctx.fill();
      }

      return canvas.toDataURL("image/png");
    };

    const icon192 = createPwaIcon(192);
    const icon512 = createPwaIcon(512);

    // Attach Favicon & Apple Touch Icon
    document.getElementById("favicon-link").href = icon192;
    document.getElementById("apple-touch-icon").href = icon192;

    // Attach Web Manifest
    const manifestData = {
      name: "Aplikasi Absensi Sederhana",
      short_name: "Absensi",
      description: "Aplikasi Pencatatan Kehadiran & Laporan PDF",
      start_url: "./",
      display: "standalone",
      background_color: "#f3f4f6",
      theme_color: "#2563eb",
      icons: [
        {
          src: icon192,
          sizes: "192x192",
          type: "image/png",
          purpose: "any maskable",
        },
        {
          src: icon512,
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable",
        },
      ],
    };

    const blob = new Blob([JSON.stringify(manifestData)], { type: "application/manifest+json" });
    document.getElementById("manifest-link").href = URL.createObjectURL(blob);
  }

  // Inisialisasi Ikon & Manifest PWA
  initPWAAssets();

  // PWA Installation & Service Worker Event
  let deferredPrompt;
  const installAppBtn = document.getElementById("install-app-btn");

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installAppBtn) installAppBtn.classList.remove("hidden");
  });

  if (installAppBtn) {
    installAppBtn.addEventListener("click", async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          installAppBtn.classList.add("hidden");
        }
        deferredPrompt = null;
      } else {
        Swal.fire({
          icon: "info",
          title: "Install Aplikasi (PWA)",
          html: `
                                <div class="text-left text-sm space-y-2">
                                    <p>Untuk menginstall aplikasi ini di perangkat Anda:</p>
                                    <div class="bg-gray-50 p-3 rounded-lg border border-gray-200 mt-2">
                                        <p class="font-semibold text-blue-700">Android / Chrome:</p>
                                        <p class="text-gray-600">Ketuk menu titik tiga <b>(⋮)</b> di pojok kanan atas, lalu pilih <b>"Tambahkan ke Layar Utama"</b> atau <b>"Install Aplikasi"</b>.</p>
                                    </div>
                                    <div class="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                        <p class="font-semibold text-blue-700">iOS / Safari:</p>
                                        <p class="text-gray-600">Ketuk tombol Bagikan <b>(Share)</b> di bagian bawah browser, lalu pilih <b>"Tambah ke Layar Utama"</b>.</p>
                                    </div>
                                </div>
                            `,
          confirmButtonColor: "#2563eb",
        });
      }
    });
  }

  // Register Service Worker
  if ("serviceWorker" in navigator) {
    const swCode = `
                    const CACHE_NAME = 'absensi-pwa-v1';
                    self.addEventListener('install', (e) => self.skipWaiting());
                    self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
                    self.addEventListener('fetch', (e) => {
                        e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
                    });
                `;
    try {
      const blob = new Blob([swCode], { type: "application/javascript" });
      navigator.serviceWorker.register(URL.createObjectURL(blob)).catch(() => {});
    } catch (e) {}
  }

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

  // Set untuk menyimpan ID baris yang dicentang di tabel
  let selectedIds = new Set();

  /* DOM Elements */
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

  // DOM Checkbox & Table Bulk Control
  const selectAllCheckbox = document.getElementById("select-all-checkbox");
  const tableBulkActionBar = document.getElementById("table-bulk-action-bar");
  const selectedCountText = document.getElementById("selected-count-text");
  const tableBulkStatusSelect = document.getElementById("table-bulk-status-select");
  const btnApplyTableBulkStatus = document.getElementById("btn-apply-table-bulk-status");
  const btnDeleteTableBulk = document.getElementById("btn-delete-table-bulk");

  // DOM Summary Stats
  const statTotal = document.getElementById("stat-total");
  const statHadir = document.getElementById("stat-hadir");
  const statTidakHadir = document.getElementById("stat-tidakhadir");
  const statIzin = document.getElementById("stat-izin");
  const statSakit = document.getElementById("stat-sakit");

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

      const accessData = JSON.parse(atob(tokens.accessToken));
      if (accessData.exp > now) return true;

      const refreshData = JSON.parse(atob(tokens.refreshToken));
      if (refreshData.exp > now) {
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

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const enteredUser = usernameInput.value.trim();
    const enteredPass = passwordInput.value.trim();

    const savedCreds = JSON.parse(localStorage.getItem("credentials_json"));

    if (enteredUser === savedCreds.username && enteredPass === savedCreds.password) {
      const tokens = createTokens(enteredUser);
      localStorage.setItem("auth_token_json", JSON.stringify(tokens));

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

      const existInRecords = records.some((r) => r.name.toLowerCase() === name.toLowerCase());
      const existInBatch = toSave.some((item) => item.name.toLowerCase() === name.toLowerCase());

      if (existInRecords || existInBatch) {
        if (!duplicates.includes(name)) duplicates.push(name);
      } else {
        toSave.push({ name, status });
      }
    });

    if (duplicates.length > 0) {
      Swal.fire({
        icon: "warning",
        title: "Gagal Menyimpan (Duplikat)",
        html: `Nama berikut sudah ada di dalam daftar absensi atau ganda:<br><br><b>${duplicates.join(", ")}</b>`,
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    toSave.forEach((item, index) => {
      records.push({
        id: Date.now() + index,
        name: item.name,
        status: item.status,
        time: "-",
        source: "bulk",
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

  singleForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const nameValue = capitalize(nameInput.value.trim());
    const statusValue = statusInput.value;

    if (!nameValue) return;

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
      source: "single",
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

  function updateSummary() {
    const total = records.length;
    const hadir = records.filter((r) => r.status === "Hadir").length;
    const tidakHadir = records.filter((r) => r.status === "Tidak Hadir").length;
    const izin = records.filter((r) => r.status === "Izin").length;
    const sakit = records.filter((r) => r.status === "Sakit").length;

    statTotal.textContent = total;
    statHadir.textContent = hadir;
    statTidakHadir.textContent = tidakHadir;
    statIzin.textContent = izin;
    statSakit.textContent = sakit;
  }

  function updateTableBulkBar() {
    if (selectedIds.size > 0) {
      tableBulkActionBar.classList.remove("hidden");
      selectedCountText.textContent = `${selectedIds.size} data dipilih`;
    } else {
      tableBulkActionBar.classList.add("hidden");
    }

    // Pengaturan Checkbox "Select All"
    if (records.length > 0 && selectedIds.size === records.length) {
      selectAllCheckbox.checked = true;
      selectAllCheckbox.indeterminate = false;
    } else if (selectedIds.size > 0 && selectedIds.size < records.length) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = true;
    } else {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = false;
    }
  }

  function renderTable() {
    tableBody.innerHTML = "";
    updateSummary();

    // Bersihkan ID terpilih yang mungkin sudah terhapus
    const currentIds = new Set(records.map((r) => r.id));
    selectedIds.forEach((id) => {
      if (!currentIds.has(id)) selectedIds.delete(id);
    });

    if (records.length === 0) {
      emptyState.classList.remove("hidden");
      clearAllBtn.classList.add("hidden");
      updateTableBulkBar();
      return;
    }

    emptyState.classList.add("hidden");
    clearAllBtn.classList.remove("hidden");

    records.forEach((record, index) => {
      const row = document.createElement("tr");
      const isChecked = selectedIds.has(record.id);

      let badgeClass = "bg-gray-100 text-gray-800";
      if (record.status === "Hadir") badgeClass = "bg-green-100 text-green-800";
      else if (record.status === "Tidak Hadir") badgeClass = "bg-red-100 text-red-800";
      else if (record.status === "Izin") badgeClass = "bg-yellow-100 text-yellow-800";
      else if (record.status === "Sakit") badgeClass = "bg-purple-100 text-purple-800";

      row.className = isChecked ? "bg-blue-50/50" : "";

      row.innerHTML = `
                        <td class="px-4 py-4 text-center">
                            <input type="checkbox" class="row-checkbox w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer" data-id="${record.id}" ${isChecked ? "checked" : ""}>
                        </td>
                        <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">${index + 1}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 capitalize">${record.name}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">
                            <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${badgeClass}">
                                ${record.status}
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${record.time}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                            <div class="flex items-center justify-center space-x-2">
                                <button onclick="editRecord(${record.id})" class="text-blue-500 hover:text-blue-700 transition-colors p-1" title="Edit Baris">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                </button>
                                <button onclick="deleteRecord(${record.id})" class="text-red-500 hover:text-red-700 transition-colors p-1" title="Hapus Baris">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                            </div>
                        </td>
                    `;
      tableBody.appendChild(row);
    });

    updateTableBulkBar();
  }

  /* Event Listener Checkbox Centang Semua */
  selectAllCheckbox.addEventListener("change", (e) => {
    if (e.target.checked) {
      records.forEach((r) => selectedIds.add(r.id));
    } else {
      selectedIds.clear();
    }
    renderTable();
  });

  /* Event Listener Checkbox Per Baris (Delegasi Event) */
  tableBody.addEventListener("change", (e) => {
    if (e.target.classList.contains("row-checkbox")) {
      const id = Number(e.target.getAttribute("data-id"));
      if (e.target.checked) {
        selectedIds.add(id);
      } else {
        selectedIds.delete(id);
      }
      renderTable();
    }
  });

  /* Aksi Massal Status Kehadiran dari Tabel */
  btnApplyTableBulkStatus.addEventListener("click", () => {
    const newStatus = tableBulkStatusSelect.value;
    if (!newStatus) {
      Swal.fire({
        icon: "warning",
        title: "Pilih Status",
        text: "Silakan pilih status kehadiran terlebih dahulu!",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    if (selectedIds.size === 0) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

    records.forEach((record) => {
      if (selectedIds.has(record.id)) {
        record.status = newStatus;
        // Penyesuaian Waktu:
        if (newStatus === "Hadir") {
          if (record.source === "bulk") {
            record.time = "-";
          } else if (record.time === "-") {
            record.time = timeStr;
          }
        } else {
          record.time = "-";
        }
      }
    });

    saveToStorage();
    renderTable();

    tableBulkStatusSelect.value = "";

    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: `Status ${selectedIds.size} data diperbarui!`,
      showConfirmButton: false,
      timer: 1500,
    });
  });

  /* Aksi Massal Hapus Terpilih dari Tabel */
  btnDeleteTableBulk.addEventListener("click", () => {
    if (selectedIds.size === 0) return;

    Swal.fire({
      title: `Hapus ${selectedIds.size} data terpilih?`,
      text: "Data yang dihapus tidak dapat dikembalikan!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, hapus!",
      cancelButtonText: "Batal",
    }).then((result) => {
      if (result.isConfirmed) {
        records = records.filter((record) => !selectedIds.has(record.id));
        selectedIds.clear();
        saveToStorage();
        renderTable();
        Swal.fire("Terhapus!", "Data terpilih berhasil dihapus.", "success");
      }
    });
  });

  /* Edit Baris Satuan */
  window.editRecord = function (id) {
    const record = records.find((r) => r.id === id);
    if (!record) return;

    Swal.fire({
      title: "Edit Data Kehadiran",
      html: `
                        <div class="text-left mb-3">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                            <input id="swal-edit-name" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" value="${record.name}">
                        </div>
                        <div class="text-left mb-2">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Status Kehadiran</label>
                            <select id="swal-edit-status" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white">
                                <option value="Hadir" ${record.status === "Hadir" ? "selected" : ""}>Hadir</option>
                                <option value="Tidak Hadir" ${record.status === "Tidak Hadir" ? "selected" : ""}>Tidak Hadir</option>
                                <option value="Izin" ${record.status === "Izin" ? "selected" : ""}>Izin</option>
                                <option value="Sakit" ${record.status === "Sakit" ? "selected" : ""}>Sakit</option>
                            </select>
                        </div>
                    `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Simpan",
      cancelButtonText: "Batal",
      confirmButtonColor: "#2563eb",
      preConfirm: () => {
        const newName = capitalize(document.getElementById("swal-edit-name").value.trim());
        const newStatus = document.getElementById("swal-edit-status").value;

        if (!newName) {
          Swal.showValidationMessage("Nama tidak boleh kosong");
          return false;
        }

        const isExist = records.some(
          (r) => r.id !== id && r.name.toLowerCase() === newName.toLowerCase(),
        );
        if (isExist) {
          Swal.showValidationMessage(`Nama "${newName}" sudah ada di dalam daftar!`);
          return false;
        }

        return { newName, newStatus };
      },
    }).then((result) => {
      if (result.isConfirmed) {
        const { newName, newStatus } = result.value;
        record.name = newName;

        if (newStatus === "Hadir") {
          if (record.source === "bulk") {
            record.time = "-";
          } else if (record.time === "-") {
            const now = new Date();
            record.time = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
          }
        } else {
          record.time = "-";
        }

        record.status = newStatus;

        saveToStorage();
        renderTable();

        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "Data berhasil diperbarui!",
          showConfirmButton: false,
          timer: 1500,
        });
      }
    });
  };

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
        selectedIds.delete(id);
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
        selectedIds.clear();
        saveToStorage();
        renderTable();
        Swal.fire("Berhasil!", "Semua data absensi telah dihapus.", "success");
      }
    });
  });

  /* Export PDF */
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

    const hadir = records.filter((r) => r.status === "Hadir").length;
    const tidakHadir = records.filter((r) => r.status === "Tidak Hadir").length;
    const izin = records.filter((r) => r.status === "Izin").length;
    const sakit = records.filter((r) => r.status === "Sakit").length;

    let tableRows = "";
    records.forEach((record, index) => {
      tableRows += `
                        <tr style="page-break-inside: avoid !important; break-inside: avoid !important;">
                            <td style="border: 1px solid #000; padding: 6px 8px; text-align: center;">${index + 1}</td>
                            <td style="border: 1px solid #000; padding: 6px 8px; text-transform: capitalize;">${record.name}</td>
                            <td style="border: 1px solid #000; padding: 6px 8px; text-align: center;">${record.status}</td>
                            <td style="border: 1px solid #000; padding: 6px 8px; text-align: center;">${record.time}</td>
                        </tr>
                    `;
    });

    const pdfContent = `
                    <div style="font-family: Arial, sans-serif; padding: 20px; color: #000; background-color: #fff;">
                        <style>
                            table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 10px; }
                            tr { page-break-inside: avoid !important; break-inside: avoid !important; }
                            thead { display: table-header-group; }
                        </style>
                        <h2 style="text-align: center; margin-bottom: 5px; font-size: 20px; font-weight: bold; text-transform: uppercase;">
                            Absensi ${jenisSambung}
                        </h2>
                        <p style="text-align: center; margin-top: 0; margin-bottom: 15px; font-size: 14px; color: #444;">
                            ${pdfDate}
                        </p>
                        
                        <div style="margin-bottom: 15px; font-size: 12px; border: 1px solid #ccc; padding: 8px; background-color: #f9f9f9; display: flex; justify-content: space-around;">
                            <span><b>Total:</b> ${records.length}</span>
                            <span><b>Hadir:</b> ${hadir}</span>
                            <span><b>Tidak Hadir:</b> ${tidakHadir}</span>
                            <span><b>Izin:</b> ${izin}</span>
                            <span><b>Sakit:</b> ${sakit}</span>
                        </div>

                        <table>
                            <thead>
                                <tr style="background-color: #f2f2f2; page-break-inside: avoid !important; break-inside: avoid !important;">
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
      filename: `Laporan_Absensi_Kelompok_6_${new Date().toISOString().split("T")[0]}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css"] },
    };

    html2pdf()
      .set(opt)
      .from(pdfContent)
      .save()
      .catch((err) => {
        console.error("Gagal export PDF:", err);
      });
  });

  checkAuth();
});
