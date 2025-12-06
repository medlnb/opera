<script setup >
import { useAuthStore } from "@/stores/auth.js";
import { useGenerateImageVariant } from '@core/composable/useGenerateImageVariant';
import registerMultistepBgDark from '@images/pages/register-multistep-bg-dark.png';
import registerMultistepBgLight from '@images/pages/register-multistep-bg-light.png';
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { useRouter } from 'vue-router';

definePageMeta({
  layout: 'blank',
})

const { $firebaseAuth : auth } = useNuxtApp();
const authStore = useAuthStore();
const router = useRouter();
const recaptchaVerifier = ref();
const confirmationResult = ref()
const loading = ref(false)

const registerMultistepBg = useGenerateImageVariant(registerMultistepBgLight, registerMultistepBgDark)
const isPasswordVisible = ref(false)
const isConfirmPasswordVisible = ref(false)
const currentStep = ref(1)


const getRecaptchaVerifier = () => {
  if (recaptchaVerifier.value) return
  const verifier = new RecaptchaVerifier(
    auth,
    "recaptcha-container",
    { size: "invisible" },
  );
  recaptchaVerifier.value = verifier;
};

onMounted(() => {
  getRecaptchaVerifier();
});

const items = [
  {
    title: 'Phone Verification',
    subtitle: 'Phone Details',
    icon: 'tabler-phone',
  },
  {
    title: 'Personal',
    subtitle: 'Enter Information',
    icon: 'tabler-users',
  },
]

const code = ref("");
const form = ref({
  phone: '549773117',          
  password: 'password',      
  confirmPassword: 'password',
  firstName: 'Karim',
  lastName: 'Benali',
  address: 'Rue 12, Cité El Amir',
  state: 0,                  
  city: 0,                     
})

const states = [
  {
    id: 0, label: 'New York', cities: [
      { id: 0, label: 'New York City' },
      { id: 1, label: 'Buffalo' },
      { id: 2, label: 'Rochester' },
    ],
  },
  {
    id: 1, label: 'California', cities: [
      { id: 0, label: 'Los Angeles' },
      { id: 1, label: 'San Francisco' },
      { id: 2, label: 'San Diego' },
    ],
  },
  {
    id: 2, label: 'Florida', cities: [
      { id: 0, label: 'Miami' },
      { id: 1, label: 'Orlando' },
      { id: 2, label: 'Tampa' },
    ],
  },
  {
    id: 3, label: 'Washington', cities: [
      { id: 0, label: 'Seattle' },
      { id: 1, label: 'Tacoma' },
      { id: 2, label: 'Bellevue' },
    ],
  },
  {
    id: 4, label: 'Texas', cities: [
      { id: 0, label: 'Austin' },
      { id: 1, label: 'Dallas' },
      { id: 2, label: 'Houston' },
    ],
  },
]

const stateOptions = states.map(s => ({ id: s.id, label: s.label }))
const cityOptions = computed(() => {
  const selected = states.find(s => s.id === form.value.state)
  return selected ? selected.cities : []
})

watch(() => form.value.state, () => {
  form.value.city = null
})

async function sendCode() {
  try {
    loading.value = true;
    const phoneNumber = "+213"+form.value.phone;
    const result  = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier.value);
    confirmationResult.value = result;
  } catch (err) {
    alert(err.message || "Failed to send SMS.");
  } finally {
    loading.value = false;
  }
}

async function verifyCode() {
  try {
    loading.value = true;
    const userCredential = await confirmationResult.value.confirm(code.value);
    if(userCredential.user)
      currentStep.value++
  } catch (err) {
    alert("Invalid code or verification failed.");
  } finally {
    loading.value = false;
  }
}

const onSubmit = async () => {
  try {
    loading.value = true;
    const phone = "+213"+form.value.phone;
    const res = await fetch("http://localhost:8888/api/auth/register",{
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({...form.value, phone}),
    })
    if(!res.ok) throw new Error("Failed to register");
    const data = await res.json()
    if (data?.token) {
      authStore.setToken({ token: data.token })
      authStore.patchUser(data.user)
      router.push("/")
    } else {
      throw new Error("Registration failed");
    }
  } catch(err) {
    console.log(err);
    alert("Registration failed.");
  } finally {
    loading.value = false;
  }
}
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
      <div class="d-flex justify-center align-center w-100 position-relative">
        <VImg
          class="illustration-image"
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
          isActiveStepValid
        />

        <VWindow
          v-model="currentStep"
          class="disable-tab-transition"
          style="max-inline-size: 681px;"
        >
          <VForm>
            <VWindowItem>
              <h5 class="text-h5 mb-1">
                Phone Validation
              </h5>
              <p class="text-sm">
                Enter Your Phone Number
              </p>

              <VRow>
                <VCol
                  cols="12"
                >
                  <AppTextField
                    v-model="form.phone"
                    label="Phone Number"
                    placeholder="X XX XX XX XX"
                    maxlength="9"
                  >
                    <template #prepend-inner>
                      <p class="mb-0" style="margin-top: 1px;">0</p>
                    </template>
                  </AppTextField>
                </VCol>

                <VCol v-if="confirmationResult" cols="12">
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
              </VRow>
            </VWindowItem>

            <VWindowItem>
              <h5 class="text-h5 mb-1">
                Personal Information
              </h5>
              <p class="text-sm">
                Enter Your Personal Information
              </p>

              <VRow>
                <VCol cols="12" md="6">
                  <AppTextField
                    v-model="form.firstName"
                    label="First Name"
                    placeholder="John"
                  />
                </VCol>

                <VCol cols="12" md="6">
                  <AppTextField
                    v-model="form.lastName"
                    label="Last Name"
                    placeholder="Doe"
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
                    label="State"
                    placeholder="Select State"
                    :items="stateOptions"
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
                  />
                </VCol>

                <VCol cols="12">
                  <AppTextField
                    v-model="form.address"
                    label="Address"
                    placeholder="1234 Main St, New York, NY 10001, USA"
                  />
                </VCol>
              </VRow>
            </VWindowItem>
          </VForm>
        </VWindow>

        <div class="d-flex flex-wrap justify-sm-space-between justify-center gap-x-4 gap-y-2 mt-8">
          <div />
          <VBtn
            v-if="items.length - 1 === currentStep"
            color="success"
            append-icon="tabler-check"
            @click="onSubmit"
            :loading="loading"
          >
            submit
          </VBtn>

          <VBtn
            v-else
            @click="confirmationResult ? verifyCode() : sendCode();"
            :disabled="!recaptchaVerifier"
            :loading="loading"
          >
            {{ confirmationResult ? 'Verify Code' : 'Send Code' }}
            <VIcon
              :icon="confirmationResult ? 'tabler-check' : 'tabler-phone'"
              end
              class="flip-in-rtl"
            />
          </VBtn>
        </div>
      </VCard>
    </VCol>
  </VRow>
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
