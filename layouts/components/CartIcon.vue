<script setup>
import { useAuthStore } from '@/stores/auth.js'
import { useCartStore } from '@/stores/cart'
import { computed, onMounted, ref, watch } from 'vue'

const authStore = useAuthStore()
const cartStore = useCartStore()

onMounted(async () => {
  if(!authStore.token) return 
  await cartStore.fetchCart()
})

const hasItems = computed(() => cartStore.items.length > 0)

const prevLength = ref(0)
const addedAnimation = ref(false)
const showParticle = ref(false)
const particleStyle = ref({})

const cartBtnRef = ref(null)

function launchParticle() {
  const el = cartBtnRef.value?.$el ?? cartBtnRef.value
  if (!el) return

  const rect = el.getBoundingClientRect()

  // Exact center of the cart icon
  const targetX = rect.left + rect.width / 2
  const targetY = rect.top + rect.height / 2

  // Particle starts at bottom of viewport (fixed bottom: 0 = y is window.innerHeight)
  const startY = window.innerHeight * 0.2 // 15vh from bottom = 85% down
  
  // How many px to move UP to reach the icon
  const travelDistance = startY - targetY

  particleStyle.value = {
    left: `${targetX - 6}px`,   // -6 to center the 12px dot
    top: `${startY}px`,          // start position from top
    '--travel-y': `-${travelDistance}px`,
  }

  showParticle.value = true
  setTimeout(() => { showParticle.value = false }, 800)
}

watch(
  () => cartStore.items.length,
  (newVal, oldVal) => {
    if (newVal > oldVal) {
      launchParticle()

      setTimeout(() => {
        addedAnimation.value = true
        setTimeout(() => {
          addedAnimation.value = false
        }, 500)
      }, 650)
    }

    prevLength.value = newVal
  }
)
</script>

<template>
  <VBadge
    v-if="authStore.token"
    :model-value="hasItems"
    dot
    location="bottom right"
    offset-x="3"
    offset-y="3"
    bordered
    color="success"
  >
    <VBtn
      ref="cartBtnRef"
      variant="plain"
      class="mx-0 px-0"
      icon="tabler-shopping-cart"
      to="/account/cart"
      :class="{
        shake: hasItems && !addedAnimation,
        pop: addedAnimation
      }"
    />

    <Teleport to="body">
      <div
        v-if="showParticle"
        class="cart-particle"
        :style="particleStyle"
      />
    </Teleport>
  </VBadge>
</template>

<style scoped>
@keyframes shake {
  0%, 80%, 100% { transform: rotate(0deg); }
  82% { transform: rotate(10deg); }
  84% { transform: rotate(-10deg); }
  86% { transform: rotate(6deg); }
  88% { transform: rotate(-6deg); }
  90% { transform: rotate(0deg); }
}

.shake {
  animation: shake 4s ease-in-out infinite;
}

@keyframes pop {
  0%   { transform: scale(1); }
  30%  { transform: scale(1.4); }
  60%  { transform: scale(0.85); }
  100% { transform: scale(1); }
}

.pop {
  animation: pop 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97);
}

.cart-particle {
  position: fixed;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #4caf50;
  box-shadow: 0 0 8px rgba(76, 175, 80, 0.9);
  pointer-events: none;
  z-index: 9999;
  animation: fly-to-cart 0.7s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes fly-to-cart {
  0% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
  85% {
    opacity: 1;
  }
  100% {
    transform: translateY(var(--travel-y)) scale(0.1);
    opacity: 0;
  }
}
</style>
