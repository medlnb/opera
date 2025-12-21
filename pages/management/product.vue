<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useValidators } from '@/utils/validators'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

definePageMeta({
  admin: true,
})

const authStore = useAuthStore()
const config = useRuntimeConfig()
const { t } = useI18n({ useScope: 'global' })

const route = useRoute()
const isEdit = computed(() => !!route.query.id)

useHead(() => ({
  title: isEdit.value ? t('management.products.editor.title_edit') : t('management.products.editor.title_create'),
}))
const snackbar = ref({ show: false, text: '', color: 'error' })
const saving = ref(false)
const uploadingCover = ref(false)
const uploadingAvatar = ref(false)
const uploadingTechnicalFile = ref(false)
const loadingProduct = ref(false)
const formRef = ref()

const technicalFileFilename = ref<string>('')
const detachTechnicalFile = ref(false)

// Validators
const { requiredValidator } = useValidators()
const arrayRequired = (val: unknown) => (Array.isArray(val) && val.length > 0) || t('management.products.editor.validation.at_least_one_item')

const form = reactive({
  imageUrl: '',
  avatar: '',
  title: '',
  type: null as string | null,
  definition: '',
  technicalFile: null as string | null,
  destination: [] as string[],
  properties: [] as string[],
  variances: [{ quantity: '', price: 0 }] as { quantity: string; price: number }[],

  // Caracteristiques technique
  densite: '',
  rendement: '',
  tempsSachage: '',
  aspectdifilmsec: [] as string[],
  teinte: '',
  viscosite: '',

  // Mise en oeuvre
  dilution: '',
  supports: [] as string[],
  materielApplication: [] as string[],
  nettoyageMateriel: '',
  preparationSupport: '',
  colors: [{ name: '', code: '#000000' }] as { name: string; code: string }[],
})

// UI error highlight for missing assets
const showAssetErrors = ref(false)
const coverInvalid = computed(() => showAssetErrors.value && !form.imageUrl)
const avatarInvalid = computed(() => showAssetErrors.value && !form.avatar)

const TYPE_OPTIONS = ['decor', 'buildings', 'coating']
const DESTINATION_OPTIONS = ['Habitations', 'Bureaux', 'Hotel', 'Restaurants', 'Showroom', 'Magasins']
const SUPPORT_OPTIONS = ['Platre', 'Ciment', 'Enduit', 'Brique']
const MATERIEL_OPTIONS = ['Eponge nature', 'tampon décore', 'Lisseuse', 'couteau', 'brosse', 'Pinceau', 'Lisseuse inox', 'Pinceau plat spalter', 'spatule plasque']
const ASPECT_OPTIONS = ['Mitallise', 'Brillant', 'Soyeux', 'Lumineux', 'Marbre Ultra Brillant']

const typeOptions = computed(() => TYPE_OPTIONS.map(value => ({
  title: t(`management.products.types.${value}`),
  value,
})))

const destinationOptions = computed(() => [
  { title: t('products.filters.destination.habitations'), value: 'Habitations' },
  { title: t('products.filters.destination.offices'), value: 'Bureaux' },
  { title: t('products.filters.destination.hotel'), value: 'Hotel' },
  { title: t('products.filters.destination.restaurants'), value: 'Restaurants' },
  { title: t('products.filters.destination.showroom'), value: 'Showroom' },
  { title: t('products.filters.destination.stores'), value: 'Magasins' },
])

const supportOptions = computed(() => [
  { title: t('products.filters.support.plaster'), value: 'Platre' },
  { title: t('products.filters.support.cement'), value: 'Ciment' },
  { title: t('products.filters.support.render'), value: 'Enduit' },
  { title: t('products.filters.support.brick'), value: 'Brique' },
])

const materielOptions = computed(() => [
  { title: t('management.products.editor.application.material.sponge_nature'), value: 'Eponge nature' },
  { title: t('management.products.editor.application.material.decorative_stamp'), value: 'tampon décore' },
  { title: t('management.products.editor.application.material.trowel'), value: 'Lisseuse' },
  { title: t('management.products.editor.application.material.knife'), value: 'couteau' },
  { title: t('management.products.editor.application.material.brush'), value: 'brosse' },
  { title: t('management.products.editor.application.material.paintbrush'), value: 'Pinceau' },
  { title: t('management.products.editor.application.material.stainless_trowel'), value: 'Lisseuse inox' },
  { title: t('management.products.editor.application.material.flat_brush_spalter'), value: 'Pinceau plat spalter' },
  { title: t('management.products.editor.application.material.plastic_spatula'), value: 'spatule plasque' },
])

