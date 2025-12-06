<script setup>
import ProductCard from '@/components/ProductCard.vue';
import { useRoute } from 'vue-router';

const products = ref()
const route = useRoute('products-type')

const type = computed({
  get: () => route.params.type,
  set: () => route.params.type,
}) ?? "interior"

// navigation
const pagination = ref({
  page: 1,
  totalProduct: 0,
  itemsPerPage: 10
})

const fetchData = async () =>{
  products.value = undefined
  const res = await fetch(`http://localhost:8888/api/products?p=${pagination.value.page}&perPage=${pagination.value.itemsPerPage}`);
  const data = await res.json();
  products.value = data.data.map(ele=>({...ele, finishing: ele.aspectdifilmsec, description: ele.definition, price: ele.variances[0].price, imgSrc: ele.imageUrl}))
  pagination.value.totalProduct = data.pagination.total
}

onMounted(() => {
  fetchData()
});

watch(()=>[pagination.value.page],()=>{
  fetchData()
})

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
          :_id="product._id"
          :img-src="product.imgSrc"
          :title="product.title"
          :description="product.description"
          :price="product.price"
          :finishing="product.finishing"
        />
      </VRow>

      <div class="d-flex justify-end px-5 pt-3">
        <VPagination
          v-model="pagination.page"
          :length="Math.min(Math.ceil(pagination.totalProduct / pagination.itemsPerPage), 5)"
          :total-visible="$vuetify.display.xs ? 1 : Math.min(Math.ceil(pagination.totalProduct / pagination.itemsPerPage), 5)"
        />
      </div>
    </VCard>
  </div>
</template>
