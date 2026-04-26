import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

type WebXRNavigator = Navigator & {
  xr?: {
    isSessionSupported: (mode: string) => Promise<boolean>;
    requestSession: (mode: string, init?: Record<string, unknown>) => Promise<unknown>;
  };
};

declare global {
  interface Window {
    mars_start_vr_session?: () => Promise<string>;
  }
}

export default function XRSessionBridge() {
  const gl = useThree((state) => state.gl);

  useEffect(() => {
    window.mars_start_vr_session = async () => {
      const xr = (navigator as WebXRNavigator).xr;
      if (!xr) return 'WebXR non disponibile su questo browser/dispositivo.';

      const supported = await xr.isSessionSupported('immersive-vr');
      if (!supported) return 'Sessione immersive-vr non supportata dal dispositivo.';

      const session = await xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'],
      });
      await gl.xr.setSession(session as XRSession);
      return 'Sessione VR avviata.';
    };

    return () => {
      delete window.mars_start_vr_session;
    };
  }, [gl]);

  return null;
}
