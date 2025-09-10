// app/(drawer)/_layout.tsx
import { supabase } from '@/lib/supabase';
import { MaterialIcons } from '@expo/vector-icons';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { router, usePathname } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { Alert, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// ✅ Custom Drawer Content
function CustomDrawerContent(props: any) {
  const pathname = usePathname();

  const menuItems = [
    { 
      name: 'index', 
      title: 'Dashboard', 
      icon: 'dashboard',
      route: '/(drawer)/'
    },
    { 
      name: 'bookings', 
      title: 'Bookings', 
      icon: 'book-online',
      route: '/(drawer)/bookings'
    },
    { 
      name: 'manage-tours', 
      title: 'Manage Tours', 
      icon: 'map',
      route: '/(drawer)/manage-tours'
    },
    { 
      name: 'reports', 
      title: 'Reports', 
      icon: 'assessment',
      route: '/(drawer)/reports'
    },
    { 
      name: 'logout', 
      title: 'Logout', 
      icon: 'logout',
      route: '/welcome' // ✅ correct path for your login screen
    }
  ];

  // ✅ Logout function
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut(); // clear session
      router.replace('/welcome');    // redirect correctly
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to log out. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.drawerContainer}>
      <View style={styles.drawerHeader}>
        <MaterialIcons name="admin-panel-settings" size={40} color="#f57c00" />
        <Text style={styles.drawerHeaderTitle}>Panel</Text>
        <Text style={styles.drawerHeaderSubtitle}>AP Cebu Tours</Text>
      </View>

      <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerContent}>
        {menuItems.map((item) => {
          const isActive =
            pathname === item.route ||
            (item.name === 'index' && pathname === '/(drawer)');

          return (
            <TouchableOpacity
              key={item.name}
              style={[
                styles.drawerItem,
                isActive && styles.drawerItemActive
              ]}
              onPress={() => {
                if (item.name === 'logout') {
                  handleLogout(); // ✅ call logout function
                } else {
                  router.push(item.route as any);
                }
                props.navigation.closeDrawer();
              }}
            >
              <MaterialIcons
                name={item.icon as any}
                size={24}
                color={isActive ? '#f57c00' : '#666'}
              />
              <Text
                style={[
                  styles.drawerItemText,
                  isActive && styles.drawerItemTextActive
                ]}
              >
                {item.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </DrawerContentScrollView>

      {/* Settings Item */}
      <TouchableOpacity
        style={[
          styles.drawerItem,
          styles.settingsItem,
          pathname === '/(drawer)/settings' && styles.drawerItemActive
        ]}
        onPress={() => {
          router.push('/(drawer)/settings');
          props.navigation.closeDrawer();
        }}
      >
        <MaterialIcons
          name="settings"
          size={24}
          color={pathname === '/(drawer)/settings' ? '#f57c00' : '#666'}
        />
        <Text
          style={[
            styles.drawerItemText,
            pathname === '/(drawer)/settings' && styles.drawerItemTextActive
          ]}
        >
          Settings
        </Text>
      </TouchableOpacity>

      <View style={styles.drawerFooter}>
        <Text style={styles.drawerFooterText}>Version 1.0.0</Text>
      </View>
    </SafeAreaView>
  );
}

export default function DrawerLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: '#faf9f7',
            elevation: 4,
            shadowOpacity: 0.1,
            shadowColor: '#f57c00',
            borderBottomWidth: 1,
            borderBottomColor: '#ffcc80',
          },
          headerTintColor: '#f57c00',
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 18,
            color: '#333',
          },
          drawerStyle: {
            backgroundColor: '#faf9f7',
            width: 280,
          },
          drawerActiveTintColor: '#f57c00',
          drawerInactiveTintColor: '#666',
          swipeEnabled: true,
          drawerPosition: 'left',
        }}
      >
        {/* ✅ Drawer Screens */}
        <Drawer.Screen
          name="index"
          options={{
            drawerLabel: 'Dashboard',
            title: 'Dashboard',
            drawerIcon: ({ color }) => (
              <MaterialIcons name="dashboard" size={24} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="bookings"
          options={{
            drawerLabel: 'Bookings',
            title: 'Bookings Management',
            drawerIcon: ({ color }) => (
              <MaterialIcons name="book-online" size={24} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="manage-tours"
          options={{
            drawerLabel: 'Manage Tours',
            title: 'Tour Management',
            drawerIcon: ({ color }) => (
              <MaterialIcons name="map" size={24} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="reports"
          options={{
            drawerLabel: 'Reports',
            title: 'Analytics & Reports',
            drawerIcon: ({ color }) => (
              <MaterialIcons name="assessment" size={24} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="settings"
          options={{
            drawerLabel: 'Settings',
            title: 'Settings',
            drawerIcon: ({ color }) => (
              <MaterialIcons name="settings" size={24} color={color} />
            ),
          }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}

// ✅ Styles unchanged...
const styles = StyleSheet.create({
  drawerContainer: { flex: 1, backgroundColor: '#faf9f7' },
  drawerHeader: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ffcc80', alignItems: 'center', marginBottom: 10 },
  drawerHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 10 },
  drawerHeaderSubtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  drawerContent: { paddingTop: 10 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 20, marginHorizontal: 10, borderRadius: 8, marginBottom: 2 },
  drawerItemActive: { backgroundColor: '#fff3e0', borderLeftWidth: 4, borderLeftColor: '#f57c00' },
  drawerItemText: { fontSize: 16, marginLeft: 15, color: '#666', fontWeight: '500' },
  drawerItemTextActive: { color: '#f57c00', fontWeight: '600' },
  settingsItem: { borderTopWidth: 1, borderTopColor: '#ffcc80', marginTop: 10, paddingTop: 20 },
  drawerFooter: { padding: 20, borderTopWidth: 1, borderTopColor: '#ffcc80', alignItems: 'center' },
  drawerFooterText: { fontSize: 12, color: '#999' },
});
