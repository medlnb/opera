<script setup>
const stats = [
  { value: '80+', label: 'Sales Points' },
  { value: '61+', label: 'Products Manufactured' },
  { value: '10+', label: 'Years Experience' },
]

const features = [
  {
    icon: 'tabler-award',
    title: 'Unmatched Quality',
    description: 'Our products are made with premium materials to ensure a flawless and durable finish.',
    color: 'primary',
  },
  {
    icon: 'tabler-bulb',
    title: 'Continuous Innovation',
    description: 'We integrate the latest technologies and market trends to offer paint solutions that meet modern demands.',
    color: 'success',
  },
  {
    icon: 'tabler-shield-check',
    title: 'Exceptional Resistance',
    description: 'Whether against weather, UV rays, or stains, our paints are designed to last and protect your walls.',
    color: 'warning',
  },
  {
    icon: 'tabler-heart-handshake',
    title: 'Customer Satisfaction',
    description: 'Your satisfaction is our priority. We support you at every step to ensure the final result exceeds your expectations.',
    color: 'info',
  },
]
</script>

<template>
  <div>
    <!-- Hero Section -->
    <VCard class="hero-section mb-6 overflow-hidden">
      <div class="hero-bg" />
      <VCardText class="hero-content text-center py-12 px-4 position-relative">
        <h1 class="text-h3 text-md-h2 font-weight-bold mb-4 text-white">
          Work with an <span class="text-primary">Excellent</span> Product
        </h1>
        <p class="text-body-1 text-white-50 mb-6 mx-auto" style="max-width: 600px;">
          Opera Peinture offers high-quality paints, combining innovation, durability, and eco-friendliness for all your painting projects.
        </p>
        <div class="d-flex flex-wrap justify-center gap-4">
          <VBtn color="primary" size="large" to="/products/decor">
            <VIcon icon="tabler-paint" class="me-2" />
            Explore Products
          </VBtn>
          <VBtn variant="outlined" color="white" size="large" to="/colors">
            <VIcon icon="tabler-palette" class="me-2" />
            View Colors
          </VBtn>
        </div>
      </VCardText>
    </VCard>

    <!-- Stats Section -->
    <VRow class="mb-6">
      <VCol
        v-for="stat in stats"
        :key="stat.label"
        cols="12"
        sm="4"
      >
        <VCard class="text-center pa-6 stat-card h-100">
          <div class="text-h2 font-weight-bold text-primary mb-2">
            {{ stat.value }}
          </div>
          <div class="text-body-1 text-medium-emphasis">
            {{ stat.label }}
          </div>
        </VCard>
      </VCol>
    </VRow>

    <!-- About Section -->
    <VCard class="mb-6">
      <VRow no-gutters>
        <VCol cols="12" md="6">
          <VImg
            src="https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800"
            height="100%"
            min-height="300"
            cover
            class="about-image"
          >
            <template #placeholder>
              <div class="d-flex align-center justify-center fill-height">
                <VProgressCircular indeterminate color="primary" />
              </div>
            </template>
          </VImg>
        </VCol>
        <VCol cols="12" md="6">
          <VCardText class="pa-6 pa-md-8 d-flex flex-column justify-center h-100">
            <div class="text-overline text-primary mb-2">About Us</div>
            <h2 class="text-h4 font-weight-bold mb-4">Who are we?</h2>
            <p class="text-body-1 text-medium-emphasis mb-4">
              Founded in 2014 in Batna, Opera Paints specializes in the manufacturing, production, and export of high-quality paints that meet durability and environmental safety standards.
            </p>
            <p class="text-body-1 text-medium-emphasis mb-4">
              Since its inception, the company has established itself as one of the leaders in the industry in Algeria and North Africa. Opera Paints offers more than 60 different products, including architectural and decorative paints, to meet the needs of its customers.
            </p>
            <p class="text-body-1 text-medium-emphasis mb-6">
              Currently, its products are available in over 80 points of sale in Algeria, as well as in Côte d'Ivoire and Burkina Faso.
            </p>
            <div>
              <VBtn color="primary" variant="tonal" to="/tips">
                Learn More
                <VIcon icon="tabler-arrow-right" class="ms-2" />
              </VBtn>
            </div>
          </VCardText>
        </VCol>
      </VRow>
    </VCard>

    <!-- Features Section -->
    <div class="mb-6">
      <div class="text-center mb-6">
        <div class="text-overline text-primary mb-2">Why Choose Us</div>
        <h2 class="text-h4 font-weight-bold">Our Commitment to Excellence</h2>
      </div>
      <VRow>
        <VCol
          v-for="feature in features"
          :key="feature.title"
          cols="12"
          sm="6"
          lg="3"
        >
          <VCard class="feature-card h-100 pa-6 text-center">
            <VAvatar
              :color="feature.color"
              variant="tonal"
              size="64"
              class="mb-4"
            >
              <VIcon :icon="feature.icon" size="32" />
            </VAvatar>
            <h3 class="text-h6 font-weight-medium mb-3">{{ feature.title }}</h3>
            <p class="text-body-2 text-medium-emphasis mb-0">
              {{ feature.description }}
            </p>
          </VCard>
        </VCol>
      </VRow>
    </div>

    <!-- CTA Section -->
    <VCard class="cta-section overflow-hidden">
      <div class="cta-bg" />
      <VCardText class="text-center py-12 px-4 position-relative">
        <h2 class="text-h4 font-weight-bold mb-4">Ready to Transform Your Space?</h2>
        <p class="text-body-1 text-medium-emphasis mb-6 mx-auto" style="max-width: 500px;">
          Explore our wide range of premium paints and find the perfect color for your next project.
        </p>
        <div class="d-flex flex-wrap justify-center gap-4">
          <VBtn color="primary" size="large" to="/products/decor">
            <VIcon icon="tabler-shopping-cart" class="me-2" />
            Shop Now
          </VBtn>
          <VBtn variant="outlined" size="large" to="/inspirations">
            <VIcon icon="tabler-sparkles" class="me-2" />
            Get Inspired
          </VBtn>
        </div>
      </VCardText>
    </VCard>
  </div>
</template>

<style scoped>
.hero-section {
  position: relative;
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)) 0%, #1a237e 100%);
}

.hero-bg {
  position: absolute;
  inset: 0;
  background-image: url("https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=1200");
  background-size: cover;
  background-position: center;
  opacity: 0.15;
}

.hero-content {
  z-index: 1;
}

.text-white-50 {
  color: rgba(255, 255, 255, 0.8) !important;
}

.stat-card {
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(var(--v-theme-primary), 0.15);
}

.about-image :deep(.v-img__img) {
  object-position: center;
}

.feature-card {
  transition: transform 0.2s, box-shadow 0.2s;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.cta-section {
  position: relative;
  background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
}

.v-theme--dark .cta-section {
  background: linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%);
}

.cta-bg {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle at 20% 50%, rgba(var(--v-theme-primary), 0.1) 0%, transparent 50%),
                    radial-gradient(circle at 80% 50%, rgba(var(--v-theme-primary), 0.1) 0%, transparent 50%);
}
</style>