const aspectOptions = computed(() => [
  { title: t('management.products.editor.technical.aspect.metallized'), value: 'Mitallise' },
  { title: t('management.products.editor.technical.aspect.glossy'), value: 'Brillant' },
  { title: t('management.products.editor.technical.aspect.silky'), value: 'Soyeux' },
  { title: t('management.products.editor.technical.aspect.luminous'), value: 'Lumineux' },
  { title: t('management.products.editor.technical.aspect.ultra_gloss_marble'), value: 'Marbre Ultra Brillant' },
])

onMounted(async () => {
  if (!isEdit.value)
    return
  try {
    loadingProduct.value = true

    const res = await fetch(`${config.public.apiBaseUrl}/api/products/${String(route.query.id)}`, {
      headers: {
        'Content-Type': 'application/json',
        'authorization': `Bearer ${authStore.token}`,
      },
    })

    const data = await res.json()
    const p = data?.data
    if (p) {
      form.imageUrl = p.imageUrl || ''
      form.avatar = p.avatar || ''
      form.title = p.title || ''
      form.type = p.type || null
      form.definition = p.definition || ''
      form.destination = Array.isArray(p.destination) ? p.destination : []
      form.properties = Array.isArray(p.properties) ? p.properties : []
      form.variances = Array.isArray(p.variances) && p.variances.length ? p.variances.map((v: any) => ({ quantity: v.quantity || '', price: Number(v.price) || 0 })) : [{ quantity: '', price: 0 }]
      form.densite = p.densite || ''
      form.rendement = p.rendement || ''
      form.tempsSachage = p.tempsSachage || ''
      form.aspectdifilmsec = Array.isArray(p.aspectdifilmsec) ? p.aspectdifilmsec : []
      form.teinte = p.teinte || ''
      form.viscosite = p.viscosite || ''
      form.dilution = p.dilution || ''
      form.supports = Array.isArray(p.supports) ? p.supports : []
      form.materielApplication = Array.isArray(p.materielApplication) ? p.materielApplication : []
      form.nettoyageMateriel = p.nettoyageMateriel || ''
      form.preparationSupport = p.preparationSupport || ''
      form.colors = Array.isArray(p.colors) && p.colors.length ? p.colors.map((c: any) => ({ name: c.name || '', code: c.code || '#000000' })) : [{ name: '', code: '#000000' }]

      // Optional technical PDF
      if (p.technicalFile) {
        form.technicalFile = p.technicalFile?._id || p.technicalFile?.id || p.technicalFile
        technicalFileFilename.value = p.technicalFile?.filename || ''
      }
      else {
        form.technicalFile = null
        technicalFileFilename.value = ''
      }
      detachTechnicalFile.value = false
    }
  }
  catch (err) {
    snackbar.value = { show: true, text: t('management.products.editor.snackbar.load_failed'), color: 'error' }
  }
  finally {
    loadingProduct.value = false
  }
})

// Upload image helper
async function uploadImage(file: File): Promise<string | null> {
  return new Promise(resolve => {
    const reader = new FileReader()

    reader.onload = async () => {
      try {
        const dataUri = reader.result as string
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (authStore.token)
          headers.Authorization = `Bearer ${authStore.token}`

        const res = await fetch(`${config.public.apiBaseUrl}/api/image`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ image: dataUri }),
        })

        if (!res.ok)
          throw new Error('Upload failed')
        const data = await res.json()

        resolve(data.id)
      }
      catch {
        snackbar.value = { show: true, text: t('management.products.editor.snackbar.image_upload_failed'), color: 'error' }
        resolve(null)
      }
    }
    reader.readAsDataURL(file)
  })
}

