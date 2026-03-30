<script setup>
import communes from '@/data/commune.json'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from 'vue-i18n'

definePageMeta({
  authed: true,
  admin: true,
})

const route = useRoute()
const authStore = useAuthStore()
const config = useRuntimeConfig()

const order = ref(null)
const loading = ref(true)
const snackbar = ref({ show: false, message: '', color: 'success' })

const { t, d } = useI18n()

const showSnackbar = (message, color = 'success') => {
  snackbar.value = { show: true, message, color }
}

const statusLabel = status => {
  if (!status)
    return ''

  return t(`management.orders.status.${status}`, status)
}

// Get status color
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

// Location helpers based on communes dataset
const wilayaGroups = (communes || []).filter(g => Array.isArray(g) && g.length)

const getStateLabel = stateId => {
  if (!stateId)
    return null
  const group = wilayaGroups.find(g => String(g[0].wilaya_id) === String(stateId))

  return group ? group[0].name : null
}

const getCityLabel = (stateId, cityId) => {
  if (!stateId || !cityId)
    return null
  const group = wilayaGroups.find(g => String(g[0].wilaya_id) === String(stateId))
  if (!group)
    return null
  const city = group.find(c => String(c.id) === String(cityId))

  return city ? city.name : null
}

const displayOrderLocation = computed(() => {
  const state = getStateLabel(order.value?.sellpoint?.state)
  const city = getCityLabel(order.value?.sellpoint?.state, order.value?.sellpoint?.city)

  return [city, state].filter(Boolean).join(', ')
})

// Fetch order details
const fetchOrder = async () => {
  loading.value = true
  try {
    const res = await fetch(`${config.public.apiBaseUrl}/api/orders/${route.params.id}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`,
      },
    })

    if (res.ok) {
      const data = await res.json()
      order.value = data.data
    }
  }
  catch (error) {
    console.error('Failed to fetch order:', error)
    showSnackbar(t('management.orders.details.snackbar.load_failed'), 'error')
  }
  finally {
    loading.value = false
  }
}

// Format date
const formatDate = date => {
  if (!date)
    return t('management.common.value.na')
  return d(new Date(date), 'long')
}

onMounted(() => {
  fetchOrder()
})
</script>

