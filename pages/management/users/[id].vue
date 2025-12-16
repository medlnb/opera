<script setup>
import { VDataTableServer } from 'vuetify/labs/VDataTable'
import communes from '@/data/commune.json'
import { useAuthStore } from '@/stores/auth'
import { paginationMeta } from '@api-utils/paginationMeta'

definePageMeta({
  authed: true,
  admin: true,
})

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const config = useRuntimeConfig()

const user = ref(null)
const orders = ref([])
const loading = ref(true)
const ordersLoading = ref(false)
const totalOrders = ref(0)
const page = ref(1)
const itemsPerPage = ref(5)

// Dialog states
const deleteDialog = ref(false)
const banDialog = ref(false)
const actionLoading = ref(false)

const snackbar = ref({ show: false, message: '', color: 'success' })

const showSnackbar = (message, color = 'success') => {
  snackbar.value = { show: true, message, color }
}

// Orders table headers
const orderHeaders = [
  { title: 'Order ID', key: 'orderId', sortable: false },
  { title: 'Items', key: 'items', sortable: false },
  { title: 'Total', key: 'total', sortable: false },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Date', key: 'createdAt', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' },
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

const displayLocation = computed(() => {
  const state = getStateLabel(user.value?.state)
  const city = getCityLabel(user.value?.state, user.value?.city)

  return [city, state].filter(Boolean).join(', ')
})

// Format date
const formatDate = date => {
  if (!date)
    return '-'
  const d = new Date(date)

  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Fetch user details
const fetchUser = async () => {
  loading.value = true
  try {
    const res = await fetch(`${config.public.apiBaseUrl}/api/admin/users/${route.params.id}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`,
      },
    })

    if (res.ok) {
      const data = await res.json()

      user.value = data.data
    }
  }
  catch (error) {
    console.error('Failed to fetch user:', error)
    showSnackbar('Failed to load user details', 'error')
  }
  finally {
    loading.value = false
  }
}

// Fetch user orders
const fetchOrders = async () => {
  ordersLoading.value = true
  try {
    const params = new URLSearchParams({
      p: page.value,
      perPage: itemsPerPage.value,
    })

    const res = await fetch(`${config.public.apiBaseUrl}/api/admin/users/${route.params.id}/orders?${params}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`,
      },
    })

    if (res.ok) {
      const data = await res.json()

      orders.value = data.data || []
      totalOrders.value = data.pagination?.total || 0
    }
  }
  catch (error) {
    console.error('Failed to fetch orders:', error)
  }
  finally {
    ordersLoading.value = false
  }
}

