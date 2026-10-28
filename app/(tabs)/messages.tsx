import {useCallback, useEffect, useRef, useState} from "react";
import {
  ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View,
} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {router, useFocusEffect} from "expo-router";
import {Ionicons} from "@expo/vector-icons";
import {getConversations, type Conversation} from "@/lib/api";
import {useAuth} from "@/contexts/AuthContext";
import {colors} from "@/constants/theme";
import {useLanguage} from "@/contexts/LanguageContext";

type ConversationExt = Conversation & {
  lastMessage?: string; lastMessageAt?: string; unreadCount?: number;
};
type Status = "loading" | "ready" | "error";
type LoadMode = "initial" | "refresh" | "silent";
const Separator = () => <View style={{height: 10}} />;

function timeAgo(iso: string | undefined, tr: (ar: string, en: string) => string): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  const diff = Date.now() - t;
  if (diff < 0) return null;
  const min = 60_000, hour = 60 * min, day = 24 * hour;
  if (diff < min) return tr("الآن", "now");
  if (diff < hour) {
    const n = Math.floor(diff / min);
    return tr(`قبل ${n} د`, `${n}m ago`);
  }
  if (diff < day) {
    const n = Math.floor(diff / hour);
    return tr(`قبل ${n} س`, `${n}h ago`);
  }
  if (diff < 7 * day) {
    const n = Math.floor(diff / day);
    return tr(`قبل ${n} ي`, `${n}d ago`);
  }
  try { return new Date(iso).toLocaleDateString(); } catch { return null; }
}
function initialOf(name: string | undefined): string {
  const trimmed = (name || "").trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "?";
}

// Each account gets an independent screen state, including pending requests.
export default function Messages() {
  const {user} = useAuth();
  return <MessagesForUser key={user?.id ?? "guest"} />;
}

