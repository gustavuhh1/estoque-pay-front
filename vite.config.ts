import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_DEV_API_TARGET
  // O Better Auth só aceita a origem do front publicado: em desenvolvimento o proxy se apresenta com ela.
  const headers = env.VITE_DEV_API_ORIGIN ? { Origin: env.VITE_DEV_API_ORIGIN } : undefined
  const base = (env.VITE_API_URL || '/api').replace(/\/$/, '')

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    // Replica no desenvolvimento o proxy do vercel.json: /api/auth/* mantém o prefixo, /api/* o remove.
    server: target
      ? {
          proxy: {
            [`${base}/auth`]: { target, changeOrigin: true, headers },
            [base]: { target, changeOrigin: true, headers, rewrite: (p: string) => p.slice(base.length) || '/' },
          },
        }
      : undefined,
  }
})
