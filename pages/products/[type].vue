<script setup>
import ProductCard from '@/components/ProductCard.vue'
import { useAuthStore } from '@/stores/auth'
import { debounce } from 'lodash'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

const { t, te } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()
const config = useRuntimeConfig()
const products = ref()
const route = useRoute('products-type')
const router = useRouter()
const loading = ref(true)
const filterDialog = ref(false)
const filterLoading = ref(false)

const DESTINATION_OPTIONS = [
  { value: 'Habitations', labelKey: 'products.filters.destination.habitations' },
  { value: 'Bureaux', labelKey: 'products.filters.destination.offices' },
  { value: 'Hotel', labelKey: 'products.filters.destination.hotel' },
  { value: 'Restaurants', labelKey: 'products.filters.destination.restaurants' },
  { value: 'Showroom', labelKey: 'products.filters.destination.showroom' },
  { value: 'Magasins', labelKey: 'products.filters.destination.stores' },
]

// Bind dialog inputs directly to URL query
// Debounced router push to avoid rapid query updates
function cleanQuery(raw) {
  const q = { ...raw }

  // Remove defaults and empty values
  if (String(q.p || '') === '1')
    delete q.p
  if (String(q.perPage || '') === '10')
    delete q.perPage
  Object.keys(q).forEach(k => {
    const v = q[k]
    if (v === undefined || v === null || v === '')
      delete q[k]
  })

  return q
}

const debouncedPush = debounce(query => {
  filterLoading.value = true
  router.push({ name: 'products-type', params: { type: route.params.type }, query: cleanQuery(query) })
    .finally(() => { filterLoading.value = false })
}, 400)

const qSearch = computed({
  get: () => route.query.search?.toString() || '',
  set: val => debouncedPush({ ...route.query, search: val || undefined }),
})

const qDestination = computed({
  get: () => (route.query.destination?.toString() || '').split(',').filter(Boolean),
  set: vals => debouncedPush({ ...route.query, destination: vals?.length ? vals.join(',') : undefined }),
})

const SUPPORT_OPTIONS = [
  { value: 'Platre', labelKey: 'products.filters.support.plaster' },
  { value: 'Ciment', labelKey: 'products.filters.support.cement' },
  { value: 'Enduit', labelKey: 'products.filters.support.render' },
  { value: 'Brique', labelKey: 'products.filters.support.brick' },
]

const qSupports = computed({
  get: () => (route.query.supports?.toString() || '').split(',').filter(Boolean),
  set: vals => debouncedPush({ ...route.query, supports: vals?.length ? vals.join(',') : undefined }),
})

const type = computed({
  get: () => route.params.type,
  set: () => route.params.type,
}) ?? 'decor'

const typeTitle = computed(() => {
  const raw = String(type.value || '')
  const productKey = `nav.products.${raw || 'root'}`
  if (te(productKey))
    return t(productKey)

  const colorKey = `colors.${raw}`
  if (raw && te(colorKey))
    return t(colorKey)

  return raw ? raw.replace(/[-_]/g, ' ') : t('nav.products.root')
})

// navigation
const pagination = ref({
  page: 1,
  totalProduct: 0,
  itemsPerPage: 10,
})

const fetchData = async () => {
  loading.value = true
  products.value = undefined

  const headers = { 'Content-Type': 'application/json' }
  if (authStore.token)
    headers.Authorization = `Bearer ${authStore.token}`
  const params = new URLSearchParams()

  params.set('p', String(pagination.value.page))
  params.set('perPage', String(pagination.value.itemsPerPage))
  params.set('type', String(type.value))
  if (route.query.search)
    params.set('search', route.query.search.toString())
  if (route.query.destination)
    params.set('destination', route.query.destination.toString())
  if (route.query.supports)
    params.set('supports', route.query.supports.toString())

  // price filters removed

  const res = await fetch(`${config.public.apiBaseUrl}/api/products?${params.toString()}`, { headers })
  const data = await res.json()

  products.value = data.data.map(ele => ({
    ...ele,
    finishing: ele.aspectdifilmsec,
    description: ele.definition,
    price: ele.variances[0].price,
    imgSrc: ele.imageUrl,
    avatar: ele.avatar || '',
    isFavorite: ele.isFavorite || false,
  }))
  pagination.value.totalProduct = data.pagination.total
  loading.value = false
}

function handleToggleFavorite({ _id, isFavorite }) {
  const product = products.value?.find(p => p._id === _id)
  if (product)
    product.isFavorite = isFavorite
}

onMounted(() => {
  fetchData()
})

watch(() => [pagination.value.page], () => {
  fetchData()
})

