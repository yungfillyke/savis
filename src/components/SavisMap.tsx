"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "mapbox-gl/dist/mapbox-gl.css";

export type SavisVerificationLevel = "blue" | "gold" | "black";

export type SavisMapProvider = {
  id: string;
  name: string;
  skill: string;
  area: string;
  km: number;
  rating: number;
  rate: number;
  latitude?: number;
  longitude?: number;
  verified?: boolean;
  verificationLevel?: SavisVerificationLevel;
  bio?: string;
  avatarUrl?: string;
};

type Props = {
  center: { latitude: number; longitude: number };
  providers: SavisMapProvider[];
  fullScreen?: boolean;
  radiusKm?: number;
  selectedProviderId?: string | null;
  onSelect?: (provider: SavisMapProvider) => void;
};

const DARK_STYLE =
  process.env.NEXT_PUBLIC_MAPBOX_DARK_STYLE_URL ||
  "mapbox://styles/saviske/cmuuy3rbj00b601s89nmx5smw";
const LIGHT_STYLE =
  process.env.NEXT_PUBLIC_MAPBOX_LIGHT_STYLE_URL ||
  "mapbox://styles/saviske/cmuuytytk00vq01sa634e0esl";

const VERIFY_COLORS: Record<SavisVerificationLevel, string> = {
  blue: "#2f80ed",
  gold: "#d4a72c",
  black: "#111111",
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    })[character] || character,
  );
}

function verificationLevel(provider: SavisMapProvider): SavisVerificationLevel {
  if (provider.verificationLevel) return provider.verificationLevel;
  return provider.verified === false ? "blue" : "blue";
}

function verificationLabel(level: SavisVerificationLevel) {
  return level === "black"
    ? "Verified Professional"
    : level === "gold"
      ? "Verified Premium Business"
      : "Verified";
}

