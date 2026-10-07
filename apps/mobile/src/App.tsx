import React, { useState } from 'react';
import { NativeModules, Platform, Pressable, StatusBar, Text, TextInput, View } from 'react-native';
import { ERPApplication, colors } from '@erp/ui';
import { configureApiBaseURL } from '@erp/api-client';
import {
  initializeMobileApi,
  isMobileDevelopmentBuild,
  normalizeMobileApiURL,
  shouldShowDeveloperApiSettings,
} from './config/api';

const isLocal = NativeModules.ERPBuildMode?.isLocal === true;
const isDevelopment = isMobileDevelopmentBuild(
  __DEV__,
  NativeModules.ERPBuildMode?.isDebug === true,
);
let initialApiUrl = '';
let initialApiError = '';
try {
  initialApiUrl = initializeMobileApi({
    isDev: isDevelopment,
    isLocal,
    useLocalEmulatorApi: NativeModules.ERPBuildMode?.useLocalEmulatorApi === true,
    remoteUrl: NativeModules.ERPBuildMode?.apiBaseUrl,
    platform: Platform.OS as 'android' | 'ios' | 'web',
  });
} catch (error) {
  initialApiError = error instanceof Error ? error.message : 'Configuración de API inválida.';
}

function DeveloperApiSettings() {
  const [expanded, setExpanded] = useState(false);
  const [url, setUrl] = useState(initialApiUrl);
  const [activeUrl, setActiveUrl] = useState(initialApiUrl);
  const [error, setError] = useState('');

  const apply = () => {
    try {
      const candidate = normalizeMobileApiURL(url, isDevelopment);
      configureApiBaseURL(candidate);
      setUrl(candidate);
      setActiveUrl(candidate);
      setError('');
      setExpanded(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'URL inválida.');
    }
  };

  return (
    <View style={{ marginBottom: 20 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Configurar servidor de desarrollo"
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={{ color: colors.primary, fontWeight: '600' }}>
          Servidor de desarrollo: {activeUrl}
        </Text>
      </Pressable>
      {expanded && (
        <View style={{ marginTop: 10, gap: 8 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
            Emulador: 10.0.2.2 · Teléfono: IP LAN del PC · Remoto: HTTPS
          </Text>
          <TextInput
            accessibilityLabel="URL de la API"
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 8,
              color: colors.textPrimary,
              paddingHorizontal: 12,
              minHeight: 44,
            }}
          />
          {error ? <Text style={{ color: '#B42318' }}>{error}</Text> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Aplicar servidor"
            onPress={apply}
            style={{ backgroundColor: colors.primary, borderRadius: 8, padding: 12 }}
          >
            <Text style={{ color: '#FFFFFF', textAlign: 'center', fontWeight: '700' }}>
              Aplicar servidor
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export default function App() {
  if (initialApiError) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          padding: 24,
          backgroundColor: colors.background,
        }}
      >
        <Text style={{ color: '#B42318', fontSize: 18, fontWeight: '700' }}>
          Error de configuración de API
        </Text>
        <Text style={{ color: colors.textPrimary, marginTop: 12 }}>{initialApiError}</Text>
      </View>
    );
  }
  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} translucent={false} />
      <ERPApplication
        developerSettings={
          shouldShowDeveloperApiSettings({
            isDev: isDevelopment,
            isLocal,
            showDeveloperApiSettings: NativeModules.ERPBuildMode?.showDeveloperApiSettings === true,
            platform: Platform.OS as 'android' | 'ios' | 'web',
          }) ? (
            <DeveloperApiSettings />
          ) : undefined
        }
      />
    </>
  );
}
