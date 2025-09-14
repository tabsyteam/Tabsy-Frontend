import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: false,
  splitting: true,
  sourcemap: true,
  clean: true,
  external: ['react', '@tanstack/react-query'],
  treeshake: true,
  minify: true,
  target: 'es2020'
})
