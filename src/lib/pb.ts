import PocketBase from 'pocketbase'

const pbUrl = import.meta.env.VITE_PB_URL as string

if (!pbUrl) {
  console.warn(
    'Missing VITE_PB_URL. Copy .env.example to .env and set your PocketBase URL.'
  )
}

export const pb = new PocketBase(pbUrl ?? 'http://127.0.0.1:8090')
