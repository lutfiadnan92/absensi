function absensiApp() {
  const STATUS_ORDER = ["Hadir", "Izin", "Sakit", "Tidak Hadir"];
  const USIA_OPTIONS = ["GP", "3M"];
  const ATTENDANCE_ONLY_ROLES = ["petugas_laki", "petugas_perempuan"];
  const GROUP_BOUND_ROLES = [
    "admin_kelompok",
    "admin_laki",
    "admin_perempuan",
    ...ATTENDANCE_ONLY_ROLES,
  ];
  const DESA_BOUND_ROLES = ["admin_generus"];
  const VALID_ROLES = ["admin", ...GROUP_BOUND_ROLES, ...DESA_BOUND_ROLES];
  const ROLE_GENDER = {
    admin_laki: "Laki-laki",
    petugas_laki: "Laki-laki",
    admin_perempuan: "Perempuan",
    petugas_perempuan: "Perempuan",
  };
  const ROLE_LABELS = {
    admin: "Super Admin",
    admin_kelompok: "Admin Kelompok",
    admin_generus: "Admin Generus",
    admin_laki: "Admin Laki-laki",
    admin_perempuan: "Admin Perempuan",
    petugas_laki: "Petugas Absensi Laki-laki",
    petugas_perempuan: "Petugas Absensi Perempuan",
  };
  const app = {
    // State & Auth
    isLoggedIn: false,
    currentUser: { email: "", role: "", displayName: "", kelompok: "" },
    loginInput: { email: "", password: "" },
    installPrompt: null,
    isAppInstalled: false,
    kelompok: "Umum",
    loadingAction: "",
    authUserId: "",
    authSessionTask: null,
    authSubscription: null,
    authInitialized: false,

    // Supabase Connection
    supabaseClient: null,
    isSupabaseConnected: true,
    showConfigModal: false,
    configSupabaseUrl: "https://aoqdzjrteslhxqfjcyym.supabase.co",
    configSupabaseKey:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvcWR6anJ0ZXNsaHhxZmpjeXltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NTYwNDQsImV4cCI6MjEwNjMzMjA0NH0.hnl4rsNX35ijibPylFjDYruSKAkekK9RZLa4f7FZmc8",

    // Data Models
    records: [],
    materi: { quran: "", hadits: "", nasehat: "" },
    jenisSambung: "Pengajian Rutin",
    selectedDate: new Date().toLocaleDateString("sv-SE"),
    isLoadingAttendance: false,

    // Tab & Filter States
    activeTab: "single", // 'single', 'bulk', 'materi'
    genderFilter: "all", // 'all', 'Laki-laki', 'Perempuan'
    selectedIds: [],
    bulkTableStatus: "",

    // Form Inputs
    formSingle: { name: "", gender: "Laki-laki", status: "Hadir", kategori_usia: "" },
    bulkText: "",
    bulkItems: [],
    statusSort: "none",
    usiaOptions: USIA_OPTIONS,
    kelompokOptions: [],

    // Initialization
    initApp() {
      this.initInstallPrompt();
      this.initSupabase();
    },

    initInstallPrompt() {
      this.isAppInstalled =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true;

      window.addEventListener("beforeinstallprompt", (event) => {
        event.preventDefault();
        this.installPrompt = event;
      });

      window.addEventListener("appinstalled", () => {
        this.isAppInstalled = true;
        this.installPrompt = null;
      });
    },

    async installApp() {
      if (this.isAppInstalled) return;

      if (this.installPrompt) {
        const prompt = this.installPrompt;
        this.installPrompt = null;
        await prompt.prompt();
        const { outcome } = await prompt.userChoice;
        if (outcome === "accepted") this.isAppInstalled = true;
        return;
      }

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
    },

    initSupabase() {
      if (this.authSubscription) {
        this.authSubscription.unsubscribe();
        this.authSubscription = null;
      }

      if (this.configSupabaseUrl && this.configSupabaseKey && window.supabase) {
        try {
          this.supabaseClient = window.supabase.createClient(
            this.configSupabaseUrl,
            this.configSupabaseKey,
          );
          this.isSupabaseConnected = true;
          this.authUserId = "";
          this.authSessionTask = null;
          this.currentUser = { email: "", role: "", displayName: "", kelompok: "" };
          this.isLoggedIn = false;
          this.records = [];
          this.materi = { quran: "", hadits: "", nasehat: "" };
          this.kelompok = "Umum";
          const { data } = this.supabaseClient.auth.onAuthStateChange((_event, session) => {
            window.setTimeout(async () => {
              try {
                await this.handleAuthSession(session);
              } catch (error) {
                console.error("Supabase Auth State Error:", error);
              } finally {
                this.authInitialized = true;
              }
            }, 0);
          });
          this.authSubscription = data.subscription;
        } catch (e) {
          console.error("Supabase Init Error:", e);
          this.supabaseClient = null;
          this.isSupabaseConnected = false;
          this.loadLocalFallback();
        }
      } else {
        this.isSupabaseConnected = false;
        this.loadLocalFallback();
      }
    },

    saveSupabaseConfig() {
      localStorage.setItem("supabase_url", this.configSupabaseUrl.trim());
      localStorage.setItem("supabase_key", this.configSupabaseKey.trim());
      this.showConfigModal = false;
      this.initSupabase();

      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Konfigurasi Supabase disimpan!",
        showConfirmButton: false,
        timer: 1500,
      });
    },

    loadLocalFallback() {
      try {
        const saved = localStorage.getItem("attendance_records_v3");
        if (saved) this.records = JSON.parse(saved);
        const savedMateri = localStorage.getItem("materi_v3");
        if (savedMateri) this.materi = JSON.parse(savedMateri);
      } catch (e) {
        this.records = [];
      }
    },

    saveLocalFallback() {
      if (this.isSupabaseConnected) return;
      localStorage.setItem("attendance_records_v3", JSON.stringify(this.records));
      localStorage.setItem("materi_v3", JSON.stringify(this.materi));
    },

    // Fetch Data from Supabase
    async fetchDataFromSupabase() {
      if (!this.supabaseClient) return;

      this.isLoadingAttendance = true;
      try {
        // 1. Fetch Attendance Records
        let query = this.supabaseClient
          .from("attendance")
          .select("*")
          .order("created_at", { ascending: true });

        if (this.isGenerusAdmin()) query = query.not("kategori_usia", "is", null);

        const { data: attData, error: attErr } = await query;

        if (attErr) throw attErr;
        if (attData) {
          this.records = attData;
          localStorage.setItem("attendance_records_v3", JSON.stringify(attData));
        }

        // 2. Fetch Materi
        if (!this.isAttendanceOnlyRole()) await this.loadGroupMateri();
      } catch (e) {
        console.error("Supabase data fetch error:", e);
        this.showSupabaseError(e);
      } finally {
        this.isLoadingAttendance = false;
      }
    },

    // Supabase Helpers
    showSupabaseError(error) {
      Swal.fire({
        icon: "error",
        title: "Operasi Supabase gagal",
        text: error?.message || "Terjadi kesalahan saat mengakses data Supabase.",
        confirmButtonColor: "#2563eb",
      });
    },

    async runButtonAction(action, callback) {
      if (this.loadingAction) return;
      this.loadingAction = action;
      try {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        return await callback();
      } catch (error) {
        console.error(`Action "${action}" failed:`, error);
        this.showSupabaseError(error);
      } finally {
        this.loadingAction = "";
      }
    },

    isGroupBoundRole(role = this.currentUser.role) {
      return GROUP_BOUND_ROLES.includes(role);
    },

    getCurrentGroup() {
      return this.isGroupBoundRole() ? this.currentUser.kelompok : this.kelompok.trim();
    },

    async loadGroupMateri() {
      const group = this.getCurrentGroup();
      if (!this.supabaseClient || !group) {
        this.materi = { quran: "", hadits: "", nasehat: "" };
        return;
      }

      const { data: matData, error: matErr } = await this.supabaseClient
        .from("materi")
        .select("*")
        .eq("id", 1)
        .eq("kelompok", group)
        .maybeSingle();

      if (matErr) {
        this.showSupabaseError(matErr);
        return;
      }

      this.materi = {
        quran: matData?.quran || "",
        hadits: matData?.hadits || "",
        nasehat: matData?.nasehat || "",
      };
    },

    canManageMateri() {
      return ["admin", "admin_kelompok"].includes(this.currentUser.role);
    },

    canExportPdf() {
      return (
        this.currentUser.role === "admin" ||
        (this.currentUser.role === "admin_kelompok" && Boolean(this.currentUser.kelompok))
      );
    },
    getRoleBadge() {
      return ROLE_LABELS[this.currentUser.role] || "";
    },

    canUserModify(targetGender, targetGroup = this.currentUser.kelompok, kategoriUsia = null) {
      const { role, kelompok } = this.currentUser;

      if (role === "admin") return true;
      if (this.isAttendanceOnlyRole(role)) return false;
      if (role === "admin_generus") {
        return Boolean(kategoriUsia) && this.kelompokOptions.includes(targetGroup);
      }
      if (!kelompok || targetGroup !== kelompok) return false;
      if (role === "admin_kelompok") return true;
      if (role === "admin_laki") return targetGender === "Laki-laki";
      if (role === "admin_perempuan") return targetGender === "Perempuan";

      return false;
    },

    // Computed / Filtered Records
    get filteredRecords() {
      const { role } = this.currentUser;
      const gender = this.getLockedGender() || this.genderFilter;
      const list =
        gender === "all" ? this.records : this.records.filter((r) => r.gender === gender);

      return this.sortByStatus(list);
    },

    // Stats Calculation
    get stats() {
      const calc = (status = null) => {
        const list = status ? this.records.filter((r) => r.status === status) : this.records;
        return {
          total: list.length,
          l: list.filter((r) => r.gender === "Laki-laki").length,
          p: list.filter((r) => r.gender === "Perempuan").length,
        };
      };

      const tot = calc();
      const hdr = calc("Hadir");
      const thdr = calc("Tidak Hadir");
      const izn = calc("Izin");
      const skt = calc("Sakit");
      const percentage = (count) => (tot.total ? Math.round((count / tot.total) * 100) : 0);

      return {
        total: tot.total,
        totalL: tot.l,
        totalP: tot.p,
        hadir: hdr.total,
        hadirPercent: percentage(hdr.total),
        hadirL: hdr.l,
        hadirP: hdr.p,
        tidakHadir: thdr.total,
        tidakHadirPercent: percentage(thdr.total),
        tidakHadirL: thdr.l,
        tidakHadirP: thdr.p,
        izin: izn.total,
        izinPercent: percentage(izn.total),
        izinL: izn.l,
        izinP: izn.p,
        sakit: skt.total,
        sakitPercent: percentage(skt.total),
        sakitL: skt.l,
        sakitP: skt.p,
      };
    },

    getStatusBadgeClass(status) {
      if (status === "Hadir") return "bg-green-100 text-green-800";
      if (status === "Tidak Hadir") return "bg-red-100 text-red-800";
      if (status === "Izin") return "bg-yellow-100 text-yellow-800";
      if (status === "Sakit") return "bg-purple-100 text-purple-800";
      return "bg-gray-100 text-gray-800";
    },

    capitalize(str) {
      return str.toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
    },

    get currentDateDisplay() {
      if (!this.selectedDate) return "-";

      return new Date(`${this.selectedDate}T00:00:00`).toLocaleDateString("id-ID", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    },

    sortByStatus(list) {
      if (this.statusSort === "none") return list;

      const direction = this.statusSort === "asc" ? 1 : -1;

      return [...list].sort(
        (a, b) => direction * (STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)),
      );
    },

    toggleStatusSort() {
      const cycle = { none: "asc", asc: "desc", desc: "none" };
      this.statusSort = cycle[this.statusSort];
    },

    isValidRole(role) {
      return VALID_ROLES.includes(role);
    },

    isGenerusAdmin() {
      return this.currentUser.role === "admin_generus";
    },

    isAttendanceOnlyRole(role = this.currentUser.role) {
      return ATTENDANCE_ONLY_ROLES.includes(role);
    },

    getLockedGender(role = this.currentUser.role) {
      return ROLE_GENDER[role] || null;
    },

    canSetUsia() {
      return Boolean(this.currentUser.role) && !this.isAttendanceOnlyRole();
    },

    canViewGender(gender) {
      const locked = this.getLockedGender();
      return !locked || locked === gender;
    },

    canSetStatus(targetGender, targetGroup = this.currentUser.kelompok, kategoriUsia = null) {
      if (!this.isAttendanceOnlyRole()) {
        return this.canUserModify(targetGender, targetGroup, kategoriUsia);
      }

      const { kelompok } = this.currentUser;

      return (
        Boolean(kelompok) && targetGroup === kelompok && this.getLockedGender() === targetGender
      );
    },

    isDesaBoundRole(role = this.currentUser.role) {
      return DESA_BOUND_ROLES.includes(role);
    },

    createEmptyUser() {
      return { email: "", role: "", displayName: "", kelompok: "", desa: "" };
    },

    async loadDesaKelompok() {
      const { data, error } = await this.supabaseClient
        .from("kelompok_desa")
        .select("kelompok")
        .eq("desa", this.currentUser.desa)
        .order("kelompok");

      if (error) throw error;

      this.kelompokOptions = data.map((row) => row.kelompok);
      this.kelompok = this.kelompokOptions[0] ?? "";
    },
  };

  Object.assign(
    app,
    window.absensiLoginMethods,
    window.absensiCrudMethods,
    window.absensiExportMethods,
  );
  return app;
}
