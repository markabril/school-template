<template>
  <div>
    <!-- Announces route changes to screen readers, which otherwise get no
         signal at all that the page changed in a single-page navigation. -->
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
