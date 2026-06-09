import React from 'react';
import { Dimensions, ScrollView, View } from 'react-native';
import Svg, { Rect, Line, Text as SvgText, G } from 'react-native-svg';
import AmenityMarker from './AmenityMarker';
import VendorMarker from './VendorMarker';

const SCHEMATIC_WIDTH = 1000;
const SCHEMATIC_HEIGHT = 600;
const deviceWidth = Dimensions.get('window').width - 32;
const scale = deviceWidth / SCHEMATIC_WIDTH;
const svgHeight = SCHEMATIC_HEIGHT * scale;

function resolveOverlaps(markers) {
  const resolved = [];
  for (let i = 0; i < markers.length; i++) {
    const m = { ...markers[i] };
    for (let j = 0; j < resolved.length; j++) {
      const rm = resolved[j];
      const dx = m.schematic_x - rm.schematic_x;
      const dy = m.schematic_y - rm.schematic_y;
      if (Math.sqrt(dx * dx + dy * dy) < 20) {
        m.schematic_x += 15;
      }
    }
    resolved.push(m);
  }
  return resolved;
}

export default function SchematicMap({ stationData, amenities, vendors, onSelectAmenity, onSelectVendor }) {
  const safeStationData = stationData || {};
  const tracks = safeStationData.tracks || [];
  const structures = safeStationData.structures || [];
  const platforms = safeStationData.platforms || [];

  const safeAmenities = amenities || [];
  const safeVendors = vendors || [];

  let allMarkers = [
    ...safeAmenities.map(a => ({ ...a, _isVendor: false })),
    ...safeVendors.map(v => ({ ...v, _isVendor: true }))
  ];

  allMarkers = resolveOverlaps(allMarkers);

  const resolvedAmenities = allMarkers.filter(m => !m._isVendor);
  const resolvedVendors = allMarkers.filter(m => m._isVendor);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Svg width={deviceWidth} height={svgHeight}>
          {/* Background */}
          <Rect x={0} y={0} width={deviceWidth} height={svgHeight} fill="#F0EDE8" />

          {/* Tracks */}
          {tracks.map((t, idx) => (
            <Line key={`track-${idx}`}
                  x1={t.x1 * scale} y1={t.y1 * scale}
                  x2={t.x2 * scale} y2={t.y2 * scale}
                  stroke="#BBBBBB" strokeWidth={1} />
          ))}

          {/* Structures */}
          {structures.map((s, i) => {
            const fill = s.type === 'CONCOURSE' ? '#E8E0D0' :
                         s.type === 'ENTRY' ? '#D4EDDA' : '#EDE8E0';
            return (
              <G key={`struct-${i}`}>
                <Rect x={s.x1 * scale} y={s.y1 * scale}
                      width={(s.x2 - s.x1) * scale} height={(s.y2 - s.y1) * scale}
                      fill={fill} stroke="#AAA" strokeWidth={1} rx={2} />
                <SvgText x={(s.x1 + (s.x2 - s.x1) / 2) * scale}
                         y={(s.y1 + (s.y2 - s.y1) / 2 + 5) * scale}
                         fontSize={10 * scale} fill="#666"
                         textAnchor="middle" fontWeight="500">
                  {s.label}
                </SvgText>
              </G>
            );
          })}

          {/* Platforms */}
          {platforms.map((p, idx) => (
            <G key={`plat-${p.id || idx}`}>
              <Rect x={p.x1 * scale} y={p.y1 * scale}
                    width={(p.x2 - p.x1) * scale} height={(p.y2 - p.y1) * scale}
                    fill="#D8D8D8" stroke="#999" strokeWidth={1} rx={2} />
              <SvgText x={(p.x1 + 30) * scale} y={(p.y1 + (p.y2 - p.y1) / 2 + 5) * scale}
                       fontSize={11 * scale} fill="#444" fontWeight="600">
                {p.label}
              </SvgText>
            </G>
          ))}

          {/* Amenity Markers */}
          {resolvedAmenities.map(a => (
            <AmenityMarker key={`am-${a.id}`}
              x={a.schematic_x * scale} y={a.schematic_y * scale}
              type={a.amenity_type} status={a.current_status}
              onPress={() => onSelectAmenity && onSelectAmenity(a)} />
          ))}

          {/* Vendor Markers */}
          {resolvedVendors.map(v => (
            <VendorMarker key={`ven-${v.id}`}
              x={v.schematic_x * scale} y={v.schematic_y * scale}
              category={v.category} rating={v.average_rating}
              onPress={() => onSelectVendor && onSelectVendor(v)} />
          ))}
        </Svg>
      </ScrollView>
    </ScrollView>
  );
}
