import {useCallback, useEffect, useRef, useState} from "react";
import type {ReactNode} from "react";
import {
  ActivityIndicator, Alert, FlatList, Image, Pressable,
  RefreshControl, StyleSheet, Text, View,
} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {router, useFocusEffect} from "expo-router";
import {Ionicons} from "@expo/vector-icons";
import {useAuth} from "@/contexts/AuthContext";
import {useLanguage} from "@/contexts/LanguageContext";
import {getMyListings, imageUrl, type Listing} from "@/lib/api";

const yellow = "#FFD500";
const DANGER = "#C83939";
const GOLD_DARK = "#CEAB29";
type Status = "idle" | "loading" | "ready" | "error";
type LoadMode = "initial" | "refresh" | "silent";

// Remount account-specific state when signing out or switching accounts.
export default function Profile() {
  const {user} = useAuth();
  return <ProfileForUser key={user?.id ?? "guest"} />;
}

function ProfileForUser() {
  const insets = useSafeAreaInsets();
  const {user, signOut} = useAuth();
  const {language, setLanguage, tr, isRTL} = useLanguage();
  const align = isRTL ? "right" : "left";
  const dir = isRTL ? "row-reverse" : "row";
  const chevron = isRTL ? "chevron-back" : "chevron-forward";
  const userId = user?.id;

  const [listings, setListings] = useState<Listing[]>([]);
  const [showListings, setShowListings] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const requestId = useRef(0);
  const fetched = useRef(false);
  const hasData = useRef(false);
  const loading = useRef(false);
  const signingOut = useRef(false);
  const translate = useRef(tr);
  translate.current = tr;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      requestId.current += 1;
    };
  }, []);

  const loadListings = useCallback(async (mode: LoadMode = "initial") => {
    const id = ++requestId.current;
    if (!userId) {
      if (mounted.current) {
        fetched.current = false; hasData.current = false; loading.current = false;
        setListings([]); setStatus("idle"); setError(null); setRefreshing(false);
      }
      return;
    }
    loading.current = true;
    setRefreshing(mode === "refresh");
    if (mode === "initial" && !hasData.current) setStatus("loading");
    setError(null);
    try {
      const data = await getMyListings();
      if (!mounted.current || id !== requestId.current) return;
      const next = Array.isArray(data) ? data : [];
      hasData.current = next.length > 0;
      fetched.current = true;
      setListings(next);
      setStatus("ready");
    } catch (e) {
      if (__DEV__) console.warn("[Profile] listings failed:", e);
      if (!mounted.current || id !== requestId.current) return;
      setError(e instanceof Error && e.message ? e.message :
        translate.current("تعذر تحميل الإعلانات", "Could not load listings"));
      setStatus(hasData.current ? "ready" : "error");
    } finally {
      if (mounted.current && id === requestId.current) {
        loading.current = false;
        setRefreshing(false);
      }
    }
  }, [userId]);

  useFocusEffect(useCallback(() => {
    loadListings(hasData.current ? "silent" : "initial");
    return () => {
      requestId.current += 1;
      loading.current = false;
    };
  }, [loadListings]));

  const onRefresh = useCallback(() => loadListings("refresh"), [loadListings]);
  const onRetry = useCallback(() => loadListings("initial"), [loadListings]);
  const toggleListings = useCallback(() => {
    const next = !showListings;
    setShowListings(next);
    if (next && !fetched.current && !loading.current) loadListings("initial");
  }, [showListings, loadListings]);

  const confirmSignOut = () => Alert.alert(
    tr("تسجيل الخروج", "Sign out"),
    tr("هل تريد تسجيل الخروج؟", "Do you want to sign out?"),
    [
      {text: tr("إلغاء", "Cancel"), style: "cancel"},
      {text: tr("خروج", "Sign out"), style: "destructive", onPress: async () => {
        if (signingOut.current) return;
        signingOut.current = true;
        try {
          await signOut();
        } catch (e) {
          if (mounted.current) Alert.alert(tr("تعذر تسجيل الخروج", "Could not sign out"),
            e instanceof Error && e.message ? e.message :
              tr("حاول مرة أخرى", "Please try again"));
        } finally {
          signingOut.current = false;
        }
      }},
    ]
  );

  const changeLanguage = async (code: "ar" | "en") => {
    try {
      await setLanguage(code);
    } catch (e) {
      if (mounted.current) Alert.alert(tr("تعذر حفظ اللغة", "Could not save language"),
        e instanceof Error && e.message ? e.message :
          tr("حاول مرة أخرى", "Please try again"));
    }
  };

  const menuRow = (opts: {
    icon: keyof typeof Ionicons.glyphMap; title: string; onPress: () => void;
    danger?: boolean; trailing?: ReactNode;
  }) => {
    const {icon, title, onPress, danger, trailing} = opts;
    return <Pressable onPress={onPress}
      style={({pressed}) => [s.menuRow, {flexDirection: dir}, pressed && s.pressed]}
      accessibilityRole="button">
      <View style={[s.menuLabel, {flexDirection: dir}]}>
        <View style={[s.menuIcon, danger && s.menuIconDanger]}>
          <Ionicons name={icon} size={17} color={danger ? DANGER : GOLD_DARK} />
        </View>
        <Text style={[s.menuText, danger && {color: DANGER}]}>{title}</Text>
      </View>
      {trailing ?? <Ionicons name={chevron} size={18} color={danger ? DANGER : "#B8BCC4"} />}
    </Pressable>;
  };

  const listingsStateBlock = () => {
    if (!showListings) return null;
    if (status === "loading" || (status === "idle" && !fetched.current)) {
      return <View style={s.listingsState}>
        <ActivityIndicator color={yellow} />
        <Text style={s.listingsStateText}>{tr("جارٍ تحميل إعلاناتك…", "Loading your listings…")}</Text>
      </View>;
    }
    if (status === "error") return <View style={[s.listingsState, s.listingsStateError]}>
      <Ionicons name="alert-circle" size={20} color="#8A5300" />
      <Text style={s.listingsStateText}>{error || tr("تعذر تحميل الإعلانات", "Could not load your listings")}</Text>
      <Pressable onPress={onRetry} accessibilityRole="button" style={({pressed}) => [s.retrySmall, pressed && s.pressed]}>
        <Text style={s.retrySmallText}>{tr("إعادة المحاولة", "Retry")}</Text>
      </Pressable>
    </View>;
    if (status === "ready" && listings.length === 0) return <View style={s.listingsState}>
      <View style={s.emptyIcon}><Ionicons name="car-sport-outline" size={24} color={GOLD_DARK} /></View>
      <Text style={s.listingsStateText}>{tr("لا توجد إعلانات بعد", "No listings yet")}</Text>
      <Pressable onPress={() => router.push("/(tabs)/add")} accessibilityRole="button"
        style={({pressed}) => [s.retrySmall, pressed && s.pressed]}>
        <Ionicons name="add" size={14} color="#111" />
        <Text style={[s.retrySmallText, {color: "#111"}]}>{tr("أضف إعلانك الأول", "Add your first listing")}</Text>
      </Pressable>
    </View>;
    return null;
  };

  return <FlatList
    data={showListings ? listings : []} keyExtractor={(item) => String(item.id)}
    contentContainerStyle={[s.page, {paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40}]}
    showsVerticalScrollIndicator={false}
    refreshControl={showListings ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
      tintColor={yellow} colors={[yellow]} progressBackgroundColor="#111" /> : undefined}
    ListHeaderComponent={<>
      <Text style={[s.heading, {textAlign: align}]}>{tr("حسابي", "My account")}</Text>
      <Text style={[s.subheading, {textAlign: align}]}>{tr("إدارة ملفك الشخصي وإعلاناتك", "Manage your profile and listings")}</Text>
      <View style={s.profileCard}>
        <View style={s.avatarRing}><View style={s.avatar}>
          <Text style={s.initial}>{(user?.name || user?.email || tr("م", "G")).slice(0, 1).toUpperCase()}</Text>
        </View></View>
        <Text style={s.name}>{user?.name || tr("ضيف", "Guest")}</Text>
        <Text style={s.phone}>{user?.phone || tr("لم يتم إضافة رقم", "No phone number added")}</Text>
        {!!user?.city && <Text style={s.city}>{user.city}</Text>}
        {user?.isAdmin && <View style={[s.adminBadge, {flexDirection: dir}]}>
          <Ionicons name="shield-checkmark" size={12} color="#111" />
          <Text style={s.adminText}>{tr("حساب مسؤول", "Administrator")}</Text>
        </View>}
      </View>

      {!user ? <Pressable style={({pressed}) => [s.login, {flexDirection: dir}, pressed && s.pressed]}
        onPress={() => router.push("/login")} accessibilityRole="button">
        <Ionicons name="log-in" size={18} color="#111" />
        <Text style={s.loginText}>{tr("تسجيل الدخول أو إنشاء حساب", "Sign in or create account")}</Text>
      </Pressable> : <>
        {menuRow({
          icon: "car-sport-outline", title: tr("إعلاناتي", "My listings"), onPress: toggleListings,
          trailing: <View style={{flexDirection: "row", alignItems: "center", gap: 8}}>
            {listings.length > 0 && <View style={s.countBadge}><Text style={s.countBadgeText}>{listings.length}</Text></View>}
            <Ionicons name={showListings ? "chevron-up" : "chevron-down"} size={18} color="#B8BCC4" />
          </View>,
        })}
        {menuRow({icon: "create-outline", title: tr("تعديل الملف الشخصي", "Edit profile"), onPress: () => router.push("/edit-profile")})}
        {menuRow({icon: "chatbubbles-outline", title: tr("المحادثات", "Conversations"), onPress: () => router.push("/messages")})}
        {menuRow({icon: "sparkles-outline", title: tr("المساعد ديبو", "Dibo Assistant"), onPress: () => router.push("/assistant")})}
        {user.isAdmin && menuRow({icon: "construct-outline", title: tr("الجرد الميداني", "Field inventory"), onPress: () => router.push("/admin/field-inventory")})}
        {menuRow({icon: "log-out-outline", title: tr("تسجيل الخروج", "Sign out"), onPress: confirmSignOut, danger: true})}
      </>}

      <View style={s.languageCard}>
        <View style={[s.languageHeader, {flexDirection: dir}]}>
          <Ionicons name="language" size={16} color="#666" />
          <Text style={s.languageTitle}>{tr("لغة التطبيق", "App language")}</Text>
        </View>
        <View style={[s.languageButtons, {flexDirection: dir}]}>
          {(["ar", "en"] as const).map((code) => {
            const active = language === code;
            return <Pressable key={code} style={({pressed}) => [s.langButton, active && s.langActive, pressed && s.pressed]}
              onPress={() => changeLanguage(code)} accessibilityRole="button" accessibilityState={{selected: active}}>
              <Text style={[s.langText, active && {color: "#111"}]}>{code === "ar" ? "العربية" : "English"}</Text>
              {active && <Ionicons name="checkmark-circle" size={14} color="#111" />}
            </Pressable>;
          })}
        </View>
      </View>

      {!!error && listings.length > 0 && <Pressable onPress={onRefresh} accessibilityRole="button" style={s.banner}>
        <Ionicons name="alert-circle" size={14} color="#8A5300" />
        <Text style={s.bannerText}>{tr("تعذر تحديث إعلاناتك — اسحب للأسفل للمحاولة", "Couldn't refresh your listings — pull to retry")}</Text>
      </Pressable>}
      {listingsStateBlock()}
      {showListings && listings.length > 0 && <View style={[s.sectionRow, {flexDirection: dir}]}>
        <Text style={s.sectionTitle}>{tr("إعلاناتي", "My listings")}</Text>
        <View style={s.countPill}><Text style={s.countText}>{listings.length}</Text></View>
      </View>}
    </>}
    renderItem={({item}) => {
      const uri = imageUrl(item.images?.[0]);
      return <Pressable style={({pressed}) => [s.listing, {flexDirection: dir}, pressed && s.pressed]}
        onPress={() => router.push({pathname: "/listing/[id]", params: {id: String(item.id)}})} accessibilityRole="button">
        {uri ? <Image source={{uri}} style={s.thumb} /> : <View style={[s.thumb, s.placeholder]}>
          <Ionicons name="car-sport" size={24} color={yellow} />
        </View>}
        <View style={{flex: 1}}>
          <Text style={[s.listingTitle, {textAlign: align}]} numberOfLines={1}>{item.make} {item.model}</Text>
          <Text style={[s.listingSub, {textAlign: align}]}>{Number(item.price || 0).toLocaleString()}{" "}{tr("د.إ", "AED")}</Text>
        </View>
        <Ionicons name={chevron} size={18} color="#B8BCC4" />
      </Pressable>;
    }}
  />;
}

