<script setup>
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
import { useRouter } from 'vue-router'
import logo from '@images/logo-v2.svg'
import communes from '@/data/commune.json'
import { useAuthStore } from '@/stores/auth.js'
import { useValidators } from '@/utils/validators'
import { useGenerateImageVariant } from '@core/composable/useGenerateImageVariant'
import registerMultistepBgDark from '@images/pages/register-multistep-bg-dark.png'
import registerMultistepBgLight from '@images/pages/register-multistep-bg-light.png'

definePageMeta({
  layout: 'blank',
})

const { $firebaseAuth: auth } = useNuxtApp()
const config = useRuntimeConfig()
const authStore = useAuthStore()
const router = useRouter()
const recaptchaVerifier = ref()
const confirmationResult = ref()
const loading = ref(false)

const registerMultistepBg = useGenerateImageVariant(registerMultistepBgLight, registerMultistepBgDark)
const isPasswordVisible = ref(false)
const isConfirmPasswordVisible = ref(false)
const currentStep = ref(0)
const formRef = ref()

const snackbar = ref({ show: false, message: '', color: 'success' })

const showSnackbar = (message, color = 'success') => {
  snackbar.value = { show: true, message, color }
}

const getRecaptchaVerifier = () => {
  if (recaptchaVerifier.value)
    return

  const verifier = new RecaptchaVerifier(
    auth,
    'recaptcha-container',
    { size: 'invisible' },
  )

  recaptchaVerifier.value = verifier
}

onMounted(() => {
  getRecaptchaVerifier()
})

// Reordered: Personal info first, then phone verification
const items = [
  {
    title: 'Personal',
    subtitle: 'Enter Information',
    icon: 'tabler-users',
  },
  {
    title: 'Phone Verification',
    subtitle: 'Verify Your Phone',
    icon: 'tabler-phone',
  },
]

const code = ref('')

const form = ref({
  phone: '',
  password: '',
  confirmPassword: '',
  firstName: '',
  lastName: '',
  address: '',
  state: '1',
  city: '1',
})

// Build wilaya (state) options from grouped communes
const wilayaGroups = (communes || []).filter(g => Array.isArray(g) && g.length)

const stateOptions = computed(() =>
  wilayaGroups.map(g => ({ id: String(g[0].wilaya_id), label: g[0].name })),
)

// Cities (communes) for selected wilaya
const cityOptions = computed(() => {
  if (!form.value.state)
    return []
  const group = wilayaGroups.find(g => String(g[0].wilaya_id) === String(form.value.state))

  return group ? group.map(c => ({ id: String(c.id), label: c.name })) : []
})

watch(() => form.value.state, () => {
  form.value.city = null
})

// Resend code cooldown
const resendCooldown = ref(0)
let cooldownInterval = null

function startCooldown() {
  resendCooldown.value = 60
  cooldownInterval = setInterval(() => {
    resendCooldown.value--
    if (resendCooldown.value <= 0)
      clearInterval(cooldownInterval)
  }, 1000)
}

async function sendCode() {
  if (!form.value.phone || form.value.phone.length !== 9)
    return showSnackbar('Please enter a valid 9-digit phone number', 'error')

  try {
    loading.value = true

    const phoneNumber = `+213${form.value.phone}`
    const result = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier.value)

    confirmationResult.value = result
    startCooldown()
    showSnackbar(`Verification code sent to 0${form.value.phone}`, 'info')
  }
  catch (err) {
    showSnackbar(err.message || 'Failed to send SMS', 'error')
  }
  finally {
    loading.value = false
  }
}

async function verifyCode() {
  if (!code.value || code.value.length !== 6)
    return showSnackbar('Please enter the 6-digit verification code', 'error')

  try {
    loading.value = true

    const userCredential = await confirmationResult.value.confirm(code.value)
    if (userCredential.user) {
      showSnackbar('Phone verified! Creating your account...', 'success')

      // Phone verified, now submit registration
      await onSubmit()
    }
  }
  catch (err) {
    showSnackbar('Invalid code or verification failed', 'error')
  }
  finally {
    loading.value = false
  }
}

function goToPhoneStep() {
  // Use VForm validation before moving to phone step
  if (formRef.value) {
    const result = formRef.value.validate?.()
    if (result && typeof result.then === 'function') {
      result.then(r => {
        if (r.valid)
          currentStep.value = 1; else showSnackbar('Please fix the highlighted errors', 'error')
      })

      return
    }
  }
  currentStep.value = 1
}

