<script setup>
import { useRoute } from "vue-router";

const { query } = useRoute()
const productDetails = ref()
const panelStatus = ref()
const order = ref({
  variance: null,
  color: null
});

onMounted( async () => {
  const res = await fetch(`http://localhost:8888/api/products/${query.id}`)
  const data = await res.json()
  console.log({...data.data})
  productDetails.value = {...productDetails.value ,...data.data}
})

function selectColor(i) {
  order.value.color = order.value.color === i ? null : i
}

function selectVariance(i) {
  order.value.variance = order.value.variance === i ? null : i
}

const handleOrder = () => {
  if(order.value.variance == null) 
    return panelStatus.value = 1
  else if (productDetails.value.colors.length != 0 && order.value.color == null)
    return panelStatus.value = 0

  order.value.variance = null
  order.value.color = null
  panelStatus.value = undefined
} 

</script>

<template>
  <VCard class="overflow-visible course-details">
    <VCardText>
      <VCardItem class="pa-0 mb-2">
        <VCardTitle class="mb-2">
          {{ productDetails?.title }}
        </VCardTitle>
        <template #append>
          <div class="d-flex gap-2 align-center">
            <VChip
              variant="tonal"
              color="info"
              label
            >
              {{ productDetails?.type }}
            </VChip>
            <IconBtn>
              <VIcon
                icon="tabler-heart"
                size="26"
              />
            </IconBtn>
          </div>
        </template>
      </VCardItem>

      <VCard
        flat
      >
        <div class="pt-2">
          <VRow>
            <VCol cols="12" md="8">
              <VImg
                v-if="productDetails"
                :src="`http://localhost:8888/api/image?id=${productDetails.imageUrl}`"
                height="400"
                class="w-100 rounded"
                cover
              >
                <template #placeholder>
                  <div
                    class="d-flex align-center justify-center"
                    style="height: 400px; background-color: #f0f0f0;"
                  >
                    <v-progress-circular indeterminate color="primary"></v-progress-circular>
                  </div>
                </template>
              </VImg>
            </VCol>
            <VCol
              cols="12"
              md="4"
            >
              <div class="course-content">
                <VExpansionPanels
                  v-model="panelStatus"
                  variant="accordion"
                  class="expansion-panels-width-border"
                >
                  <VExpansionPanel
                    v-if="productDetails?.colors.length"
                    elevation="0"
                    :value="0"
                  >
                    <template #title>
                      <div>
                        <h5 class="text-h5 mb-1">
                          Colors
                        </h5>
                        <div class="d-flex flex-wrap gap-1" v-if="productDetails && order.color != null">
                          <VChip size="x-small">{{ productDetails.colors[order.color].name }}</VChip>
                        </div>
                      </div>
                    </template>
                    <template #text>
                      <VList class="card-list px-2">
                        <VListItem
                          v-for="(color, index) in productDetails?.colors ?? []"
                          :key="index"
                          class="py-4"
                        >
                          <template #prepend>
                            <VCheckbox
                              class="me-3"
                              :model-value="index == order.color"
                              @update:model-value="() => selectColor(index)"
                            />
                          </template>
                          <VListItemTitle class="d-flex align-center gap-2">
                            {{ color.name }}
                            <div
                              class="inline-block"
                              :style="`width: 40px; height: 20px; background-color: ${color.code}; border-radius: 4px; margin-right: 8px;`"
                            />
                          </VListItemTitle>
                        </VListItem>
                      </VList>
                    </template>
                  </VExpansionPanel>
                  <VExpansionPanel
                    elevation="0"
                    :value="1"
                  >
                    <template #title>
                      <div>
                        <h5 class="text-h5 mb-1">
                          Size & Quantity
                        </h5>
                        <div class="d-flex flex-wrap gap-1" v-if="productDetails && order.variance != null">
                          <VChip size="x-small">{{ productDetails.variances[order.variance].quantity }}</VChip>
                        </div>
                      </div>
                    </template>
                    <template #text>
                      <VList class="card-list px-2">
                        <VListItem
                          v-for="(variance, index) in productDetails?.variances"
                          :key="index"
                          class="py-4"
                        >
                          <template #prepend>
                            <VCheckbox
                              class="me-3"
                              :model-value="order.variance == index"
                              @update:model-value="() => selectVariance(index)"
                            />
                          </template>
                          <VListItemTitle class="text-high-emphasis font-weight-medium mb-1">
                            {{ variance.quantity }}
                          </VListItemTitle>
                          <VListItemSubtitle>
                            <span class="text-disabled text-base">{{ variance.price }} Dzd</span>
                          </VListItemSubtitle>
                        </VListItem>
                      </VList>
                    </template>
                  </VExpansionPanel>
                </VExpansionPanels>
                <VBtn 
                  class="w-100 mt-2" 
                  @click="handleOrder"
                >
                  Submit Order
                </VBtn>
              </div>
            </VCol>
          </VRow>
        </div>
        <VCardText class="px-0">
          <h5 class="text-h5 mb-3">
            About this product
          </h5>
          <p class="text-body-1">
            {{ productDetails?.definition }}
          </p>
          <VDivider class="my-6" />
          <h5 class="text-h5 mb-3">
            By the numbers
          </h5>
          <div class="d-flex gap-x-12 gap-y-5 flex-wrap">
            <div>
              <VList class="card-list">
                <VListItem>
                  <template #prepend>
                    <VIcon icon="tabler-checks" />
                  </template>
                  <VListItemTitle class="text-body-1">
                    Skill Level: {{ productDetails?.skillLevel }}
                  </VListItemTitle>
                </VListItem>
                <VListItem>
                  <template #prepend>
                    <VIcon icon="tabler-user" />
                  </template>
                  <VListItemTitle class="text-body-1">
                    Students: {{ productDetails?.totalStudents }}
                  </VListItemTitle>
                </VListItem>
                <VListItem>
                  <template #prepend>
                    <VIcon icon="tabler-flag" />
                  </template>
                  <VListItemTitle class="text-body-1">
                    Languages: {{ productDetails?.language }}
                  </VListItemTitle>
                </VListItem>
                <VListItem>
                  <template #prepend>
                    <VIcon icon="tabler-file-text" />
                  </template>
                  <VListItemTitle class="text-body-1">
                    Captions: {{ productDetails?.isCaptions }}
                  </VListItemTitle>
                </VListItem>
              </VList>
            </div>
            <div>
              <VList class="card-list">
                <VListItem>
                  <template #prepend>
                    <VIcon icon="tabler-pencil" />
                  </template>
                  <VListItemTitle class="text-body-1">
                    Lectures: {{ productDetails?.totalLectures }}
                  </VListItemTitle>
                </VListItem>
                <VListItem>
                  <template #prepend>
                    <VIcon icon="tabler-clock" />
                  </template>
                  <VListItemTitle class="text-body-1">
                    Video: {{ productDetails?.length }}
                  </VListItemTitle>
                </VListItem>
              </VList>
            </div>
          </div>
          <VDivider class="my-6" />
          <h5 class="text-h5 mb-3">
            Product specification
          </h5>
          
          <VDivider class="my-6" />
          <h5 class="text-h5 mb-2">
            Instructor
          </h5>
          <div class="d-flex align-center">
            <VAvatar
              :image="productDetails?.instructorAvatar"
              size="38"
              class="me-3"
            />
            <div>
              <div class="text-body-1 font-weight-medium">
                {{ productDetails?.instructor }}
              </div>
              <div class="text-sm text-disabled">
                {{ productDetails?.instructorPosition }}
              </div>
            </div>
          </div>
        </VCardText>
      </VCard>
    </VCardText>
  </VCard>
</template>

<style lang="scss" scoped>
.card-list{
  --v-card-list-gap: 1rem;
}

.course-content{
  position: sticky;
  inset-block-start: 5.25rem;
}
</style>

<style lang="scss">
.v-expansion-panel-text__wrapper{
  padding-block: 0.75rem !important;
  padding-inline: 0.5rem !important;
}

.v-expansion-panel--active{
  .v-expansion-panel-title{
    border-block-end: 1px solid rgba(var(--v-theme-on-surface), 0.12) !important;
  }
}
</style>

<style lang="scss">
body .v-layout .v-application__wrap{
  .course-details{
    .v-expansion-panels {
      .v-expansion-panel-title,
      .v-expansion-panel-title--active,
      .v-expansion-panel-title:hover,
      .v-expansion-panel-title:focus,
      .v-expansion-panel-title:focus-visible,
      .v-expansion-panel-title--active:focus,
      .v-expansion-panel-title--active:hover {
        .v-expansion-panel-title__overlay {
          opacity: 0.04 !important;
        }
      }
    }
  }
}
</style>
