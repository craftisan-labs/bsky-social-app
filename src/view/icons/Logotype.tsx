import {Text, type TextStyle} from 'react-native'

import {usePalette} from '#/lib/hooks/usePalette'

type Props = {
  fill?: string
  width?: number | string
  style?: TextStyle
}

export function Logotype({fill, width, style}: Props) {
  const pal = usePalette('default')
  // Calculate font size based on width (approximate to match original sizing)
  const size = typeof width === 'string' ? parseInt(width, 10) : width || 80
  const fontSize = size * 0.22 // Approximate ratio for text to fit similar width

  return (
    <Text
      style={[
        {
          fontWeight: '700',
          fontSize,
          color: fill || pal.text.color,
          letterSpacing: -0.5,
        },
        style,
      ]}
      accessibilityLabel="BlueFly"
      accessibilityHint="">
      BlueFly
    </Text>
  )
}
