import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

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
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.ico", "robots.txt"],
        manifest: {
          name: "EzeBuddies",
          short_name: "EzeBuddies",
          description: "IoT automation dashboard for monitoring and control.",
          theme_color: "#0b6fa4",
          background_color: "#ecf8ff",
          display: "standalone",
          start_url: "/",
          scope: "/",
          icons: [
            {
              src: "/icons/pwa-192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "/icons/pwa-512.png",
              sizes: "512x512",
              type: "image/png",
            },
            {
              src: "/icons/pwa-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          cleanupOutdatedCaches: true,
          navigateFallbackDenylist: [/^\/api\//, /^\/users\//],
          runtimeCaching: [
            {
              urlPattern: ({ url }) =>
                url.origin === self.location.origin && url.pathname.startsWith("/api/"),
              handler: "NetworkOnly",
            },
            {
              urlPattern: ({ url }) => url.origin === "https://fastapi-login-0319012745.azurewebsites.net",
              handler: "NetworkOnly",
            },
            {
              urlPattern: ({ url }) => url.origin === "https://customer-data.azurewebsites.net",
              handler: "NetworkOnly",
            },
            {
              urlPattern: ({ request }) => request.destination === "image",
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "images-cache",
                expiration: {
                  maxEntries: 80,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
              },
            },
            {
              urlPattern: ({ request }) =>
                request.destination === "style" || request.destination === "script",
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "static-assets-cache",
                expiration: {
                  maxEntries: 120,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
              },
            },
          ],
        },
      }),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
