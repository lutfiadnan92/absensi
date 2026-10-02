window.absensiCrudMethods = {
  async saveSingleAttendance() {
    const nameVal = this.capitalize(this.formSingle.name.trim());

    if (!nameVal) return;

    // Validasi Hak Akses Gender
    if (!this.canUserModify(this.formSingle.gender)) {
      Swal.fire(
        "Akses Ditolak",
        `Anda tidak memiliki hak untuk menambah data ${this.formSingle.gender}!`,
        "error",
      );
      return;
    }

    // Check Duplikasi
    const group = this.getCurrentGroup();

    if (!group) {
      Swal.fire("Kelompok wajib diisi", "Isi kelompok sebelum menyimpan data.", "warning");
      return;
    }

    const isExist = this.records.some(
      (r) => r.name.toLowerCase() === nameVal.toLowerCase() && r.kelompok === group,
    );

    if (isExist) {
      Swal.fire("Nama Duplikat", `Nama "${nameVal}" sudah terdaftar!`, "warning");
      return;
    }

    const timeStr =
      this.formSingle.status === "Hadir"
        ? new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
        : "-";

    const newRecord = {
      name: nameVal,
      gender: this.formSingle.gender,
      status: this.formSingle.status,
      time: timeStr,
      source: "single",
      kelompok: group,
    };

    if (this.isSupabaseConnected) {
      const { data, error } = await this.supabaseClient
        .from("attendance")
        .insert([newRecord])
        .select();

      if (error) return this.showSupabaseError(error);

      if (!data?.length)
        return this.showSupabaseError(new Error("Supabase tidak mengembalikan data absensi."));

      this.records.push(data[0]);
    } else {
      newRecord.id = crypto.randomUUID();
      this.records.push(newRecord);
      this.saveLocalFallback();
    }

    this.formSingle.name = "";

    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "Data disimpan!",
      showConfirmButton: false,
      timer: 1500,
    });
  },
  generateBulkChecklist() {
    const text = this.bulkText.trim();

    if (!text) {
      Swal.fire({
        icon: "warning",
        title: "Teks Kosong",
        text: "Silakan masukkan daftar nama terlebih dahulu!",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    const defaultGender =
      this.currentUser.role === "admin_perempuan" ? "Perempuan" : this.formSingle.gender;
    const names = text
      .split("\n")
      .map((n) => n.trim())
      .filter((n) => n.length > 0);
    const duplicates = this.findBulkDuplicateNames(names, this.getCurrentGroup());

    if (duplicates.length > 0) {
      this.bulkItems = [];
      Swal.fire(
        "Nama Duplikat",
        `Nama berikut sudah terdaftar atau tercantum lebih dari sekali: ${duplicates.join(", ")}`,
        "warning",
      );
      return;
    }

    this.bulkItems = names.map((n) => ({
      name: this.capitalize(n),
      gender: defaultGender,
      status: "Hadir",
    }));
  },
  findBulkDuplicateNames(names, group) {
    const existingNames = new Set(
      this.records
        .filter((record) => record.kelompok === group)
        .map((record) => record.name.trim().toLowerCase()),
    );
    const seenNames = new Set();
    const duplicates = new Set();

    names.forEach((name) => {
      const normalizedName = name.trim().toLowerCase();
      if (existingNames.has(normalizedName) || seenNames.has(normalizedName)) {
        duplicates.add(this.capitalize(name.trim()));
      }
      seenNames.add(normalizedName);
    });

    return [...duplicates];
  },
  setAllBulkStatus(st) {
    this.bulkItems.forEach((i) => (i.status = st));
  },
  setAllBulkGender(gn) {
    if (["admin", "admin_kelompok"].includes(this.currentUser.role)) {
      this.bulkItems.forEach((i) => (i.gender = gn));
    }
  },
  async saveBulkAttendance() {
    if (this.bulkItems.length === 0) return;

    // Filter out unauthorized genders
    const validItems = this.bulkItems.filter((i) => this.canUserModify(i.gender));

    if (validItems.length === 0) {
      Swal.fire(
        "Akses Ditolak",
        "Item yang Anda pilih tidak sesuai dengan hak akses gender Anda!",
        "error",
      );
      return;
    }

    const group = this.getCurrentGroup();

    if (!group) {
      Swal.fire("Kelompok wajib diisi", "Isi kelompok sebelum menyimpan data.", "warning");
      return;
    }

    const duplicates = this.findBulkDuplicateNames(
      validItems.map((item) => item.name),
      group,
    );

    if (duplicates.length > 0) {
      Swal.fire(
        "Nama Duplikat",
        `Nama berikut sudah terdaftar atau tercantum lebih dari sekali: ${duplicates.join(", ")}`,
        "warning",
      );
      return;
    }

    const toInsert = validItems.map((item) => ({
      name: item.name,
      gender: item.gender,
      status: item.status,
      time: "-",
      source: "bulk",
      kelompok: group,
    }));

    if (this.isSupabaseConnected) {
      const { data, error } = await this.supabaseClient
        .from("attendance")
        .insert(toInsert)
        .select();

      if (error) return this.showSupabaseError(error);

      if (!data)
        return this.showSupabaseError(new Error("Supabase tidak mengembalikan data absensi."));

      this.records.push(...data);
    } else {
      toInsert.forEach((item, idx) => {
        item.id = crypto.randomUUID();
        this.records.push(item);
      });
      this.saveLocalFallback();
    }

    this.bulkText = "";
    this.bulkItems = [];

    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: `${toInsert.length} data massal disimpan!`,
      showConfirmButton: false,
      timer: 2000,
    });
  },
  async saveMateri() {
    if (!this.canManageMateri()) {
      Swal.fire("Akses Ditolak", "Anda tidak memiliki izin untuk menyimpan materi.", "error");
      return;
    }

    const group = this.getCurrentGroup();

    if (!group) {
      Swal.fire("Kelompok wajib diisi", "Isi kelompok sebelum menyimpan materi.", "warning");
      return;
    }

    if (this.isSupabaseConnected) {
      const { error } = await this.supabaseClient.from("materi").upsert(
        {
          id: 1,
          kelompok: group,
          quran: this.materi.quran.trim(),
          hadits: this.materi.hadits.trim(),
          nasehat: this.materi.nasehat.trim(),
          updated_at: new Date(),
        },
        { onConflict: "id,kelompok" },
      );

      if (error) return this.showSupabaseError(error);
    } else {
      this.saveLocalFallback();
    }

    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "Data Materi disimpan!",
      showConfirmButton: false,
      timer: 1500,
    });
  },
  async editRecord(record) {
    if (!this.canUserModify(record.gender, record.kelompok)) {
      Swal.fire("Akses Ditolak", `Anda tidak diizinkan mengubah data ${record.gender}!`, "error");
      return;
    }

    const result = await Swal.fire({
      title: "Edit Data Kehadiran",
      html: `
          <div class="text-left mb-3">
            <label class="block font-semibold text-gray-700 mb-1">Nama Lengkap</label>
            <input
              id="swal-edit-name"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value="${record.name}"
            >
          </div>
          <div class="text-left mb-2">
            <label class="block font-semibold text-gray-700 mb-1">Jenis Kelamin</label>
            <select id="swal-edit-gender" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white">
                <option value="Laki-laki" ${record.gender === "Laki-laki" ? "selected" : ""}>Laki-laki</option>
                <option value="Perempuan" ${record.gender === "Perempuan" ? "selected" : ""}>Perempuan</option>
            </select>
          </div>
          <div class="text-left mb-2">
            <label class="block font-semibold text-gray-700 mb-1">Status Kehadiran</label>
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
      showCancelButton: true,
      confirmButtonText: "Simpan",
      cancelButtonText: "Batal",
      confirmButtonColor: "#2563eb",
      preConfirm: () => {
        const newName = this.capitalize(document.getElementById("swal-edit-name").value.trim());
        const newGender = document.getElementById("swal-edit-gender").value;
        const newStatus = document.getElementById("swal-edit-status").value;

        if (!newName) {
          Swal.showValidationMessage("Nama wajib diisi");
          return false;
        }

        if (!this.canUserModify(newGender)) {
          Swal.showValidationMessage(
            `Anda tidak memiliki hak untuk mengubah gender menjadi ${newGender}.`,
          );
          return false;
        }

        const duplicate = this.records.some(
          (item) =>
            String(item.id) !== String(record.id) &&
            item.kelompok === record.kelompok &&
            item.name.trim().toLocaleLowerCase() === newName.toLocaleLowerCase(),
        );

        if (duplicate) {
          Swal.showValidationMessage(`Nama "${newName}" sudah terdaftar dalam kelompok ini.`);
          return false;
        }

        return { newName, newGender, newStatus };
      },
    });

    if (!result.isConfirmed) return;

    const { newName, newGender, newStatus } = result.value;
    const timeStr =
      newStatus === "Hadir" && record.source === "single" && record.time === "-"
        ? new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
        : newStatus === "Hadir" && record.source === "single"
          ? record.time
          : "-";

    if (this.isSupabaseConnected) {
      const { error } = await this.supabaseClient
        .from("attendance")
        .update({
          name: newName,
          gender: newGender,
          status: newStatus,
          time: timeStr,
        })
        .eq("id", record.id);

      if (error) return this.showSupabaseError(error);
    }

    record.name = newName;
    record.gender = newGender;
    record.status = newStatus;
    record.time = timeStr;

    this.saveLocalFallback();
    Swal.fire("Berhasil", "Data diperbarui!", "success");
  },
  async deleteRecord(record) {
    if (!this.canUserModify(record.gender, record.kelompok)) {
      Swal.fire("Akses Ditolak", `Anda tidak diizinkan menghapus data ${record.gender}!`, "error");

      return;
    }

    const result = await Swal.fire({
      title: "Hapus data ini?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Ya, hapus!",
    });

    if (!result.isConfirmed) return;

    if (this.isSupabaseConnected) {
      const { data: deletedRows, error } = await this.supabaseClient
        .from("attendance")
        .delete()
        .eq("id", record.id)
        .select("id");

      if (error) return this.showSupabaseError(error);

      if (!deletedRows?.some((row) => String(row.id) === String(record.id))) {
        await this.fetchDataFromSupabase();

        Swal.fire(
          "Data tidak terhapus",
          "Supabase tidak mengonfirmasi penghapusan data ini.",
          "warning",
        );

        return;
      }
    }

    this.records = this.records.filter((r) => String(r.id) !== String(record.id));
    this.selectedIds = this.selectedIds.filter((id) => String(id) !== String(record.id));
    this.saveLocalFallback();
    Swal.fire("Terhapus!", "Data berhasil dihapus.", "success");
  },
  toggleSelectAll(e) {
    if (e.target.checked) {
      this.selectedIds = this.filteredRecords.map((r) => r.id);
    } else {
      this.selectedIds = [];
    }
  },
  setGenderFilter(filter) {
    if (this.currentUser.role === "admin_laki") filter = "Laki-laki";
    if (this.currentUser.role === "admin_perempuan") filter = "Perempuan";
    this.genderFilter = filter;
    this.selectedIds = [];
  },
  isAllSelected() {
    return (
      this.filteredRecords.length > 0 && this.selectedIds.length === this.filteredRecords.length
    );
  },
  async applyTableBulkStatus() {
    if (!this.bulkTableStatus || this.selectedIds.length === 0) return;

    const timeStr = new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const recordsToUpdate = this.records.filter(
      (record) =>
        this.selectedIds.includes(record.id) && this.canUserModify(record.gender, record.kelompok),
    );

    for (const record of recordsToUpdate) {
      const updatedTime =
        this.bulkTableStatus === "Hadir" && record.source === "single"
          ? record.time === "-"
            ? timeStr
            : record.time
          : "-";

      if (this.isSupabaseConnected) {
        const { error } = await this.supabaseClient
          .from("attendance")
          .update({
            status: this.bulkTableStatus,
            time: updatedTime,
          })
          .eq("id", record.id);

        if (error) return this.showSupabaseError(error);
      }

      record.status = this.bulkTableStatus;
      record.time = updatedTime;
    }

    this.saveLocalFallback();
    this.bulkTableStatus = "";

    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "Status diperbarui!",
      timer: 1500,
    });
  },
  async deleteTableBulk() {
    if (this.selectedIds.length === 0) return;

    const requestedIds = [...this.selectedIds];

    const result = await Swal.fire({
      title: `Hapus ${requestedIds.length} data terpilih?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Ya, hapus!",
    });

    if (!result.isConfirmed) return;

    if (this.isSupabaseConnected) {
      const { data: deletedRows, error } = await this.supabaseClient
        .from("attendance")
        .delete()
        .in("id", requestedIds)
        .select("id");

      if (error) return this.showSupabaseError(error);

      const deletedIds = new Set((deletedRows || []).map((row) => String(row.id)));

      if (deletedIds.size === 0) {
        await this.fetchDataFromSupabase();
        Swal.fire(
          "Data tidak terhapus",
          "Supabase tidak mengonfirmasi penghapusan data terpilih.",
          "warning",
        );
        return;
      }

      this.records = this.records.filter((record) => !deletedIds.has(String(record.id)));
      this.selectedIds = this.selectedIds.filter((id) => !deletedIds.has(String(id)));
      this.saveLocalFallback();

      if (deletedIds.size < requestedIds.length) {
        Swal.fire(
          "Sebagian data terhapus",
          "Beberapa data tidak dapat dihapus oleh role akun ini.",
          "warning",
        );
        return;
      }

      Swal.fire("Terhapus!", "Data terpilih telah dihapus.", "success");

      return;
    }
    this.records = this.records.filter((r) => !this.selectedIds.includes(r.id));
    this.selectedIds = [];
    this.saveLocalFallback();
    Swal.fire("Terhapus!", "Data terpilih telah dihapus.", "success");
  },
  async clearAllData() {
    if (this.currentUser.role !== "admin") return;

    const result = await Swal.fire({
      title: "Kosongkan Seluruh Data?",
      text: "Semua catatan absensi akan dihapus permanen!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Kosongkan",
    });

    if (!result.isConfirmed) return;

    if (this.isSupabaseConnected) {
      const { data: deletedRows, error } = await this.supabaseClient
        .from("attendance")
        .delete()
        .not("id", "is", null)
        .select("id");

      if (error) return this.showSupabaseError(error);

      const deletedIds = new Set((deletedRows || []).map((row) => String(row.id)));
      this.records = this.records.filter((record) => !deletedIds.has(String(record.id)));
      this.selectedIds = this.selectedIds.filter((id) => !deletedIds.has(String(id)));
      this.saveLocalFallback();
      Swal.fire("Bersih!", `${deletedIds.size} data absensi dihapus.`, "success");

      return;
    }
    this.records = [];
    this.selectedIds = [];
    this.saveLocalFallback();
    Swal.fire("Bersih!", "Semua data absensi dikosongkan.", "success");
  },
  async refreshData() {
    if (this.isSupabaseConnected) {
      await this.fetchDataFromSupabase();
    } else {
      this.loadLocalFallback();
    }

    const existingIds = new Set(this.records.map((record) => String(record.id)));
    this.selectedIds = this.selectedIds.filter((id) => existingIds.has(String(id)));
  },
};
