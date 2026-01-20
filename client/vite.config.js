import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss(), react()],
  define: {
    TAILWIND_DISABLE_OXIDE: true, // ✅ disables oxide
  },


});