watch(() => route.query, () => {
  // refetch whenever query changes
  fetchData()
})

const resetFilters = async () => {
  const q = {
    p: pagination.value.page,
    perPage: pagination.value.itemsPerPage,
  }

  await router.push({ name: 'products-type', params: { type: type.value }, query: cleanQuery(q) })
  filterDialog.value = false
}
</script>

<template>
  <div>
    <VCard class="mb-6 pa-4">
      <VCardTitle class="px-0 pb-4">
        <div class="d-flex align-center justify-space-between">
          <VCardTitle>
            {{ typeTitle }}
          </VCardTitle>
          <VBtn
            append-icon="tabler-filter"
            variant="text"
            @click="filterDialog = true"
          >
            {{ t('products.filters.button') }}
          </VBtn>
        </div>
      </VCardTitle>
      <VRow
        v-if="loading"
        class="px-4"
      >
        <VCol
          cols="12"
          class="d-flex align-center justify-center py-6"
        >
          <VProgressCircular
            indeterminate
            color="primary"
          />
        </VCol>
      </VRow>

      <div
        v-else-if="!products || products.length === 0"
        class="text-center py-12"
      >
        <VIcon
          icon="tabler-paint-off"
          size="64"
          class="text-disabled mb-4"
        />
        <p class="text-h6 text-disabled">
          {{ t('products.empty.title') }}
        </p>
        <p class="text-body-2 text-disabled">
          {{ t('products.empty.subtitle') }}
        </p>
      </div>

      <VRow v-else>
        <ProductCard
          v-for="(product, index) in products"
          :key="index"
          :_id="product._id"
          :img-src="product.imgSrc"
          :avatar="product.avatar"
          :title="product.title"
          :description="product.description"
          :price="product.price"
          :destination="product.destination"
          :is-favorite="product.isFavorite"
          @toggle-favorite="handleToggleFavorite"
        />
      </VRow>

      <div class="d-flex justify-end px-5 pt-3">
        <VPagination
          v-model="pagination.page"
          :length="Math.min(Math.ceil(pagination.totalProduct / pagination.itemsPerPage), 5)"
          :total-visible="$vuetify.display.xs ? 1 : Math.min(Math.ceil(pagination.totalProduct / pagination.itemsPerPage), 5)"
        />
      </div>
    </VCard>

    <VDialog
      v-model="filterDialog"
      max-width="640"
    >
      <VCard class="py-2">
        <VCardTitle class="d-flex align-center justify-space-between">
          <span class="d-flex align-center gap-3">
            <span>{{ t('products.filters.title') }}</span>
            <VProgressCircular
              v-if="filterLoading"
              indeterminate
              size="20"
              color="primary"
            />
          </span>
          <VBtn
            icon
            variant="text"
            @click="filterDialog = false"
          >
            <VIcon icon="tabler-x" />
          </VBtn>
        </VCardTitle>
        <VCardText>
          <VRow>
            <VCol cols="12">
              <AppTextField
                v-model="qSearch"
                :label="t('products.filters.search_label')"
                :disabled="filterLoading"
              />
            </VCol>
            <VCol cols="12">
              <h6 class="text-subtitle-1 mb-2">
                {{ t('products.filters.destination.title') }}
              </h6>
              <div class="d-flex flex-wrap gap-3">
                <VCheckbox
                  v-for="opt in DESTINATION_OPTIONS"
                  :key="opt.value"
                  :label="t(opt.labelKey)"
                  :model-value="qDestination.includes(opt.value)"
                  :disabled="filterLoading"
                  @update:model-value="(val) => {
                    const next = new Set(qDestination)
                    if (val) next.add(opt.value); else next.delete(opt.value)
                    qDestination = Array.from(next)
                  }"
                />
              </div>
            </VCol>
            <VCol cols="12">
              <h6 class="text-subtitle-1 mb-2">
                {{ t('products.filters.support.title') }}
              </h6>
              <div class="d-flex flex-wrap gap-3">
                <VCheckbox
                  v-for="opt in SUPPORT_OPTIONS"
                  :key="opt.value"
                  :label="t(opt.labelKey)"
                  :model-value="qSupports.includes(opt.value)"
                  :disabled="filterLoading"
                  @update:model-value="(val) => {
                    const next = new Set(qSupports)
                    if (val) next.add(opt.value); else next.delete(opt.value)
                    qSupports = Array.from(next)
                  }"
                />
              </div>
            </VCol>
          </VRow>
        </VCardText>
        <VCardActions class="d-flex justify-end">
          <VBtn
            :disabled="filterLoading"
            @click="resetFilters"
          >
            {{ t('products.filters.reset') }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>
