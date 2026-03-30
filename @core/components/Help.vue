<script setup lang="ts">
const openWhatsApp = () => {
  const phoneNumber = "213549773117" // replace with your number
  // const message = encodeURIComponent("Hello, I need help with my order")
  
  // window.open(`https://wa.me/${phoneNumber}?text=${message}`, "_blank")
  window.open(`https://wa.me/${phoneNumber}`, "_blank")
}
</script>

<template>
  <VScaleTransition
    style="transform-origin: center;"
    class="help-chat d-print-none"
  >
    <VBtn
      icon
      density="comfortable"
      color="success"
      @click="openWhatsApp"
      size="large"
    >
      <VIcon
        size="28"
        icon="tabler-brand-whatsapp"
      />
    </VBtn>
  </VScaleTransition>
</template>

<style lang="scss">
.help-chat {
  position: fixed !important;

  z-index: 999;
  inset-block-end: 5%;
  inset-inline-end: 22.5px;
}
</style>
