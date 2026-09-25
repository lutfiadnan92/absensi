document.addEventListener("DOMContentLoaded", () => {
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
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("./sw.js")
        .catch((err) => console.error("Service worker gagal didaftarkan:", err));
    });
  }

  const defaultCredentials = { username: "admin", password: "admin123" };
  if (!localStorage.getItem("credentials_json")) {
    localStorage.setItem("credentials_json", JSON.stringify(defaultCredentials));
  }

  let records = [];
  if (localStorage.getItem("attendance_json")) {
    try {
      records = JSON.parse(localStorage.getItem("attendance_json"));
      // Ensure backwards compatibility for older records without gender field
      records.forEach((r) => {
        if (!r.gender) r.gender = "Laki-laki";
      });
    } catch (e) {
      records = [];
    }
  } else {
    localStorage.setItem("attendance_json", JSON.stringify([]));
  }

  let currentGenderFilter = "all"; // 'all', 'Laki-laki', 'Perempuan'
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
  const genderInput = document.getElementById("gender");
  const statusInput = document.getElementById("status");
  const tableBody = document.getElementById("table-body");
  const emptyState = document.getElementById("empty-state");
  const clearAllBtn = document.getElementById("clear-all-btn");
  const dateDisplay = document.getElementById("current-date");
  const exportPdfBtn = document.getElementById("export-pdf-btn");

  // DOM Filter Tabs
  const filterAll = document.getElementById("filter-all");
  const filterLaki = document.getElementById("filter-laki");
  const filterPerempuan = document.getElementById("filter-perempuan");

  // DOM Checkbox & Table Bulk Control
  const selectAllCheckbox = document.getElementById("select-all-checkbox");
  const tableBulkActionBar = document.getElementById("table-bulk-action-bar");
  const selectedCountText = document.getElementById("selected-count-text");
  const tableBulkStatusSelect = document.getElementById("table-bulk-status-select");
  const btnApplyTableBulkStatus = document.getElementById("btn-apply-table-bulk-status");
  const btnDeleteTableBulk = document.getElementById("btn-delete-table-bulk");

  // DOM Summary Stats
  const statTotal = document.getElementById("stat-total");
  const statTotalGender = document.getElementById("stat-total-gender");
  const statHadir = document.getElementById("stat-hadir");
  const statHadirGender = document.getElementById("stat-hadir-gender");
  const statTidakHadir = document.getElementById("stat-tidakhadir");
  const statTidakHadirGender = document.getElementById("stat-tidakhadir-gender");
  const statIzin = document.getElementById("stat-izin");
  const statIzinGender = document.getElementById("stat-izin-gender");
  const statSakit = document.getElementById("stat-sakit");
  const statSakitGender = document.getElementById("stat-sakit-gender");

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
  const btnBulkAllLaki = document.getElementById("btn-bulk-all-laki");
  const btnBulkAllPerempuan = document.getElementById("btn-bulk-all-perempuan");

  function createTokens(username) {
    const now = Date.now();
    const accessTokenExp = now + 2 * 60 * 60 * 1000;
    const refreshTokenExp = now + 7 * 24 * 60 * 60 * 1000;

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
        "flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 hover:bg-gray-50 rounded border border-gray-100 text-sm gap-2";
      div.innerHTML = `
        <span class="font-medium text-gray-800 capitalize bulk-item-name">${capitalize(name)}</span>
          <div class="flex items-center gap-2 w-full sm:w-auto">
            <select
              class="bulk-item-gender px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-xs bg-white outline-none"
            >
              <option value="Laki-laki" selected>Laki-laki</option>
              <option value="Perempuan">Perempuan</option>
            </select>
            <select
              class="bulk-item-status px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-xs bg-white outline-none"
            >
              <option value="Hadir" selected>Hadir</option>
              <option value="Tidak Hadir">Tidak Hadir</option>
              <option value="Izin">Izin</option>
              <option value="Sakit">Sakit</option>
            </select>
          </div>
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

  btnBulkAllLaki.addEventListener("click", () => {
    document.querySelectorAll(".bulk-item-gender").forEach((g) => (g.value = "Laki-laki"));
  });

  btnBulkAllPerempuan.addEventListener("click", () => {
    document.querySelectorAll(".bulk-item-gender").forEach((g) => (g.value = "Perempuan"));
  });

  btnSaveBulk.addEventListener("click", () => {
    const itemNames = document.querySelectorAll(".bulk-item-name");
    const itemGenders = document.querySelectorAll(".bulk-item-gender");
    const itemStatuses = document.querySelectorAll(".bulk-item-status");

    if (itemNames.length === 0) return;

    const duplicates = [];
    const toSave = [];

    itemNames.forEach((nameEl, index) => {
      const name = capitalize(nameEl.textContent.trim());
      const gender = itemGenders[index].value;
      const status = itemStatuses[index].value;

      const existInRecords = records.some((r) => r.name.toLowerCase() === name.toLowerCase());
      const existInBatch = toSave.some((item) => item.name.toLowerCase() === name.toLowerCase());

      if (existInRecords || existInBatch) {
        if (!duplicates.includes(name)) duplicates.push(name);
      } else {
        toSave.push({ name, gender, status });
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
        gender: item.gender,
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
    const genderValue = genderInput.value;
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
      gender: genderValue,
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
    const getCounts = (statusFilter = null) => {
      const list = statusFilter ? records.filter((r) => r.status === statusFilter) : records;
      const total = list.length;
      const l = list.filter((r) => r.gender === "Laki-laki").length;
      const p = list.filter((r) => r.gender === "Perempuan").length;
      return { total, l, p };
    };

    const tot = getCounts();
    const hdr = getCounts("Hadir");
    const thdr = getCounts("Tidak Hadir");
    const izn = getCounts("Izin");
    const skt = getCounts("Sakit");

    statTotal.textContent = tot.total;
    statTotalGender.textContent = `L: ${tot.l} | P: ${tot.p}`;

    statHadir.textContent = hdr.total;
    statHadirGender.textContent = `L: ${hdr.l} | P: ${hdr.p}`;

    statTidakHadir.textContent = thdr.total;
    statTidakHadirGender.textContent = `L: ${thdr.l} | P: ${thdr.p}`;

    statIzin.textContent = izn.total;
    statIzinGender.textContent = `L: ${izn.l} | P: ${izn.p}`;

    statSakit.textContent = skt.total;
    statSakitGender.textContent = `L: ${skt.l} | P: ${skt.p}`;
  }

  function updateTableBulkBar(filteredRecords) {
    if (selectedIds.size > 0) {
      tableBulkActionBar.classList.remove("hidden");
      selectedCountText.textContent = `${selectedIds.size} data dipilih`;
    } else {
      tableBulkActionBar.classList.add("hidden");
    }

    if (filteredRecords.length > 0 && selectedIds.size === filteredRecords.length) {
      selectAllCheckbox.checked = true;
      selectAllCheckbox.indeterminate = false;
    } else if (selectedIds.size > 0 && selectedIds.size < filteredRecords.length) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = true;
    } else {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = false;
    }
  }

  // Tabs Filter Event Listeners dengan Reset Checkbox Otomatis
  function setGenderFilter(filter) {
    if (currentGenderFilter !== filter) {
      selectedIds.clear(); // Reset centang checkbox saat berpindah tab gender
    }
    currentGenderFilter = filter;

    [filterAll, filterLaki, filterPerempuan].forEach((btn) => {
      btn.className =
        "filter-tab-btn px-3 py-1.5 rounded-md font-medium text-gray-600 hover:text-blue-600 transition-all";
    });

    if (filter === "all") {
      filterAll.className =
        "filter-tab-btn px-3 py-1.5 rounded-md font-semibold text-blue-600 bg-white shadow-sm transition-all";
    } else if (filter === "Laki-laki") {
      filterLaki.className =
        "filter-tab-btn px-3 py-1.5 rounded-md font-semibold text-blue-600 bg-white shadow-sm transition-all";
    } else if (filter === "Perempuan") {
      filterPerempuan.className =
        "filter-tab-btn px-3 py-1.5 rounded-md font-semibold text-pink-600 bg-white shadow-sm transition-all";
    }

    renderTable();
  }

  filterAll.addEventListener("click", () => setGenderFilter("all"));
  filterLaki.addEventListener("click", () => setGenderFilter("Laki-laki"));
  filterPerempuan.addEventListener("click", () => setGenderFilter("Perempuan"));

  function getFilteredRecords() {
    if (currentGenderFilter === "all") return records;
    return records.filter((r) => r.gender === currentGenderFilter);
  }

  function renderTable() {
    tableBody.innerHTML = "";
    updateSummary();

    const filteredRecords = getFilteredRecords();

    const currentIds = new Set(records.map((r) => r.id));
    selectedIds.forEach((id) => {
      if (!currentIds.has(id)) selectedIds.delete(id);
    });

    if (filteredRecords.length === 0) {
      emptyState.classList.remove("hidden");
      clearAllBtn.classList.add("hidden");
      updateTableBulkBar(filteredRecords);
      return;
    }

    emptyState.classList.add("hidden");
    clearAllBtn.classList.remove("hidden");

    filteredRecords.forEach((record, index) => {
      const row = document.createElement("tr");
      const isChecked = selectedIds.has(record.id);

      let badgeClass = "bg-gray-100 text-gray-800";
      if (record.status === "Hadir") badgeClass = "bg-green-100 text-green-800";
      else if (record.status === "Tidak Hadir") badgeClass = "bg-red-100 text-red-800";
      else if (record.status === "Izin") badgeClass = "bg-yellow-100 text-yellow-800";
      else if (record.status === "Sakit") badgeClass = "bg-purple-100 text-purple-800";

      let genderBadge =
        record.gender === "Perempuan"
          ? '<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-pink-100 text-pink-800">👩 P</span>'
          : '<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800">👨 L</span>';

      row.className = isChecked ? "bg-blue-50/50" : "";

      row.innerHTML = `
        <td class="px-4 py-4 text-center">
          <input
            type="checkbox"
            class="row-checkbox w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
            data-id="${record.id}"
            ${isChecked ? "checked" : ""}
          >
        </td>
        <td class="px-3 py-4 whitespace-nowrap text-xs text-gray-500">${index + 1}</td>
        <td class="px-5 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 capitalize">${record.name}</td>
        <td class="px-4 py-4 whitespace-nowrap text-xs">${genderBadge}</td>
        <td class="px-4 py-4 whitespace-nowrap text-xs">
          <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${badgeClass}">
            ${record.status}
          </span>
        </td>
        <td class="px-4 py-4 whitespace-nowrap text-xs text-gray-500">${record.time}</td>
        <td class="px-4 py-4 whitespace-nowrap text-center text-xs font-medium">
          <div class="flex items-center justify-center space-x-2">
            <button
              onclick="editRecord(${record.id})"
              class="text-blue-500 hover:text-blue-700 transition-colors p-1"
              title="Edit Baris"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                ></path></svg>
            </button>
            <button
              onclick="deleteRecord(${record.id})"
              class="text-red-500 hover:text-red-700 transition-colors p-1"
              title="Hapus Baris"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                ></path></svg>
            </button>
          </div>
        </td>
      `;
      tableBody.appendChild(row);
    });

    updateTableBulkBar(filteredRecords);
  }

  /* Event Listener Checkbox Centang Semua */
  selectAllCheckbox.addEventListener("change", (e) => {
    const filtered = getFilteredRecords();
    if (e.target.checked) {
      filtered.forEach((r) => selectedIds.add(r.id));
    } else {
      filtered.forEach((r) => selectedIds.delete(r.id));
    }
    renderTable();
  });

  /* Event Listener Checkbox Per Baris */
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
            <input
              id="swal-edit-name"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value="${record.name}"
            >
          </div>
          <div class="text-left mb-3">
            <label class="block text-sm font-medium text-gray-700 mb-1">Jenis Kelamin</label>
            <select
              id="swal-edit-gender"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white"
            >
              <option value="Laki-laki" ${record.gender === "Laki-laki" ? "selected" : ""}>Laki-laki</option>
              <option value="Perempuan" ${record.gender === "Perempuan" ? "selected" : ""}>Perempuan</option>
            </select>
          </div>
          <div class="text-left mb-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">Status Kehadiran</label>
            <select
              id="swal-edit-status"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white"
            >
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
        const newGender = document.getElementById("swal-edit-gender").value;
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

        return { newName, newGender, newStatus };
      },
    }).then((result) => {
      if (result.isConfirmed) {
        const { newName, newGender, newStatus } = result.value;
        record.name = newName;
        record.gender = newGender;

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

  /* Core Function Generatating PDF Single File */
  function generatePdf(dataset, titleCategory = "") {
    if (dataset.length === 0) {
      Swal.fire({
        icon: "info",
        title: "Data Kosong",
        text: `Tidak ada data absensi ${titleCategory} untuk dicetak!`,
        confirmButtonColor: "#2563eb",
      });
      return Promise.reject("Data kosong");
    }

    const jenisSambungInput = document.getElementById("jenis-sambung").value.trim();
    const jenisSambung = jenisSambungInput ? jenisSambungInput : "Reguler";
    const pdfDate = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const hadir = dataset.filter((r) => r.status === "Hadir").length;
    const tidakHadir = dataset.filter((r) => r.status === "Tidak Hadir").length;
    const izin = dataset.filter((r) => r.status === "Izin").length;
    const sakit = dataset.filter((r) => r.status === "Sakit").length;

    let tableRows = "";
    dataset.forEach((record, index) => {
      tableRows += `
          <tr style="page-break-inside: avoid !important; break-inside: avoid !important;">
            <td style="border: 1px solid #000; padding: 6px 8px; text-align: center;">${index + 1}</td>
            <td style="border: 1px solid #000; padding: 6px 8px; text-transform: capitalize;">${record.name}</td>
            <td style="border: 1px solid #000; padding: 6px 8px; text-align: center;">${record.status}</td>
            <td style="border: 1px solid #000; padding: 6px 8px; text-align: center;">${record.time}</td>
          </tr>
      `;
    });

    const titleFull = `Absensi ${jenisSambung} ${titleCategory ? "(" + titleCategory + ")" : ""}`;

    const pdfContent = `
      <div
        style="font-family: Arial, sans-serif; padding: 20px; color: #000; background-color: #fff;"
      >
        <style>
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            margin-top: 10px;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          thead {
            display: table-header-group;
          }
        </style>
        <h2
          style="text-align: center; margin-bottom: 5px; font-size: 18px; font-weight: bold; text-transform: uppercase;"
        >
          ${titleFull}
        </h2>
        <p
          style="text-align: center; margin-top: 0; margin-bottom: 15px; font-size: 13px; color: #444;"
        >
          Tanggal: ${pdfDate}
        </p>
            
        <div
          style="margin-bottom: 15px; font-size: 12px; border: 1px solid #ccc; padding: 8px; background-color: #f9f9f9; display: flex; justify-content: space-around;"
        >
          <span><b>Total:</b> ${dataset.length}</span>
          <span><b>Hadir:</b> ${hadir}</span>
          <span><b>Tidak Hadir:</b> ${tidakHadir}</span>
          <span><b>Izin:</b> ${izin}</span>
          <span><b>Sakit:</b> ${sakit}</span>
        </div>

        <table>
          <thead>
            <tr
              style="background-color: #f2f2f2; page-break-inside: avoid !important; break-inside: avoid !important;"
            >
              <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 6%;">No</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: left; width: 44%;">Nama</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 18%;">Status</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 14%;">Waktu</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    `;

    const fileSuffix = titleCategory ? `_${titleCategory.replace(/\s+/g, "_")}` : "";
    const opt = {
      margin: [0.5, 0.5, 0.5, 0.5],
      filename: `Laporan_Absensi${fileSuffix}_Kelompok_6_${new Date().toISOString().split("T")[0]}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css"] },
    };

    return html2pdf().set(opt).from(pdfContent).save();
  }

  /* Export PDF Button Trigger Pop-up Option */
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

    Swal.fire({
      title: "Pilih Format Laporan PDF",
      text: "Silakan pilih data yang ingin diexport ke PDF:",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Export PDF",
      cancelButtonText: "Batal",
      confirmButtonColor: "#2563eb",
      input: "select",
      inputOptions: {
        all: "Semua Data (Gabungan L & P)",
        laki: "Khusus Laki-laki",
        perempuan: "Khusus Perempuan",
        both_separate: "Dua File Terpisah (1 File L & 1 File P)",
      },
      inputValue: "all",
      customClass: {
        input:
          "px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white",
      },
    }).then((result) => {
      if (result.isConfirmed) {
        const choice = result.value;

        if (choice === "all") {
          generatePdf(records, "Gabungan");
        } else if (choice === "laki") {
          const dataL = records.filter((r) => r.gender === "Laki-laki");
          generatePdf(dataL, "Laki-laki");
        } else if (choice === "perempuan") {
          const dataP = records.filter((r) => r.gender === "Perempuan");
          generatePdf(dataP, "Perempuan");
        } else if (choice === "both_separate") {
          const dataL = records.filter((r) => r.gender === "Laki-laki");
          const dataP = records.filter((r) => r.gender === "Perempuan");

          Swal.fire({
            title: "Memproses Export PDF...",
            text: "Mohon tunggu sebentar, sedang menyiapkan 2 file PDF.",
            allowOutsideClick: false,
            didOpen: () => {
              Swal.showLoading();
            },
          });

          generatePdf(dataL, "Laki-laki")
            .then(() => {
              setTimeout(() => {
                generatePdf(dataP, "Perempuan")
                  .then(() => {
                    Swal.fire("Selesai!", "Kedua file PDF berhasil diunduh.", "success");
                  })
                  .catch(() => Swal.close());
              }, 1000);
            })
            .catch(() => Swal.close());
        }
      }
    });
  });

  checkAuth();
});
