// Phase 4 Plan 04-07 SEARCH-02 — ambient types for Kakao Maps JavaScript SDK.
//
// SDK is loaded via script tag injection in src/hooks/use-kakao-maps-sdk.ts
// using autoload=false + kakao.maps.load(callback) pattern. The global
// `window.kakao` object becomes available inside the load callback.
//
// Official reference: https://apis.map.kakao.com/web/guide/
//
// This is a MINIMAL declaration — only the symbols Plan 04-07 consumes.
// Extend per-feature when new SDK surface is introduced.
//
// `export {}` makes this file a module (so `declare global` applies instead
// of polluting the top-level namespace everywhere).

declare global {
  interface Window {
    kakao: typeof kakao;
  }

  namespace kakao.maps {
    function load(callback: () => void): void;

    class LatLng {
      constructor(lat: number, lng: number);
      getLat(): number;
      getLng(): number;
    }

    class LatLngBounds {
      constructor();
      getSouthWest(): LatLng;
      getNorthEast(): LatLng;
      extend(latlng: LatLng): void;
    }

    interface MapOptions {
      center: LatLng;
      level?: number;
    }

    class Map {
      constructor(container: HTMLElement, options: MapOptions);
      setCenter(latlng: LatLng): void;
      getCenter(): LatLng;
      setLevel(level: number): void;
      getLevel(): number;
      getBounds(): LatLngBounds;
      setBounds(bounds: LatLngBounds): void;
      relayout(): void;
      panTo(latlng: LatLng): void;
    }

    interface MarkerOptions {
      position: LatLng;
      map?: Map;
      title?: string;
      image?: MarkerImage;
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

    interface MarkerImageOptions {
      offset?: Point;
      alt?: string;
    }

    class MarkerImage {
      constructor(src: string, size: Size, options?: MarkerImageOptions);
    }

    class Size {
      constructor(width: number, height: number);
    }

    class Point {
      constructor(x: number, y: number);
    }

    interface CircleOptions {
      center: LatLng;
      radius: number; // meters
      strokeWeight?: number;
      strokeColor?: string;
      strokeOpacity?: number;
      strokeStyle?: string;
      fillColor?: string;
      fillOpacity?: number;
    }

    class Circle {
      constructor(options: CircleOptions);
      setMap(map: Map | null): void;
      setRadius(radius: number): void;
      setPosition(latlng: LatLng): void;
    }

    namespace event {
      function addListener(
        target: unknown,
        type: string,
        handler: (...args: unknown[]) => void,
      ): void;
      function removeListener(
        target: unknown,
        type: string,
        handler: (...args: unknown[]) => void,
      ): void;
    }
  }
}

export {};
