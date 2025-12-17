<script setup>
const config = useRuntimeConfig()
const articles = ref([])
const loading = ref(true)
const page = ref(1)
const perPage = ref(12)
const totalArticles = ref(0)

const fetchArticles = async () => {
  loading.value = true
  try {
    const res = await fetch(`${config.public.apiBaseUrl}/api/articles?for=tip&p=${page.value}&perPage=${perPage.value}`)
    const data = await res.json()

    articles.value = data.data || []
    totalArticles.value = data.pagination?.total || 0
  }
  catch (error) {
    console.error('Failed to fetch tips:', error)
  }
  finally {
    loading.value = false
  }
}

const totalPages = computed(() => Math.ceil(totalArticles.value / perPage.value))

watch(page, () => {
  fetchArticles()
})

onMounted(() => {
  fetchArticles()
})
</script>

<template>
  <div>
    <div
      class="mb-4"
      style="position: relative;"
    >
      <VImg
        src=" https://jazeerapaints.com/media/blockbuilder_blocktype/s/h/shutterstock_1745242574-fotor-2024062413448_2.png"
        class="rounded w-100 hero-img"
        style="min-block-size: 150px;"
        height="250"
        cover
      >
        <template #placeholder>
          <div
            class="w-100 hero-placeholder"
            style="min-block-size: 150px;"
          >
            <div class="fade-placeholder h-100 w-100" />
          </div>
        </template>
      </VImg>
      <div
        style="inset: 0;"
        class="d-flex align-center justify-center position-absolute"
      >
        <div class="text-center px-4">
          <p class="mb-1 hero-title text-white">
            Tips & Advice
          </p>
          <p class="mb-0 hero-subtitle text-white">
            Discover helpful tips and tricks for your painting projects
          </p>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div
      v-if="loading"
      class="d-flex justify-center py-12"
    >
      <VProgressCircular
        indeterminate
        color="primary"
        size="48"
      />
    </div>

    <!-- Empty State -->
    <VCard
      v-else-if="articles.length === 0"
      class="text-center py-12"
    >
      <VIcon
        icon="tabler-bulb"
        size="64"
        class="text-disabled mb-4"
      />
      <h3 class="text-h6 text-disabled mb-2">
        No tips available yet
      </h3>
      <p class="text-body-2 text-disabled">
        Check back soon for helpful tips!
      </p>
    </VCard>

    <!-- Articles Grid -->
    <template v-else>
      <VRow>
        <VCol
          v-for="article in articles"
          :key="article._id"
          cols="12"
          sm="6"
          md="4"
        >
          <VCard
            :to="`/tips/${article._id}`"
            class="article-card h-100"
            hover
          >
            <VImg
              :src="article.imageUrl ? `${config.public.apiBaseUrl}/api/image?id=${article.imageUrl}` : '/images/placeholder.png'"
              height="200"
              cover
              class="article-image"
            >
              <template #placeholder>
                <div class="fade-placeholder w-100 h-100" />
              </template>
            </VImg>
            <VCardText>
              <h3 class="text-h6 font-weight-medium mb-2 article-title">
                {{ article.title }}
              </h3>
              <div class="d-flex align-center text-caption text-disabled">
                <VIcon
                  icon="tabler-calendar"
                  size="14"
                  class="me-1"
                />
                {{ new Date(article.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) }}
              </div>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>

      <!-- Pagination -->
      <div
        v-if="totalPages > 1"
        class="d-flex justify-center mt-8"
      >
        <VPagination
          v-model="page"
          :length="totalPages"
          :total-visible="5"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.article-card {
  transition: transform 0.2s, box-shadow 0.2s;
}

.article-card:hover {
  transform: translateY(-4px);
}

.article-title {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.article-image {
  border-radius: 4px 4px 0 0;
}
</style>

<style scoped>
.hero-placeholder {
  block-size: 250px;
}

.fade-placeholder {
  animation: fade-pulse 1.2s ease-in-out infinite;
  background-color: rgba(var(--v-theme-on-surface), 0.06);
}

@keyframes fade-pulse {
  0%,
  100% {
    opacity: 0.55;
  }

  50% {
    opacity: 1;
  }
}

.hero-img :deep(img) {
  object-position: left center !important;
}

.hero-title {
  font-size: 1rem;
  font-weight: 900;
}

.hero-subtitle {
  font-size: 0.7rem;
}

@media (min-width: 600px) {
  .hero-title {
    font-size: 2rem;
    font-weight: 900;
  }

  .hero-subtitle {
    font-size: 1.25rem;
  }
}
</style>
