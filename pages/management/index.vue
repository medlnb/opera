<script setup>
import { useAuthStore } from '@/stores/auth'
import { paginationMeta } from '@api-utils/paginationMeta'
import { debounce } from 'lodash'
import { useI18n } from 'vue-i18n'
import { VDataTableServer } from 'vuetify/labs/VDataTable'

definePageMeta({
  admin: true,
})

const authStore = useAuthStore()
const config = useRuntimeConfig()

const { t } = useI18n({ useScope: 'global' })

const headers = computed(() => [
  { title: t('management.products.table.title'), key: 'title', sortable: true },
  { title: t('management.products.table.type'), key: 'type', sortable: true },
  { title: t('management.products.table.variances'), key: 'variances', sortable: false },
  { title: t('management.common.table.actions'), key: 'actions', sortable: false },
])

const items = ref([])
const loading = ref(false)
const page = ref(1)
const perPage = ref(10)
const totalItems = ref(0)
const snackbar = ref({ show: false, text: '', color: 'error' })
const deleteDialog = ref(false)
const deleting = ref(false)
const productToDelete = ref(null)

const TYPE_OPTIONS = ['decor', 'buildings', 'coating']

const typeOptions = computed(() => TYPE_OPTIONS.map(value => ({
  title: t(`management.products.types.${value}`),
  value,
})))

const filters = reactive({
  search: '',
  type: null,
})

async function fetchProducts() {
  loading.value = true
  try {
    const params = new URLSearchParams()

    params.set('p', String(page.value))
    params.set('perPage', String(perPage.value))
    if (filters.search)
      params.set('search', filters.search)
    if (filters.type && filters.type !== '')
      params.set('type', filters.type)

    const headers = { 'Content-Type': 'application/json' }
    if (authStore.token)
      headers.Authorization = `Bearer ${authStore.token}`

    const res = await fetch(`${config.public.apiBaseUrl}/api/products?${params.toString()}`, { headers })
    if (!res.ok)
      throw new Error('Failed to fetch products')
    const data = await res.json()

    const list = Array.isArray(data.data) ? data.data : []

    items.value = list.map(p => ({
      ...p,
      title: p.title ?? p.name ?? t('common.unnamed'),
      type: p.type ?? p.category ?? '',
      variances: p.variances?.map(v => `${v.name} - ${v.price}dzd`) ?? [],
    }))
    totalItems.value = Number(data.pagination?.total ?? items.value.length)
  }
  catch (err) {
    snackbar.value = { show: true, text: t('management.products.snackbar.load_failed'), color: 'error' }
  }
  finally {
    loading.value = false
  }
}

const debouncedFetch = debounce(fetchProducts, 400)

watch([page, perPage], () => {
  if (page.value < 1)
    page.value = 1
  fetchProducts()
})

watch(filters, () => {
  debouncedFetch()
}, { deep: true })

onMounted(() => {
  fetchProducts()
})

function openDeleteDialog(item) {
  productToDelete.value = item
  deleteDialog.value = true
}

async function confirmDelete() {
  if (!productToDelete.value?._id)
    return deleteDialog.value = false

  try {
    deleting.value = true

    const headers = { 'Content-Type': 'application/json' }
    if (authStore.token)
      headers.Authorization = `Bearer ${authStore.token}`

    const res = await fetch(`${config.public.apiBaseUrl}/api/products/${productToDelete.value._id}`, {
      method: 'DELETE',
      headers,
    })

    if (!res.ok && res.status !== 204)
      throw new Error('Failed to delete')
    items.value = items.value.filter(p => p._id !== productToDelete.value._id)
    totalItems.value = Math.max(0, totalItems.value - 1)
    snackbar.value = { show: true, text: t('management.products.snackbar.deleted'), color: 'success' }
  }
  catch (err) {
    snackbar.value = { show: true, text: t('management.common.delete_failed'), color: 'error' }
  }
  finally {
    deleting.value = false
    deleteDialog.value = false
    productToDelete.value = null
  }
}