async function uploadTechnicalPdf(file: File): Promise<{ id: string; filename: string } | null> {
  if (!file || file.type !== 'application/pdf') {
    snackbar.value = { show: true, text: t('management.products.editor.snackbar.pdf_select_required'), color: 'error' }

    return null
  }

  return new Promise(resolve => {
    const reader = new FileReader()

    reader.onload = async () => {
      try {
        const dataUri = reader.result as string

        const res = await fetch(`${config.public.apiBaseUrl}/api/technical-files`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'authorization': `Bearer ${authStore.token}`,
          },
          body: JSON.stringify({
            file: dataUri,
            filename: file.name,
          }),
        })

        if (!res.ok)
          throw new Error('Upload failed')

        const data = await res.json()

        resolve({ id: data.id, filename: data.filename })
      }
      catch {
        snackbar.value = { show: true, text: t('management.products.editor.snackbar.pdf_upload_failed'), color: 'error' }
        resolve(null)
      }
    }

    reader.onerror = () => {
      snackbar.value = { show: true, text: t('management.products.editor.snackbar.pdf_read_failed'), color: 'error' }
      resolve(null)
    }

    reader.readAsDataURL(file)
  })
}

async function selectTechnicalFile() {
  const input = document.createElement('input')

  input.type = 'file'
  input.accept = 'application/pdf'
  input.onchange = async e => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file)
      return

    uploadingTechnicalFile.value = true

    const uploaded = await uploadTechnicalPdf(file)
    if (uploaded) {
      form.technicalFile = uploaded.id
      technicalFileFilename.value = uploaded.filename
      detachTechnicalFile.value = false
    }
    uploadingTechnicalFile.value = false
  }

  input.click()
}

function detachTechnicalFileFromProduct() {
  form.technicalFile = null
  technicalFileFilename.value = ''
  detachTechnicalFile.value = true
}

function handleCoverDrop(e: DragEvent) {
  e.preventDefault()

  const file = e.dataTransfer?.files[0]
  if (file && file.type.startsWith('image/'))
    uploadCover(file)
}

function handleAvatarDrop(e: DragEvent) {
  e.preventDefault()

  const file = e.dataTransfer?.files[0]
  if (file && file.type.startsWith('image/'))
    uploadAvatar(file)
}

async function uploadCover(file: File) {
  uploadingCover.value = true

  const id = await uploadImage(file)
  if (id)
    form.imageUrl = id
  uploadingCover.value = false
}

async function uploadAvatar(file: File) {
  uploadingAvatar.value = true

  const id = await uploadImage(file)
  if (id)
    form.avatar = id
  uploadingAvatar.value = false
}

function selectCoverFile() {
  const input = document.createElement('input')

  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = e => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file)
      uploadCover(file)
  }
  input.click()
}

function selectAvatarFile() {
  const input = document.createElement('input')

  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = e => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file)
      uploadAvatar(file)
  }
  input.click()
}

function addVariance() {
  form.variances.push({ quantity: '', price: 0 })
}
function removeVariance(index: number) {
  form.variances.splice(index, 1)
}

function addColor() {
  form.colors.push({ name: '', code: '#000000' })
}
function removeColor(index: number) {
  form.colors.splice(index, 1)
}

