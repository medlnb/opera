<script setup>
import { useAuthStore } from '@/stores/auth'
import { useI18n } from 'vue-i18n'

definePageMeta({
  authed: true,
  admin: true,
})

const authStore = useAuthStore()
const config = useRuntimeConfig()
const loading = ref(true)
const error = ref('')

const { t, te, d } = useI18n({ useScope: 'global' })

const stats = ref({
  totalOrders: 0,
  totalUsers: 0,
  totalProducts: 0,
  pendingOrders: 0,
  thisMonthOrders: 0,
  newUsersThisMonth: 0,
})

const recentOrders = ref([])
const topProducts = ref([])

const ordersByStatus = ref({
  pending: 0,
  confirmed: 0,
  shipped: 0,
  delivered: 0,
  cancelled: 0,
})

async function fetchDashboard() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch(`${config.public.apiBaseUrl}/api/admin/stats`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`,
      },
    })

    if (!res.ok)
      throw new Error('Failed to load dashboard')
    const data = await res.json()

    stats.value = data.stats || stats.value
    recentOrders.value = data.recentOrders || []
    topProducts.value = data.topProducts || []
    ordersByStatus.value = data.ordersByStatus || ordersByStatus.value
  }
  catch (err) {
    console.error('Dashboard fetch error:', err)
    error.value = t('management.dashboard.errors.load_failed')
  }
  finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchDashboard()
})

// Helpers
const formatDate = date => {
  if (!date)
    return t('management.common.value.na')

  return d(new Date(date), {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getOrderStatusLabel = status => {
  const statusKey = String(status || '')

  const managementKey = `management.orders.status.${statusKey}`
  if (te(managementKey))
    return t(managementKey)

  const legacyKey = `orders.status.${statusKey}`
  if (te(legacyKey))
    return t(legacyKey)

  return statusKey
}

const welcomeText = computed(() => t('management.dashboard.welcome', { name: authStore.user?.firstName || '' }))

const getStatusColor = status => {
  const colors = {
    pending: 'warning',
    confirmed: 'info',
    shipped: 'primary',
    delivered: 'success',
    cancelled: 'error',
  }

  return colors[status] || 'default'
}

</script>

<template>
  <div>
    <!-- Header -->
    <div class="d-flex flex-wrap justify-space-between align-center gap-4 mb-6">
      <div>
        <h4 class="text-h4 font-weight-medium">
          {{ t('management.dashboard.title') }}
        </h4>
        <span class="text-body-2 text-disabled">{{ welcomeText }}</span>
      </div>
      <div class="d-flex gap-2">
        <VBtn
          variant="tonal"
          color="secondary"
          to="/management/orders"
        >
          <VIcon
            icon="tabler-package"
            class="me-2"
          />
          {{ t('management.dashboard.actions.view_orders') }}
        </VBtn>
        <VBtn
          color="primary"
          to="/management/product"
        >
          <VIcon
            icon="tabler-plus"
            class="me-2"
          />
          {{ t('management.dashboard.actions.add_product') }}
        </VBtn>
      </div>
    </div>

    <!-- Loading -->
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

    <!-- Error State -->
    <VCard
      v-else-if="error"
      class="text-center py-12"
    >
      <VIcon
        icon="tabler-alert-circle"
        size="64"
        class="text-error mb-4"
      />
      <h3 class="text-h6 mb-2">
        {{ error }}
      </h3>
      <VBtn
        color="primary"
        @click="fetchDashboard"
      >
        <VIcon
          icon="tabler-refresh"
          class="me-2"
        />
        {{ t('management.dashboard.actions.retry') }}
      </VBtn>
    </VCard>

    <template v-else>
      <!-- Stats Cards -->
      <VRow class="mb-6">
        <VCol
          cols="12"
          sm="6"
          lg="4"
        >
          <VCard height="100">
            <VCardText class="d-flex align-center gap-4">
              <VAvatar
                color="success"
                variant="tonal"
                size="48"
                rounded
              >
                <VIcon
                  icon="tabler-shopping-cart"
                  size="28"
                />
              </VAvatar>
              <div>
                <div class="text-caption text-disabled">
                  {{ t('management.dashboard.stats.total_orders') }}
                </div>
                <div class="text-h5 font-weight-medium">
                  {{ stats.totalOrders }}
                </div>
                <VChip
                  v-if="stats.pendingOrders"
                  label
                  size="x-small"
                  color="warning"
                  class="mt-1"
                >
                  {{ t('management.dashboard.stats.pending_orders', { count: stats.pendingOrders }) }}
                </VChip>
              </div>
            </VCardText>
          </VCard>
        </VCol>
        <VCol
          cols="12"
          sm="6"
          lg="4"
        >
          <VCard height="100">
            <VCardText class="d-flex align-center gap-4">
              <VAvatar
                color="info"
                variant="tonal"
                size="48"
                rounded
              >
                <VIcon
                  icon="tabler-users"
                  size="28"
                />
              </VAvatar>
              <div>
                <div class="text-caption text-disabled">
                  {{ t('management.dashboard.stats.total_users') }}
                </div>
                <div class="text-h5 font-weight-medium">
                  {{ stats.totalUsers }}
                </div>
                <span class="text-caption text-success">{{ t('management.dashboard.stats.new_users_this_month', { count: stats.newUsersThisMonth }) }}</span>
              </div>
            </VCardText>
          </VCard>
        </VCol>
        <VCol
          cols="12"
          sm="6"
          lg="4"
        >
          <VCard height="100">
            <VCardText class="d-flex align-center gap-4">
              <VAvatar
                color="secondary"
                variant="tonal"
                size="48"
                rounded
              >
                <VIcon
                  icon="tabler-box"
                  size="28"
                />
              </VAvatar>
              <div>
                <div class="text-caption text-disabled">
                  {{ t('management.dashboard.stats.products') }}
                </div>
                <div class="text-h5 font-weight-medium">
                  {{ stats.totalProducts }}
                </div>
              </div>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>

      <!-- Orders Overview -->
      <VRow class="mb-6">
        <VCol cols="12">
          <VCard>
            <VCardTitle>{{ t('management.dashboard.sections.orders_by_status') }}</VCardTitle>
            <VDivider />
            <VCardText>
              <div class="d-flex flex-wrap gap-4 mb-4">
                <div
                  v-for="(count, status) in ordersByStatus"
                  :key="status"
                  class="d-flex align-center justify-space-between"
                >
                  <div class="d-flex align-center gap-2">
                    <VAvatar
                      :color="getStatusColor(status)"
                      size="10"
                    />
                    <span>{{ getOrderStatusLabel(status) }}</span>
                  </div>
                  <VChip
                    label
                    size="small"
                    :color="getStatusColor(status)"
                    variant="tonal"
                    class="ms-2"
                  >
                    {{ count }}
                  </VChip>
                </div>
              </div>
              <VDivider class="my-4" />
              <div class="text-center">
                <div class="text-h4 font-weight-medium text-primary">
                  {{ stats.totalOrders }}
                </div>
                <div class="text-caption text-disabled">
                  {{ t('management.dashboard.sections.total_orders') }}
                </div>
              </div>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>

      <!-- Recent Orders & Top Products -->
      <VRow>
        <VCol
          cols="12"
          md="7"
        >
          <VCard>
            <VCardTitle class="d-flex align-center justify-space-between">
              <span>{{ t('management.dashboard.sections.recent_orders') }}</span>
              <VBtn
                variant="text"
                color="primary"
                size="small"
                to="/management/orders"
              >
                {{ t('management.dashboard.actions.view_all') }}
                <VIcon
                  icon="tabler-arrow-right"
                  class="ms-1"
                />
              </VBtn>
            </VCardTitle>
            <VDivider />
            <VTable>
              <thead>
                <tr>
                  <th>{{ t('management.dashboard.table.order') }}</th>
                  <th>{{ t('management.dashboard.table.customer') }}</th>
                  <th>{{ t('management.dashboard.table.status') }}</th>
                  <th>{{ t('management.dashboard.table.date') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="order in recentOrders"
                  :key="order._id"
                >
                  <td>
                    <NuxtLink
                      :to="`/management/orders/${order._id}`"
                      class="text-primary font-weight-medium"
                    >
                      #{{ order._id.slice(-6).toUpperCase() }}
                    </NuxtLink>
                  </td>
                  <td>{{ order.user.firstName }} {{ order.user.lastName }}</td>
                  <td>
                    <VChip
                      label
                      size="small"
                      :color="getStatusColor(order.status)"
                      variant="tonal"
                    >
                      {{ getOrderStatusLabel(order.status) }}
                    </VChip>
                  </td>
                  <td class="text-caption">
                    {{ formatDate(order.createdAt) }}
                  </td>
                </tr>
              </tbody>
            </VTable>
          </VCard>
        </VCol>
        <VCol
          cols="12"
          md="5"
        >
          <VCard>
            <VCardTitle class="d-flex align-center justify-space-between">
              <span>{{ t('management.dashboard.sections.top_products') }}</span>
              <VBtn
                variant="text"
                color="primary"
                size="small"
                to="/management"
              >
                {{ t('management.dashboard.actions.view_all') }}
                <VIcon
                  icon="tabler-arrow-right"
                  class="ms-1"
                />
              </VBtn>
            </VCardTitle>
            <VDivider />
            <VCardText class="pa-0">
              <VList>
                <VListItem
                  v-for="(product, index) in topProducts"
                  :key="product._id"
                  :to="`/management/product?id=${product._id}`"
                >
                  <template #prepend>
                    <VAvatar
                      color="primary"
                      variant="tonal"
                      size="40"
                      rounded
                      class="me-3"
                    >
                      <span class="font-weight-medium">{{ index + 1 }}</span>
                    </VAvatar>
                  </template>
                  <VListItemTitle class="font-weight-medium">
                    {{ product.title }}
                  </VListItemTitle>
                  <VListItemSubtitle>{{ t('management.dashboard.sales', { count: product.sales }) }}</VListItemSubtitle>
                </VListItem>
              </VList>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>
    </template>
  </div>
</template>

<style scoped>
</style>
