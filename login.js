window.absensiLoginMethods = {
    async handleAuthSession(session) {
      if (!session) {
        this.authUserId = "";
        this.authSessionTask = null;
        this.isLoggedIn = false;
        this.currentUser = { email: "", role: "", displayName: "", kelompok: "" };
        this.records = [];
        this.materi = { quran: "", hadits: "", nasehat: "" };
        this.selectedIds = [];
        this.kelompok = "Umum";
        return false;
      }

      const user = session.user;
      if (this.authUserId === user.id) {
        return this.authSessionTask ? this.authSessionTask : this.isLoggedIn;
      }

      this.authUserId = user.id;
      this.records = [];
      this.materi = { quran: "", hadits: "", nasehat: "" };
      this.selectedIds = [];
      this.authSessionTask = (async () => {
        const { data: roleData, error: roleError } = await this.supabaseClient
          .from("user_roles")
          .select("role, kelompok")
          .eq("user_id", user.id)
          .maybeSingle();

        if (roleError) throw roleError;
        if (this.authUserId !== user.id) return false;
        const role = roleData?.role;

        if (!["admin", "admin_laki", "admin_perempuan", "admin_kelompok"].includes(role)) {
          throw new Error("Role akun belum diatur. Hubungi admin untuk memberikan akses.");
        }

        if (this.isGroupBoundRole(role) && !roleData.kelompok?.trim()) {
          throw new Error("Kelompok akun belum diatur. Hubungi admin untuk menetapkan kelompok.");
        }

        if (this.isGroupBoundRole(role)) this.kelompok = roleData.kelompok;

        this.currentUser = {
          email: user.email || "",
          role,
          displayName: user.user_metadata?.display_name || user.email || "Pengguna",
          kelompok: roleData.kelompok || "",
        };
        if (role === "admin_kelompok") this.kelompok = roleData.kelompok;
        this.isLoggedIn = true;
        this.adjustGenderFormByRole();
        await this.fetchDataFromSupabase();
        return true;
      })();

      try {
        return await this.authSessionTask;
      } catch (error) {
        console.error("User role error:", error);
        if (this.authUserId !== user.id) return false;
        this.authUserId = "";
        this.authSessionTask = null;
        this.isLoggedIn = false;
        this.currentUser = { email: "", role: "", displayName: "", kelompok: "" };
        const { error: signOutError } = await this.supabaseClient.auth.signOut();
        if (signOutError) console.error("Sign-out error:", signOutError);
        Swal.fire({
          icon: "error",
          title: "Akses gagal",
          text: error.message || "Tidak dapat memuat role akun.",
          confirmButtonColor: "#2563eb",
        });
        return false;
      }
    },
    async handleLogin() {
      if (!this.supabaseClient) {
        Swal.fire({
          icon: "error",
          title: "Database belum terhubung",
          text: "Masukkan URL dan anon key Supabase pada Pengaturan Data API.",
          confirmButtonColor: "#2563eb",
        });
        return;
      }

      try {
        const { data, error } = await this.supabaseClient.auth.signInWithPassword({
          email: this.loginInput.email.trim(),
          password: this.loginInput.password,
        });

        if (error) {
          Swal.fire({
            icon: "error",
            title: "Gagal Login",
            text: error.message,
            confirmButtonColor: "#2563eb",
          });
          return;
        }

        if (!data.session) {
          Swal.fire({
            icon: "error",
            title: "Login belum selesai",
            text: "Akun belum memiliki sesi aktif. Periksa status konfirmasi email di Database.",
            confirmButtonColor: "#2563eb",
          });
          return;
        }

        const hasAccess = await this.handleAuthSession(data.session);
        if (hasAccess) {
          this.loginInput.password = "";
          Swal.fire({
            toast: true,
            position: "top-end",
            icon: "success",
            title: `Selamat datang, ${this.currentUser.displayName}!`,
            showConfirmButton: false,
            timer: 1500,
          });
        }
      } catch (error) {
        console.error("Login Error:", error);
        Swal.fire({
          icon: "error",
          title: "Gagal Login",
          text: error.message || "Tidak dapat menghubungi Auth.",
          confirmButtonColor: "#2563eb",
        });
      }
    },
    async handleLogout() {
      if (!this.supabaseClient) return;

      try {
        const { error } = await this.supabaseClient.auth.signOut();
        if (error) {
          console.error("Logout Error:", error);
          Swal.fire("Gagal Keluar", error.message, "error");
        }
      } catch (error) {
        console.error("Logout Error:", error);
        Swal.fire("Gagal Keluar", error.message || "Tidak dapat menghubungi Database.", "error");
      }
    },
    adjustGenderFormByRole() {
      if (this.currentUser.role === "admin_laki") {
        this.formSingle.gender = "Laki-laki";
        this.genderFilter = "Laki-laki";
      } else if (this.currentUser.role === "admin_perempuan") {
        this.formSingle.gender = "Perempuan";
        this.genderFilter = "Perempuan";
      } else {
        this.genderFilter = "all";
      }
    },
};
