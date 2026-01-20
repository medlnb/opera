<script setup>
import { useApi } from '@/composables/useApi'
import bgBuildings from '@images/buildings.png'
import bgCoating from '@images/coatings.png'
import bgDecor from '@images/decor.png'
import logoImg from '@images/logo-v2.svg'
import { useI18n } from 'vue-i18n'

const { t, te } = useI18n({ useScope: 'global' })

const stats = computed(() => [
  { value: '57+', label: t('home.stats.sales_points') },
  { value: '61+', label: t('home.stats.products_manufactured') },
  { value: '10+', label: t('home.stats.years_experience') },
])

const features = computed(() => [
  {
    icon: 'tabler-award',
    title: t('home.features.quality_title'),
    description: t('home.features.quality_description'),
    color: 'primary',
  },
  {
    icon: 'tabler-bulb',
    title: t('home.features.innovation_title'),
    description: t('home.features.innovation_description'),
    color: 'success',
  },
  {
    icon: 'tabler-shield-check',
    title: t('home.features.resistance_title'),
    description: t('home.features.resistance_description'),
    color: 'warning',
  },
  {
    icon: 'tabler-heart-handshake',
    title: t('home.features.satisfaction_title'),
    description: t('home.features.satisfaction_description'),
    color: 'info',
  },
])

const heroColorsLoading = ref(false)
const heroColors = ref([])

async function fetchHeroColors() {
  try {
    heroColorsLoading.value = true

    const { data, error } = await useApi('/api/products/colors', {
      method: 'GET',
      query: { trend: 'true' },
    })
    if (error.value)
      throw error.value

    const list = data.value?.colors ?? []
    const normalized = Array.isArray(list) ? list : []

    heroColors.value = normalized
      .filter(c => c && c.code)
      .slice(0, 8)
  }
  catch {
    heroColors.value = []
  }
  finally {
    heroColorsLoading.value = false
  }
}

const productTypes = [
  { type: 'decor', icon: 'tabler-paint', img: bgDecor },
  { type: 'buildings', icon: 'tabler-building', img: bgBuildings },
  { type: 'coating', icon: 'tabler-brush', img: bgCoating },
]

function productTypeLabel(type) {
  const key = `nav.products.${type}`

  return te(key) ? t(key) : String(type)
}

// Painters section
const paintersLoading = ref(false)
const featuredPainters = ref([])

async function fetchFeaturedPainters() {
  try {
    paintersLoading.value = true

    const { data, error } = await useApi('/api/painters', {
      query: { available: 'true' },
    })

    if (error.value)
      throw error.value

    const list = data.value?.data ?? []

    featuredPainters.value = Array.isArray(list) ? list.slice(0, 3) : []
  }
  catch {
    featuredPainters.value = []
  }
  finally {
    paintersLoading.value = false
  }
}

const painterDisplayName = painter => {
  const user = painter?.user
  const first = user?.firstName
  const last = user?.lastName

  if (first || last)
    return `${first ?? ''} ${last ?? ''}`.trim()

  return user?.name || t('common.unnamed')
}

const painterLocationLabel = painter => {
  if (painter?.city && painter?.state)
    return `${painter.city} • ${painter.state}`

  return painter?.city || painter?.state || '—'
}

const painterIsAvailable = painter => painter?.available !== false

onMounted(() => {
  fetchHeroColors()
  fetchFeaturedPainters()
})
</script>

