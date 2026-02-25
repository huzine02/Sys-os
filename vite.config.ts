
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Charge les variables d'environnement basées sur le mode (development/production)
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    base: './', 
    // Only inject the AI key (needed at runtime for Gemini calls)
    // GIST_ID and GIST_TOKEN are NOT injected — they live only in localStorage
    define: {
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY),
      'process.env.GIST_ID': JSON.stringify(''),
      'process.env.GIST_TOKEN': JSON.stringify('')
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      // ANTI-CACHE CONFIG: Force Unique Hashed Filenames
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name].[hash].js',
          chunkFileNames: 'assets/[name].[hash].js',
          assetFileNames: 'assets/[name].[hash].[ext]'
        }
      }
    }
  };
});
