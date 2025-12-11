<script setup>
import logo from "@/assets/images/logo-v2.svg"
import { useAuthStore } from '@/stores/auth'
import { useValidators } from '@/utils/validators'
import { useGenerateImageVariant } from '@core/composable/useGenerateImageVariant'
import authV2MaskDark from '@images/pages/misc-mask-dark.png'
import authV2MaskLight from '@images/pages/misc-mask-light.png'
import { themeConfig } from '@themeConfig'

const config = useRuntimeConfig()

definePageMeta({
  layout: 'blank',
})

const loading = ref(false)
const authStore = useAuthStore()
const form = ref({
  phone: '',
  password: '',
  remember: false,
})

const isPasswordVisible = ref(false)
const authThemeMask = useGenerateImageVariant(authV2MaskLight, authV2MaskDark)

const snackbar = ref({ show: false, message: '', color: 'success' })
const showSnackbar = (message, color = 'success') => {
  snackbar.value = { show: true, message, color }
}

const submit = async () => {
  try {
    loading.value = true
    if (!form.value.phone || !form.value.password) 
      return showSnackbar('Phone and password are required', 'error')
      
    const res = await fetch(`${config.public.apiBaseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: "+213"+form.value.phone, password: form.value.password }),
    })
    if (!res.ok) {
      const msg = await res.text()
      throw new Error(msg || 'Login failed')
    }
    const data = await res.json()
    if (data?.token) authStore.setToken(data.token)
    if (data?.user) authStore.patchUser(data.user)
    
    await navigateTo('/')
  } catch (err) {
    console.error(err)
    showSnackbar('Invalid credentials', 'error')
  } finally {
    loading.value = false
  }
}

const { phoneValidator } = useValidators()
</script>

<template>
  <VRow
    no-gutters
    class="auth-wrapper bg-surface"
  >
    <VCol
      md="8"
      class="d-none d-md-flex"
    >
      <div class="position-relative bg-background rounded-lg w-100 ma-8 me-0">
        <div class="d-flex align-center justify-center w-100 h-100 pa-8">
          <NuxtLink to="/">
            <VImg
              width="350"
              :src="logo"
              class="auth-illustration"
            />
          </NuxtLink>
        </div>

        <VImg
          class="auth-footer-mask"
          :src="authThemeMask"
        />
      </div>
    </VCol>

    <VCol
      cols="12"
      md="4"
      class="auth-card-v2 d-flex align-center justify-center"
    >
      <VCard
        flat
        :max-width="500"
        class="mt-12 mt-sm-0 pa-4"
      >
        <VCardText>
          <h4 class="text-h4 mb-1">
            Welcome to <NuxtLink to="/" class="text-capitalize">{{ themeConfig.app.title }}</NuxtLink>! 👋🏻
          </h4>
          <p class="mb-0">
            Please sign-in to your account and start the adventure
          </p>
        </VCardText>
        <VCardText>
          <VForm @submit.prevent="submit">
            <VRow>
              <VCol cols="12">
                <AppTextField
                  v-model="form.phone"
                  label="Phone Number"
                  placeholder="X XX XX XX XX"
                  maxlength="9"
                  :rules="[phoneValidator]"
                  @input="form.phone = form.phone.replace(/\D/g, '')"
                >
                  <template #prepend-inner>
                    <p class="mb-0" style="margin-top: 1px;">0</p>
                  </template>
                </AppTextField>
              </VCol>

              <!-- password -->
              <VCol cols="12">
                <AppTextField
                  v-model="form.password"
                  label="Password"
                  placeholder="············"
                  :type="isPasswordVisible ? 'text' : 'password'"
                  :append-inner-icon="isPasswordVisible ? 'tabler-eye-off' : 'tabler-eye'"
                  @click:append-inner="isPasswordVisible = !isPasswordVisible"
                />

                <div class="d-flex align-center flex-wrap justify-space-between mt-2 mb-4">
                  <div />
                  <NuxtLink
                    class="text-primary ms-2 mb-1"
                    to="/forgot-password"
                  >
                    Forgot Password?
                  </NuxtLink>
                </div>

                <VBtn block type="submit" :loading="loading">Login</VBtn>
              </VCol>

              <VCol
                cols="12"
                class="text-center text-base"
              >
                <span>New on our platform?</span>

                <NuxtLink
                  class="text-primary ms-2"
                  href="/signup"
                >
                  Create an account
                </NuxtLink>
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>

  <VSnackbar
    v-model="snackbar.show"
    :color="snackbar.color"
    timeout="5000"
    location="bottom end"
  >
    {{ snackbar.message }}
  </VSnackbar>
</template>

<style lang="scss">
@use "@core/scss/template/pages/page-auth.scss";
</style>
