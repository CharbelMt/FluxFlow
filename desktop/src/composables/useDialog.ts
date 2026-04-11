import type { DialogChainObject, QDialogProps } from 'quasar';
import { Dialog } from 'quasar';
import DialogComponent from 'components/dialog/DialogComponent.vue';
import type { Component } from 'vue';

type DialogEntry = {
  showDialog: (cmp: Component, props?: Record<string, any>) => DialogChainObject;
  cmp: Component;
  props?: Record<string, any> | undefined;
  dialogOptions?: QDialogProps | undefined;
};

const dialog_array: DialogEntry[] = [];

export function useDialog() {
  function deletePrompt(msg?: string, options?: Record<string, any>) {
    return Dialog.create({
      cancel: {
        label: 'Cancel',
        'no-caps': true,
        flat: true,
        color: options?.cancel_color || 'primary',
      },
      ok: {
        label: options?.ok_label || 'Delete',
        color: options?.ok_color || 'negative',
        'no-caps': true,
        flat: true,
      },
      html: true,
      class: options?.class || 'dialog-delete',
      transitionShow: 'slide-up',
      transitionHide: 'slide-down',
      message: msg || 'Are you sure you want to delete this?',
      persistent: true,
      title: (options?.title as string) || 'Confirm Deletion',
    });
  }

  function textPrompt(
    prompt_model: string,
    msg?: string,
    title?: string,
    customRule?: (val: string) => boolean | string,
  ) {
    return Dialog.create({
      cancel: { label: 'Cancel', 'no-caps': true, flat: true, color: 'negative' },
      ok: { label: 'Confirm', color: 'blue', 'no-caps': true, flat: true },
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
          (val) => !!val || 'Field required',
          ...(customRule
            ? [
                (val: string) => {
                  const result = customRule(val);
                  return result === true || result || 'Invalid input';
                },
              ]
            : []),
        ],
      },
      color: 'primary',
      html: true,
      message: msg || 'Update value',
      persistent: true,
      title: title || 'Confirm',
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
