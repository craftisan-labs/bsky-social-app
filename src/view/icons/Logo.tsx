import React from 'react'
import {type TextProps} from 'react-native'
import {type SvgProps} from 'react-native-svg'
import {Image} from 'expo-image'

import {useKawaiiMode} from '#/state/preferences/kawaii'
import {flatten} from '#/alf'

type Props = {
  fill?: string
  style?: TextProps['style']
} & Omit<SvgProps, 'style'>

export const Logo = React.forwardRef(function LogoImpl(props: Props, ref) {
  const {...rest} = props
  const styles = flatten(props.style)
  // @ts-ignore it's fiiiiine
  const size = parseInt(rest.width || 32, 10)

  const isKawaii = useKawaiiMode()

  if (isKawaii) {
    return (
      <Image
        source={
          size > 100
            ? require('../../../assets/kawaii.png')
            : require('../../../assets/kawaii_smol.png')
        }
        accessibilityLabel="BlueFly"
        accessibilityHint=""
        accessibilityIgnoresInvertColors
        style={[{height: size, aspectRatio: 1.4}]}
      />
    )
  }

  // BlueFly logo - using PNG image with transparent background
  return (
    <Image
      // @ts-ignore it's fiiiiine
      ref={ref}
      source={require('../../../assets/logo-no-bg.png')}
      accessibilityLabel="BlueFly"
      accessibilityHint=""
      accessibilityIgnoresInvertColors
      style={[{width: size, height: size}, styles]}
    />
  )
})
