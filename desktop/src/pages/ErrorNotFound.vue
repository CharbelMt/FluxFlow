<template>
  <div class="fullscreen bg-blue text-white text-center q-pa-md flex flex-center">
    <div>
      <div style="font-size: 30vh">
        {{ $t('errors.page_404') }}
      </div>

      <div class="text-h2" style="opacity: 0.4">
        {{ $t('errors.nothing_here') }}
      </div>

      <q-btn
        class="q-mt-xl"
        color="white"
        text-color="blue"
        unelevated
        to="/"
        :label="$t('errors.go_home')"
        no-caps
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();
</script>
