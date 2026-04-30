import type { DialogChainObject, QDialogProps } from 'quasar';
import { Dialog } from 'quasar';
import DialogComponent from 'components/dialog/DialogComponent.vue';
import type { Component } from 'vue';
import { useI18n } from 'vue-i18n';

type DialogEntry = {
  showDialog: (cmp: Component, props?: Record<string, any>) => DialogChainObject;
  cmp: Component;
  props?: Record<string, any> | undefined;
  dialogOptions?: QDialogProps | undefined;
};

const dialog_array: DialogEntry[] = [];

export function useDialog() {
  const { t } = useI18n();

  function deletePrompt(msg?: string, options?: Record<string, any>) {
    return Dialog.create({
      cancel: {
        label: t('common.cancel'),
        'no-caps': true,
        flat: true,
        color: options?.cancel_color || 'primary',
      },
      ok: {
        label: options?.ok_label || t('common.delete'),
        color: options?.ok_color || 'negative',
        'no-caps': true,
        flat: true,
      },
      html: true,
      class: options?.class || 'dialog-delete',
      transitionShow: 'slide-up',
      transitionHide: 'slide-down',
      message: msg || t('dialogs.delete_confirm'),
      persistent: true,
      title: (options?.title as string) || t('dialogs.confirm_deletion'),
    });
  }

  function textPrompt(
    prompt_model: string,
    msg?: string,
    title?: string,
    customRule?: (val: string) => boolean | string,
  ) {
    return Dialog.create({
      cancel: { label: t('common.cancel'), 'no-caps': true, flat: true, color: 'negative' },
      ok: { label: t('dialogs.confirm'), color: 'blue', 'no-caps': true, flat: true },
      prompt: {
        model: prompt_model,
        type: 'text',
        isValid(value) {
          if (value.length === 0) return false;
          if (customRule) {
            const result = customRule(value);
            return result === true;
          }
          return true;
        },
        rules: [
          (val) => !!val || t('errors.field_required'),
          ...(customRule
            ? [
                (val: string) => {
                  const result = customRule(val);
                  return result === true || result || t('errors.invalid_input');
                },
              ]
            : []),
        ],
      },
      color: 'primary',
      html: true,
      message: msg || t('dialogs.update_value'),
      persistent: true,
      title: title || t('dialogs.confirm'),
    });
  }

  function showDialog(
    componentToRender: Component,
    componentProps?: Record<string, any>,
    dialogOptions?: QDialogProps,
  ) {
    return Dialog.create({
      component: DialogComponent,
      componentProps: {
        componentToRender,
        componentToRenderProps: componentProps ?? {},
        dialogOptions,
      },
      ok: false,
      cancel: false,
    });
  }

  function pushDialog(cmp: Component, props?: Record<string, any>, dialogOptions?: QDialogProps) {
    dialog_array.push({ showDialog, cmp, props, dialogOptions });
    return showDialog(cmp, props, dialogOptions);
  }

  function popDialog(dialog_name: string) {
    const dialog_ref = dialog_array.at(-1);
    if (dialog_ref && dialog_ref.cmp.name === dialog_name) {
      dialog_array.pop();
      const next_dialog = dialog_array.at(-1);
      if (next_dialog) next_dialog.showDialog(next_dialog.cmp, next_dialog.props);
    }
  }

  return { deletePrompt, textPrompt, pushDialog, popDialog };
}
