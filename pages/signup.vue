<script setup>
import communes from '@/data/commune.json'
import { useAuthStore } from '@/stores/auth'
import { useValidators } from '@/utils/validators'
import { useGenerateImageVariant } from '@core/composable/useGenerateImageVariant'
import logo from '@images/logo-v2.svg'
import registerMultistepBgDark from '@images/pages/register-multistep-bg-dark.png'
import registerMultistepBgLight from '@images/pages/register-multistep-bg-light.png'
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

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

const { t, locale } = useI18n({ useScope: 'global' })

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

// Steps: plan -> personal info -> phone verification
const items = computed(() => [
  {
    title: t('auth.signup.steps.plan.title'),
    subtitle: t('auth.signup.steps.plan.subtitle'),
    icon: 'tabler-list-check',
  },
  {
    title: t('auth.signup.steps.personal.title'),
    subtitle: t('auth.signup.steps.personal.subtitle'),
    icon: 'tabler-users',
  },
  {
    title: t('auth.signup.steps.phone.title'),
    subtitle: t('auth.signup.steps.phone.subtitle'),
    icon: 'tabler-phone',
  },
])

const radioContent = computed(() => [
  {
    title: t('auth.signup.roles.user.title'),
    desc: t('auth.signup.roles.user.desc'),
    value: 'user',
  },
  {
    title: t('auth.signup.roles.painter.title'),
    desc: t('auth.signup.roles.painter.desc'),
    value: 'painter',
  },
  {
    title: t('auth.signup.roles.enterprise.title'),
    desc: t('auth.signup.roles.enterprise.desc'),
    value: 'enterprise',
  },
])

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
  role: 'user',
  enterpriseName: '',
  serviceAreas: [],
})

const isPainter = computed(() => form.value.role === 'painter')
const isEnterprise = computed(() => form.value.role === 'enterprise')

// Painter service areas (separate picker)
const serviceAreaState = ref(null)
const serviceAreaCity = ref(null)

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

function getStateLabel(stateId) {
  return stateOptions.value.find(s => String(s.id) === String(stateId))?.label || ''
}

function getCityLabel(stateId, cityId) {
  const group = wilayaGroups.find(g => String(g[0].wilaya_id) === String(stateId))

  return group?.find(c => String(c.id) === String(cityId))?.name || ''
}

const serviceAreaCityOptions = computed(() => {
  if (!serviceAreaState.value)
    return []
  const group = wilayaGroups.find(g => String(g[0].wilaya_id) === String(serviceAreaState.value))

  return group ? group.map(c => ({ id: String(c.id), label: c.name })) : []
})

watch(() => form.value.state, () => {
  form.value.city = null
})

watch(() => form.value.role, async () => {
  // Clear role-specific fields when switching roles
  form.value.enterpriseName = ''
  form.value.serviceAreas = []
  serviceAreaState.value = null
  serviceAreaCity.value = null

  // Clear any existing validation highlights/errors
  await nextTick()
  formRef.value?.resetValidation?.()
})

watch(serviceAreaState, () => {
  serviceAreaCity.value = null
})

function addServiceArea() {
  if (!serviceAreaState.value || !serviceAreaCity.value)
    return

  const newArea = { state: String(serviceAreaState.value), city: String(serviceAreaCity.value) }
  const exists = (form.value.serviceAreas || []).some(a => String(a.state) === newArea.state && String(a.city) === newArea.city)
  if (exists)
    return

  form.value.serviceAreas = [...(form.value.serviceAreas || []), newArea]
  serviceAreaState.value = null
  serviceAreaCity.value = null
}

function removeServiceArea(index) {
  form.value.serviceAreas = (form.value.serviceAreas || []).filter((_, i) => i !== index)
}

function validateRoleExtras() {
  if (isEnterprise.value && !String(form.value.enterpriseName || '').trim()) {
    showSnackbar(t('auth.signup.errors.enterprise_name_required'), 'error')

    return false
  }
  if (isPainter.value && (!Array.isArray(form.value.serviceAreas) || form.value.serviceAreas.length === 0)) {
    showSnackbar(t('auth.signup.errors.service_areas_required'), 'error')

    return false
  }

  return true
}

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

