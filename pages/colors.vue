<script setup>
import { useI18n } from 'vue-i18n'
import { useApi } from '@/composables/useApi'

const loading = ref(false)
const colors = ref([])
const snackbar = ref({ show: false, color: 'error', text: '' })

const { t } = useI18n()

async function fetchColors() {
  try {
    loading.value = true

    const { data, error } = await useApi('/api/products/colors', { method: 'GET' })
    if (error.value)
      throw error.value
    const list = data.value?.colors ?? []

    colors.value = Array.isArray(list) ? list : []
  }
  catch (e) {
    snackbar.value = { show: true, color: 'error', text: t('colors_page.errors.load_failed') }
  }
  finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchColors()
})
</script>

<template>
  <div>
    <div class="mb-4 hero-wrap">
      <VImg
        src="https://jazeerapaints.com/media/blockbuilder_blocktype/1/1/1172x210_3_1__2.png"
        class="rounded w-100 hero-img"
        style="min-block-size: 150px;"
        height="250"
        cover
        position="left center"
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
        class="d-flex align-center justify-center position-absolute hero-overlay"
      >
        <div class="text-center px-4 hero-text">
          <p class="mb-1 hero-title">
            {{ t('colors_page.hero_title') }}
          </p>
          <p class="mb-0 hero-subtitle">
            {{ t('colors_page.hero_subtitle') }}
          </p>
        </div>
      </div>
    </div>
    <VCard>
      <VCardText class="px-3 pt-2">
        <VCardTitle class="px-2">
          {{ t('nav.colors') }}
        </VCardTitle>
        <VRow v-if="loading">
          <VCol
            cols="12"
            class="d-flex align-center justify-center py-6"
          >
            <div
              class="fade-placeholder w-100"
              style="border-radius: 8px; min-block-size: 120px;"
            />
          </VCol>
        </VRow>

        <div
          v-else-if="colors.length === 0"
          class="text-center py-12"
        >
          <VIcon
            icon="tabler-palette-off"
            size="64"
            class="text-disabled mb-4"
          />
          <p class="text-h6 text-disabled">
            {{ t('colors_page.empty.title') }}
          </p>
          <p class="text-body-2 text-disabled">
            {{ t('colors_page.empty.subtitle') }}
          </p>
        </div>

        <VRow
          v-else
          dense
        >
          <VCol
            v-for="(c, i) in colors"
            :key="i"
            cols="6"
            sm="6"
            md="3"
          >
            <VCard
              class="pa-0"
              :to="`/products/${c.name}`"
              elevation="0"
            >
              <div :style="{ backgroundColor: c.code, height: $vuetify.display.xs ? '60px' : '100px', borderRadius: '8px' }" />
              <div class="d-flex flex-column pa-2 pt-1">
                <span class="text-subtitle-1">{{ c.name || t('common.unnamed') }}</span>
                <span class="text-caption">{{ c.code || '—' }}</span>
              </div>
            </VCard>
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <VSnackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      timeout="3000"
    >
      {{ snackbar.text }}
    </VSnackbar>
  </div>
</template>

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

.hero-title {
  font-size: 1.5rem;
  font-weight: 1200;
  text-shadow:
    0 1px 2px rgba(var(--v-theme-surface), 0.9),
    0 0 1px rgba(var(--v-theme-on-surface), 0.25);
}

.hero-subtitle {
  font-size: 1rem;
  font-weight: 1200;
  text-shadow:
    0 1px 2px rgba(var(--v-theme-surface), 0.9),
    0 0 1px rgba(var(--v-theme-on-surface), 0.25);
}

.hero-wrap {
  position: relative;
}

.hero-text {
  position: relative;
  z-index: 1;
  color: rgb(var(--v-theme-on-surface));
}

.hero-overlay {
  position: absolute;
}

.hero-overlay::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  /* Soft halo behind text for readability (no visible box). */
  background:
    radial-gradient(
      ellipse at center,
      rgba(var(--v-theme-surface), 0.92) 0%,
      rgba(var(--v-theme-surface), 0.55) 38%,
      rgba(var(--v-theme-surface), 0.18) 58%,
      rgba(var(--v-theme-surface), 0) 82%
    );
}

@media (min-width: 600px) {
  .hero-title {
    font-size: 2rem;
  }

  .hero-subtitle {
    font-size: 1.25rem;
  }
}
</style>
