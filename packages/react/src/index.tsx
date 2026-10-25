'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { mount, type GuideConfig, type MountOptions, type WispInstance } from '@veloceai/wisp-web';

const WispContext = createContext<WispInstance | null>(null);

export interface WispProps extends MountOptions {
  config: GuideConfig;
  children?: ReactNode;
}

/** Mounts the guide once on the client. Keep `config` stable (module constant or useMemo). */
export function Wisp({ config, children, ...options }: WispProps) {
  const [instance, setInstance] = useState<WispInstance | null>(null);
  useEffect(() => {
    const wisp = mount(config, options);
    setInstance(wisp);
    return () => wisp.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);
  return <WispContext.Provider value={instance}>{children}</WispContext.Provider>;
}

/** The running guide, or null before it mounts. `useWisp()?.emit('success')` */
export function useWisp(): WispInstance | null {
  return useContext(WispContext);
}

export type { GuideConfig, WispInstance } from '@veloceai/wisp-web';
