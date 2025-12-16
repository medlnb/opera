<script setup>
import { debounce } from 'lodash'
import { VDataTableServer } from 'vuetify/labs/VDataTable'
import { useAuthStore } from '@/stores/auth'
import { paginationMeta } from '@api-utils/paginationMeta'

definePageMeta({
  authed: true,
  admin: true,
})

const router = useRouter()
const authStore = useAuthStore()
const config = useRuntimeConfig()

// Reactive state
const users = ref([])
const loading = ref(false)
const totalUsers = ref(0)

// Dialog states
const deleteDialog = ref(false)
const banDialog = ref(false)
const userToAction = ref(null)
const actionLoading = ref(false)

const snackbar = ref({ show: false, message: '', color: 'success' })

const showSnackbar = (message, color = 'success') => {
  snackbar.value = { show: true, message, color }
}

// Filters
const page = ref(1)
const itemsPerPage = ref(10)
const search = ref('')
const bannedFilter = ref('all')

// Filter options
const bannedOptions = [
  { title: 'All Users', value: 'all' },
  { title: 'Active', value: 'false' },
  { title: 'Banned', value: 'true' },
]

// Table headers
const headers = [
  { title: 'User', key: 'user', sortable: false },
  { title: 'Phone', key: 'phone', sortable: false },
  { title: 'Role', key: 'role', sortable: false },
  { title: 'Status', key: 'banned', sortable: false },
  { title: 'Joined', key: 'createdAt', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' },
]

// Fetch users
const fetchUsers = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams({
      p: page.value,
      perPage: itemsPerPage.value,
    })

    if (search.value.trim())
      params.append('search', search.value.trim())

    if (bannedFilter.value !== 'all')
      params.append('banned', bannedFilter.value)

    const res = await fetch(`${config.public.apiBaseUrl}/api/admin/users?${params}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`,
      },
    })

    const data = await res.json()

    users.value = data.data || []
    totalUsers.value = data.pagination?.total || 0
  }
  catch (error) {
    console.error('Failed to fetch users:', error)
  }
  finally {
    loading.value = false
  }
}

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

// View user details
const viewUser = user => {
  router.push(`/management/users/${user._id}`)
}

// Open ban dialog
const openBanDialog = user => {
  userToAction.value = user
  banDialog.value = true
}

