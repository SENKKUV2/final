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
      name: 'messages', 
      title: 'Messages', 
      icon: 'message',
      route: '/(drawer)/messages'
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
            backgroundColor: '#00355f', // brand blue header
            elevation: 4,
            shadowOpacity: 0.1,
            shadowColor: '#001f33',
            borderBottomWidth: 1,
            borderBottomColor: '#eec218', // accent gold
          },
          headerTintColor: '#ffffff', // white header icons/text
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 18,
            color: '#ffffff',
          },
          drawerStyle: {
            backgroundColor: '#f4f7fb', // light background for drawer
            width: 280,
          },
          drawerActiveTintColor: '#00355f', // blue text for active item
          drawerInactiveTintColor: '#666',
          drawerActiveBackgroundColor: '#e6edf4', // soft blue highlight
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
          name="messages"
          options={{
            drawerLabel: 'Messages',
            title: 'Customer Messages',
            drawerIcon: ({ color }) => (
              <MaterialIcons name="message" size={24} color={color} />
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

// ✅ Styles updated for AP Cebu Tours color palette
const styles = StyleSheet.create({
  drawerContainer: { flex: 1, backgroundColor: '#f4f7fb' },
  drawerHeader: {
    padding: 20,
    backgroundColor: '#00355f',
    borderBottomWidth: 1,
    borderBottomColor: '#eec218',
    alignItems: 'center',
    marginBottom: 10,
  },
  drawerHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 10,
  },
  drawerHeaderSubtitle: {
    fontSize: 14,
    color: '#eec218',
    marginTop: 4,
  },
  drawerContent: { paddingTop: 10 },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginHorizontal: 10,
    borderRadius: 8,
    marginBottom: 2,
  },
  drawerItemActive: {
    backgroundColor: '#e6edf4',
    borderLeftWidth: 4,
    borderLeftColor: '#00355f',
  },
  drawerItemText: {
    fontSize: 16,
    marginLeft: 15,
    color: '#444',
    fontWeight: '500',
  },
  drawerItemTextActive: {
    color: '#00355f',
    fontWeight: '600',
  },
  settingsItem: {
    borderTopWidth: 1,
    borderTopColor: '#eec218',
    marginTop: 10,
    paddingTop: 20,
  },
  drawerFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eec218',
    alignItems: 'center',
  },
  drawerFooterText: {
    fontSize: 12,
    color: '#999',
  },
});
