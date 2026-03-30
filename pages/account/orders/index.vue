<script setup>
import communes from '@/data/commune.json'
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
  title: t('user.my_orders'),
}))

const headers = [
  { title: t('account.orders.table.items'), key: 'itemsCount', sortable: false },
  { title: 'Sellpoint', key: 'sellpoint', sortable: false },
  { title: t('account.orders.table.status'), key: 'status' },
  { title: t('account.orders.table.date'), key: 'createdAt' },
  { title: t('management.common.table.actions'), key: 'actions', sortable: false, align: 'end' },
]

// Location helpers
const wilayaGroups = (communes || []).filter(g => Array.isArray(g) && g.length)

function getStateLabel(stateId) {
  if (!stateId)
    return null
  const group = wilayaGroups.find(g => String(g[0].wilaya_id) === String(stateId))

  return group ? group[0].name : String(stateId)
}

function getCityLabel(stateId, cityId) {
  if (!stateId || !cityId)
    return null
  const group = wilayaGroups.find(g => String(g[0].wilaya_id) === String(stateId))
  if (!group)
    return String(cityId)
  const city = group.find(c => String(c.id) === String(cityId))

  return city ? city.name : String(cityId)
}

const items = ref([])
const loading = ref(false)
const page = ref(1)
const perPage = ref(10)
const totalItems = ref(0)

function getOrderItemTitle(item) {
  return item?.title || item?.product?.title || item?.productName || ''
}

function getOrderItemTitles(orderItems) {
  if (!Array.isArray(orderItems))
    return []

  return orderItems
    .map(getOrderItemTitle)
    .map(v => String(v || '').trim())
    .filter(Boolean)
}

function previewTitles(titles, max = 2) {
  if (!Array.isArray(titles) || titles.length === 0)
    return ''

  if (titles.length <= max)
    return titles.join(', ')

  return `${titles.slice(0, max).join(', ')} +${titles.length - max}`
}

function chipTitles(titles, max = 4) {
  if (!Array.isArray(titles) || titles.length === 0)
    return { visible: [], remaining: 0 }

  const visible = titles.slice(0, max)
  const remaining = Math.max(0, titles.length - visible.length)
  return { visible, remaining }
}

async function fetchOrders() {
  if (!authStore.token) {
    navigateTo('/login')

    return
  }
  loading.value = true
  try {
    const url = new URL(`${config.public.apiBaseUrl}/api/orders`)

    url.searchParams.set('p', String(page.value))
    url.searchParams.set('perPage', String(perPage.value))

    const res = await fetch(url.toString(), {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`,
      },
    })

    if (!res.ok)
      throw new Error('Failed to fetch orders')
    const data = await res.json()
    const list = Array.isArray(data.data) ? data.data : []

    items.value = list.map(o => ({
      ...o,
      itemsCount: Array.isArray(o.items) ? o.items.length : 0,
      itemTitles: getOrderItemTitles(o.items),
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
  fetchOrders()
})

onMounted(() => {
  fetchOrders()
})

function formatDate(d) {
  try {
    return new Date(d).toLocaleString()
  }
  catch {
    return d
  }
}
</script>

<template>
  <div>
    <VCard
      :title="t('user.my_orders')"
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
          class=""
        >
          <template #item.itemsCount="{ item }">
            <div class="d-flex align-center gap-3">
              <VAvatar
                size="28"
                variant="tonal"
              >
                <span class="text-body-2 font-weight-medium">{{ item.itemsCount }}</span>
              </VAvatar>

              <div
                v-if="item.itemTitles && item.itemTitles.length"
                class="d-flex flex-wrap gap-1 order-items-chips"
              >
                <VChip
                  v-for="(title, idx) in chipTitles(item.itemTitles, 4).visible"
                  :key="idx"
                  label
                  size="x-small"
                  color="secondary"
                  variant="tonal"
                >
                  {{ title }}
                </VChip>

                <VTooltip
                  v-if="chipTitles(item.itemTitles, 4).remaining"
                  location="top"
                >
                  <template #activator="{ props }">
                    <VChip
                      v-bind="props"
                      label
                      size="x-small"
                      color="secondary"
                      variant="outlined"
                    >
                      +{{ chipTitles(item.itemTitles, 4).remaining }}
                    </VChip>
                  </template>
                  <div style="max-width: 320px; white-space: normal;">
                    <div
                      v-for="(title, tIdx) in item.itemTitles"
                      :key="tIdx"
                    >
                      {{ title }}
                    </div>
                  </div>
                </VTooltip>
              </div>
            </div>
          </template>
          <template #item.createdAt="{ item }">
            {{ formatDate(item.createdAt) }}
          </template>
          <template #item.sellpoint="{ item }">
            <div
              v-if="item.sellpoint"
              class="d-flex flex-column gap-1 py-1"
            >
              <span><strong>{{ item.sellpoint.phone }}</strong> </span>
              <span>{{ getStateLabel(item.sellpoint.state) }}, {{ getCityLabel(item.sellpoint.state, item.sellpoint.city) }}</span>
            </div>
            <span v-else class="text-disabled">—</span>
          </template>
          <template #item.shippingCost="{ item }">
            {{ item.shippingCost || 0 }} DZD
          </template>
          <template #item.total="{ item }">
            <span class="text-primary font-weight-medium">{{ item.total }} DZD</span>
          </template>
          <template #item.status="{ item }">
            <VChip
              label
              size="small"
              color="info"
              variant="tonal"
            >
              {{ item.status }}
            </VChip>
          </template>

          <template #item.actions="{ item }">
            <VBtn
              icon="tabler-eye"
              size="small"
              variant="text"
              :to="`/account/orders/${item._id}`"
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
                icon="tabler-receipt-off"
                size="64"
                class="text-disabled mb-4"
              />
              <p class="text-h6 text-disabled">
                {{ t('account.orders.empty.title') }}
              </p>
              <p class="text-body-2 text-disabled">
                {{ t('account.orders.empty.subtitle') }}
              </p>
              <VBtn
                color="primary"
                to="/products/decor"
                class="mt-4"
              >
                {{ t('account.orders.actions.start_shopping') }}
              </VBtn>
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

<style scoped>
.order-items-chips {
  max-width: 360px;
}
</style>
