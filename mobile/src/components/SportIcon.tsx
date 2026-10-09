import { View, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { sportColor, type SportId } from '@/theme/tokens'

const ICONS: Record<SportId, keyof typeof Ionicons.glyphMap> = {
  run: 'walk-outline',
  bike: 'bicycle-outline',
  swim: 'water-outline',
  strength: 'barbell-outline',
  recovery: 'leaf-outline',
  hyrox: 'flash-outline',
}

export function SportIcon({
  sport,
  size = 32,
}: {
  sport: SportId
  size?: number
}) {
  const c = sportColor(sport)
  return (
    <View
      style={[
        styles.box,
        {
          width: size,
          height: size,
          borderRadius: 8,
          backgroundColor: mixSoft(c),
        },
      ]}
    >
      <Ionicons name={ICONS[sport]} size={Math.round(size * 0.45)} color={c} />
    </View>
  )
}

function mixSoft(hex: string) {
  // approximate web color-mix(in srgb, sport 18%, white)
  return `${hex}2E`
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  },
})
