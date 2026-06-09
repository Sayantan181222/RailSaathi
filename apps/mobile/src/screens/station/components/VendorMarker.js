import React from 'react';
import { G, Rect, Text as SvgText, Circle } from 'react-native-svg';

export default function VendorMarker({ x, y, category, rating, onPress }) {
  const icon = '⭐';

  return (
    <G onPress={onPress} x={x} y={y}>
      <Circle r={22} fill="transparent" />
      <Rect x={-12} y={-12} width={24} height={24} fill="#1A3557" rx={4} />
      <SvgText fontSize={10} textAnchor="middle" y={3}>
        {icon}
      </SvgText>
      <SvgText fontSize={8} textAnchor="middle" y={22} fill="#1A3557" fontWeight="bold">
        {rating ? rating.toFixed(1) : ''}
      </SvgText>
    </G>
  );
}
