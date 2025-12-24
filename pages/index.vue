<script setup>
import { useI18n } from 'vue-i18n';

const { t } = useI18n({ useScope: 'global' })

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
</script>

<template>
  <div>
    <!-- Hero Section -->
    <VCard class="hero-section mb-6 overflow-hidden">
      <div class="hero-bg" />
      <VCardText class="hero-content text-center py-12 px-4 position-relative">
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

    <!-- Stats Section -->
    <VRow class="mb-6">
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

    <!-- About Section -->
    <VCard class="mb-6">
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

    <!-- Features Section -->
    <div class="mb-6">
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
    </div>

    <!-- CTA Section -->
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
  </div>
</template>

<style scoped>
.hero-section {
  position: relative;
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)) 0%, #1a237e 100%);
}

.hero-bg {
  position: absolute;
  background-image: url("https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=1200");
  background-position: center;
  background-size: cover;
  inset: 0;
  opacity: 0.15;
}

.hero-content {
  z-index: 1;
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
</style>
