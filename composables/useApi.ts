import { defu } from 'defu'
import type { UseFetchOptions } from 'nuxt/app'
import { useAuthStore } from '@/stores/auth'

export const useApi: typeof useFetch = <T>(url: MaybeRefOrGetter<string>, options: UseFetchOptions<T> = {}) => {
  const config = useRuntimeConfig()
  const authStore = useAuthStore()
  const accessToken = authStore.token

  const defaults: UseFetchOptions<T> = {
    baseURL: config.public.apiBaseUrl ?? 'http://localhost:8888',
    key: toValue(url),
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  }

  // for nice deep defaults, please use unjs/defu
  const params = defu(options, defaults)

  return useFetch(url, params)
}
