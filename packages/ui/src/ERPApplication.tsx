import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { AuthProvider, useAuth } from '@erp/session';
import { apiClient, ApiError } from '@erp/api-client';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LoginScreen } from './screens/LoginScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { UsersScreen } from './screens/UsersScreen';
import { CustomersScreen } from './screens/CustomersScreen';
import { SuppliersScreen } from './screens/SuppliersScreen';
import { CategoriesScreen } from './screens/CategoriesScreen';
import { UnitsScreen } from './screens/UnitsScreen';
import { WarehousesScreen } from './screens/WarehousesScreen';
import { ProductsScreen } from './screens/ProductsScreen';
import { InventoryScreen } from './screens/InventoryScreen';
import { OrdersScreen } from './screens/OrdersScreen';
import { FinanceScreen } from './screens/FinanceScreen';
import { EmployeesScreen } from './screens/EmployeesScreen';
import { ProjectsScreen } from './screens/ProjectsScreen';
import { CrmScreen } from './screens/CrmScreen';
import { ReportsScreen } from './screens/ReportsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { NotificationsScreen } from './screens/NotificationsScreen';
import { RolesScreen } from './screens/RolesScreen';
import { BranchesScreen } from './screens/BranchesScreen';
import { ERPLogo } from './components/ERPLogo';
import { Input } from './components/Input';
import { Modal } from './components/Modal';
import { Button } from './components/Button';
import { Card } from './components/Card';
import { Loading } from './components/Loading';
import { EmptyState, ErrorState, Badge } from './components/DataStates';
import { colors, breakpoints, radius } from './tokens';

