"use client"

import { MaterialIcons } from "@expo/vector-icons"
import type React from "react"
import { useState } from "react"
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"

// ✅ Import your real Supabase client
import { supabase } from "@/lib/supabase"

interface SettingsSectionProps {
  title: string
  children: React.ReactNode
}

interface SettingsItemProps {
  icon: keyof typeof MaterialIcons.glyphMap
  title: string
  onPress?: () => void
  rightComponent?: React.ReactNode
  showArrow?: boolean
}

const AdminSettingsScreen: React.FC = () => {
  const [showEmailUpdate, setShowEmailUpdate] = useState<boolean>(false)
  const [newEmail, setNewEmail] = useState<string>("")
  const [showPasswordChange, setShowPasswordChange] = useState<boolean>(false)
  const [newPassword, setNewPassword] = useState<string>("")
  const [isUpdating, setIsUpdating] = useState<boolean>(false)

  const showAlert = (title: string, message = "Feature coming soon!"): void => {
    Alert.alert(title, message)
  }

  const handleSignOut = async () => {
  Alert.alert("Logout", "Are you sure you want to log out?", [
    { text: "Cancel", style: "cancel" },
    {
      text: "Logout",
      onPress: async () => {
        try {
          const { error } = await supabase.auth.signOut()
          if (error) throw error

          Alert.alert("Success", "You have been logged out.")
          router.replace("/welcome") // 👈 send to login (AdminLoginScreen)
        } catch (error: any) {
          Alert.alert("Logout Failed", error.message)
        }
      },
      style: "destructive",
    },
  ])
}
  const handleChangePassword = async () => {
    if (!newPassword) {
      Alert.alert("Error", "Please enter a new password.")
      return
    }

    setIsUpdating(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      Alert.alert("Success", "Your password has been changed successfully.")
      setShowPasswordChange(false)
      setNewPassword("")
    } catch (error: any) {
      Alert.alert("Error", `Failed to change password: ${error.message}`)
    } finally {
      setIsUpdating(false)
    }
  }

 const handleUpdateEmail = async () => {
  if (!newEmail) return
  setIsUpdating(true)
  try {
    const { error } = await supabase.auth.updateUser({ email: newEmail })
    if (error) throw error
    Alert.alert("Success", "Check your new email for confirmation link")
  } catch (err: any) {
    Alert.alert("Error", err.message)
  } finally {
    setIsUpdating(false)
  }
}


  const SettingsSection: React.FC<SettingsSectionProps> = ({ title, children }) => (
    <View style={styles.section}>
      <Text style={styles.sectionHeader}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  )

  const SettingsItem: React.FC<SettingsItemProps> = ({
    icon,
    title,
    onPress,
    rightComponent,
    showArrow = true,
  }) => (
    <TouchableOpacity
      style={styles.settingsItem}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={isUpdating}
    >
      <View style={styles.itemLeft}>
        <MaterialIcons name={icon} size={24} color="#666" style={styles.itemIcon} />
        <Text style={styles.itemTitle}>{title}</Text>
      </View>
      <View style={styles.itemRight}>
        {rightComponent}
        {showArrow && <MaterialIcons name="chevron-right" size={24} color="#ccc" />}
      </View>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile & Account Section */}
        <SettingsSection title="">
          <SettingsItem icon="lock" title="Change Password" onPress={() => setShowPasswordChange(true)} />
          <SettingsItem icon="email" title="Update Email" onPress={() => setShowEmailUpdate(true)} />
             <SettingsItem
            icon="info"
            title="App Version"
            rightComponent={<Text style={styles.versionText}>v1.0.0</Text>}
            showArrow={false}
          />
        </SettingsSection>

        {/* Change Password Form */}
        {showPasswordChange && (
          <View style={styles.formContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Enter new password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
            <TouchableOpacity style={styles.formButton} onPress={handleChangePassword} disabled={isUpdating}>
              <Text style={styles.formButtonText}>
                {isUpdating ? "Updating..." : "Save Password"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowPasswordChange(false)} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Update Email Form */}
        {showEmailUpdate && (
          <View style={styles.formContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Enter new email"
              value={newEmail}
              onChangeText={setNewEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.formButton} onPress={handleUpdateEmail} disabled={isUpdating}>
              <Text style={styles.formButtonText}>
                {isUpdating ? "Updating..." : "Save Email"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowEmailUpdate(false)} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}


      
      </ScrollView>
    </SafeAreaView>
  )
}

// ✅ Styles remain the same (no changes)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e1e5e9",
  },
  headerTitle: { fontSize: 18, fontWeight: "600", color: "#333" },
  scrollView: { flex: 1 },
  section: { marginTop: 24 },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    paddingHorizontal: 16,
    paddingBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionContent: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f4",
  },
  itemLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  itemIcon: { marginRight: 16 },
  itemTitle: { fontSize: 16, color: "#333", fontWeight: "500" },
  itemRight: { flexDirection: "row", alignItems: "center" },
  versionText: { fontSize: 14, color: "#666", marginRight: 8 },
  logoutSection: { paddingHorizontal: 16, paddingVertical: 32 },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dc3545",
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  logoutText: { fontSize: 16, fontWeight: "600", color: "#fff", marginLeft: 8 },
  formContainer: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  textInput: {
    height: 48,
    borderColor: "#e1e5e9",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  formButton: {
    backgroundColor: "#007bff",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  formButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  cancelButton: { marginTop: 8, alignItems: "center" },
  cancelButtonText: { color: "#6c757d", fontSize: 14 },
})

export default AdminSettingsScreen
