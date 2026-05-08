<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';
import { initUsageSyncEngine, disposeUsageSyncEngine } from 'src/services/usage_service';

onMounted(() => {
  void initUsageSyncEngine();
});

onBeforeUnmount(() => {
  void disposeUsageSyncEngine();
});
</script>
