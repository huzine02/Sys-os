
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Charge les variables d'environnement basées sur le mode (development/production)
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    base: './', 
    // On définit process.env pour que le code puisse lire les clés VITE_
    define: {
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY),
      'process.env.GIST_ID': JSON.stringify(env.VITE_GIST_ID),
      'process.env.GIST_TOKEN': JSON.stringify(env.VITE_GIST_TOKEN)
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
