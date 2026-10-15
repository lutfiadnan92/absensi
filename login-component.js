document.addEventListener("alpine:init", () => {
  Alpine.data("loginComponent", () => ({
    template: "",
    loadError: "",
    showPassword: false,
    async init() {
      try {
        const response = await fetch("./login-component.html");

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const template = await response.text();
        this.template = template
      } catch (error) {
        console.error("Login component failed to load:", error);
        this.loadError = "Form login tidak dapat dimuat. Silakan muat ulang halaman.";
      }
    },
  }));
});
