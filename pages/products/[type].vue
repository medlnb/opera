<script setup>
import ProductCard from '@/components/ProductCard.vue';
import { useAuthStore } from '@/stores/auth';
import { debounce } from 'lodash';
import { useRoute, useRouter } from 'vue-router';

const authStore = useAuthStore();
const config = useRuntimeConfig();
const products = ref()
const route = useRoute('products-type')
const router = useRouter()
const loading = ref(true)
const filterDialog = ref(false)
const filterLoading = ref(false)
const DESTINATION_OPTIONS = ['Habitations','Bureaux','Hotel','Restaurants','Showroom','Magasins']
// Bind dialog inputs directly to URL query
// Debounced router push to avoid rapid query updates
function cleanQuery(raw) {
  const q = { ...raw }
  // Remove defaults and empty values
  if (String(q.p || '') === '1') delete q.p
  if (String(q.perPage || '') === '10') delete q.perPage
  Object.keys(q).forEach(k => {
    const v = q[k]
    if (v === undefined || v === null || v === '') delete q[k]
  })
  return q
}

const debouncedPush = debounce((query) => {
  filterLoading.value = true
  router.push({ name: 'products-type', params: { type: route.params.type }, query: cleanQuery(query) })
    .finally(() => { filterLoading.value = false })
}, 400)

const qSearch = computed({
  get: () => route.query.search?.toString() || '',
  set: (val) => debouncedPush({ ...route.query, search: val || undefined }),
})

const qDestination = computed({
  get: () => (route.query.destination?.toString() || '').split(',').filter(Boolean),
  set: (vals) => debouncedPush({ ...route.query, destination: vals?.length ? vals.join(',') : undefined }),
})

const SUPPORT_OPTIONS = ['Platre','Ciment','Enduit','Brique']
const qSupports = computed({
  get: () => (route.query.supports?.toString() || '').split(',').filter(Boolean),
  set: (vals) => debouncedPush({ ...route.query, supports: vals?.length ? vals.join(',') : undefined }),
})

const type = computed({
  get: () => route.params.type,
  set: () => route.params.type,
}) ?? "interior"

// navigation
const pagination = ref({
  page: 1,
  totalProduct: 0,
  itemsPerPage: 10
})

const fetchData = async () =>{
  loading.value = true
  products.value = undefined
  const headers = { 'Content-Type': 'application/json' }
  if (authStore.token) headers['Authorization'] = `Bearer ${authStore.token}`
  const params = new URLSearchParams()
  params.set('p', String(pagination.value.page))
  params.set('perPage', String(pagination.value.itemsPerPage))
  params.set('type', String(type.value))
  if (route.query.search) params.set('search', route.query.search.toString())
  if (route.query.destination) params.set('destination', route.query.destination.toString())
  if (route.query.supports) params.set('supports', route.query.supports.toString())
  // price filters removed

  const res = await fetch(`${config.public.apiBaseUrl}/api/products?${params.toString()}`, { headers });
  const data = await res.json();
  products.value = data.data.map(ele=>({
    ...ele,
    finishing: ele.aspectdifilmsec,
    description: ele.definition,
    price: ele.variances[0].price,
    imgSrc: ele.imageUrl,
    avatar: ele.avatar || '',
    isFavorite: ele.isFavorite || false
  }))
  pagination.value.totalProduct = data.pagination.total
  loading.value = false
}

function handleToggleFavorite({ _id, isFavorite }) {
  const product = products.value?.find(p => p._id === _id)
  if (product) product.isFavorite = isFavorite
}

onMounted(() => {
  fetchData()
});

watch(()=>[pagination.value.page],()=>{
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
      <template #title>
        <div class="d-flex align-center justify-space-between">
          <VCardTitle>
            {{ type }}
          </VCardTitle>
          <VBtn append-icon="tabler-filter" variant="text" @click="filterDialog = true">Filters</VBtn>
        </div>
      </template>
      <VRow class="px-4" v-if="loading">
        <VCol cols="12" class="d-flex align-center justify-center py-6">
          <VProgressCircular indeterminate color="primary" />
        </VCol>
      </VRow>

      <div v-else-if="!products || products.length === 0" class="text-center py-12">
        <VIcon icon="tabler-paint-off" size="64" class="text-disabled mb-4" />
        <p class="text-h6 text-disabled">No products found</p>
        <p class="text-body-2 text-disabled">Try adjusting your filters or check back later</p>
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

    <VDialog v-model="filterDialog" max-width="640">
      <VCard class="py-2">
            <VCardTitle class="d-flex align-center justify-space-between">
              <span class="d-flex align-center gap-3">
                <span>Filter Products</span>
                <VProgressCircular v-if="filterLoading" indeterminate size="20" color="primary" />
              </span>
            <VBtn icon variant="text" @click="filterDialog = false">
              <VIcon icon="tabler-x" />
            </VBtn>
          </VCardTitle>
        <VCardText>
          <VRow>
            <VCol cols="12">
                <AppTextField v-model="qSearch" label="Search (title/type)" :disabled="filterLoading" />
            </VCol>
            <VCol cols="12">
              <h6 class="text-subtitle-1 mb-2">Destination</h6>
              <div class="d-flex flex-wrap gap-3">
                <VCheckbox
                  v-for="opt in DESTINATION_OPTIONS"
                  :key="opt"
                  :label="opt"
                  :model-value="qDestination.includes(opt)"
                    :disabled="filterLoading"
                  @update:model-value="(val) => {
                    const next = new Set(qDestination)
                    if (val) next.add(opt); else next.delete(opt)
                    qDestination = Array.from(next)
                  }"
                />
              </div>
            </VCol>
            <VCol cols="12">
              <h6 class="text-subtitle-1 mb-2">Supports</h6>
              <div class="d-flex flex-wrap gap-3">
                <VCheckbox
                  v-for="opt in SUPPORT_OPTIONS"
                  :key="opt"
                  :label="opt"
                  :model-value="qSupports.includes(opt)"
                    :disabled="filterLoading"
                  @update:model-value="(val) => {
                    const next = new Set(qSupports)
                    if (val) next.add(opt); else next.delete(opt)
                    qSupports = Array.from(next)
                  }"
                />
              </div>
            </VCol>
            
          </VRow>
        </VCardText>
        <VCardActions class="d-flex justify-end">
            <VBtn :disabled="filterLoading" @click="resetFilters">Reset</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>
