<script setup>
import { useAuthStore } from '@/stores/auth'
import { paginationMeta } from '@api-utils/paginationMeta'
import { VDataTableServer } from 'vuetify/labs/VDataTable'

definePageMeta({
  authed: true,
  admin: true,
})

const router = useRouter()
const authStore = useAuthStore()
const config = useRuntimeConfig()

// Reactive state
const orders = ref([])
const loading = ref(false)
const totalOrders = ref(0)

// Filters
const page = ref(1)
const itemsPerPage = ref(10)
const statusFilter = ref('all')

// Status options
const statusOptions = [
  { title: 'All Statuses', value: 'all' },
  { title: 'Pending', value: 'pending' },
  { title: 'Confirmed', value: 'confirmed' },
  { title: 'Shipped', value: 'shipped' },
  { title: 'Delivered', value: 'delivered' },
  { title: 'Cancelled', value: 'cancelled' },
]

// Table headers
const headers = [
  { title: 'Order ID', key: 'orderId', sortable: false },
  { title: 'Customer', key: 'user', sortable: false },
  { title: 'Items', key: 'items', sortable: false },
  { title: 'Total', key: 'total', sortable: false },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Date', key: 'createdAt', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' },
]

// Fetch orders
const fetchOrders = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams({
      p: page.value,
      perPage: itemsPerPage.value,
    })

    if (statusFilter.value !== 'all') {
      params.append('status', statusFilter.value)
    }

    const res = await fetch(`${config.public.apiBaseUrl}/api/admin/orders?${params}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.token}`,
      },
    })
    const data = await res.json()
    orders.value = data.data || []
    totalOrders.value = data.pagination?.total || 0
  } catch (error) {
    console.error('Failed to fetch orders:', error)
  } finally {
    loading.value = false
  }
}

// Format date
const formatDate = (date) => {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Get status color
const getStatusColor = (status) => {
  const colors = {
    pending: 'warning',
    confirmed: 'info',
    shipped: 'primary',
    delivered: 'success',
    cancelled: 'error',
  }
  return colors[status] || 'default'
}

// View order details
const viewOrder = (order) => {
  router.push(`/management/orders/${order._id}`)
}

// Update data table options
const updateOptions = (options) => {
  page.value = options.page
}

// Watch for filter changes
watch(page, () => {
  fetchOrders()
})

watch(itemsPerPage, () => {
  page.value = 1
  fetchOrders()
})

watch(statusFilter, () => {
  page.value = 1
  fetchOrders()
})

// Initial fetch
onMounted(() => {
  fetchOrders()
})
</script>

<template>
  <div>
    <VCard title="Orders Management" class="mb-6">
      <VDivider class="my-4" />

      <div class="d-flex flex-wrap gap-4 mx-5">
        <div class="d-flex gap-4 flex-wrap align-center">
          <VSelect
            v-model="statusFilter"
            :items="statusOptions"
            label="Status"
            density="compact"
            style="min-inline-size: 180px;"
          />
        </div>
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
        :items="orders"
        :items-length="totalOrders"
        :loading="loading"
        item-value="_id"
        class="text-no-wrap"
        @update:options="updateOptions"
      >
        <template #loading>
          <div class="d-flex justify-center py-6">
            <VProgressCircular indeterminate color="primary" />
          </div>
        </template>

        <template #item.orderId="{ item }">
          <span class="font-weight-medium text-primary">
            #{{ item._id?.slice(-8).toUpperCase() }}
          </span>
        </template>

        <template #item.user="{ item }">
          <div v-if="item.user">
            <div class="font-weight-medium">
              {{ item.user.firstName }} {{ item.user.lastName }}
            </div>
            <div class="text-caption text-disabled">
              {{ item.user.phone }}
            </div>
          </div>
          <span v-else class="text-disabled">-</span>
        </template>

        <template #item.items="{ item }">
          <VChip label size="small" color="secondary">
            {{ item.items?.length || 0 }} items
          </VChip>
        </template>

        <template #item.total="{ item }">
          <span class="font-weight-medium">
            {{ item.total?.toLocaleString() || 0 }} DZD
          </span>
        </template>

        <template #item.status="{ item }">
          <VChip
            label
            density="comfortable"
            :color="getStatusColor(item.status)"
            variant="tonal"
          >
            {{ item.status }}
          </VChip>
        </template>

        <template #item.createdAt="{ item }">
          {{ formatDate(item.createdAt) }}
        </template>

        <template #item.actions="{ item }">
          <VBtn
            icon="tabler-eye"
            size="small"
            variant="text"
            @click="viewOrder(item)"
          />
        </template>

        <template #no-data>
          <div class="text-center py-12">
            <VIcon icon="tabler-package" size="64" class="text-disabled mb-4" />
            <p class="text-h6 text-disabled">No orders found</p>
            <p class="text-body-2 text-disabled">
              {{ statusFilter === 'all' ? 'No orders have been placed yet' : `No ${statusFilter} orders found` }}
            </p>
          </div>
        </template>

        <template #bottom>
          <VDivider />

          <div class="d-flex align-center justify-space-between flex-wrap gap-3 pa-5 pt-3">
            <p class="text-sm text-medium-emphasis mb-0">
              {{ paginationMeta({ page, itemsPerPage }, totalOrders) }}
            </p>

            <VPagination
              v-model="page"
              :length="Math.min(Math.ceil(totalOrders / itemsPerPage), 5)"
              :total-visible="$vuetify.display.xs ? 1 : Math.min(Math.ceil(totalOrders / itemsPerPage), 5)"
            />
          </div>
        </template>
      </VDataTableServer>
    </VCard>
  </div>
</template>
