<script setup>



</script>

<template>
  <div>
    <VTextField v-model="phone" prepend-inner-icon="" placeholder="+12135551212" >
      <template #prepend-inner>Phone Number</template>
    </VTextField>
    <VBtn @click="sendCode" :disabled="!recaptchaVerifier">Send code</VBtn>

    <div v-if="showCode">
      <input v-model="code" placeholder="6-digit code" />
      <VBtn @click="verifyCode">Verify</VBtn>
    </div>


  </div>
</template>


