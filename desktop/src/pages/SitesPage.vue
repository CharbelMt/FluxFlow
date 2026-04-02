<template>
  <q-page class="q-pa-lg">
    <div class="flex justify-between items-center q-mb-lg">
      <div class="text-h4 font-bold text-slate-800">Deployment Zones</div>
      <q-btn color="primary" rounded unelevated label="New Site" :icon="mdiPlus" />
    </div>

    <div class="row q-col-gutter-lg">
      <div v-for="site in siteStore.sites" :key="site.id" class="col-12 col-md-6 col-lg-4">
        <q-card flat bordered class="rounded-xl overflow-hidden border-slate-200">
          <q-card-section class="bg-slate-50 border-b border-slate-100">
            <div class="row items-center justify-between">
              <div class="text-h6 font-bold text-slate-800">{{ site.name }}</div>
              <q-chip size="sm" color="blue-1" text-color="primary" class="font-mono">
                {{ site.location_gps }}
              </q-chip>
            </div>
          </q-card-section>

          <q-card-section>
            <div class="text-overline text-slate-400 q-mb-sm">Storage Rooms (QR Tracked)</div>
            <q-list dense>
              <q-item v-for="room in site.rooms" :key="room.id" class="q-px-none">
                <q-item-section avatar>
                  <q-icon :name="mdiDoorOpen" color="slate-400" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-medium">{{ room.room_label }}</q-item-label>
                  <q-item-label caption class="font-mono text-[10px]">
                    UID: {{ room.room_tag_uid }}
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>

          <q-card-actions align="right" class="q-pb-md q-px-md">
            <q-btn flat color="primary" label="Manage Assets" no-caps />
          </q-card-actions>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useSiteStore } from 'src/stores/site-store';
import { mdiPlus, mdiDoorOpen } from '@quasar/extras/mdi-v7';

const siteStore = useSiteStore();
onMounted(() => siteStore.fetchSites());
</script>
