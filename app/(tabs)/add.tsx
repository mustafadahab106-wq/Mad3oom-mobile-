import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {Image} from "expo-image";
import * as ImagePicker from "expo-image-picker";
import {router} from "expo-router";
import {Ionicons} from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import FormField from "@/components/FormField";
import {useAuth} from "@/contexts/AuthContext";
import {useLanguage} from "@/contexts/LanguageContext";
import {completeListingWithAI, createListing} from "@/lib/api";
import {colors} from "@/constants/theme";

const LEGAL_OPTIONS = [
  {v: "possession", l: "حيازة"}, {v: "ownership", l: "ملكية"},
  {v: "scrap", l: "اسكراب"}, {v: "export_only", l: "تصدير فقط"},
];
const SPECS_OPTIONS = [
  {v: "gcc", l: "خليجي"}, {v: "american", l: "أمريكي"},
  {v: "korean", l: "كوري"}, {v: "other", l: "أخرى"},
];
const labelOf = (options: readonly {v: string; l: string}[], value: string) =>
  options.find((x) => x.v === value)?.l || value;
const EMPTY = {
  make: "", model: "", year: "", mileage: "", price: "", city: "",
  specs: "", damageType: "", legalStatus: "", vin: "", whatsapp: "", description: "",
};
const DRAFT_KEY = "draft_listing";
const DRAFT_VERSION = 2;
const MAX_IMAGES = 8;
type Form = typeof EMPTY;
const isValidWhatsapp = (v: string) =>
  /^[+\d\s()-]{7,20}$/.test(v.trim()) &&
  v.replace(/\D/g, "").length >= 7;
const safeErrMsg = (e: unknown, fallback: string) =>
  e instanceof Error && e.message ? e.message : fallback;

