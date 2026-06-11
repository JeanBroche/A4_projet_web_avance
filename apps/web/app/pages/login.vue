<script setup lang="ts">
definePageMeta({ layout: false })

const error = ref('')
</script>

<template>
  <div class="relative min-h-screen overflow-hidden flex items-center justify-center bg-[#FFFFFF]">
    <div class="absolute w-[600px] h-[600px] -top-40 -left-20 bg-[#0F62BC]/40 rounded-full blur-[100px] animate-blob-1"></div>
    <div class="absolute w-[500px] h-[500px] bottom-10 left-1/3 bg-[#156FD4]/30 rounded-full blur-[90px] animate-blob-2"></div>
    <div class="absolute w-[450px] h-[450px] -bottom-20 -right-20 bg-[#F57C00]/30 rounded-full blur-[100px] animate-blob-3"></div>

    <div class="z-10 w-full max-w-md p-8 bg-[#D8DDE3]/20 backdrop-blur-xl border border-[#9AA4B2]/30 rounded-2xl shadow-xl shadow-[#0F62BC]/5">
      
      <h2 class="text-2xl font-bold text-[#0F62BC] text-center mb-6">Connexion</h2>

      <UForm class="space-y-4">
        <UFormField label="Email" name="email">
          <UInput type="text" placeholder="admin@test.com" class="w-full" :ui="{ base: 'focus:ring-[#F57C00] focus-within:ring-[#F57C00]' }" />
        </UFormField>

        <UFormField label="Mot de passe" name="password">
          <UInput type="password" placeholder="••••••••" class="w-full" />
        </UFormField>

        <p v-if="error" class="text-red-500 text-sm text-center">{{ error }}</p>

        <UButton
          type="submit"
          class="!bg-[#F57C00] hover:!bg-[#F57C00]/90 text-white font-medium transition-colors w-full flex justify-center"
        >
          Continuer
        </UButton>
      </UForm>

    </div>
  </div>
</template>

<style scoped>
@keyframes blob-1 {
  0%, 100% { transform: scale(1) translate(0px, 0px); opacity: 0.4; }
  33%       { transform: scale(1.15) translate(30px, -20px); opacity: 0.7; }
  66%       { transform: scale(0.9) translate(-20px, 15px); opacity: 0.5; }
}
@keyframes blob-2 {
  0%, 100% { transform: scale(1) translate(0px, 0px); opacity: 0.3; }
  33%       { transform: scale(0.9) translate(-25px, 20px); opacity: 0.6; }
  66%       { transform: scale(1.1) translate(20px, -15px); opacity: 0.45; }
}
@keyframes blob-3 {
  0%, 100% { transform: scale(1) translate(0px, 0px); opacity: 0.3; }
  33%       { transform: scale(1.1) translate(-20px, -25px); opacity: 0.65; }
  66%       { transform: scale(0.95) translate(25px, 10px); opacity: 0.4; }
}
.animate-blob-1 { animation: blob-1 8s ease-in-out infinite; }
.animate-blob-2 { animation: blob-2 10s ease-in-out infinite; }
.animate-blob-3 { animation: blob-3 9s ease-in-out infinite; }
</style>