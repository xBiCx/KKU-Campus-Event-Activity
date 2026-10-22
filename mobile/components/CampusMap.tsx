import React, { useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView } from 'react-native';
import { WebView } from 'react-native-webview';
import { CampusEvent } from '../types';
import { CAMPUS_CENTER, CAMPUS_LOCATIONS } from '../constants/campusLocations';

interface CampusMapProps {
  items?: CampusEvent[];
  selectedItem?: CampusEvent | null;
  onSelectItem?: (item: CampusEvent) => void;
  selectionMode?: boolean;
  selectedLocation?: { latitude: number; longitude: number } | null;
  onLocationSelect?: (loc: { latitude: number; longitude: number }) => void;
  height?: number | string;
}

export const CampusMap: React.FC<CampusMapProps> = ({
  items = [],
  selectedItem,
  onSelectItem,
  selectionMode = false,
  selectedLocation,
  onLocationSelect,
  height = '100%',
}) => {
  const webViewRef = useRef<WebView>(null);

  const initialLat = selectedLocation
    ? selectedLocation.latitude
    : selectedItem
    ? Number(selectedItem.latitude)
    : CAMPUS_CENTER.latitude;

  const initialLng = selectedLocation
    ? selectedLocation.longitude
    : selectedItem
    ? Number(selectedItem.longitude)
    : CAMPUS_CENTER.longitude;

  // Generate Leaflet HTML
  const generateMapHtml = () => {
    const serializedEvents = JSON.stringify(
      items.map((i) => ({
        id: i.id,
        title: i.title,
        category: i.category,
        status: i.status,
        eventDate: i.event_date ? new Date(i.event_date).toLocaleString('th-TH') : '',
        lat: Number(i.latitude),
        lng: Number(i.longitude),
        locationName: i.location_name,
      }))
    );

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body, html, #map {
            margin: 0;
            padding: 0;
            height: 100%;
            width: 100%;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          }
          .custom-popup .leaflet-popup-content-wrapper {
            border-radius: 12px;
            box-shadow: 0 4px 14px rgba(0,0,0,0.15);
            padding: 4px;
          }
          .popup-btn {
            background-color: #1E3A8A;
            color: #ffffff;
            border: none;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 13px;
            cursor: pointer;
            margin-top: 6px;
            width: 100%;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const centerLat = ${initialLat};
          const centerLng = ${initialLng};
          const isSelectionMode = ${selectionMode};
          const events = ${serializedEvents};

          const map = L.map('map', {
            zoomControl: true,
            attributionControl: false
          }).setView([centerLat, centerLng], 17);

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
          }).addTo(map);

          // Campus Landmarks indicators (KKU Nong Khai)
          const landmarks = [
            { name: '🏛️ อาคารบริหาร มข.', lat: 17.80628, lng: 102.74606, color: '#1E3A8A' },
            { name: '⚽ สนามกีฬา 10 ปี วนค.', lat: 17.80785, lng: 102.74651, color: '#0284C7' },
            { name: '🍽️ โรงอาหาร Complex', lat: 17.79924, lng: 102.74786, color: '#D97706' },
            { name: '📚 อาคารเรียนรวม', lat: 17.80322, lng: 102.74806, color: '#4338CA' },
            { name: '🏠 หอพักนักศึกษา', lat: 17.80050, lng: 102.74620, color: '#059669' },
            { name: '🐠 พิพิธภัณฑ์สัตว์น้ำ', lat: 17.80917, lng: 102.74620, color: '#0D9488' }
          ];

          landmarks.forEach(function(lm) {
            const icon = L.divIcon({
              html: '<div style="background:' + lm.color + '; color:white; padding:3px 7px; border-radius:10px; font-size:10px; font-weight:bold; white-space:nowrap; border:1.5px solid white; box-shadow:0 2px 4px rgba(0,0,0,0.3);">' + lm.name + '</div>',
              className: '',
              iconAnchor: [50, 15]
            });
            L.marker([lm.lat, lm.lng], { icon: icon, interactive: false }).addTo(map);
          });

          // Selection pin marker
          let selectMarker = null;
          if (isSelectionMode) {
            ${
              selectedLocation
                ? `selectMarker = L.marker([${selectedLocation.latitude}, ${selectedLocation.longitude}], { draggable: true }).addTo(map);`
                : ''
            }

            map.on('click', function(e) {
              const { lat, lng } = e.latlng;
              if (selectMarker) {
                selectMarker.setLatLng([lat, lng]);
              } else {
                selectMarker = L.marker([lat, lng], { draggable: true }).addTo(map);
                selectMarker.on('dragend', function(event) {
                  const pos = event.target.getLatLng();
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'LOCATION_SELECTED',
                    latitude: pos.lat,
                    longitude: pos.lng
                  }));
                });
              }

              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'LOCATION_SELECTED',
                latitude: lat,
                longitude: lng
              }));
            });
          }

          // Add event markers with distinctive icons
          events.forEach(function(ev) {
            if (!ev.lat || !ev.lng) return;

            let bgColor = '#1E3A8A';
            let iconText = '📅';

            if (ev.category === 'academic') {
              bgColor = '#2563EB';
              iconText = '📖';
            } else if (ev.category === 'workshop') {
              bgColor = '#7C3AED';
              iconText = '💻';
            } else if (ev.category === 'sports') {
              bgColor = '#059669';
              iconText = '⚽';
            } else if (ev.category === 'volunteer') {
              bgColor = '#D97706';
              iconText = '🌱';
            }

            const customMarker = L.divIcon({
              html: '<div style="background-color:' + bgColor + '; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid #FFFFFF; box-shadow:0 3px 6px rgba(0,0,0,0.25); font-size:16px;">' + iconText + '</div>',
              className: '',
              iconSize: [34, 34],
              iconAnchor: [17, 17],
              popupAnchor: [0, -18]
            });

            const marker = L.marker([ev.lat, ev.lng], { icon: customMarker }).addTo(map);

            const popupContent = document.createElement('div');
            popupContent.style.minWidth = '150px';
            popupContent.innerHTML = 
              '<strong style="font-size:14px; color:#1F2937;">' + ev.title + '</strong>' +
              '<div style="font-size:12px; color:#4B5563; margin-top:3px;">📍 ' + ev.locationName + '</div>' +
              '<div style="font-size:11px; color:#2563EB; margin-top:2px;">⏰ ' + ev.eventDate + '</div>' +
              '<button class="popup-btn" id="btn-event-' + ev.id + '">ดูรายละเอียดกิจกรรม</button>';

            marker.bindPopup(popupContent, { className: 'custom-popup' });

            marker.on('popupopen', function() {
              const btn = document.getElementById('btn-event-' + ev.id);
              if (btn) {
                btn.onclick = function() {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'ITEM_SELECTED',
                    itemId: ev.id
                  }));
                };
              }
            });
          });

          // Pan to specific location
          window.panToLocation = function(lat, lng) {
            map.flyTo([lat, lng], 18, { duration: 1.2 });
            if (isSelectionMode) {
              if (selectMarker) {
                selectMarker.setLatLng([lat, lng]);
              } else {
                selectMarker = L.marker([lat, lng], { draggable: true }).addTo(map);
              }
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'LOCATION_SELECTED',
                latitude: lat,
                longitude: lng
              }));
            }
          };
        </script>
      </body>
      </html>
    `;
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'ITEM_SELECTED' && onSelectItem) {
        const found = items.find((i) => i.id === data.itemId);
        if (found) onSelectItem(found);
      } else if (data.type === 'LOCATION_SELECTED' && onLocationSelect) {
        onLocationSelect({
          latitude: data.latitude,
          longitude: data.longitude,
        });
      }
    } catch (e) {
      console.warn('Error parsing WebView message', e);
    }
  };

  const panToPreset = (loc: { latitude: number; longitude: number }) => {
    const js = `window.panToLocation(${loc.latitude}, ${loc.longitude}); true;`;
    webViewRef.current?.injectJavaScript(js);
  };

  return (
    <View style={[styles.container, { height: height as any }]}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: generateMapHtml() }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />

      {/* Preset landmarks toolbar */}
      <View style={styles.presetContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetScroll}
        >
          {CAMPUS_LOCATIONS.map((loc) => (
            <TouchableOpacity
              key={loc.id}
              style={styles.presetButton}
              onPress={() => panToPreset(loc)}
            >
              <Text style={styles.presetText}>📍 {loc.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    backgroundColor: '#E5E7EB',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  presetContainer: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  presetScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  presetButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E3A8A',
  },
});
