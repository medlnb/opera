<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

definePageMeta({
  admin: true,
})

const authStore = useAuthStore()
const config = useRuntimeConfig()
const snackbar = ref({ show: false, text: '', color: 'error' })
const saving = ref(false)
const uploadingCover = ref(false)
const uploadingAvatar = ref(false)

const TYPE_OPTIONS = ['interior', 'exterior', 'tools']
const DESTINATION_OPTIONS = ['Habitations', 'Bureaux', 'Hotel', 'Restaurants', 'Showroom', 'Magasins']
const SUPPORT_OPTIONS = ['Platre', 'Ciment', 'Enduit', 'Brique']
const MATERIEL_OPTIONS = ['Rouleau', 'Pinceau', 'Pistolet', 'Brosse']
const ASPECT_OPTIONS = ['Mat', 'Satiné', 'Brillant', 'Velours']

const form = reactive({
  imageUrl: '',
  avatar: '',
  title: '',
  type: null as string | null,
  definition: '',
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
  saving.value = true
  try {
    const body = {
      ...form,
      variances: form.variances.filter(v => v.quantity),
      colors: form.colors.filter(c => c.name && c.code),
    }

    const res = await fetch(`${config.public.apiBaseUrl}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authorization': `Bearer ${authStore.token}`,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok)
      throw new Error('Failed to create product')

    snackbar.value = { show: true, text: 'Product created', color: 'success' }
    navigateTo('/management')
  }
  catch (err) {
    snackbar.value = { show: true, text: 'Failed to create product', color: 'error' }
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
        Add a new product
      </h4>
      <span>Fill in the product details below</span>
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
        Publish Product
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

        <div class="pt-10 px-3 pb-3" />
      </div>
    </VCardText>
  </VCard>

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
              />
            </VCol>
            <VCol cols="12">
              <VTextarea
                v-model="form.definition"
                label="Definition"
                placeholder="Product definition"
                rows="3"
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
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <AppTextField
                v-model="form.teinte"
                label="Teinte (optionnel)"
                placeholder="e.g. Blanc"
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
            />
            <div>
              <VLabel class="mb-1">
                Code
              </VLabel>
              <div>
                <input
                  v-model="c.code"
                  type="color"
                  style="width: 50px; height: 40px; border: none; cursor: pointer;"
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
            align="end"
            dense
          >
            <VCol :cols="form.variances.length > 1 ? 5 : 6">
              <AppTextField
                v-model="v.quantity"
                label="Quantity"
                placeholder="e.g. 1L, 5kg"
              />
            </VCol>
            <VCol :cols="form.variances.length > 1 ? 5 : 6">
              <AppTextField
                v-model.number="v.price"
                label="Price (DZD)"
                type="number"
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
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  overflow: hidden;
}

.preview-cover {
  position: relative;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.9;
  }

  .cover-placeholder {
    height: 200px;
    border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  }

  .cover-remove-btn {
    position: absolute;
    top: 8px;
    right: 8px;
  }
}

.preview-avatar {
  position: absolute;
  bottom: -2rem;
  left: 1rem;
  width: 75px;
  height: 75px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.05);
  }

  .avatar-placeholder {
    width: 100%;
    height: 100%;
    background: #d3d3d357;
  }

  .avatar-remove-btn {
    position: absolute;
    top: 2px;
    right: 2px;
  }
}
</style>
