import React, { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from "react-native-reanimated";

type Message = { id: string; sender: "user" | "admin"; message: string; created_at: string };
type Chat = { id: string; user_id?: string; title: string; timestamp?: string; lastMessage?: string; unreadCount?: number; email?: string };

export default function MessagesScreen() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [notification, setNotification] = useState<{ type: string; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const isMobile = Dimensions.get("window").width < 768;
  const translateY = useSharedValue(0);
  const isRefreshing = useSharedValue(false);

  useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window }) => setWindowWidth(window.width));
    return () => sub?.remove();
  }, []);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!selectedChat) return;

    const filter = selectedChat.user_id
      ? `user_id=eq.${selectedChat.user_id}`
      : `email=eq.${selectedChat.email}`;

    const subscription = supabase
      .channel("support_messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          // Only add the message if it wasn't sent by the admin locally
          if (newMessage.sender !== "admin") {
            setMessages((prev) =>
              prev.some((msg) => msg.id === newMessage.id)
                ? prev
                : [...prev, newMessage]
            );
            setChats((prev) => {
              const index = prev.findIndex((chat) => chat.id === selectedChat.id);
              if (index >= 0) {
                const updated = [...prev];
                updated[index] = {
                  ...updated[index],
                  lastMessage: newMessage.message,
                  timestamp: newMessage.created_at,
                  unreadCount: (updated[index].unreadCount || 0) + 1,
                };
                return [
                  updated[index],
                  ...updated.slice(0, index),
                  ...updated.slice(index + 1),
                ];
              }
              return prev;
            });
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [selectedChat]);

  const fetchChats = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("support_messages")
        .select("user_id, email, created_at, message, sender")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!data?.length) return setChats([]);

      const chatMap = new Map<string, Chat>();
      data.forEach(({ user_id, email, created_at, message, sender }) => {
        const id = user_id || email || "anonymous";
        if (!chatMap.has(id)) {
          chatMap.set(id, {
            id,
            user_id,
            title: email || "Anonymous User",
            email,
            timestamp: created_at,
            lastMessage: message,
            unreadCount: 0,
          });
        } else {
          const chat = chatMap.get(id)!;
          if (new Date(created_at) > new Date(chat.timestamp!)) {
            chat.lastMessage = message;
            chat.timestamp = created_at;
          }
          if (!chat.email && email) {
            chat.email = email;
            chat.title = email;
          }
        }
      });

      for (const [chatId, chat] of chatMap.entries()) {
        const chatMessages = data
          .filter((msg) => (msg.user_id || msg.email) === chatId)
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        let unreadCount = 0;
        for (const msg of chatMessages) {
          if (msg.sender === "user") unreadCount++;
          else break;
        }
        chat.unreadCount = unreadCount;
      }

      setChats(
        Array.from(chatMap.values()).sort(
          (a, b) =>
            new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime()
        )
      );
    } catch (error) {
      setNotification({ type: "error", message: "Failed to load chats" });
    } finally {
      setLoading(false);
      isRefreshing.value = false;
    }
  };

  useEffect(() => {
    fetchChats();
  }, []);

  const openChat = async (chat: Chat) => {
    setSelectedChat(chat);
    setNotification(null);
    setLoading(true);
    setChats((prev) =>
      prev.map((c) => (c.id === chat.id ? { ...c, unreadCount: 0 } : c))
    );
    try {
      const query = chat.user_id
        ? supabase.from("support_messages").select("*").eq("user_id", chat.user_id)
        : supabase
            .from("support_messages")
            .select("*")
            .eq("email", chat.email);
      const { data, error } = await query.order("created_at", { ascending: true });
      if (error) throw error;
      setMessages(data as Message[]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      setNotification({ type: "error", message: "Failed to load messages" });
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedChat || !reply.trim() || sending) return;
    setSending(true);
    const messageText = reply.trim();
    const tempId = `temp_${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      sender: "admin",
      message: messageText,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setReply("");
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const { data, error } = await supabase
        .from("support_messages")
        .insert([
          {
            sender: "admin",
            message: messageText,
            user_id: selectedChat.user_id,
            email: selectedChat.email,
          },
        ])
        .select();
      if (error) throw error;
      if (data?.[0]) {
        setMessages((prev) => [
          ...prev.filter((msg) => msg.id !== tempId),
          data[0] as Message,
        ]);
        setChats((prev) =>
          prev.map((chat) =>
            chat.id === selectedChat.id
              ? { ...chat, lastMessage: messageText, timestamp: data[0].created_at }
              : chat
          )
        );
        setNotification({ type: "success", message: "Message sent" });
        setTimeout(() => setNotification(null), 2000);
      }
    } catch (error) {
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      setReply(messageText);
      setNotification({ type: "error", message: "Failed to send message" });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteChat = async (chat: Chat) => {
    Alert.alert(
      "Delete Conversation",
      `Are you sure you want to delete the conversation with ${chat.title}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("support_messages")
                .delete()
                .eq(chat.user_id ? "user_id" : "email", chat.user_id || chat.email);
              if (error) throw error;
              setChats((prev) => prev.filter((c) => c.id !== chat.id));
              if (selectedChat?.id === chat.id) {
                setSelectedChat(null);
                setMessages([]);
              }
              setNotification({ type: "success", message: "Conversation deleted" });
              setTimeout(() => setNotification(null), 2000);
            } catch (error) {
              setNotification({
                type: "error",
                message: "Failed to delete conversation",
              });
            }
          },
        },
      ]
    );
  };

  const formatTime = (dateString?: string): string => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      const diffInHours = (Date.now() - date.getTime()) / (1000 * 60 * 60);
      return diffInHours < 24
        ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : diffInHours < 168
        ? date.toLocaleDateString([], { weekday: "short" })
        : date.toLocaleDateString([], { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0 && !selectedChat) {
        translateY.value = Math.min(event.translationY, 100);
        if (event.translationY > 80 && !isRefreshing.value) {
          isRefreshing.value = true;
          runOnJS(fetchChats)();
        }
      }
    })
    .onEnd(() => {
      translateY.value = withSpring(0);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const ChatListItem = ({ item }: { item: Chat }) => (
    <View
      style={[s.chatItem, selectedChat?.id === item.id && s.chatItemSelected]}
    >
      <TouchableOpacity style={s.chatContent} onPress={() => openChat(item)}>
        <View style={s.avatar}>
          <MaterialIcons name="person" size={28} color="#3b82f6" />
          {item.unreadCount! > 0 && (
            <View style={s.unreadIndicator}>
              <Text style={s.unreadIndicatorText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
        <View style={s.chatInfo}>
          <View style={s.chatHeader}>
            <Text style={s.chatTitle}>{item.email || item.title}</Text>
            <Text style={s.chatTime}>{formatTime(item.timestamp)}</Text>
          </View>
          <Text style={s.chatSubtitle} numberOfLines={2}>
            {item.lastMessage || "No messages yet"}
          </Text>
          {item.user_id && (
            <Text style={s.userIdBadge}>
              ID: {item.user_id.slice(0, 8)}...
            </Text>
          )}
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => handleDeleteChat(item)}
        style={s.deleteButton}
      >
        <MaterialIcons name="delete" size={20} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );

  const MessageItem = ({ item }: { item: Message }) => (
    <View
      style={[s.messageBubble, item.sender === "admin" ? s.adminBubble : s.userBubble]}
    >
      <Text
        style={[s.messageText, item.sender === "admin" ? s.adminText : s.userText]}
      >
        {item.message}
      </Text>
      <Text
        style={[s.timestamp, item.sender === "admin" && s.timestampAdmin]}
      >
        {formatTime(item.created_at)}
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[s.container, isMobile && s.containerMobile]}>
        {(!selectedChat || !isMobile) && (
          <GestureDetector gesture={panGesture}>
            <Animated.View
              style={[s.listPane, isMobile && s.listPaneMobile, animatedStyle]}
            >
              <View style={s.headerContainer}>
                <Text style={s.header}>Support Messages</Text>
                <TouchableOpacity onPress={fetchChats} disabled={loading}>
                  <MaterialIcons
                    name="refresh"
                    size={24}
                    color={loading ? "#9ca3af" : "#3b82f6"}
                  />
                </TouchableOpacity>
              </View>
              {isRefreshing.value && (
                <ActivityIndicator
                  style={s.refreshIndicator}
                  size="small"
                  color="#3b82f6"
                />
              )}
              {loading && !chats.length ? (
                <View style={s.emptyChatList}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                  <Text style={s.emptyText}>Loading...</Text>
                </View>
              ) : chats.length ? (
                <FlatList
                  data={chats}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => <ChatListItem item={item} />}
                  showsVerticalScrollIndicator={false}
                />
              ) : (
                <View style={s.emptyChatList}>
                  <MaterialIcons
                    name="chat-bubble-outline"
                    size={48}
                    color="#6b7280"
                  />
                  <Text style={s.emptyText}>No conversations</Text>
                </View>
              )}
            </Animated.View>
          </GestureDetector>
        )}
        <View style={[s.chatPane, isMobile && s.chatPaneMobile]}>
          {notification && (
            <View
              style={[
                s.notification,
                {
                  backgroundColor:
                    notification.type === "success" ? "#d1fae5" : "#fee2e2",
                },
              ]}
            >
              <MaterialIcons
                name={notification.type === "success" ? "check-circle" : "error"}
                size={20}
                color={notification.type === "success" ? "#10b981" : "#ef4444"}
              />
              <Text
                style={{
                  color:
                    notification.type === "success" ? "#065f46" : "#991b1b",
                  marginLeft: 8,
                }}
              >
                {notification.message}
              </Text>
            </View>
          )}
          {selectedChat ? (
            <>
              <View style={s.chatHeader}>
                {isMobile && (
                  <TouchableOpacity
                    onPress={() => setSelectedChat(null)}
                    style={s.backButton}
                  >
                    <MaterialIcons name="arrow-back" size={24} color="#111827" />
                  </TouchableOpacity>
                )}
                <View style={s.chatHeaderInfo}>
                  <Text style={s.chatHeaderTitle}>
                    {selectedChat.email || selectedChat.title}
                  </Text>
                  <Text style={s.chatHeaderSubtitle}>
                    {selectedChat.user_id
                      ? `Registered User • ${selectedChat.user_id.slice(0, 8)}...`
                      : "Guest User"}
                  </Text>
                </View>
              </View>
              <View style={s.messagesContainer}>
                {loading ? (
                  <View style={s.loadingContainer}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                    <Text style={s.loadingText}>Loading...</Text>
                  </View>
                ) : messages.length ? (
                  <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={s.messageContainer}
                    renderItem={({ item }) => <MessageItem item={item} />}
                    showsVerticalScrollIndicator={false}
                    onContentSizeChange={() =>
                      flatListRef.current?.scrollToEnd({ animated: false })
                    }
                  />
                ) : (
                  <View style={s.emptyMessages}>
                    <MaterialIcons
                      name="chat-bubble-outline"
                      size={48}
                      color="#6b7280"
                    />
                    <Text style={s.emptyText}>No messages</Text>
                  </View>
                )}
              </View>
              <View style={[s.inputContainer, isMobile && s.inputContainerMobile]}>
                <TextInput
                  value={reply}
                  onChangeText={setReply}
                  placeholder="Type your reply..."
                  style={[s.input, isMobile && s.inputMobile]}
                  onSubmitEditing={handleSendReply}
                  multiline
                  maxLength={1000}
                  editable={!sending}
                />
                <TouchableOpacity
                  onPress={handleSendReply}
                  disabled={!reply.trim() || sending}
                  style={[s.sendBtn, (!reply.trim() || sending) && s.sendBtnDisabled]}
                >
                  {sending ? (
                    <ActivityIndicator size={20} color="#fff" />
                  ) : (
                    <MaterialIcons name="send" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={s.emptyPane}>
              <MaterialIcons name="chat" size={64} color="#6b7280" />
              <Text style={s.emptyText}>Select a conversation</Text>
            </View>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, flexDirection: "row", backgroundColor: "#fff" },
  containerMobile: { flexDirection: "column" },
  listPane: { width: "35%", minWidth: 280, maxWidth: 400, borderRightWidth: 1, borderColor: "#e5e7eb" },
  listPaneMobile: { width: "100%", borderRightWidth: 0, borderBottomWidth: 1 },
  headerContainer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderColor: "#e5e7eb" },
  header: { fontSize: 22, fontWeight: "600", color: "#111827" },
  refreshIndicator: { position: "absolute", top: 60, alignSelf: "center" },
  chatItem: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderColor: "#e5e7eb" },
  chatItemSelected: { backgroundColor: "#eff6ff" },
  chatContent: { flex: 1, flexDirection: "row", alignItems: "center", padding: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#eff6ff", justifyContent: "center", alignItems: "center", marginRight: 12, position: "relative" },
  unreadIndicator: { position: "absolute", top: -2, right: -2, backgroundColor: "#ef4444", borderRadius: 10, minWidth: 20, height: 20, justifyContent: "center", alignItems: "center" },
  unreadIndicatorText: { color: "#fff", fontSize: 10, fontWeight: "600" },
  chatInfo: { flex: 1 },
  chatHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  chatTitle: { fontSize: 16, fontWeight: "600", color: "#111827", flex: 1 },
  chatTime: { fontSize: 12, color: "#6b7280", marginLeft: 8 },
  chatSubtitle: { fontSize: 14, color: "#6b7280" },
  userIdBadge: { fontSize: 10, color: "#3b82f6", backgroundColor: "#eff6ff", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  deleteButton: { padding: 12 },
  chatPane: { flex: 1, flexDirection: "column" },
  chatPaneMobile: { flex: 1 },
  chatHeader: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderColor: "#e5e7eb" },
  backButton: { padding: 8, marginRight: 8 },
  chatHeaderInfo: { flex: 1 },
  chatHeaderTitle: { fontSize: 18, fontWeight: "600", color: "#111827" },
  chatHeaderSubtitle: { fontSize: 14, color: "#6b7280", marginTop: 2 },
  messagesContainer: { flex: 1, backgroundColor: "#f9fafb" },
  messageContainer: { padding: 16, flexGrow: 1 },
  messageBubble: { marginVertical: 6, padding: 12, borderRadius: 16, maxWidth: "80%" },
  adminBubble: { alignSelf: "flex-end", backgroundColor: "#3b82f6" },
  userBubble: { alignSelf: "flex-start", backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb" },
  messageText: { fontSize: 15 },
  adminText: { color: "#fff" },
  userText: { color: "#111827" },
  timestamp: { fontSize: 11, color: "#6b7280", marginTop: 6, textAlign: "right" },
  timestampAdmin: { color: "#dbeafe" },
  inputContainer: { flexDirection: "row", padding: 12, borderTopWidth: 1, borderColor: "#e5e7eb", alignItems: "flex-end" },
  inputContainerMobile: { padding: 10 },
  input: { flex: 1, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, minHeight: 44, maxHeight: 100 },
  inputMobile: { fontSize: 14, paddingHorizontal: 12, minHeight: 40, maxHeight: 80 },
  sendBtn: { marginLeft: 10, backgroundColor: "#3b82f6", width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  sendBtnDisabled: { backgroundColor: "#9ca3af" },
  emptyPane: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  emptyMessages: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  emptyText: { fontSize: 18, color: "#6b7280", marginTop: 16 },
  emptySubtext: { fontSize: 14, color: "#9ca3af", marginTop: 8 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  loadingText: { fontSize: 16, color: "#6b7280", marginTop: 12 },
  notification: { flexDirection: "row", alignItems: "center", padding: 10, marginHorizontal: 12, marginTop: 8, borderRadius: 8 },
});