export const navigationModules = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    symbol: '▦',
    subtitle: 'Una visión clara de tu operación',
    permission: '',
  },
  {
    key: 'customers',
    label: 'Clientes',
    symbol: '◇',
    subtitle: 'Relaciones que hacen crecer tu empresa',
    permission: 'customers.view',
  },
  {
    key: 'suppliers',
    label: 'Proveedores',
    symbol: '◈',
    subtitle: 'Tu red de abastecimiento',
    permission: 'suppliers.view',
  },
  {
    key: 'categories',
    label: 'Categorías',
    symbol: '▣',
    subtitle: 'Organiza tu catálogo',
    permission: 'categories.view',
  },
  {
    key: 'units',
    label: 'Unidades',
    symbol: '◫',
    subtitle: 'Unidades de medida',
    permission: 'units.view',
  },
  {
    key: 'products',
    label: 'Productos',
    symbol: '□',
    subtitle: 'Tu catálogo, en un solo lugar',
    permission: 'products.view',
  },
  {
    key: 'warehouses',
    label: 'Almacenes',
    symbol: '▤',
    subtitle: 'Ubicaciones de inventario',
    permission: 'warehouses.view',
  },
  {
    key: 'inventory',
    label: 'Inventario',
    symbol: '▤',
    subtitle: 'Existencias y movimientos',
    permission: 'inventory.view',
  },
  {
    key: 'sales',
    label: 'Ventas',
    symbol: '↗',
    subtitle: 'De la oportunidad al cobro',
    permission: 'sales.view',
  },
  {
    key: 'purchases',
    label: 'Compras',
    symbol: '↙',
    subtitle: 'De la solicitud a la recepción',
    permission: 'purchases.view',
  },
  {
    key: 'finance',
    label: 'Finanzas',
    symbol: '◎',
    subtitle: 'Ingresos, gastos y pagos',
    permission: 'finances.view',
  },
  {
    key: 'hr',
    label: 'Empleados',
    symbol: '♙',
    subtitle: 'Personas de tu empresa',
    permission: 'hr.view',
  },
  {
    key: 'projects',
    label: 'Proyectos',
    symbol: '▧',
    subtitle: 'Trabajo en marcha',
    permission: 'projects.view',
  },
  {
    key: 'crm',
    label: 'CRM',
    symbol: '◉',
    subtitle: 'Leads y oportunidades',
    permission: 'crm.view',
  },
  {
    key: 'reports',
    label: 'Reportes',
    symbol: '▥',
    subtitle: 'Información para decidir',
    permission: 'reports.view',
  },
  {
    key: 'users',
    label: 'Usuarios',
    symbol: '♧',
    subtitle: 'Personas y accesos de tu equipo',
    permission: 'users.view',
  },
  {
    key: 'roles',
    label: 'Roles',
    symbol: '⌘',
    subtitle: 'Permisos y acceso de tu equipo',
    permission: 'roles.view',
  },
  {
    key: 'branches',
    label: 'Sucursales',
    symbol: '⌂',
    subtitle: 'Ubicaciones de tu empresa',
    permission: 'branches.view',
  },
  {
    key: 'settings',
    label: 'Configuración',
    symbol: '⚙',
    subtitle: 'Preferencias de tu espacio',
    permission: 'settings.view',
  },
];
export function SidebarItem({
  label,
  symbol,
  selected,
  compact,
  onPress,
}: {
  label: string;
  symbol: string;
  selected: boolean;
  compact?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.navItem,
        selected && styles.navSelected,
        pressed && { opacity: 0.7 },
        compact && { justifyContent: 'center' },
      ]}
    >
      <Text style={[styles.navSymbol, selected && { color: colors.primary }]}>{symbol}</Text>
      {!compact && (
        <Text style={[styles.navLabel, selected && { color: colors.primary, fontWeight: '700' }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
function ModuleScreen({ module }: { module: (typeof navigationModules)[number] }) {
  const [state, setState] = useState<'loading' | 'pending' | 'error'>('loading'),
    [message, setMessage] = useState(''),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setState('loading');
    apiClient
      .get('/' + module.key)
      .then(() => {
        if (active) {
          setState('error');
          setMessage('La vista de este módulo aún no está disponible.');
        }
      })
      .catch((failure: unknown) => {
        if (!active) return;
        if (failure instanceof ApiError && failure.status === 501) setState('pending');
        else {
          setState('error');
          setMessage(
            failure instanceof Error ? failure.message : 'No se pudieron cargar los datos',
          );
        }
      });
    return () => {
      active = false;
    };
  }, [module.key, attempt]);
  return (
    <View style={{ gap: 20 }}>
      <Text accessibilityRole="header" style={styles.screenTitle}>
        {module.label}
      </Text>
      <Text style={styles.muted}>{module.subtitle}</Text>
      <Card>
        {state === 'loading' ? (
          <Loading />
        ) : state === 'pending' ? (
          <>
            <Badge label="Próximamente" />
            <EmptyState
              title="Estamos preparando este espacio"
              message="El módulo estará disponible cuando sus funciones estén listas."
            />
          </>
        ) : (
          <ErrorState message={message} onRetry={() => setAttempt(attempt + 1)} />
        )}
      </Card>
    </View>
  );
}
function Workspace({
  developerSettings,
  checkBackendHealth,
}: {
  developerSettings?: React.ReactNode;
  checkBackendHealth?: () => Promise<{ status?: number; success: boolean; errorCode?: string }>;
}) {
  const { user, isAuthenticated, logout } = useAuth();
  const { width } = useWindowDimensions(),
    insets = useSafeAreaInsets();
  const mobile = width < breakpoints.mobile,
    compact = width < breakpoints.desktop;
  const [selected, setSelected] = useState('dashboard'),
    [search, setSearch] = useState(''),
    [drawer, setDrawer] = useState(false);
  const [notifications, setNotifications] = useState(false),
    [logoutError, setLogoutError] = useState('');
  const allowed = navigationModules.filter(
    (module) => !module.permission || user?.permissions.includes(module.permission),
  );
  const current = allowed.find((module) => module.key === selected) || allowed[0];
  const searchResults = allowed.filter((module) =>
    module.label.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const navigate = (key: string) => {
    setSelected(key);
    setSearch('');
    setDrawer(false);
  };
  const signOut = async () => {
    try {
      await logout();
    } catch {
      setLogoutError(
        'Cerraste la sesión en este dispositivo. No se pudo confirmar la revocación en el servidor.',
      );
    }
  };
  if (!isAuthenticated)
    return (
      <View style={{ flex: 1 }}>
        <LoginScreen developerSettings={developerSettings} checkBackendHealth={checkBackendHealth} />
        {logoutError && (
          <View style={{ padding: 16 }}>
            <ErrorState message={logoutError} />
          </View>
        )}
      </View>
    );
  const bottom = ['dashboard', 'products', 'inventory', 'customers']
    .map((key) => allowed.find((module) => module.key === key))
    .filter((module): module is (typeof navigationModules)[number] => !!module);
  const navList = (collapsed = false) => (
    <View style={{ gap: 4 }}>
      {allowed.map((module) => (
        <SidebarItem
          key={module.key}
          label={module.label}
          symbol={module.symbol}
          selected={current.key === module.key}
          compact={collapsed}
          onPress={() => navigate(module.key)}
        />
      ))}
    </View>
  );
  return (
    <View style={[styles.shell, { paddingTop: insets.top }]}>
      {!mobile && (
        <View style={[styles.sidebar, compact && { width: 88, paddingHorizontal: 12 }]}>
          <View style={[styles.sidebarBrand, compact && { justifyContent: 'center' }]}>
            <ERPLogo size="sm" />
            {!compact && <Text style={styles.brandText}>ERP Empresarial</Text>}
          </View>
          {!compact && <Text style={styles.navCaption}>ESPACIO DE TRABAJO</Text>}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
            {navList(compact)}
          </ScrollView>
          <Button
            title={compact ? 'Salir' : 'Cerrar sesión'}
            accessibilityLabel="Cerrar sesión"
            onPress={() => {
              void signOut();
            }}
            variant="outline"
          />
          {!compact && <Text style={styles.sidebarFoot}>Una identidad. Toda tu operación.</Text>}
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={[styles.header, mobile && styles.mobileHeader]}>
          {mobile && <ERPLogo size="sm" />}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.company} numberOfLines={1}>
              {user?.companyName || 'Empresa activa'}
            </Text>
            <Text style={styles.muted} numberOfLines={1}>
              {mobile ? 'ERP Empresarial' : 'Espacio empresarial'}
            </Text>
          </View>
          {!mobile && (
            <View style={{ width: compact ? 190 : 260 }}>
              <Input
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar un módulo"
                accessibilityLabel="Buscar un módulo"
                style={{ backgroundColor: colors.background }}
              />
            </View>
          )}
          {user?.permissions.includes('notifications.view') && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Notificaciones"
              style={styles.headerAction}
              onPress={() => setNotifications(true)}
            >
              <Text style={{ fontSize: 20, color: colors.textSecondary }}>♧</Text>
            </Pressable>
          )}
          <View accessibilityLabel={'Usuario: ' + user?.name} style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name.slice(0, 2).toUpperCase()}</Text>
          </View>
          {!mobile && !compact && (
            <View>
              <Text style={styles.username}>{user?.name}</Text>
              <Text style={styles.muted}>Mi cuenta</Text>
            </View>
          )}
        </View>
        {search.trim() !== '' && (
          <View style={styles.searchResults}>
            {searchResults.length ? (
              searchResults.map((module) => (
                <Button
                  key={module.key}
                  title={'Ir a ' + module.label}
                  onPress={() => navigate(module.key)}
                  variant="outline"
                />
              ))
            ) : (
              <Text style={styles.muted}>No se encontraron módulos.</Text>
            )}
          </View>
        )}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.main,
            mobile && { padding: 16 },
            { paddingBottom: mobile ? 24 : 40 },
          ]}
        >
          <View style={styles.mainInner}>
            {current.key === 'dashboard' ? (
              <DashboardScreen modules={allowed} onNavigate={navigate} />
            ) : current.key === 'users' ? (
              <UsersScreen />
            ) : current.key === 'customers' ? (
              <CustomersScreen />
            ) : current.key === 'suppliers' ? (
              <SuppliersScreen />
            ) : current.key === 'categories' ? (
              <CategoriesScreen />
            ) : current.key === 'units' ? (
              <UnitsScreen />
            ) : current.key === 'warehouses' ? (
              <WarehousesScreen />
            ) : current.key === 'products' ? (
              <ProductsScreen />
            ) : current.key === 'inventory' ? (
              <InventoryScreen />
            ) : current.key === 'sales' ? (
              <OrdersScreen kind="sales" />
            ) : current.key === 'purchases' ? (
              <OrdersScreen kind="purchases" />
            ) : current.key === 'finance' ? (
              <FinanceScreen />
            ) : current.key === 'hr' ? (
              <EmployeesScreen />
            ) : current.key === 'projects' ? (
              <ProjectsScreen />
            ) : current.key === 'crm' ? (
              <CrmScreen />
            ) : current.key === 'reports' ? (
              <ReportsScreen />
            ) : current.key === 'settings' ? (
              <SettingsScreen />
            ) : current.key === 'roles' ? (
              <RolesScreen />
            ) : current.key === 'branches' ? (
              <BranchesScreen />
            ) : (
              <ModuleScreen key={current.key} module={current} />
            )}
          </View>
        </ScrollView>
        {mobile && (
          <View style={[styles.bottomNav, { paddingBottom: Math.max(8, insets.bottom) }]}>
            {bottom.map((module) => (
              <Pressable
                key={module.key}
                onPress={() => navigate(module.key)}
                accessibilityRole="button"
                accessibilityLabel={module.label}
                accessibilityState={{ selected: current.key === module.key }}
                style={styles.bottomItem}
              >
                <Text
                  style={[
                    styles.navSymbol,
                    current.key === module.key && { color: colors.primary },
                  ]}
                >
                  {module.symbol}
                </Text>
                <Text
                  style={[
                    styles.bottomLabel,
                    current.key === module.key && { color: colors.primary },
                  ]}
                >
                  {module.key === 'dashboard' ? 'Inicio' : module.label}
                </Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => setDrawer(true)}
              accessibilityRole="button"
              accessibilityLabel="Más módulos"
              style={styles.bottomItem}
            >
              <Text style={styles.navSymbol}>☰</Text>
              <Text style={styles.bottomLabel}>Más</Text>
            </Pressable>
          </View>
        )}
      </View>
      <Modal visible={drawer} title="Tu espacio de trabajo" onClose={() => setDrawer(false)}>
        <Input value={search} onChangeText={setSearch} placeholder="Buscar un módulo" />
        <ScrollView style={{ maxHeight: 340 }}>
          {searchResults.map((module) => (
            <SidebarItem
              key={module.key}
              label={module.label}
              symbol={module.symbol}
              selected={current.key === module.key}
              onPress={() => navigate(module.key)}
            />
          ))}
        </ScrollView>
        <Button
          title="Cerrar sesión"
          onPress={() => {
            void signOut();
            setDrawer(false);
          }}
          variant="outline"
        />
      </Modal>
      <Modal visible={notifications} title="Notificaciones" onClose={() => setNotifications(false)}>
        <NotificationsScreen />
      </Modal>
    </View>
  );
}
export function ERPApplication({
  developerSettings,
  checkBackendHealth,
}: {
  developerSettings?: React.ReactNode;
  checkBackendHealth?: () => Promise<{ status?: number; success: boolean; errorCode?: string }>;
}) {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Workspace developerSettings={developerSettings} checkBackendHealth={checkBackendHealth} />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
const styles = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row', backgroundColor: colors.background },
  sidebar: {
    width: 252,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  sidebarBrand: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 32 },
  brandText: { fontSize: 17, lineHeight: 22, fontWeight: '700', color: colors.textPrimary },
  navCaption: {
    fontSize: 10,
    letterSpacing: 1.7,
    color: colors.textSecondary,
    marginBottom: 16,
    paddingLeft: 12,
  },
  navItem: {
    minHeight: 48,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.medium,
  },
  navSelected: { backgroundColor: colors.primaryLight },
  navSymbol: { width: 24, textAlign: 'center', fontSize: 21, color: colors.textSecondary },
  navLabel: { fontSize: 14, color: colors.textSecondary },
  sidebarFoot: { fontSize: 10, color: colors.textSecondary, marginTop: 20, textAlign: 'center' },
  header: {
    minHeight: 100,
    paddingHorizontal: 32,
    paddingTop: 16,
    paddingBottom: 0,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  mobileHeader: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8, minHeight: 80, gap: 8 },
  company: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  muted: { fontSize: 12, lineHeight: 20, color: colors.textSecondary },
  headerAction: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },
  avatarText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  username: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  main: { padding: 32, alignItems: 'center' },
  mainInner: { width: '100%', maxWidth: 1400 },
  screenTitle: { fontSize: 30, lineHeight: 38, color: colors.textPrimary, fontWeight: '700' },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: 8,
  },
  bottomItem: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: 4 },
  bottomLabel: { fontSize: 10, color: colors.textSecondary, fontWeight: '600' },
  searchResults: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.surface,
    padding: 16,
    gap: 8,
  },
});
