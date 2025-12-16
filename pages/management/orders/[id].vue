<script setup>
import communes from '@/data/commune.json'
import { useAuthStore } from '@/stores/auth'

definePageMeta({
  authed: true,
  admin: true,
})

const route = useRoute()
const authStore = useAuthStore()
const config = useRuntimeConfig()

const order = ref(null)
const loading = ref(true)
const updating = ref(false)
const snackbar = ref({ show: false, message: '', color: 'success' })

const showSnackbar = (message, color = 'success') => {
  snackbar.value = { show: true, message, color }
}

// Status options for update
const statusOptions = [
  { title: 'Pending', value: 'pending' },
  { title: 'Confirmed', value: 'confirmed' },
  { title: 'Shipped', value: 'shipped' },
  { title: 'Delivered', value: 'delivered' },
  { title: 'Cancelled', value: 'cancelled' },
]

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

const getStateLabelAr = stateId => {
  if (!stateId)
    return null
  const group = wilayaGroups.find(g => String(g[0].wilaya_id) === String(stateId))

  return group ? (group[0].ar_name || null) : null
}

const getCityLabelAr = (stateId, cityId) => {
  if (!stateId || !cityId)
    return null
  const group = wilayaGroups.find(g => String(g[0].wilaya_id) === String(stateId))
  if (!group)
    return null
  const city = group.find(c => String(c.id) === String(cityId))

  return city ? (city.ar_name || null) : null
}

const displayOrderLocation = computed(() => {
  const state = getStateLabel(order.value?.user?.state)
  const city = getCityLabel(order.value?.user?.state, order.value?.user?.city)

  return [city, state].filter(Boolean).join(', ')
})

// Fetch order details
const fetchOrder = async () => {
  loading.value = true
  try {
    const res = await fetch(`${config.public.apiBaseUrl}/api/admin/orders/${route.params.id}`, {
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
    showSnackbar('Failed to load order details', 'error')
  }
  finally {
    loading.value = false
  }
}

// Update order status
const updateStatus = async newStatus => {
  updating.value = true
  try {
    const res = await fetch(`${config.public.apiBaseUrl}/api/admin/orders/${route.params.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`,
      },
      body: JSON.stringify({ status: newStatus }),
    })

    if (res.ok) {
      const data = await res.json()

      order.value = { ...order.value, ...data.data }
      showSnackbar('Order status updated successfully', 'success')
    }
    else {
      throw new Error('Update failed')
    }
  }
  catch (error) {
    console.error('Failed to update status:', error)
    showSnackbar('Failed to update order status', 'error')
  }
  finally {
    updating.value = false
  }
}

// Format date
const formatDate = date => {
  if (!date)
    return '-'
  const d = new Date(date)

  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
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
      to="/management/orders"
      class="mb-4"
    >
      <VIcon
        icon="tabler-arrow-left"
        class="me-2"
      />
      Back to Orders
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
        Order not found
      </h3>
      <p class="text-body-2 text-disabled mb-4">
        The order you're looking for doesn't exist.
      </p>
      <VBtn
        color="primary"
        to="/management/orders"
      >
        <VIcon
          icon="tabler-arrow-left"
          class="me-2"
        />
        Back to Orders
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
              <span>Order #{{ order._id?.slice(-8).toUpperCase() }}</span>
              <VChip
                label
                :color="getStatusColor(order.status)"
                variant="tonal"
              >
                {{ order.status }}
              </VChip>
            </VCardTitle>
            <VDivider />
            <VCardText>
              <div class="text-caption text-disabled mb-4">
                Placed on {{ formatDate(order.createdAt) }}
              </div>

              <!-- Order Items -->
              <h4 class="text-h6 mb-4">
                Order Items
              </h4>
              <VTable>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Variance</th>
                    <th>Color</th>
                    <th class="text-center">
                      Qty
                    </th>
                    <th class="text-end">
                      Price
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
                        {{ item.title || 'Unknown Product' }}
                      </div>
                    </td>
                    <td>{{ item.quantity || '-' }}</td>
                    <td>{{ item.color || '-' }}</td>
                    <td class="text-center">
                      {{ item.qty }}
                    </td>
                    <td class="text-end font-weight-medium">
                      {{ (item.price * item.qty).toLocaleString() }} DZD
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td
                      colspan="4"
                      class="text-end font-weight-bold"
                    >
                      Total:
                    </td>
                    <td class="text-end font-weight-bold text-primary">
                      {{ order.total?.toLocaleString() }} DZD
                    </td>
                  </tr>
                </tfoot>
              </VTable>
            </VCardText>
          </VCard>
        </VCol>

        <!-- Sidebar -->
        <VCol
          cols="12"
          md="4"
        >
          <!-- Update Status -->
          <VCard class="mb-6">
            <VCardTitle>Update Status</VCardTitle>
            <VDivider />
            <VCardText>
              <VSelect
                v-model="order.status"
                :items="statusOptions"
                label="Order Status"
                variant="outlined"
                :disabled="updating"
              />
              <VBtn
                color="primary"
                block
                class="mt-4"
                :loading="updating"
                @click="updateStatus(order.status)"
              >
                <VIcon
                  icon="tabler-check"
                  class="me-2"
                />
                Update Status
              </VBtn>
            </VCardText>
          </VCard>

          <!-- Customer Info -->
          <VCard class="mb-6">
            <VCardTitle>Customer Information</VCardTitle>
            <VDivider />
            <VCardText>
              <div
                v-if="order.user"
                class="d-flex flex-column gap-3"
              >
                <div>
                  <div class="text-caption text-disabled">
                    Name
                  </div>
                  <div class="font-weight-medium">
                    {{ order.user.firstName }} {{ order.user.lastName }}
                  </div>
                </div>
                <div>
                  <div class="text-caption text-disabled">
                    Phone
                  </div>
                  <div class="font-weight-medium">
                    {{ order.user.phone }}
                  </div>
                </div>
                <div v-if="order.user.state || order.user.city">
                  <div class="text-caption text-disabled">
                    Location
                  </div>
                  <div class="font-weight-medium">
                    {{ displayOrderLocation || '-' }}
                  </div>
                </div>
                <div v-if="order.user.address">
                  <div class="text-caption text-disabled">
                    Address
                  </div>
                  <div class="font-weight-medium">
                    {{ order.user.address }}
                  </div>
                </div>
                <VBtn
                  variant="tonal"
                  color="primary"
                  size="small"
                  :to="`/management/users/${order.user._id}`"
                  class="mt-2"
                >
                  <VIcon
                    icon="tabler-user"
                    class="me-2"
                  />
                  View Customer
                </VBtn>
              </div>
              <div
                v-else
                class="text-disabled"
              >
                Customer information not available
              </div>
            </VCardText>
          </VCard>

          <!-- Order Timeline -->
          <VCard>
            <VCardTitle>Order Timeline</VCardTitle>
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
                    Order Placed
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
                    Confirmed
                  </div>
                </VTimelineItem>
                <VTimelineItem
                  v-if="['shipped', 'delivered'].includes(order.status)"
                  dot-color="primary"
                  size="x-small"
                >
                  <div class="text-caption">
                    Shipped
                  </div>
                </VTimelineItem>
                <VTimelineItem
                  v-if="order.status === 'delivered'"
                  dot-color="success"
                  size="x-small"
                >
                  <div class="text-caption">
                    Delivered
                  </div>
                </VTimelineItem>
                <VTimelineItem
                  v-if="order.status === 'cancelled'"
                  dot-color="error"
                  size="x-small"
                >
                  <div class="text-caption">
                    Cancelled
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
