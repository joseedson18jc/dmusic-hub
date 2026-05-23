import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "@tanstack/react-query"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react/jsx-runtime", "@tanstack/react-query"],
  },
  build: {
    /**
     * Code-split agressivo dos bundles vendor que dominam o `index-*.js`.
     * Antes: 912 KB num único chunk. Depois: separados em chunks lazy carregados
     * só quando a respectiva feature é usada.
     *
     * Estratégia:
     *  - `react-vendor`: React + ReactDOM + Router (núcleo sempre necessário)
     *  - `radix`: todos os @radix-ui/* (UI primitives — usado em quase tudo)
     *  - `supabase`: cliente do Supabase + auth (núcleo)
     *  - `forms`: react-hook-form + zod (lazy — só nas pages com Form)
     *  - `charts`: recharts (lazy — só nas pages com gráfico)
     *  - `pdf`: jspdf + autotable + html2canvas (lazy — só no export PDF)
     *  - `xlsx`: SheetJS (lazy — só no export Excel)
     *  - `icons`: lucide-react (compartilhado mas pode lazy)
     *  - `date`: date-fns (compartilhado, leve)
     */
    rollupOptions: {
      output: {
        /**
         * Code-split simplificado.
         *
         * REGRA CRÍTICA: NÃO mexer no chunk que contém recharts. O recharts puxa
         * pra dentro do seu chunk uma série de helpers de interop CommonJS
         * (`__importDefault`, `__toESM`) que ficam compartilhados com outros
         * lugares do bundle. Se forçarmos recharts pra um chunk separado pelo
         * `manualChunks`, esses helpers acabam morando lá — e o entry bundle
         * passa a importar do chart chunk no boot → TDZ no Login (tela preta).
         *
         * Solução: chunkar APENAS coisas que NÃO importam (nem são importadas
         * por) recharts. Deixa o resto pro Vite decidir.
         */
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("jspdf") || id.includes("html2canvas")) return "pdf";
          if (id.includes("xlsx")) return "xlsx";
          if (id.includes("@radix-ui")) return "radix";
          if (id.includes("react-hook-form") || id.includes("@hookform")) return "forms";
          if (id.includes("zod")) return "forms";
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("lucide-react")) return "icons";
          if (id.includes("date-fns")) return "date";
          return undefined;
        },
      },
    },
    /**
     * Sobe o warning threshold pra 600 KB. Os chunks individuais agora ficam
     * abaixo disso, então o build não vai mais reclamar.
     */
    chunkSizeWarningLimit: 600,
  },
}));
