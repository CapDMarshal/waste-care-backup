'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Map, MapStyle, Marker } from '@maptiler/sdk';
// @ts-ignore - CSS import
import '@maptiler/sdk/dist/maptiler-sdk.css';

interface MapTilerMapProps {
  apiKey?: string;
  className?: string;
  center?: [number, number];
  zoom?: number;
  markers?: Array<{
    id: string;
    coordinates: [number, number];
    type: 'waste' | 'user';
    title?: string;
    location?: string;
  }>;
  onMarkerClick?: (markerId: string) => void;
  showRoute?: boolean;
  routeStart?: [number, number] | null;
  routeEnd?: [number, number] | null;
  showUserLocation?: boolean;
  userLocation?: [number, number] | null;
  onMapReady?: (map: Map) => void;
  onMapError?: (error: Error) => void;
}

const MapTilerMapComponent: React.FC<MapTilerMapProps> = ({
  apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY || '',
  className = 'w-full h-full',
  center = [110.3695, -7.7956],
  zoom = 12,
  markers = [],
  onMarkerClick,
  showRoute = false,
  routeStart = null,
  routeEnd = null,
  showUserLocation = false,
  userLocation = null,
  onMapReady,
  onMapError,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const userLocationMarkerRef = useRef<Marker | null>(null);
  const onMarkerClickRef = useRef(onMarkerClick);
  const onMapReadyRef = useRef(onMapReady);
  const onMapErrorRef = useRef(onMapError);
  const routeLayerId = 'route';
  const routeOutlineLayerId = 'route-outline';
  const routeSourceId = 'route';

  const [isOnline, setIsOnline] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);

  // Keep callback refs updated
  useEffect(() => {
    onMarkerClickRef.current = onMarkerClick;
    onMapReadyRef.current = onMapReady;
    onMapErrorRef.current = onMapError;
  }, [onMarkerClick, onMapReady, onMapError]);

  // Monitor online/offline status for PWA
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize map only once
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Check if API key is available
    if (!apiKey) {
      const error = new Error('MapTiler API key tidak tersedia');
      setMapError('Tidak dapat memuat peta. API key tidak ditemukan.');
      setIsLoading(false);
      onMapErrorRef.current?.(error);
      return;
    }

    try {
      setIsLoading(true);
      setMapError(null);
      console.log('[map] init:start', { center, zoom });

      // Initialize the map
      const mapInstance = new Map({
        container: mapContainer.current,
        style: MapStyle.HYBRID,
        center: center,
        zoom: zoom,
        apiKey: apiKey,
        attributionControl: false,
        // Add hash for URL sync (useful for PWA)
        hash: false,
        // Add navigation control for better UX
        navigationControl: true,
        geolocateControl: showUserLocation,
      });

      map.current = mapInstance;

      // Handle map load
      mapInstance.on('load', () => {
        console.log('[map] init:load');
        setIsLoading(false);
        onMapReadyRef.current?.(mapInstance);
        
        // Force remove any remaining attribution elements
        setTimeout(() => {
          const attributions = mapContainer.current?.querySelectorAll(
            '.maplibregl-ctrl-attrib, .maptiler-attribution, .mapboxgl-ctrl-attrib'
          );
          attributions?.forEach(attr => attr.remove());
        }, 100);
      });

      // Handle map errors
      mapInstance.on('error', (e) => {
        console.error('[map] init:error', e);
        const errorMsg = isOnline 
          ? 'Terjadi kesalahan saat memuat peta. Silakan refresh halaman.'
          : 'Tidak ada koneksi internet. Peta tidak dapat dimuat.';
        setMapError(errorMsg);
        setIsLoading(false);
        onMapErrorRef.current?.(new Error(errorMsg));
      });

      // Handle style load errors (e.g., tiles not loading)
      mapInstance.on('styleimagemissing', () => {
      });

    } catch (error) {
      console.error('[map] init:catch', error);
      const errorMsg = 'Gagal menginisialisasi peta. Silakan refresh halaman.';
      setMapError(errorMsg);
      setIsLoading(false);
      onMapErrorRef.current?.(error instanceof Error ? error : new Error(errorMsg));
    }

    return () => {
      markersRef.current.forEach((marker) => {
        try {
          marker.remove();
        } catch (error) {
        }
      });
      markersRef.current = [];

      if (userLocationMarkerRef.current) {
        try {
          userLocationMarkerRef.current.remove();
        } catch (error) {
        }
        userLocationMarkerRef.current = null;
      }

      if (map.current) {
        try {
          map.current.remove();
        } catch (error) {
        }
        map.current = null;
      }

      if (mapContainer.current) {
        mapContainer.current.innerHTML = '';
      }
    };
  }, [apiKey, isOnline]); // Removed dependencies that cause re-initialization

  useEffect(() => {
    if (!isLoading) return;

    const timer = window.setTimeout(() => {
      if (isLoading) {
        console.warn('[map] loading watchdog triggered');
        setIsLoading(false);
      }
    }, 9000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isLoading]);

  // Update map center when center prop changes
  useEffect(() => {
    if (!map.current || isLoading) return;

    try {
      map.current.setCenter(center);
    } catch (error) {
    }
  }, [center, isLoading]);

  // Update markers separately
  useEffect(() => {
    if (!map.current || isLoading) return;

    try {
      // Clear existing markers (except user location marker)
      markersRef.current.forEach(marker => {
        try {
          marker.remove();
        } catch (error) {
        }
      });
      markersRef.current = [];

      // Add new markers
      markers.forEach((markerData) => {
        if (map.current) {
          try {
            // Create marker element
            const el = document.createElement('div');
            el.className = 'marker';
            el.style.position = 'absolute';
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';
            el.style.cursor = 'pointer';
            el.style.pointerEvents = 'auto';
            el.style.zIndex = '10';
            
            if (markerData.type === 'waste') {
              el.style.width = '50px';
              el.style.height = '50px';
              // Create waste marker with trash icon
              el.innerHTML = `
                <img 
                  src="/icons/trashicon.png" 
                  alt="Trash" 
                  loading="lazy"
                  style="
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                    cursor: pointer;
                  " 
                  onerror="this.style.display='none'"
                />
              `;
            } else if (markerData.type === 'user') {
              el.style.width = '32px';
              el.style.height = '32px';
              el.style.backgroundColor = '#3b82f6';
              el.style.borderRadius = '50%';
              el.innerHTML = '📍';
              el.style.display = 'flex';
              el.style.alignItems = 'center';
              el.style.justifyContent = 'center';
              el.style.fontSize = '16px';
              el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
            }

            // Add click handler
            if (onMarkerClickRef.current && markerData.type === 'waste') {
              el.addEventListener('click', () => {
                onMarkerClickRef.current?.(markerData.id);
              });
            }

            // Add marker to map
            const marker = new Marker({ element: el, anchor: 'center' })
              .setLngLat(markerData.coordinates)
              .addTo(map.current);
            
            markersRef.current.push(marker);
          } catch (error) {
          }
        }
      });
    } catch (error) {
    }
  }, [markers, isLoading]);

  // Handle user location display
  useEffect(() => {
    if (!map.current || !showUserLocation || isLoading) return;

    const handleLocationSuccess = (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      
      if (map.current) {
        // Remove old user location marker if exists
        if (userLocationMarkerRef.current) {
          userLocationMarkerRef.current.remove();
        }

        // Create user location marker
        const el = document.createElement('div');
        el.className = 'user-location-marker';
        el.style.width = '20px';
        el.style.height = '20px';
        el.style.backgroundColor = '#3b82f6';
        el.style.border = '3px solid white';
        el.style.borderRadius = '50%';
        el.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.5)';
        el.style.animation = 'pulse 2s ease-in-out infinite';

        // Add CSS animation
        if (!document.getElementById('user-location-styles')) {
          const style = document.createElement('style');
          style.id = 'user-location-styles';
          style.textContent = `
            @keyframes pulse {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.7; transform: scale(1.1); }
            }
          `;
          document.head.appendChild(style);
        }

        const marker = new Marker({ element: el })
          .setLngLat([longitude, latitude])
          .addTo(map.current);
        
        userLocationMarkerRef.current = marker;

        // Optionally center map on user location
        // map.current.flyTo({ center: [longitude, latitude], zoom: 15 });
      }
    };

    const handleLocationError = (error: GeolocationPositionError) => {
      // Don't show error to user, just skip showing location marker
    };

    // Request user location if supported and permission granted
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        handleLocationSuccess, 
        handleLocationError,
        {
          enableHighAccuracy: false, // Use less accurate for better performance
          timeout: 5000,
          maximumAge: 60000, // Cache for 1 minute
        }
      );
    }

    return () => {
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.remove();
        userLocationMarkerRef.current = null;
      }
    };
  }, [showUserLocation, isLoading]);

  // Display user location marker from prop
  useEffect(() => {
    if (!map.current || !userLocation || isLoading) return;

    try {
      // Remove old user location marker if exists
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.remove();
      }

      // Create user location marker element
      const el = document.createElement('div');
      el.className = 'user-location-marker';
      el.style.width = '24px';
      el.style.height = '24px';
      el.style.position = 'absolute';
      
      // Inner dot (blue)
      el.innerHTML = `
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 16px;
          height: 16px;
          background-color: #3b82f6;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        "></div>
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 24px;
          height: 24px;
          background-color: rgba(59, 130, 246, 0.2);
          border-radius: 50%;
          animation: user-location-pulse 2s ease-in-out infinite;
        "></div>
      `;

      // Add CSS animation if not exists
      if (!document.getElementById('user-location-styles')) {
        const style = document.createElement('style');
        style.id = 'user-location-styles';
        style.textContent = `
          @keyframes user-location-pulse {
            0%, 100% { 
              opacity: 1; 
              transform: translate(-50%, -50%) scale(1); 
            }
            50% { 
              opacity: 0.3; 
              transform: translate(-50%, -50%) scale(1.5); 
            }
          }
        `;
        document.head.appendChild(style);
      }

      // Add marker to map
      const marker = new Marker({ element: el })
        .setLngLat(userLocation)
        .addTo(map.current);
      
      userLocationMarkerRef.current = marker;
    } catch (error) {
    }

    return () => {
      // Cleanup on unmount or when userLocation changes
      if (userLocationMarkerRef.current) {
        try {
          userLocationMarkerRef.current.remove();
          userLocationMarkerRef.current = null;
        } catch (error) {
        }
      }
    };
  }, [userLocation, isLoading]);


  // Handle route display
  useEffect(() => {
    if (!map.current || !showRoute || !routeStart || !routeEnd) {
      // Remove route if conditions not met
      if (map.current?.getLayer(routeLayerId)) {
        map.current.removeLayer(routeLayerId);
      }
      if (map.current?.getLayer(routeOutlineLayerId)) {
        map.current.removeLayer(routeOutlineLayerId);
      }
      if (map.current?.getSource(routeSourceId)) {
        map.current.removeSource(routeSourceId);
      }
      return;
    }

    const fetchRoute = async () => {
      try {
        // OSRM API call
        const url = `https://router.project-osrm.org/route/v1/driving/${routeStart[0]},${routeStart[1]};${routeEnd[0]},${routeEnd[1]}?overview=full&geometries=geojson`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
          return;
        }

        const route = data.routes[0].geometry;

        // Wait for map style to be loaded
        if (!map.current!.isStyleLoaded()) {
          map.current!.once('styledata', () => {
            addRouteToMap(route);
          });
        } else {
          addRouteToMap(route);
        }
      } catch (error) {
      }
    };

    const addRouteToMap = (route: any) => {
      if (!map.current) return;

      // Remove existing route layers
      if (map.current.getLayer(routeLayerId)) {
        map.current.removeLayer(routeLayerId);
      }
      if (map.current.getLayer(routeOutlineLayerId)) {
        map.current.removeLayer(routeOutlineLayerId);
      }
      if (map.current.getSource(routeSourceId)) {
        map.current.removeSource(routeSourceId);
      }

      // Add route source
      map.current.addSource(routeSourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: route
        }
      });

      // Add white outline layer (rendered first, appears behind)
      map.current.addLayer({
        id: routeOutlineLayerId,
        type: 'line',
        source: routeSourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#ffffff',
          'line-width': 6,
          'line-opacity': 1
        }
      });

      // Add blue route layer on top
      map.current.addLayer({
        id: routeLayerId,
        type: 'line',
        source: routeSourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#3b82f6',
          'line-width': 4,
          'line-opacity': 0.8
        }
      });
    };

    fetchRoute();
  }, [showRoute, routeStart, routeEnd]);

  return (
    <div className={className} style={{ position: 'relative' }}>
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
            <p className="text-gray-600 text-sm">Memuat peta...</p>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {mapError && (
        <div className="absolute inset-0 bg-red-50 flex items-center justify-center z-10 p-4">
          <div className="text-center max-w-md">
            <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-lg font-semibold text-red-800 mb-2">Gagal Memuat Peta</h3>
            <p className="text-sm text-red-600 mb-4">{mapError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Refresh Halaman
            </button>
          </div>
        </div>
      )}

      {/* Offline Indicator */}
      {!isOnline && !mapError && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
          <div className="bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
            </svg>
            <span className="text-sm font-medium">Mode Offline</span>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div 
        ref={mapContainer} 
        className="w-full h-full"
        style={{
          position: 'relative'
        }}
      />
    </div>
  );
};

// Custom comparison function for React.memo
const arePropsEqual = (prevProps: MapTilerMapProps, nextProps: MapTilerMapProps) => {
  // Compare primitives
  if (
    prevProps.apiKey !== nextProps.apiKey ||
    prevProps.className !== nextProps.className ||
    prevProps.zoom !== nextProps.zoom ||
    prevProps.showRoute !== nextProps.showRoute
  ) {
    return false;
  }

  // Compare center array
  if (
    prevProps.center?.[0] !== nextProps.center?.[0] ||
    prevProps.center?.[1] !== nextProps.center?.[1]
  ) {
    return false;
  }

  // Compare route coordinates
  if (
    prevProps.routeStart?.[0] !== nextProps.routeStart?.[0] ||
    prevProps.routeStart?.[1] !== nextProps.routeStart?.[1] ||
    prevProps.routeEnd?.[0] !== nextProps.routeEnd?.[0] ||
    prevProps.routeEnd?.[1] !== nextProps.routeEnd?.[1]
  ) {
    return false;
  }

  // Compare user location
  if (
    prevProps.userLocation?.[0] !== nextProps.userLocation?.[0] ||
    prevProps.userLocation?.[1] !== nextProps.userLocation?.[1]
  ) {
    return false;
  }

  // Compare markers array by reference (since we memoize it in parent)
  if (prevProps.markers !== nextProps.markers) {
    return false;
  }

  // Don't compare callback functions as we handle them with ref
  return true;
};

// Memoize component to prevent unnecessary re-renders
export const MapTilerMap = React.memo(MapTilerMapComponent, arePropsEqual);

export default MapTilerMap;