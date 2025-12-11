<script setup>
import communes from '@/data/commune.json';
import { useAuthStore } from "@/stores/auth.js";
import { useValidators } from '@/utils/validators';

const config = useRuntimeConfig()
const authStore = useAuthStore();
const accountData = {
  ...authStore.user ?? {},
  phone: authStore.user?.phone.slice(4) ?? ``,
  avatar : authStore.user?.avatar ?? `https://dummyimage.com/100x100/000/fff&text=${authStore.user?.firstName.charAt(0)}${authStore.user?.lastName.charAt(0)}`,
}

const refInputEl = ref()
const formRef = ref()
const { requiredValidator } = useValidators()

const accountDataLocal = ref(structuredClone(accountData))
const isLoading = ref(false)

const updateProfile = async () => {
  // Validate form before submitting
  if (formRef.value && typeof formRef.value.validate === 'function') {
    const result = formRef.value.validate()
    if (result && typeof result.then === 'function') {
      const r = await result
      if (!r.valid) {
        showSnackbar('Please fix the highlighted errors', 'error')
        return
      }
    }
  }

  isLoading.value = true
  try {
    const { data, error } = await useApi('/api/auth/me', {
      method: 'PATCH',
      body: {
        firstName: accountDataLocal.value.firstName,
        lastName: accountDataLocal.value.lastName,
        avatar: accountDataLocal.value.avatar,
        address: accountDataLocal.value.address,
        state: accountDataLocal.value.state,
        city: accountDataLocal.value.city,
      },
    })
    if (error.value) {
      showSnackbar('Failed to update profile', 'error')
      return console.error('Failed to update profile:', error.value)
    }

    if (data.value?.user) {
      authStore.patchUser(data.value.user)
      showSnackbar('Profile updated successfully', 'success')
    }
  } catch (err) {
    console.error('Failed to update profile:', err)
    showSnackbar('Failed to update profile', 'error')
  } finally {
    isLoading.value = false
  }
}


// Build wilaya and city options from communes dataset
const wilayaGroups = (communes || []).filter(g => Array.isArray(g) && g.length)
const stateOptions = computed(() =>
  wilayaGroups.map(g => ({ id: String(g[0].wilaya_id), label: `${g[0].name}` }))
)

const cityOptions = computed(() => {
  if (!accountDataLocal.value.state) return []
  const group = wilayaGroups.find(g => String(g[0].wilaya_id) === String(accountDataLocal.value.state))
  return group ? group.map(c => ({ id: String(c.id), label: c.name })) : []
})

watch(() => accountDataLocal.value.state, () => {
  accountDataLocal.value.city = null
})

const resetForm = () => {
  accountDataLocal.value = structuredClone(accountData)
}

const isUploadingAvatar = ref(false)
const avatarError = ref('')

const changeAvatar = async (file) => {
  const { files } = file.target
  if (!files || !files.length) return

  avatarError.value = ''
  
  // Check file size (3MB = 3 * 1024 * 1024 bytes)
  const maxSize = 3 * 1024 * 1024
  if (files[0].size > maxSize) {
    avatarError.value = 'Image size must be less than 3MB'
    showSnackbar('Image size must be less than 3MB', 'error')
    return
  }

  const fileReader = new FileReader()
  fileReader.readAsDataURL(files[0])
  
  fileReader.onload = async () => {
    if (typeof fileReader.result !== 'string') return
    
    const imageDataUri = fileReader.result
    isUploadingAvatar.value = true
    
    try {
      // Check if user already has an avatar ID (stored in user object)
      // const existingAvatarId = authStore.user?.avatarId
      
      // if (!existingAvatarId) {
      //   // Update existing image
      //   const { error } = await useApi(`/api/image/${existingAvatarId}`, {
      //     method: 'PATCH',
      //     body: { image: imageDataUri },
      //   })
        
      //   if (error.value) {
      //     console.error('Failed to update avatar:', error.value)
      //     return
      //   }
        
      //   // Update local avatar display (append timestamp to bust cache)
      //   const avatarUrl = `/api/image?id=${existingAvatarId}&t=${Date.now()}`
      //   accountDataLocal.value.avatar = avatarUrl
      //   authStore.patchUser({ avatar: avatarUrl })
      // } else {
        // Create new image
        const { data, error } = await useApi('/api/image', {
          method: 'POST',
          body: { image: imageDataUri },
        })
        if (error.value) {
          showSnackbar('Failed to upload avatar', 'error')
          return console.error('Failed to upload avatar:', error.value)
        }
        
        if (data.value?.id) {
          const avatarUrl = `${config.public.apiBaseUrl}/api/image?id=${data.value.id}`
          accountDataLocal.value.avatar = avatarUrl
          
          // Update user profile with new avatar URL and avatarId
          const { error: updateError } = await useApi('/api/auth/me', {
            method: 'PATCH',
            body: { avatar: avatarUrl },
          })
          
          if (updateError.value) {
            showSnackbar('Failed to update profile', 'error')
            return console.error('Failed to update profile with avatar:', updateError.value)
          }
          
          authStore.patchUser({ avatar: avatarUrl })
          showSnackbar('Avatar updated successfully', 'success')
        }
      // }
    } catch (err) {
      console.error('Failed to change avatar:', err)
      showSnackbar('Failed to change avatar', 'error')
    } finally {
      isUploadingAvatar.value = false
    }
  }
}

