import React from 'react';
import { ERPApplication } from '@erp/ui';

/** Browser preview uses index.web.tsx for its API URL; native builds use App.tsx. */
export default function App() {
  return <ERPApplication />;
}