// Confirm ban/unban
const confirmBan = async () => {
  if (!userToAction.value)
    return

  actionLoading.value = true
  try {
    const endpoint = userToAction.value.banned
      ? `${config.public.apiBaseUrl}/api/admin/users/${userToAction.value._id}/unban`
      : `${config.public.apiBaseUrl}/api/admin/users/${userToAction.value._id}/ban`

    const res = await fetch(endpoint, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`,
      },
    })

    if (res.ok) {
      showSnackbar(
        userToAction.value.banned ? 'User unbanned successfully' : 'User banned successfully',
        'success',
      )
      banDialog.value = false
      userToAction.value = null
      await fetchUsers()
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

// Open delete dialog
const openDeleteDialog = user => {
  userToAction.value = user
  deleteDialog.value = true
}

// Confirm delete
const confirmDelete = async () => {
  if (!userToAction.value)
    return

  actionLoading.value = true
  try {
    const res = await fetch(`${config.public.apiBaseUrl}/api/admin/users/${userToAction.value._id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`,
      },
    })

    if (res.ok || res.status === 204) {
      showSnackbar('User deleted successfully', 'success')
      deleteDialog.value = false
      userToAction.value = null
      await fetchUsers()
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

// Update data table options
const updateOptions = options => {
  page.value = options.page
}

// Debounced search
const debouncedSearch = debounce(() => {
  page.value = 1
  fetchUsers()
}, 500)

// Watch for filter changes
watch(page, () => {
  fetchUsers()
})

watch(itemsPerPage, () => {
  page.value = 1
  fetchUsers()
})

watch(bannedFilter, () => {
  page.value = 1
  fetchUsers()
})

watch(search, () => {
  debouncedSearch()
})

// Initial fetch
onMounted(() => {
  fetchUsers()
})
</script>

<template>
  <div>
    <VCard
      title="Users Management"
      class="mb-6"
    >
      <VDivider class="my-4" />

      <div class="d-flex flex-wrap gap-4 mx-5">
        <div class="d-flex gap-4 flex-wrap align-center">
          <VTextField
            v-model="search"
            placeholder="Search users..."
            density="compact"
            style="min-inline-size: 250px;"
            clearable
          >
            <template #prepend-inner>
              <VIcon icon="tabler-search" />
            </template>
          </VTextField>

          <VSelect
            v-model="bannedFilter"
            :items="bannedOptions"
            label="Status"
            density="compact"
            style="min-inline-size: 150px;"
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
        :items="users"
        :items-length="totalUsers"
        :loading="loading"
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

        <template #item.user="{ item }">
          <div class="d-flex align-center gap-3 py-2">
            <VAvatar
              color="primary"
              variant="tonal"
            >
              <span>{{ (item.firstName?.[0] || '') + (item.lastName?.[0] || '') }}</span>
            </VAvatar>
            <div>
              <div class="font-weight-medium">
                {{ item.firstName }} {{ item.lastName }}
              </div>
            </div>
          </div>
        </template>

        <template #item.phone="{ item }">
          {{ item.phone || '-' }}
        </template>

        <template #item.role="{ item }">
          <VChip
            label
            size="small"
            :color="item.role === 'admin' ? 'error' : 'secondary'"
            variant="tonal"
          >
            {{ item.role || 'user' }}
          </VChip>
        </template>

        <template #item.banned="{ item }">
          <VChip
            label
            density="comfortable"
            :color="item.banned ? 'error' : 'success'"
            variant="tonal"
          >
            {{ item.banned ? 'Banned' : 'Active' }}
          </VChip>
        </template>

        <template #item.createdAt="{ item }">
          {{ formatDate(item.createdAt) }}
        </template>

        <template #item.actions="{ item }">
          <div class="d-flex gap-1">
            <VBtn
              icon="tabler-eye"
              size="small"
              variant="text"
              @click="viewUser(item)"
            />
            <VBtn
              v-if="item.role !== 'admin'"
              :icon="item.banned ? 'tabler-lock-open' : 'tabler-lock'"
              size="small"
              variant="text"
              :color="item.banned ? 'success' : 'warning'"
              @click="openBanDialog(item)"
            />
            <VBtn
              v-if="item.role !== 'admin'"
              icon="tabler-trash"
              size="small"
              variant="text"
              color="error"
              @click="openDeleteDialog(item)"
            />
          </div>
        </template>

        <template #no-data>
          <div class="text-center py-12">
            <VIcon
              icon="tabler-users"
              size="64"
              class="text-disabled mb-4"
            />
            <p class="text-h6 text-disabled">
              No users found
            </p>
            <p class="text-body-2 text-disabled">
              {{ search ? 'Try adjusting your search' : 'No users registered yet' }}
            </p>
          </div>
        </template>

        <template #bottom>
          <VDivider />

          <div class="d-flex align-center justify-space-between flex-wrap gap-3 pa-5 pt-3">
            <p class="text-sm text-medium-emphasis mb-0">
              {{ paginationMeta({ page, itemsPerPage }, totalUsers) }}
            </p>

            <VPagination
              v-model="page"
              :length="Math.min(Math.ceil(totalUsers / itemsPerPage), 5)"
              :total-visible="$vuetify.display.xs ? 1 : Math.min(Math.ceil(totalUsers / itemsPerPage), 5)"
            />
          </div>
        </template>
      </VDataTableServer>
    </VCard>

    <!-- Ban/Unban Dialog -->
    <VDialog
      v-model="banDialog"
      max-width="500"
    >
      <VCard>
        <VCardTitle class="text-h5">
          {{ userToAction?.banned ? 'Unban User?' : 'Ban User?' }}
        </VCardTitle>
        <VCardText>
          <div class="mb-2">
            Are you sure you want to {{ userToAction?.banned ? 'unban' : 'ban' }} this user?
          </div>
          <div
            v-if="userToAction"
            class="font-weight-medium"
          >
            {{ userToAction.firstName }} {{ userToAction.lastName }}
          </div>
          <div
            v-if="!userToAction?.banned"
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
            :color="userToAction?.banned ? 'success' : 'warning'"
            variant="flat"
            :loading="actionLoading"
            @click="confirmBan"
          >
            {{ userToAction?.banned ? 'Unban' : 'Ban' }}
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
            v-if="userToAction"
            class="font-weight-medium"
          >
            {{ userToAction.firstName }} {{ userToAction.lastName }}
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
