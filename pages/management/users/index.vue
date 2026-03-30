<script setup>
import communes from '@/data/commune.json'
import { useAuthStore } from '@/stores/auth'
import { paginationMeta } from '@api-utils/paginationMeta'
import { debounce } from 'lodash'
import { useI18n } from 'vue-i18n'
import { VDataTableServer } from 'vuetify/labs/VDataTable'

definePageMeta({
  authed: true,
  admin: true,
})

const router = useRouter()
const authStore = useAuthStore()
const config = useRuntimeConfig()
const { t, d } = useI18n({ useScope: 'global' })

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
const roleFilter = ref('all')

// Filter options
const roleOptions = computed(() => [
  { title: t('management.users.filters.banned.all'), value: 'all' },
  { title: t('account.orders.sellpoint'), value: 'sellpoint' },
  { title: t('nav.management.users'), value: 'user' },
])

// Table headers
const headers = computed(() => [
  { title: t('management.users.table.user'), key: 'user', sortable: false },
  { title: t('management.users.table.phone'), key: 'phone', sortable: false },
  { title: t('management.users.table.role'), key: 'role', sortable: false },
  { title: t('management.users.table.status'), key: 'banned', sortable: false },
  { title: t('management.users.table.joined'), key: 'createdAt', sortable: false },
  { title: t('management.common.table.actions'), key: 'actions', sortable: false, align: 'end' },
])

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

    if (roleFilter.value !== 'all')
      params.append('role', roleFilter.value)

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
    return t('management.common.value.na')

  return d(new Date(date), 'short')
}

const getRoleLabel = role => {
  if (role === 'admin')
    return t('management.users.role.admin')
  if (!role || role === 'user')
    return t('management.users.role.user')

  return String(role)
}

const getUserStatusLabel = banned => (banned ? t('management.users.status.banned') : t('management.users.status.active'))

const noUsersSubtitle = computed(() => (search.value ? t('management.users.empty.filtered') : t('management.users.empty.none')))

const banDialogTitle = computed(() => (userToAction.value?.banned ? t('management.users.banDialog.unban_title') : t('management.users.banDialog.ban_title')))
const banConfirmText = computed(() => (userToAction.value?.banned ? t('management.users.banDialog.unban_confirm') : t('management.users.banDialog.ban_confirm')))
const banActionLabel = computed(() => (userToAction.value?.banned ? t('management.users.actions.unban') : t('management.users.actions.ban')))

const deleteDialogTitle = computed(() => t('management.users.deleteDialog.title'))

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
        userToAction.value.banned
          ? t('management.users.snackbar.unbanned')
          : t('management.users.snackbar.banned'),
        'success',
      )
      banDialog.value = false
      userToAction.value = null
      await fetchUsers()
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
      showSnackbar(t('management.users.snackbar.deleted'), 'success')
      deleteDialog.value = false
      userToAction.value = null
      await fetchUsers()
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

