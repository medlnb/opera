<script setup>
import { useAuthStore } from '@/stores/auth'
import { useValidators } from '@/utils/validators'
import { useRoute } from 'vue-router'

definePageMeta({
  admin: true,
})

const authStore = useAuthStore()
const route = useRoute()
const config = useRuntimeConfig()

const snackbar = ref({ show: false, message: '', color: 'success' })
const showSnackbar = (message, color = 'success') => {
  snackbar.value = { show: true, message, color }
}

const articleId = computed(() => route.query.id)
const isEdit = computed(() => !!articleId.value)

// Article metadata
const title = ref('')
const imageUrl = ref('')
const articleType = ref('tip')
const uploadingCover = ref(false)
const formRef = ref()

// Validators
const { requiredValidator } = useValidators()
const showAssetErrors = ref(false)
const coverInvalid = computed(() => showAssetErrors.value && !imageUrl.value)

// Article type options
const typeOptions = [
  { title: 'Tip', value: 'tip' },
  { title: 'Inspiration', value: 'inspiration' },
]

// Block types: 'title', 'text', 'image'
const blocks = ref([])
const saving = ref(false)
const loading = ref(false)
const uploadingImage = ref(null)

// Add a new block
function addBlock(type) {
  blocks.value.push({
    id: Date.now(),
    type,
    content: '',
  })
}

// Remove a block
function removeBlock(index) {
  blocks.value.splice(index, 1)
}

// Move block up
function moveUp(index) {
  if (index <= 0) return
  const temp = blocks.value[index]
  blocks.value[index] = blocks.value[index - 1]
  blocks.value[index - 1] = temp
}

// Move block down
function moveDown(index) {
  if (index >= blocks.value.length - 1) return
  const temp = blocks.value[index]
  blocks.value[index] = blocks.value[index + 1]
  blocks.value[index + 1] = temp
}

// Upload image for a block
async function uploadImage(index, file) {
  uploadingImage.value = index
  try {
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUri = reader.result
      const headers = { 'Content-Type': 'application/json' }
      if (authStore.token) headers['Authorization'] = `Bearer ${authStore.token}`
      
      const res = await fetch(`${config.public.apiBaseUrl}/api/image`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ image: dataUri }),
      })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      blocks.value[index].content = data.id
    }
    reader.readAsDataURL(file)
  } catch {
    showSnackbar('Image upload failed', 'error')
  } finally {
    uploadingImage.value = null
  }
}

function selectImageFile(index) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = (e) => {
    const file = e.target.files?.[0]
    if (file) uploadImage(index, file)
  }
  input.click()
}

// Upload cover image
async function uploadCoverImage(file) {
  uploadingCover.value = true
  try {
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUri = reader.result
      const headers = { 'Content-Type': 'application/json' }
      if (authStore.token) headers['Authorization'] = `Bearer ${authStore.token}`
      
      const res = await fetch(`${config.public.apiBaseUrl}/api/image`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ image: dataUri }),
      })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      imageUrl.value = data.id
      showSnackbar('Cover image uploaded successfully', 'success')
    }
    reader.readAsDataURL(file)
  } catch {
    showSnackbar('Cover image upload failed', 'error')
  } finally {
    uploadingCover.value = false
  }
}

function selectCoverImage() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = (e) => {
    const file = e.target.files?.[0]
    if (file) uploadCoverImage(file)
  }
  input.click()
}

