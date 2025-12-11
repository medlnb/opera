import { defineStore } from "pinia"

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: null,
    user: null,
  }),
  actions: {
    setToken(payload) {
      this.token = payload
    },
    setUser(user) {
      this.user = user
    },
    patchUser(newProps) {
      this.user = { ...this.user, ...newProps }
    },
    logout() {
      this.token = null
      this.user = null
    },
  },
  persist: true,
})