watch(roleFilter, () => {
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

// ── Create Sellpoint ──────────────────────────────────────────
const createLoading = ref(false)
const createFormRef = ref(null)

const createForm = ref({
  phone: '',
  password: '',
  firstName: '',
  lastName: '',
  address: '',
  state: '',
  city: '',
  location: '',
})

const createFormErrors = ref({})

const wilayaGroups = (communes || []).filter(g => Array.isArray(g) && g.length)

const createStateOptions = computed(() =>
  wilayaGroups.map(g => ({ id: String(g[0].wilaya_id), label: g[0].name })),
)

const createCityOptions = computed(() => {
  if (!createForm.value.state)
    return []
  const group = wilayaGroups.find(g => String(g[0].wilaya_id) === String(createForm.value.state))

  return group ? group.map(c => ({ id: String(c.id), label: c.name })) : []
})

watch(() => createForm.value.state, () => {
  createForm.value.city = ''
})

const resetCreateForm = () => {
  createForm.value = {
    phone: '',
    password: '',
    firstName: '',
    lastName: '',
    address: '',
    state: '1',
    city: '1',
    location: '',
  }
  createFormErrors.value = {}
  nextTick(() => {
    createFormRef.value?.reset()
    createFormRef.value?.resetValidation()
  })
}

const submitCreateSellpoint = async () => {
  createFormErrors.value = {}
  createLoading.value = true
  try {
    const res = await fetch(`${config.public.apiBaseUrl}/api/admin/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: `+213${createForm.value.phone.trim()}`,
        password: createForm.value.password,
        firstName: createForm.value.firstName.trim(),
        lastName: createForm.value.lastName.trim(),
        address: createForm.value.address.trim(),
        state: createForm.value.state,
        city: createForm.value.city,
        role: 'sellpoint',
        location: createForm.value.location.trim(),
      }),
    })

    const data = await res.json()

    if (res.ok || res.status === 201) {
      showSnackbar(t('management.users.create_sellpoint.snackbar.success'), 'success')
      resetCreateForm()
      await fetchUsers()
    }
    else {
      showSnackbar(data.message || t('management.users.create_sellpoint.snackbar.failed'), 'error')
    }
  }
  catch (err) {
    console.error('Failed to create sellpoint:', err)
    showSnackbar(t('management.users.create_sellpoint.snackbar.failed'), 'error')
  }
  finally {
    createLoading.value = false
  }
}
</script>

<template>
  <div>
    <VCard
      :title="t('management.users.title')"
      class="mb-6"
    >
      <VDivider class="my-4" />

      <div class="d-flex flex-wrap gap-4 mx-5">
        <div class="d-flex gap-4 flex-wrap align-center">
          <VTextField
            v-model="search"
            :placeholder="t('management.users.search_placeholder')"
            density="compact"
            style="min-inline-size: 250px;"
            clearable
          >
            <template #prepend-inner>
              <VIcon icon="tabler-search" />
            </template>
          </VTextField>

          <VSelect
            v-model="roleFilter"
            :items="roleOptions"
            :label="t('management.common.status')"
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
          {{ item.phone || t('management.common.value.na') }}
        </template>

        <template #item.role="{ item }">
          <VChip
            label
            size="small"
            :color="item.role === 'admin' ? 'error' : 'secondary'"
            variant="tonal"
          >
            {{ getRoleLabel(item.role) }}
          </VChip>
        </template>

        <template #item.banned="{ item }">
          <VChip
            label
            density="comfortable"
            :color="item.banned ? 'error' : 'success'"
            variant="tonal"
          >
            {{ getUserStatusLabel(item.banned) }}
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
              {{ t('management.users.empty.title') }}
            </p>
            <p class="text-body-2 text-disabled">
              {{ noUsersSubtitle }}
            </p>
          </div>
        </template>

        <template #bottom>
          <VDivider />

          <div class="d-flex align-center justify-space-between flex-wrap gap-3 pa-5 pt-3">
            <p class="text-sm text-medium-emphasis mb-0">
              {{ paginationMeta({ page, itemsPerPage }, totalUsers, t) }}
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

    <!-- Create Sellpoint Card -->
    <VCard
      :title="t('management.users.create_sellpoint.title')"
      class="mt-6"
    >
      <VDivider class="my-4" />
      <VCardText>
        <VForm ref="createFormRef">
          <VRow>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="createForm.firstName"
                :label="t('management.users.create_sellpoint.first_name')"
                :rules="[v => !!v || t('management.common.required')]"
                required
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="createForm.lastName"
                :label="t('management.users.create_sellpoint.last_name')"
                :rules="[v => !!v || t('management.common.required')]"
                required
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <AppTextField
                v-model="createForm.phone"
                placeholder="XXXXXXXXX"
                maxlength="9"
                :rules="[v => !!v || t('management.common.required')]"
                dir="ltr"
                @input="createForm.phone = createForm.phone.replace(/\D/g, '')"
              >
                <template #prepend-inner>
                  <p
                    class="mb-0"
                    style="margin-block-start: 1px;"
                  >
                    +213
                  </p>
                </template>
              </AppTextField>
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="createForm.password"
                :label="t('management.users.create_sellpoint.password')"
                type="password"
                :rules="[v => !!v || t('management.common.required'), v => v.length >= 6 || t('management.users.create_sellpoint.password_min')]"
                required
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VSelect
                v-model="createForm.state"
                :items="createStateOptions"
                item-title="label"
                item-value="id"
                :label="t('management.users.create_sellpoint.wilaya')"
                :rules="[v => !!v || t('management.common.required')]"
                required
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VSelect
                v-model="createForm.city"
                :items="createCityOptions"
                item-title="label"
                item-value="id"
                :label="t('management.users.create_sellpoint.city')"
                :disabled="!createForm.state"
                :rules="[v => !!v || t('management.common.required')]"
                required
              />
            </VCol>
            <VCol cols="12">
              <VTextField
                v-model="createForm.address"
                :label="t('management.users.create_sellpoint.address')"
                :rules="[v => !!v || t('management.common.required')]"
                required
              />
            </VCol>
            <VCol cols="12">
              <VTextField
                v-model="createForm.location"
                :label="t('management.users.create_sellpoint.location')"
                placeholder="e.g. 36.737232,3.086472"
              />
            </VCol>
            <VCol cols="12">
              <div class="d-flex justify-end">
                <VSpacer />
                <VBtn
                  color="primary"
                  variant="flat"
                  prepend-icon="tabler-user-plus"
                  :loading="createLoading"
                  @click="submitCreateSellpoint"
                >
                  {{ t('management.users.create_sellpoint.submit') }}
                </VBtn>
              </div>
            </VCol>
          </VRow>
        </VForm>
      </VCardText>
    </VCard>

    <!-- Ban/Unban Dialog -->
    <VDialog
      v-model="banDialog"
      max-width="500"
    >
      <VCard>
        <VCardTitle class="text-h5">
          {{ banDialogTitle }}
        </VCardTitle>
        <VCardText>
          <div class="mb-2">
            {{ banConfirmText }}
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
            :color="userToAction?.banned ? 'success' : 'warning'"
            variant="flat"
            :loading="actionLoading"
            @click="confirmBan"
          >
            {{ banActionLabel }}
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
          {{ deleteDialogTitle }}
        </VCardTitle>
        <VCardText>
          <div class="mb-2">
            {{ t('management.users.deleteDialog.confirm') }}
          </div>
          <div
            v-if="userToAction"
            class="font-weight-medium"
          >
            {{ userToAction.firstName }} {{ userToAction.lastName }}
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
