import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: {
    resolve: true,
    // Skip type checking during build to avoid Lucide React type issues
    compilerOptions: {
      skipLibCheck: true,
    }
  },
  splitting: true,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom'],
  treeshake: true,
  minify: true,
  target: 'es2020'
})
