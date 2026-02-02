<script setup>
import { useI18n } from 'vue-i18n'
import { useApi } from '@/composables/useApi'

definePageMeta({
  authed: true,
  admin: true,
})

const { t } = useI18n({ useScope: 'global' })

const loading = ref(false)
const saving = ref(false)
const errorText = ref('')

const homepageConfig = ref({ catalog: null })

const selectedFile = ref(null)
const fileName = ref('')

const snackbar = ref({ show: false, text: '', color: 'success' })

const showSnackbar = (text, color = 'success') => {
  snackbar.value = { show: true, text, color }
}

async function fetchHomepageConfig() {
  loading.value = true
  errorText.value = ''

  try {
    const { data, error } = await useApi('/api/admin/homepage', { method: 'GET' })

    if (error.value)
      throw error.value

    homepageConfig.value = data.value?.data ?? { catalog: null }
  }
  catch (err) {
    console.error('Failed to fetch homepage config:', err)
    errorText.value = t('management.homepage.messages.load_failed')
  }
  finally {
    loading.value = false
  }
}

function resetSelection() {
  selectedFile.value = null
  fileName.value = ''
}

function onFileChange(files) {
  const file = Array.isArray(files) ? files[0] : files
  if (!file) {
    resetSelection()

    return
  }

  selectedFile.value = file
  fileName.value = file?.name || ''
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => reject(new Error('FileReader failed'))
    reader.onload = () => resolve(String(reader.result || ''))

    reader.readAsDataURL(file)
  })
}

async function uploadCatalog() {
  if (!selectedFile.value) {
    showSnackbar(t('management.homepage.upload.hint'), 'warning')

    return
  }

  saving.value = true
  errorText.value = ''

  try {
    const dataUrl = await fileToDataUrl(selectedFile.value)

    const { data, error } = await useApi('/api/admin/homepage/catalog', {
      method: 'PUT',
      body: {
        file: dataUrl,
        filename: fileName.value || 'catalog.pdf',
      },
    })

    if (error.value)
      throw error.value

    // API returns the catalog file metadata as { data: {...} }
    homepageConfig.value = { ...(homepageConfig.value || {}), catalog: data.value?.data ?? null }

    showSnackbar(t('management.homepage.messages.upload_success'), 'success')
    resetSelection()
  }
  catch (err) {
    console.error('Catalog upload failed:', err)
    showSnackbar(t('management.homepage.messages.upload_failed'), 'error')
  }
  finally {
    saving.value = false
  }
}

onMounted(() => {
  fetchHomepageConfig()
})
</script>

<template>
  <VContainer>
    <div class="d-flex align-center justify-space-between gap-4 mb-6">
      <div>
        <h1 class="text-h5 font-weight-bold mb-1">
          {{ t('management.homepage.title') }}
        </h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          {{ t('management.homepage.subtitle') }}
        </p>
      </div>

      <VBtn
        variant="tonal"
        color="primary"
        :loading="loading"
        @click="fetchHomepageConfig"
      >
        <VIcon
          icon="tabler-refresh"
          class="me-2"
        />
        Refresh
      </VBtn>
    </div>

    <VAlert
      v-if="errorText"
      type="error"
      variant="tonal"
      class="mb-6"
    >
      {{ errorText }}
    </VAlert>

    <VCard
      variant="flat"
      class="mb-6"
    >
      <VCardText class="pa-6">
        <div class="text-subtitle-1 font-weight-bold mb-3">
          {{ t('management.homepage.current_catalog') }}
        </div>

        <div
          v-if="homepageConfig?.catalog"
          class="d-flex flex-wrap align-center gap-3"
        >
          <VBtn
            color="primary"
            variant="outlined"
            :href="homepageConfig.catalog.url"
            target="_blank"
            rel="noopener noreferrer"
          >
            <VIcon
              icon="tabler-file-type-pdf"
              class="me-2"
            />
            {{ homepageConfig.catalog.filename || 'catalog.pdf' }}
          </VBtn>

          <div class="text-caption text-medium-emphasis">
            {{ new Date(homepageConfig.catalog.updatedAt).toLocaleString() }}
          </div>
        </div>

        <div
          v-else
          class="text-body-2 text-medium-emphasis"
        >
          {{ t('management.homepage.no_catalog') }}
        </div>
      </VCardText>
    </VCard>

    <VCard variant="flat">
      <VCardText class="pa-6">
        <div class="text-subtitle-1 font-weight-bold mb-3">
          {{ t('management.homepage.upload.label') }}
        </div>

        <VFileInput
          accept="application/pdf"
          prepend-icon="tabler-upload"
          variant="outlined"
          :label="t('management.homepage.upload.label')"
          :hint="t('management.homepage.upload.hint')"
          persistent-hint
          @update:model-value="onFileChange"
        />

        <div class="d-flex flex-wrap gap-3 mt-4">
          <VBtn
            color="primary"
            :loading="saving"
            :disabled="saving"
            @click="uploadCatalog"
          >
            <VIcon
              icon="tabler-upload"
              class="me-2"
            />
            {{ homepageConfig?.catalog ? t('management.homepage.upload.button_replace') : t('management.homepage.upload.button_upload') }}
          </VBtn>

          <VBtn
            variant="text"
            color="secondary"
            :disabled="saving"
            @click="resetSelection"
          >
            {{ t('common.cancel') }}
          </VBtn>
        </div>
      </VCardText>
    </VCard>

    <VSnackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      timeout="2500"
    >
      {{ snackbar.text }}
    </VSnackbar>
  </VContainer>
</template>
