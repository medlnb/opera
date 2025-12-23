import { useAuthStore } from '@/stores/auth'
import { defu } from 'defu'
import type { UseFetchOptions } from 'nuxt/app'

export const useApi: typeof useFetch = <T>(url: MaybeRefOrGetter<string>, options: UseFetchOptions<T> = {}) => {
  const config = useRuntimeConfig()
  const authStore = useAuthStore()
  const accessToken = authStore.token

  const method = String((options as any)?.method ?? 'GET').toUpperCase()

  const makeQueryKey = (query: unknown) => {
    if (!query || typeof query !== 'object')
      return ''

    const entries = Object.entries(query as Record<string, unknown>)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .sort(([a], [b]) => a.localeCompare(b))

    return entries
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&')
  }

  const urlValue = toValue(url)
  const queryKey = makeQueryKey((options as any)?.query ?? (options as any)?.params)

  const defaults: UseFetchOptions<T> = {
    baseURL: config.public.apiBaseUrl ?? 'http://localhost:8888',
    // Only cache/dedupe GET requests by default.
    // For POST/PATCH/etc we want a fresh request each time even if the URL is the same.
    key: method === 'GET' ? (queryKey ? `${urlValue}?${queryKey}` : urlValue) : undefined,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  }

  // for nice deep defaults, please use unjs/defu
  const params = defu(options, defaults)

  return useFetch(url, params)
}