<template>
  <div class="home-page">
    <!-- Hero Section -->
    <VCard class="hero-section overflow-hidden">
      <div class="hero-bg" />
      <VCardText class="hero-content text-center py-16 px-4 position-relative">
        <h1 class="text-h3 text-md-h2 font-weight-bold mb-4 text-white">
          {{ t('home.hero.title_prefix') }} <span class="text-primary">{{ t('home.hero.title_highlight') }}</span> {{ t('home.hero.title_suffix') }}
        </h1>
        <p
          class="text-body-1 text-white-50 mb-6 mx-auto"
          style="max-inline-size: 600px;"
        >
          {{ t('home.hero.description') }}
        </p>
        <div class="d-flex flex-wrap justify-center gap-4">
          <VBtn
            color="primary"
            size="large"
            to="/products/decor"
          >
            <VIcon
              icon="tabler-paint"
              class="me-2"
            />
            {{ t('home.hero.explore_products') }}
          </VBtn>
          <VBtn
            variant="outlined"
            color="white"
            size="large"
            to="/colors"
          >
            <VIcon
              icon="tabler-palette"
              class="me-2"
            />
            {{ t('home.hero.view_colors') }}
          </VBtn>
        </div>
      </VCardText>
    </VCard>

    <VContainer class="home-content">      
      <!-- Product Types Section -->
      <section class="home-section">
        <VRow>
          <VCol
            v-for="item in productTypes"
            :key="item.type"
            cols="12"
            sm="4"
          >
            <VCard
              hover
              variant="tonal"
              color="primary"
              class="type-card"
              :to="{ name: 'products-type', params: { type: item.type } }"
            >
              <VImg
                :src="item.img"
                height="170"
                cover
                class="type-card-media"
              />
              <VCardText class="d-flex align-center gap-4">
                <VAvatar
                  color="primary"
                  variant="outlined"
                  size="44"
                >
                  <VIcon
                    :icon="item.icon"
                    size="22"
                  />
                </VAvatar>

                <div class="d-flex flex-column">
                  <div class="text-subtitle-1 font-weight-medium">
                    {{ productTypeLabel(item.type) }}
                  </div>
                  <div class="text-body-2 text-medium-emphasis">
                    {{ t('home.hero.explore_products') }}
                  </div>
                </div>

                <VSpacer />
                <VIcon
                  icon="tabler-arrow-right"
                  class="text-medium-emphasis"
                />
              </VCardText>
            </VCard>
          </VCol>
        </VRow>
      </section>

            <!-- Color of the Year 2026 (banner) -->
      <section class="home-section home-section--compact">
        <VCard
          class="coty-banner"
          variant="flat"
        >
          <VCardText class="d-flex flex-wrap align-center justify-space-between gap-4 pa-4 pa-md-5">
            <div class="d-flex align-center gap-4">
              <VImg
                :src="logoImg"
                height="36"
                width="110"
                class="coty-logo"
                alt="Opera"
              />
              <div>
                <div class="text-caption text-medium-emphasis">
                  {{ t('home.coty.kicker') }}
                </div>
                <div class="text-h6 text-md-h5 font-weight-bold">
                  {{ t('home.coty.title') }}
                </div>
              </div>
            </div>

            <VBtn
              color="primary"
              variant="flat"
              to="/colors"
            >
              {{ t('home.coty.cta') }}
              <VIcon
                icon="tabler-arrow-right"
                class="ms-2"
              />
            </VBtn>
          </VCardText>
        </VCard>
      </section>


      <!-- Studio Color Section -->
      <section class="home-section">
        <VCard
          class="studio-card"
          variant="flat"
        >
          <VRow no-gutters>
            <VCol
              cols="12"
              md="6"
              class="studio-card__left"
            >
              <div class="studio-card__left-inner">
                <div class="studio-badge">
                  <div class="studio-badge__title">
                    {{ t('home.studio_color.badge') }}
                  </div>
                </div>
                <div class="studio-card__tagline">
                  {{ t('home.studio_color.tagline') }}
                </div>
              </div>
            </VCol>

            <VCol
              cols="12"
              md="6"
              class="studio-card__right"
            >
              <VCardText class="pa-6 pa-md-8">
                <div class="text-subtitle-1 font-weight-bold mb-2">
                  {{ t('home.studio_color.title') }}
                </div>
                <p class="text-body-2 text-medium-emphasis mb-4">
                  {{ t('home.studio_color.description') }}
                </p>
                <VBtn
                  color="primary"
                  variant="tonal"
                  to="/colors"
                >
                  {{ t('home.studio_color.cta') }}
                </VBtn>
              </VCardText>
            </VCol>
          </VRow>
        </VCard>
      </section>

            <!-- Colors Preview Section -->
      <section class="home-section">
        <div class="d-flex align-center justify-space-between">
          <h2 class="text-h6 font-weight-bold mb-0">
            {{ t('home.trend_colors_title') }}
          </h2>
          <VBtn
            variant="text"
            color="primary"
            to="/colors"
          >
            {{ t('home.view_more_colors') }}
            <VIcon
              icon="tabler-arrow-right"
              class="ms-2"
            />
          </VBtn>
        </div>

        <VRow
          dense
          class="mt-4"
        >
      <template v-if="heroColorsLoading">
        <VCol
          v-for="i in 3"
          :key="i"
          cols="6"
          sm="3"
          md="2"
        >
          <VCard
            variant="outlined"
            class="color-card"
          >
            <div class="color-swatch color-swatch--placeholder" />
            <VCardText class="py-3">
              <div class="fade-placeholder text-subtitle-2 mb-1" />
              <div class="fade-placeholder text-caption" />
            </VCardText>
          </VCard>
        </VCol>
      </template>

      <VCol
        v-for="(c, i) in heroColors"
        :key="i"
        cols="6"
        sm="3"
        md="2"
      >
        <VCard
          hover
          variant="outlined"
          class="color-card"
          to="/colors"
        >
          <div
            class="color-swatch"
            :style="{ backgroundColor: `#${c.code}` }"
          />
          <VCardText class="py-3">
            <div class="text-subtitle-2">
              {{ c.name || t('common.unnamed') }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ c.code || '—' }}
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

      </section>

      <!-- Catalog Section -->
      <section class="home-section">
        <VCard
          class="catalog-card"
          variant="flat"
        >
          <VRow no-gutters>
            <VCol
              cols="12"
              md="5"
              class="catalog-card__left"
            >
              <VCardText class="pa-6 pa-md-8">
                <div class="text-subtitle-1 font-weight-bold mb-2">
                  {{ t('home.catalog.title') }}
                </div>
                <p class="text-body-2 text-medium-emphasis mb-4">
                  {{ t('home.catalog.description') }}
                </p>
                <VBtn
                  color="primary"
                  variant="tonal"
                  to="/products/decor"
                >
                  {{ t('home.catalog.cta') }}
                </VBtn>
              </VCardText>
            </VCol>

            <VCol
              cols="12"
              md="7"
              class="catalog-card__right"
            >
              <div class="catalog-card__right-inner">
                <div class="catalog-badge">
                  <div class="catalog-badge__title">
                    {{ t('home.catalog.badge_title') }}
                  </div>
                  <ul class="catalog-badge__list">
                    <li>{{ t('home.catalog.item_1') }}</li>
                    <li>{{ t('home.catalog.item_2') }}</li>
                    <li>{{ t('home.catalog.item_3') }}</li>
                    <li>{{ t('home.catalog.item_4') }}</li>
                  </ul>
                </div>
              </div>
            </VCol>
          </VRow>
        </VCard>
      </section>


      <!-- Painters Section -->
      <section class="home-section">
        <VCard class="painters-section" variant="tonal">
          <VCardText class="pa-6 pa-md-8">
            <div class="d-flex align-center justify-space-between gap-4 mb-4">
              <div>
                <div class="text-overline text-primary mb-1">
                  {{ t('home.painters.overline') }}
                </div>
                <h2 class="text-h5 font-weight-bold mb-0">
                  {{ t('home.painters.title') }}
                </h2>
              </div>
              <VBtn
                variant="text"
                color="primary"
                to="/painters"
              >
                {{ t('home.painters.view_all') }}
                <VIcon
                  icon="tabler-arrow-right"
                  class="ms-2"
                />
              </VBtn>
            </div>

            <p class="text-body-2 text-medium-emphasis mb-6">
              {{ t('home.painters.description') }}
            </p>

            <VRow v-if="paintersLoading">
              <VCol
                v-for="i in 3"
                :key="i"
                cols="12"
                sm="4"
              >
                <VCard
                  variant="outlined"
                  class="painter-card"
                >
                  <VCardText class="pa-4">
                    <VSkeletonLoader type="list-item-avatar, text, text" />
                  </VCardText>
                </VCard>
              </VCol>
            </VRow>

            <VRow v-else-if="featuredPainters.length">
              <VCol
                v-for="painter in featuredPainters"
                :key="painter._id"
                cols="12"
                sm="4"
              >
                <VCard
                  hover
                  variant="outlined"
                  class="painter-card h-100"
                  to="/painters"
                >
                  <VCardText class="pa-4">
                    <div class="d-flex align-center gap-3 mb-3">
                      <VAvatar
                        :color="painterIsAvailable(painter) ? 'success' : 'grey'"
                        size="48"
                      >
                        <VIcon
                          icon="tabler-user"
                          size="24"
                        />
                      </VAvatar>
                      <div class="flex-grow-1">
                        <div class="text-subtitle-1 font-weight-medium">
                          {{ painterDisplayName(painter) }}
                        </div>
                        <div class="text-caption text-medium-emphasis">
                          <VIcon
                            icon="tabler-map-pin"
                            size="14"
                            class="me-1"
                          />
                          {{ painterLocationLabel(painter) }}
                        </div>
                      </div>
                      <VChip
                        v-if="painterIsAvailable(painter)"
                        color="success"
                        size="small"
                        variant="tonal"
                      >
                        {{ t('home.painters.available') }}
                      </VChip>
                    </div>
                    <div
                      v-if="painter.experience"
                      class="text-body-2 text-medium-emphasis"
                    >
                      <VIcon
                        icon="tabler-briefcase"
                        size="14"
                        class="me-1"
                      />
                      {{ painter.experience }} {{ t('home.painters.years_exp') }}
                    </div>
                  </VCardText>
                </VCard>
              </VCol>
            </VRow>

            <div
              v-else
              class="text-center py-6"
            >
              <VIcon
                icon="tabler-users"
                size="48"
                class="text-medium-emphasis mb-2"
              />
              <p class="text-body-2 text-medium-emphasis">
                {{ t('home.painters.no_painters') }}
              </p>
            </div>
          </VCardText>
        </VCard>
      </section>

      <VDivider class="home-divider" />

      <!-- About Section -->
      <section class="home-section">
        <VCard>
          <VRow no-gutters>
        <VCol
          cols="12"
          md="6"
        >
          <VImg
            src="https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800"
            height="100%"
            min-height="300"
            cover
            class="about-image"
          >
            <template #placeholder>
              <div class="d-flex align-center justify-center fill-height">
                <VProgressCircular
                  indeterminate
                  color="primary"
                />
              </div>
            </template>
          </VImg>
        </VCol>
        <VCol
          cols="12"
          md="6"
        >
          <VCardText class="pa-6 pa-md-8 d-flex flex-column justify-center h-100">
            <div class="text-overline text-primary mb-2">
              {{ t('home.about.overline') }}
            </div>
            <h2 class="text-h4 font-weight-bold mb-4">
              {{ t('home.about.title') }}
            </h2>
            <p class="text-body-1 text-medium-emphasis mb-4">
              {{ t('home.about.p1') }}
            </p>
            <p class="text-body-1 text-medium-emphasis mb-4">
              {{ t('home.about.p2') }}
            </p>
            <p class="text-body-1 text-medium-emphasis mb-6">
              {{ t('home.about.p3') }}
            </p>
            <div>
              <VBtn
                color="primary"
                variant="tonal"
                to="/tips"
              >
                {{ t('home.about.learn_more') }}
                <VIcon
                  icon="tabler-arrow-right"
                  class="ms-2"
                />
              </VBtn>
            </div>
          </VCardText>
        </VCol>
      </VRow>
        </VCard>
      </section>

      <!-- Features Section -->
      <section class="home-section">
        <div class="text-center mb-6">
          <div class="text-overline text-primary mb-2">
            {{ t('home.why.overline') }}
          </div>
          <h2 class="text-h4 font-weight-bold">
            {{ t('home.why.title') }}
          </h2>
        </div>
        <VRow>
          <VCol
            v-for="feature in features"
            :key="feature.title"
            cols="12"
            sm="6"
            lg="3"
          >
            <VCard class="feature-card h-100 pa-6 text-center">
              <VAvatar
                :color="feature.color"
                variant="tonal"
                size="64"
                class="mb-4"
              >
                <VIcon
                  :icon="feature.icon"
                  size="32"
                />
              </VAvatar>
              <h3 class="text-h6 font-weight-medium mb-3">
                {{ feature.title }}
              </h3>
              <p class="text-body-2 text-medium-emphasis mb-0">
                {{ feature.description }}
              </p>
            </VCard>
          </VCol>
        </VRow>
      </section>

      <!-- Stats Section -->
      <section class="home-section">
        <VRow>
          <VCol
            v-for="stat in stats"
            :key="stat.label"
            cols="12"
            sm="4"
          >
            <VCard class="text-center pa-6 stat-card h-100">
              <div class="text-h2 font-weight-bold text-primary mb-2">
                {{ stat.value }}
              </div>
              <div class="text-body-1 text-medium-emphasis">
                {{ stat.label }}
              </div>
            </VCard>
          </VCol>
        </VRow>
      </section>

      <!-- CTA Section -->
      <section class="home-section">
        <VCard class="cta-section overflow-hidden">
          <div class="cta-bg" />
          <VCardText class="text-center py-12 px-4 position-relative">
            <h2 class="text-h4 font-weight-bold mb-4">
              {{ t('home.cta.title') }}
            </h2>
            <p
              class="text-body-1 text-medium-emphasis mb-6 mx-auto"
              style="max-inline-size: 500px;"
            >
              {{ t('home.cta.description') }}
            </p>
            <div class="d-flex flex-wrap justify-center gap-4">
              <VBtn
                color="primary"
                size="large"
                to="/products/decor"
              >
                <VIcon
                  icon="tabler-shopping-cart"
                  class="me-2"
                />
                {{ t('home.cta.shop_now') }}
              </VBtn>
              <VBtn
                variant="outlined"
                size="large"
                to="/inspirations"
              >
                <VIcon
                  icon="tabler-sparkles"
                  class="me-2"
                />
                {{ t('home.cta.get_inspired') }}
              </VBtn>
            </div>
          </VCardText>
        </VCard>
      </section>
    </VContainer>
  </div>
