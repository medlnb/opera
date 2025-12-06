<script lang="ts" setup>
import paint_Product from "@/assets/images/paint_Product.png";
import { defineProps } from 'vue';

const props = defineProps({
  _id: { type: String, required: true },
  imgSrc: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  finishing: { type: null }
})

</script>

<template>
  <VCol
    cols="12"
    sm="6"
    md="4"
  >
    <VCard elevation="16" :to="`/product?id=${_id}`" class="h-100">
    <VImg
      :src="`http://localhost:8888/api/image?id=${imgSrc}`"
      height="200"
      width="100%"
      cover
    >
      <template #placeholder>
        <div
          class="d-flex align-center justify-center"
          style="height: 200px; background-color: #f0f0f0;"
        >
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
        </div>
      </template>
    </VImg>

      <VCardText class="position-relative pa-0 pt-10">
        <VImg
          height="75"
          width="75"
          class="avatar-center"
          :src="paint_Product"
        />
        
        <VCardItem class="px-3 pb-0 pt-3">
          <VCardTitle>{{ title }}</VCardTitle>
        </VCardItem>

        <VCardText class="text-subtitle-4 px-3 pb-2">
          <span class="font-weight-bold">{{ price }}</span> Dzd
        </VCardText>

        <VCardText class="px-3 pb-2">
          {{ description }}
        </VCardText>

        <VCardActions class="justify-space-between px-3">
          <div>
            <VChip v-for="value in finishing" :key="value" class="mr-1 mb-1" size="x-small">{{ value }}</VChip>
          </div>
          <IconBtn
            color="secondary"
            icon="tabler-heart"
            @click.stop="()=> {console.log('asfdds')}"
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
