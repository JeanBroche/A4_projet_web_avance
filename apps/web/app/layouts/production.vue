<template>
  <div class="min-h-full flex flex-col">
    <header class="border-b border-default px-4 py-3">
      <p class="text-sm font-semibold">
        Espace Production
      </p>
      <p class="text-xs text-muted mt-0.5">
        Ordres de fabrication, machines, suivi d'avancement
      </p>
    </header>

    <main class="flex-1 p-4">
      <slot />
    </main>
  </div>
</template>
