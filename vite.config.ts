import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Proxy para imágenes de CoinGecko
      "/api/coingecko": {
        target: "https://assets.coingecko.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/coingecko/, ""),
        configure: (proxy, _options) => {
          proxy.on("error", (err, _req, _res) => {
            console.log("proxy error", err);
          });
          proxy.on("proxyReq", (proxyReq, req, _res) => {
            console.log("Sending Request to the Target:", req.method, req.url);
          });
          proxy.on("proxyRes", (proxyRes, req, _res) => {
            console.log(
              "Received Response from the Target:",
              proxyRes.statusCode,
              req.url
            );
          });
        },
      },
      "/api/ethglobal": {
        target: "https://ethglobal.b-cdn.net",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ethglobal/, ""),
      },
      // Proxy para imágenes de Chain.link
      "/api/chainlink": {
        target: "https://docs.chain.link",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/chainlink/, ""),
      },
    },
  },
});