const snackbar = ref({ show: false, message: "", color: "success" });
const showSnackbar = (message, color = "snackbar") => {
  snackbar.value = { show: true, message, color };
};
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard title="Profile Details">
        <VCardText class="d-flex">
          <VAvatar
            rounded
            size="100"
            class="me-6"
            :image="accountDataLocal.avatar"
          />

          <form class="d-flex flex-column justify-center gap-4">
            <div class="d-flex flex-wrap gap-2">
              <VBtn
                color="primary"
                :loading="isUploadingAvatar"
                :disabled="isUploadingAvatar"
                @click="refInputEl?.click()"
              >
                <VIcon
                  icon="tabler-cloud-upload"
                  class="d-sm-none"
                />
                <span class="d-none d-sm-block">Upload new photo</span>
              </VBtn>

              <input
                ref="refInputEl"
                type="file"
                name="file"
                accept=".jpeg,.png,.jpg,GIF"
                hidden
                @input="changeAvatar"
              >
            </div>

            <p class="text-body-1 mb-0">
              Allowed JPG, GIF or PNG. Max size of 3MB
            </p>
            <p v-if="avatarError" class="text-error mb-0">
              {{ avatarError }}
            </p>
          </form>
        </VCardText>

        <VDivider />

        <VCardText class="pt-2">
          <VForm ref="formRef" class="mt-6">
            <VRow>
              <VCol
                md="6"
                cols="12"
              >
                <AppTextField
                  v-model="accountDataLocal.firstName"
                  placeholder="John"
                  label="First Name"
                  :rules="[requiredValidator]"
                />
              </VCol>

              <VCol
                md="6"
                cols="12"
              >
                <AppTextField
                  v-model="accountDataLocal.lastName"
                  placeholder="Doe"
                  label="Last Name"
                  :rules="[requiredValidator]"
                />
              </VCol>

              <VCol
                cols="12"
                md="6"
              >
                <AppSelect
                  v-model="accountDataLocal.state"
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
                  v-model="accountDataLocal.city"
                  label="City"
                  item-value="id"
                  item-title="label"
                  placeholder="Select City"
                  :items="cityOptions"
                  :rules="[requiredValidator]"
                />
              </VCol>

              <VCol 
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="accountDataLocal.address"
                  label="Address"
                  placeholder="1234 Main St, New York, NY 10001, USA"
                  :rules="[requiredValidator]"
                />
              </VCol>

              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="accountDataLocal.phone"
                  label="Phone Number"
                  maxlength="9"
                  disabled
                >
                  <template #prepend-inner>
                    <p class="mb-0" style="margin-top: 1px;">0</p>
                  </template>
                </AppTextField>
              </VCol>

              <VCol
                cols="12"
                class="d-flex flex-wrap gap-4"
              >
                <VBtn
                  :loading="isLoading"
                  :disabled="isLoading"
                  @click="updateProfile"
                >
                  Save changes
                </VBtn>

                <VBtn
                  color="secondary"
                  variant="tonal"
                  type="reset"
                  @click.prevent="resetForm"
                >
                  Reset
                </VBtn>
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
