<script setup>
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'

definePageMeta({
  authed: true,
  admin: true,
})

const route = useRoute()
const authStore = useAuthStore()
const config = useRuntimeConfig()
const { t, te, d } = useI18n({ useScope: 'global' })

const deal = ref(null)
const loading = ref(true)
const updating = ref(false)
const snackbar = ref({ show: false, message: '', color: 'success' })

const showSnackbar = (message, color = 'success') => {
  snackbar.value = { show: true, message, color }
}

useHead(() => ({
  title: t('management.deals.details.title'),
}))

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

const statusOptions = computed(() => {
  const defaults = ['new', 'contacted', 'converted', 'closed']
  const current = deal.value?.status
  const all = Array.from(new Set([...(defaults || []), current].filter(Boolean)))

  return all.map(v => ({ title: getStatusLabel(v), value: v }))
})

const edit = ref({
  status: '',
  adminNotes: '',
})

const dealProductId = computed(() => {
  const d = deal.value || {}
  const p = d.product || null

  return p?._id || d.productId || d.product || null
})

const dealProductImageSrc = computed(() => {
  const p = deal.value?.product
  const imageId = p?.imageUrl || p?.avatar
  if (!imageId)
    return ''

  return `${config.public.apiBaseUrl}/api/image?id=${imageId}`
})

const fetchDeal = async () => {
  loading.value = true
  try {
    const res = await fetch(`${config.public.apiBaseUrl}/api/admin/deals/${route.params.id}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`,
      },
    })

    if (!res.ok)
      throw new Error('Failed to fetch deal')

    const data = await res.json()

    deal.value = data.data

    edit.value.status = deal.value?.status || 'new'
    edit.value.adminNotes = deal.value?.adminNotes || ''
  }
  catch (error) {
    console.error('Failed to fetch deal:', error)
    showSnackbar(t('management.deals.details.snackbar.load_failed'), 'error')
  }
  finally {
    loading.value = false
  }
}

const saveUpdates = async () => {
  if (!deal.value?._id)
    return

  updating.value = true
  try {
    const res = await fetch(`${config.public.apiBaseUrl}/api/admin/deals/${deal.value._id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`,
      },
      body: JSON.stringify({
        status: edit.value.status,
        adminNotes: edit.value.adminNotes,
      }),
    })

    if (!res.ok)
      throw new Error('Update failed')

    const data = await res.json()

    deal.value = data.data
    showSnackbar(t('management.deals.details.snackbar.updated'), 'success')
  }
  catch (error) {
    console.error('Failed to update deal:', error)
    showSnackbar(t('management.deals.details.snackbar.update_failed'), 'error')
  }
  finally {
    updating.value = false
  }
}

const formatDate = date => {
  if (!date)
    return t('management.common.value.na')

  return d(new Date(date), 'long')
}

onMounted(() => {
  fetchDeal()
})
</script>