export default function SavisMap({
  center,
  providers,
  fullScreen = false,
  radiusKm = 10,
  selectedProviderId = null,
  onSelect,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const geolocateRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const userLocationRef = useRef<[number, number]>([center.longitude, center.latitude]);
  const providerLookupRef = useRef<Map<string, SavisMapProvider>>(new Map());
  const styleRef = useRef<"dark" | "light">("dark");
  const popupRef = useRef<any>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [routeInfo, setRouteInfo] = useState<{ providerName: string; distance: string; duration: string; instruction?: string } | null>(null);
  const [routeBusy, setRouteBusy] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const fallbackStyleRef = useRef(false);

  const mappedProviders = useMemo(
    () =>
      providers.filter(
        (provider) => provider.latitude != null && provider.longitude != null,
      ),
    [providers],
  );

  useEffect(() => {
    providerLookupRef.current = new Map(mappedProviders.map((provider) => [provider.id, provider]));
  }, [mappedProviders]);

  useEffect(() => {
    let disposed = false;

    async function mount() {
      if (!hostRef.current || mapRef.current) return;

      const mapboxgl = await import("mapbox-gl");
      if (disposed || !hostRef.current) return;

      const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
      if (!token) {
        console.error("SAVIS: NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN is missing.");
        return;
      }

      const map = new mapboxgl.Map({
        accessToken: token,
        container: hostRef.current,
        style: DARK_STYLE,
        center: [center.longitude, center.latitude],
        zoom: 13,
        attributionControl: true,
        pitchWithRotate: false,
      });

      mapRef.current = map;

      map.on("error", (event: any) => {
        const message = String(event?.error?.message || "Mapbox could not load the map.");
        console.error("SAVIS Mapbox error:", message);
        setMapError(message);
        if (!fallbackStyleRef.current && (message.toLowerCase().includes("style") || message.toLowerCase().includes("tiles") || message.toLowerCase().includes("source"))) {
          fallbackStyleRef.current = true;
          map.setStyle("mapbox://styles/mapbox/dark-v11");
        }
      });

      const createUserMarker = () => {
        const element = document.createElement("div");
        element.className = "savis-map-user";
        element.innerHTML =
          '<span class="savis-map-user-radar"></span><span class="savis-map-user-cone"></span><span class="savis-map-user-core">▲</span>';
        userMarkerRef.current = new mapboxgl.Marker({
          element,
          anchor: "center",
          rotationAlignment: "viewport",
        })
          .setLngLat(userLocationRef.current)
          .setRotation(0)
          .addTo(map);
      };

      const renderProviders = () => {
        if (!map.isStyleLoaded()) return;

        if (map.getLayer("savis-clusters")) map.removeLayer("savis-clusters");
        if (map.getLayer("savis-cluster-count")) map.removeLayer("savis-cluster-count");
        if (map.getLayer("savis-providers-halo")) map.removeLayer("savis-providers-halo");
        if (map.getLayer("savis-providers")) map.removeLayer("savis-providers");
        if (map.getLayer("savis-provider-labels")) map.removeLayer("savis-provider-labels");
        if (map.getSource("savis-providers")) map.removeSource("savis-providers");

        const featureCollection = {
          type: "FeatureCollection",
          features: mappedProviders.map((provider) => ({
            type: "Feature",
            id: provider.id,
            properties: {
              id: provider.id,
              name: provider.name,
              skill: provider.skill,
              area: provider.area,
              km: provider.km,
              rating: provider.rating,
              rate: provider.rate,
              verification: verificationLevel(provider),
            },
            geometry: {
              type: "Point",
              coordinates: [provider.longitude, provider.latitude],
            },
          })),
        };

        map.addSource("savis-providers", {
          type: "geojson",
          data: featureCollection as any,
          cluster: true,
          clusterMaxZoom: 13,
          clusterRadius: 52,
          clusterProperties: {
            goldCount: ["+", ["case", ["==", ["get", "verification"], "gold"], 1, 0]],
            blackCount: ["+", ["case", ["==", ["get", "verification"], "black"], 1, 0]],
            blueCount: ["+", ["case", ["==", ["get", "verification"], "blue"], 1, 0]],
          },
        });

        map.addLayer({
          id: "savis-clusters",
          type: "circle",
          source: "savis-providers",
          filter: ["has", "point_count"],
          paint: {
            "circle-color": [
              "case",
              [">", ["get", "blackCount"], 0],
              VERIFY_COLORS.black,
              [">", ["get", "goldCount"], 0],
              VERIFY_COLORS.gold,
              VERIFY_COLORS.blue,
            ],
            "circle-radius": [
              "step",
              ["get", "point_count"],
              22,
              10,
              28,
              40,
              36,
            ],
            "circle-stroke-width": 3,
            "circle-stroke-color": "#ffffff",
            "circle-opacity": 0.96,
          },
        });

        map.addLayer({
          id: "savis-cluster-count",
          type: "symbol",
          source: "savis-providers",
          filter: ["has", "point_count"],
          layout: {
            "text-field": ["get", "point_count_abbreviated"],
            "text-size": 12,
            "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
          },
          paint: {
            "text-color": "#ffffff",
            "text-halo-color": "#111111",
            "text-halo-width": 1.2,
          },
        });

        map.addLayer({
          id: "savis-providers-halo",
          type: "circle",
          source: "savis-providers",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": [
              "match",
              ["get", "verification"],
              "gold",
              VERIFY_COLORS.gold,
              "black",
              VERIFY_COLORS.black,
              VERIFY_COLORS.blue,
            ],
            "circle-radius": [
              "case",
              ["==", ["get", "id"], selectedProviderId],
              13,
              10,
            ],
            "circle-opacity": 0.24,
          },
        });

        map.addLayer({
          id: "savis-providers",
          type: "circle",
          source: "savis-providers",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": [
              "match",
              ["get", "verification"],
              "gold",
              VERIFY_COLORS.gold,
              "black",
              VERIFY_COLORS.black,
              VERIFY_COLORS.blue,
            ],
            "circle-radius": [
              "case",
              ["==", ["get", "id"], selectedProviderId],
              8,
              6,
            ],
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
            "circle-emissive-strength": 0.8,
          },
        });

        map.addLayer({
          id: "savis-provider-labels",
          type: "symbol",
          source: "savis-providers",
          filter: ["!", ["has", "point_count"]],
          minzoom: 13.5,
          layout: {
            "text-field": ["get", "name"],
            "text-size": 10,
            "text-offset": [0, 1.55],
            "text-anchor": "top",
            "text-allow-overlap": false,
          },
          paint: {
            "text-color": styleRef.current === "dark" ? "#ffffff" : "#17202a",
            "text-halo-color": styleRef.current === "dark" ? "#111111" : "#ffffff",
            "text-halo-width": 1.5,
          },
        });
      };

      const showProviderPopup = (provider: SavisMapProvider, lngLat: [number, number]) => {
        onSelect?.(provider);
        popupRef.current?.remove();

        const level = verificationLevel(provider);
        const badgeColor = VERIFY_COLORS[level];
        const popup = new mapboxgl.Popup({
          offset: 14,
          maxWidth: "310px",
          className: "savis-provider-popup",
        })
          .setLngLat(lngLat)
          .setHTML(
            `
              <div class="savis-map-popup">
                <div class="savis-map-popup-head">
                  <div class="savis-map-popup-avatar">${provider.avatarUrl ? `<img src="${escapeHtml(provider.avatarUrl)}" alt="" />` : escapeHtml(provider.name.charAt(0).toUpperCase())}</div>
                  <div class="savis-map-popup-main">
                    <div class="savis-map-popup-name">${escapeHtml(provider.name)} <span class="savis-map-popup-badge" aria-label="${verificationLabel(level)}" title="${verificationLabel(level)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.7l2.15 1.16 2.43-.1 1.16 2.15 2.15 1.16-.1 2.43L21 12l-1.16 2.15.1 2.43-2.15 1.16-1.16 2.15-2.43-.1L12 21.3l-2.15-1.16-2.43.1-1.16-2.15-2.15-1.16.1-2.43L3 12l1.16-2.15-.1-2.43 2.15-1.16 1.16-2.15 2.43.1L12 2.7z" fill="${badgeColor}"/><path d="m8.2 12.2 2.25 2.25 5.35-5.35" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span></div>
                    <div class="savis-map-popup-sub">${escapeHtml(provider.skill)} · ${provider.km.toFixed(1)} km</div>
                  </div>
                </div>
                <div class="savis-map-popup-trust">${verificationLabel(level)} · ★ ${provider.rating ? provider.rating.toFixed(1) : "New"}</div>
                <div class="savis-map-popup-area">${escapeHtml(provider.area)}${provider.rate ? ` · From KSh ${provider.rate.toLocaleString()}` : ""}</div>
                <div class="savis-map-popup-actions">
                  <a href="/consumer/provider/${encodeURIComponent(provider.id)}" class="savis-map-popup-view">View profile</a>
                  <button type="button" class="savis-map-popup-route" data-savis-route="${escapeHtml(provider.id)}">Show directions</button>
                </div>
              </div>
            `,
          )
          .addTo(map);

        popupRef.current = popup;
        popup.on("open", () => {
          const button = popup.getElement()?.querySelector<HTMLButtonElement>("[data-savis-route]");
          button?.addEventListener("click", () => {
            void routeTo(provider);
          });
        });
      };

      const handleProviderClick = (event: any) => {
        const feature = event.features?.[0];
        if (!feature) return;
        const id = String(feature.properties?.id || "");
        const provider = providerLookupRef.current.get(id);
        if (!provider || provider.longitude == null || provider.latitude == null) return;
        showProviderPopup(provider, [provider.longitude, provider.latitude]);
      };

      const handleClusterClick = (event: any) => {
        const feature = event.features?.[0];
        if (!feature) return;
        const source = map.getSource("savis-providers") as any;
        const clusterId = Number(feature.properties?.cluster_id);
        source?.getClusterExpansionZoom(clusterId, (error: unknown, zoom: number) => {
          if (error) return;
          const coordinates = (feature.geometry as any).coordinates as [number, number];
          map.easeTo({ center: coordinates, zoom: Math.min(zoom, 16), duration: 550 });
        });
      };

      const handleEnter = () => {
        map.getCanvas().style.cursor = "pointer";
      };
      const handleLeave = () => {
        map.getCanvas().style.cursor = "";
      };

      map.on("load", () => {
        setMapError(null);
        map.resize();
        createUserMarker();
        renderProviders();
        map.addControl(new mapboxgl.NavigationControl({ showCompass: true, visualizePitch: false }), "top-right");

        const geolocate = new mapboxgl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true, timeout: 10000 },
          trackUserLocation: true,
          showUserLocation: false,
          showUserHeading: false,
          showAccuracyCircle: false,
          showButton: true,
        });
        geolocateRef.current = geolocate;
        map.addControl(geolocate, "top-right");
        geolocate.on("geolocate", (position: GeolocationPosition) => {
          const next: [number, number] = [position.coords.longitude, position.coords.latitude];
          userLocationRef.current = next;
          userMarkerRef.current?.setLngLat(next);
          if (typeof position.coords.heading === "number" && !Number.isNaN(position.coords.heading)) {
            userMarkerRef.current?.setRotation(position.coords.heading);
          }
        });

        map.on("click", "savis-clusters", handleClusterClick);
        map.on("click", "savis-providers", handleProviderClick);
        map.on("mouseenter", "savis-clusters", handleEnter);
        map.on("mouseleave", "savis-clusters", handleLeave);
        map.on("mouseenter", "savis-providers", handleEnter);
        map.on("mouseleave", "savis-providers", handleLeave);
      });

      map.on("style.load", () => {
        map.resize();
        if (!userMarkerRef.current) createUserMarker();
        renderProviders();
      });

      const resizeObserver = new ResizeObserver(() => map.resize());
      resizeObserver.observe(hostRef.current);
      window.setTimeout(() => map.resize(), 100);
      window.setTimeout(() => map.resize(), 500);
      window.setTimeout(() => map.resize(), 1200);

      return () => {
        map.off("click", "savis-clusters", handleClusterClick);
        map.off("click", "savis-providers", handleProviderClick);
        map.off("mouseenter", "savis-clusters", handleEnter);
        map.off("mouseleave", "savis-clusters", handleLeave);
        map.off("mouseenter", "savis-providers", handleEnter);
        map.off("mouseleave", "savis-providers", handleLeave);
        popupRef.current?.remove();
        resizeObserver.disconnect();
        map.remove();
      };
    }

    void mount();
    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const source = map.getSource("savis-providers") as any;
    if (source) {
      const data = {
        type: "FeatureCollection",
        features: mappedProviders.map((provider) => ({
          type: "Feature",
          id: provider.id,
          properties: {
            id: provider.id,
            name: provider.name,
            skill: provider.skill,
            area: provider.area,
            km: provider.km,
            rating: provider.rating,
            rate: provider.rate,
            verification: verificationLevel(provider),
          },
          geometry: {
            type: "Point",
            coordinates: [provider.longitude, provider.latitude],
          },
        })),
      };
      source.setData(data);
    }
  }, [mappedProviders]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const nextStyle = theme === "dark" ? DARK_STYLE : LIGHT_STYLE;
    if (styleRef.current === theme) return;
    styleRef.current = theme;
    map.setStyle(nextStyle);
  }, [theme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setCenter([center.longitude, center.latitude]);
    userLocationRef.current = [center.longitude, center.latitude];
    userMarkerRef.current?.setLngLat(userLocationRef.current);
  }, [center.latitude, center.longitude]);

  async function routeTo(provider: SavisMapProvider) {
    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!token || provider.latitude == null || provider.longitude == null) return;

    setRouteBusy(true);
    setRouteInfo(null);

    try {
      const [startLng, startLat] = userLocationRef.current;
      const endpoint =
        `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${startLng},${startLat};${provider.longitude},${provider.latitude}?alternatives=true&overview=full&geometries=geojson&steps=true&language=en&access_token=${encodeURIComponent(token)}`;
      const response = await fetch(endpoint);
      const data = await response.json();
      if (!response.ok || data.code !== "Ok" || !data.routes?.[0]) {
        throw new Error(data.message || "Directions could not be loaded.");
      }

      const route = data.routes[0];
      const map = mapRef.current;
      if (!map) return;

      const sourceId = "savis-route";
      if (map.getLayer("savis-route-outline")) map.removeLayer("savis-route-outline");
      if (map.getLayer("savis-route-line")) map.removeLayer("savis-route-line");
      if (map.getSource(sourceId)) map.removeSource(sourceId);

      map.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: route.geometry,
        },
      });

      map.addLayer({
        id: "savis-route-outline",
        type: "line",
        source: sourceId,
        paint: {
          "line-color": "#ffffff",
          "line-width": 8,
          "line-opacity": 0.72,
          "line-blur": 1.5,
        },
      });

      map.addLayer({
        id: "savis-route-line",
        type: "line",
        source: sourceId,
        paint: {
          "line-color": "#e22227",
          "line-width": 5,
          "line-opacity": 0.96,
          "line-cap": "round",
          "line-join": "round",
        },
      });

      const coordinates = route.geometry.coordinates as [number, number][];
      const lngs = coordinates.map((coordinate) => coordinate[0]);
      const lats = coordinates.map((coordinate) => coordinate[1]);
      const bounds: [[number, number], [number, number]] = [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ];
      map.fitBounds(bounds, { padding: fullScreen ? 90 : 50, duration: 800, maxZoom: 16 });

      const firstStep = route.legs?.[0]?.steps?.[0];
      setRouteInfo({
        providerName: provider.name,
        distance: `${(route.distance / 1000).toFixed(1)} km`,
        duration: `${Math.max(1, Math.round(route.duration / 60))} min`,
        instruction: firstStep?.maneuver?.instruction,
      });
    } catch (error) {
      setRouteInfo({
        providerName: provider.name,
        distance: "Unavailable",
        duration: "Try again",
        instruction: error instanceof Error ? error.message : "Directions unavailable.",
      });
    } finally {
      setRouteBusy(false);
    }
  }

  return (
    <div className={fullScreen ? "relative h-screen w-screen overflow-hidden" : "relative h-72 w-full overflow-hidden"}>
      <div
        ref={hostRef}
        className="absolute inset-0 min-h-0"
        aria-label="Interactive SAVIS service discovery map"
        role="application"
      />
      {mapError && (
        <div className="absolute inset-x-4 top-20 z-20 mx-auto max-w-md rounded-2xl border border-[#E22227]/30 bg-[#11171c]/95 p-4 text-white shadow-2xl backdrop-blur-xl">
          <p className="text-sm font-extrabold">SAVIS map is having trouble loading</p>
          <p className="mt-1 text-xs text-white/65">We are retrying the map connection. If the problem continues, refresh this page.</p>
        </div>
      )}

      <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-2">
        <div className="rounded-full border border-white/15 bg-black/65 px-3 py-1.5 text-[0.65rem] font-extrabold text-white shadow-lg backdrop-blur-xl">
          SAVIS · {theme === "dark" ? "Dark 2D" : "Light 2D"}
        </div>
        <button
          type="button"
          className="pointer-events-auto rounded-full border border-white/15 bg-black/65 px-3 py-1.5 text-[0.65rem] font-extrabold text-white shadow-lg backdrop-blur-xl"
          onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
        >
          {theme === "dark" ? "☀ Light" : "◐ Dark"}
        </button>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-10">
        <div className="ml-auto max-w-[340px]">
          {routeInfo && (
            <div className="pointer-events-auto rounded-[20px] border border-white/15 bg-[#101317]/92 p-3 text-white shadow-2xl backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e22227] text-lg font-black">➤</div>
                <div className="min-w-0 flex-1">
                  <b className="block truncate text-sm">{routeInfo.providerName}</b>
                  <span className="text-xs text-white/65">{routeInfo.distance} · {routeInfo.duration}</span>
                </div>
                <button type="button" onClick={() => setRouteInfo(null)} className="text-white/55">✕</button>
              </div>
              <p className="mt-2 text-xs text-white/80">{routeBusy ? "Calculating route…" : routeInfo.instruction || "Route ready."}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