const s = StyleSheet.create({
  page: {paddingHorizontal: 18, backgroundColor: "#fff", flexGrow: 1},
  heading: {fontSize: 28, fontWeight: "900", color: "#111"},
  subheading: {fontSize: 14, color: "#777", marginTop: 6, marginBottom: 20, lineHeight: 20},
  profileCard: {backgroundColor: "#F7F8FA", borderRadius: 22, borderWidth: 1, borderColor: "#E1E2E5", padding: 22, alignItems: "center", marginBottom: 22},
  avatarRing: {padding: 4, borderRadius: 60, backgroundColor: "#FFF", borderWidth: 2, borderColor: yellow},
  avatar: {width: 92, height: 92, borderRadius: 46, backgroundColor: yellow, alignItems: "center", justifyContent: "center"},
  initial: {fontSize: 40, fontWeight: "900", color: "#111"},
  name: {fontSize: 20, fontWeight: "900", color: "#111", marginTop: 14},
  phone: {fontSize: 14, color: "#777", marginTop: 6},
  city: {color: "#777", marginTop: 4, fontSize: 13},
  adminBadge: {marginTop: 10, alignItems: "center", gap: 5, backgroundColor: yellow, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999},
  adminText: {fontSize: 11, fontWeight: "900", color: "#111"},
  menuRow: {alignItems: "center", justifyContent: "space-between", minHeight: 62, borderBottomWidth: 1, borderBottomColor: "#EFEFEF", paddingHorizontal: 4},
  menuLabel: {alignItems: "center", gap: 12, flex: 1},
  menuIcon: {width: 34, height: 34, borderRadius: 17, backgroundColor: "#FBF3C8", alignItems: "center", justifyContent: "center"},
  menuIconDanger: {backgroundColor: "#FCE8E8"},
  menuText: {fontSize: 15, color: "#202020", fontWeight: "600", flexShrink: 1},
  countBadge: {minWidth: 22, height: 22, paddingHorizontal: 7, borderRadius: 11, backgroundColor: yellow, alignItems: "center", justifyContent: "center"},
  countBadgeText: {fontSize: 11, fontWeight: "900", color: "#111"},
  login: {backgroundColor: yellow, padding: 16, borderRadius: 15, alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4},
  loginText: {fontWeight: "900", color: "#111", fontSize: 15},
  languageCard: {marginTop: 24, padding: 16, borderRadius: 18, backgroundColor: "#F7F8FA", borderWidth: 1, borderColor: "#E1E2E5"},
  languageHeader: {alignItems: "center", gap: 6, marginBottom: 12},
  languageTitle: {color: "#555", fontSize: 13, fontWeight: "700"},
  languageButtons: {gap: 8},
  langButton: {flex: 1, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 14, borderWidth: 1, borderColor: "#ddd", backgroundColor: "#fff", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6},
  langActive: {backgroundColor: yellow, borderColor: yellow},
  langText: {color: "#333", fontWeight: "800", fontSize: 13},
  sectionRow: {alignItems: "center", justifyContent: "space-between", marginTop: 8, marginBottom: 8},
  sectionTitle: {fontSize: 15, fontWeight: "900", color: "#111"},
  countPill: {backgroundColor: "#F2F2F5", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999},
  countText: {fontSize: 11, fontWeight: "700", color: "#5A5F6B"},
  banner: {flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FFF4E5", borderColor: "#FFD8A8", borderWidth: 1, borderRadius: 12, padding: 10, marginTop: 12, marginBottom: 8},
  bannerText: {color: "#8A5300", fontSize: 12, fontWeight: "600", flex: 1},
  listingsState: {padding: 20, alignItems: "center", gap: 10, backgroundColor: "#F7F8FA", borderRadius: 16, borderWidth: 1, borderColor: "#E1E2E5", marginTop: 8},
  listingsStateError: {backgroundColor: "#FFF7EC", borderColor: "#F5D9A8"},
  listingsStateText: {fontSize: 13, color: "#555", fontWeight: "600", textAlign: "center"},
  emptyIcon: {width: 48, height: 48, borderRadius: 24, backgroundColor: "#FBF3C8", alignItems: "center", justifyContent: "center"},
  retrySmall: {flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: yellow, marginTop: 4},
  retrySmallText: {fontWeight: "900", fontSize: 12, color: "#111"},
  listing: {alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: "#EFEFEF", paddingVertical: 12},
  thumb: {width: 62, height: 48, borderRadius: 10},
  placeholder: {backgroundColor: "#111", alignItems: "center", justifyContent: "center"},
  listingTitle: {fontWeight: "900", color: "#111", fontSize: 14},
  listingSub: {color: "#777", marginTop: 3, fontSize: 13},
  pressed: {opacity: 0.7, transform: [{scale: 0.99}]},
});
