<script setup lang="ts">
import communes from '@/data/commune.json'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from 'vue-i18n'

interface Props {
  isDialogVisible: boolean
  initialNote?: string
  productId?: string
}

interface Emit {
  (e: 'update:isDialogVisible', value: boolean): void
  (e: 'submitted', deal: any): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emit>()

const { t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()

const user = computed(() => authStore.user as any)

const submitting = ref(false)
const snackbar = ref({ show: false, message: '', color: 'success' })

const showSnackbar = (message: string, color: string = 'success') => {
  snackbar.value = { show: true, message, color }
}

const wilayaGroups = (communes || []).filter((g: any) => Array.isArray(g) && g.length)

const stateOptions = computed(() => {
  return wilayaGroups.map((g: any[]) => ({ title: String(g[0].name), value: String(g[0].name) }))
})

const cityOptions = computed(() => {
  if (!form.value.contact.state)
    return []

  const group = wilayaGroups.find((g: any[]) => String(g[0].name) === String(form.value.contact.state))

  return group ? group.map((c: any) => ({ title: String(c.name), value: String(c.name) })) : []
})

const form = ref({
  note: props.initialNote || '',
  contact: {
    address: user.value?.address || '',
    state: user.value?.state || '',
    city: user.value?.city || '',
  },
})

watch(() => form.value.contact.state, () => {
  form.value.contact.city = ''
})

watch(() => props.initialNote, v => {
  if (typeof v === 'string' && !form.value.note)
    form.value.note = v
})

const isAuthed = computed(() => Boolean(authStore.token))

const hasProduct = computed(() => Boolean(String(props.productId || '').trim()))

const canSubmit = computed(() => {
  if (!isAuthed.value)
    return false

  if (!hasProduct.value)
    return false

  const note = String(form.value.note || '').trim()
  const address = String(form.value.contact.address || '').trim()
  const state = String(form.value.contact.state || '').trim()
  const city = String(form.value.contact.city || '').trim()

  const hasNote = note.length > 0
  const hasAnyContactField = Boolean(address || state || city)

  return hasNote || hasAnyContactField
})

const updateModelValue = (val: boolean) => {
  emit('update:isDialogVisible', val)
}

async function submitDealRequest() {
  if (!canSubmit.value)
    return

  if (!hasProduct.value) {
    showSnackbar(t('deals.snackbar.product_required'), 'error')

    return
  }

  if (!isAuthed.value) {
    showSnackbar(t('deals.snackbar.auth_required'), 'error')
    await navigateTo('/login')

    return
  }

  const note = String(form.value.note || '').trim()
  const address = String(form.value.contact.address || '').trim()
  const state = String(form.value.contact.state || '').trim()
  const city = String(form.value.contact.city || '').trim()

  const contact: Record<string, any> = {}

  if (address)
    contact.address = address
  if (state)
    contact.state = state
  if (city)
    contact.city = city

  const body: Record<string, any> = {
    productId: props.productId,
    note: note || undefined,
    contact: Object.keys(contact).length ? contact : undefined,
  }

  submitting.value = true
  try {
    const { data, error } = await useApi('/api/deals', {
      method: 'POST',
      body,
    })

    if (error.value) {
      showSnackbar(t('deals.snackbar.submit_failed'), 'error')
      console.error('Deal request failed:', error.value)

      return
    }

    const apiData = data.value as any
    const id = apiData?.data?.id || apiData?.id
    const submittedMsg = id ? `${t('deals.snackbar.submitted')} (#${id})` : t('deals.snackbar.submitted')

    showSnackbar(submittedMsg, 'success')
    emit('submitted', apiData?.data ?? apiData)
    updateModelValue(false)
  }
  catch (e) {
    console.error(e)
    showSnackbar(t('deals.snackbar.submit_failed'), 'error')
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <VDialog
    max-width="820"
    :model-value="props.isDialogVisible"
    @update:model-value="updateModelValue"
  >
    <VCard>
      <VCardTitle class="d-flex align-center justify-space-between">
        <span>{{ t('deals.dialog.title') }}</span>
        <VBtn
          icon="tabler-x"
          variant="text"
          @click="updateModelValue(false)"
        />
      </VCardTitle>

      <VDivider />

      <VCardText>
        <VAlert
          v-if="!isAuthed"
          type="warning"
          variant="tonal"
          class="mb-4"
        >
          {{ t('deals.dialog.auth_required') }}
        </VAlert>

        <VAlert
          v-else-if="!hasProduct"
          type="error"
          variant="tonal"
          class="mb-4"
        >
          {{ t('deals.dialog.product_required') }}
        </VAlert>

        <VRow>
          <VCol
            cols="12"
            md="7"
          >
            <AppTextarea
              v-model="form.note"
              :label="t('deals.fields.message.label')"
              :placeholder="t('deals.fields.message.placeholder')"
              auto-grow
              rows="5"
            />
          </VCol>

          <VCol
            cols="12"
            md="5"
          >
            <h6 class="text-h6 mb-3">
              {{ t('deals.contact.title') }}
            </h6>

            <VRow>
              <VCol cols="12">
                <AppTextField
                  v-model="form.contact.address"
                  :label="t('deals.fields.address')"
                />
              </VCol>
              <VCol cols="6">
                <AppSelect
                  v-model="form.contact.state"
                  :items="stateOptions"
                  :label="t('deals.fields.state')"
                  :placeholder="t('deals.fields.state_placeholder')"
                />
              </VCol>
              <VCol cols="6">
                <AppSelect
                  v-model="form.contact.city"
                  :items="cityOptions"
                  :disabled="!form.contact.state"
                  :label="t('deals.fields.city')"
                  :placeholder="t('deals.fields.city_placeholder')"
                />
              </VCol>
            </VRow>
          </VCol>
        </VRow>
      </VCardText>

      <VDivider />

      <VCardActions class="pa-4">
        <VSpacer />
        <VBtn
          variant="tonal"
          @click="updateModelValue(false)"
        >
          {{ t('common.cancel') }}
        </VBtn>
        <VBtn
          color="primary"
          :loading="submitting"
          :disabled="!canSubmit"
          @click="submitDealRequest"
        >
          {{ t('deals.actions.submit') }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VSnackbar
    v-model="snackbar.show"
    :color="snackbar.color"
    timeout="5000"
    location="bottom end"
  >
    {{ snackbar.message }}
  </VSnackbar>
</template>
