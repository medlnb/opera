<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useValidators } from '@/utils/validators'

definePageMeta({
  admin: true,
})

const authStore = useAuthStore()
const config = useRuntimeConfig()
const snackbar = ref({ show: false, text: '', color: 'error' })
const saving = ref(false)
const uploadingCover = ref(false)
const uploadingAvatar = ref(false)
const uploadingTechnicalFile = ref(false)
const loadingProduct = ref(false)
const route = useRoute()
const isEdit = computed(() => !!route.query.id)
const formRef = ref()

const technicalFileFilename = ref<string>('')
const detachTechnicalFile = ref(false)

// Validators
const { requiredValidator } = useValidators()
const arrayRequired = (val: unknown) => (Array.isArray(val) && val.length > 0) || 'At least one item is required'

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
    snackbar.value = { show: true, text: 'Failed to load product', color: 'error' }
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
        snackbar.value = { show: true, text: 'Image upload failed', color: 'error' }
        resolve(null)
      }
    }
    reader.readAsDataURL(file)
  })
}

async function uploadTechnicalPdf(file: File): Promise<{ id: string; filename: string } | null> {
  if (!file || file.type !== 'application/pdf') {
    snackbar.value = { show: true, text: 'Please select a PDF file', color: 'error' }

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
        snackbar.value = { show: true, text: 'PDF upload failed', color: 'error' }
        resolve(null)
      }
    }

    reader.onerror = () => {
      snackbar.value = { show: true, text: 'Failed to read PDF file', color: 'error' }
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
        return snackbar.value = { show: true, text: 'Please fix the highlighted errors', color: 'error' }
    }
  }

  // Manual checks for assets and nested arrays according to schema
  if (!form.imageUrl)
    snackbar.value = { show: true, text: 'Cover image is required', color: 'error' }

  if (!form.avatar)
    snackbar.value = { show: true, text: 'Avatar is required', color: 'error' }

  if (!Array.isArray(form.colors) || form.colors.length === 0)
    snackbar.value = { show: true, text: 'At least one color is required', color: 'error' }

  const invalidColor = form.colors.find(c => !c.name || !c.code)
  if (invalidColor)
    snackbar.value = { show: true, text: 'Each color must have name and code', color: 'error' }

  if (!Array.isArray(form.variances) || form.variances.length === 0)
    snackbar.value = { show: true, text: 'At least one variance is required', color: 'error' }

  const invalidVariance = form.variances.find(v => !v.quantity || Number(v.price) <= 0)
  if (invalidVariance)
    snackbar.value = { show: true, text: 'Each variance requires quantity and positive price', color: 'error' }

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

    snackbar.value = { show: true, text: isEdit.value ? 'Product updated' : 'Product created', color: 'success' }
    navigateTo('/management')
  }
  catch (err) {
    snackbar.value = { show: true, text: 'Failed to save product', color: 'error' }
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
        {{ isEdit ? 'Edit product' : 'Add a new product' }}
      </h4>
      <span>{{ isEdit ? 'Update the product details below' : 'Fill in the product details below' }}</span>
    </div>
    <div class="d-flex gap-4 align-center flex-wrap">
      <VBtn
        variant="tonal"
        color="secondary"
        @click="discard"
      >
        Discard
      </VBtn>
      <VBtn
        :loading="saving"
        @click="publishProduct"
      >
        {{ isEdit ? 'Save Changes' : 'Publish Product' }}
      </VBtn>
    </div>
  </div>

  <VCard
    class="mb-6"
    title="Product Preview"
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
              <span class="text-body-2 text-disabled">Click to add cover</span>
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
            Cover image is required
          </p>
          <p
            v-if="avatarInvalid"
            class="text-error text-caption mb-0"
          >
            Avatar is required
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
          title="Product Information"
        >
          <VCardText>
            <VRow>
              <VCol cols="12">
                <AppTextField
                  v-model="form.title"
                  label="Title"
                  placeholder="Product title"
                  :rules="[requiredValidator]"
                />
              </VCol>
              <VCol cols="12">
                <VTextarea
                  v-model="form.definition"
                  label="Definition"
                  placeholder="Product definition"
                  rows="3"
                  :rules="[requiredValidator]"
                />
              </VCol>
              <VCol
                cols="12"
                md="6"
              >
                <VLabel class="mb-1">
                  Type
                </VLabel>
                <VSelect
                  v-model="form.type"
                  :items="TYPE_OPTIONS"
                  placeholder="Select type"
                  :rules="[requiredValidator]"
                />
              </VCol>
              <VCol
                cols="12"
                md="6"
              >
                <VLabel class="mb-1">
                  Destination
                </VLabel>
                <VSelect
                  v-model="form.destination"
                  :items="DESTINATION_OPTIONS"
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
                  Properties
                </VLabel>
                <VCombobox
                  v-model="form.properties"
                  multiple
                  chips
                  closable-chips
                  placeholder="Add properties"
                  :rules="[arrayRequired]"
                />
              </VCol>
            </VRow>
          </VCardText>
        </VCard>

        <!-- Caracteristiques Technique -->
        <VCard
          class="mb-6"
          title="Caractéristiques Techniques"
        >
          <VCardText>
            <VRow>
              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="form.densite"
                  label="Densité"
                  placeholder="e.g. 1.2"
                  :rules="[requiredValidator]"
                />
              </VCol>
              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="form.rendement"
                  label="Rendement"
                  placeholder="e.g. 10m²/L"
                  :rules="[requiredValidator]"
                />
              </VCol>
              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="form.tempsSachage"
                  label="Temps de Séchage"
                  placeholder="e.g. 2h"
                  :rules="[requiredValidator]"
                />
              </VCol>
              <VCol
                cols="12"
                md="6"
              >
                <VLabel class="mb-1">
                  Aspect du Film Sec
                </VLabel>
                <VSelect
                  v-model="form.aspectdifilmsec"
                  :items="ASPECT_OPTIONS"
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
                  label="Viscosité (optionnel)"
                  placeholder="e.g. 100 KU"
                />
              </VCol>
            </VRow>
          </VCardText>
        </VCard>

        <!-- Mise en Oeuvre -->
        <VCard
          class="mb-6"
          title="Mise en Œuvre"
        >
          <VCardText>
            <VRow>
              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="form.dilution"
                  label="Dilution"
                  placeholder="e.g. 5-10% eau"
                  :rules="[requiredValidator]"
                />
              </VCol>
              <VCol
                cols="12"
                md="6"
              >
                <VLabel class="mb-1">
                  Supports
                </VLabel>
                <VSelect
                  v-model="form.supports"
                  :items="SUPPORT_OPTIONS"
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
                  Matériel d'Application
                </VLabel>
                <VSelect
                  v-model="form.materielApplication"
                  :items="MATERIEL_OPTIONS"
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
                  label="Nettoyage Matériel (optionnel)"
                  placeholder="e.g. Eau"
                />
              </VCol>
              <VCol cols="12">
                <VTextarea
                  v-model="form.preparationSupport"
                  label="Préparation Support (optionnel)"
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
          title="Technical File (PDF)"
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
                  {{ form.technicalFile ? 'Replace PDF' : 'Upload PDF' }}
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
                  Download
                </VBtn>

                <VBtn
                  v-if="form.technicalFile"
                  color="error"
                  variant="text"
                  prepend-icon="tabler-trash"
                  @click="detachTechnicalFileFromProduct"
                >
                  Detach
                </VBtn>
              </div>

              <div class="text-caption text-medium-emphasis">
                <template v-if="form.technicalFile">
                  Attached: <strong>{{ technicalFileFilename || 'PDF file' }}</strong>
                </template>
                <template v-else>
                  Optional. Upload a PDF technical file and it will be linked to this product.
                </template>
              </div>
            </div>
          </VCardText>
        </VCard>

        <!-- Colors -->
        <VCard title="Colors">
          <VCardText>
            <div
              v-for="(c, idx) in form.colors"
              :key="idx"
              class="d-flex gap-2 align-center mb-3"
            >
              <AppTextField
                v-model="c.name"
                label="Name"
                placeholder="Color name"
                class="flex-grow-1"
                :rules="[requiredValidator]"
              />
              <div>
                <VLabel class="mb-1">
                  Code
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
              Add Color
            </VBtn>
          </VCardText>
        </VCard>

        <!-- Variances -->
        <VCard
          class="mt-6"
          title="Variances"
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
                  label="Quantity"
                  placeholder="e.g. 1L, 5kg"
                  :rules="[requiredValidator]"
                />
              </VCol>
              <VCol :cols="form.variances.length > 1 ? 5 : 6">
                <AppTextField
                  v-model.number="v.price"
                  label="Price (DZD)"
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
              Add Variance
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
