import { defineComponent, onBeforeUnmount, onMounted, provide, shallowRef, type InjectionKey, type PropType, type ShallowRef, inject } from 'vue';
import { mount, type GuideConfig, type WispInstance } from '@veloceai/wisp-web';

export const WispKey: InjectionKey<ShallowRef<WispInstance | null>> = Symbol('wisp');

/** `<Wisp :config="config" />` — mounts the guide on the client and provides it to children. */
export const Wisp = defineComponent({
  name: 'Wisp',
  props: { config: { type: Object as PropType<GuideConfig>, required: true } },
  setup(props, { slots }) {
    const instance = shallowRef<WispInstance | null>(null);
    provide(WispKey, instance);
    onMounted(() => (instance.value = mount(props.config)));
    onBeforeUnmount(() => instance.value?.destroy());
    return () => slots.default?.();
  },
});

export function useWisp(): ShallowRef<WispInstance | null> {
  return inject(WispKey, shallowRef(null));
}

export type { GuideConfig, WispInstance } from '@veloceai/wisp-web';
