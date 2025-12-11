<script setup lang="ts">
import logo from "@/assets/images/logo-v2.svg"
import { useGenerateImageVariant } from '@core/composable/useGenerateImageVariant'
import authV2MaskDark from '@images/pages/misc-mask-dark.png'
import authV2MaskLight from '@images/pages/misc-mask-light.png'
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'

definePageMeta({
  layout: 'blank',
})

const { $firebaseAuth: auth } = useNuxtApp()
const config = useRuntimeConfig()
const router = useRouter()

const phone = ref('')
const code = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const isPasswordVisible = ref(false)
const isConfirmPasswordVisible = ref(false)

const recaptchaVerifier = ref<RecaptchaVerifier | null>(null)
const confirmationResult = ref<any>(null)
const phoneVerified = ref(false)
const loading = ref(false)

const snackbar = ref({ show: false, message: '', color: 'success' })
const showSnackbar = (message: string, color = 'success') => {
  snackbar.value = { show: true, message, color }
}

// Current step: 0 = phone input, 1 = OTP verification, 2 = new password
const currentStep = ref(0)

const getRecaptchaVerifier = () => {
  if (recaptchaVerifier.value) return
  recaptchaVerifier.value = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' })
}

onMounted(() => {
  getRecaptchaVerifier()
})

async function sendCode() {
  if (!phone.value || phone.value.length !== 9) {
    return showSnackbar('Please enter a valid 9-digit phone number', 'error')
  }
  try {
    loading.value = true
    const phoneNumber = '+213' + phone.value
    const result = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier.value!)
    confirmationResult.value = result
    currentStep.value = 1
    showSnackbar('Verification code sent', 'success')
  } catch (err: any) {
    showSnackbar(err.message || 'Failed to send SMS', 'error')
  } finally {
    loading.value = false
  }
}

async function verifyCode() {
  if (!code.value || code.value.length !== 6) {
    return showSnackbar('Please enter the 6-digit code', 'error')
  }
  try {
    loading.value = true
    const userCredential = await confirmationResult.value.confirm(code.value)
    if (userCredential.user) {
      phoneVerified.value = true
      currentStep.value = 2
      showSnackbar('Phone verified! Now set your new password', 'success')
    }
  } catch (err: any) {
    showSnackbar('Invalid code or verification failed', 'error')
  } finally {
    loading.value = false
  }
}

async function resetPassword() {
  if (!newPassword.value || newPassword.value.length < 6) {
    return showSnackbar('Password must be at least 6 characters', 'error')
  }
  if (newPassword.value !== confirmPassword.value) {
    return showSnackbar('Passwords do not match', 'error')
  }
  try {
    loading.value = true
    const fullPhone = '+213' + phone.value
    const res = await fetch(`${config.public.apiBaseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: fullPhone, newPassword: newPassword.value }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Failed to reset password')
    showSnackbar('Password reset successfully! Redirecting to login...', 'success')
    setTimeout(() => router.push('/login'), 2000)
  } catch (err: any) {
    showSnackbar(err.message || 'Failed to reset password', 'error')
  } finally {
    loading.value = false
  }
}


const authThemeMask = useGenerateImageVariant(authV2MaskLight, authV2MaskDark)
</script>

<template>
  <div id="recaptcha-container" />
  <VRow
    class="auth-wrapper bg-surface"
    no-gutters
  >
    <VCol
      md="8"
      class="d-none d-md-flex"
    >
      <div class="position-relative bg-background rounded-lg w-100 ma-8 me-0">
        <div class="d-flex align-center justify-center w-100 h-100">
          <VImg
            max-width="368"
            :src="logo"
            class="auth-illustration mt-16 mb-2"
          />
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
            Forgot Password? 🔒
          </h4>
          <p class="mb-0">
            {{ currentStep === 0 ? 'Enter your phone number and we\'ll send you a verification code' : currentStep === 1 ? 'Enter the verification code sent to your phone' : 'Create a new password for your account' }}
          </p>
        </VCardText>

        <VCardText>
          <VForm @submit.prevent="currentStep === 0 ? sendCode() : currentStep === 1 ? verifyCode() : resetPassword()">
            <VRow>
              <!-- Step 0: Phone Number -->
              <VCol v-if="currentStep === 0" cols="12">
                <AppTextField
                  v-model="phone"
                  autofocus
                  label="Phone Number"
                  placeholder="X XX XX XX XX"
                  maxlength="9"
                >
                  <template #prepend-inner>
                    <p class="mb-0" style="margin-top: 1px;">0</p>
                  </template>
                </AppTextField>
              </VCol>

              <!-- Step 1: OTP Code -->
              <VCol v-if="currentStep === 1" cols="12">
                <div class="d-flex justify-center">
                  <VOtpInput
                    v-model="code"
                    :length="6"
                    label="Verification Code"
                    placeholder="- - - - - -"
                    variant="underlined"
                  />
                </div>
              </VCol>

              <!-- Step 2: New Password -->
              <template v-if="currentStep === 2">
                <VCol cols="12">
                  <AppTextField
                    v-model="newPassword"
                    label="New Password"
                    placeholder="············"
                    :type="isPasswordVisible ? 'text' : 'password'"
                    :append-inner-icon="isPasswordVisible ? 'tabler-eye-off' : 'tabler-eye'"
                    @click:append-inner="isPasswordVisible = !isPasswordVisible"
                  />
                </VCol>
                <VCol cols="12">
                  <AppTextField
                    v-model="confirmPassword"
                    label="Confirm Password"
                    placeholder="············"
                    :type="isConfirmPasswordVisible ? 'text' : 'password'"
                    :append-inner-icon="isConfirmPasswordVisible ? 'tabler-eye-off' : 'tabler-eye'"
                    @click:append-inner="isConfirmPasswordVisible = !isConfirmPasswordVisible"
                  />
                </VCol>
              </template>

              <!-- Submit Button -->
              <VCol cols="12">
                <VBtn
                  block
                  type="submit"
                  :loading="loading"
                  :disabled="loading"
                >
                  {{ currentStep === 0 ? 'Send Code' : currentStep === 1 ? 'Verify Code' : 'Reset Password' }}
                </VBtn>
              </VCol>

              <!-- back to login -->
              <VCol cols="12">
                <NuxtLink
                  class="d-flex align-center justify-center"
                  :to="{ name: 'login' }"
                >
                  <VIcon
                    icon="tabler-chevron-left"
                    class="flip-in-rtl"
                  />
                  <span>Back to login</span>
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
