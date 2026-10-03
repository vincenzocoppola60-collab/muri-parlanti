import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "it.muriparlanti.app",
  appName: "Muri Parlanti",
  webDir: "www",
  server: {
    url: "https://muri-parlanti.vercel.app",
    cleartext: false,
  },
};

export default config;
