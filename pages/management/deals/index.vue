<script setup>
import { useI18n } from 'vue-i18n'
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
const { t, te, locale } = useI18n({ useScope: 'global' })

useHead(() => ({
  title: t('management.deals.title'),
}))

const deals = ref([])
const loading = ref(false)
const totalDeals = ref(0)

const page = ref(1)
const itemsPerPage = ref(10)
const statusFilter = ref('all')
const search = ref('')

const statusOptions = computed(() => [
  { title: t('management.common.filters.all'), value: 'all' },
  { title: t('management.deals.status.new'), value: 'new' },
  { title: t('management.deals.status.contacted'), value: 'contacted' },
  { title: t('management.deals.status.converted'), value: 'converted' },
  { title: t('management.deals.status.closed'), value: 'closed' },
])

const headers = computed(() => ([
  { title: t('management.deals.table.deal_id'), key: 'dealId', sortable: false },
  { title: t('management.deals.table.product'), key: 'product', sortable: false },
  { title: t('management.deals.table.contact'), key: 'contact', sortable: false },
  { title: t('management.deals.table.status'), key: 'status', sortable: false },
  { title: t('management.deals.table.date'), key: 'createdAt', sortable: false },
  { title: t('management.common.table.actions'), key: 'actions', sortable: false, align: 'end' },
]))

const formatDate = date => {
  if (!date)
    return t('management.common.value.na')

  const d = new Date(date)

  return d.toLocaleDateString(locale.value || undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getStatusLabel = status => {
  const key = `management.deals.status.${String(status || '')}`

  return te(key) ? t(key) : String(status || '')
}

const getStatusColor = status => {
  const map = {
    new: 'info',
    contacted: 'warning',
    converted: 'success',
    closed: 'secondary',
  }

  return map[String(status)] || 'default'
}

const fetchDeals = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams({
      p: String(page.value),
      perPage: String(itemsPerPage.value),
    })

    if (statusFilter.value !== 'all')
      params.append('status', statusFilter.value)

    if (String(search.value || '').trim())
      params.append('search', String(search.value || '').trim())

    const res = await fetch(`${config.public.apiBaseUrl}/api/admin/deals?${params}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`,
      },
    })

    const data = await res.json()

    deals.value = data.data || []
    totalDeals.value = data.pagination?.total || 0
  }
  catch (error) {
    console.error('Failed to fetch deals:', error)
  }
  finally {
    loading.value = false
  }
}

const viewDeal = deal => {
  router.push(`/management/deals/${deal._id}`)
}

const updateOptions = options => {
  page.value = options.page
}

watch(page, () => {
  fetchDeals()
})

watch(itemsPerPage, () => {
  page.value = 1
  fetchDeals()
})

watch([statusFilter], () => {
  page.value = 1
  fetchDeals()
})

let searchTimeout
watch(search, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    page.value = 1
    fetchDeals()
  }, 300)
})

onMounted(() => {
  fetchDeals()
})
</script>

<template>
  <div>
    <VCard
      :title="t('management.deals.title')"
      class="mb-6"
    >
      <VDivider class="my-4" />

      <div class="d-flex flex-wrap gap-4 mx-5">
        <div class="d-flex gap-4 flex-wrap align-center">
          <div>
            <VLabel>{{ t('management.common.status') }}</VLabel>
            <VSelect
              v-model="statusFilter"
              :items="statusOptions"
              density="compact"
              style="min-inline-size: 180px;"
            />
          </div>

          <AppTextField
            v-model="search"
            :label="t('management.common.search')"
            density="compact"
            style="min-inline-size: 240px;"
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

      <VDataTableServer
        v-model:items-per-page="itemsPerPage"
        v-model:page="page"
        :headers="headers"
        :items="deals"
        :items-length="totalDeals"
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

        <template #item.dealId="{ item }">
          <span class="font-weight-medium text-primary">
            #{{ item._id?.slice(-8).toUpperCase() }}
          </span>
        </template>

        <template #item.product="{ item }">
          <div class="d-flex align-center gap-3">
            <VAvatar
              size="40"
              rounded
              color="grey-lighten-3"
            >
              <VImg
                v-if="item.product?.imageUrl || item.product?.avatar"
                :src="`${config.public.apiBaseUrl}/api/image?id=${item.product?.imageUrl || item.product?.avatar}`"
                cover
              />
              <VIcon
                v-else
                icon="tabler-package"
              />
            </VAvatar>

            <div>
              <div class="font-weight-medium">
                {{ item.product?.title || t('management.common.value.na') }}
              </div>
              <div
                v-if="item.product?.type"
                class="text-caption text-disabled"
              >
                {{ String(item.product.type) }}
              </div>
            </div>
          </div>
        </template>

        <template #item.contact="{ item }">
          <div>
            <div class="font-weight-medium">
              {{ item.enterpriseName || item.firstName || '-' }} {{ item.enterpriseName ? '' : (item.lastName || '') }}
            </div>
            <div class="text-caption text-disabled">
              {{ item.phone || t('management.common.value.na') }}
            </div>
          </div>
        </template>

        <template #item.status="{ item }">
          <VChip
            label
            density="comfortable"
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
            variant="text"
            @click="viewDeal(item)"
          />
        </template>

        <template #bottom>
          <VDivider />

          <div class="d-flex align-center justify-space-between flex-wrap gap-3 pa-5 pt-3">
            <p class="text-sm text-medium-emphasis mb-0">
              {{ paginationMeta({ page, itemsPerPage }, totalDeals) }}
            </p>

            <VPagination
              v-model="page"
              :length="Math.min(Math.ceil(totalDeals / itemsPerPage), 5)"
              :total-visible="$vuetify.display.xs ? 1 : Math.min(Math.ceil(totalDeals / itemsPerPage), 5)"
            />
          </div>
        </template>
      </VDataTableServer>
    </VCard>
  </div>
</template>