async function publishProduct() {
  // Trigger asset error UI immediately on submit attempt
  showAssetErrors.value = true

  // Validate fields via VForm first
  if (formRef.value && typeof formRef.value.validate === 'function') {
    const v = formRef.value.validate()
    if (v && typeof v.then === 'function') {
      const r = await v
      if (!r.valid)
        return snackbar.value = { show: true, text: t('management.products.editor.snackbar.fix_errors'), color: 'error' }
    }
  }

  // Manual checks for assets and nested arrays according to schema
  if (!form.imageUrl)
    snackbar.value = { show: true, text: t('management.products.editor.snackbar.cover_required'), color: 'error' }

  if (!form.avatar)
    snackbar.value = { show: true, text: t('management.products.editor.snackbar.avatar_required'), color: 'error' }

  if (!Array.isArray(form.colors) || form.colors.length === 0)
    snackbar.value = { show: true, text: t('management.products.editor.snackbar.color_required'), color: 'error' }

  const invalidColor = form.colors.find(c => !c.name || !c.code)
  if (invalidColor)
    snackbar.value = { show: true, text: t('management.products.editor.snackbar.color_invalid'), color: 'error' }

  if (!Array.isArray(form.variances) || form.variances.length === 0)
    snackbar.value = { show: true, text: t('management.products.editor.snackbar.variance_required'), color: 'error' }

  const invalidVariance = form.variances.find(v => !v.quantity || Number(v.price) <= 0)
  if (invalidVariance)
    snackbar.value = { show: true, text: t('management.products.editor.snackbar.variance_invalid'), color: 'error' }

  saving.value = true
  try {
    const body = {
      ...form,
      variances: form.variances.filter(v => v.quantity),
      colors: form.colors.filter(c => c.name && c.code),

      // Only send technicalFile when set, unless admin explicitly detached it.
      ...(form.technicalFile ? { technicalFile: form.technicalFile } : {}),
      ...(detachTechnicalFile.value ? { technicalFile: null } : {}),
    }

    const url = isEdit.value ? `${config.public.apiBaseUrl}/api/products/${String(route.query.id)}` : `${config.public.apiBaseUrl}/api/products`
    const method = isEdit.value ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'authorization': `Bearer ${authStore.token}`,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok)
      throw new Error('Failed to save product')

    snackbar.value = { show: true, text: isEdit.value ? t('management.products.editor.snackbar.updated') : t('management.products.editor.snackbar.created'), color: 'success' }
    navigateTo('/management')
  }
  catch (err) {
    snackbar.value = { show: true, text: t('management.products.editor.snackbar.save_failed'), color: 'error' }
  }
  finally {
    saving.value = false
  }
}

function discard() {
  navigateTo('/management')
}
</script>

