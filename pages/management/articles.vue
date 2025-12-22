<script setup>
import { debounce } from 'lodash'
import { useI18n } from 'vue-i18n'
import { VDataTableServer } from 'vuetify/labs/VDataTable'
import { paginationMeta } from '@api-utils/paginationMeta'
import { useApi } from '@/composables/useApi'

definePageMeta({
  authed: true,
  admin: true,
})

const router = useRouter()

const { t, te, d } = useI18n({ useScope: 'global' })

// Reactive state
const articles = ref([])
const loading = ref(false)
const totalArticles = ref(0)
const deleteDialog = ref(false)
const articleToDelete = ref(null)
const deleting = ref(false)

// Filters
const page = ref(1)
const itemsPerPage = ref(10)
const search = ref('')
const typeFilter = ref('all') // 'all', 'tip', 'inspiration'

const getTypeLabel = type => {
  const key = `management.articles.type.${String(type || '')}`

  return te(key) ? t(key) : String(type || '')
}

// Type options
const typeOptions = computed(() => [
  { title: t('management.articles.filters.all_types'), value: 'all' },
  { title: getTypeLabel('tip'), value: 'tip' },
  { title: getTypeLabel('inspiration'), value: 'inspiration' },
])

// Table headers
const headers = computed(() => [
  { title: t('management.articles.table.title'), key: 'title', sortable: false },
  { title: t('management.articles.table.type'), key: 'for', sortable: false },
  { title: t('management.articles.table.date'), key: 'createdAt', sortable: false },
  { title: t('management.common.table.actions'), key: 'actions', sortable: false, align: 'end' },
])

// Fetch articles
const fetchArticles = async () => {
  loading.value = true
  try {
    const params = {
      p: page.value,
      perPage: itemsPerPage.value,
    }

    if (typeFilter.value !== 'all')
      params.for = typeFilter.value

    if (search.value.trim())
      params.search = search.value.trim()

    const { data, error } = await useApi('/api/articles', { method: 'GET', params })

    articles.value = data.value.data

    totalArticles.value = data.value.pagination?.total || 0
  }
  catch (error) {
    console.error('Failed to fetch articles:', error)
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

const noArticlesSubtitle = computed(() => {
  if (typeFilter.value === 'all')
    return t('management.articles.empty.none')

  return t('management.articles.empty.filtered', { type: getTypeLabel(typeFilter.value) })
})

// Edit article
const editArticle = article => {
  router.push(`/management/newArticle?id=${article._id}`)
}

// Open delete dialog
const openDeleteDialog = article => {
  articleToDelete.value = article
  deleteDialog.value = true
}

// Confirm delete
const confirmDelete = async () => {
  if (!articleToDelete.value)
    return

  deleting.value = true
  try {
    await useApi(`/api/articles/${articleToDelete.value._id}`, { method: 'DELETE' })
    deleteDialog.value = false
    articleToDelete.value = null

    // Refresh list
    await fetchArticles()
  }
  catch (error) {
    console.error('Failed to delete article:', error)
  }
  finally {
    deleting.value = false
  }
}

// Get type chip color
const getTypeColor = type => {
  return type === 'tip' ? 'primary' : 'success'
}

// Update data table options
const updateOptions = options => {
  page.value = options.page
}

// Debounced search
const debouncedSearch = debounce(() => {
  page.value = 1
  fetchArticles()
}, 500)

// Watch for filter changes
watch(page, () => {
  fetchArticles()
})

watch(itemsPerPage, () => {
  page.value = 1
  fetchArticles()
})

watch([typeFilter], () => {
  page.value = 1
  fetchArticles()
})

watch(search, () => {
  debouncedSearch()
})

// Initial fetch
onMounted(() => {
  fetchArticles()
})
</script>

<template>
  <div>
    <VCard
      :title="t('management.articles.title')"
      class="mb-6"
    >
      <template #append>
        <VBtn
          color="primary"
          to="/management/newArticle"
        >
          <VIcon
            icon="tabler-plus"
            class="me-2"
          />
          {{ t('management.articles.actions.create') }}
        </VBtn>
      </template>

      <VDivider class="my-4" />

      <div class="d-flex flex-wrap gap-4 mx-5">
        <div class="d-flex gap-4 flex-wrap align-center">
          <VTextField
            v-model="search"
            :placeholder="t('management.articles.search_placeholder')"
            density="compact"
            style="max-inline-size: 300px; min-inline-size: 200px;"
            clearable
          >
            <template #prepend-inner>
              <VIcon icon="tabler-search" />
            </template>
          </VTextField>

          <VSelect
            v-model="typeFilter"
            :items="typeOptions"
            density="compact"
            style="max-inline-size: 200px; min-inline-size: 150px;"
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
        :items="articles"
        :items-length="totalArticles"
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

        <template #item.title="{ item }">
          <div class="font-weight-medium">
            {{ item.title }}
          </div>
        </template>

        <template #item.for="{ item }">
          <VChip
            label
            density="comfortable"
            :color="getTypeColor(item.for)"
            variant="tonal"
          >
            {{ getTypeLabel(item.for) }}
          </VChip>
        </template>

        <template #item.createdAt="{ item }">
          {{ formatDate(item.createdAt) }}
        </template>

        <template #item.actions="{ item }">
          <div class="d-flex gap-2">
            <VBtn
              icon="tabler-edit"
              size="small"
              variant="text"
              @click="editArticle(item)"
            />
            <VBtn
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
              icon="tabler-file-text"
              size="64"
              class="text-disabled mb-4"
            />
            <p class="text-h6 text-disabled">
              {{ t('management.articles.empty.title') }}
            </p>
            <p class="text-body-2 text-disabled">
              {{ noArticlesSubtitle }}
            </p>
            <VBtn
              color="primary"
              to="/management/newArticle"
              class="mt-4"
            >
              <VIcon
                icon="tabler-plus"
                class="me-2"
              />
              {{ t('management.articles.actions.create') }}
            </VBtn>
          </div>
        </template>

        <template #bottom>
          <VDivider />

          <div class="d-flex align-center justify-space-between flex-wrap gap-3 pa-5 pt-3">
            <p class="text-sm text-medium-emphasis mb-0">
              {{ paginationMeta({ page, itemsPerPage }, totalArticles, t) }}
            </p>

            <VPagination
              v-model="page"
              :length="Math.min(Math.ceil(totalArticles / itemsPerPage), 5)"
              :total-visible="$vuetify.display.xs ? 1 : Math.min(Math.ceil(totalArticles / itemsPerPage), 5)"
            />
          </div>
        </template>
      </VDataTableServer>
    </VCard>

    <!-- Delete Confirmation Dialog -->
    <VDialog
      v-model="deleteDialog"
      max-width="500"
    >
      <VCard>
        <VCardTitle class="text-h5">
          {{ t('management.articles.deleteDialog.title') }}
        </VCardTitle>
        <VCardText>
          <div class="mb-2">
            {{ t('management.articles.deleteDialog.confirm') }}
          </div>
          <div
            v-if="articleToDelete"
            class="font-weight-medium"
          >
            "{{ articleToDelete.title }}"
          </div>
          <div class="text-body-2 text-error mt-3">
            {{ t('management.articles.deleteDialog.warning') }}
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
            :loading="deleting"
            @click="confirmDelete"
          >
            {{ t('management.common.delete') }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>
