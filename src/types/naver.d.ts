// Ambient types for Naver Maps JavaScript v3 SDK (NCP).
//
// SDK is loaded via script tag injection in src/lib/hooks/use-naver-maps-sdk.ts
// The global `window.naver` object becomes available once the script fires its
// `load` event — no separate load callback is required (unlike Kakao Maps).
//
// Official reference: https://navermaps.github.io/maps.js.ncp/docs/
//
// This declaration is intentionally minimal — it covers only the symbols used
// by MapView and JobLocationCard. Extend per-feature when new SDK surface is
// introduced.

declare global {
  interface Window {
    naver: typeof naver;
  }

  namespace naver.maps {
    class LatLng {
      constructor(lat: number, lng: number);
      lat(): number;
      lng(): number;
      readonly x: number;
      readonly y: number;
    }

    class LatLngBounds {
      constructor(sw?: LatLng, ne?: LatLng);
      getSW(): LatLng;
      getNE(): LatLng;
      extend(latlng: LatLng): LatLngBounds;
    }

    interface MapOptions {
      center: LatLng;
      zoom?: number;
      minZoom?: number;
      maxZoom?: number;
      mapTypeControl?: boolean;
      zoomControl?: boolean;
    }

    class Map {
      constructor(container: HTMLElement | string, options: MapOptions);
      setCenter(latlng: LatLng): void;
      getCenter(): LatLng;
      setZoom(zoom: number, effect?: boolean): void;
      getZoom(): number;
      getBounds(): LatLngBounds;
      fitBounds(bounds: LatLngBounds): void;
      refresh(noEffect?: boolean): void;
      panTo(latlng: LatLng): void;
    }

    interface MarkerIconOptions {
      url: string;
      size?: Size;
      scaledSize?: Size;
      origin?: Point;
      anchor?: Point;
    }

    interface MarkerOptions {
      position: LatLng;
      map?: Map;
      title?: string;
      icon?: string | MarkerIconOptions;
      clickable?: boolean;
    }

    class Marker {
      constructor(options: MarkerOptions);
      setMap(map: Map | null): void;
      getMap(): Map | null;
      setPosition(latlng: LatLng): void;
      getPosition(): LatLng;
      setTitle(title: string): void;
    }

    class Size {
      constructor(width: number, height: number);
    }

    class Point {
      constructor(x: number, y: number);
    }

    interface CircleOptions {
      map?: Map;
      center: LatLng;
      radius: number;
      strokeWeight?: number;
      strokeColor?: string;
      strokeOpacity?: number;
      strokeStyle?: string;
      fillColor?: string;
      fillOpacity?: number;
      clickable?: boolean;
    }

    class Circle {
      constructor(options: CircleOptions);
      setMap(map: Map | null): void;
      setRadius(radius: number): void;
      setCenter(latlng: LatLng): void;
    }

    interface EventListener {
      remove(): void;
    }

    namespace Event {
      function addListener(
        target: unknown,
        eventName: string,
        listener: (...args: unknown[]) => void,
      ): EventListener;
      function removeListener(listener: EventListener | EventListener[]): void;
    }
  }
}

export {};
