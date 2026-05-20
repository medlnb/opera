<script setup>
import { useApi } from '@/composables/useApi'
import bgBuildings from '@images/buildings.png'
import bgCoating from '@images/coatings.png'
import color_studio from "@images/color_studio.png"
import bgDecor from '@images/decor.png'
import logo from '@images/logo-v2.svg'
import roomImg1 from '@images/room/room1.png'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import { Navigation } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/vue'
import { useI18n } from 'vue-i18n'


const { t, te } = useI18n({ useScope: 'global' })
const config = useRuntimeConfig()
const heroColorsLoading = ref(false)
const heroColors = ref([])

async function fetchHeroColors() {
  try {
    heroColorsLoading.value = true
    const { data, error } = await useApi('/api/products/colors', {
      method: 'GET',
      query: { trend: 'true' },
    })

    if (error.value)
      throw error.value

    const list = data.value?.colors ?? []
    const normalized = Array.isArray(list) ? list : []

    heroColors.value = normalized
      .filter(c => c && c.code)
      .slice(0, 8)
  }
  catch {
    heroColors.value = []
  }
  finally {
    // heroColorsLoading.value = false
  }
}

const productTypes = [
  { type: 'decor', img: bgDecor },
  { type: 'buildings', img: bgBuildings },
  { type: 'coating', img: bgCoating },
]

function productTypeLabel(type) {
  const key = `nav.products.${type}`

  return te(key) ? t(key) : String(type)
}

// Homepage catalog (PDF)
const homepageCatalogLoading = ref(false)
const homepageCatalog = ref(null)

const homepageCatalogHref = computed(() => {
  const url = homepageCatalog.value?.url

  if (!url)
    return undefined

  if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:'))
    return url

  const base = config.public?.apiBaseUrl

  if (!base)
    return url

  try {
    return new URL(url, base).toString()
  }
  catch {
    return url
  }
})

async function fetchHomepageCatalog() {
  try {
    homepageCatalogLoading.value = true

    const { data, error } = await useApi('/api/homepage/catalog', {
      method: 'GET',
    })

    if (error.value)
      throw error.value

    homepageCatalog.value = data.value?.data ?? null
  }
  catch {
    homepageCatalog.value = null
  }
  finally {
    homepageCatalogLoading.value = false
  }
}

onMounted(() => {
  fetchHeroColors()
  fetchHomepageCatalog()
})
</script>

