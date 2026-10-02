import React, { useState } from 'react';
import { Platform, Pressable, StatusBar, Text, TextInput, View } from 'react-native';
import { ERPApplication, colors } from '@erp/ui';
import { configureApiBaseURL } from '@erp/api-client';
import { getMobileApiBaseURL } from './config/api';

function DeveloperApiSettings() {
  const [expanded, setExpanded] = useState(false);
  const [url, setUrl] = useState(getMobileApiBaseURL(true));
  const [activeUrl, setActiveUrl] = useState(getMobileApiBaseURL(true));
  const [error, setError] = useState('');

  const apply = () => {
    const candidate = url.trim().replace(/\/$/, '');
    const match = /^http:\/\/(\d{1,3}(?:\.\d{1,3}){3}):3000\/api\/v1$/.exec(candidate);
    const octets = match?.[1].split('.').map(Number) || [];
    const isPrivate =
      octets.length === 4 &&
      octets.every((octet) => octet <= 255) &&
      (octets[0] === 10 ||
        (octets[0] === 192 && octets[1] === 168) ||
        (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31));
    if (!isPrivate) {
      setError('Usa la IP local del PC: http://IP:3000/api/v1');
      return;
    }
    configureApiBaseURL(candidate);
    setActiveUrl(candidate);
    setError('');
    setExpanded(false);
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
            Emulador: 10.0.2.2 · Teléfono: IP LAN del PC
          </Text>
          <TextInput
            accessibilityLabel="URL de la API local"
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
            accessibilityLabel="Aplicar servidor local"
            onPress={apply}
            style={{ backgroundColor: colors.primary, borderRadius: 8, padding: 12 }}
          >
            <Text style={{ color: '#FFFFFF', textAlign: 'center', fontWeight: '700' }}>
              Aplicar servidor local
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export default function App() {
  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} translucent={false} />
      <ERPApplication
        developerSettings={
          __DEV__ && Platform.OS === 'android' ? <DeveloperApiSettings /> : undefined
        }
      />
    </>
  );
}