export default function Add() {
  const insets = useSafeAreaInsets();
  const {user, signOut} = useAuth();
  const {tr, isRTL} = useLanguage();
  const align = isRTL ? "right" : "left";
  const dir = isRTL ? "row-reverse" : "row";
  const STEPS = useMemo(() => [
    tr("معلومات أساسية", "Basic info"), tr("الصور والوصف", "Photos & description"),
    tr("مراجعة", "Review"),
  ], [tr]);
  const GUIDE = useMemo(() => [
    tr("الأمام", "Front"), tr("الجانب الأيمن", "Right side"),
    tr("الجانب الأيسر", "Left side"), tr("المحرك", "Engine"),
    tr("الخلف", "Rear"), tr("رقم الشاصي", "VIN plate"),
    tr("الداخلية", "Interior"), tr("العداد", "Odometer"),
  ], [tr]);

  const scrollRef = useRef<ScrollView>(null);
  const mounted = useRef(true);
  const publishing = useRef(false);
  const aiRequestId = useRef(0);
  const aiRunning = useRef(false);
  const authSynced = useRef(false);
  const draftEnabled = useRef(true);
  const draftSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDraft = useRef<Record<string, unknown> | null>(null);
  // Serialize writes and deletion so an older save cannot restore a published draft.
  const draftQueue = useRef<Promise<void>>(Promise.resolve());
  const enqueueDraft = useCallback((operation: () => Promise<void>) => {
    const task = draftQueue.current.catch(() => {}).then(operation);
    draftQueue.current = task;
    return task;
  }, []);

  const [step, setStep] = useState(1);
  const [f, setF] = useState<Form>(EMPTY);
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState("");
  const [aiFilled, setAiFilled] = useState(false);
  const [draftReady, setDraftReady] = useState(false);

  const set = useCallback((k: keyof Form, v: string) => {
    if (publishing.current || aiRunning.current) return;
    draftEnabled.current = true;
    setF((p) => ({...p, [k]: v}));
    if (["make", "model", "year", "mileage", "price", "damageType", "description", "vin"].includes(k)) {
      setAiFilled(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      aiRequestId.current += 1;
      if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
      const snap = latestDraft.current;
      if (snap && draftEnabled.current) {
        enqueueDraft(() => AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(snap))).catch(() => {});
      }
    };
  }, [enqueueDraft]);

  // Populate defaults only after draft restoration, preserving saved values.
  useEffect(() => {
    if (!draftReady || !user || authSynced.current) return;
    authSynced.current = true;
    setF((p) => ({
      ...p, whatsapp: p.whatsapp || user.phone || "",
      city: p.city || user.city || "",
    }));
  }, [draftReady, user]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(DRAFT_KEY);
        if (!raw || !active || !mounted.current) return;
        const saved = JSON.parse(raw);
        const savedFields = saved?.fields ?? saved?.form;
        if (savedFields && typeof savedFields === "object") {
          const safe: Partial<Form> = {};
          (Object.keys(EMPTY) as (keyof Form)[]).forEach((k) => {
            const val = savedFields[k];
            if (typeof val === "string") safe[k] = val;
          });
          setF((p) => ({...p, ...safe}));
        }
        if (Array.isArray(saved?.images)) {
          setImages(saved.images.filter((x: unknown) => typeof x === "string").slice(0, MAX_IMAGES));
        }
        if (Number.isInteger(saved?.step) && saved.step >= 1 && saved.step <= 3) {
          setStep(saved.step);
        }
      } catch (e) {
        if (__DEV__) console.warn("[Add] draft load failed:", e);
      } finally {
        if (active && mounted.current) setDraftReady(true);
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    if (draftSaveTimer.current) {
      clearTimeout(draftSaveTimer.current);
      draftSaveTimer.current = null;
    }
    if (!draftEnabled.current) return;
    const hasData = Object.values(f).some((v) => v.trim()) || images.length > 0;
    if (!hasData) {
      latestDraft.current = null;
      enqueueDraft(() => AsyncStorage.removeItem(DRAFT_KEY)).catch(() => {});
      return;
    }
    latestDraft.current = {
      version: DRAFT_VERSION, fields: f, images, step, timestamp: new Date().toISOString(),
    };
    draftSaveTimer.current = setTimeout(() => {
      draftSaveTimer.current = null;
      const snap = latestDraft.current;
      if (!snap || !draftEnabled.current) return;
      enqueueDraft(() => AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(snap))).catch((e) => {
        if (__DEV__) console.warn("[Add] draft save failed:", e);
      });
    }, 400);
    return () => {
      if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
    };
  }, [draftReady, f, images, step, enqueueDraft]);

  useEffect(() => {
    scrollRef.current?.scrollTo({y: 0, animated: true});
  }, [step]);

  const limitAlert = () => Alert.alert(
    tr("الحد الأقصى", "Limit reached"),
    tr(`تقدر ترفع ${MAX_IMAGES} صور كحد أقصى`, `You can upload up to ${MAX_IMAGES} photos`)
  );
  const gallery = async () => {
    if (publishing.current || aiRunning.current) return;
    const left = MAX_IMAGES - images.length;
    if (left <= 0) return limitAlert();
    try {
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"], allowsMultipleSelection: true, quality: 0.6, selectionLimit: left,
      });
      if (!r.canceled && mounted.current && !publishing.current && !aiRunning.current) {
        draftEnabled.current = true;
        setAiFilled(false);
        setImages((p) => [...p, ...r.assets.map((a) => a.uri)].slice(0, MAX_IMAGES));
      }
    } catch (e) {
      if (!mounted.current) return;
      if (__DEV__) console.warn("[Add] gallery failed:", e);
      Alert.alert(tr("تعذر فتح المعرض", "Could not open gallery"),
        safeErrMsg(e, tr("حدث خطأ غير متوقع", "Unexpected error")));
    }
  };
  const camera = async () => {
    if (publishing.current || aiRunning.current) return;
    if (images.length >= MAX_IMAGES) return limitAlert();
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!mounted.current) return;
      if (!perm.granted) return Alert.alert(tr("الكاميرا", "Camera"),
        tr("نحتاج إذن الكاميرا لتصوير السيارة", "We need camera access to photograph the car"));
      const r = await ImagePicker.launchCameraAsync({quality: 0.6});
      if (!r.canceled && mounted.current && !publishing.current && !aiRunning.current) {
        draftEnabled.current = true;
        setAiFilled(false);
        setImages((p) => [...p, r.assets[0].uri].slice(0, MAX_IMAGES));
      }
    } catch (e) {
      if (!mounted.current) return;
      if (__DEV__) console.warn("[Add] camera failed:", e);
      Alert.alert(tr("تعذر فتح الكاميرا", "Could not open camera"),
        safeErrMsg(e, tr("حدث خطأ غير متوقع", "Unexpected error")));
    }
  };

  const runAi = async () => {
    if (aiRunning.current || publishing.current) return;
    if (!user) return Alert.alert(tr("تسجيل الدخول", "Sign in"),
      tr("سجّل دخولك أولاً لاستخدام الذكاء الاصطناعي", "Sign in first to use AI"),
      [
        {text: tr("إلغاء", "Cancel"), style: "cancel"},
        {text: tr("تسجيل الدخول", "Sign in"), onPress: () => router.push("/login")},
      ]);
    if (images.length === 0) return Alert.alert(tr("الصور مطلوبة", "Photos required"),
      tr("ارفع صورة واحدة على الأقل أولاً", "Upload at least one photo first"));
    const id = ++aiRequestId.current;
    aiRunning.current = true;
    setAiBusy(true);
    setAiNote("");
    try {
      const sg = await completeListingWithAI(images, {
        make: f.make, model: f.model, year: f.year, city: f.city,
      });
      if (!mounted.current || id !== aiRequestId.current) return;
      draftEnabled.current = true;
      setF((p) => ({
        ...p, make: sg.make || p.make, model: sg.model || p.model,
        year: sg.year ? String(sg.year) : p.year,
        damageType: sg.damageType || p.damageType,
        description: sg.description || p.description,
        price: sg.suggestedPriceAED ? String(sg.suggestedPriceAED) : p.price,
        vin: sg.vin || p.vin,
        mileage: sg.mileage != null ? String(sg.mileage) : p.mileage,
      }));
      setAiFilled(true);
      setAiNote(tr("تم تعبئة البيانات — راجعها قبل النشر", "Details filled in — review before publishing"));
    } catch (e) {
      if (!mounted.current || id !== aiRequestId.current) return;
      setAiNote(safeErrMsg(e, tr("تعذر تحليل الصور", "Could not analyze the photos")));
    } finally {
      if (id === aiRequestId.current) {
        aiRunning.current = false;
        if (mounted.current) setAiBusy(false);
      }
    }
  };

  const step1Missing = () => {
    const m: string[] = [];
    if (!f.make.trim()) m.push(tr("الشركة المصنعة", "Make"));
    if (!f.model.trim()) m.push(tr("الموديل", "Model"));
    if (!/^\d{4}$/.test(f.year.trim()) || Number(f.year) < 1900 ||
      Number(f.year) > new Date().getFullYear() + 1)
      m.push(tr("سنة الصنع (4 أرقام)", "Year (4 digits)"));
    if (f.mileage.trim() && (!/^\d+$/.test(f.mileage.trim()) || Number(f.mileage) < 0))
      m.push(tr("المسافة المقطوعة", "Mileage"));
    if (!f.city.trim()) m.push(tr("المدينة", "City"));
    if (!f.price.trim() || !Number.isFinite(Number(f.price)) || Number(f.price) <= 0)
      m.push(tr("السعر", "Price"));
    return m;
  };
  const goNext = () => {
    if (publishing.current || aiRunning.current) return;
    if (step === 1) {
      const m = step1Missing();
      if (m.length) return Alert.alert(tr("بيانات ناقصة", "Missing information"),
        `${tr("أكمل", "Complete")}: ${m.join(tr("، ", ", "))}`);
    }
    if (step === 2 && !isValidWhatsapp(f.whatsapp)) return Alert.alert(
      tr("رقم التواصل", "Contact number"), tr("أدخل رقم واتساب صحيحًا", "Enter a valid WhatsApp number"));
    setStep((v) => Math.min(v + 1, 3));
  };
  const saveDraftNow = () => {
    const snap = {
      version: DRAFT_VERSION, fields: f, images, step, timestamp: new Date().toISOString(),
    };
    latestDraft.current = snap;
    if (draftSaveTimer.current) {
      clearTimeout(draftSaveTimer.current);
      draftSaveTimer.current = null;
    }
    return enqueueDraft(() => AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(snap)));
  };

  const publish = async () => {
    if (publishing.current || aiRunning.current || !draftReady) return;
    const missing = step1Missing();
    if (missing.length) {
      setStep(1);
      return Alert.alert(tr("بيانات ناقصة", "Missing information"),
        `${tr("أكمل", "Complete")}: ${missing.join(tr("، ", ", "))}`);
    }
    if (!isValidWhatsapp(f.whatsapp)) {
      setStep(2);
      return Alert.alert(tr("رقم التواصل", "Contact number"),
        tr("أدخل رقم واتساب صحيحًا", "Enter a valid WhatsApp number"));
    }
    if (!user) {
      await saveDraftNow().catch(() => {});
      if (mounted.current) router.push({pathname: "/login", params: {redirect: "/(tabs)/add"}});
      return;
    }
    publishing.current = true;
    setBusy(true);
    try {
      const d = await createListing(f, images);
      const id = d?.data?.id || d?.id;
      draftEnabled.current = false;
      latestDraft.current = null;
      if (draftSaveTimer.current) {
        clearTimeout(draftSaveTimer.current);
        draftSaveTimer.current = null;
      }
      if (mounted.current) {
        setF(EMPTY); setImages([]); setStep(1); setAiNote(""); setAiFilled(false);
      }
      await enqueueDraft(() => AsyncStorage.removeItem(DRAFT_KEY)).catch((e) => {
        if (__DEV__) console.warn("[Add] draft remove failed:", e);
      });
      if (!mounted.current) return;
      Alert.alert(tr("تم", "Done"), tr("تم نشر الإعلان", "Listing published"));
      if (id) router.push({pathname: "/listing/[id]", params: {id: String(id)}});
    } catch (e) {
      const msg = safeErrMsg(e, tr("حدث خطأ غير متوقع", "Unexpected error"));
      if (/401|unauthorized|انتهت الجلسة|غير مصرح/i.test(msg)) {
        await saveDraftNow().catch(() => {});
        await signOut().catch(() => {});
        if (!mounted.current) return;
        Alert.alert(tr("انتهت الجلسة", "Session expired"),
          tr("تم حفظ الإعلان كمسودة. سجّل الدخول مرة أخرى للمتابعة.",
            "Your listing was saved as a draft. Sign in again to continue."),
          [{text: tr("تسجيل الدخول", "Sign in"), onPress: () =>
            router.replace({pathname: "/login", params: {redirect: "/(tabs)/add"}})}]);
      } else if (mounted.current) {
        Alert.alert(tr("تعذر النشر", "Could not publish"), msg);
      }
    } finally {
      publishing.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  if (!draftReady) return <View style={{flex: 1, alignItems: "center", justifyContent: "center"}}>
    <ActivityIndicator color={colors.gold} size="large" />
  </View>;

  return (
    <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView ref={scrollRef}
        contentContainerStyle={[s.page, {paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40}]}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
      >
        <View pointerEvents={busy || aiBusy ? "none" : "auto"}>
        <View style={[s.steps, {flexDirection: dir}]}>
          {STEPS.map((label, i) => {
            const n = i + 1, done = step > n, on = step === n;
            return <View key={label} style={{flexDirection: dir, flex: i < STEPS.length - 1 ? 1 : 0, alignItems: "flex-start"}}>
              <View style={s.stepCol}>
                <View style={[s.circle, on && s.circleOn, done && s.circleDone]}>
                  {done ? <Ionicons name="checkmark" size={18} color={colors.black} /> :
                    <Text style={[s.circleNum, on && {color: colors.black}]}>{n}</Text>}
                </View>
                <Text style={[s.stepLabel, (on || done) && s.stepLabelOn]} numberOfLines={2}>{label}</Text>
              </View>
              {i < STEPS.length - 1 && <View style={[s.line, step > n && s.lineOn]} />}
            </View>;
          })}
        </View>

        {step === 1 && <View>
          <Text style={[s.h2, {textAlign: align}]}>{tr("معلومات السيارة الأساسية", "Basic vehicle information")}</Text>
          <View style={[s.underline, {alignSelf: isRTL ? "flex-end" : "flex-start"}]} />
          <FormField label={tr("الشركة المصنعة", "Make")} icon="car-sport" value={f.make} onChangeText={(v) => set("make", v)} placeholder={tr("مثال: Toyota", "e.g. Toyota")} />
          <FormField label={tr("الموديل", "Model")} icon="car" value={f.model} onChangeText={(v) => set("model", v)} placeholder={tr("مثال: Camry", "e.g. Camry")} />
          <FormField label={tr("سنة الصنع", "Year")} icon="calendar" value={f.year} onChangeText={(v) => set("year", v)} placeholder={tr("مثال: 2020", "e.g. 2020")} keyboardType="numeric" maxLength={4} />
          <FormField label={tr("المسافة المقطوعة (كم)", "Mileage (km)")} icon="speedometer" value={f.mileage} onChangeText={(v) => set("mileage", v)} placeholder={tr("مثال: 85000", "e.g. 85000")} keyboardType="numeric" />
          <FormField label={tr("السعر (د.إ)", "Price (AED)")} icon="pricetag" value={f.price} onChangeText={(v) => set("price", v)} placeholder={tr("مثال: 25000", "e.g. 25000")} keyboardType="numeric" />
          <FormField label={tr("المدينة", "City")} icon="location" value={f.city} onChangeText={(v) => set("city", v)} placeholder={tr("مثال: دبي", "e.g. Dubai")} />
          <View style={[s.labelRow, {flexDirection: dir}]}>
            <View style={s.labelIcon}><Ionicons name="globe" size={15} color={colors.gold} /></View>
            <Text style={s.labelText}>{tr("مواصفات السيارة", "Vehicle specs")}</Text>
          </View>
          <View style={[s.chips, {flexDirection: dir}]}>
            {SPECS_OPTIONS.map((o) => {
              const on = f.specs === o.v;
              return <Pressable key={o.v} style={({pressed}) => [s.chip, on && s.chipOn, pressed && s.pressed]}
                onPress={() => set("specs", on ? "" : o.v)}>
                <Text style={[s.chipText, on && s.chipTextOn]}>{tr(o.l, o.v)}</Text>
              </Pressable>;
            })}
          </View>
        </View>}

        {step === 2 && <View>
          <View style={[s.sources, {flexDirection: dir}]}>
            <Pressable style={({pressed}) => [s.source, pressed && s.pressed]} onPress={camera}>
              <Ionicons name="camera" size={26} color={colors.gold} /><Text style={s.sourceText}>{tr("الكاميرا", "Camera")}</Text>
            </Pressable>
            <Pressable style={({pressed}) => [s.source, pressed && s.pressed]} onPress={gallery}>
              <Ionicons name="images" size={26} color={colors.gold} /><Text style={s.sourceText}>{tr("المعرض", "Gallery")}</Text>
            </Pressable>
          </View>
          <Text style={[s.photoCount, {textAlign: align}]}>{images.length}/{MAX_IMAGES} {tr("صور", "photos")}</Text>
          <View style={[s.guide, {flexDirection: dir}]}>
            {GUIDE.map((g, i) => <Text key={g} style={[s.guideItem, {textAlign: align}]}>{i + 1}. {g}</Text>)}
          </View>
          {images.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.thumbs}>
            {images.map((uri, i) => <Pressable key={uri + i} onPress={() => {
              if (publishing.current || aiRunning.current) return;
              draftEnabled.current = true; setAiFilled(false);
              setImages((p) => p.filter((_, x) => x !== i));
            }}>
              <Image source={uri} style={s.thumb} contentFit="cover" />
              {i === 0 && <View style={s.coverBadge}>
                <Ionicons name="star" size={10} color={colors.black} />
                <Text style={s.coverBadgeText}>{tr("غلاف", "Cover")}</Text>
              </View>}
              <View style={s.remove}><Ionicons name="close" size={14} color="#fff" /></View>
            </Pressable>)}
          </ScrollView>}
          <Pressable style={({pressed}) => [s.aiBtn, {flexDirection: dir}, (aiBusy || pressed) && {opacity: 0.85}]}
            onPress={runAi} disabled={aiBusy || busy}>
            {aiBusy ? <ActivityIndicator color={colors.gold} /> : <Ionicons name="sparkles" size={18} color={colors.gold} />}
            <Text style={s.aiBtnText}>{aiBusy ? tr("جاري التحليل...", "Analyzing...") : tr("أكمل بالذكاء الاصطناعي", "Complete with AI")}</Text>
          </Pressable>
          {!!aiNote && <Text style={[s.aiNote, {textAlign: align}]}>{aiNote}</Text>}
          {aiFilled && <Pressable onPress={() => setStep(3)} style={({pressed}) => [s.aiCta, {flexDirection: dir}, pressed && s.pressed]}>
            <Text style={s.aiCtaText}>{tr("مراجعة الآن", "Review now")}</Text>
            <Ionicons name={isRTL ? "arrow-back" : "arrow-forward"} size={16} color={colors.black} />
          </Pressable>}
          <Text style={[s.h2, {marginTop: 22, textAlign: align}]}>{tr("تفاصيل إضافية", "Additional details")}</Text>
          <View style={[s.underline, {alignSelf: isRTL ? "flex-end" : "flex-start"}]} />
          <FormField label={tr("نوع الضرر", "Damage type")} icon="build" value={f.damageType} onChangeText={(v) => set("damageType", v)} placeholder={tr("مثال: حادث أمامي", "e.g. front collision")} />
          <View style={[s.labelRow, {flexDirection: dir}]}>
            <View style={s.labelIcon}><Ionicons name="document-text" size={15} color={colors.gold} /></View>
            <Text style={s.labelText}>{tr("الحالة القانونية", "Legal status")}</Text>
          </View>
          <View style={[s.chips, {flexDirection: dir}]}>
            {LEGAL_OPTIONS.map((o) => {
              const on = f.legalStatus === o.v;
              return <Pressable key={o.v} style={({pressed}) => [s.chip, on && s.chipOn, pressed && s.pressed]}
                onPress={() => set("legalStatus", on ? "" : o.v)}>
                <Text style={[s.chipText, on && s.chipTextOn]}>{tr(o.l, o.v)}</Text>
              </Pressable>;
            })}
          </View>
          <View style={{height: 14}} />
          <FormField label={tr("رقم الهيكل (VIN)", "VIN")} icon="barcode" value={f.vin} onChangeText={(v) => set("vin", v.toUpperCase().replace(/\s/g, ""))} placeholder="XXXXXXXXXXXXXXXXX" maxLength={17} ltr />
          <FormField label={tr("رقم التواصل (واتساب)", "Contact number (WhatsApp)")} icon="logo-whatsapp" value={f.whatsapp} onChangeText={(v) => set("whatsapp", v)} placeholder="+9715XXXXXXXX" keyboardType="phone-pad" hint={tr("سيستخدمه المشترون للتواصل معك", "Buyers will use this number to contact you")} />
          <FormField label={tr("وصف مفصل", "Detailed description")} icon="create" value={f.description} onChangeText={(v) => set("description", v)} placeholder={tr("اكتب وصف السيارة وحالتها", "Describe the car and its condition")} multiline />
        </View>}

        {step === 3 && <View><View style={s.reviewCard}>
          <View style={[s.reviewHead, {flexDirection: dir}]}>
            <Pressable onPress={() => setStep(1)}><Text style={s.editLink}>{tr("تعديل", "Edit")}</Text></Pressable>
            <Text style={s.reviewTitle}>{tr("تفاصيل الإعلان", "Listing details")}</Text>
          </View>
          {!user && <View style={[s.notice, {flexDirection: dir}]}>
            <Ionicons name="information-circle" size={20} color={colors.gold} />
            <Text style={[s.noticeText, {textAlign: align}]}>{tr("يجب تسجيل الدخول أولاً لمتابعة نشر الإعلان", "You must sign in first to publish the listing")}</Text>
          </View>}
          <Text style={[s.sectionTitle, {textAlign: align}]}>{tr("المعلومات الأساسية", "Basic information")}</Text>
          <Row dir={dir} align={align} label={tr("الشركة", "Make")} value={f.make} na={tr("غير محدد", "Not set")} />
          <Row dir={dir} align={align} label={tr("الموديل", "Model")} value={f.model} na={tr("غير محدد", "Not set")} />
          <Row dir={dir} align={align} label={tr("السنة", "Year")} value={f.year} na={tr("غير محدد", "Not set")} />
          <Row dir={dir} align={align} label={tr("المسافة", "Mileage")} value={f.mileage ? `${Number(f.mileage).toLocaleString()} ${tr("كم", "km")}` : ""} na={tr("غير محدد", "Not set")} />
          <Row dir={dir} align={align} label={tr("السعر", "Price")} value={f.price ? `${Number(f.price).toLocaleString()} ${tr("د.إ", "AED")}` : ""} na={tr("غير محدد", "Not set")} />
          <Row dir={dir} align={align} label={tr("المدينة", "City")} value={f.city} na={tr("غير محدد", "Not set")} />
          <Row dir={dir} align={align} label={tr("المواصفات", "Specs")} value={labelOf(SPECS_OPTIONS, f.specs)} na={tr("غير محدد", "Not set")} />
          <View style={[s.reviewHead2, {flexDirection: dir}]}>
            <Pressable onPress={() => setStep(2)}><Text style={s.editLink}>{tr("تعديل", "Edit")}</Text></Pressable>
            <Text style={[s.sectionTitle, {textAlign: align, marginBottom: 0}]}>{tr("التفاصيل الإضافية", "Additional details")}</Text>
          </View>
          <View style={{height: 8}} />
          <Row dir={dir} align={align} label={tr("نوع الضرر", "Damage type")} value={f.damageType} na={tr("غير محدد", "Not set")} />
          <Row dir={dir} align={align} label={tr("الحالة القانونية", "Legal status")} value={labelOf(LEGAL_OPTIONS, f.legalStatus)} na={tr("غير محدد", "Not set")} />
          <Row dir={dir} align={align} label={tr("رقم الهيكل", "VIN")} value={f.vin} na={tr("غير محدد", "Not set")} />
          <Row dir={dir} align={align} label={tr("رقم التواصل", "Contact number")} value={f.whatsapp} na={tr("غير محدد", "Not set")} />
          {!!f.description && <Text style={[s.desc, {textAlign: align}]}>{f.description}</Text>}
          {images.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.thumbs, {marginTop: 14}]}>
            {images.map((uri, i) => <Image key={uri + i} source={uri} style={s.thumbSmall} contentFit="cover" />)}
          </ScrollView>}
        </View></View>}
        </View>

        <View style={[s.navRow, {flexDirection: dir}]}>
          {step < 3 ? <Pressable style={({pressed}) => [s.primary, {flexDirection: dir}, pressed && s.pressed]}
            onPress={goNext} disabled={busy || aiBusy}>
            <Text style={s.primaryText}>{tr("التالي", "Next")}</Text>
            <Ionicons name={isRTL ? "arrow-back" : "arrow-forward"} size={18} color={colors.black} />
          </Pressable> : <Pressable style={({pressed}) => [s.primary, {flexDirection: dir}, (busy || pressed) && {opacity: 0.75}]}
            onPress={publish} disabled={busy || aiBusy}>
            {busy && <ActivityIndicator color={colors.black} size="small" style={{marginEnd: 4}} />}
            <Text style={s.primaryText}>{busy ? tr("جاري النشر...", "Publishing...") : user ? tr("نشر الإعلان", "Publish listing") : tr("تسجيل الدخول للنشر", "Sign in to publish")}</Text>
            {!busy && <Ionicons name={user ? "checkmark-circle" : "log-in"} size={19} color={colors.black} />}
          </Pressable>}
          {step > 1 && <Pressable style={({pressed}) => [s.secondary, pressed && s.pressed]}
            onPress={() => setStep((v) => v - 1)} disabled={busy || aiBusy}>
            <Text style={s.secondaryText}>{tr("السابق", "Back")}</Text>
          </Pressable>}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Row({label, value, na, dir, align}: {
  label: string; value?: string; na: string;
  dir: "row" | "row-reverse"; align: "left" | "right";
}) {
  return <View style={[s.reviewRow, {flexDirection: dir}]}>
    <Text style={s.reviewLabel}>{label}</Text>
    <Text style={[s.reviewValue, {textAlign: align === "right" ? "left" : "right"},
      !value && {color: colors.muted, fontWeight: "600"}]} numberOfLines={2}>{value || na}</Text>
  </View>;
}

