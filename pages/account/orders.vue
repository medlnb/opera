<script setup>
import { VDataTableServer } from 'vuetify/labs/VDataTable'
import { useAuthStore } from '@/stores/auth'
import { paginationMeta } from '@api-utils/paginationMeta'

definePageMeta({
  authed: true,
})

const authStore = useAuthStore()
const config = useRuntimeConfig()

const headers = [
  { title: 'Items', key: 'itemsCount', sortable: false },
  { title: 'Status', key: 'status' },
  { title: 'Total', key: 'total' },
  { title: 'Date', key: 'createdAt' },
]

const items = ref([])
const loading = ref(false)
const page = ref(1)
const perPage = ref(10)
const totalItems = ref(0)

async function fetchOrders() {
  if (!authStore.token) {
    navigateTo('/login')

    return
  }
  loading.value = true
  try {
    const url = new URL(`${config.public.apiBaseUrl}/api/orders`)

    url.searchParams.set('p', String(page.value))
    url.searchParams.set('perPage', String(perPage.value))

    const res = await fetch(url.toString(), {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`,
      },
    })

    if (!res.ok)
      throw new Error('Failed to fetch orders')
    const data = await res.json()
    const list = Array.isArray(data.data) ? data.data : []

    items.value = list.map(o => ({
      ...o,
      itemsCount: Array.isArray(o.items) ? o.items.length : 0,
    }))
    totalItems.value = Number(data.pagination?.total ?? list.length)
  }
  catch (err) {
    console.error(err)
  }
  finally {
    loading.value = false
  }
}

watch([page, perPage], () => {
  if (page.value < 1)
    page.value = 1
  fetchOrders()
})

onMounted(() => {
  fetchOrders()
})

function formatDate(d) {
  try {
    return new Date(d).toLocaleString()
  }
  catch {
    return d
  }
}
</script>

<template>
  <div>
    <VCard
      title="My Orders"
      class="mb-6"
    >
      <VCardText>
        <VDivider class="my-4" />
        <div class="d-flex flex-wrap gap-4 mx-5">
          <VSpacer />
          <div class="d-flex gap-4 flex-wrap align-center">
            <AppSelect
              v-model="perPage"
              :items="[5, 10, 20, 25, 50]"
            />
          </div>
        </div>

        <VDivider class="mt-4" />

        <VDataTableServer
          v-model:items-per-page="perPage"
          v-model:page="page"
          :headers="headers"
          :items="items"
          :items-length="totalItems"
          :loading="loading"
          class="text-no-wrap"
        >
          <template #item.itemsCount="{ item }">
            <VAvatar
              size="28"
              variant="tonal"
            >
              <span class="text-body-2 font-weight-medium">{{ item.itemsCount }}</span>
            </VAvatar>
          </template>
          <template #item.createdAt="{ item }">
            {{ formatDate(item.createdAt) }}
          </template>
          <template #item.subtotal="{ item }">
            {{ item.subtotal }} DZD
          </template>
          <template #item.shippingCost="{ item }">
            {{ item.shippingCost || 0 }} DZD
          </template>
          <template #item.total="{ item }">
            <span class="text-primary font-weight-medium">{{ item.total }} DZD</span>
          </template>
          <template #item.status="{ item }">
            <VChip
              label
              size="small"
              color="info"
              variant="tonal"
            >
              {{ item.status }}
            </VChip>
          </template>

          <template #loading>
            <div class="py-8 text-center">
              <VProgressCircular
                indeterminate
                color="primary"
              />
            </div>
          </template>

          <template #no-data>
            <div class="text-center py-12">
              <VIcon
                icon="tabler-receipt-off"
                size="64"
                class="text-disabled mb-4"
              />
              <p class="text-h6 text-disabled">
                No orders yet
              </p>
              <p class="text-body-2 text-disabled">
                Your order history will appear here
              </p>
              <VBtn
                color="primary"
                to="/products/decor"
                class="mt-4"
              >
                Start Shopping
              </VBtn>
            </div>
          </template>

          <template #bottom>
            <VDivider />

            <div class="d-flex align-center justify-space-between flex-wrap gap-3 pa-5 pt-3">
              <p class="text-sm text-medium-emphasis mb-0">
                {{ paginationMeta({ page, itemsPerPage: perPage }, totalItems) }}
              </p>

              <VPagination
                v-model="page"
                :length="Math.min(Math.ceil(totalItems / perPage), 5)"
                :total-visible="$vuetify.display.xs ? 1 : Math.min(Math.ceil(totalItems / perPage), 5)"
              />
            </div>
          </template>
        </VDataTableServer>
      </VCardText>
    </VCard>
  </div>
</template>
