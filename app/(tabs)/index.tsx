import {useCallback, useEffect, useRef, useState} from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {useFocusEffect} from "expo-router";
import ListingCard from "@/components/ListingCard";
import {getListings, type Listing} from "@/lib/api";
import {colors} from "@/constants/theme";
import {useLanguage} from "@/contexts/LanguageContext";

type Status = "loading" | "ready" | "error";
type LoadMode = "initial" | "refresh" | "silent";

const Separator = () => <View style={{height: 14}} />;

export default function Home() {
  const {tr, isRTL} = useLanguage();
  const align = isRTL ? "right" : "left";
  const insets = useSafeAreaInsets();

  const [data, setData] = useState<Listing[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // حماية من تحديث الـ state بعد unmount + تجاهل الردود القديمة
  const mounted = useRef(true);
  const requestId = useRef(0);
  const hasData = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    hasData.current = data.length > 0;
  }, [data.length]);

  const load = useCallback(async (mode: LoadMode = "initial") => {
    const id = ++requestId.current;

    if (mode === "refresh") setRefreshing(true);
    if (mode === "initial" && !hasData.current) setStatus("loading");
    setError(null);

    try {
      const items = await getListings();
      if (!mounted.current || id !== requestId.current) return;
      setData(Array.isArray(items) ? items : []);
      setStatus("ready");
    } catch (e: unknown) {
      if (__DEV__) console.warn("[Home] load failed:", e);
      if (!mounted.current || id !== requestId.current) return;
      setError(e instanceof Error ? e.message : null);
      // إن كانت لدينا بيانات → لا نُسقط الشاشة، يكفي إظهار Banner
      setStatus(hasData.current ? "ready" : "error");
    } finally {
      if (mounted.current && id === requestId.current) setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(hasData.current ? "silent" : "initial");
    }, [load])
  );

  const onRefresh = useCallback(() => load("refresh"), [load]);
  const onRetry = useCallback(() => load("initial"), [load]);

  /* ---------------- Loading ---------------- */
  if (status === "loading") {
    return (
      <View style={[s.center, {paddingTop: insets.top}]}>
        <View style={s.loader}>
          <ActivityIndicator color={colors.gold} size="large" />
        </View>
        <Text style={s.loadingText}>{tr("جارٍ التحميل…", "Loading…")}</Text>
      </View>
    );
  }

  /* ---------------- Initial Error ---------------- */
  if (status === "error" && data.length === 0) {
    return (
      <View style={[s.center, {paddingTop: insets.top}]}>
        <View style={s.stateCard}>
          <View style={s.stateIcon}>
            <Text style={s.stateIconText}>!</Text>
          </View>
          <Text style={s.stateTitle}>
            {tr("تعذر تحميل الإعلانات", "Couldn't load listings")}
          </Text>
          <Text style={s.stateHint}>
            {tr(
              "تحقق من اتصالك بالإنترنت ثم حاول مرة أخرى",
              "Check your connection and try again"
            )}
          </Text>
          <Pressable
            onPress={onRetry}
            accessibilityRole="button"
            accessibilityLabel={tr("إعادة المحاولة", "Retry")}
            style={({pressed}) => [s.retryBtn, pressed && s.pressed]}
          >
            <Text style={s.retryText}>{tr("إعادة المحاولة", "Retry")}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  /* ---------------- Header ---------------- */
  const header = (
    <View>
      <View style={s.hero}>
        <View style={s.heroGlowA} />
        <View style={s.heroGlowB} />

        <View
          style={[
            s.badge,
            {alignSelf: isRTL ? "flex-end" : "flex-start"},
          ]}
        >
          <View style={s.badgeDot} />
          <Text style={s.badgeText}>MAD3OOM</Text>
        </View>

        <Text style={[s.eyebrow, {textAlign: align}]}>
          {tr("سوق السيارات الموثوق", "The trusted car marketplace")}
        </Text>

        <Text style={[s.h1, {textAlign: align}]}>
          {tr(
            "سيارتك القادمة تبدأ من مدعوم",
            "Your next car starts with MAD3OOM"
          )}
        </Text>

        <Text style={[s.p, {textAlign: align}]}>
          {tr(
            "ابحث وقارن وتواصل بثقة",
            "Search, compare and connect with confidence"
          )}
        </Text>
      </View>

      {/* خطأ تحديث مع بقاء البيانات */}
      {!!error && data.length > 0 && (
        <Pressable onPress={onRefresh} style={s.banner}>
          <Text style={s.bannerText}>
            {tr(
              "تعذر تحديث القائمة — اسحب للأسفل للمحاولة مجدداً",
              "Couldn't refresh the list — pull down to try again"
            )}
          </Text>
        </Pressable>
      )}

      <View
        style={[
          s.sectionRow,
          {flexDirection: isRTL ? "row-reverse" : "row"},
        ]}
      >
        <Text style={s.sectionTitle}>
          {tr("أحدث الإعلانات", "Latest listings")}
        </Text>
        <View style={s.countPill}>
          <Text style={s.countText}>
            {tr(`${data.length} إعلان`, `${data.length} listings`)}
          </Text>
        </View>
      </View>
    </View>
  );

  /* ---------------- Empty ---------------- */
  const empty = (
    <View style={s.stateCard}>
      <View style={s.stateIcon}>
        <Text style={s.stateIconText}>🚗</Text>
      </View>
      <Text style={s.stateTitle}>
        {tr("لا توجد إعلانات حالياً", "No listings available")}
      </Text>
      <Text style={s.stateHint}>
        {tr(
          "عد لاحقاً — نضيف إعلانات جديدة باستمرار",
          "Check back soon — new listings are added regularly"
        )}
      </Text>
    </View>
  );

  return (
    <FlatList
      data={data}
      keyExtractor={(x) => String(x.id)}
      renderItem={({item}) => <ListingCard item={item} />}
      ItemSeparatorComponent={Separator}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      contentContainerStyle={[
        s.content,
        {
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 24,
        },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.gold}
          colors={[colors.gold]}
          progressBackgroundColor="#111"
        />
      }
      initialNumToRender={6}
      maxToRenderPerBatch={8}
      windowSize={9}
      removeClippedSubviews={false}
    />
  );
}

const s = StyleSheet.create({
  content: {paddingHorizontal: 16},

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  loader: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F6F1E4",
    borderWidth: 1,
    borderColor: "#EADFC4",
  },
  loadingText: {
    marginTop: 14,
    color: colors.muted,
    fontWeight: "600",
  },

  /* ---------- Hero ---------- */
  hero: {
    backgroundColor: colors.black,
    borderRadius: 24,
    padding: 22,
    marginBottom: 18,
    overflow: "hidden",
  },
  heroGlowA: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.gold,
    opacity: 0.14,
    top: -60,
    right: -40,
  },
  heroGlowB: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.gold,
    opacity: 0.08,
    bottom: -50,
    left: -30,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(212,175,55,0.14)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 14,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.gold,
  },
  badgeText: {
    color: colors.gold,
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 1,
  },
  eyebrow: {
    color: colors.gold,
    fontWeight: "800",
    fontSize: 13,
  },
  h1: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "900",
    marginTop: 8,
    lineHeight: 36,
  },
  p: {
    color: "#AEB3BC",
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
  },

  /* ---------- Section ---------- */
  sectionRow: {
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
    marginBottom: 12,
  },
  sectionTitle: {fontSize: 18, fontWeight: "900", color: "#111"},
  countPill: {
    backgroundColor: "#F2F2F5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  countText: {fontSize: 12, fontWeight: "700", color: "#5A5F6B"},

  /* ---------- Banner ---------- */
  banner: {
    backgroundColor: "#FFF4E5",
    borderColor: "#FFD8A8",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  bannerText: {
    color: "#8A5300",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },

  /* ---------- State card ---------- */
  stateCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EEE",
    padding: 24,
    alignItems: "center",
    marginTop: 8,
  },
  stateIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F6F1E4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  stateIconText: {fontSize: 24, fontWeight: "900", color: colors.gold},
  stateTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111",
    textAlign: "center",
  },
  stateHint: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 18,
    backgroundColor: colors.black,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
  },
  retryText: {color: "#fff", fontWeight: "800", fontSize: 14},
  pressed: {opacity: 0.85, transform: [{scale: 0.98}]},
});
