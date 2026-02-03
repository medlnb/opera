<script setup lang="ts">
import { paginationMeta } from '@api-utils/paginationMeta'
import { useI18n } from 'vue-i18n'
import { VDataTableServer } from 'vuetify/labs/VDataTable'

import { useAuthStore } from '@/stores/auth'

definePageMeta({
  authed: true,
})

const { t } = useI18n({ useScope: 'global' })

useHead(() => ({
  title: t('user.my_favorites'),
}))

const headers = [
  { title: t('account.favorites.table.product'), key: 'product' },
  { title: t('account.favorites.table.type'), key: 'type' },
  { title: t('account.favorites.table.price'), key: 'price' },
  { title: t('account.favorites.table.actions'), key: 'actions', sortable: false },
]

// Data table options
const itemsPerPage = ref(10)
const page = ref(1)

// Update data table options
const updateOptions = (options: any) => {
  page.value = options.page
}

// Refetch when page changes
watch(page, () => {
  fetchProducts()
})

// Reset to first page when per-page changes, then refetch
watch(itemsPerPage, () => {
  page.value = 1
  fetchProducts()
})

onMounted(() => {
  fetchProducts()
})

const authStore = useAuthStore()
const config = useRuntimeConfig()

const productsData = ref<{ data: any[]; pagination: { total: number } } | null>(null)
const loading = ref(false)
const deleting = reactive(new Set<string>())

const products = computed(() => (productsData.value?.data || []).map(ele => ({
  id: ele._id,
  productName: ele.title,
  productBrand: ele.brand || '',
  type: ele.type,
  image: ele.imageUrl ? `${config.public.apiBaseUrl}/api/image?id=${ele.imageUrl}` : undefined,
  price: ele.variances?.[0]?.price ?? 0,
})))

const totalProduct = computed(() => productsData.value?.pagination.total || 0)

const fetchProducts = async () => {
  try {
    loading.value = true

    const res = await fetch(`${config.public.apiBaseUrl}/api/favorites?p=${page.value}&perPage=${itemsPerPage.value}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`,
      },
    })

    const data = await res.json()

    productsData.value = data
  }
  finally {
    loading.value = false
  }
}

const deleteProduct = async (id: string) => {
  if (deleting.has(id))
    return
  deleting.add(id)
  try {
    await fetch(`${config.public.apiBaseUrl}/api/favorites/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`,
      },
    })
    await fetchProducts()
  }
  finally {
    deleting.delete(id)
  }
}

const goToProduct = (id: string) => navigateTo(`/product?id=${encodeURIComponent(id)}`)
</script>

<template>
  <div>
    <VCard
      :title="t('user.my_favorites')"
      class="mb-6"
    >
      <VDivider class="my-4" />
      <div class="d-flex flex-wrap gap-4 mx-5">
        <VSpacer />
        <div class="d-flex gap-4 flex-wrap align-center">
          <AppSelect
            v-model="itemsPerPage"
            :items="[5, 10, 20, 25, 50]"
          />
        </div>
      </div>

      <VDivider class="mt-4" />

      <!-- 👉 Datatable  -->
      <VDataTableServer
        v-model:items-per-page="itemsPerPage"
        v-model:page="page"
        :headers="headers"
        :items="products"
        :items-length="totalProduct"
        :loading="loading"
        class="text-no-wrap"
        @update:options="updateOptions"
      >
        <template #loading>
          <div class="d-flex justify-center py-6">
            <VProgressCircular
              indeterminate
              color="primary"
            />
          </div>
        </template>

        <template #no-data>
          <div class="text-center py-12">
            <VIcon
              icon="tabler-heart-off"
              size="64"
              class="text-disabled mb-4"
            />
            <p class="text-h6 text-disabled">
              {{ t('account.favorites.empty.title') }}
            </p>
            <p class="text-body-2 text-disabled">
              {{ t('account.favorites.empty.subtitle') }}
            </p>
            <VBtn
              color="primary"
              to="/products/decor"
              class="mt-4"
            >
              {{ t('account.favorites.actions.browse_products') }}
            </VBtn>
          </div>
        </template>

        <!-- product  -->
        <template #item.product="{ item }">
          <div
            class="d-flex align-center gap-x-2 favorite-product"
            role="button"
            tabindex="0"
            @click="goToProduct(item.id)"
            @keydown.enter.prevent="goToProduct(item.id)"
          >
            <VAvatar
              v-if="item.image"
              size="38"
              variant="tonal"
              rounded
              :image="item.image"
            />
            <div class="d-flex flex-column">
              <span class="text-body-1 font-weight-medium">{{ item.productName }}</span>
              <span class="text-sm text-disabled">{{ item.productBrand }}</span>
            </div>
          </div>
        </template>

        <template #item.price="{ item }">
          {{ item.price }} {{ t('account.favorites.currency_dzd') }}
        </template>

        <!-- type -->
        <template #item.type="{ item }">
          <VChip
            label
            density="comfortable"
            color="primary"
            variant="tonal"
          >
            {{ item.type }}
          </VChip>
        </template>

        <!-- Actions -->
        <template #item.actions="{ item }">
          <IconBtn :disabled="deleting.has(item.id)">
            <template v-if="deleting.has(item.id)">
              <VProgressCircular
                indeterminate
                size="20"
                color="error"
              />
            </template>
            <template v-else>
              <VIcon
                icon="tabler-trash"
                color="error"
                @click.stop
                @click="deleteProduct(item.id)"
              />
            </template>
          </IconBtn>
        </template>

        <template #bottom>
          <VDivider />

          <div class="d-flex align-center justify-space-between flex-wrap gap-3 pa-5 pt-3">
            <p class="text-sm text-medium-emphasis mb-0">
              {{ paginationMeta({ page, itemsPerPage }, totalProduct) }}
            </p>

            <VPagination
              v-model="page"
              :length="Math.min(Math.ceil(totalProduct / itemsPerPage), 5)"
              :total-visible="$vuetify.display.xs ? 1 : Math.min(Math.ceil(totalProduct / itemsPerPage), 5)"
            />
          </div>
        </template>
      </VDataTableServer>
    </VCard>
  </div>
</template>

<style lang="scss" scoped>
.product-widget{
  border-block-end: 1px solid rgba(var(--v-theme-on-surface), var(--v-border-opacity));
  padding-block-end: 1rem;
}

.favorite-product {
  cursor: pointer;
}
</style>
