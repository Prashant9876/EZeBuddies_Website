import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const customerDataFunctionUrl = env.CUSTOMER_DATA_FUNCTION_URL || "";

  return {
    server: {
      host: "::",
      port: 8080,
      proxy: customerDataFunctionUrl
        ? {
            "/api/customer-data": {
              target: customerDataFunctionUrl,
              changeOrigin: true,
              rewrite: () => "",
            },
          }
        : undefined,
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