// Ban/Unban user
const confirmBan = async () => {
  if (!user.value)
    return

  actionLoading.value = true
  try {
    const endpoint = user.value.banned
      ? `${config.public.apiBaseUrl}/api/admin/users/${user.value._id}/unban`
      : `${config.public.apiBaseUrl}/api/admin/users/${user.value._id}/ban`

    const res = await fetch(endpoint, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`,
      },
    })

    if (res.ok) {
      showSnackbar(
        user.value.banned ? 'User unbanned successfully' : 'User banned successfully',
        'success',
      )
      user.value.banned = !user.value.banned
      banDialog.value = false
    }
    else {
      const data = await res.json()

      showSnackbar(data.message || 'Action failed', 'error')
    }
  }
  catch (error) {
    console.error('Failed to ban/unban user:', error)
    showSnackbar('Action failed', 'error')
  }
  finally {
    actionLoading.value = false
  }
}

// Delete user
const confirmDelete = async () => {
  if (!user.value)
    return

  actionLoading.value = true
  try {
    const res = await fetch(`${config.public.apiBaseUrl}/api/admin/users/${user.value._id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`,
      },
    })

    if (res.ok || res.status === 204) {
      showSnackbar('User deleted successfully', 'success')
      deleteDialog.value = false
      router.push('/management/users')
    }
    else {
      const data = await res.json()

      showSnackbar(data.message || 'Delete failed', 'error')
    }
  }
  catch (error) {
    console.error('Failed to delete user:', error)
    showSnackbar('Delete failed', 'error')
  }
  finally {
    actionLoading.value = false
  }
}

// View order
const viewOrder = order => {
  router.push(`/management/orders/${order._id}`)
}

// Update options
const updateOptions = options => {
  page.value = options.page
}

// Watch pagination
watch(page, () => {
  fetchOrders()
})

watch(itemsPerPage, () => {
  page.value = 1
  fetchOrders()
})

onMounted(() => {
  fetchUser()
  fetchOrders()
})
</script>

<template>
  <div>
    <!-- Back Button -->
    <VBtn
      variant="text"
      color="primary"
      to="/management/users"
      class="mb-4"
    >
      <VIcon
        icon="tabler-arrow-left"
        class="me-2"
      />
      Back to Users
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
      v-else-if="!user"
      class="text-center py-12"
    >
      <VIcon
        icon="tabler-user-off"
        size="64"
        class="text-disabled mb-4"
      />
      <h3 class="text-h6 text-disabled mb-2">
        User not found
      </h3>
      <p class="text-body-2 text-disabled mb-4">
        The user you're looking for doesn't exist.
      </p>
      <VBtn
        color="primary"
        to="/management/users"
      >
        <VIcon
          icon="tabler-arrow-left"
          class="me-2"
        />
        Back to Users
      </VBtn>
    </VCard>

    <!-- User Details -->
    <template v-else>
      <VRow>
        <!-- User Profile -->
        <VCol
          cols="12"
          md="4"
        >
          <VCard class="mb-6">
            <VCardText class="text-center pt-6">
              <VAvatar
                color="primary"
                variant="tonal"
                size="100"
                class="mb-4"
              >
                <span class="text-h4">{{ (user.firstName?.[0] || '') + (user.lastName?.[0] || '') }}</span>
              </VAvatar>
              <h4 class="text-h5 font-weight-medium mb-1">
                {{ user.firstName }} {{ user.lastName }}
              </h4>
              <div class="d-flex justify-center gap-2 mb-4">
                <VChip
                  label
                  size="small"
                  :color="user.role === 'admin' ? 'error' : 'secondary'"
                  variant="tonal"
                >
                  {{ user.role || 'user' }}
                </VChip>
                <VChip
                  label
                  size="small"
                  :color="user.banned ? 'error' : 'success'"
                  variant="tonal"
                >
                  {{ user.banned ? 'Banned' : 'Active' }}
                </VChip>
              </div>
            </VCardText>
            <VDivider />
            <VCardText>
              <div class="d-flex flex-column gap-4">
                <div class="d-flex align-center">
                  <VIcon
                    icon="tabler-phone"
                    class="me-3"
                    color="primary"
                  />
                  <div>
                    <div class="text-caption text-disabled">
                      Phone
                    </div>
                    <div class="font-weight-medium">
                      {{ user.phone || '-' }}
                    </div>
                  </div>
                </div>
                <div class="d-flex align-center">
                  <VIcon
                    icon="tabler-map-pin"
                    class="me-3"
                    color="primary"
                  />
                  <div>
                    <div class="text-caption text-disabled">
                      Location
                    </div>
                    <div class="font-weight-medium">
                      {{ displayLocation || '-' }}
                    </div>
                  </div>
                </div>
                <div class="d-flex align-center">
                  <VIcon
                    icon="tabler-home"
                    class="me-3"
                    color="primary"
                  />
                  <div>
                    <div class="text-caption text-disabled">
                      Address
                    </div>
                    <div class="font-weight-medium">
                      {{ user.address || '-' }}
                    </div>
                  </div>
                </div>
                <div class="d-flex align-center">
                  <VIcon
                    icon="tabler-calendar"
                    class="me-3"
                    color="primary"
                  />
                  <div>
                    <div class="text-caption text-disabled">
                      Joined
                    </div>
                    <div class="font-weight-medium">
                      {{ formatDate(user.createdAt) }}
                    </div>
                  </div>
                </div>
              </div>
            </VCardText>
            <VDivider />
            <VCardText
              v-if="user.role !== 'admin'"
              class="gap-2"
            >
              <VBtn
                :color="user.banned ? 'success' : 'warning'"
                variant="tonal"
                block
                class="mb-2"
                @click="banDialog = true"
              >
                <VIcon
                  :icon="user.banned ? 'tabler-lock-open' : 'tabler-lock'"
                  class="me-2"
                />
                {{ user.banned ? 'Unban' : 'Ban' }}
              </VBtn>
              <VBtn
                color="error"
                variant="tonal"
                block
                @click="deleteDialog = true"
              >
                <VIcon
                  icon="tabler-trash"
                  class="me-2"
                />
                Delete
              </VBtn>
            </VCardText>
          </VCard>
        </VCol>

        <!-- User Orders -->
        <VCol
          cols="12"
          md="8"
        >
          <VCard>
            <VCardTitle class="d-flex align-center justify-space-between">
              <span>Orders History</span>
              <VChip
                label
                color="primary"
                size="small"
              >
                {{ totalOrders }} orders
              </VChip>
            </VCardTitle>
            <VDivider />

            <VDataTableServer
              v-model:items-per-page="itemsPerPage"
              v-model:page="page"
              :headers="orderHeaders"
              :items="orders"
              :items-length="totalOrders"
              :loading="ordersLoading"
              item-value="_id"
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

              <template #item.orderId="{ item }">
                <span class="font-weight-medium text-primary">
                  #{{ item._id?.slice(-8).toUpperCase() }}
                </span>
              </template>

              <template #item.items="{ item }">
                <VChip
                  label
                  size="small"
                  color="secondary"
                >
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
                  size="small"
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
                  <VIcon
                    icon="tabler-package"
                    size="48"
                    class="text-disabled mb-4"
                  />
                  <p class="text-body-1 text-disabled">
                    No orders yet
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
        </VCol>
      </VRow>
    </template>

    <!-- Ban/Unban Dialog -->
    <VDialog
      v-model="banDialog"
      max-width="500"
    >
      <VCard>
        <VCardTitle class="text-h5">
          {{ user?.banned ? 'Unban User?' : 'Ban User?' }}
        </VCardTitle>
        <VCardText>
          <div class="mb-2">
            Are you sure you want to {{ user?.banned ? 'unban' : 'ban' }} this user?
          </div>
          <div
            v-if="user"
            class="font-weight-medium"
          >
            {{ user.firstName }} {{ user.lastName }}
          </div>
          <div
            v-if="!user?.banned"
            class="text-body-2 text-warning mt-3"
          >
            The user will not be able to log in while banned.
          </div>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            @click="banDialog = false"
          >
            Cancel
          </VBtn>
          <VBtn
            :color="user?.banned ? 'success' : 'warning'"
            variant="flat"
            :loading="actionLoading"
            @click="confirmBan"
          >
            {{ user?.banned ? 'Unban' : 'Ban' }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Delete Dialog -->
    <VDialog
      v-model="deleteDialog"
      max-width="500"
    >
      <VCard>
        <VCardTitle class="text-h5">
          Delete User Account?
        </VCardTitle>
        <VCardText>
          <div class="mb-2">
            Are you sure you want to permanently delete this user's account?
          </div>
          <div
            v-if="user"
            class="font-weight-medium"
          >
            {{ user.firstName }} {{ user.lastName }}
          </div>
          <div class="text-body-2 text-error mt-3">
            This action cannot be undone. All user data will be lost.
          </div>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            @click="deleteDialog = false"
          >
            Cancel
          </VBtn>
          <VBtn
            color="error"
            variant="flat"
            :loading="actionLoading"
            @click="confirmDelete"
          >
            Delete
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VSnackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      timeout="3000"
    >
      {{ snackbar.message }}
    </VSnackbar>
  </div>
</template>
