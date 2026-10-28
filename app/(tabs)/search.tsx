import {useCallback, useEffect, useRef, useState} from "react";
import {
  ActivityIndicator, FlatList, Keyboard, Pressable,
  StyleSheet, Text, TextInput, View,
} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {Ionicons} from "@expo/vector-icons";
import ListingCard from "@/components/ListingCard";
import {getListings, type Listing} from "@/lib/api";
import {colors} from "@/constants/theme";
import {useLanguage} from "@/contexts/LanguageContext";

type Status = "idle" | "loading" | "ready" | "error";

const Separator = () => <View style={{height: 14}} />;

// Keep the component identity stable while the search form re-renders.
function Field({
  icon, value, onChangeText, onClear, placeholder,
  keyboardType, returnKeyType, onSubmitEditing,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onChangeText: (v: string) => void;
  onClear: () => void;
  placeholder: string;
  keyboardType?: "default" | "numeric";
  returnKeyType?: "search" | "done" | "next";
  onSubmitEditing?: () => void;
}) {
  const {tr, isRTL} = useLanguage();
  const align = isRTL ? "right" : "left";

  return (
    <View style={[s.field, {flexDirection: isRTL ? "row-reverse" : "row"}]}>
      <Ionicons name={icon} size={18} color="#8A8F99" />
      <TextInput
        style={[s.input, {textAlign: align}]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9AA0AA"
        keyboardType={keyboardType}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        autoCorrect={false}
      />
      {value.length > 0 && (
        <Pressable
          onPress={onClear}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={tr("مسح", "Clear")}
        >
          <Ionicons name="close-circle" size={18} color="#B8BCC4" />
        </Pressable>
      )}
    </View>
  );
}

export default function Search() {
  const {tr, isRTL} = useLanguage();
  const align = isRTL ? "right" : "left";
  const insets = useSafeAreaInsets();

  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [data, setData] = useState<Listing[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<"minMax" | null>(null);

  const mounted = useRef(true);
  const requestId = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      requestId.current += 1;
    };
  }, []);

  const run = useCallback(async () => {
    Keyboard.dismiss();

    // Validation محلي
    if (minPrice && maxPrice) {
      const min = Number(minPrice);
      const max = Number(maxPrice);
      if (!Number.isNaN(min) && !Number.isNaN(max) && min > max) {
        setValidation("minMax");
        return;
      }
    }
    setValidation(null);

    const id = ++requestId.current;
    setStatus("loading");
    setError(null);

    try {
      const items = await getListings({
        search: q.trim(),
        city: city.trim(),
        minPrice: minPrice.trim(),
        maxPrice: maxPrice.trim(),
      });
      if (!mounted.current || id !== requestId.current) return;
      setData(Array.isArray(items) ? items : []);
      setStatus("ready");
    } catch (e: unknown) {
      if (__DEV__) console.warn("[Search] failed:", e);
      if (!mounted.current || id !== requestId.current) return;
      setError(e instanceof Error ? e.message : tr(
        "تعذر تحميل النتائج",
        "Couldn't load results"
      ));
      setStatus("error");
    }
  }, [q, city, minPrice, maxPrice, tr]);

  const reset = useCallback(() => {
    // Ignore pending responses after the user clears the search.
    requestId.current += 1;
    setQ("");
    setCity("");
    setMinPrice("");
    setMaxPrice("");
    setData([]);
    setStatus("idle");
    setError(null);
    setValidation(null);
  }, []);

  const busy = status === "loading";

  const header = (
    <View>
      <Text style={[s.eyebrow, {textAlign: align}]}>
        {tr("تصفية ذكية", "Smart filters")}
      </Text>
      <Text style={[s.title, {textAlign: align}]}>
        {tr("ابحث عن سيارتك", "Find your car")}
      </Text>
      <Text style={[s.subtitle, {textAlign: align}]}>
        {tr("حدد ما يهمك ودع الباقي لنا", "Set what matters and let us do the rest")}
      </Text>

      <View style={{height: 18}} />

      <Field
        icon="pricetag-outline" value={q} onChangeText={setQ}
        onClear={() => setQ("")}
        placeholder={tr("الماركة أو الموديل", "Make or model")}
        returnKeyType="next"
      />
      <Field
        icon="location-outline" value={city} onChangeText={setCity}
        onClear={() => setCity("")}
        placeholder={tr("المدينة", "City")} returnKeyType="next"
      />

      <View style={[s.row, {flexDirection: isRTL ? "row-reverse" : "row"}]}>
        <View style={s.half}>
          <Field
            icon="arrow-down-circle-outline" value={minPrice}
            onChangeText={setMinPrice} onClear={() => setMinPrice("")}
            placeholder={tr("أقل سعر", "Min price")}
            keyboardType="numeric" returnKeyType="next"
          />
        </View>
        <View style={s.half}>
          <Field
            icon="arrow-up-circle-outline" value={maxPrice}
            onChangeText={setMaxPrice} onClear={() => setMaxPrice("")}
            placeholder={tr("أعلى سعر", "Max price")}
            keyboardType="numeric" returnKeyType="search"
            onSubmitEditing={run}
          />
        </View>
      </View>

      {validation === "minMax" && (
        <View style={s.warn}>
          <Ionicons name="alert-circle" size={16} color="#B45309" />
          <Text style={s.warnText}>
            {tr(
              "أقل سعر يجب أن يكون أقل من أعلى سعر",
              "Minimum price must be less than maximum price"
            )}
          </Text>
        </View>
      )}

      <View style={[s.actionRow, {flexDirection: isRTL ? "row-reverse" : "row"}]}>
        <Pressable
          onPress={run} disabled={busy} accessibilityRole="button"
          style={({pressed}) => [s.btn, pressed && s.pressed, busy && s.btnDisabled]}
        >
          {busy ? (
            <ActivityIndicator color={colors.black} size="small" />
          ) : (
            <Ionicons name="search" size={18} color={colors.black} />
          )}
          <Text style={s.btnText}>
            {busy ? tr("جاري البحث…", "Searching…") : tr("بحث", "Search")}
          </Text>
        </Pressable>

        <Pressable
          onPress={reset} accessibilityRole="button"
          style={({pressed}) => [s.ghost, pressed && s.pressed]}
        >
          <Ionicons name="refresh" size={16} color="#555" />
          <Text style={s.ghostText}>{tr("مسح", "Reset")}</Text>
        </Pressable>
      </View>

      {!!error && data.length > 0 && (
        <View style={s.banner}>
          <Text style={s.bannerText}>
            {tr(
              "تعذر تحديث النتائج — اضغط بحث للمحاولة مجدداً",
              "Couldn't refresh results — tap Search to retry"
            )}
          </Text>
        </View>
      )}

      {status === "ready" && data.length > 0 && (
        <View style={[s.resultsRow, {flexDirection: isRTL ? "row-reverse" : "row"}]}>
          <Text style={s.resultsTitle}>{tr("النتائج", "Results")}</Text>
          <View style={s.countPill}>
            <Text style={s.countText}>
              {tr(`${data.length} إعلان`, `${data.length} listings`)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderEmpty = () => {
    if (status === "loading") {
      return (
        <View style={s.stateCard}>
          <ActivityIndicator color={colors.gold} size="large" />
          <Text style={s.stateHint}>{tr("نبحث لك…", "Searching…")}</Text>
        </View>
      );
    }

    if (status === "error") {
      return (
        <View style={s.stateCard}>
          <View style={s.stateIcon}><Text style={s.stateIconText}>!</Text></View>
          <Text style={s.stateTitle}>
            {tr("تعذر تحميل النتائج", "Couldn't load results")}
          </Text>
          <Text style={s.stateHint}>
            {tr("تحقق من اتصالك ثم حاول مرة أخرى", "Check your connection and try again")}
          </Text>
          <Pressable
            onPress={run} accessibilityRole="button"
            style={({pressed}) => [s.retryBtn, pressed && s.pressed]}
          >
            <Text style={s.retryText}>{tr("إعادة المحاولة", "Retry")}</Text>
          </Pressable>
        </View>
      );
    }

    if (status === "ready") {
      return (
        <View style={s.stateCard}>
          <View style={s.stateIcon}><Text style={s.stateIconText}>🔎</Text></View>
          <Text style={s.stateTitle}>{tr("لا نتائج مطابقة", "No matching results")}</Text>
          <Text style={s.stateHint}>
            {tr(
              "جرّب توسيع نطاق السعر أو تغيير المدينة",
              "Try widening the price range or changing the city"
            )}
          </Text>
        </View>
      );
    }

    return (
      <View style={s.stateCard}>
        <View style={s.stateIcon}><Text style={s.stateIconText}>🚘</Text></View>
        <Text style={s.stateTitle}>{tr("ابدأ بحثك", "Start your search")}</Text>
        <Text style={s.stateHint}>
          {tr("استخدم الحقول أعلاه للبحث والتصفية", "Use the fields above to search and filter")}
        </Text>
      </View>
    );
  };

  return (
    <FlatList
      data={data} keyExtractor={(x) => String(x.id)}
      renderItem={({item}) => <ListingCard item={item} />}
      ItemSeparatorComponent={Separator} ListHeaderComponent={header}
      ListEmptyComponent={renderEmpty}
      contentContainerStyle={[
        s.content,
        {paddingTop: insets.top + 16, paddingBottom: insets.bottom + 90},
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      initialNumToRender={6} maxToRenderPerBatch={8} windowSize={9}
      removeClippedSubviews={false}
    />
  );
}

const s = StyleSheet.create({
  content: {paddingHorizontal: 16},
  eyebrow: {fontSize: 12, fontWeight: "800", color: colors.gold, letterSpacing: 0.6},
  title: {fontSize: 26, fontWeight: "900", color: "#111", marginTop: 4},
  subtitle: {fontSize: 14, color: colors.muted, marginTop: 6, lineHeight: 20},
  field: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: colors.line,
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 4,
    alignItems: "center", gap: 8, marginBottom: 10,
  },
  input: {flex: 1, paddingVertical: 11, fontSize: 14, color: "#111"},
  row: {gap: 10},
  half: {flex: 1},
  warn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#FFF7E6", borderWidth: 1, borderColor: "#FED7AA",
    borderRadius: 10, padding: 10, marginBottom: 10,
  },
  warnText: {color: "#B45309", fontSize: 12, fontWeight: "600", flex: 1},
  actionRow: {gap: 10, marginTop: 4, marginBottom: 20},
  btn: {
    flex: 1, backgroundColor: colors.gold, borderRadius: 14,
    paddingVertical: 14, flexDirection: "row", gap: 8,
    alignItems: "center", justifyContent: "center",
  },
  btnDisabled: {opacity: 0.7},
  btnText: {fontWeight: "900", color: colors.black, fontSize: 15},
  ghost: {
    paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1, borderColor: "#E5E7EB", flexDirection: "row",
    gap: 6, alignItems: "center", justifyContent: "center", backgroundColor: "#fff",
  },
  ghostText: {fontWeight: "700", color: "#555", fontSize: 13},
  pressed: {opacity: 0.85, transform: [{scale: 0.98}]},
  banner: {
    backgroundColor: "#FFF4E5", borderColor: "#FFD8A8",
    borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 12,
  },
  bannerText: {color: "#8A5300", fontSize: 12, fontWeight: "600", textAlign: "center"},
  resultsRow: {alignItems: "center", justifyContent: "space-between", marginBottom: 12},
  resultsTitle: {fontSize: 17, fontWeight: "900", color: "#111"},
  countPill: {backgroundColor: "#F2F2F5", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999},
  countText: {fontSize: 12, fontWeight: "700", color: "#5A5F6B"},
  stateCard: {
    backgroundColor: "#fff", borderRadius: 20, borderWidth: 1,
    borderColor: "#EEE", padding: 24, alignItems: "center", marginTop: 4,
  },
  stateIcon: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: "#F6F1E4",
    alignItems: "center", justifyContent: "center", marginBottom: 14,
  },
  stateIconText: {fontSize: 24, fontWeight: "900", color: colors.gold},
  stateTitle: {fontSize: 16, fontWeight: "800", color: "#111", textAlign: "center"},
  stateHint: {fontSize: 13, color: colors.muted, textAlign: "center", marginTop: 6, lineHeight: 20},
  retryBtn: {
    marginTop: 16, backgroundColor: colors.black,
    paddingHorizontal: 22, paddingVertical: 12, borderRadius: 999,
  },
  retryText: {color: "#fff", fontWeight: "800", fontSize: 14},
});
