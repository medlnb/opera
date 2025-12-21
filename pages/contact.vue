<script setup>
import { useI18n } from 'vue-i18n'
import branchsData from '@/data/branchs.json'

const searchQuery = ref('')
const selectedBranch = ref(null)

const { t } = useI18n({ useScope: 'global' })

const filteredBranches = computed(() => {
  if (!searchQuery.value)
    return branchsData

  return branchsData.filter(branch =>
    branch.city.toLowerCase().includes(searchQuery.value.toLowerCase()),
  )
})

const totalBranches = computed(() => branchsData.length)

const openGoogleMaps = branch => {
  const url = `https://www.google.com/maps?q=${branch.lat},${branch.lng}`

  window.open(url, '_blank')
}

const callPhone = phone => {
  window.open(`tel:${phone.replace(/\s/g, '')}`, '_self')
}

const copyPhone = async phone => {
  await navigator.clipboard.writeText(phone)
}
</script>

<template>
  <div>
    <!-- Hero Section -->
    <VCard class="contact-hero mb-6 overflow-hidden">
      <div class="hero-bg" />
      <VCardText class="text-center py-12 px-4 position-relative">
        <h1 class="text-h3 text-md-h2 font-weight-bold mb-4 text-white">
          <VIcon
            icon="tabler-map-pin"
            size="48"
            class="me-2"
          />
          {{ t('contact.title') }}
        </h1>
        <p
          class="text-body-1 text-white-50 mb-4 mx-auto"
          style="max-inline-size: 600px;"
        >
          {{ t('contact.hero_description', { total: totalBranches }) }}
        </p>
      </VCardText>
    </VCard>

    <!-- Contact Info Cards -->
    <VRow class="mb-6">
      <VCol
        cols="12"
        md="4"
      >
        <VCard
          class="text-center pa-6"
          height="100%"
        >
          <VAvatar
            color="primary"
            variant="tonal"
            size="64"
            class="mb-4"
          >
            <VIcon
              icon="tabler-building-store"
              size="32"
            />
          </VAvatar>
          <h3 class="text-h5 font-weight-bold mb-2">
            {{ t('contact.branches_count', { total: totalBranches }) }}
          </h3>
          <p class="text-body-2 text-medium-emphasis">
            {{ t('contact.nationwide_coverage') }}
          </p>
        </VCard>
      </VCol>
      <VCol
        cols="12"
        md="4"
      >
        <VCard
          class="text-center pa-6"
          height="100%"
        >
          <VAvatar
            color="success"
            variant="tonal"
            size="64"
            class="mb-4"
          >
            <VIcon
              icon="tabler-clock"
              size="32"
            />
          </VAvatar>
          <h3 class="text-h5 font-weight-bold mb-2">
            {{ t('contact.working_hours') }}
          </h3>
          <p class="text-body-2 text-medium-emphasis">
            {{ t('contact.working_hours_details') }}
          </p>
        </VCard>
      </VCol>
      <VCol
        cols="12"
        md="4"
      >
        <VCard
          class="text-center pa-6"
          height="100%"
        >
          <VAvatar
            color="warning"
            variant="tonal"
            size="64"
            class="mb-4"
          >
            <VIcon
              icon="tabler-headset"
              size="32"
            />
          </VAvatar>
          <h3 class="text-h5 font-weight-bold mb-2">
            {{ t('contact.support') }}
          </h3>
          <p class="text-body-2 text-medium-emphasis">
            {{ t('contact.support_details') }}
          </p>
        </VCard>
      </VCol>
    </VRow>

    <!-- Search and Branches -->
    <VCard>
      <VCardTitle class="d-flex align-center flex-wrap gap-4 pa-6">
        <span class="text-h5">
          <VIcon
            icon="tabler-map-2"
            class="me-2"
          />
          {{ t('contact.our_branches') }}
        </span>
        <VSpacer />
        <VTextField
          v-model="searchQuery"
          :placeholder="t('contact.search_by_city')"
          prepend-inner-icon="tabler-search"
          density="compact"
          variant="outlined"
          style="max-inline-size: 300px;"
          clearable
          hide-details
        />
      </VCardTitle>

      <VDivider />

      <VCardText class="pa-0">
        <div
          v-if="filteredBranches.length === 0"
          class="text-center pa-8"
        >
          <VIcon
            icon="tabler-map-pin-off"
            size="64"
            color="grey"
            class="mb-4"
          />
          <h3 class="text-h6 text-medium-emphasis">
            {{ t('contact.no_branches_found') }}
          </h3>
          <p class="text-body-2 text-disabled">
            {{ t('contact.try_different_search') }}
          </p>
        </div>

        <VRow
          v-else
          class="pa-4"
          dense
        >
          <VCol
            v-for="branch in filteredBranches"
            :key="branch.city"
            cols="12"
            sm="6"
            md="4"
            lg="3"
          >
            <VCard
              variant="outlined"
              class="branch-card h-100"
              :class="{ 'border-primary': selectedBranch?.city === branch.city }"
              @click="selectedBranch = branch"
            >
              <VCardText class="pa-4">
                <div class="d-flex align-center mb-3">
                  <VAvatar
                    color="primary"
                    variant="tonal"
                    size="40"
                    class="me-3"
                  >
                    <VIcon
                      icon="tabler-map-pin"
                      size="20"
                    />
                  </VAvatar>
                  <div>
                    <h4 class="text-subtitle-1 font-weight-bold">
                      {{ branch.city }}
                    </h4>
                    <span class="text-caption text-medium-emphasis">{{ t('contact.country') }}</span>
                  </div>
                </div>

                <VDivider class="mb-3" />

                <div class="mb-3">
                  <div class="text-caption text-medium-emphasis mb-1">
                    <VIcon
                      icon="tabler-phone"
                      size="14"
                      class="me-1"
                    />
                    {{ t('contact.phone_numbers') }}
                  </div>
                  <div
                    v-for="phone in branch.phones"
                    :key="phone"
                    class="d-flex align-center justify-space-between mb-1"
                  >
                    <span class="text-body-2">{{ phone }}</span>
                    <div>
                      <VBtn
                        icon
                        size="x-small"
                        variant="text"
                        color="success"
                        @click.stop="callPhone(phone)"
                      >
                        <VIcon
                          icon="tabler-phone-call"
                          size="16"
                        />
                        <VTooltip
                          activator="parent"
                          location="top"
                        >
                          {{ t('contact.call') }}
                        </VTooltip>
                      </VBtn>
                      <VBtn
                        icon
                        size="x-small"
                        variant="text"
                        color="primary"
                        @click.stop="copyPhone(phone)"
                      >
                        <VIcon
                          icon="tabler-copy"
                          size="16"
                        />
                        <VTooltip
                          activator="parent"
                          location="top"
                        >
                          {{ t('contact.copy') }}
                        </VTooltip>
                      </VBtn>
                    </div>
                  </div>
                </div>

                <VBtn
                  block
                  variant="tonal"
                  color="primary"
                  size="small"
                  @click.stop="openGoogleMaps(branch)"
                >
                  <VIcon
                    icon="tabler-map"
                    class="me-2"
                    size="18"
                  />
                  {{ t('contact.view_on_map') }}
                </VBtn>
              </VCardText>
            </VCard>
          </VCol>
        </VRow>
      </VCardText>

      <VDivider />

      <VCardText class="d-flex align-center justify-space-between flex-wrap gap-2 pa-4">
        <span class="text-body-2 text-medium-emphasis">
          {{ t('contact.showing_branches', { shown: filteredBranches.length, total: totalBranches }) }}
        </span>
      </VCardText>
    </VCard>
  </div>
</template>

<style lang="scss" scoped>
.contact-hero {
  position: relative;
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)) 0%, rgb(var(--v-theme-primary-darken-1), 0.8) 100%);

  .hero-bg {
    position: absolute;
    background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    inset: 0;
  }
}

.branch-card {
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgb(var(--v-theme-primary)) !important;
    box-shadow: 0 4px 12px rgba(var(--v-theme-primary), 0.15);
    transform: translateY(-2px);
  }
}
</style>