const onSubmit = async () => {
  // Ensure form is valid before submit
  if (formRef.value) {
    const res = formRef.value.validate?.()
    if (res && typeof res.then === 'function') {
      const r = await res
      if (!r.valid) {
        showSnackbar('Please fix the highlighted errors', 'error')

        return
      }
    }
  }
  try {
    loading.value = true

    const phone = `+213${form.value.phone}`

    const res = await fetch(`${config.public.apiBaseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...form.value, phone }),
    })

    if (!res.ok)
      throw new Error('Failed to register')
    const data = await res.json()
    if (data?.token) {
      authStore.setToken(data.token)
      authStore.patchUser(data.user)
      showSnackbar('Registration successful', 'success')
      router.push('/')
    }
    else {
      throw new Error('Registration failed')
    }
  }
  catch (err) {
    console.log(err)
    showSnackbar('Registration failed', 'error')
  }
  finally {
    loading.value = false
  }
}

const { phoneValidator, requiredValidator, passwordValidator, confirmPasswordValidator } = useValidators()
</script>

<template>
  <div id="recaptcha-container" />
  <VRow
    no-gutters
    class="auth-wrapper"
  >
    <VCol
      md="4"
      class="d-none d-md-flex"
    >
      <!-- here your illustration -->
      <div class="d-flex justify-center align-center w-100 position-relative pa-8">
        <VImg
          class="illustration-image"
          :src="logo"
        />
        <VImg
          :src="registerMultistepBg"
          class="bg-image position-absolute w-100"
        />
      </div>
    </VCol>

    <VCol
      cols="12"
      md="8"
      class="auth-card-v2 d-flex align-center justify-center pa-10"
      style="background-color: rgb(var(--v-theme-surface));"
    >
      <VCard
        flat
        class="mt-12 mt-sm-0"
        width="600"
      >
        <AppStepper
          v-model:current-step="currentStep"
          :items="items"
          :direction="$vuetify.display.smAndUp ? 'horizontal' : 'vertical'"
          icon-size="24"
          class="stepper-icon-step-bg mb-8"
          is-active-step-valid
        />

        <VWindow
          v-model="currentStep"
          class="disable-tab-transition"
          style="max-inline-size: 681px;"
        >
          <VForm ref="formRef">
            <!-- Step 1: Personal Information (now first) -->
            <VWindowItem>
              <h5 class="text-h5 mb-1">
                Personal Information
              </h5>
              <p class="text-sm">
                Enter Your Personal Information
              </p>

              <VRow>
                <VCol
                  cols="12"
                  md="6"
                >
                  <AppTextField
                    v-model="form.firstName"
                    label="First Name"
                    placeholder="John"
                    :rules="[requiredValidator]"
                  />
                </VCol>

                <VCol
                  cols="12"
                  md="6"
                >
                  <AppTextField
                    v-model="form.lastName"
                    label="Last Name"
                    placeholder="Doe"
                    :rules="[requiredValidator]"
                  />
                </VCol>
                <VCol
                  cols="12"
                  md="6"
                >
                  <AppTextField
                    v-model="form.password"
                    label="Password"
                    placeholder="············"
                    :type="isPasswordVisible ? 'text' : 'password'"
                    :append-inner-icon="isPasswordVisible ? 'tabler-eye-off' : 'tabler-eye'"
                    :rules="[requiredValidator, passwordValidator]"
                    @click:append-inner="isPasswordVisible = !isPasswordVisible"
                  />
                </VCol>

                <VCol
                  cols="12"
                  md="6"
                >
                  <AppTextField
                    v-model="form.confirmPassword"
                    label="Confirm Password"
                    placeholder="············"
                    :type="isConfirmPasswordVisible ? 'text' : 'password'"
                    :append-inner-icon="isConfirmPasswordVisible ? 'tabler-eye-off' : 'tabler-eye'"
                    :rules="[val => confirmPasswordValidator(val, form.password)]"
                    @click:append-inner="isConfirmPasswordVisible = !isConfirmPasswordVisible"
                  />
                </VCol>

                <VCol
                  cols="12"
                  md="6"
                >
                  <AppSelect
                    v-model="form.state"
                    item-value="id"
                    item-title="label"
                    label="Wilaya"
                    placeholder="Select Wilaya"
                    :items="stateOptions"
                    :rules="[requiredValidator]"
                  />
                </VCol>

                <VCol
                  cols="12"
                  md="6"
                >
                  <AppSelect
                    v-model="form.city"
                    label="City"
                    item-value="id"
                    item-title="label"
                    placeholder="Select City"
                    :items="cityOptions"
                    :rules="[requiredValidator]"
                  />
                </VCol>

                <VCol cols="12">
                  <AppTextField
                    v-model="form.address"
                    label="Address"
                    placeholder="1234 Main St, New York, NY 10001, USA"
                    :rules="[requiredValidator]"
                  />
                </VCol>
              </VRow>
            </VWindowItem>

            <!-- Step 2: Phone Verification (now second) -->
            <VWindowItem>
              <h5 class="text-h5 mb-1">
                Phone Verification
              </h5>
              <p class="text-sm text-medium-emphasis">
                {{ !confirmationResult ? 'Enter your phone number to receive a verification code' : 'Enter the 6-digit code sent to your phone' }}
              </p>

              <VRow>
                <VCol cols="12">
                  <AppTextField
                    v-model="form.phone"
                    label="Phone Number"
                    placeholder="X XX XX XX XX"
                    maxlength="9"
                    :disabled="!!confirmationResult"
                    :rules="[requiredValidator, phoneValidator]"
                    @input="form.phone = form.phone.replace(/\D/g, '')"
                  >
                    <template #prepend-inner>
                      <p
                        class="mb-0"
                        style="margin-top: 1px;"
                      >
                        0
                      </p>
                    </template>
                  </AppTextField>
                </VCol>

                <!-- OTP Input Section -->
                <VCol
                  v-if="confirmationResult"
                  cols="12"
                >
                  <VCard
                    variant="outlined"
                    class="pa-4"
                  >
                    <div class="text-center mb-4">
                      <VIcon
                        icon="tabler-device-mobile-message"
                        size="48"
                        color="primary"
                      />
                      <p class="text-body-1 mt-2 mb-0">
                        We sent a code to <strong>0{{ form.phone }}</strong>
                      </p>
                    </div>

                    <div class="d-flex justify-center mb-4">
                      <VOtpInput
                        v-model="code"
                        :length="6"
                        variant="outlined"
                        type="number"
                      />
                    </div>

                    <div class="text-center">
                      <p class="text-body-2 text-medium-emphasis mb-2">
                        Didn't receive the code?
                      </p>
                      <VBtn
                        variant="text"
                        color="primary"
                        size="small"
                        :disabled="resendCooldown > 0 || loading"
                        @click="sendCode"
                      >
                        {{ resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code' }}
                      </VBtn>
                    </div>
                  </VCard>
                </VCol>
              </VRow>
            </VWindowItem>
          </VForm>
        </VWindow>

        <div class="d-flex flex-wrap justify-sm-space-between justify-center gap-x-4 gap-y-2 mt-8">
          <!-- Back button for step 2 -->
          <VBtn
            v-if="currentStep === 1"
            variant="tonal"
            color="secondary"
            @click="currentStep = 0; confirmationResult = null; code = ''"
          >
            <VIcon
              icon="tabler-arrow-left"
              start
            />
            Back
          </VBtn>
          <div v-else />

          <!-- Step 1: Next button -->
          <VBtn
            v-if="currentStep === 0"
            :loading="loading"
            @click="goToPhoneStep"
          >
            Next
            <VIcon
              icon="tabler-arrow-right"
              end
            />
          </VBtn>

          <!-- Step 2: Send Code or Verify -->
          <VBtn
            v-else-if="!confirmationResult"
            :disabled="!recaptchaVerifier || !form.phone || form.phone.length !== 9"
            :loading="loading"
            color="primary"
            @click="sendCode"
          >
            <VIcon
              icon="tabler-send"
              start
            />
            Send Code
          </VBtn>

          <VBtn
            v-else
            :disabled="!code || code.length !== 6"
            :loading="loading"
            color="success"
            @click="verifyCode"
          >
            <VIcon
              icon="tabler-check"
              start
            />
            Verify & Create Account
          </VBtn>
        </div>
        <div class="d-flex align-center justify-center mt-6">
          <span>Already have an account?</span>
          <NuxtLink
            class="text-sm mx-2"
            variant="plain"
            color="primary"
            to="/login"
          >
            Log in
          </NuxtLink>
        </div>
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

.illustration-image {
  block-size: 550px;
  inline-size: 248px;
}

.bg-image {
  inset-block-end: 0;
}
</style>
