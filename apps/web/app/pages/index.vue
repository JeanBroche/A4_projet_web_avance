<script setup lang="ts">
import { getDefaultRouteForRole } from '~/lib/roles'
import { firstZodError, loginSchema } from '~/lib/validation/schemas'

definePageMeta({ layout: false })

const { login, isLoading, error: authError } = useAuth()

const config = useRuntimeConfig()
const email = ref('operateur@aeronexis.local')
const password = ref('')
const isGatewayMode = computed(() => config.public.apiAdapter === 'moleculer')
const validationError = ref<string | null>(null)
const error = computed(() => validationError.value ?? authError.value)

async function onSubmit() {
  validationError.value = null
  const parsed = loginSchema.safeParse({ email: email.value, password: password.value })
  if (!parsed.success) {
    validationError.value = firstZodError(parsed.error)
    return
  }
  try {
    const result = await login(parsed.data)
    await navigateTo(getDefaultRouteForRole(result.user.role))
  } catch {
    // error handled by useAuth
  }
}
</script>

<template>
  <div class="relative min-h-dvh overflow-hidden flex items-center justify-center bg-aeronexis-background px-4 py-6 sm:px-6">
    <div class="absolute w-[min(600px,120vw)] h-[min(600px,120vw)] -top-40 -left-20 bg-primary/40 rounded-full blur-[100px] animate-blob-1" />
    <div class="absolute w-[min(500px,100vw)] h-[min(500px,100vw)] bottom-10 left-1/3 bg-secondary/30 rounded-full blur-[90px] animate-blob-2" />
    <div class="absolute w-[min(450px,90vw)] h-[min(450px,90vw)] -bottom-20 -right-20 bg-warning/30 rounded-full blur-[100px] animate-blob-3" />

    <div class="z-10 w-full max-w-md p-6 sm:p-8 bg-neutral-200/20 backdrop-blur-xl border border-neutral-500/30 rounded-2xl shadow-xl shadow-primary/5">
      <div class="flex justify-center mb-6">
        <AppLogo class="h-12 sm:h-16 w-auto max-w-full" />
      </div>

      <h1 id="login-title" class="text-xl sm:text-2xl font-bold text-primary text-center mb-6">
        Connexion
      </h1>

      <UForm class="space-y-4" aria-labelledby="login-title" @submit.prevent="onSubmit">
        <UFormField label="Email" name="email">
          <UInput v-model="email" type="email" placeholder="operateur@aeronexis.local" class="w-full" />
        </UFormField>

        <UFormField label="Mot de passe" name="password">
          <UInput v-model="password" type="password" placeholder="••••••••" class="w-full" />
        </UFormField>

        <p v-if="error" class="text-red-500 text-sm text-center">
          {{ error }}
        </p>

        <UButton
          type="submit"
          color="warning"
          class="w-full flex justify-center font-medium"
          :loading="isLoading"
        >
          Continuer
        </UButton>
      </UForm>

      <p class="text-xs text-gray-400 text-center mt-4">
        <template v-if="isGatewayMode">
          Gateway : comptes seed ([role]@aeronexis.local) — mot de passe <code>SEED_ADMIN_PASSWORD</code>
        </template>
        <template v-else>
          Mode mock : mot de passe <code>[role]123</code> (ex. operateur123)
        </template>
      </p>
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
