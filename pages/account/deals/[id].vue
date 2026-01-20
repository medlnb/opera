<script setup>
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'

definePageMeta({
  authed: true,
})

const route = useRoute()
const authStore = useAuthStore()
const config = useRuntimeConfig()
const { t } = useI18n({ useScope: 'global' })

useHead(() => ({
  title: t('account.deals.details.title'),
}))

const deal = ref(null)
const loading = ref(true)

const dealNote = computed(() => {
  const d = deal.value || {}

  return d.message ?? d.note ?? ''
})

async function fetchDeal() {
  loading.value = true
  try {
    const res = await fetch(`${config.public.apiBaseUrl}/api/deals/mine/${route.params.id}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`,
      },
    })

    if (!res.ok)
      throw new Error('Failed to fetch deal')

    const data = await res.json()
    deal.value = data.data
  }
  catch (err) {
    console.error(err)
  }
  finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchDeal()
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
    <VBtn
      variant="text"
      color="primary"
      to="/account/deals"
      class="mb-4"
    >
      <VIcon
        icon="tabler-arrow-left"
        class="me-2"
      />
      {{ t('account.deals.details.back') }}
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
        {{ t('account.deals.details.not_found_title') }}
      </h3>
      <p class="text-body-2 text-disabled mb-4">
        {{ t('account.deals.details.not_found_subtitle') }}
      </p>
    </VCard>

    <template v-else>
      <VCard class="mb-6">
        <VCardTitle class="d-flex align-center justify-space-between">
          <span>{{ t('account.deals.details.deal_number', { id: String(deal._id || '').slice(-8).toUpperCase() }) }}</span>
          <VChip
            label
            variant="tonal"
            color="info"
          >
            {{ deal.status || t('management.common.value.na') }}
          </VChip>
        </VCardTitle>
        <VDivider />
        <VCardText>
          <div class="text-caption text-disabled mb-4">
            {{ t('account.deals.details.created_at', { date: formatDate(deal.createdAt) }) }}
          </div>

          <template v-if="String(dealNote || '').trim()">
            <h6 class="text-h6 mb-2">{{ t('account.deals.details.message') }}</h6>
            <p class="text-body-1">{{ dealNote }}</p>
            <VDivider class="my-6" />
          </template>

          <h6 class="text-h6 mb-3">{{ t('account.deals.details.contact') }}</h6>
          <VList density="compact">
            <VListItem v-if="deal.contact?.address">
              <VListItemTitle>{{ t('deals.fields.address') }}: {{ deal.contact?.address }}</VListItemTitle>
            </VListItem>
            <VListItem v-if="deal.contact?.city || deal.contact?.state">
              <VListItemTitle>
                {{ t('deals.fields.city') }}: {{ deal.contact?.city || '-' }} · {{ t('deals.fields.state') }}: {{ deal.contact?.state || '-' }}
              </VListItemTitle>
            </VListItem>
          </VList>
        </VCardText>
      </VCard>
    </template>
  </div>
</template>
