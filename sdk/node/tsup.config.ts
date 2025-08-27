import { defineConfig, type Options } from 'tsup';

export default defineConfig((options: Options) => ({
  entryPoints: ['src/index.ts'],
  clean: true,
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  external: ['@grpc/grpc-js'],
  ...options,
}));