<template>
  <div>
    <VBtn
      variant="text"
      color="primary"
      to="/management/deals"
      class="mb-4"
    >
      <VIcon
        icon="tabler-arrow-left"
        class="me-2"
      />
      {{ t('management.deals.details.back_to_deals') }}
    </VBtn>

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

    <VCard
      v-else-if="!deal"
      class="text-center py-12"
    >
      <VIcon
        icon="tabler-file-off"
        size="64"
        class="text-disabled mb-4"
      />
      <h3 class="text-h6 text-disabled mb-2">
        {{ t('management.deals.details.not_found_title') }}
      </h3>
      <p class="text-body-2 text-disabled mb-4">
        {{ t('management.deals.details.not_found_subtitle') }}
      </p>
    </VCard>

    <template v-else>
      <VRow>
        <VCol
          cols="12"
          md="8"
        >
          <VCard class="mb-6">
            <VCardTitle class="d-flex align-center justify-space-between">
              <span>{{ t('management.deals.details.deal_number', { id: deal._id?.slice(-8).toUpperCase() }) }}</span>
              <VChip
                label
                :color="getStatusColor(deal.status)"
                variant="tonal"
              >
                {{ getStatusLabel(deal.status) }}
              </VChip>
            </VCardTitle>
            <VDivider />
            <VCardText>
              <div class="text-caption text-disabled mb-4">
                {{ t('management.deals.details.created_at', { date: formatDate(deal.createdAt) }) }}
              </div>

              <template v-if="deal.message || deal.note">
                <h6 class="text-h6 mb-2">
                  {{ t('management.deals.details.message') }}
                </h6>
                <p class="text-body-1">
                  {{ deal.message || deal.note }}
                </p>
              </template>
            </VCardText>
          </VCard>
        </VCol>

        <VCol
          cols="12"
          md="4"
        >
          <VCard class="mb-6">
            <VCardTitle>{{ t('management.deals.details.product') }}</VCardTitle>
            <VDivider />
            <VCardText>
              <div class="d-flex align-center gap-3">
                <VAvatar
                  size="52"
                  rounded
                  color="grey-lighten-3"
                >
                  <VImg
                    v-if="dealProductImageSrc"
                    :src="dealProductImageSrc"
                    cover
                  />
                  <VIcon
                    v-else
                    icon="tabler-package"
                  />
                </VAvatar>

                <div class="flex-grow-1">
                  <div class="font-weight-medium">
                    {{ deal.product?.title || t('management.common.value.na') }}
                  </div>
                  <div
                    v-if="deal.product?.type"
                    class="text-caption text-disabled"
                  >
                    {{ String(deal.product.type) }}
                  </div>
                </div>

                <VBtn
                  v-if="dealProductId"
                  icon="tabler-external-link"
                  variant="text"
                  color="primary"
                  :to="{ path: '/product', query: { id: dealProductId } }"
                />
              </div>
            </VCardText>
          </VCard>

          <VCard class="mb-6">
            <VCardTitle>{{ t('management.deals.details.contact') }}</VCardTitle>
            <VDivider />
            <VCardText>
              <VList density="compact">
                <VListItem>
                  <VListItemTitle>{{ t('deals.fields.phone') }}: {{ deal.phone || '-' }}</VListItemTitle>
                </VListItem>
                <VListItem>
                  <VListItemTitle>
                    {{ t('deals.fields.firstName') }}: {{ deal.firstName || '-' }} · {{ t('deals.fields.lastName') }}: {{ deal.lastName || '-' }}
                  </VListItemTitle>
                </VListItem>
                <VListItem v-if="deal.enterpriseName">
                  <VListItemTitle>{{ t('deals.fields.enterpriseName') }}: {{ deal.enterpriseName }}</VListItemTitle>
                </VListItem>
                <VListItem v-if="deal.address">
                  <VListItemTitle>{{ t('deals.fields.address') }}: {{ deal.address }}</VListItemTitle>
                </VListItem>
                <VListItem v-if="deal.city || deal.state">
                  <VListItemTitle>
                    {{ t('deals.fields.city') }}: {{ deal.city || '-' }} · {{ t('deals.fields.state') }}: {{ deal.state || '-' }}
                  </VListItemTitle>
                </VListItem>
              </VList>
            </VCardText>
          </VCard>

          <VCard>
            <VCardTitle>{{ t('management.deals.details.admin') }}</VCardTitle>
            <VDivider />
            <VCardText>
              <VSelect
                v-model="edit.status"
                :items="statusOptions"
                :label="t('management.common.status')"
                density="compact"
              />

              <AppTextarea
                v-model="edit.adminNotes"
                class="mt-4"
                :label="t('management.deals.details.admin_notes')"
                auto-grow
              />

              <VBtn
                class="mt-4"
                color="primary"
                block
                :loading="updating"
                @click="saveUpdates"
              >
                {{ t('management.common.actions.save') }}
              </VBtn>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>
    </template>

    <VSnackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      timeout="5000"
      location="bottom end"
    >
      {{ snackbar.message }}
    </VSnackbar>
  </div>
</template>