function MessagesForUser() {
  const insets = useSafeAreaInsets();
  const {tr, isRTL} = useLanguage();
  const {user} = useAuth();
  const userId = user?.id;
  const align = isRTL ? "right" : "left";
  const dir = isRTL ? "row-reverse" : "row";
  const [data, setData] = useState<ConversationExt[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const requestId = useRef(0);
  const hasData = useRef(false);
  const translate = useRef(tr);
  translate.current = tr;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      requestId.current += 1;
    };
  }, []);

  const load = useCallback(async (mode: LoadMode = "initial") => {
    const id = ++requestId.current;
    if (!userId) {
      if (mounted.current) {
        hasData.current = false;
        setData([]); setStatus("ready"); setError(null); setRefreshing(false);
      }
      return;
    }
    setRefreshing(mode === "refresh");
    if (mode === "initial" && !hasData.current) setStatus("loading");
    setError(null);
    try {
      const items = await getConversations();
      if (!mounted.current || id !== requestId.current) return;
      const next = Array.isArray(items) ? items : [];
      hasData.current = next.length > 0;
      setData(next);
      setStatus("ready");
    } catch (e) {
      if (__DEV__) console.warn("[Messages] load failed:", e);
      if (!mounted.current || id !== requestId.current) return;
      setError(e instanceof Error && e.message ? e.message :
        translate.current("تعذر تحميل المحادثات", "Could not load conversations"));
      setStatus(hasData.current ? "ready" : "error");
    } finally {
      if (mounted.current && id === requestId.current) setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(useCallback(() => {
    load(hasData.current ? "silent" : "initial");
    return () => { requestId.current += 1; };
  }, [load]));
  const onRefresh = useCallback(() => load("refresh"), [load]);
  const onRetry = useCallback(() => load("initial"), [load]);

  if (!user) return <View style={[s.center, {paddingTop: insets.top + 24}]}>
    <View style={s.stateIcon}><Ionicons name="chatbubbles-outline" size={28} color={colors.gold} /></View>
    <Text style={s.stateTitle}>{tr("سجّل الدخول لعرض محادثاتك", "Sign in to view your conversations")}</Text>
    <Text style={s.stateHint}>{tr("تواصل مباشرة مع البائعين والمشترين", "Chat directly with sellers and buyers")}</Text>
    <Pressable onPress={() => router.push("/login")} accessibilityRole="button"
      style={({pressed}) => [s.btn, pressed && s.pressed]}>
      <Ionicons name="log-in" size={17} color={colors.black} />
      <Text style={s.btnText}>{tr("تسجيل الدخول", "Sign in")}</Text>
    </Pressable>
  </View>;

  if (status === "loading" && data.length === 0) return <View style={[s.center, {paddingTop: insets.top}]}>
    <ActivityIndicator color={colors.gold} size="large" />
    <Text style={s.loadingText}>{tr("جارٍ التحميل…", "Loading…")}</Text>
  </View>;

  if (status === "error" && data.length === 0) return <View style={[s.center, {paddingTop: insets.top}]}>
    <View style={s.stateCard}>
      <View style={[s.stateIcon, s.stateIconError]}><Text style={s.stateIconText}>!</Text></View>
      <Text style={s.stateTitle}>{tr("تعذر تحميل المحادثات", "Couldn't load conversations")}</Text>
      <Text style={s.stateHint}>{error || tr("تحقق من اتصالك ثم حاول مرة أخرى", "Check your connection and try again")}</Text>
      <Pressable onPress={onRetry} accessibilityRole="button" style={({pressed}) => [s.btn, pressed && s.pressed]}>
        <Ionicons name="refresh" size={17} color={colors.black} />
        <Text style={s.btnText}>{tr("إعادة المحاولة", "Retry")}</Text>
      </Pressable>
    </View>
  </View>;

  return <FlatList
    data={data} keyExtractor={(x) => String(x.id)}
    contentContainerStyle={[s.page, {
      paddingTop: insets.top + 12, paddingBottom: insets.bottom + 90,
      flexGrow: data.length === 0 ? 1 : 0,
    }]}
    ItemSeparatorComponent={Separator} showsVerticalScrollIndicator={false}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh}
      tintColor={colors.gold} colors={[colors.gold]} progressBackgroundColor="#111" />}
    ListHeaderComponent={<View>
      <Text style={[s.h1, {textAlign: align}]}>{tr("الرسائل", "Messages")}</Text>
      <Text style={[s.subtitle, {textAlign: align}]}>{tr("محادثاتك مع البائعين والمشترين", "Your conversations with sellers and buyers")}</Text>
      {!!error && data.length > 0 && <Pressable onPress={onRefresh} accessibilityRole="button" style={s.banner}>
        <Ionicons name="alert-circle" size={14} color="#8A5300" />
        <Text style={s.bannerText}>{tr("تعذر تحديث القائمة — اسحب للأسفل للمحاولة", "Couldn't refresh — pull down to retry")}</Text>
      </Pressable>}
      {data.length > 0 && <View style={[s.sectionRow, {flexDirection: dir}]}>
        <Text style={s.sectionTitle}>{tr("المحادثات", "Conversations")}</Text>
        <View style={s.countPill}><Text style={s.countText}>{String(data.length)}</Text></View>
      </View>}
    </View>}
    renderItem={({item}) => {
      const name = item.otherUserName || `${tr("مستخدم", "User")} #${item.otherUserId || ""}`;
      const initial = initialOf(item.otherUserName || "?");
      const time = timeAgo(item.lastMessageAt || item.updatedAt, tr);
      const rawUnread = Number(item.unreadCount ?? item.unread ?? 0);
      const unreadCount = Number.isFinite(rawUnread) ? Math.max(0, Math.floor(rawUnread)) : 0;
      const unread = unreadCount > 0;
      return <Pressable onPress={() => router.push({pathname: "/chat/[id]", params: {id: String(item.id)}})}
        style={({pressed}) => [s.item, {flexDirection: dir}, unread && s.itemUnread, pressed && s.pressed]}
        accessibilityRole="button" accessibilityLabel={`${name}${time ? `, ${time}` : ""}`}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initial}</Text>
          {unread && <View style={s.unreadDot} />}
        </View>
        <View style={{flex: 1}}>
          <View style={[s.rowTop, {flexDirection: dir}]}>
            <Text style={[s.name, {textAlign: align}]} numberOfLines={1}>{name}</Text>
            {!!time && <Text style={s.time}>{time}</Text>}
          </View>
          <View style={[s.rowBottom, {flexDirection: dir}]}>
            <Text style={[s.sub, {textAlign: align}]} numberOfLines={1}>
              {item.lastMessage?.trim() || item.lastMessageBody?.trim() || tr("اضغط لفتح المحادثة", "Tap to open conversation")}
            </Text>
            {unread && <View style={s.badge}><Text style={s.badgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text></View>}
          </View>
        </View>
        <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={16} color="#C0C4CC" />
      </Pressable>;
    }}
    ListEmptyComponent={<View style={s.emptyWrap}>
      <View style={s.stateIcon}><Ionicons name="chatbubble-ellipses-outline" size={28} color={colors.gold} /></View>
      <Text style={s.stateTitle}>{tr("لا توجد محادثات بعد", "No conversations yet")}</Text>
      <Text style={s.stateHint}>{tr("عندما تتواصل مع بائع أو مشترٍ ستظهر هنا", "When you contact a seller or buyer it will appear here")}</Text>
      <Pressable onPress={() => router.push("/(tabs)")} accessibilityRole="button"
        style={({pressed}) => [s.btn, pressed && s.pressed]}>
        <Ionicons name="car-sport-outline" size={17} color={colors.black} />
        <Text style={s.btnText}>{tr("تصفح الإعلانات", "Browse listings")}</Text>
      </Pressable>
    </View>}
    initialNumToRender={10} maxToRenderPerBatch={10} windowSize={9} removeClippedSubviews={false}
  />;
}

