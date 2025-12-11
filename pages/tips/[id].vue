<script setup>
const route = useRoute()
const config = useRuntimeConfig()
const article = ref(null)
const loading = ref(true)

const fetchArticle = async () => {
  loading.value = true
  try {
    const res = await fetch(`${config.public.apiBaseUrl}/api/articles/${route.params.id}`)
    if (res.ok) {
      const data = await res.json()
      article.value = data.data
    }
  } catch (error) {
    console.error('Failed to fetch article:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchArticle()
})
</script>

<template>
  <div>
    <!-- Loading State -->
    <div v-if="loading" class="d-flex justify-center py-12">
      <VProgressCircular indeterminate color="primary" size="48" />
    </div>

    <!-- Not Found State -->
    <VCard v-else-if="!article" class="text-center py-12">
      <VIcon icon="tabler-file-off" size="64" class="text-disabled mb-4" />
      <h3 class="text-h6 text-disabled mb-2">Article not found</h3>
      <p class="text-body-2 text-disabled mb-4">The article you're looking for doesn't exist.</p>
      <VBtn color="primary" to="/tips">
        <VIcon icon="tabler-arrow-left" class="me-2" />
        Back to Tips
      </VBtn>
    </VCard>

    <!-- Article Content -->
    <template v-else>
      <!-- Back Button -->
      <VBtn
        variant="text"
        color="primary"
        to="/tips"
        class="mb-4"
      >
        <VIcon icon="tabler-arrow-left" class="me-2" />
        Back to Tips
      </VBtn>

      <!-- Cover Image -->
      <VImg
        v-if="article.imageUrl"
        :src="`${config.public.apiBaseUrl}/api/image?id=${article.imageUrl}`"
        height="400"
        cover
        class="rounded-lg mb-6"
      >
        <template #placeholder>
          <div class="d-flex align-center justify-center fill-height">
            <VProgressCircular indeterminate color="primary" />
          </div>
        </template>
      </VImg>

      <!-- Article Header -->
      <div class="mb-6">
        <h1 class="text-h3 font-weight-bold mb-3">{{ article.title }}</h1>
        <div class="d-flex align-center gap-4 text-body-2 text-medium-emphasis">
          <div class="d-flex align-center">
            <VIcon icon="tabler-calendar" size="18" class="me-1" />
            {{ new Date(article.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) }}
          </div>
          <VChip label color="primary" size="small">Tip</VChip>
        </div>
      </div>

      <VDivider class="mb-6" />

      <!-- Article Blocks -->
      <div class="article-content">
        <template v-for="block in article.blocks" :key="block.id">
          <!-- Title Block -->
          <h2 v-if="block.type === 'title' && block.content" class="text-h4 font-weight-medium mb-4 mt-6">
            {{ block.content }}
          </h2>

          <!-- Text Block -->
          <p v-else-if="block.type === 'text' && block.content" class="text-body-1 mb-4" style="white-space: pre-wrap; line-height: 1.8;">
            {{ block.content }}
          </p>

          <!-- Image Block -->
          <VImg
            v-else-if="block.type === 'image' && block.content"
            :src="`${config.public.apiBaseUrl}/api/image?id=${block.content}`"
            class="rounded-lg mb-6"
            max-height="500"
          >
            <template #placeholder>
              <div class="d-flex align-center justify-center fill-height" style="min-height: 200px;">
                <VProgressCircular indeterminate color="primary" />
              </div>
            </template>
          </VImg>
        </template>
      </div>

      <!-- Bottom Navigation -->
      <VDivider class="my-8" />
      <div class="d-flex justify-center">
        <VBtn color="primary" variant="tonal" to="/tips">
          <VIcon icon="tabler-arrow-left" class="me-2" />
          Back to All Tips
        </VBtn>
      </div>
    </template>
  </div>
</template>

<style scoped>
.article-content {
  max-width: 800px;
  margin: 0 auto;
}
</style>
