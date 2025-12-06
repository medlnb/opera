<script lang="ts" setup>
import ProductCard from '@/components/ProductCard.vue';
import { useRoute } from 'vue-router';

const paint_Product = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTchKuqVLIgJp88Df0rnWR9wHsOYQrndt7eRw&s'
const products = [
  {
    id:0,
    imgSrc: paint_Product,
    title: 'Apple iPhone 11 Pro',
    description: 'Apple iPhone 11 Pro smartphone. Announced Sep 2019. Features 5.8″ display Apple A13 Bionic',
    price: 899,
    finishing: [
      'Matt',
      'Silk',
      'Gloss',
      'Semi-Gloss',
      'Satin',
      'Eggshell',
      'Velvet',
      'Pearl',
      'Metallic',
      'Textured',
      'High-Gloss',
      'Flat'
    ]
  },
  {
    id:1,
    imgSrc: paint_Product,
    title: 'Samsung Galaxy S21',
    description: 'Samsung Galaxy S21 smartphone. Announced Jan 2021. Features 6.2″ display Exynos 2100',
    price: 799,
    finishing: [
      'Matt',
      'Silk',
      'Gloss',
      'Semi-Gloss',
      'Satin',
      'Eggshell',
      'Velvet',
      'Pearl',
      'Metallic',
      'Textured',
      'High-Gloss',
      'Flat'
    ]
  },
  {
    id:2,
    imgSrc: paint_Product,
    title: 'Google Pixel 6',
    description: 'Google Pixel 6 smartphone. Announced Oct 2021. Features 6.4″ display Google Tensor',
    price: 699,
    finishing: [
      'Matt',
      'Silk',
      'Gloss',
      'Semi-Gloss',
      'Satin',
      'Eggshell',
      'Velvet',
      'Pearl',
      'Metallic',
      'Textured',
      'High-Gloss',
      'Flat'
    ]
  }
]

const { query } = useRoute()
const type = query.type ?? "interior"
// navigation
const page = 1
const totalProduct = 10
const itemsPerPage = 3
</script>

<template>
  <div>
    <VCard class="mb-6 pa-4">
      <template #title>
        <div class="d-flex align-center justify-space-between">
          <VCardTitle>
            {{ type }} Interior Wall Paint
          </VCardTitle>
          <VBtn append-icon="tabler-filter" variant="text">Filters</VBtn>
        </div>
      </template>
      <VRow>
        <ProductCard
          v-for="(product, index) in products"
          :key="index"
          :img-src="product.imgSrc"
          :title="product.title"
          :description="product.description"
          :price="product.price"
          :finishing="product.finishing"
        />
      </VRow>

      <div class="d-flex justify-end px-5 pt-3">
        <VPagination
          v-model="page"
          :length="Math.min(Math.ceil(totalProduct / itemsPerPage), 5)"
          :total-visible="$vuetify.display.xs ? 1 : Math.min(Math.ceil(totalProduct / itemsPerPage), 5)"
        />
      </div>
    </VCard>
  </div>
</template>