const onSubmit = async () => {
  // Ensure form is valid before submit
  if (formRef.value) {
    const res = formRef.value.validate?.()
    if (res && typeof res.then === 'function') {
      const r = await res
      if (!r.valid) {
        showSnackbar(t('auth.errors.fix_highlighted_errors'), 'error')

        return
      }
    }
  }

  if (!validateRoleExtras())
    return

  try {
    loading.value = true

    // API expects a normal phone string (e.g. 0XXXXXXXXX)
    const phone = `+213${form.value.phone}`

    const payload = {
      phone,
      password: form.value.password,
      firstName: form.value.firstName,
      lastName: form.value.lastName,
      address: form.value.address,
      state: getStateLabel(form.value.state),
      city: getCityLabel(form.value.state, form.value.city),
    }

    // role is optional; omit for default "user"
    if (form.value.role && form.value.role !== 'user')
      payload.role = form.value.role

    if (form.value.role === 'enterprise')
      payload.enterpriseName = String(form.value.enterpriseName || '').trim()

    if (form.value.role === 'painter') {
      payload.serviceAreas = (form.value.serviceAreas || []).map(a => ({
        state: getStateLabel(a.state),
        city: getCityLabel(a.state, a.city),
      }))
    }

    const res = await fetch(`${config.public.apiBaseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json().catch(() => null)
    if (!res.ok) {
      const msg = data?.message || data?.error || (res.status === 409 ? t('auth.errors.user_already_exists') : t('auth.errors.failed_to_register'))
      throw new Error(msg)
    }

    if (data?.token) {
      authStore.setToken(data.token)
      authStore.patchUser(data.user)
      showSnackbar(t('auth.signup.registration_successful'), 'success')
      router.push('/')
    }
    else {
      throw new Error(t('auth.errors.registration_failed'))
    }
  }
  catch (err) {
    console.log(err)
    showSnackbar(t('auth.errors.registration_failed'), 'error')
  }
  finally {
    loading.value = false
  }
}

async function sendCode() {
  if (!form.value.phone || form.value.phone.length !== 9)
    return showSnackbar(t('auth.errors.valid_phone_required'), 'error')

  try {
    loading.value = true

    const phoneNumber = `+213${form.value.phone}`
    const result = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier.value)

    confirmationResult.value = result
    startCooldown()
    showSnackbar(t('auth.signup.code_sent_to', { phone: `0${form.value.phone}` }), 'info')
  }
  catch (err) {
    showSnackbar(err.message || t('auth.errors.failed_to_send_sms'), 'error')
  }
  finally {
    loading.value = false
  }
}

async function verifyCode() {
  if (!code.value || code.value.length !== 6)
    return showSnackbar(t('auth.errors.enter_6_digit_code'), 'error')

  try {
    loading.value = true

    const userCredential = await confirmationResult.value.confirm(code.value)
    if (userCredential.user) {
      showSnackbar(t('auth.signup.phone_verified_creating'), 'success')

      // Phone verified, now submit registration
      await onSubmit()
    }
  }
  catch (err) {
    showSnackbar(t('auth.errors.invalid_code_or_verification_failed'), 'error')
  }
  finally {
    loading.value = false
  }
}

function goToPhoneStep() {
  // Use VForm validation before moving to phone step (last step)
  if (formRef.value) {
    const result = formRef.value.validate?.()
    if (result && typeof result.then === 'function') {
      result.then(r => {
        if (r.valid && validateRoleExtras())
          currentStep.value = 2
        else
          showSnackbar(t('auth.errors.fix_highlighted_errors'), 'error')
      })

      return
    }
  }
  if (validateRoleExtras())
    currentStep.value = 2
}

function goToPersonalStep() {
  currentStep.value = 1
}

function goBack() {
  if (currentStep.value === 2) {
    confirmationResult.value = null
    code.value = ''
  }
  if (currentStep.value > 0)
    currentStep.value--
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
        width="700"
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
            <VWindowItem>
              <h5 class="text-h5">
                {{ t('auth.signup.plan.title') }}
              </h5>
              <p class="text-sm">
                {{ t('auth.signup.plan.subtitle') }}
              </p>

              <CustomRadiosWithIcon
                v-model:selected-radio="form.role"
                :radio-content="radioContent"
                :grid-column="{ sm: '4', cols: '12' }"
              >
                <template #default="{ item }">
                  <div class="text-center">
                    <h5 class="text-h5 text-primary pb-4">
                      {{ item.title }}
                    </h5>
                    <p class="clamp-text mb-0">
                      {{ item.desc }}
                    </p>
                  </div>
                </template>
              </CustomRadiosWithIcon>
            </VWindowItem>

            <!-- Step 1: Personal Information (now first) -->
            <VWindowItem>
              <h5 class="text-h5 mb-1">
                {{ t('auth.signup.personal_info_title') }}
              </h5>
              <p class="text-sm">
                {{ t('auth.signup.personal_info_subtitle') }}
              </p>

              <VRow>
                <VCol
                  cols="12"
                  md="6"
                >
                  <AppTextField
                    v-model="form.firstName"
                    :label="t('auth.first_name')"
                    :placeholder="t('auth.first_name_placeholder')"
                    :rules="[requiredValidator]"
                  />
                </VCol>

                <VCol
                  cols="12"
                  md="6"
                >
                  <AppTextField
                    v-model="form.lastName"
                    :label="t('auth.last_name')"
                    :placeholder="t('auth.last_name_placeholder')"
                    :rules="[requiredValidator]"
                  />
                </VCol>

                <VCol
                  v-if="isEnterprise"
                  cols="12"
                >
                  <AppTextField
                    v-model="form.enterpriseName"
                    :label="t('auth.signup.enterprise_name.label')"
                    :placeholder="t('auth.signup.enterprise_name.placeholder')"
                    :rules="[requiredValidator]"
                  />
                </VCol>

                <VCol
                  cols="12"
                  md="6"
                >
                  <AppTextField
                    v-model="form.password"
                    :label="t('auth.password')"
                    :placeholder="t('auth.password_placeholder')"
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
                    :label="t('auth.confirm_password')"
                    :placeholder="t('auth.password_placeholder')"
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
                    :label="t('auth.wilaya')"
                    :placeholder="t('auth.select_wilaya')"
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
                    :label="t('auth.city')"
                    item-value="id"
                    item-title="label"
                    :placeholder="t('auth.select_city')"
                    :items="cityOptions"
                    :rules="[requiredValidator]"
                  />
                </VCol>

                <VCol cols="12">
                  <AppTextField
                    v-model="form.address"
                    :label="t('auth.address')"
                    :placeholder="t('auth.address_placeholder')"
                    :rules="[requiredValidator]"
                  />
                </VCol>

                <VCol
                  v-if="isPainter"
                  cols="12"
                >
                  <h6 class="text-h6 mb-2">
                    {{ t('auth.signup.service_areas.title') }}
                  </h6>

                  <VRow align="end">
                    <VCol
                      cols="12"
                      md="5"
                    >
                      <AppSelect
                        v-model="serviceAreaState"
                        item-value="id"
                        item-title="label"
                        :label="t('auth.wilaya')"
                        :placeholder="t('auth.select_wilaya')"
                        :items="stateOptions"
                      />
                    </VCol>

                    <VCol
                      cols="12"
                      md="5"
                    >
                      <AppSelect
                        v-model="serviceAreaCity"
                        item-value="id"
                        item-title="label"
                        :label="t('auth.city')"
                        :placeholder="t('auth.select_city')"
                        :items="serviceAreaCityOptions"
                      />
                    </VCol>

                    <VCol
                      cols="12"
                      md="2"
                      class="d-flex align-center"
                    >
                      <VBtn
                        block
                        color="primary"
                        :disabled="!serviceAreaState || !serviceAreaCity"
                        @click="addServiceArea"
                      >
                        {{ t('common.add') }}
                      </VBtn>
                    </VCol>
                  </VRow>

                  <div
                    v-if="form.serviceAreas?.length"
                    class="d-flex flex-wrap gap-2 mt-2"
                  >
                    <VChip
                      v-for="(area, i) in form.serviceAreas"
                      :key="`${area.state}-${area.city}-${i}`"
                      closable
                      @click:close="removeServiceArea(i)"
                    >
                      {{ getStateLabel(area.state) }} - {{ getCityLabel(area.state, area.city) }}
                    </VChip>
                  </div>
                </VCol>
              </VRow>
            </VWindowItem>

            <!-- Step 2: Phone Verification (now second) -->
            <VWindowItem>
              <h5 class="text-h5 mb-1">
                {{ t('auth.signup.phone_verification_title') }}
              </h5>
              <p class="text-sm text-medium-emphasis">
                {{ !confirmationResult ? t('auth.signup.phone_step_description') : t('auth.signup.code_step_description') }}
              </p>

              <VRow>
                <VCol cols="12">
                  <AppTextField
                    v-model="form.phone"
                    :label="t('auth.phone_number')"
                    :placeholder="t('auth.phone_placeholder')"
                    maxlength="9"
                    :disabled="!!confirmationResult"
                    :rules="[requiredValidator, phoneValidator]"
                    dir="ltr"
                    @input="form.phone = form.phone.replace(/\D/g, '')"
                  >
                    <template
                      v-if="locale === 'ar'"
                      #append-inner
                    >
                      <p
                        class="mb-0"
                        style="margin-block-start: 1px;"
                      >
                        0
                      </p>
                    </template>
                    <template
                      v-else
                      #prepend-inner
                    >
                      <p
                        class="mb-0"
                        style="margin-block-start: 1px;"
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
                        {{ t('auth.signup.sent_code_to') }} <strong>0{{ form.phone }}</strong>
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
                        {{ t('auth.signup.didnt_receive_code') }}
                      </p>
                      <VBtn
                        variant="text"
                        color="primary"
                        size="small"
                        :disabled="resendCooldown > 0 || loading"
                        @click="sendCode"
                      >
                        {{ resendCooldown > 0 ? t('auth.signup.resend_in', { seconds: resendCooldown }) : t('auth.signup.resend_code') }}
                      </VBtn>
                    </div>
                  </VCard>
                </VCol>
              </VRow>
            </VWindowItem>
          </VForm>
        </VWindow>

        <div class="d-flex flex-wrap justify-sm-space-between justify-center gap-x-4 gap-y-2 mt-8">
          <VBtn
            v-if="currentStep > 0"
            variant="tonal"
            color="secondary"
            @click="goBack"
          >
            <VIcon
              icon="tabler-arrow-left"
              start
            />
            {{ t('common.back') }}
          </VBtn>
          <div v-else />

          <!-- Step 0: Next -> Personal -->
          <VBtn
            v-if="currentStep === 0"
            :loading="loading"
            @click="goToPersonalStep"
          >
            {{ t('common.next') }}
            <VIcon
              icon="tabler-arrow-right"
              end
            />
          </VBtn>

          <!-- Step 1: Next -> Phone (requires valid personal info) -->
          <VBtn
            v-else-if="currentStep === 1"
            :loading="loading"
            @click="goToPhoneStep"
          >
            {{ t('common.next') }}
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
            {{ t('auth.send_code') }}
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
            {{ t('auth.signup.verify_create_account') }}
          </VBtn>
        </div>
        <div class="d-flex align-center justify-center mt-6">
          <span>{{ t('auth.already_have_account') }}</span>
          <NuxtLink
            class="text-sm mx-2"
            variant="plain"
            color="primary"
            to="/login"
          >
            {{ t('auth.log_in') }}
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
