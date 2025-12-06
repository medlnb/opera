// stores/auth.js
import { defineStore } from "pinia"

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: null,
    user: null,
  }),
  actions: {
    async setToken({ token }) {
      this.token= token
    },
    patchUser(newProps) {
      this.user = { ...this.user, ...newProps }
    },
    async logout() {
      this.token = null
      this.user = null
      return true
    },
  },
  persist: true,
})