const s = StyleSheet.create({
  page: {paddingHorizontal: 16},
  h1: {fontSize: 26, fontWeight: "900", color: "#111"},
  subtitle: {fontSize: 13, color: colors.muted, marginTop: 4, marginBottom: 16, lineHeight: 19},
  sectionRow: {alignItems: "center", justifyContent: "space-between", marginBottom: 10},
  sectionTitle: {fontSize: 15, fontWeight: "900", color: "#111"},
  countPill: {backgroundColor: "#F2F2F5", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999},
  countText: {fontSize: 11, fontWeight: "700", color: "#5A5F6B"},
  banner: {flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FFF4E5", borderColor: "#FFD8A8", borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 12},
  bannerText: {color: "#8A5300", fontSize: 12, fontWeight: "600", flex: 1},
  item: {backgroundColor: "#fff", paddingVertical: 13, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: "#F0F0EC", alignItems: "center", gap: 12},
  itemUnread: {borderColor: "#EAD9A0", backgroundColor: "#FFFDF7"},
  avatar: {width: 46, height: 46, borderRadius: 23, backgroundColor: colors.gold, alignItems: "center", justifyContent: "center"},
  avatarText: {fontSize: 18, fontWeight: "900", color: colors.black},
  unreadDot: {position: "absolute", top: -2, end: -2, width: 12, height: 12, borderRadius: 6, backgroundColor: "#22C55E", borderWidth: 2, borderColor: "#fff"},
  rowTop: {alignItems: "center", justifyContent: "space-between", gap: 8},
  name: {fontWeight: "900", fontSize: 14, color: "#111", flexShrink: 1},
  time: {fontSize: 11, color: colors.muted, fontWeight: "600"},
  rowBottom: {alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 4},
  sub: {fontSize: 12, color: colors.muted, flexShrink: 1},
  badge: {minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: colors.gold, alignItems: "center", justifyContent: "center"},
  badgeText: {fontSize: 10, fontWeight: "900", color: colors.black},
  center: {flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#fff", gap: 12},
  loadingText: {color: colors.muted, fontWeight: "600", marginTop: 4},
  stateCard: {backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: "#EEE", padding: 24, alignItems: "center", width: "100%", maxWidth: 380},
  emptyWrap: {alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 10},
  stateIcon: {width: 60, height: 60, borderRadius: 30, backgroundColor: "#F6F1E4", alignItems: "center", justifyContent: "center", marginBottom: 6},
  stateIconError: {backgroundColor: "#FFF2E5"},
  stateIconText: {fontSize: 26, fontWeight: "900", color: colors.gold},
  stateTitle: {fontSize: 16, fontWeight: "900", color: "#111", textAlign: "center"},
  stateHint: {fontSize: 13, color: colors.muted, textAlign: "center", lineHeight: 20, maxWidth: 300},
  btn: {flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.gold, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14, marginTop: 6},
  btnText: {fontWeight: "900", color: colors.black, fontSize: 14},
  pressed: {opacity: 0.85, transform: [{scale: 0.985}]},
});
