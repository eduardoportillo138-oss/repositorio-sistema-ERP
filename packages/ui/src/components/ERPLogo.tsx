import React from 'react';
import { Image } from 'react-native';
import logo from '../assets/logo/logo.png';
const sizes = { sm: 52, md: 84, lg: 160 };
export function ERPLogo({ size = 'md' }: { size?: keyof typeof sizes }) {
  return (
    <Image
      source={typeof logo === 'string' ? { uri: logo } : logo}
      resizeMode="contain"
      style={{ width: sizes[size], height: sizes[size] }}
      accessibilityLabel="ERP Empresarial: castor en un baúl"
    />
  );
}
