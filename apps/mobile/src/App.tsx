import React from 'react';
import { StatusBar } from 'react-native';
import { ERPApplication, colors } from '@erp/ui';
export default function App() {
  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} translucent={false} />
      <ERPApplication />
    </>
  );
}
