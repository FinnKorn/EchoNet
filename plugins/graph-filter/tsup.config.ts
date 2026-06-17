import { defineConfig } from "tsup"

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "components/index": "src/components/index.ts",
  },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  splitting: false,
  bundle: true,
  external: [
    "preact",
    "preact/jsx-runtime",
    "preact/compat",
    "@quartz-community/graph",
    "@quartz-community/graph/*",
    "@quartz-community/types",
  ],
})