'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type GeolocationStatus =
  | 'unsupported'
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'unavailable'
  | 'timeout';

export interface Coordinates {
  readonly latitude: number;
  readonly longitude: number;
  readonly accuracyMeters: number;
  readonly capturedAt: number;
}

export interface GeolocationFailure {
  readonly status: Extract<GeolocationStatus, 'denied' | 'unavailable' | 'timeout' | 'unsupported'>;
  readonly message: string;
}

export interface UseGeolocationOptions {
  readonly enableHighAccuracy?: boolean;
  readonly timeoutMs?: number;
  readonly maximumAgeMs?: number;
  readonly watch?: boolean;
}

export interface UseGeolocationState {
  readonly status: GeolocationStatus;
  readonly coords: Coordinates | null;
  readonly error: GeolocationFailure | null;
  readonly isSupported: boolean;
  readonly isLoading: boolean;
  readonly request: () => void;
  readonly reset: () => void;
}

const MESSAGES: Record<GeolocationFailure['status'], string> = {
  unsupported: 'Location is not supported on this device or browser.',
  denied: 'Location access was blocked. You can still search by city or PIN code.',
  unavailable: 'We could not determine your location. Please check GPS or network signal.',
  timeout: 'Locating you took too long. Please try again or search manually.',
};

function toFailure(code: number): GeolocationFailure {
  const status: GeolocationFailure['status'] =
    code === 1 ? 'denied' : code === 3 ? 'timeout' : 'unavailable';
  return { status, message: MESSAGES[status] };
}

export function useGeolocation(options: UseGeolocationOptions = {}): UseGeolocationState {
  const { enableHighAccuracy = false, timeoutMs = 10_000, maximumAgeMs = 300_000, watch = false } = options;

  const [status, setStatus] = useState<GeolocationStatus>('idle');
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [error, setError] = useState<GeolocationFailure | null>(null);

  const mountedRef = useRef(true);
  const watchIdRef = useRef<number | null>(null);

  // SSR-safe capability detection (runs after hydration, so no markup mismatch).
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    mountedRef.current = true;
    const supported = typeof navigator !== 'undefined' && 'geolocation' in navigator;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSupported(supported);
    if (!supported) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus('unsupported');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError({ status: 'unsupported', message: MESSAGES.unsupported });
      return;
    }

    // Surface a pre-existing hard denial without triggering another prompt.
    let cancelled = false;
    void (async () => {
      if (!('permissions' in navigator)) return;
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        if (cancelled || !mountedRef.current) return;
        if (result.state === 'denied') {
          setStatus('denied');
          setError({ status: 'denied', message: MESSAGES.denied });
        }
      } catch {
        /* Permissions API unsupported for 'geolocation' — ignore and rely on the prompt. */
      }
    })();

    return () => {
      cancelled = true;
      mountedRef.current = false;
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  const request = useCallback(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setStatus('unsupported');
      setError({ status: 'unsupported', message: MESSAGES.unsupported });
      return;
    }

    setStatus('requesting');
    setError(null);

    const onSuccess = (position: GeolocationPosition): void => {
      if (!mountedRef.current) return;
      setCoords({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters: position.coords.accuracy,
        capturedAt: position.timestamp,
      });
      setStatus('granted');
      setError(null);
    };

    const onError = (positionError: GeolocationPositionError): void => {
      if (!mountedRef.current) return;
      const failure = toFailure(positionError.code);
      setStatus(failure.status);
      setError(failure);
    };

    const positionOptions: PositionOptions = {
      enableHighAccuracy,
      timeout: timeoutMs,
      maximumAge: maximumAgeMs,
    };

    if (watch) {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = navigator.geolocation.watchPosition(onSuccess, onError, positionOptions);
      return;
    }
    navigator.geolocation.getCurrentPosition(onSuccess, onError, positionOptions);
  }, [enableHighAccuracy, maximumAgeMs, timeoutMs, watch]);

  const reset = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined') {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setCoords(null);
    setError(null);
    setStatus(isSupported ? 'idle' : 'unsupported');
  }, [isSupported]);

  return { status, coords, error, isSupported, isLoading: status === 'requesting', request, reset };
}
