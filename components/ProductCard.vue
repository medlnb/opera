<script lang="ts" setup>
import { useAuthStore } from '@/stores/auth'
import paint_Product from '@images/paint_Product.png'

const props = defineProps({
  _id: { type: String, required: true },
  imgSrc: { type: String, required: true },
  avatar: { type: String, default: '' },
  title: { type: String, required: true },
  description: { type: String, required: true },
  destination: { type: null },
  isFavorite: { type: Boolean, default: false },
})

const emit = defineEmits(['toggle-favorite'])
const authStore = useAuthStore()
const config = useRuntimeConfig()

// Use avatar from props if provided, otherwise fallback to static image
const avatarSrc = computed(() =>
  props.avatar
    ? `${config.public.apiBaseUrl}/api/image?id=${props.avatar}`
    : paint_Product,
)

const favoriteLoading = ref(false)
const localIsFavorite = ref(props.isFavorite)

watch(() => props.isFavorite, val => {
  localIsFavorite.value = val
})

async function toggleFavorite() {
  if (!authStore.token)
    return navigateTo('/login')

  try {
    favoriteLoading.value = true

    const method = localIsFavorite.value ? 'DELETE' : 'POST'

    const res = await fetch(`${config.public.apiBaseUrl}/api/favorites/${props._id}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`,
      },
    })

    if (!res.ok)
      throw new Error('Failed to update favorite')
    localIsFavorite.value = !localIsFavorite.value
    emit('toggle-favorite', { _id: props._id, isFavorite: localIsFavorite.value })
  }
  catch (err) {
    console.error(err)
    alert('Failed to update favorites')
  }
  finally {
    favoriteLoading.value = false
  }
}
</script>

<template>
  <VCol
    cols="12"
    sm="6"
    md="4"
  >
    <VCard
      elevation="16"
      :to="`/product?id=${_id}`"
      class="h-100"
    >
      <VImg
        :src="`${config.public.apiBaseUrl}/api/image?id=${imgSrc}`"
        height="200"
        width="100%"
        cover
        lazy-src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E"
      >
        <template #placeholder>
          <div
            class="d-flex align-center justify-center"
            style="height: 200px; background-color: #f0f0f0;"
          >
            <VProgressCircular
              indeterminate
              color="primary"
            />
          </div>
        </template>
      </VImg>

      <VCardText class="position-relative pa-0 pt-10">
        <VImg
          height="75"
          width="75"
          class="avatar-center"
          :src="avatarSrc"
        />

        <VCardItem class="px-3 pb-0 pt-3">
          <VCardTitle>{{ title }}</VCardTitle>
        </VCardItem>

        <VCardText class="px-3 pb-2">
          {{ description }}
        </VCardText>

        <VCardActions class="justify-space-between px-3">
          <div>
            <VChip
              v-for="value in destination"
              :key="value"
              class="mr-1 mb-1"
              size="x-small"
            >
              {{ value }}
            </VChip>
          </div>
          <IconBtn
            :color="localIsFavorite ? 'error' : 'secondary'"
            :icon="localIsFavorite ? 'tabler-heart-filled' : 'tabler-heart'"
            :loading="favoriteLoading"
            @click.stop.prevent="toggleFavorite"
          />
        </VCardActions>
      </VCardText>
    </VCard>
  </VCol>
</template>

<style lang="scss" scoped>
.avatar-center {
  position: absolute;
  inset-block-start: -2rem;
  inset-inline-start: 1rem;
}

// membership pricing
.member-pricing-bg {
  position: relative;
  background-color: rgba(var(--v-theme-on-surface), var(--v-hover-opacity));
}

.membership-pricing {
  sup {
    inset-block-start: 9px;
  }
}

.v-btn {
  transform: none;
}
</style>