</template>

<style scoped>
.hero-section {
  position: relative;
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)) 0%, #1a237e 100%);
  min-block-size: 350px;
  inline-size: 100vw;
  max-inline-size: 100vw;
  margin-inline: calc(50% - 50vw);
  border-radius: 0;
}

.hero-bg {
  position: absolute;
  background-image: url("@images/painter.png");
  background-position: center 30%;
  background-size: cover;
  inset: 0;
  opacity: 0.25;
}

.hero-content {
  z-index: 1;
}

.home-content {
  padding-block: 28px 64px;
}

.home-section {
  margin-block: 40px;
}

.home-section--compact {
  margin-block: 22px 34px;
}

.home-divider {
  margin-block: 24px;
}

.text-white-50 {
  color: rgb(255 255 255 / 80%) !important;
}

.stat-card {
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  box-shadow: 0 8px 24px rgb(var(--v-theme-primary) / 15%);
  transform: translateY(-4px);
}

.feature-card {
  transition: transform 0.2s, box-shadow 0.2s;
}

.feature-card:hover {
  box-shadow: 0 8px 24px rgb(0 0 0 / 10%);
  transform: translateY(-4px);
}

.cta-section {
  position: relative;
  background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
}

.v-theme--dark .cta-section {
  background: linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%);
}

