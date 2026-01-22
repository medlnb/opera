<script setup>
import { useAuthStore } from '@/stores/auth'
import { paginationMeta } from '@api-utils/paginationMeta'
import { useI18n } from 'vue-i18n'
import { VDataTableServer } from 'vuetify/labs/VDataTable'

definePageMeta({
  authed: true,
})

const authStore = useAuthStore()
const config = useRuntimeConfig()
const { t } = useI18n({ useScope: 'global' })

useHead(() => ({
  title: t('user.my_deals'),
}))

const headers = computed(() => ([
  { title: t('account.deals.table.deal_id'), key: 'dealId', sortable: false },
  { title: t('account.deals.table.product'), key: 'product', sortable: false },
  { title: t('account.deals.table.note'), key: 'note', sortable: false },
  { title: t('account.deals.table.status'), key: 'status', sortable: false },
  { title: t('account.deals.table.date'), key: 'createdAt', sortable: false },
  { title: t('account.deals.table.actions'), key: 'actions', sortable: false, align: 'end' },
]))

const items = ref([])
const loading = ref(false)
const page = ref(1)
const perPage = ref(10)
const totalItems = ref(0)

async function fetchDeals() {
  if (!authStore.token) {
    navigateTo('/login')

    return
  }

  loading.value = true
  try {
    const url = new URL(`${config.public.apiBaseUrl}/api/deals/mine`)

    url.searchParams.set('p', String(page.value))
    url.searchParams.set('perPage', String(perPage.value))

    const res = await fetch(url.toString(), {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`,
      },
    })

    if (!res.ok)
      throw new Error('Failed to fetch deals')

    const data = await res.json()
    const list = Array.isArray(data.data) ? data.data : []

    items.value = list.map(d => ({
      ...d,
      dealId: d._id,
      note: d.message ?? d.note ?? '',
    }))
    totalItems.value = Number(data.pagination?.total ?? list.length)
  }
  catch (err) {
    console.error(err)
  }
  finally {
    loading.value = false
  }
}

watch([page, perPage], () => {
  if (page.value < 1)
    page.value = 1
  fetchDeals()
})

onMounted(() => {
  fetchDeals()
})

function formatDate(d) {
  try {
    return new Date(d).toLocaleString()
  }
  catch {
    return d
  }
}

function viewDeal(deal) {
  if (!deal?._id)
    return

  navigateTo(`/account/deals/${deal._id}`)
}
</script>

<template>
  <div>
    <VCard
      :title="t('user.my_deals')"
      class="mb-6"
    >
      <VCardText>
        <VDivider class="my-4" />
        <div class="d-flex flex-wrap gap-4 mx-5">
          <VSpacer />
          <div class="d-flex gap-4 flex-wrap align-center">
            <AppSelect
              v-model="perPage"
              :items="[5, 10, 20, 25, 50]"
            />
          </div>
        </div>

        <VDivider class="mt-4" />

        <VDataTableServer
          v-model:items-per-page="perPage"
          v-model:page="page"
          :headers="headers"
          :items="items"
          :items-length="totalItems"
          :loading="loading"
          item-value="_id"
          class="text-no-wrap"
        >
          <template #item.dealId="{ item }">
            <span class="font-weight-medium text-primary">
              #{{ String(item._id || '').slice(-8).toUpperCase() }}
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

          <template #item.note="{ item }">
            <span class="text-body-2">
              {{ String(item.note || '').slice(0, 80) }}
            </span>
          </template>

          <template #item.createdAt="{ item }">
            {{ formatDate(item.createdAt) }}
          </template>

          <template #item.status="{ item }">
            <VChip
              label
              size="small"
              color="info"
              variant="tonal"
            >
              {{ item.status || t('management.common.value.na') }}
            </VChip>
          </template>

          <template #item.actions="{ item }">
            <VBtn
              icon="tabler-eye"
              variant="text"
              @click="viewDeal(item)"
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
                icon="tabler-file-invoice-off"
                size="64"
                class="text-disabled mb-4"
              />
              <p class="text-h6 text-disabled">
                {{ t('account.deals.empty.title') }}
              </p>
              <p class="text-body-2 text-disabled">
                {{ t('account.deals.empty.subtitle') }}
              </p>
            </div>
          </template>

          <template #bottom>
            <VDivider />

            <div class="d-flex align-center justify-space-between flex-wrap gap-3 pa-5 pt-3">
              <p class="text-sm text-medium-emphasis mb-0">
                {{ paginationMeta({ page, itemsPerPage: perPage }, totalItems) }}
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
  </div>
</template>
