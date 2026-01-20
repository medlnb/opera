<script setup>
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'

const authStore = useAuthStore()
const cartStore = useCartStore()
const config = useRuntimeConfig()
const { query } = useRoute()

const { t, te } = useI18n({ useScope: 'global' })

const productDetails = ref()
const productLoading = ref(true)
const panelStatus = ref()
const favoriteLoading = ref(false)
const addingToCart = ref(false)

const productTypeLabel = computed(() => {
  const type = productDetails.value?.type
  if (!type)
    return ''

  const key = `management.products.types.${type}`

  return te(key) ? t(key) : String(type)
})

function translateDestination(value) {
  const map = {
    Habitations: 'habitations',
    Bureaux: 'offices',
    Hotel: 'hotel',
    Restaurants: 'restaurants',
    Showroom: 'showroom',
    Magasins: 'stores',
  }

  const suffix = map[String(value)]
  if (!suffix)
    return String(value ?? '')

  const key = `products.filters.destination.${suffix}`

  return te(key) ? t(key) : String(value ?? '')
}

function translateSupport(value) {
  const map = {
    Platre: 'plaster',
    Ciment: 'cement',
    Enduit: 'render',
    Brique: 'brick',
  }

  const suffix = map[String(value)]
  if (!suffix)
    return String(value ?? '')

  const key = `products.filters.support.${suffix}`

  return te(key) ? t(key) : String(value ?? '')
}

function translateMaterial(value) {
  const map = {
    'Eponge nature': 'sponge_nature',
    'tampon décore': 'decorative_stamp',
    'Lisseuse': 'trowel',
    'couteau': 'knife',
    'brosse': 'brush',
    'Pinceau': 'paintbrush',
    'Lisseuse inox': 'stainless_trowel',
    'Pinceau plat spalter': 'flat_brush_spalter',
    'spatule plasque': 'plastic_spatula',
  }

  const suffix = map[String(value)]
  if (!suffix)
    return String(value ?? '')

  const key = `management.products.editor.application.material.${suffix}`

  return te(key) ? t(key) : String(value ?? '')
}

function translateAspect(value) {
  const map = {
    'Mitallise': 'metallized',
    'Brillant': 'glossy',
    'Soyeux': 'silky',
    'Lumineux': 'luminous',
    'Marbre Ultra Brillant': 'ultra_gloss_marble',
  }

  const suffix = map[String(value)]
  if (!suffix)
    return String(value ?? '')

  const key = `management.products.editor.technical.aspect.${suffix}`

  return te(key) ? t(key) : String(value ?? '')
}

useHead(() => ({
  title: productDetails.value?.title || t('products.details.page_title'),
}))

const technicalFileId = computed(() => {
  const tf = productDetails.value?.technicalFile

  return tf?._id || tf?.id || tf || null
})

const technicalFileName = computed(() => productDetails.value?.technicalFile?.filename || '')

const order = ref({
  variance: null,
  color: null,
  qty: 1,
})

const isColorRequired = computed(() => (productDetails.value?.colors?.length ?? 0) > 0)
const isColorSelected = computed(() => order.value.color !== null)

const canAddToCart = computed(() => {
  if (productLoading.value)
    return false

  if (!productDetails.value?._id)
    return false

  if (isColorRequired.value && !isColorSelected.value)
    return false

  if (order.value.variance === null)
    return false

  return true
})

const snackbar = ref({ show: false, message: '', color: 'success' })

const showSnackbar = (message, color = 'success') => {
  snackbar.value = { show: true, message, color }
}

const isDealDialogVisible = ref(false)

