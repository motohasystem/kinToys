import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  build: {
    outDir: path.resolve(__dirname, '../dist'),
    rollupOptions: {
      input: {
        embedding_script: path.resolve(__dirname, 'src/embedding_script.ts'),
        content_script: path.resolve(__dirname, 'src/content_script.ts'),
        popup: path.resolve(__dirname, 'src/popup.html'),
        // 必要に応じて他のエントリーポイントも追加
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    }
  }
})
