window.absensiExportMethods = {
  getPdfExportJobs(genderOption) {
    const maleJob = { categoryName: "Laki-laki", gender: "Laki-laki" };
    const femaleJob = { categoryName: "Perempuan", gender: "Perempuan" };
    const jobsByOption = {
      all: [{ categoryName: "Gabungan", gender: null }],
      laki: [maleJob],
      perempuan: [femaleJob],
      both: [maleJob, femaleJob],
    };

    return jobsByOption[genderOption] ?? [];
  },
  askPdfExportOptions(lockedGroupName) {
    const selectClass =
      "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white";
    const groupOptionsHtml = this.kelompokOptions
      .map(
        (group) =>
          `<option value="${group}" ${group === this.kelompok ? "selected" : ""}>${group}</option>`,
      )
      .join("");
    const groupFieldHtml = this.isDesaBoundRole()
      ? `<div class="text-left mb-3">
         <label for="swal-export-group" class="block font-semibold text-gray-700 mb-1">Kelompok</label>
         <select id="swal-export-group" class="${selectClass}">
           <option value="">Semua Kelompok Desa ${this.currentUser.desa}</option>
           ${groupOptionsHtml}
         </select>
       </div>`
      : "";

    return Swal.fire({
      title: lockedGroupName ? `Export PDF ${lockedGroupName}` : "Export PDF Laporan",
      icon: "question",
      html: `
      ${groupFieldHtml}
      <div class="text-left">
        <label for="swal-export-gender" class="block font-semibold text-gray-700 mb-1">Data</label>
        <select id="swal-export-gender" class="${selectClass}">
          <option value="all">Semua Data (Gabungan L & P)</option>
          <option value="laki">Khusus Laki-laki</option>
          <option value="perempuan">Khusus Perempuan</option>
          <option value="both">2 File Terpisah (1 File L & 1 File P)</option>
        </select>
      </div>`,
      showCancelButton: true,
      confirmButtonText: "Download PDF",
      confirmButtonColor: "#2563eb",
      preConfirm: () => ({
        genderOption: document.getElementById("swal-export-gender").value,
        selectedGroup: document.getElementById("swal-export-group")?.value ?? lockedGroupName,
      }),
    });
  },
  async handleExportPdf() {
    if (!this.canExportPdf()) {
      Swal.fire("Akses Ditolak", "Fitur Export PDF hanya dapat dilakukan oleh admin.", "error");
      return;
    }

    const lockedGroupName =
      this.currentUser.role === "admin_kelompok" ? this.currentUser.kelompok : "";
    const scopedRecords = lockedGroupName
      ? this.records.filter((record) => record.kelompok === lockedGroupName)
      : this.records;

    if (scopedRecords.length === 0) {
      Swal.fire("Data Kosong", "Tidak ada data absensi untuk diexport!", "info");
      return;
    }

    const result = await this.askPdfExportOptions(lockedGroupName);
    if (!result.isConfirmed) return;

    const { genderOption, selectedGroup } = result.value;
    const exportRecords = selectedGroup
      ? scopedRecords.filter((record) => record.kelompok === selectedGroup)
      : scopedRecords;
    const reportGroupLabel =
      selectedGroup || (this.isDesaBoundRole() ? `Desa ${this.currentUser.desa}` : "");
    // Materi yang dimuat hanya milik kelompok di header; jangan dipasang di laporan kelompok lain.
    const reportMateri =
      this.isDesaBoundRole() && selectedGroup !== this.kelompok ? null : this.materi;

    const exportJobs = this.getPdfExportJobs(genderOption);
    const shouldShowProgress = exportJobs.length > 1;
    let exportedCount = 0;

    if (shouldShowProgress) {
      Swal.fire({
        title: "Memproses Export PDF...",
        text: `Mohon tunggu sebentar, sedang menyiapkan ${exportJobs.length} file PDF.`,
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });
    }

    try {
      for (const { categoryName, gender } of exportJobs) {
        const dataset = gender
          ? exportRecords.filter((record) => record.gender === gender)
          : exportRecords;
        exportedCount += Number(
          await this.renderPdf(dataset, categoryName, reportGroupLabel, reportMateri),
        );
      }
    } finally {
      if (shouldShowProgress) Swal.close();
    }

    if (exportedCount > 0) {
      Swal.fire({
        icon: "success",
        title: "Export berhasil",
        text: `${exportedCount} file PDF berhasil dibuat${reportGroupLabel ? ` untuk ${reportGroupLabel}` : ""}.`,
        confirmButtonColor: "#2563eb",
      });
    }
  },
  async renderPdf(dataset, categoryName, groupName = "", materi = this.materi) {
    if (dataset.length === 0) {
      Swal.fire("Data Kosong", `Tidak ada data untuk kategori ${categoryName}`, "info");
      return false;
    }

    const hadir = dataset.filter((r) => r.status === "Hadir").length;
    const tidakHadir = dataset.filter((r) => r.status === "Tidak Hadir").length;
    const izin = dataset.filter((r) => r.status === "Izin").length;
    const sakit = dataset.filter((r) => r.status === "Sakit").length;
    const percentage = (count) => Math.round((count / dataset.length) * 100);

    let materiHtml = "";
    if (materi && (materi.quran || materi.hadits || materi.nasehat)) {
      materiHtml = `
          <div
            style="margin-bottom: 12px; font-size: 12px; border: 1px solid #2563eb; background-color: #eff6ff; padding: 10px; border-radius: 6px;"
          >
            <div
              style="font-weight: bold; font-size: 13px; color: #1e40af; border-bottom: 1px solid #bfdbfe; padding-bottom: 4px; margin-bottom: 6px;"
            >
              MATERI PEMBELAJARAN
            </div>
            ${
              materi.quran
                ? `<div><b>Al-Qur'an:</b> <span class="capitalize">${this.materi.quran}</span></div>`
                : ""
            }
            ${
              materi.hadits
                ? `<div><b>Al-Hadits:</b> <span class="capitalize">${this.materi.hadits}</span></div>`
                : ""
            }
            ${
              materi.nasehat
                ? `<div><b>Nasehat Agama:</b> <span class="capitalize">${this.materi.nasehat}</span></div>`
                : ""
            }
          </div>
        `;
    }

    let tableRows = dataset
      .map(
        (r, i) => `
            <tr style="page-break-inside: avoid;">
              <td style="border: 1px solid #000; padding: 6px; text-align: center;">${i + 1}</td>
              <td style="border: 1px solid #000; padding: 6px;">${r.name}</td>
              <td style="border: 1px solid #000; padding: 6px;">${r.kelompok}</td>
              <td style="border: 1px solid #000; padding: 6px; text-align: center;">${r.gender}</td>
              <td style="border: 1px solid #000; padding: 6px; text-align: center;">${r.status}</td>
              <td style="border: 1px solid #000; padding: 6px; text-align: center;">${r.time}</td>
            </tr>
        `,
      )
      .join("");

    const pdfHtml = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #000;">
          <h2 style="text-align: center; margin-bottom: 4px; text-transform: uppercase;">
            ABSENSI ${this.jenisSambung.toUpperCase()} (${categoryName.toUpperCase()})
          </h2>
          ${
            groupName
              ? `<p style="text-align: center; margin-top: 0; font-size: 12px; color: #555;">${groupName}</p>`
              : ""
          }
          <p style="text-align: center; margin-top: 0; font-size: 12px; color: #555;">
            ${this.currentDateDisplay}
          </p>
          ${materiHtml}
          <div
            style="margin-bottom: 12px; font-size: 12px; border: 1px solid #ccc; padding: 6px; background-color: #f9f9f9; display: flex; justify-content: space-around;"
          >
            <span><b>Total:</b> ${dataset.length}</span>
            <span><b>Hadir:</b> ${hadir} (${percentage(hadir)}%)</span>
            <span><b>Tidak Hadir:</b> ${tidakHadir} (${percentage(tidakHadir)}%)</span>
            <span><b>Izin:</b> ${izin} (${percentage(izin)}%)</span>
            <span><b>Sakit:</b> ${sakit} (${percentage(sakit)}%)</span>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
              <tr style="background-color: #f2f2f2; page-break-inside: avoid;">
                <th style="border: 1px solid #000; padding: 6px; width: 6%;">No</th>
                <th style="border: 1px solid #000; padding: 6px; text-align: left;">Nama</th>
                <th style="border: 1px solid #000; padding: 6px; text-align: left;">Kelompok</th>
                <th style="border: 1px solid #000; padding: 6px; width: 18%;">Gender</th>
                <th style="border: 1px solid #000; padding: 6px; width: 18%;">Status</th>
                <th style="border: 1px solid #000; padding: 6px; width: 14%;">Waktu</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
    `;

    const opt = {
      margin: 0.5,
      filename: `Laporan_Absensi_${groupName ? `${groupName.replace(/[^a-z0-9_-]+/gi, "_")}_` : ""}${categoryName}_${this.selectedDate}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"], avoid: ["tr", "thead"] },
    };

    await html2pdf().set(opt).from(pdfHtml).save();
    return true;
  },
};
