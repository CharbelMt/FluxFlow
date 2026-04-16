<template>
  <q-card-section
    class="q-pb-sm"
    :class="[sticky ? stickyClass : '', $q.dark.isActive ? 'bg-dark' : 'bg-white']"
  >
    <div class="row items-center">
      <q-btn
        v-if="backButton"
        class="q-mr-sm"
        flat
        dense
        :icon="mdiArrowLeft"
        size="md"
        @click.prevent="$emit('back')"
        rounded
      />

      <div class="text-h6">{{ title }}</div>

      <q-btn
        v-if="!(backButton || noCloseButton)"
        flat
        dense
        class="q-ml-auto"
        :icon="mdiClose"
        size="md"
        @click.prevent="$emit('close')"
        rounded
      />
    </div>
  </q-card-section>
</template>

<script setup lang="ts">
import { mdiArrowLeft, mdiClose } from '@quasar/extras/mdi-v7';

interface Props {
  title?: string;
  noCloseButton?: boolean;
  sticky?: boolean;
  stickyClass?: string;
  backButton?: boolean;
}

defineEmits(['close', 'back']);

withDefaults(defineProps<Props>(), {
  title: '',
  noCloseButton: false,
  sticky: true,
  stickyClass: 'sticky top-0 z-10',
  backButton: false,
});
</script>
