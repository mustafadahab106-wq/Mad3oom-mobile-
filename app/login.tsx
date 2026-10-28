import {forwardRef, useCallback, useEffect, useRef, useState} from "react";
import type {ReactNode} from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps,
} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {router, useLocalSearchParams} from "expo-router";
import {Ionicons} from "@expo/vector-icons";
import {useAuth} from "@/contexts/AuthContext";
import {colors} from "@/constants/theme";
import {useLanguage} from "@/contexts/LanguageContext";

type FieldErrors = {name?: string; email?: string; password?: string; form?: string};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 6;
const MIN_NAME = 2;
const MAX_NAME = 60;
const AUTH_REDIRECTS = [
  "/(tabs)", "/(tabs)/add", "/(tabs)/profile", "/(tabs)/search",
  "/add", "/profile", "/search", "/messages", "/assistant",
  "/edit-profile", "/my-listings", "/notifications",
] as const;

export default function Login() {
  const insets = useSafeAreaInsets();
  const {tr, isRTL} = useLanguage();
  const {signIn, signUp} = useAuth();
  const params = useLocalSearchParams<{redirect?: string}>();
  const align = isRTL ? "right" : "left";
  const dir = isRTL ? "row-reverse" : "row";
  const [registering, setRegistering] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const mounted = useRef(true);
  const submitting = useRef(false);
  const nameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const clearField = useCallback((k: "name" | "email" | "password") => {
    setErrors((e) => !e[k] && !e.form ? e : {...e, [k]: undefined, form: undefined});
  }, []);
  const afterAuth = useCallback(() => {
    const redirect = AUTH_REDIRECTS.find((path) => path === params.redirect);
    if (redirect) { router.replace(redirect); return; }
    if (router.canGoBack()) { router.back(); return; }
    router.replace("/(tabs)");
  }, [params.redirect]);

  const validate = (): FieldErrors => {
    const e: FieldErrors = {};
    if (registering) {
      const n = name.trim();
      if (n.length < MIN_NAME) e.name = tr("الاسم قصير جداً", "Name is too short");
      else if (n.length > MAX_NAME) e.name = tr("الاسم طويل جداً", "Name is too long");
    }
    const em = email.trim();
    if (!em) e.email = tr("البريد الإلكتروني مطلوب", "Email is required");
    else if (!EMAIL_RE.test(em)) e.email = tr("أدخل بريداً صحيحاً", "Enter a valid email");
    if (!password) e.password = tr("كلمة المرور مطلوبة", "Password is required");
    else if (registering && password.length < MIN_PASSWORD) e.password = tr(
      `كلمة المرور يجب أن تكون ${MIN_PASSWORD} أحرف على الأقل`,
      `Password must be at least ${MIN_PASSWORD} characters`);
    return e;
  };
  const mapAuthError = (raw: string | undefined): string => {
    if (!raw) return tr("تعذر الاتصال بالخادم، حاول مجدداً", "Could not reach the server, try again");
    const s = raw.toLowerCase();
    if (/invalid.*credential|wrong.*password|incorrect|بيانات.*خاطئة|كلمة.*مرور.*خاطئة/i.test(s))
      return tr("البريد أو كلمة المرور غير صحيحة", "Incorrect email or password");
    if (/user.*not.*found|لا يوجد مستخدم|not registered/i.test(s))
      return tr("لا يوجد حساب بهذا البريد", "No account with this email");
    if (/already.*exist|مسجل|مستخدم.*موجود/i.test(s))
      return tr("هذا البريد مسجل بالفعل، جرّب تسجيل الدخول", "This email is already registered, try signing in");
    if (/network|timeout|failed to fetch|اتصال/i.test(s))
      return tr("تحقق من اتصالك بالإنترنت", "Check your internet connection");
    if (/weak.*password|كلمة.*ضعيفة/i.test(s))
      return tr("كلمة المرور ضعيفة جداً", "Password is too weak");
    if (/rate.*limit|too many|محاولات.*كثيرة/i.test(s))
      return tr("محاولات كثيرة، انتظر قليلاً ثم حاول مجدداً", "Too many attempts, wait a moment and try again");
    return raw;
  };
  const submit = async () => {
    if (submitting.current || !mounted.current) return;
    const v = validate();
    if (Object.keys(v).length > 0) {
      setErrors(v);
      if (v.name) nameRef.current?.focus();
      else if (v.email) emailRef.current?.focus();
      else if (v.password) passwordRef.current?.focus();
      return;
    }
    submitting.current = true;
    setBusy(true);
    setErrors({});
    try {
      if (registering) await signUp(name.trim(), email.trim().toLowerCase(), password);
      else await signIn(email.trim().toLowerCase(), password);
      if (mounted.current) afterAuth();
    } catch (e: unknown) {
      if (!mounted.current) return;
      setErrors({form: mapAuthError(e instanceof Error ? e.message : "")});
    } finally {
      submitting.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const toggleMode = () => {
    if (submitting.current) return;
    setRegistering((v) => !v);
    setErrors({});
    setPassword("");
    setShowPassword(false);
  };

  return <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <ScrollView contentContainerStyle={[s.page, {
      paddingTop: insets.top + 28, paddingBottom: insets.bottom + 28,
    }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={s.wrap}>
        <View style={s.hero}>
          <View style={s.logoBadge}><Text style={s.logoBadgeText}>M</Text></View>
          <Text style={s.brand}>MAD3OOM</Text>
          <Text style={[s.brandSub, {textAlign: "center"}]}>{tr("سوق السيارات الموثوق", "The trusted car marketplace")}</Text>
        </View>
        <View style={s.card}>
          <Text style={[s.title, {textAlign: align}]}>{registering ? tr("إنشاء حساب", "Create account") : tr("مرحباً بعودتك", "Welcome back")}</Text>
          <Text style={[s.subtitle, {textAlign: align}]}>{registering ? tr("أدخل بياناتك للبدء", "Enter your details to get started") : tr("سجّل دخولك للمتابعة", "Sign in to continue")}</Text>
          {!!errors.form && <View style={[s.formError, {flexDirection: dir}]}>
            <Ionicons name="alert-circle" size={16} color="#B91C1C" />
            <Text style={[s.formErrorText, {textAlign: align}]} accessibilityLiveRegion="polite">{errors.form}</Text>
          </View>}
          {registering && <Field ref={nameRef} icon="person-outline" placeholder={tr("الاسم الكامل", "Full name")}
            value={name} onChangeText={(v) => {setName(v); clearField("name");}}
            error={errors.name} align={align} dir={dir} editable={!busy}
            autoCapitalize="words" autoComplete="name" textContentType="name"
            returnKeyType="next" onSubmitEditing={() => emailRef.current?.focus()} />}
          <Field ref={emailRef} icon="mail-outline" placeholder={tr("البريد الإلكتروني", "Email")}
            value={email} onChangeText={(v) => {setEmail(v); clearField("email");}}
            error={errors.email} align={align} dir={dir} editable={!busy}
            keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
            autoComplete="email" textContentType="emailAddress" returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()} />
          <Field ref={passwordRef} icon="lock-closed-outline" placeholder={tr("كلمة المرور", "Password")}
            value={password} onChangeText={(v) => {setPassword(v); clearField("password");}}
            error={errors.password} align={align} dir={dir} editable={!busy}
            secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false}
            autoComplete={registering ? "new-password" : "current-password"}
            textContentType={registering ? "newPassword" : "password"}
            returnKeyType="go" onSubmitEditing={submit}
            trailing={<Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}
              disabled={busy} accessibilityRole="button"
              accessibilityLabel={showPassword ? tr("إخفاء كلمة المرور", "Hide password") : tr("إظهار كلمة المرور", "Show password")}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#8A8F99" />
            </Pressable>} />
          <Pressable onPress={submit} disabled={busy}
            style={({pressed}) => [s.btn, {flexDirection: dir}, pressed && !busy && s.pressed, busy && s.btnBusy]}
            accessibilityRole="button" accessibilityState={{busy, disabled: busy}}>
            {busy && <ActivityIndicator size="small" color={colors.black} style={{marginEnd: 6}} />}
            <Text style={s.btnText}>{busy ? tr("انتظر...", "Please wait...") : registering ? tr("إنشاء الحساب", "Create account") : tr("دخول", "Sign in")}</Text>
          </Pressable>
          <Pressable onPress={toggleMode} disabled={busy} style={s.switchWrap} accessibilityRole="button">
            <Text style={s.switchText}>{registering ? tr("لديك حساب؟ سجّل الدخول", "Already have an account? Sign in") : tr("ليس لديك حساب؟ أنشئ حساباً", "No account? Create one")}</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  </KeyboardAvoidingView>;
}

type FieldProps = {
  icon: keyof typeof Ionicons.glyphMap; placeholder: string; value: string;
  onChangeText: (v: string) => void; error?: string;
  align: "left" | "right"; dir: "row" | "row-reverse"; trailing?: ReactNode;
} & Pick<TextInputProps,
  "secureTextEntry" | "keyboardType" | "autoCapitalize" | "autoCorrect" |
  "autoComplete" | "textContentType" | "returnKeyType" | "onSubmitEditing" | "editable">;

const Field = forwardRef<TextInput, FieldProps>(function Field({
  icon, placeholder, value, onChangeText, error, align, dir, trailing, ...rest
}, ref) {
  const hasError = !!error;
  return <View style={{marginBottom: hasError ? 4 : 11}}>
    <View style={[s.inputWrap, {flexDirection: dir}, hasError && s.inputWrapError]}>
      <Ionicons name={icon} size={18} color={hasError ? "#B91C1C" : "#8A8F99"} />
      <TextInput ref={ref} style={[s.input, {textAlign: align}]} placeholder={placeholder}
        placeholderTextColor="#9AA0AA" value={value} onChangeText={onChangeText} {...rest} />
      {trailing}
    </View>
    {hasError && <Text style={[s.fieldError, {textAlign: align}]} accessibilityLiveRegion="polite">{error}</Text>}
  </View>;
});

const s = StyleSheet.create({
  page: {flexGrow: 1, paddingHorizontal: 22, justifyContent: "center", backgroundColor: "#fff"},
  wrap: {width: "100%", maxWidth: 420, alignSelf: "center"},
  hero: {alignItems: "center", marginBottom: 22},
  logoBadge: {width: 60, height: 60, borderRadius: 16, backgroundColor: colors.black, borderWidth: 2, borderColor: colors.gold, alignItems: "center", justifyContent: "center", marginBottom: 12},
  logoBadgeText: {color: colors.gold, fontSize: 28, fontWeight: "900"},
  brand: {color: colors.gold, fontSize: 22, fontWeight: "900", letterSpacing: 3},
  brandSub: {color: colors.muted, fontSize: 12, marginTop: 6, fontWeight: "600"},
  card: {backgroundColor: "#fff", borderRadius: 22, borderWidth: 1, borderColor: colors.line, padding: 22},
  title: {fontSize: 22, fontWeight: "900", color: "#111"},
  subtitle: {fontSize: 13, color: colors.muted, marginTop: 4, marginBottom: 18, lineHeight: 19},
  formError: {alignItems: "center", gap: 8, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FCA5A5", borderRadius: 12, padding: 11, marginBottom: 14},
  formErrorText: {color: "#B91C1C", fontSize: 13, fontWeight: "600", flex: 1, lineHeight: 18},
  inputWrap: {alignItems: "center", gap: 9, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 12, backgroundColor: "#fff"},
  inputWrapError: {borderColor: "#FCA5A5", backgroundColor: "#FEF7F7"},
  input: {flex: 1, paddingVertical: 13, fontSize: 14, color: "#111"},
  fieldError: {color: "#B91C1C", fontSize: 12, fontWeight: "600", marginBottom: 7, paddingHorizontal: 2},
  btn: {backgroundColor: colors.gold, borderRadius: 14, paddingVertical: 15, alignItems: "center", justifyContent: "center", marginTop: 6},
  btnBusy: {opacity: 0.75},
  btnText: {fontWeight: "900", color: colors.black, fontSize: 15},
  pressed: {opacity: 0.9, transform: [{scale: 0.99}]},
  switchWrap: {marginTop: 18, alignItems: "center"},
  switchText: {color: colors.blue, fontWeight: "700", fontSize: 13},
});
