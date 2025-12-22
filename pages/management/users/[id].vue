<script setup>
import { useI18n } from 'vue-i18n'
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

const { t, te, d } = useI18n({ useScope: 'global' })

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

const getStatusLabel = status => {
  const key = `management.orders.status.${String(status || '')}`

  return te(key) ? t(key) : String(status || '')
}

// Orders table headers
const orderHeaders = computed(() => [
  { title: t('management.orders.table.order_id'), key: 'orderId', sortable: false },
  { title: t('management.orders.table.items'), key: 'items', sortable: false },
  { title: t('management.orders.table.total'), key: 'total', sortable: false },
  { title: t('management.orders.table.status'), key: 'status', sortable: false },
  { title: t('management.orders.table.date'), key: 'createdAt', sortable: false },
  { title: t('management.common.table.actions'), key: 'actions', sortable: false, align: 'end' },
])

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
    return t('management.common.value.na')

  return d(new Date(date), 'short')
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
    showSnackbar(t('management.users.details.snackbar.load_failed'), 'error')
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
        user.value.banned ? t('management.users.snackbar.unbanned') : t('management.users.snackbar.banned'),
        'success',
      )
      user.value.banned = !user.value.banned
      banDialog.value = false
    }
    else {
      const data = await res.json()

      showSnackbar(data.message || t('management.common.action_failed'), 'error')
    }
  }
  catch (error) {
    console.error('Failed to ban/unban user:', error)
    showSnackbar(t('management.common.action_failed'), 'error')
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
      showSnackbar(t('management.users.snackbar.deleted'), 'success')
      deleteDialog.value = false
      router.push('/management/users')
    }
    else {
      const data = await res.json()

      showSnackbar(data.message || t('management.common.delete_failed'), 'error')
    }
  }
  catch (error) {
    console.error('Failed to delete user:', error)
    showSnackbar(t('management.common.delete_failed'), 'error')
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
      {{ t('management.users.details.back_to_users') }}
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
        {{ t('management.users.details.not_found_title') }}
      </h3>
      <p class="text-body-2 text-disabled mb-4">
        {{ t('management.users.details.not_found_subtitle') }}
      </p>
      <VBtn
        color="primary"
        to="/management/users"
      >
        <VIcon
          icon="tabler-arrow-left"
          class="me-2"
        />
        {{ t('management.users.details.back_to_users') }}
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
                  {{ user.role || t('management.users.role.user') }}
                </VChip>
                <VChip
                  label
                  size="small"
                  :color="user.banned ? 'error' : 'success'"
                  variant="tonal"
                >
                  {{ user.banned ? t('management.users.status.banned') : t('management.users.status.active') }}
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
                      {{ t('management.users.table.phone') }}
                    </div>
                    <div class="font-weight-medium">
                      {{ user.phone || t('management.common.value.na') }}
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
                      {{ t('management.users.details.location') }}
                    </div>
                    <div class="font-weight-medium">
                      {{ displayLocation || t('management.common.value.na') }}
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
                      {{ t('management.users.details.address') }}
                    </div>
                    <div class="font-weight-medium">
                      {{ user.address || t('management.common.value.na') }}
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
                      {{ t('management.users.table.joined') }}
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
                {{ user.banned ? t('management.users.actions.unban') : t('management.users.actions.ban') }}
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
                {{ t('management.common.delete') }}
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
              <span>{{ t('management.users.details.orders_history') }}</span>
              <VChip
                label
                color="primary"
                size="small"
              >
                {{ t('management.users.details.orders_count', { count: totalOrders }) }}
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
                  {{ t('management.orders.table.items_count', { count: item.items?.length || 0 }) }}
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
                  {{ getStatusLabel(item.status) }}
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
                    {{ t('management.users.details.no_orders_yet') }}
                  </p>
                </div>
              </template>

              <template #bottom>
                <VDivider />

                <div class="d-flex align-center justify-space-between flex-wrap gap-3 pa-5 pt-3">
                  <p class="text-sm text-medium-emphasis mb-0">
                    {{ paginationMeta({ page, itemsPerPage }, totalOrders, t) }}
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
          {{ user?.banned ? t('management.users.banDialog.unban_title') : t('management.users.banDialog.ban_title') }}
        </VCardTitle>
        <VCardText>
          <div class="mb-2">
            {{ user?.banned ? t('management.users.banDialog.unban_confirm') : t('management.users.banDialog.ban_confirm') }}
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
            {{ t('management.users.banDialog.warning') }}
          </div>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            @click="banDialog = false"
          >
            {{ t('management.common.cancel') }}
          </VBtn>
          <VBtn
            :color="user?.banned ? 'success' : 'warning'"
            variant="flat"
            :loading="actionLoading"
            @click="confirmBan"
          >
            {{ user?.banned ? t('management.users.actions.unban') : t('management.users.actions.ban') }}
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
          {{ t('management.users.deleteDialog.title') }}
        </VCardTitle>
        <VCardText>
          <div class="mb-2">
            {{ t('management.users.deleteDialog.confirm') }}
          </div>
          <div
            v-if="user"
            class="font-weight-medium"
          >
            {{ user.firstName }} {{ user.lastName }}
          </div>
          <div class="text-body-2 text-error mt-3">
            {{ t('management.users.deleteDialog.warning') }}
          </div>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            @click="deleteDialog = false"
          >
            {{ t('management.common.cancel') }}
          </VBtn>
          <VBtn
            color="error"
            variant="flat"
            :loading="actionLoading"
            @click="confirmDelete"
          >
            {{ t('management.common.delete') }}
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