const s = StyleSheet.create({
  page: {paddingHorizontal: 16},
  steps: {alignItems: "flex-start", backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: colors.line, paddingVertical: 16, paddingHorizontal: 12, marginBottom: 22},
  stepCol: {width: 72, alignItems: "center"},
  circle: {width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: colors.line, backgroundColor: "#fff", alignItems: "center", justifyContent: "center"},
  circleOn: {backgroundColor: colors.gold, borderColor: colors.gold},
  circleDone: {backgroundColor: colors.gold, borderColor: colors.gold},
  circleNum: {fontWeight: "900", color: colors.muted, fontSize: 15},
  stepLabel: {marginTop: 7, fontSize: 11, color: colors.muted, fontWeight: "700", textAlign: "center"},
  stepLabelOn: {color: colors.text},
  line: {flex: 1, height: 2, borderRadius: 2, backgroundColor: colors.line, marginTop: 18},
  lineOn: {backgroundColor: colors.gold},
  h2: {fontSize: 20, fontWeight: "900"},
  underline: {width: 48, height: 4, borderRadius: 2, backgroundColor: colors.gold, marginTop: 8, marginBottom: 18},
  labelRow: {alignItems: "center", gap: 8, marginBottom: 9},
  labelIcon: {width: 28, height: 28, borderRadius: 14, backgroundColor: colors.black, alignItems: "center", justifyContent: "center"},
  labelText: {fontWeight: "800", fontSize: 14, color: colors.text},
  chips: {flexWrap: "wrap", gap: 8},
  chip: {paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: colors.line, backgroundColor: "#fff"},
  chipOn: {backgroundColor: colors.black, borderColor: colors.black},
  chipText: {fontWeight: "700", fontSize: 13, color: colors.text},
  chipTextOn: {color: colors.gold, fontWeight: "900"},
  pressed: {opacity: 0.85, transform: [{scale: 0.985}]},
  sources: {gap: 12},
  source: {flex: 1, height: 96, borderRadius: 16, borderWidth: 2, borderStyle: "dashed", borderColor: colors.line, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", gap: 6},
  sourceText: {fontWeight: "800", color: colors.text},
  photoCount: {color: colors.muted, fontSize: 12, marginTop: 8},
  guide: {flexWrap: "wrap", backgroundColor: "#FFF8E5", padding: 12, borderRadius: 14, marginTop: 12, gap: 7},
  guideItem: {width: "47%", fontSize: 12, color: "#5A4A12"},
  thumbs: {gap: 8, paddingVertical: 12},
  thumb: {width: 92, height: 70, borderRadius: 11},
  thumbSmall: {width: 72, height: 54, borderRadius: 9},
  remove: {position: "absolute", top: 4, end: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: "#000B", alignItems: "center", justifyContent: "center"},
  coverBadge: {position: "absolute", bottom: 4, start: 4, flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: colors.gold, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8},
  coverBadgeText: {color: colors.black, fontSize: 9, fontWeight: "900"},
  aiBtn: {backgroundColor: colors.black, padding: 15, borderRadius: 14, alignItems: "center", justifyContent: "center", gap: 9, marginTop: 6},
  aiBtnText: {color: colors.gold, fontWeight: "900", fontSize: 14},
  aiNote: {fontSize: 12, color: colors.muted, marginTop: 8, lineHeight: 18},
  aiCta: {marginTop: 10, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FFF4D6", borderWidth: 1, borderColor: "#EAD9A0", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999},
  aiCtaText: {color: colors.black, fontWeight: "800", fontSize: 12},
  reviewCard: {backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: colors.line, padding: 16},
  reviewHead: {justifyContent: "space-between", alignItems: "center", paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.line, marginBottom: 14},
  reviewHead2: {justifyContent: "space-between", alignItems: "center", marginTop: 18},
  reviewTitle: {fontSize: 18, fontWeight: "900"},
  editLink: {color: "#8B6914", fontWeight: "800"},
  notice: {alignItems: "center", gap: 9, backgroundColor: "#FFF8E5", borderWidth: 1, borderColor: "#F0DDA0", borderRadius: 13, padding: 12, marginBottom: 14},
  noticeText: {flex: 1, color: "#7A5C0B", fontWeight: "700", fontSize: 13},
  sectionTitle: {fontSize: 15, fontWeight: "900", marginBottom: 4},
  reviewRow: {justifyContent: "space-between", gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: "#F0F0EC"},
  reviewLabel: {color: colors.muted, fontSize: 13},
  reviewValue: {fontWeight: "800", fontSize: 14, flexShrink: 1, maxWidth: "60%"},
  desc: {color: "#555", lineHeight: 22, marginTop: 12},
  navRow: {gap: 12, marginTop: 24},
  primary: {flex: 1, alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.gold, paddingVertical: 16, borderRadius: 15},
  primaryText: {fontWeight: "900", fontSize: 15, color: colors.black},
  secondary: {paddingHorizontal: 24, paddingVertical: 16, borderRadius: 15, borderWidth: 1, borderColor: colors.line, backgroundColor: "#fff", alignItems: "center", justifyContent: "center"},
  secondaryText: {fontWeight: "800"},
});