<template>
  <div class="d-flex flex-wrap justify-start justify-sm-space-between gap-y-4 gap-x-6 mb-6">
    <div class="d-flex flex-column justify-center">
      <h4 class="text-h4 font-weight-medium">
        {{ isEdit ? t('management.products.editor.title_edit') : t('management.products.editor.title_create') }}
      </h4>
      <span>{{ isEdit ? t('management.products.editor.subtitle_edit') : t('management.products.editor.subtitle_create') }}</span>
    </div>
    <div class="d-flex gap-4 align-center flex-wrap">
      <VBtn
        variant="tonal"
        color="secondary"
        @click="discard"
      >
        {{ t('management.products.editor.actions.discard') }}
      </VBtn>
      <VBtn
        :loading="saving"
        @click="publishProduct"
      >
        {{ isEdit ? t('management.products.editor.actions.save_changes') : t('management.products.editor.actions.publish') }}
      </VBtn>
    </div>
  </div>

  <VCard
    class="mb-6"
    :title="t('management.products.editor.sections.preview')"
  >
    <VCardText>
      <div class="preview-card">
        <div
          class="preview-cover"
          :class="{ 'error-outline': coverInvalid }"
          @drop="handleCoverDrop"
          @dragover.prevent
          @click="selectCoverFile"
        >
          <template v-if="uploadingCover">
            <div class="cover-placeholder d-flex align-center justify-center">
              <VProgressCircular
                indeterminate
                color="primary"
              />
            </div>
          </template>
          <template v-else-if="form.imageUrl">
            <VImg
              :src="`${config.public.apiBaseUrl}/api/image?id=${form.imageUrl}`"
              height="200"
              cover
            />
            <VBtn
              size="x-small"
              icon
              variant="flat"
              color="error"
              class="cover-remove-btn"
              @click.stop="form.imageUrl = ''"
            >
              <VIcon
                icon="tabler-x"
                size="14"
              />
            </VBtn>
          </template>
          <template v-else>
            <div class="cover-placeholder d-flex flex-column align-center justify-center">
              <VIcon
                icon="tabler-photo"
                size="40"
                class="text-disabled"
              />
              <span class="text-body-2 text-disabled">{{ t('management.products.editor.preview.click_to_add_cover') }}</span>
            </div>
          </template>

          <div
            class="preview-avatar"
            :class="{ 'error-outline': avatarInvalid }"
            @drop.stop="handleAvatarDrop"
            @dragover.prevent
            @click.stop="selectAvatarFile"
          >
            <template v-if="uploadingAvatar">
              <div class="avatar-placeholder d-flex align-center justify-center">
                <VProgressCircular
                  indeterminate
                  size="24"
                  color="primary"
                />
              </div>
            </template>
            <template v-else-if="form.avatar">
              <VImg
                :src="`${config.public.apiBaseUrl}/api/image?id=${form.avatar}`"
                height="75"
                width="75"
              />
              <VBtn
                size="x-small"
                icon
                variant="flat"
                color="error"
                class="avatar-remove-btn"
                @click.stop="form.avatar = ''"
              >
                <VIcon
                  icon="tabler-x"
                  size="12"
                />
              </VBtn>
            </template>
            <template v-else>
              <div class="avatar-placeholder d-flex flex-column align-center justify-center">
                <VIcon
                  icon="tabler-box"
                  size="24"
                  class="text-disabled"
                />
              </div>
            </template>
          </div>
        </div>

        <div class="pt-10 px-3 pb-3">
          <p
            v-if="coverInvalid"
            class="text-error text-caption mb-1"
          >
            {{ t('management.products.editor.preview.cover_required') }}
          </p>
          <p
            v-if="avatarInvalid"
            class="text-error text-caption mb-0"
          >
            {{ t('management.products.editor.preview.avatar_required') }}
          </p>
        </div>
      </div>
    </VCardText>
  </VCard>

  <VForm ref="formRef">
    <VRow>
      <VCol md="8">
        <!-- Product Information -->
        <VCard
          class="mb-6"
          :title="t('management.products.editor.sections.product_information')"
        >
          <VCardText>
            <VRow>
              <VCol cols="12">
                <AppTextField
                  v-model="form.title"
                  :label="t('management.products.editor.fields.title')"
                  :placeholder="t('management.products.editor.fields.title_placeholder')"
                  :rules="[requiredValidator]"
                />
              </VCol>
              <VCol cols="12">
                <VTextarea
                  v-model="form.definition"
                  :label="t('management.products.editor.fields.definition')"
                  :placeholder="t('management.products.editor.fields.definition_placeholder')"
                  rows="3"
                  :rules="[requiredValidator]"
                />
              </VCol>
              <VCol
                cols="12"
                md="6"
              >
                <VLabel class="mb-1">
                  {{ t('management.products.editor.fields.type') }}
                </VLabel>
                <VSelect
                  v-model="form.type"
                  :items="typeOptions"
                  item-title="title"
                  item-value="value"
                  :placeholder="t('management.products.filters.select_type')"
                  :rules="[requiredValidator]"
                />
              </VCol>
              <VCol
                cols="12"
                md="6"
              >
                <VLabel class="mb-1">
                  {{ t('products.filters.destination.title') }}
                </VLabel>
                <VSelect
                  v-model="form.destination"
                  :items="destinationOptions"
                  item-title="title"
                  item-value="value"
                  multiple
                  chips
                  closable-chips
                  :rules="[arrayRequired]"
                />
              </VCol>
              <VCol
                cols="12"
                md="6"
              >
                <VLabel class="mb-1">
                  {{ t('management.products.editor.fields.properties') }}
                </VLabel>
                <VCombobox
                  v-model="form.properties"
                  multiple
                  chips
                  closable-chips
                  :placeholder="t('management.products.editor.fields.properties_placeholder')"
                  :rules="[arrayRequired]"
                />
              </VCol>
            </VRow>
          </VCardText>
        </VCard>

        <!-- Caracteristiques Technique -->
        <VCard
          class="mb-6"
          :title="t('management.products.editor.sections.technical_characteristics')"
        >
          <VCardText>
            <VRow>
              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="form.densite"
                  :label="t('management.products.editor.technical.density')"
                  :placeholder="t('management.products.editor.placeholders.example', { example: '1.2' })"
                  :rules="[requiredValidator]"
                />
              </VCol>
              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="form.rendement"
                  :label="t('management.products.editor.technical.coverage')"
                  :placeholder="t('management.products.editor.placeholders.example', { example: '10m²/L' })"
                  :rules="[requiredValidator]"
                />
              </VCol>
              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="form.tempsSachage"
                  :label="t('management.products.editor.technical.drying_time')"
                  :placeholder="t('management.products.editor.placeholders.example', { example: '2h' })"
                  :rules="[requiredValidator]"
                />
              </VCol>
              <VCol
                cols="12"
                md="6"
              >
                <VLabel class="mb-1">
                  {{ t('management.products.editor.technical.aspect.title') }}
                </VLabel>
                <VSelect
                  v-model="form.aspectdifilmsec"
                  :items="aspectOptions"
                  item-title="title"
                  item-value="value"
                  multiple
                  chips
                  closable-chips
                  :rules="[arrayRequired]"
                />
              </VCol>

              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="form.viscosite"
                  :label="t('management.products.editor.technical.viscosity_optional')"
                  :placeholder="t('management.products.editor.placeholders.example', { example: '100 KU' })"
                />
              </VCol>
            </VRow>
          </VCardText>
        </VCard>

        <!-- Mise en Oeuvre -->
        <VCard
          class="mb-6"
          :title="t('management.products.editor.sections.application')"
        >
          <VCardText>
            <VRow>
              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="form.dilution"
                  :label="t('management.products.editor.application.dilution')"
                  :placeholder="t('management.products.editor.placeholders.example', { example: '5-10% eau' })"
                  :rules="[requiredValidator]"
                />
              </VCol>
              <VCol
                cols="12"
                md="6"
              >
                <VLabel class="mb-1">
                  {{ t('products.filters.support.title') }}
                </VLabel>
                <VSelect
                  v-model="form.supports"
                  :items="supportOptions"
                  item-title="title"
                  item-value="value"
                  multiple
                  chips
                  closable-chips
                  :rules="[arrayRequired]"
                />
              </VCol>
              <VCol
                cols="12"
                md="6"
              >
                <VLabel class="mb-1">
                  {{ t('management.products.editor.application.material.title') }}
                </VLabel>
                <VSelect
                  v-model="form.materielApplication"
                  :items="materielOptions"
                  item-title="title"
                  item-value="value"
                  multiple
                  chips
                  closable-chips
                  :rules="[arrayRequired]"
                />
              </VCol>
              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="form.nettoyageMateriel"
                  :label="t('management.products.editor.application.cleaning_optional')"
                  :placeholder="t('management.products.editor.placeholders.example', { example: t('management.products.editor.placeholders.water') })"
                />
              </VCol>
              <VCol cols="12">
                <VTextarea
                  v-model="form.preparationSupport"
                  :label="t('management.products.editor.application.surface_preparation_optional')"
                  rows="2"
                />
              </VCol>
            </VRow>
          </VCardText>
        </VCard>
      </VCol>

      <VCol
        md="4"
        cols="12"
      >
        <!-- Technical File (PDF) -->
        <VCard
          :title="t('management.products.editor.technical_file.title')"
          class="mb-6"
        >
          <VCardText>
            <div class="d-flex flex-column gap-3">
              <div class="d-flex flex-wrap gap-2 align-center">
                <VBtn
                  :loading="uploadingTechnicalFile"
                  variant="tonal"
                  prepend-icon="tabler-file-type-pdf"
                  @click="selectTechnicalFile"
                >
                  {{ form.technicalFile ? t('management.products.editor.technical_file.replace') : t('management.products.editor.technical_file.upload') }}
                </VBtn>

                <VBtn
                  v-if="form.technicalFile"
                  color="primary"
                  variant="outlined"
                  prepend-icon="tabler-download"
                  :href="`${config.public.apiBaseUrl}/api/technical-files?id=${form.technicalFile}`"
                  target="_blank"
                  rel="noopener"
                >
                  {{ t('management.products.editor.technical_file.download') }}
                </VBtn>

                <VBtn
                  v-if="form.technicalFile"
                  color="error"
                  variant="text"
                  prepend-icon="tabler-trash"
                  @click="detachTechnicalFileFromProduct"
                >
                  {{ t('management.products.editor.technical_file.detach') }}
                </VBtn>
              </div>

              <div class="text-caption text-medium-emphasis">
                <template v-if="form.technicalFile">
                  {{ t('management.products.editor.technical_file.attached') }} <strong>{{ technicalFileFilename || t('management.products.editor.technical_file.file_fallback') }}</strong>
                </template>
                <template v-else>
                  {{ t('management.products.editor.technical_file.optional_help') }}
                </template>
              </div>
            </div>
          </VCardText>
        </VCard>

        <!-- Colors -->
        <VCard :title="t('management.products.editor.sections.colors')">
          <VCardText>
            <div
              v-for="(c, idx) in form.colors"
              :key="idx"
              class="d-flex gap-2 align-center mb-3"
            >
              <AppTextField
                v-model="c.name"
                :label="t('management.products.editor.colors.name')"
                :placeholder="t('management.products.editor.colors.name_placeholder')"
                class="flex-grow-1"
                :rules="[requiredValidator]"
              />
              <div>
                <VLabel class="mb-1">
                  {{ t('management.products.editor.colors.code') }}
                </VLabel>
                <div>
                  <input
                    v-model="c.code"
                    type="color"
                    style=" border: none; block-size: 40px; cursor: pointer;inline-size: 50px;"
                  >
                </div>
              </div>
              <VBtn
                v-if="form.colors.length > 1"
                icon
                size="small"
                color="error"
                variant="text"
                @click="removeColor(idx)"
              >
                <VIcon icon="tabler-trash" />
              </VBtn>
            </div>
            <VBtn
              variant="tonal"
              @click="addColor"
            >
              {{ t('management.products.editor.colors.add') }}
            </VBtn>
          </VCardText>
        </VCard>

        <!-- Variances -->
        <VCard
          class="mt-6"
          :title="t('management.products.editor.sections.variances')"
        >
          <VCardText>
            <VRow
              v-for="(v, idx) in form.variances"
              :key="idx"
              class="mb-2"
              dense
            >
              <VCol :cols="form.variances.length > 1 ? 5 : 6">
                <AppTextField
                  v-model="v.quantity"
                  :label="t('management.products.editor.variances.quantity')"
                  :placeholder="t('management.products.editor.variances.quantity_placeholder')"
                  :rules="[requiredValidator]"
                />
              </VCol>
              <VCol :cols="form.variances.length > 1 ? 5 : 6">
                <AppTextField
                  v-model.number="v.price"
                  :label="t('management.products.editor.variances.price_dzd')"
                  type="number"
                  :rules="[requiredValidator]"
                  @input="v.price = Number(String(v.price).replace(/[^0-9]/g, ''))"
                />
              </VCol>
              <VCol
                v-if="form.variances.length > 1"
                cols="2"
                class="d-flex align-center"
              >
                <VBtn
                  icon
                  size="small"
                  color="error"
                  variant="text"
                  @click="removeVariance(idx)"
                >
                  <VIcon icon="tabler-trash" />
                </VBtn>
              </VCol>
            </VRow>
            <VBtn
              class="mt-2"
              variant="tonal"
              @click="addVariance"
            >
              {{ t('management.products.editor.variances.add') }}
            </VBtn>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>
  </VForm>

  <VSnackbar
    v-model="snackbar.show"
    :color="snackbar.color"
    timeout="3000"
  >
    {{ snackbar.text }}
  </VSnackbar>
</template>

<style lang="scss" scoped>
.preview-card {
  overflow: hidden;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
}

.preview-cover {
  position: relative;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.9;
  }

  .cover-placeholder {
    block-size: 200px;
    border-block-end: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  }

  .cover-remove-btn {
    position: absolute;
    inset-block-start: 8px;
    inset-inline-end: 8px;
  }
}

.preview-avatar {
  position: absolute;
  overflow: hidden;
  border-radius: 8px;
  block-size: 75px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 15%);
  cursor: pointer;
  inline-size: 75px;
  inset-block-end: -2rem;
  inset-inline-start: 1rem;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.05);
  }

  .avatar-placeholder {
    background: #d3d3d357;
    block-size: 100%;
    inline-size: 100%;
  }

  .avatar-remove-btn {
    position: absolute;
    inset-block-start: 2px;
    inset-inline-end: 2px;
  }
}

/* Error highlight for required assets */
.error-outline {
  outline: 2px solid rgb(var(--v-theme-error));
  outline-offset: -2px;
}
</style>
