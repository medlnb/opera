<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { useValidators } from '@/utils/validators'

const isCurrentPasswordVisible = ref(false)
const isNewPasswordVisible = ref(false)
const isConfirmPasswordVisible = ref(false)
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const isSaving = ref(false)
const formRef = ref()

const { t } = useI18n({ useScope: 'global' })

const { requiredValidator, passwordValidator, confirmPasswordValidator } = useValidators()

const snackbar = ref({ show: false, message: '', color: 'success' })

const showSnackbar = (message: string, color: string = 'success') => {
  snackbar.value = { show: true, message, color }
}

const onSave = async () => {
  // Validate VForm before submitting
  if (formRef.value && typeof formRef.value.validate === 'function') {
    const result = formRef.value.validate()
    if (result && typeof result.then === 'function') {
      const r = await result
      if (!r.valid) {
        showSnackbar(t('settings.validation.fix_errors'), 'error')

        return
      }
    }
  }

  isSaving.value = true
  try {
    const { error } = await useApi('/api/auth/change-password', {
      method: 'PATCH',
      body: {
        oldPassword: currentPassword.value,
        newPassword: newPassword.value,
      },
    })

    if (error.value)
      return showSnackbar(error.value?.data?.message || t('settings.security.snackbar.change_password_failed'), 'error')

    showSnackbar(t('settings.security.snackbar.change_password_success'), 'success')

    // reset fields after success
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  }
  catch (err) {
    showSnackbar(t('settings.security.snackbar.change_password_failed'), 'error')
  }
  finally {
    isSaving.value = false
  }
}

const passwordRequirements = computed(() => ([
  t('settings.security.password_requirements.min_length'),
  t('settings.security.password_requirements.lowercase'),
  t('settings.security.password_requirements.number_symbol_space'),
]))
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard :title="t('settings.security.title')">
        <VForm ref="formRef">
          <VCardText class="pt-0">
            <VRow>
              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="currentPassword"
                  :type="isCurrentPasswordVisible ? 'text' : 'password'"
                  :append-inner-icon="isCurrentPasswordVisible ? 'tabler-eye-off' : 'tabler-eye'"
                  :label="t('settings.security.fields.current_password')"
                  autocomplete="on"
                  placeholder="············"
                  :rules="[requiredValidator]"
                  @click:append-inner="isCurrentPasswordVisible = !isCurrentPasswordVisible"
                />
              </VCol>
            </VRow>

            <VRow>
              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="newPassword"
                  :type="isNewPasswordVisible ? 'text' : 'password'"
                  :append-inner-icon="isNewPasswordVisible ? 'tabler-eye-off' : 'tabler-eye'"
                  :label="t('settings.security.fields.new_password')"
                  autocomplete="on"
                  placeholder="············"
                  :rules="[requiredValidator, passwordValidator]"
                  @click:append-inner="isNewPasswordVisible = !isNewPasswordVisible"
                />
              </VCol>

              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="confirmPassword"
                  :type="isConfirmPasswordVisible ? 'text' : 'password'"
                  :append-inner-icon="isConfirmPasswordVisible ? 'tabler-eye-off' : 'tabler-eye'"
                  :label="t('settings.security.fields.confirm_new_password')"
                  autocomplete="on"
                  placeholder="············"
                  :rules="[(val:any) => confirmPasswordValidator(val, newPassword)]"
                  @click:append-inner="isConfirmPasswordVisible = !isConfirmPasswordVisible"
                />
              </VCol>
            </VRow>
          </VCardText>

          <VCardText>
            <h6 class="text-base font-weight-medium mb-3">
              {{ t('settings.security.password_requirements.title') }}
            </h6>

            <VList class="card-list">
              <VListItem
                v-for="(item, i) in passwordRequirements"
                :key="i"
                :title="item"
                class="text-medium-emphasis"
              >
                <template #prepend>
                  <VIcon
                    size="8"
                    icon="tabler-circle"
                    class="me-3"
                  />
                </template>
              </VListItem>
            </VList>
          </VCardText>

          <VCardText class="d-flex flex-wrap gap-4">
            <VBtn
              :loading="isSaving"
              :disabled="isSaving"
              @click="onSave"
            >
              {{ t('settings.actions.save_changes') }}
            </VBtn>

            <VBtn
              type="reset"
              color="secondary"
              variant="tonal"
            >
              {{ t('settings.actions.reset') }}
            </VBtn>
          </VCardText>
        </VForm>
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

<style lang="scss" scoped>
.card-list {
  --v-card-list-gap: 5px;
}
</style>