onMounted(async () => {
  try {
    productLoading.value = true

    const res = await fetch(`${config.public.apiBaseUrl}/api/products/${query.id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', 'authorization': `Bearer ${authStore.token}` },
    })

    const data = await res.json()

    productDetails.value = { ...productDetails.value, ...data.data }
  }
  catch (err) {
    console.error(err)
    showSnackbar(t('products.details.snackbar.load_failed'), 'error')
  }
  finally {
    productLoading.value = false
  }
})

function selectColor(i) {
  order.value.color = i
  panelStatus.value = undefined
}

function selectVariance(i) {
  order.value.variance = order.value.variance === i ? null : i
  panelStatus.value = undefined
}

async function addToCart() {
  if (!authStore.token)
    return navigateTo('/login')
  if (!productDetails.value?._id)
    return

  if (isColorRequired.value && order.value.color === null) {
    panelStatus.value = 0
    showSnackbar(t('products.details.snackbar.select_color'), 'error')

    return
  }

  if (order.value.variance === null) {
    panelStatus.value = 1

    return
  }
  const variance = productDetails.value.variances.find(v => v._id === order.value.variance)
  if (!variance?.quantity)
    return

  // Get selected color name or use empty string if no colors
  const colorName = productDetails.value.colors?.length && order.value.color != null
    ? productDetails.value.colors[order.value.color].name
    : ''

  try {
    addingToCart.value = true

    const success = await cartStore.addItem({
      productId: productDetails.value._id,
      variance: variance._id,
      color: colorName,
      qty: Math.max(1, Number(order.value.qty) || 1),
    })

    if (success) {
      panelStatus.value = undefined
      order.value.qty = 1
      showSnackbar(t('products.details.snackbar.added_to_cart'), 'success')
    }
    else {
      showSnackbar(t('products.details.snackbar.add_to_cart_failed'), 'error')
    }
  }
  catch (err) {
    console.error(err)
    showSnackbar(t('products.details.snackbar.add_to_cart_failed'), 'error')
  }
  finally {
    addingToCart.value = false
  }
}

async function addToFavorites() {
  if (!authStore.token)
    return navigateTo('/login')
  if (!productDetails.value?._id)
    return

  try {
    favoriteLoading.value = true

    const res = await fetch(`${config.public.apiBaseUrl}/api/favorites/${productDetails.value._id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`,
      },
    })

    if (!res.ok)
      throw new Error('Failed to add favorite')
    productDetails.value.isFavorite = true
    showSnackbar(t('products.details.snackbar.added_to_favorites'), 'success')
  }
  catch (err) {
    console.error(err)
    showSnackbar(t('products.details.snackbar.add_to_favorites_failed'), 'error')
  }
  finally {
    favoriteLoading.value = false
  }
}

async function removeFromFavorites() {
  if (!authStore.token)
    return navigateTo('/login')
  if (!productDetails.value?._id)
    return

  try {
    favoriteLoading.value = true

    const res = await fetch(`${config.public.apiBaseUrl}/api/favorites/${productDetails.value._id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`,
      },
    })

    if (!res.ok)
      throw new Error('Failed to remove favorite')
    productDetails.value.isFavorite = false
    showSnackbar(t('products.details.snackbar.removed_from_favorites'), 'success')
  }
  catch (err) {
    console.error(err)
    showSnackbar(t('products.details.snackbar.remove_from_favorites_failed'), 'error')
  }
  finally {
    favoriteLoading.value = false
  }
}

function toggleFavorite() {
  if (productDetails.value?.isFavorite)
    removeFromFavorites()
  else addToFavorites()
}
</script>

<template>
  <VCard class="overflow-visible course-details">
    <VCardText>
      <div
        v-if="productLoading"
        class="d-flex align-center justify-center py-12"
      >
        <VProgressCircular
          indeterminate
          color="primary"
          size="48"
        />
      </div>
      <template v-else>
        <VCardItem class="pa-0 mb-2">
          <VCardTitle class="mb-2">
            {{ productDetails?.title }}
          </VCardTitle>
          <template #append>
            <div class="d-flex gap-2 align-center">
              <VChip
                variant="tonal"
                color="info"
                label
              >
                {{ productTypeLabel }}
              </VChip>
              <IconBtn
                :loading="favoriteLoading"
                @click="toggleFavorite"
              >
                <VIcon
                  :icon="productDetails?.isFavorite ? 'tabler-heart-filled' : 'tabler-heart'"
                  :color="productDetails?.isFavorite ? 'error' : undefined"
                  size="26"
                />
              </IconBtn>
            </div>
          </template>
        </VCardItem>

        <VCard flat>
          <div class="pt-2">
            <VRow>
              <VCol
                cols="12"
                md="8"
                class="py-0"
              >
                <div class="bg-background rounded py-0">
                  <div
                    v-if="productLoading"
                    class="d-flex align-center justify-center product-image-placeholder"
                    style="background-color: #f0f0f0; block-size: 360px;"
                  >
                    <VProgressCircular
                      indeterminate
                      color="primary"
                    />
                  </div>
                  <VImg
                    v-else-if="productDetails"
                    :src="`${config.public.apiBaseUrl}/api/image?id=${productDetails.imageUrl}`"
                    class="w-100 rounded product-image"
                  >
                    <template #placeholder>
                      <div
                        class="d-flex align-center justify-center product-image-placeholder"
                        style="background-color: #f0f0f0;"
                      >
                        <VProgressCircular
                          indeterminate
                          color="primary"
                        />
                      </div>
                    </template>

                    <div
                      v-if="productDetails?.avatar"
                      class="product-avatar bg-grey-300"
                    >
                      <VImg
                        :src="`${config.public.apiBaseUrl}/api/image?id=${productDetails.avatar}`"
                        height="200"
                        width="200"
                        contain
                      />
                    </div>
                  </VImg>
                </div>
              </VCol>
              <VCol
                cols="12"
                md="4"
              >
                <div class="course-content">
                  <VExpansionPanels
                    v-model="panelStatus"
                    variant="accordion"
                    class="expansion-panels-width-border"
                  >
                    <VExpansionPanel
                      v-if="productDetails?.colors.length"
                      elevation="0"
                      :value="0"
                    >
                      <template #title>
                        <div>
                          <h5 class="text-h5 mb-1">
                            {{ t('products.details.panels.colors') }}
                          </h5>
                          <div
                            v-if="productDetails && order.color != null"
                            class="d-flex flex-wrap gap-1"
                          >
                            <VChip size="x-small">
                              {{ productDetails.colors[order.color].name }}
                            </VChip>
                          </div>
                        </div>
                      </template>
                      <template #text>
                        <VList class="card-list px-2">
                          <VListItem
                            v-for="(color, index) in productDetails?.colors ?? []"
                            :key="index"
                            class="py-4"
                          >
                            <template #prepend>
                              <VCheckbox
                                class="me-3"
                                :model-value="index === order.color"
                                @update:model-value="() => selectColor(index)"
                              />
                            </template>
                            <VListItemTitle class="d-flex align-center gap-2">
                              {{ color.name }}
                              <div
                                class="inline-block"
                                :style="`width: 40px; height: 20px; background-color: ${color.code}; border-radius: 4px; margin-right: 8px;`"
                              />
                            </VListItemTitle>
                          </VListItem>
                        </VList>
                      </template>
                    </VExpansionPanel>
                    <VExpansionPanel
                      elevation="0"
                      :value="1"
                    >
                      <template #title>
                        <div>
                          <h5 class="text-h5 mb-1">
                            {{ t('products.details.panels.size') }}
                          </h5>
                          <div
                            v-if="productDetails && order.variance != null"
                            class="d-flex flex-wrap gap-1"
                          >
                            <VChip size="x-small">
                              {{ productDetails.variances.find(v => v._id === order.variance)?.quantity ?? '-' }}
                            </VChip>
                          </div>
                        </div>
                      </template>
                      <template #text>
                        <VList class="card-list px-2">
                          <VListItem
                            v-for="variance in productDetails?.variances"
                            :key="variance._id"
                            class="py-4"
                          >
                            <template #prepend>
                              <VCheckbox
                                class="me-3"
                                :model-value="order.variance === variance._id"
                                @update:model-value="() => selectVariance(variance._id)"
                              />
                            </template>
                            <VListItemTitle class="text-high-emphasis font-weight-medium mb-1">
                              {{ variance.quantity }}
                            </VListItemTitle>
                            <VListItemSubtitle>
                              <span class="text-disabled text-base">{{ variance.price }} {{ t('products.details.currency_dzd') }}</span>
                            </VListItemSubtitle>
                          </VListItem>
                        </VList>
                      </template>
                    </VExpansionPanel>

                    <VExpansionPanel
                      elevation="0"
                      :value="2"
                    >
                      <template #title>
                        <div class="d-flex align-center justify-space-between w-100">
                          <div>
                            <h5 class="text-h5 mb-1">
                              {{ t('products.details.panels.quantity') }}
                            </h5>
                            <div
                              v-if="order.qty != null"
                              class="d-flex flex-wrap gap-1"
                            >
                              <VChip size="x-small">
                                {{ order.qty }}
                              </VChip>
                            </div>
                          </div>
                        </div>
                      </template>
                      <template #text>
                        <div class="d-flex align-center justify-center gap-2">
                          <VBtn
                            icon="tabler-minus"
                            variant="tonal"
                            density="comfortable"
                            @click="order.qty = Math.max(1, (Number(order.qty) || 1) - 1)"
                          />
                          <div>
                            <AppTextField
                              v-model.number="order.qty"
                              type="number"
                              min="1"
                              density="comfortable"
                              style="inline-size: 92px;"
                            />
                          </div>
                          <VBtn
                            icon="tabler-plus"
                            variant="tonal"
                            density="comfortable"
                            @click="order.qty = Math.max(1, (Number(order.qty) || 1) + 1)"
                          />
                        </div>
                      </template>
                    </VExpansionPanel>
                  </VExpansionPanels>
                  <div class="d-flex flex-wrap gap-2 mt-2">
                    <VBtn
                      class="mt-2 flex-fill"
                      color="primary"
                      :loading="addingToCart"
                      :disabled="!canAddToCart"
                      @click="addToCart"
                    >
                      {{ t('products.details.actions.add_to_cart') }}
                    </VBtn>

                    <VBtn
                      class="mt-2 flex-fill"
                      variant="tonal"
                      color="secondary"
                      @click="isDealDialogVisible = true"
                    >
                      {{ t('deals.actions.request_deal') }}
                    </VBtn>
                  </div>
                </div>
              </VCol>
            </VRow>
          </div>
          <VCardText class="px-0">
            <h5 class="text-h5 mb-3 pt-2">
              {{ t('products.details.sections.about') }}
            </h5>
            <p class="text-body-1">
              {{ productDetails?.definition }}
            </p>

            <template v-if="productDetails?.destination?.length">
              <VDivider class="my-6" />
              <h5 class="text-h5 mb-3">
                {{ t('products.details.sections.destinations') }}
              </h5>
              <div class="d-flex flex-wrap gap-2">
                <VChip
                  v-for="(dest, i) in productDetails.destination"
                  :key="`dest-${i}`"
                  label
                  variant="tonal"
                >
                  {{ translateDestination(dest) }}
                </VChip>
              </div>
            </template>

            <template v-if="productDetails?.properties?.length">
              <VDivider class="my-6" />
              <h5 class="text-h5 mb-3">
                {{ t('products.details.sections.properties') }}
              </h5>
              <VList class="card-list">
                <VListItem
                  v-for="(prop, i) in productDetails.properties"
                  :key="`prop-${i}`"
                >
                  <template #prepend>
                    <VIcon icon="tabler-check" />
                  </template>
                  <VListItemTitle class="text-body-1">
                    {{ prop }}
                  </VListItemTitle>
                </VListItem>
              </VList>
            </template>

            <VDivider class="my-6" />
            <h5 class="text-h5 mb-3">
              {{ t('products.details.sections.technical_characteristics') }}
            </h5>
            <VList class="card-list">
              <VListItem>
                <template #prepend>
                  <VIcon icon="tabler-scale" />
                </template>
                <VListItemTitle class="text-body-1">
                  {{ t('products.details.fields.density') }}: {{ productDetails?.densite }}
                </VListItemTitle>
              </VListItem>
              <VListItem>
                <template #prepend>
                  <VIcon icon="tabler-gauge" />
                </template>
                <VListItemTitle class="text-body-1">
                  {{ t('products.details.fields.coverage') }}: {{ productDetails?.rendement }}
                </VListItemTitle>
              </VListItem>
              <VListItem>
                <template #prepend>
                  <VIcon icon="tabler-hourglass" />
                </template>
                <VListItemTitle class="text-body-1">
                  {{ t('products.details.fields.drying_time') }}: {{ productDetails?.tempsSachage }}
                </VListItemTitle>
              </VListItem>
              <VListItem v-if="productDetails?.teinte">
                <template #prepend>
                  <VIcon icon="tabler-palette" />
                </template>
                <VListItemTitle class="text-body-1">
                  {{ t('products.details.fields.tint') }}: {{ productDetails.teinte }}
                </VListItemTitle>
              </VListItem>
              <VListItem v-if="productDetails?.viscosite">
                <template #prepend>
                  <VIcon icon="tabler-wave-sine" />
                </template>
                <VListItemTitle class="text-body-1">
                  {{ t('products.details.fields.viscosity') }}: {{ productDetails.viscosite }}
                </VListItemTitle>
              </VListItem>
            </VList>
            <template v-if="productDetails?.aspectdifilmsec?.length">
              <VLabel class="mb-2 pt-4">
                {{ t('products.details.fields.appearance_of_paint_film') }}
              </VLabel>
              <div class="d-flex flex-wrap gap-2 ps-4">
                <VChip
                  v-for="(a, i) in productDetails.aspectdifilmsec"
                  :key="`aspect-${i}`"
                  label
                  variant="tonal"
                >
                  {{ translateAspect(a) }}
                </VChip>
              </div>
            </template>

            <VDivider class="my-6" />
            <h5 class="text-h5 mb-3">
              {{ t('products.details.sections.application') }}
            </h5>
            <VList class="card-list pb-2">
              <VListItem>
                <template #prepend>
                  <VIcon icon="tabler-droplet" />
                </template>
                <VListItemTitle class="text-body-1">
                  {{ t('products.details.fields.dilution') }}: {{ productDetails?.dilution }}
                </VListItemTitle>
              </VListItem>
              <VListItem v-if="productDetails?.nettoyageMateriel">
                <template #prepend>
                  <VIcon icon="tabler-brush" />
                </template>
                <VListItemTitle class="text-body-1">
                  {{ t('products.details.fields.tool_cleaning') }}: {{ productDetails.nettoyageMateriel }}
                </VListItemTitle>
              </VListItem>
              <VListItem v-if="productDetails?.preparationSupport">
                <template #prepend>
                  <VIcon icon="tabler-hammer" />
                </template>
                <VListItemTitle class="text-body-1">
                  {{ t('products.details.fields.surface_prep') }}: {{ productDetails.preparationSupport }}
                </VListItemTitle>
              </VListItem>
            </VList>

            <template v-if="productDetails?.supports?.length">
              <h6 class="text-subtitle-1 mt-2 mb-2">
                {{ t('products.details.fields.supported_surfaces') }}
              </h6>
              <div class="d-flex flex-wrap gap-2">
                <VChip
                  v-for="(s, i) in productDetails.supports"
                  :key="`sup-${i}`"
                  label
                  variant="tonal"
                >
                  {{ translateSupport(s) }}
                </VChip>
              </div>
            </template>

            <template v-if="productDetails?.materielApplication?.length">
              <h6 class="text-subtitle-1 mt-2 mb-2 pt-2">
                {{ t('products.details.fields.application_tools') }}
              </h6>
              <div class="d-flex flex-wrap gap-2">
                <VChip
                  v-for="(m, i) in productDetails.materielApplication"
                  :key="`mat-${i}`"
                  label
                  variant="tonal"
                >
                  {{ translateMaterial(m) }}
                </VChip>
              </div>
            </template>
            <template v-if="technicalFileId">
              <VDivider class="my-6" />
              <h5 class="text-h5 mb-3">
                {{ t('products.details.sections.technical_file') }}
              </h5>
              <div class="d-flex flex-wrap gap-2 align-center">
                <VBtn
                  color="primary"
                  variant="tonal"
                  prepend-icon="tabler-file-type-pdf"
                  :href="`${config.public.apiBaseUrl}/api/technical-files?id=${technicalFileId}`"
                  target="_blank"
                  rel="noopener"
                >
                  {{ t('products.details.actions.download_pdf') }}
                </VBtn>
                <span
                  v-if="technicalFileName"
                  class="text-body-2 text-medium-emphasis"
                >
                  {{ technicalFileName }}
                </span>
              </div>
            </template>
          </VCardText>
        </VCard>
      </template>
    </VCardText>
  </VCard>
  <VSnackbar
    v-model="snackbar.show"
    :color="snackbar.color"
    timeout="5000"
    location="bottom end"
  >
    {{ snackbar.message }}
  </VSnackbar>

  <DealRequestDialog
    :is-dialog-visible="isDealDialogVisible"
    :initial-note="productDetails?.title ? `${t('deals.dialog.prefill_about_product')}: ${productDetails?.title}` : ''"
    @update:is-dialog-visible="val => (isDealDialogVisible = val)"
  />
</template>

<style lang="scss" scoped>
.card-list{
  --v-card-list-gap: 1rem;
}

.course-content{
  position: sticky;
  inset-block-start: 5.25rem;
}
</style>

<style lang="scss">
.v-expansion-panel-text__wrapper{
  padding-block: 0.75rem !important;
  padding-inline: 0.5rem !important;
}

.v-expansion-panel--active{
  .v-expansion-panel-title{
    border-block-end: 1px solid rgba(var(--v-theme-on-surface), 0.12) !important;
  }
}
</style>

<style lang="scss">
body .v-layout .v-application__wrap{
  .course-details{
    .v-expansion-panels {
      .v-expansion-panel-title,
      .v-expansion-panel-title--active,
      .v-expansion-panel-title:hover,
      .v-expansion-panel-title:focus,
      .v-expansion-panel-title:focus-visible,
      .v-expansion-panel-title--active:focus,
      .v-expansion-panel-title--active:hover {
        .v-expansion-panel-title__overlay {
          opacity: 0.04 !important;
        }
      }
    }
  }
}

.product-image {
  position: relative;
  block-size: 400px !important;
}

.product-image-placeholder {
  block-size: 400px !important;
}

.product-avatar {
  position: absolute;
  padding: 8px;
  border-radius: 10px;
  block-size: 100px;
  inline-size: 100px;
  inset-block-end: 12px;
  inset-inline-end: 12px;
}

@media (max-width: 600px) {
  .product-image { block-size: 200px !important; }
  .product-image-placeholder { block-size: 200px !important; }

  .product-avatar {
    border-radius: 8px;
    block-size: 80px;
    inline-size: 80px;
    inset-block-end: 8px;
    inset-inline-end: 8px;
  }
}
</style>