<template>
  <div class="home-page">
    <!-- Hero Section -->
    <VCard class="hero-section overflow-hidden position-relative" rounded="0">
      <v-carousel hide-delimiter-background cycle hide-delimiters>
        <template v-slot:prev="{ props }">
          <VIcon
            @click="props.onClick"
            style="color: black;"
            icon="tabler-chevron-left"
            size="30"
          />
        </template>

        <template v-slot:next="{ props }">
          <VIcon
            @click="props.onClick"
            style="color: black;"
            icon="tabler-chevron-right"
            size="30"
          />
        </template>
        
        <v-carousel-item
          src="https://cdn.vuetifyjs.com/images/cards/docks.jpg"
          cover
        ></v-carousel-item>

        <v-carousel-item
          src="https://cdn.vuetifyjs.com/images/cards/hotel.jpg"
          cover
        ></v-carousel-item>
      </v-carousel>

      <div
        class="banner--buttons d-flex gap-4"
      >
        <VBtn class="btn" to="/colors" color="grey-darken-2">
          {{ t("home.moreColors") }}
        </VBtn>
        <VBtn class="btn" to="/colors" color="grey-darken-2">
          {{ t("home.findProducts") }}
        </VBtn>        
      </div>
    </VCard>

    <VContainer class="home-content px-0">
      <!-- Product Types Section -->
      <section class="home-section pt-6">
        <VRow class="py-0">
          <VCol
            v-for="item in productTypes"
            :key="item.type"
            cols="12"
            sm="4"
          >
            <VCard
              hover
              rounded="0"
              class="shadow-none"
              :to="{ name: 'products-type', params: { type: item.type } }"
            >
              <VImg
                :src="item.img"
                height="170"
                cover
                lazy-src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E"
                class="type-card-media"
              />
              <VCardText class="d-flex align-center gap-4 py-2">
                <div class="text-subtitle-1 font-weight-medium text-white">
                  {{ productTypeLabel(item.type) }}
                </div>

                <VSpacer />
                <VIcon
                  icon="tabler-arrow-right"
                />
              </VCardText>
            </VCard>
          </VCol>
        </VRow>
      </section>

      <!-- Colors Preview Section -->
      <section class="home-section mt-0 px-0 py-6">

        <h2 class="py-3">{{ t("home.trendColorsThisYear") }}</h2>
        <VBtn class="btn mb-8" to="/colors" color="grey-darken-2">
          {{ t("home.seeMore") }}
        </VBtn>
        <VCard
          class="colors-showcase bg-background"
          flat
        >
          <VCardText class="pa-0 mt-0">
            <VSlideGroup show-arrows>
              <VSlideGroupItem
                v-for="(c, i) in heroColors"
                :key="i"
              >
                <VCard
                  hover
                  flat
                  class="ma-2 ml-0"
                  to="/colors"
                  rounded="0"
                >
                  <div
                    class="color-tile__swatch"
                    :style="{ backgroundColor: `#${c.code}`, height: '200px', width: '200px' }"
                  >
                  </div>
                </VCard>
              </VSlideGroupItem>
            </VSlideGroup>
          </VCardText>
        </VCard>
      </section>

      <!-- Opera Peinture Banner -->
      <section class="opera-banner">
        <VCard flat rounded="0" class="opera-banner__card">
          <VCardText class="opera-banner__inner pa-0">

            <!-- Left: Tagline -->
            <div class="opera-banner__left">
              <p class="opera-banner__tagline">
                {{ t("home.bannerDesc1") }}<br>{{ t("home.bannerDesc2") }}
              </p>
            </div>

            <!-- Center: Logo Image + Headline -->
            <div class="opera-banner__center">
              <img alt="Opéra Peinture" :src="logo" class="opera-banner__logo" />
              <h2 class="opera-banner__headline">{{ t("home.yearColor") }}</h2>
            </div>

            <!-- Right: CTA Button -->
            <div class="opera-banner__right">
              <VBtn
                to="/colors/moon-and-stars"
                variant="flat"
                rounded="sm"
                class="opera-banner__cta"
              >
                {{ t("home.moonStars") }}
              </VBtn>
            </div>

          </VCardText>
        </VCard>
      </section>

      <!-- STUDIO SECTION -->
      <VContainer class="py-6 pa-0 studio-section">
        <VRow no-gutters>

          <!-- LEFT -->
          <VCol cols="12" md="6" class="left-side pa-8 d-flex flex-column justify-center align-center text-center">
            <img
              :src="color_studio"
              alt="color_studio"
              max-width="10"
              class="mb-6"
              style="width: 330px;"
            />

            <p class="slogan">
              {{ t("studioColorAlt") }}
            </p>
          </VCol>

          <!-- RIGHT -->
          <VCol cols="12" md="6" class="right-side pa-10 d-flex flex-column justify-center">
            <h2 class="title mb-4">{{t("home.studioColorTitle")}}</h2>

            <p class="text mb-6">{{t("home.studioColorDesc")}}</p>

            <VBtn class="btn" color="grey-darken-2" to="/room-painter">
              {{t("home.see")}}
            </VBtn>
          </VCol>

        </VRow>
      </VContainer>

      <!--CATALOG SECTION-->
      <VContainer class="py-6 catalog-section">
        <VRow align="stretch">

          <!-- LEFT -->
          <VCol cols="12" md="6" class="left-side d-flex flex-column justify-center pa-8">
            <h2 class="title mb-4">{{t("home.catTitle")}}</h2>

            <p class="text mb-6">
              {{t("home.catDesc")}}
            </p>

            <VBtn 
              class="cta-btn" color="grey-darken-2"                
              :href="homepageCatalogHref"
              target="_blank"
              rel="noopener noreferrer"
              :loading="homepageCatalogLoading"
              :disabled="!homepageCatalog?.url"
            >
            {{t("home.catBtn")}}
              
            </VBtn>
          </VCol>

          <!-- RIGHT -->
          <VCol cols="12" md="6" class="right-side pa-8 d-flex align-center justify-center">

            <div class="right-card">
              <div class="card-header">
                {{t("home.catProTitle")}}
              </div>

              <div class="card-body">
                <ul>
                  <li>{{t("home.catPro1")}}</li>
                  <li>{{t("home.catPro2")}}</li>
                  <li>{{t("home.catPro3")}}</li>
                  <li>{{t("home.catPro4")}}</li>
                </ul>
              </div>
            </div>

          </VCol>

        </VRow>
      </VContainer>

      <VDivider class="my-4 mb-7" :thickness="6" style="opacity: 100;"/>

      <div class="position-relative px-8">
        <VIcon
          icon="tabler-chevron-left" 
          class="swiper-prev position-absolute"
          style="top: 50%; left: 0; color: black; cursor: pointer;"
        />

        <Swiper
          :modules="[Navigation]"
          :space-between="20"
          :navigation="{
            prevEl: '.swiper-prev',
            nextEl: '.swiper-next',
          }"
          class="mySwiper w-1/2"
          :breakpoints="{
            0: {
              slidesPerView: 1,
            },
            768: {
              slidesPerView: 2,
            },
            1200: {
              slidesPerView: 3,
            },
          }"
        >
          <SwiperSlide v-for="n in 5" :key="n">
            <VCard flat rounded="0">
              <img :src="roomImg1" height="250"/>
              <p class="text-center">Peinture petite chambre : comment agrandir une pièce avec de la peinture</p>
            </VCard>
          </SwiperSlide>
        </Swiper>

        <VIcon
          icon="tabler-chevron-right" 
          class="swiper-next position-absolute"
          style="top: 50%; right: 0; color: black; cursor: pointer;"
        />
      </div>
    </VContainer>
  </div>