.cta-bg {
  position: absolute;
  background-image:
    radial-gradient(circle at 20% 50%, rgb(var(--v-theme-primary) / 10%) 0%, transparent 50%),
    radial-gradient(circle at 80% 50%, rgb(var(--v-theme-primary) / 10%) 0%, transparent 50%);
  inset: 0;
}

.type-card,
.color-more-card {
  cursor: pointer;
}

.type-card {
  overflow: hidden;
}

.painters-section {
  border: 1px solid rgb(var(--v-theme-on-surface) / 8%);
  background-image:
    radial-gradient(circle at 12% 20%, rgb(var(--v-theme-primary) / 12%) 0%, transparent 45%),
    radial-gradient(circle at 88% 80%, rgb(var(--v-theme-primary) / 10%) 0%, transparent 50%);
}

.coty-banner {
  border: 1px solid rgb(var(--v-theme-on-surface) / 10%);
  background: rgb(var(--v-theme-on-surface) / 4%);
}

.coty-logo {
  filter: grayscale(0.2);
}

.studio-card,
.catalog-card {
  border: 1px solid rgb(var(--v-theme-on-surface) / 10%);
  overflow: hidden;
}

.studio-card__left {
  background:
    radial-gradient(circle at 18% 22%, rgb(255 255 255 / 18%) 0%, transparent 45%),
    radial-gradient(circle at 82% 78%, rgb(255 255 255 / 12%) 0%, transparent 52%),
    linear-gradient(135deg, rgb(var(--v-theme-primary)) 0%, #1a237e 100%);
  color: #fff;
}

.v-theme--dark .studio-card__left {
  background:
    radial-gradient(circle at 18% 22%, rgb(255 255 255 / 10%) 0%, transparent 45%),
    radial-gradient(circle at 82% 78%, rgb(255 255 255 / 8%) 0%, transparent 52%),
    linear-gradient(135deg, rgb(var(--v-theme-primary)) 0%, #0b1220 100%);
}

.studio-card__left-inner {
  padding: 28px;
  min-block-size: 220px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 18px;
}

.studio-badge {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.studio-badge__title {
  font-size: 28px;
  line-height: 1.1;
  letter-spacing: 0.08em;
  font-weight: 800;
}

.studio-card__tagline {
  font-size: 14px;
  opacity: 0.95;
}

.studio-card__right {
  background: rgb(var(--v-theme-on-surface) / 4%);
}

.catalog-card__left {
  background: rgb(var(--v-theme-on-surface) / 4%);
}

.catalog-card__right {
  background: #5b5e66;
}

.catalog-card__right-inner {
  padding: 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  min-block-size: 210px;
}

.catalog-badge {
  color: #fff;
  border-radius: 10px;
  padding: 14px 16px;
  min-inline-size: 220px;
}

.catalog-badge__title {
  font-weight: 800;
  margin-block-end: 10px;
}

.catalog-badge__list {
  margin: 0;
  padding-inline-start: 18px;
  font-size: 12px;
  opacity: 0.95;
}

.catalog-thumb {
  border-radius: 10px;
  overflow: hidden;
  inline-size: 160px;
  background: rgb(255 255 255 / 14%);
  border: 1px solid rgb(255 255 255 / 18%);
}

.showcase {
  border-top: 2px solid rgb(var(--v-theme-on-surface) / 14%);
  padding-top: 22px;
}

.showcase__slider :deep(.v-slide-group__content) {
  gap: 18px;
}

.showcase-card {
  inline-size: 260px;
  background: #f3efe5;
  border: 1px solid rgb(var(--v-theme-on-surface) / 10%);
}

@media (min-width: 960px) {
  .showcase-card {
    inline-size: 300px;
  }
}

.painter-card {
  transition: transform 0.2s, box-shadow 0.2s;
}

.painter-card:hover {
  box-shadow: 0 8px 24px rgb(0 0 0 / 10%);
  transform: translateY(-4px);
}

.type-card-media {
  border-bottom: 1px solid rgb(var(--v-theme-on-surface) / 10%);
}

.color-card {
  overflow: hidden;
}

.color-swatch {
  block-size: 80px;
  inline-size: 100%;
  background: rgb(var(--v-theme-surface));
}

.color-swatch--placeholder {
  background: rgb(var(--v-theme-on-surface) / 6%);
}

.fade-placeholder {
  border-radius: 6px;
  min-block-size: 12px;
  animation: fade-pulse 1.2s ease-in-out infinite;
  background-color: rgb(var(--v-theme-on-surface) / 6%);
}

.fade-placeholder.text-caption {
  min-block-size: 10px;
  max-inline-size: 60px;
}

.fade-placeholder.text-subtitle-2 {
  max-inline-size: 90px;
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
</style>
