<template>
  <q-page class="q-pa-md q-pa-lg-md account-page">
    <div class="content-wrap">
      <q-card flat class="bg-white rounded-xl border border-slate-200 q-mb-md">
        <q-card-section>
          <div class="text-h6 text-weight-bold">{{ $t('account.title') }}</div>
          <div class="text-caption text-slate-500">{{ $t('account.account_readonly_hint') }}</div>
        </q-card-section>
      </q-card>

      <q-card flat class="bg-white rounded-xl border border-slate-200 q-mb-md">
        <q-card-section>
          <div class="text-subtitle1 text-weight-bold q-mb-md">{{ $t('account.profile') }}</div>

          <q-input
            :model-value="display_name"
            :label="$t('account.full_name')"
            outlined
            readonly
            class="q-mb-md"
          />

          <q-input
            :model-value="display_role"
            :label="$t('account.role')"
            outlined
            readonly
            class="q-mb-md"
          />

          <q-input :model-value="display_email" :label="$t('account.email')" outlined readonly />
        </q-card-section>
      </q-card>

      <q-card flat class="bg-white rounded-xl border border-slate-200">
        <q-card-section>
          <div class="text-subtitle1 text-weight-bold q-mb-md">{{ $t('account.security') }}</div>

          <q-input
            v-model="form.current_password"
            :label="$t('account.current_password')"
            :type="show_current_password ? 'text' : 'password'"
            outlined
            autocomplete="current-password"
            class="q-mb-md"
          >
            <template #append>
              <q-icon
                :name="show_current_password ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="show_current_password = !show_current_password"
              />
            </template>
          </q-input>

          <q-input
            v-model="form.new_password"
            :label="$t('account.new_password')"
            :type="show_new_password ? 'text' : 'password'"
            outlined
            autocomplete="new-password"
            class="q-mb-md"
          >
            <template #append>
              <q-icon
                :name="show_new_password ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="show_new_password = !show_new_password"
              />
            </template>
          </q-input>

          <q-input
            v-model="form.confirm_password"
            :label="$t('account.confirm_password')"
            :type="show_confirm_password ? 'text' : 'password'"
            outlined
            autocomplete="new-password"
            class="q-mb-lg"
          >
            <template #append>
              <q-icon
                :name="show_confirm_password ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="show_confirm_password = !show_confirm_password"
              />
            </template>
          </q-input>

          <q-btn
            unelevated
            color="primary"
            :label="$t('account.change_password')"
            :loading="submitting"
            @click="handle_change_password"
          />
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useQuasar } from 'quasar';
import { useAuthStore } from 'src/stores/auth-store';

const { t: $t } = useI18n();
const $q = useQuasar();
const auth_store = useAuthStore();

const submitting = ref(false);
const show_current_password = ref(false);
const show_new_password = ref(false);
const show_confirm_password = ref(false);

const form = reactive({
  current_password: '',
  new_password: '',
  confirm_password: '',
});

const display_name = computed(() => auth_store.user?.fullName || auth_store.user?.full_name || '');
const display_role = computed(() => auth_store.user?.role || '');
const display_email = computed(() => auth_store.user?.email || '');

function reset_form() {
  form.current_password = '';
  form.new_password = '';
  form.confirm_password = '';
  show_current_password.value = false;
  show_new_password.value = false;
  show_confirm_password.value = false;
}

async function handle_change_password() {
  const current_password = form.current_password.trim();
  const new_password = form.new_password.trim();
  const confirm_password = form.confirm_password.trim();

  if (!current_password || !new_password || !confirm_password) {
    $q.notify({ color: 'negative', message: $t('errors.field_required') });
    return;
  }

  if (new_password.length < 6) {
    $q.notify({ color: 'negative', message: $t('errors.supervisor_password_min') });
    return;
  }

  if (new_password !== confirm_password) {
    $q.notify({ color: 'negative', message: $t('errors.password_mismatch') });
    return;
  }

  submitting.value = true;
  try {
    const result = await auth_store.changeOwnPassword({
      current_password,
      new_password,
    });

    if (!result?.success) {
      $q.notify({
        color: 'negative',
        message: result?.error || $t('errors.password_change_failed'),
      });
      return;
    }

    $q.notify({ color: 'positive', message: $t('messages.password_changed') });
    reset_form();
  } catch (error) {
    console.error(error);
    $q.notify({ color: 'negative', message: $t('errors.password_change_failed') });
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.account-page {
  display: flex;
  justify-content: center;
}

.content-wrap {
  width: 100%;
  max-width: 680px;
}
</style>
