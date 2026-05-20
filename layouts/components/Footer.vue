<script setup lang="ts">
import logoV2 from '@images/logo-v2.svg';
import { useI18n } from 'vue-i18n';

const { t } = useI18n({ useScope: 'global' })

const year = new Date().getFullYear()
</script>

<template>
  <VFooter class="app-footer">
    <div class="app-footer__top">
      <VContainer
        fluid
        class="px-6 px-md-16"
      >
        <VRow
          class="text-on-surface"
          :dense="$vuetify.display.smAndDown"
        >
          <!-- Brand -->
          <VCol
            cols="12"
            md="4"
            class="pe-md-10"
          >
            <div class="d-flex align-center mb-4">
              <VImg
                :src="logoV2"
                height="44"
                width="140"
                contain
              />
            </div>
            <p class="text-body-2 text-on-surface-70 mb-0">
              {{ t('footer.about') }}
            </p>
          </VCol>

          <!-- Links -->
          <VCol
            cols="12"
            sm="6"
            md="3"
          >
            <div class="text-subtitle-1 font-weight-bold mb-4">
              {{ t('footer.columns.brand') }}
            </div>

            <div class="d-flex flex-column gap-2">
              <NuxtLink
                class="app-footer__link"
                to="/contact"
              >
                {{ t('nav.contact') }}
              </NuxtLink>
              <NuxtLink
                class="app-footer__link"
                to="/contact"
              >
                {{ t('footer.links.find_store') }}
              </NuxtLink>
              <NuxtLink
                class="app-footer__link"
                to="/products/decor"
              >
                {{ t('footer.links.find_product') }}
              </NuxtLink>
            </div>
          </VCol>

          <!-- Tools -->
          <VCol
            cols="12"
            sm="6"
            md="3"
          >
            <div class="text-subtitle-1 font-weight-bold mb-4">
              {{ t('footer.columns.tools') }}
            </div>

            <div class="d-flex flex-column gap-2">
              <NuxtLink
                class="app-footer__link"
                to="/room-painter"
              >
                {{ t('footer.links.color_studio') }}
              </NuxtLink>
            </div>

            <div class="mt-5 d-flex align-center gap-3">
              <VIcon
                icon="tabler-brush"
                class="text-on-surface"
              />
              <div class="text-body-2 text-on-surface-70">
                Studio Color
              </div>
            </div>
          </VCol>

          <!-- Social -->
          <VCol
            cols="12"
            md="2"
          >
            <div class="text-subtitle-1 font-weight-bold mb-4">
              {{ t('footer.columns.follow') }}
            </div>

            <div class="d-flex align-center gap-2">
              <VBtn
                icon
                variant="text"
                class="app-footer__icon-btn"
                href="https://www.facebook.com/operapeintureofficiel"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
              >
                <VIcon icon="tabler-brand-facebook" />
              </VBtn>

              <VBtn
                icon
                variant="text"
                class="app-footer__icon-btn"
                href="https://www.instagram.com/opera.peinture.hbb/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
              >
                <VIcon icon="tabler-brand-instagram" />
              </VBtn>

              <VBtn
                icon
                variant="text"
                class="app-footer__icon-btn"
                href="https://www.youtube.com/@operapeinture3399"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
              >
                <VIcon icon="tabler-brand-youtube" />
              </VBtn>
            </div>
          </VCol>
        </VRow>
      </VContainer>
    </div>

    <VDivider class="app-footer__divider" />

    <div class="app-footer__bottom">
      <VContainer
        fluid
        class="py-4 px-6 px-md-16"
      >
        <div class="d-flex flex-wrap align-center justify-space-between gap-2 text-on-surface-70">
          <div class="text-caption">
            &copy; {{ year }} Opera Peinture
          </div>
          <div class="text-caption">
            {{ t('footer.rights') }}
          </div>
        </div>
      </VContainer>
    </div>
  </VFooter>
</template>

<style scoped>
.app-footer {
  inline-size: 100%;
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.app-footer__top,
.app-footer__bottom {
  inline-size: 100%;
}

.app-footer__top {
  padding-block: 100px;
}

.zapp-footer__divider {
  opacity: 0.25;
  inline-size: 100%;
}

.text-on-surface {
  color: rgb(var(--v-theme-on-surface));
}

.text-on-surface-70 {
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.app-footer__link {
  color: rgba(var(--v-theme-on-surface), 0.7);
  text-decoration: none;
}

.app-footer__link:hover {
  color: rgb(var(--v-theme-on-surface));
}

.app-footer__icon-btn {
  color: rgb(var(--v-theme-on-surface));
}
</style>
