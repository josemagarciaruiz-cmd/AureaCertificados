import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: resolve('electron/main.ts'),
        output: {
          entryFileNames: 'index.js',
        }
      }
    },
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@main': resolve('electron'),
      }
    }
  },
  preload: {
    build: {
      lib: {
        entry: resolve('electron/preload.ts'),
      }
    },
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    root: resolve('src'),
    build: {
      rollupOptions: {
        input: resolve('src/index.html'),
      }
    },
    resolve: {
      alias: {
        '@': resolve('src'),
        '@components': resolve('src/components'),
        '@pages': resolve('src/pages'),
        '@store': resolve('src/store'),
        '@hooks': resolve('src/hooks'),
        '@lib': resolve('src/lib'),
        '@data': resolve('src/data'),
      }
    },
    plugins: [react()],
    css: {
      postcss: './postcss.config.js'
    }
  }
})