</template>

<style scoped>
.banner--buttons {
  position: absolute;
  bottom: 30px;
  z-index: 999;
  left: 20%;
}

.hero-section {
  transform: translateY(-25px);
  margin-inline: calc(50% - 50vw);
}

.opera-banner {
  background: linear-gradient(to right, #b4b4aa, #c6c6bb);
}

.opera-banner__card {
  background: transparent !important;
}

.opera-banner__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 36px !important;
  min-height: 88px;
}

.opera-banner__tagline {
  font-family: 'Georgia', serif;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.5;
  color: #2c2c2c;
  margin: 0;
}

.opera-banner__center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.opera-banner__logo {
  height: 70px;
  width: auto;
  object-fit: contain;
}

.opera-banner__headline {
  font-family: 'Georgia', 'Times New Roman', serif;
  font-size: 28px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
  letter-spacing: 0.3px;
}

.opera-banner__cta {
  background-color: #3a3a3a !important;
  color: #ffffff !important;
  font-family: 'Gill Sans', Calibri, sans-serif;
  font-size: 12px;
  letter-spacing: 0.3px;
  text-transform: none;
  padding: 0 18px;
  height: 36px;
}

/* ── Tablet (≤ 768px) ── */
@media (max-width: 768px) {
  .hero-section {
    transform: translateY(0);
  }

  .banner--buttons {
    position: absolute;
    bottom: 30px;
    z-index: 999;
    left: 0;
    justify-content: center;
    width: 100%;
  }

  .opera-banner__inner {
    padding: 14px 20px !important;
    gap: 8px;
  }

  .opera-banner__tagline {
    font-size: 12px;
  }

  .opera-banner__headline {
    font-size: 17px;
  }

  .opera-banner__logo {
    height: 32px;
  }

  .opera-banner__cta {
    font-size: 11px;
    padding: 0 12px;
    height: 32px;
  }
}

/* ── Mobile (≤ 540px) ── */
@media (max-width: 540px) {
  .opera-banner__inner {
    flex-direction: column;
    align-items: center;
    padding: 16px 16px !important;
    gap: 10px;
  }

  /* Hide tagline on small screens to keep it clean */
  .opera-banner__left {
    display: none;
  }

  .opera-banner__center {
    gap: 4px;
  }

  .opera-banner__logo {
    height: 36px;
  }

  .opera-banner__headline {
    font-size: 16px;
    letter-spacing: 0;
  }

  .opera-banner__cta {
    width: 100%;
    font-size: 12px;
    height: 38px;
  }
}

/* =========================
   GLOBAL TEXT STYLES
========================= */

.title {
  font-size: 22px;
  font-weight: 700;
}

.text {
  font-size: 14px;
  line-height: 1.6;
  max-width: 500px;
}

.btn,
.cta-btn {
  width: fit-content;
  border-radius: 6px;
}

/* =========================
   STUDIO SECTION (gray / light gray)
========================= */

.studio-section .left-side {
  background: #6b6c6f;
  color: white;
  min-height: 280px;
}

.studio-section .right-side {
  background: #bfc1c3;
  color: #111;
  min-height: 280px;
}

.slogan {
  font-size: 16px;
  font-weight: 500;
  max-width: 300px;
}

/* =========================
   CATALOG SECTION (OPPOSITE)
========================= */

.catalog-section .left-side {
  background: #bfc1c3;
  color: #111;
  min-height: 280px;
}

.catalog-section .right-side {
  background: #6b6c6f;
  color: white;
  min-height: 280px;
}

/* =========================
   RIGHT CARD
========================= */

.right-card {
  background: #2f4aa0;
  color: white;
  border-top-left-radius: 20px;
  border-bottom-right-radius: 20px;
  width: 320px;
  overflow: hidden;
}

.card-header {
  background: #19a7ff;
  padding: 12px;
  font-weight: 600;
}

.card-body {
  padding: 12px;
  font-size: 13px;
}

.card-body ul {
  padding-left: 16px;
  margin: 0;
}

.card-body li {
  margin-bottom: 6px;
}

/* =========================
   RESPONSIVE
========================= */

@media (max-width: 960px) {
  .left-side,
  .right-side {
    text-align: center;
  }

  .right-card {
    width: 100%;
  }
}

</style>
