import { defineStore } from 'pinia'

// Import auth store for use inside actions
import { useAuthStore } from '@/stores/auth'

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [],
    loading: false,
  }),

  getters: {
    itemCount: state => state.items.reduce((sum, item) => sum + item.quantity, 0),
    isEmpty: state => state.items.length === 0,
    apiBaseUrl: () => useRuntimeConfig().public.apiBaseUrl,
  },

  actions: {
    async fetchCart() {
      const authStore = useAuthStore()
      if (!authStore.token)
        return

      try {
        this.loading = true

        const res = await fetch(`${this.apiBaseUrl}/api/cart`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authStore.token}`,
          },
        })

        if (!res.ok)
          throw new Error('Failed to fetch cart')
        const data = await res.json()
        this.items = data.data?.items || []
      }
      catch (err) {
        console.error(err)
      }
      finally {
        this.loading = false
      }
    },

    async addItem({ productId, variance, qty }) {
      const authStore = useAuthStore()
      if (!authStore.token) {
        navigateTo('/login')

        return false
      }

      try {
        this.loading = true

        const res = await fetch(`${this.apiBaseUrl}/api/cart/items`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authStore.token}`,
          },
          body: JSON.stringify({ productId, variance, qty }),
        })

        if (!res.ok)
          throw new Error('Failed to add item to cart')
        const data = await res.json()

        this.items = data.data?.items || []
        // console.log(this.items.length)

        return true
      }
      catch (err) {
        console.error(err)

        return false
      }
      finally {
        this.loading = false
      }
    },

    async updateItem({ productId, variance, qty }) {
      const authStore = useAuthStore()
      if (!authStore.token)
        return false

      try {
        this.loading = true

        const res = await fetch(
          `${this.apiBaseUrl}/api/cart/items/${encodeURIComponent(productId)}/${encodeURIComponent(variance)}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authStore.token}`,
            },
            body: JSON.stringify({ qty }),
          },
        )

        if (!res.ok)
          throw new Error('Failed to update cart item')
        const data = await res.json()

        this.items = data.data?.items || []

        return true
      }
      catch (err) {
        console.error(err)

        return false
      }
      finally {
        this.loading = false
      }
    },

    async removeItem({ productId, variance }) {
      const authStore = useAuthStore()
      if (!authStore.token)
        return false

      try {
        this.loading = true

        const res = await fetch(
          `${this.apiBaseUrl}/api/cart/items/${encodeURIComponent(productId)}/${encodeURIComponent(variance)}`,
          {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authStore.token}`,
            },
          },
        )

        if (!res.ok)
          throw new Error('Failed to remove cart item')
        const data = await res.json()

        this.items = data.data?.items || []

        return true
      }
      catch (err) {
        console.error(err)

        return false
      }
      finally {
        this.loading = false
      }
    },

    async clearCart() {
      const authStore = useAuthStore()
      if (!authStore.token)
        return false

      try {
        this.loading = true

        const res = await fetch(`${this.apiBaseUrl}/api/cart`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authStore.token}`,
          },
        })

        if (!res.ok)
          throw new Error('Failed to clear cart')
        this.items = []

        return true
      }
      catch (err) {
        console.error(err)

        return false
      }
      finally {
        this.loading = false
      }
    },

    async checkout({ contact = {}, sellpoint } = {}) {
      const authStore = useAuthStore()
      if (!authStore.token) {
        navigateTo('/login')

        return null
      }

      try {
        this.loading = true

        const res = await fetch(`${this.apiBaseUrl}/api/cart/checkout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authStore.token}`,
          },
          body: JSON.stringify({ contact, sellpoint }),
        })

        if (!res.ok)
          throw new Error('Checkout failed')
        const data = await res.json()

        this.items = [] // Cart is now empty after checkout

        return data.data
      }
      catch (err) {
        console.error(err)

        return null
      }
      finally {
        this.loading = false
      }
    },
  },
})
