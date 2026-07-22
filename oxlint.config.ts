import { defineConfig } from "oxlint";

export default defineConfig({
  options: {
    typeAware: true,
  },
  rules: {
    "oxc/no-barrel-file": "error",
  },
});