// Save all blocks to backend
async function savePage() {
  // Trigger asset errors on attempt
  showAssetErrors.value = true

  // Validate VForm inputs first
  if (formRef.value && typeof formRef.value.validate === 'function') {
    const res = await formRef.value.validate()
    if (!res.valid) {
      showSnackbar('Please fix the highlighted errors', 'error')
      return
    }
  }

  if (!imageUrl.value) {
    showSnackbar('Cover image is required', 'error')
    return
  }

  saving.value = true
  try {
    const headers = { 'Content-Type': 'application/json' }
    if (authStore.token) headers['Authorization'] = `Bearer ${authStore.token}`

    const payload = {
      title: title.value.trim(),
      imageUrl: imageUrl.value,
      for: articleType.value,
      blocks: blocks.value,
    }

    let res
    if (isEdit.value) {
      // Update existing article
      res = await fetch(`${config.public.apiBaseUrl}/api/articles/${articleId.value}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload),
      })
    } else {
      // Create new article
      res = await fetch(`${config.public.apiBaseUrl}/api/articles`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })
    }

    if (!res.ok) throw new Error('Failed to save')
    const data = await res.json()
    
    showSnackbar(isEdit.value ? 'Article updated successfully' : 'Article created successfully', 'success')
    
    // If creating new, redirect to edit mode
    if (!isEdit.value && data.data?._id) {
      navigateTo(`/management/newArticle?id=${data.data._id}`)
    }
  } catch {
    showSnackbar('Failed to save article', 'error')
  } finally {
    saving.value = false
  }
}

// Load existing article
async function loadArticle() {
  if (!articleId.value) return

  loading.value = true
  try {
    const res = await fetch(`${config.public.apiBaseUrl}/api/articles/${articleId.value}`)
    if (res.ok) {
      const data = await res.json()
      if (data.data) {
        title.value = data.data.title || ''
        imageUrl.value = data.data.imageUrl || ''
        articleType.value = data.data.for || 'tip'
        if (Array.isArray(data.data.blocks)) {
          blocks.value = data.data.blocks
        }
      }
    }
  } catch {
    showSnackbar('Failed to load article', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadArticle()
})
</script>

<template>
  <div>
    <div class="d-flex flex-wrap justify-space-between align-center gap-4 mb-6">
      <div>
        <h4 class="text-h4 font-weight-medium">{{ isEdit ? 'Edit Article' : 'Create Article' }}</h4>
        <span class="text-body-2 text-disabled">Add titles, text, and images to build your article</span>
      </div>
      <div class="d-flex gap-2">
        <VBtn variant="tonal" to="/management/articles">
          <VIcon icon="tabler-arrow-left" class="me-2" />
          Back to List
        </VBtn>
        <VBtn :loading="saving" color="primary" @click="savePage">
          <VIcon icon="tabler-device-floppy" class="me-2" />
          {{ isEdit ? 'Update' : 'Create' }}
        </VBtn>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="text-center py-12">
      <VProgressCircular indeterminate color="primary" />
    </div>

    <!-- Block Builder -->
    <template v-else>
      <!-- Article Metadata -->
      <VCard class="mb-6">
        <VCardTitle>Article Information</VCardTitle>
        <VDivider />
        <VCardText>
          <VForm ref="formRef">
          <VRow>
            <VCol cols="12" md="8">
              <VTextField
                v-model="title"
                label="Article Title"
                placeholder="Enter article title..."
                variant="outlined"
                :rules="[requiredValidator]"
                required
              />
            </VCol>
            <VCol cols="12" md="4">
              <VSelect
                v-model="articleType"
                :items="typeOptions"
                label="Article Type"
                variant="outlined"
                :rules="[requiredValidator]"
                required
              />
            </VCol>
            <VCol cols="12">
              <div class="cover-image-section">
                <label class="text-body-2 font-weight-medium mb-2 d-block">Cover Image *</label>
                <div v-if="!imageUrl" 
                  class="cover-dropzone d-flex flex-column align-center justify-center"
                  :class="{ 'error-outline': coverInvalid }"
                  @click="selectCoverImage"
                >
                  <template v-if="uploadingCover">
                    <VProgressCircular indeterminate color="primary" size="32" />
                  </template>
                  <template v-else>
                    <VIcon icon="tabler-photo-plus" size="32" class="text-disabled mb-1" />
                    <span class="text-caption text-disabled">Upload cover</span>
                  </template>
                </div>
                <div v-else class="cover-preview">
                  <VImg
                    :src="`${config.public.apiBaseUrl}/api/image?id=${imageUrl}`"
                    class="rounded"
                    cover
                    height="400"
                  >
                    <template #placeholder>
                      <div class="d-flex align-center justify-center fill-height">
                        <VProgressCircular indeterminate color="primary" size="24" />
                      </div>
                    </template>
                  </VImg>
                  <VBtn 
                    class="mt-2" 
                    variant="tonal" 
                    size="small"
                    block
                    :loading="uploadingCover"
                    @click="selectCoverImage"
                  >
                    Replace
                  </VBtn>
                </div>
                <p v-if="coverInvalid" class="text-error text-caption mt-2">Cover image is required</p>
              </div>
            </VCol>
          </VRow>
          </VForm>
        </VCardText>
      </VCard>

      <!-- Empty State -->
      <VCard v-if="blocks.length === 0" class="mb-6">
        <VCardText class="text-center py-12">
          <VIcon icon="tabler-layout-off" size="64" class="text-disabled mb-4" />
          <p class="text-h6 text-disabled">No content yet</p>
          <p class="text-body-2 text-disabled">Click the buttons above to start building your page</p>
        </VCardText>
      </VCard>

      <!-- Blocks List -->
      <div v-else class="blocks-container">
        <VCard 
          v-for="(block, index) in blocks" 
          :key="block.id" 
          class="mb-4 block-card"
        >
          <VCardText class="pa-4">
            <!-- Block Header with Actions -->
            <div class="d-flex align-center justify-space-between mb-3">
              <VChip 
                size="small" 
                :color="block.type === 'title' ? 'primary' : block.type === 'text' ? 'info' : 'success'"
                label
              >
                {{ block.type === 'title' ? 'Title' : block.type === 'text' ? 'Text' : 'Image' }}
              </VChip>
              <div class="d-flex gap-1">
                <VBtn 
                  icon 
                  size="x-small" 
                  variant="text" 
                  :disabled="index === 0"
                  @click="moveUp(index)"
                >
                  <VIcon icon="tabler-arrow-up" size="18" />
                </VBtn>
                <VBtn 
                  icon 
                  size="x-small" 
                  variant="text" 
                  :disabled="index === blocks.length - 1"
                  @click="moveDown(index)"
                >
                  <VIcon icon="tabler-arrow-down" size="18" />
                </VBtn>
                <VBtn 
                  icon 
                  size="x-small" 
                  variant="text" 
                  color="error"
                  @click="removeBlock(index)"
                >
                  <VIcon icon="tabler-trash" size="18" />
                </VBtn>
              </div>
            </div>

            <!-- Title Block -->
            <VTextField
              v-if="block.type === 'title'"
              v-model="block.content"
              label="Title"
              placeholder="Enter title text..."
              variant="outlined"
            />

            <!-- Text Block -->
            <VTextarea
              v-else-if="block.type === 'text'"
              v-model="block.content"
              label="Text Content"
              placeholder="Enter your text content..."
              variant="outlined"
              rows="4"
              auto-grow
            />

            <!-- Image Block -->
            <div v-else-if="block.type === 'image'">
              <div 
                v-if="!block.content"
                class="image-dropzone d-flex flex-column align-center justify-center"
                @click="selectImageFile(index)"
              >
                <template v-if="uploadingImage === index">
                  <VProgressCircular indeterminate color="primary" />
                </template>
                <template v-else>
                  <VIcon icon="tabler-photo-plus" size="48" class="text-disabled mb-2" />
                  <span class="text-body-2 text-disabled">Click to upload image</span>
                </template>
              </div>
              <div v-else class="image-preview">
                <VImg
                  :src="`${config.public.apiBaseUrl}/api/image?id=${block.content}`"
                  class="rounded"
                  cover
                  max-height="300"
                >
                  <template #placeholder>
                    <div class="d-flex align-center justify-center fill-height">
                      <VProgressCircular indeterminate color="primary" />
                    </div>
                  </template>
                </VImg>
                <VBtn 
                  class="mt-2" 
                  variant="tonal" 
                  size="small"
                  @click="selectImageFile(index)"
                >
                  Replace Image
                </VBtn>
              </div>
            </div>
          </VCardText>
        </VCard>
      </div>

      <!-- Add Block Buttons -->
      <VCard class="mb-6">
        <VCardText class="d-flex flex-wrap gap-3 justify-center">
          <VBtn variant="tonal" prepend-icon="tabler-heading" @click="addBlock('title')">
            Add Title
          </VBtn>
          <VBtn variant="tonal" prepend-icon="tabler-align-left" @click="addBlock('text')">
            Add Text
          </VBtn>
          <VBtn variant="tonal" prepend-icon="tabler-photo" @click="addBlock('image')">
            Add Image
          </VBtn>
        </VCardText>
      </VCard>

      <!-- Preview Section -->
      <VCard v-if="blocks.length > 0" class="mt-6">
        <VCardTitle>Preview</VCardTitle>
        <VDivider />
        <VCardText class="preview-content">
          <template v-for="block in blocks" :key="block.id">
            <h2 v-if="block.type === 'title' && block.content" class="text-h4 mb-4">
              {{ block.content }}
            </h2>
            <p v-else-if="block.type === 'text' && block.content" class="text-body-1 mb-4" style="white-space: pre-wrap;">
              {{ block.content }}
            </p>
            <VImg
              v-else-if="block.type === 'image' && block.content"
              :src="`${config.public.apiBaseUrl}/api/image?id=${block.content}`"
              class="rounded mb-4 w-100"
              cover
            />
          </template>
        </VCardText>
      </VCard>
    </template>

    <VSnackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.message }}
    </VSnackbar>
  </div>
</template>

<style scoped>
.blocks-container {
  max-width: 800px;
  margin: 0 auto;
}

.block-card {
  transition: box-shadow 0.2s;
}

.block-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.image-dropzone {
  height: 300px;
  border: 2px dashed rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.image-dropzone:hover {
  border-color: rgb(var(--v-theme-primary));
}

.preview-content {
  max-width: 800px;
  margin: 0 auto;
}

.cover-dropzone {
  height: 100px;
  border: 2px dashed rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.cover-dropzone:hover {
  border-color: rgb(var(--v-theme-primary));
}

/* Error highlight for required assets */
.error-outline {
  outline: 2px solid rgb(var(--v-theme-error));
  outline-offset: -2px;
}
</style>
