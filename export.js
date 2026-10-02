window.absensiExportMethods = {
    async handleExportPdf() {
      if (!this.canExportPdf()) {
        Swal.fire(
          "Akses Ditolak",
          "Fitur Export PDF hanya dapat dilakukan oleh Admin Utama atau Admin Kelompok.",
          "error",
        );
        return;
      }

      const isGroupAdmin = this.currentUser.role === "admin_kelompok";
      const groupName = isGroupAdmin ? this.currentUser.kelompok : "";
      const exportRecords = isGroupAdmin
        ? this.records.filter((record) => record.kelompok === groupName)
        : this.records;

      if (exportRecords.length === 0) {
        Swal.fire("Data Kosong", "Tidak ada data absensi untuk diexport!", "info");
        return;
      }

      const result = await Swal.fire({
        title: isGroupAdmin ? `Export PDF ${groupName}` : "Export PDF Laporan",
        text: isGroupAdmin
          ? `Laporan hanya akan berisi data ${groupName}.`
          : "Pilih data yang ingin diexport:",
        icon: "question",
        input: "select",
        inputOptions: {
          all: "Semua Data (Gabungan L & P)",
          laki: "Khusus Laki-laki",
          perempuan: "Khusus Perempuan",
          both: "2 File Terpisah (1 File L & 1 File P)",
        },
        inputValue: "all",
        showCancelButton: true,
        confirmButtonText: "Download PDF",
        confirmButtonColor: "#2563eb",
        customClass: {
          input:
            "px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white",
        },
      });
      if (!result.isConfirmed) return;

      const opt = result.value;
      let exportedCount = 0;
      if (opt === "all") {
        exportedCount += Number(await this.renderPdf(exportRecords, "Gabungan", groupName));
      } else if (opt === "laki") {
        exportedCount += Number(
          await this.renderPdf(
            exportRecords.filter((r) => r.gender === "Laki-laki"),
            "Laki-laki",
            groupName,
          ),
        );
      } else if (opt === "perempuan") {
        exportedCount += Number(
          await this.renderPdf(
            exportRecords.filter((r) => r.gender === "Perempuan"),
            "Perempuan",
            groupName,
          ),
        );
      } else if (opt === "both") {
        Swal.fire({
          title: "Memproses Export PDF...",
          text: "Mohon tunggu sebentar, sedang menyiapkan 2 file PDF.",
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          },
        });

        try {
          exportedCount += Number(
            await this.renderPdf(
              exportRecords.filter((r) => r.gender === "Laki-laki"),
              "Laki-laki",
              groupName,
            ),
          );
          exportedCount += Number(
            await this.renderPdf(
              exportRecords.filter((r) => r.gender === "Perempuan"),
              "Perempuan",
              groupName,
            ),
          );
        } finally {
          Swal.close();
        }
      }

      if (exportedCount > 0) {
        Swal.fire({
          icon: "success",
          title: "Export berhasil",
          text: `${exportedCount} file PDF berhasil dibuat${groupName ? ` untuk ${groupName}` : ""}.`,
          confirmButtonColor: "#2563eb",
        });
      }
    },
    async renderPdf(dataset, categoryName, groupName = "") {
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
      if (this.materi.quran || this.materi.hadits || this.materi.nasehat) {
        materiHtml = `
          <div
            style="margin-bottom: 12px; font-size: 12px; border: 1px solid #2563eb; background-color: #eff6ff; padding: 10px; border-radius: 6px;"
          >
            <div
              style="font-weight: bold; font-size: 13px; color: #1e40af; border-bottom: 1px solid #bfdbfe; padding-bottom: 4px; margin-bottom: 6px;"
            >
              MATERI PEMBELAJARAN
            </div>
            ${this.materi.quran
              ? `<div><b>Al-Qur'an:</b> <span class="capitalize">${this.materi.quran}</span></div>`
              : ""
            }
            ${this.materi.hadits
              ? `<div><b>Al-Hadits:</b> <span class="capitalize">${this.materi.hadits}</span></div>`
              : ""
            }
            ${this.materi.nasehat
              ? `<div><b>Nasehat Agama:</b> <span class="capitalize">${this.materi.nasehat}</span></div>`
              : ""
            }
          </div>
        `;
      }

      let tableRows = dataset
        .map(
          (r, i) => `
            <tr>
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
              <tr style="background-color: #f2f2f2;">
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
        filename: `Laporan_Absensi_${groupName ? `${groupName.replace(/[^a-z0-9_-]+/gi, "_")}_` : ""}${categoryName}_${new Date().toISOString().split("T")[0]}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
      };

      await html2pdf().set(opt).from(pdfHtml).save();
      return true;
    },
};
