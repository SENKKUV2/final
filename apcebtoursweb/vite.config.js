import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import path from 'path'; // Add path for alias resolution

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(), // Enables Tailwind CSS processing
    react(), // Enables React Fast Refresh and JSX support
  ],
  resolve: {
    alias: {
      // Alias for src directory to ensure consistent imports (e.g., src/Profile.jsx)
      src: path.resolve(__dirname, 'src'),
      // Optional: Add more aliases if needed (e.g., for components, lib, etc.)
      components: path.resolve(__dirname, 'src/components'),
      lib: path.resolve(__dirname, 'src/lib'),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom'], // Pre-bundle React dependencies for faster dev server
  },
  build: {
    outDir: 'dist', // Output directory for production build
    sourcemap: true, // Generate source maps for debugging
    rollupOptions: {
      output: {
        // Split large dependencies into separate chunks to reduce bundle size
        manualChunks: {
          react: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
});