<template>
  <div>
    <!-- Back Button -->
    <VBtn
      variant="text"
      color="primary"
      to="/account/orders"
      class="mb-4"
    >
      <VIcon
        icon="tabler-arrow-left"
        class="me-2"
      />
      {{ t('management.orders.details.back_to_orders') }}
    </VBtn>

    <!-- Loading State -->
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

    <!-- Not Found State -->
    <VCard
      v-else-if="!order"
      class="text-center py-12"
    >
      <VIcon
        icon="tabler-package-off"
        size="64"
        class="text-disabled mb-4"
      />
      <h3 class="text-h6 text-disabled mb-2">
        {{ t('management.orders.details.not_found_title') }}
      </h3>
      <p class="text-body-2 text-disabled mb-4">
        {{ t('management.orders.details.not_found_subtitle') }}
      </p>
      <VBtn
        color="primary"
        to="/management/orders"
      >
        <VIcon
          icon="tabler-arrow-left"
          class="me-2"
        />
        {{ t('management.orders.details.back_to_orders') }}
      </VBtn>
    </VCard>

    <!-- Order Details -->
    <template v-else>
      <VRow>
        <!-- Order Info -->
        <VCol
          cols="12"
          md="8"
        >
          <VCard class="mb-6">
            <VCardTitle class="d-flex align-center justify-space-between">
              <span>{{ t('management.orders.details.order_number', { id: order._id?.slice(-8).toUpperCase() }) }}</span>
              <VChip
                label
                :color="getStatusColor(order.status)"
                variant="tonal"
              >
                {{ statusLabel(order.status) }}
              </VChip>
            </VCardTitle>
            <VDivider />
            <VCardText>
              <div class="text-caption text-disabled mb-4">
                {{ t('management.orders.details.placed_on', { date: formatDate(order.createdAt) }) }}
              </div>

              <!-- Order Items -->
              <h4 class="text-h6 mb-4">
                {{ t('management.orders.details.order_items') }}
              </h4>
              <VTable>
                <thead>
                  <tr>
                    <th>{{ t('management.orders.details.table.product') }}</th>
                    <th>{{ t('management.orders.details.table.variance') }}</th>
                    <th class="text-center">
                      {{ t('management.orders.details.table.qty') }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(item, index) in order.items"
                    :key="index"
                  >
                    <td>
                      <div class="font-weight-medium">
                        {{ item.title || t('management.orders.details.unknown_product') }}
                      </div>
                    </td>
                    <td>{{ item.name || t('management.common.value.na') }} <VChip  v-if="item.color" size="x-small" :style="{ width: '30px' ,backgroundColor: item.color }" /></td>
                    <td class="text-center">
                      {{ item.qty }}
                    </td>
                  </tr>
                </tbody>
              </VTable>
            </VCardText>
          </VCard>
        </VCol>

        <!-- Sidebar -->
        <VCol
          cols="12"
          md="4"
        >
          <!-- Customer Info -->
          <VCard class="mb-6">
            <VCardTitle>{{ t('account.orders.sellpoint') }}</VCardTitle>
            <VDivider />
            <VCardText>
              <div
                class="d-flex flex-column gap-3"
              >
                <div>
                  <div class="text-caption text-disabled">
                    {{ t('management.orders.details.name') }}
                  </div>
                  <div class="font-weight-medium">
                    {{ order.sellpoint.firstName }} {{ order.sellpoint.lastName }}
                  </div>
                </div>
                <div>
                  <div class="text-caption text-disabled">
                    {{ t('management.orders.details.phone') }}
                  </div>
                  <div class="font-weight-medium">
                    {{ order.sellpoint.phone }}
                  </div>
                </div>
                <div>
                  <div class="text-caption text-disabled">
                    {{ t('management.orders.details.location') }}
                  </div>
                  <div class="font-weight-medium">
                    {{ displayOrderLocation || t('management.common.value.na') }}
                  </div>
                </div>
                <div v-if="order.sellpoint.address">
                  <div class="text-caption text-disabled">
                    {{ t('management.orders.details.address') }}
                  </div>
                  <div class="font-weight-medium">
                    {{ order.sellpoint.address }}
                  </div>
                </div>
              </div>
            </VCardText>
          </VCard>

          <!-- Order Timeline -->
          <VCard>
            <VCardTitle>{{ t('management.orders.details.order_timeline') }}</VCardTitle>
            <VDivider />
            <VCardText>
              <VTimeline
                side="end"
                density="compact"
              >
                <VTimelineItem
                  dot-color="success"
                  size="x-small"
                >
                  <div class="text-caption">
                    {{ t('management.orders.details.timeline.order_placed') }}
                  </div>
                  <div class="text-body-2">
                    {{ formatDate(order.createdAt) }}
                  </div>
                </VTimelineItem>
                <VTimelineItem
                  v-if="order.status !== 'pending'"
                  dot-color="info"
                  size="x-small"
                >
                  <div class="text-caption">
                    {{ t('management.orders.status.confirmed') }}
                  </div>
                </VTimelineItem>
                <VTimelineItem
                  v-if="['shipped', 'delivered'].includes(order.status)"
                  dot-color="primary"
                  size="x-small"
                >
                  <div class="text-caption">
                    {{ t('management.orders.status.shipped') }}
                  </div>
                </VTimelineItem>
                <VTimelineItem
                  v-if="order.status === 'delivered'"
                  dot-color="success"
                  size="x-small"
                >
                  <div class="text-caption">
                    {{ t('management.orders.status.delivered') }}
                  </div>
                </VTimelineItem>
                <VTimelineItem
                  v-if="order.status === 'cancelled'"
                  dot-color="error"
                  size="x-small"
                >
                  <div class="text-caption">
                    {{ t('management.orders.status.cancelled') }}
                  </div>
                </VTimelineItem>
              </VTimeline>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>
    </template>

    <VSnackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      timeout="3000"
    >
      {{ snackbar.message }}
    </VSnackbar>
  </div>
</template>