function goEdit(item) {
  const id = item?._id
  if (!id)
    return
  navigateTo(`/management/product?id=${encodeURIComponent(id)}`)
}
</script>

<template>
  <VCard :title="t('management.products.title')">
    <VCardText class="pb-0">
      <VRow>
        <VCol
          cols="12"
          md="3"
        >
          <VTextField
            v-model="filters.search"
            :label="t('management.products.filters.search')"
            clearable
            prepend-inner-icon="tabler-search"
          />
        </VCol>
        <VCol
          cols="12"
          md="3"
        >
          <VSelect
            v-model="filters.type"
            :items="typeOptions"
            item-title="title"
            item-value="value"
            :label="t('management.products.filters.type')"
            :placeholder="t('management.products.filters.select_type')"
            clearable
            width="200"
          />
        </VCol>
      </VRow>

      <VDivider class="my-4" />

      <div class="d-flex justify-end w-100">
        <div>
          <AppSelect
            v-model="perPage"
            :items="[5, 10, 20, 25, 50]"
            style="width: 80px;"
          />
        </div>
      </div>

      <VDivider class="my-4" />

      <VDataTableServer
        v-model:items-per-page="perPage"
        v-model:page="page"
        :headers="headers"
        :items="items"
        :items-length="totalItems"
        :loading="loading"
        class="text-no-wrap"
      >
        <template #item.actions="{ item }">
          <div class="d-flex gap-2">
            <VIcon
              size="small"
              variant="tonal"
              @click="goEdit(item)"
            >
              tabler-edit
            </VIcon>
            <VIcon
              size="small"
              variant="tonal"
              color="error"
              @click="openDeleteDialog(item)"
            >
              tabler-trash
            </VIcon>
          </div>
        </template>
        <template #item.type="{ item }">
          <VChip
            label
            size="small"
            color="info"
            variant="tonal"
          >
            {{ item.type || t('management.common.value.na') }}
          </VChip>
        </template>
        <template #item.variances="{ item }" >
          <VSelect
            v-if="item.variances.length"
            :items="item.variances"
            :model-value="item.variances?.[0] ?? null"
            item-title="variance"
            class="ma-0"
          />
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
              icon="tabler-package-off"
              size="64"
              class="text-disabled mb-4"
            />
            <p class="text-h6 text-disabled">
              {{ t('management.products.empty.title') }}
            </p>
            <p class="text-body-2 text-disabled">
              {{ t('management.products.empty.subtitle') }}
            </p>
            <VBtn
              color="primary"
              to="/management/product"
              class="mt-4"
            >
              {{ t('management.products.actions.add_product') }}
            </VBtn>
          </div>
        </template>

        <template #bottom>
          <VDivider />
          <div class="d-flex align-center justify-space-between flex-wrap gap-3 pa-5 pt-3">
            <p class="text-sm text-medium-emphasis mb-0">
              {{ paginationMeta({ page, itemsPerPage: perPage }, totalItems, t) }}
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

  <VDialog
    v-model="deleteDialog"
    max-width="420"
  >
    <VCard>
      <VCardTitle>{{ t('management.products.deleteDialog.title') }}</VCardTitle>
      <VCardText>
        {{ t('management.products.deleteDialog.confirm_prefix') }}
        <strong>{{ productToDelete?.title || t('management.products.deleteDialog.item_fallback') }}</strong>{{ t('management.products.deleteDialog.confirm_suffix') }}
      </VCardText>
      <VCardActions class="d-flex justify-end">
        <VBtn
          variant="text"
          :disabled="deleting"
          @click="deleteDialog = false"
        >
          {{ t('management.common.cancel') }}
        </VBtn>
        <VBtn
          color="error"
          :loading="deleting"
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
    {{ snackbar.text }}
  </VSnackbar>
</template>
