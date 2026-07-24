import { defineConfig } from "tsdown";

export default defineConfig({
  format: ["esm"],
  sourcemap: false,
  minify: true,
  dts: {
    tsgo: true,
  },
  platform: "node",
  exports: true,
  publint: {
    enabled: true,
    level: "error",
    strict: true,
  },
  attw: {
    enabled: true,
    level: "error",
    profile: "esm-only",
  },
});
