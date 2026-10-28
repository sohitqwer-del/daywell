import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "org.forma.wellness",
  appName: "Daywell",
  webDir: "dist",
  loggingBehavior: "none",
  android: { backgroundColor: "#111412" },
  plugins: {
    SystemBars: { style: "DARK" },
    CapacitorHttp: { enabled: true },
    CapacitorCookies: { enabled: false },
  },
};
export default config;
