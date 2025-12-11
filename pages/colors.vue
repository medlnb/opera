<script setup>
import { useApi } from '@/composables/useApi'

const loading = ref(false)
const colors = ref([])
const snackbar = ref({ show: false, color: 'error', text: '' })

async function fetchColors() {
	try {
		loading.value = true
		const { data, error } = await useApi('/api/products/colors', { method: 'GET' })
		if (error.value) throw error.value
		const list = data.value?.colors ?? []
		colors.value = Array.isArray(list) ? list : []
	} catch (e) {
		snackbar.value = { show: true, color: 'error', text: 'Failed to load colors' }
	} finally {
		loading.value = false
	}
}

onMounted(()=>{
  fetchColors()
})
</script>

<template>
	<div>
		<div class="mb-4" style="position: relative;">
			<VImg 
				src="https://jazeerapaints.com/media/blockbuilder_blocktype/1/1/1172x210_3_1__2.png"
				class="rounded w-100 hero-img"
				style="min-height: 150px;"
				cover
			/>
			<div style="inset: 0;" class="d-flex align-center justify-center position-absolute">
				<div class="text-center px-4">
					<p class="mb-1 hero-title">Welcome to the Spectrum of Colors</p>
					<p class="mb-0 hero-subtitle">Explore Shades That Bring Your Vision to Life</p>
				</div>
			</div>
		</div>
		<VCard>
			<VCardText class="px-3 pt-2">
        <VCardTitle class="px-2">Colors</VCardTitle>
				<VRow v-if="loading">
					<VCol cols="12" class="d-flex align-center justify-center py-6">
						<VProgressCircular indeterminate color="primary" />
					</VCol>
				</VRow>

				<div v-else-if="colors.length === 0" class="text-center py-12">
					<VIcon icon="tabler-palette-off" size="64" class="text-disabled mb-4" />
					<p class="text-h6 text-disabled">No colors available</p>
					<p class="text-body-2 text-disabled">Check back later for new colors</p>
				</div>

				<VRow v-else dense>
					<VCol v-for="(c, i) in colors" :key="i" cols="6" sm="6" md="3">
						<VCard class="pa-0" :to="`/products/${c.name}`" elevation="0">
							<div 
								:style="{ backgroundColor: c.code, height: $vuetify.display.xs ? '60px' : '100px', borderRadius: '8px' }"
							/>
							<div class="d-flex flex-column pa-2 pt-1">
								<span class="text-subtitle-1">{{ c.name || 'Unnamed' }}</span>
								<span class="text-caption">{{ c.code || '—' }}</span>
							</div>
						</VCard>
					</VCol>
				</VRow>
			</VCardText>
		</VCard>

		<VSnackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
			{{ snackbar.text }}
		</VSnackbar>
	</div>
  
</template>

<style scoped>
.hero-img :deep(img) {
  object-position: left center !important;
}

.hero-title {
  font-size: 1rem;
  font-weight: 900;
}
.hero-subtitle {
  font-size: 0.7rem;
}

@media (min-width: 600px) {
  .hero-title {
    font-size: 2rem;
    font-weight: 900;
  }
  .hero-subtitle {
    font-size: 1.25rem;
  }
}
</style>
