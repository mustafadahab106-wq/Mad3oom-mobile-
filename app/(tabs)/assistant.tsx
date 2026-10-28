import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Platform,
  Pressable, StyleSheet, Text, TextInput, View,
} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {Ionicons} from "@expo/vector-icons";
import {chatWithDibo, type ChatTurn} from "@/lib/api";
import {colors} from "@/constants/theme";
import {useLanguage} from "@/contexts/LanguageContext";

type MsgStatus = "sending" | "sent" | "failed";
type Msg = ChatTurn & {id: string; status?: MsgStatus; errorDetail?: string};
const GREETING_ID = "hello";
const MAX_LEN = 1000;

export default function Assistant() {
  const {tr, isRTL} = useLanguage();
  const insets = useSafeAreaInsets();
  const align = isRTL ? "right" : "left";
  const dir = isRTL ? "row-reverse" : "row";

  const mounted = useRef(true);
  const sending = useRef(false);
  const requestId = useRef(0);
  const idCounter = useRef(0);
  const listRef = useRef<FlatList<Msg>>(null);

  const greetingText = useMemo(() => tr(
    "أهلاً! أنا ديبو، مساعد مدعوم الذكي. اسألني عن سيارة، سعر، فحص أو إعلان 🚗",
    "Hi! I'm Dibo, MAD3OOM's AI assistant. Ask me about cars, prices, inspections or listings 🚗"
  ), [tr]);
  const initialMessages: Msg[] = useMemo(() => [{
    id: GREETING_ID, role: "assistant", content: greetingText, status: "sent",
  }], [greetingText]);

  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>(initialMessages);

  useEffect(() => {
    setMessages((prev) => prev.length === 1 && prev[0].id === GREETING_ID
      ? [{...prev[0], content: greetingText}] : prev);
  }, [greetingText]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      requestId.current += 1;
    };
  }, []);

  const nextId = useCallback(() => {
    idCounter.current += 1;
    return `m_${Date.now()}_${idCounter.current}`;
  }, []);
  const scrollToEnd = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      if (mounted.current) listRef.current?.scrollToEnd({animated});
    });
  }, []);

  const callApi = useCallback(async (userText: string, history: ChatTurn[]): Promise<string> => {
    try {
      const result = await chatWithDibo(userText, history);
      const reply = typeof result?.reply === "string" ? result.reply.trim() : "";
      if (!reply) throw new Error(tr("لم يصل رد، حاول مرة أخرى.", "No reply received, try again."));
      return reply;
    } catch (e) {
      throw new Error(e instanceof Error && e.message ? e.message :
        tr("تعذر الاتصال بديبو حاليًا.", "Could not connect to Dibo."));
    }
  }, [tr]);

  const buildHistory = useCallback((excludeId?: string): ChatTurn[] =>
    messages.filter((m) =>
      m.id !== GREETING_ID && m.id !== excludeId &&
      m.status !== "failed" && m.status !== "sending"
    ).map(({role, content}) => ({role, content})), [messages]);

  const send = useCallback(async (rawText?: string) => {
    if (sending.current || !mounted.current) return;
    const value = (rawText ?? input).trim().slice(0, MAX_LEN);
    if (!value) return;
    const activeRequest = ++requestId.current;
    sending.current = true;
    setBusy(true);
    setInput("");
    const userMsg: Msg = {
      id: nextId(), role: "user", content: value, status: "sending",
    };
    const history = buildHistory();
    setMessages((prev) => [...prev, userMsg]);
    scrollToEnd();
    try {
      const reply = await callApi(value, history);
      if (!mounted.current || activeRequest !== requestId.current) return;
      setMessages((prev) => [
        ...prev.map((m) => m.id === userMsg.id ? {...m, status: "sent" as const} : m),
        {id: nextId(), role: "assistant", content: reply, status: "sent"},
      ]);
      scrollToEnd();
    } catch (e: unknown) {
      if (!mounted.current || activeRequest !== requestId.current) return;
      const detail = e instanceof Error ? e.message : String(e ?? "unknown");
      setMessages((prev) => prev.map((m) => m.id === userMsg.id
        ? {...m, status: "failed" as const, errorDetail: detail} : m));
      scrollToEnd();
    } finally {
      if (activeRequest === requestId.current) {
        sending.current = false;
        if (mounted.current) setBusy(false);
      }
    }
  }, [input, callApi, buildHistory, nextId, scrollToEnd]);

  const retry = useCallback(async (id: string) => {
    if (sending.current || !mounted.current) return;
    const failed = messages.find((m) =>
      m.id === id && m.status === "failed" && m.role === "user");
    if (!failed) return;
    const activeRequest = ++requestId.current;
    sending.current = true;
    setBusy(true);
    // Retrying is a new turn: move the question to the end to match API history.
    setMessages((prev) => [
      ...prev.filter((m) => m.id !== id),
      {...failed, status: "sending" as const, errorDetail: undefined},
    ]);
    const history = buildHistory(id);
    scrollToEnd();
    try {
      const reply = await callApi(failed.content, history);
      if (!mounted.current || activeRequest !== requestId.current) return;
      setMessages((prev) => [
        ...prev.map((m) => m.id === id ? {...m, status: "sent" as const} : m),
        {id: nextId(), role: "assistant", content: reply, status: "sent"},
      ]);
      scrollToEnd();
    } catch (e) {
      if (!mounted.current || activeRequest !== requestId.current) return;
      const detail = e instanceof Error ? e.message : String(e ?? "unknown");
      setMessages((prev) => prev.map((m) => m.id === id
        ? {...m, status: "failed" as const, errorDetail: detail} : m));
      scrollToEnd();
    } finally {
      if (activeRequest === requestId.current) {
        sending.current = false;
        if (mounted.current) setBusy(false);
      }
    }
  }, [messages, callApi, buildHistory, nextId, scrollToEnd]);

  const onContentSizeChange = useCallback(() => {scrollToEnd(false);}, [scrollToEnd]);
  const canSend = input.trim().length > 0 && !busy;
  const showSuggestions = messages.length === 1 && messages[0].id === GREETING_ID;
  const suggestions = useMemo(() => [
    tr("ما أفضل سيارة عائلية تحت 50 ألف؟", "Best family car under 50k?"),
    tr("كيف أفحص سيارة قبل الشراء؟", "How do I inspect a car before buying?"),
    tr("ما أوراق نقل الملكية في الإمارات؟", "What's needed to transfer ownership in the UAE?"),
  ], [tr]);

  return <KeyboardAvoidingView style={s.page}
    behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
    <View style={[s.intro, {flexDirection: dir, paddingTop: insets.top + 12}]}>
      <View style={s.face}><Text style={s.robot}>🤖</Text><View style={s.onlineDot} /></View>
      <View style={{flex: 1}}>
        <Text style={[s.title, {textAlign: align}]}>{tr("ديبو AI", "Dibo AI")}</Text>
        <Text style={[s.subtitle, {textAlign: align}]}>{busy ? tr("يكتب الآن…", "Typing…") :
          tr("مساعدك الذكي في مدعوم", "Your intelligent MAD3OOM assistant")}</Text>
      </View>
    </View>

    <FlatList ref={listRef} data={messages} keyExtractor={(m) => m.id}
      contentContainerStyle={s.list} keyboardShouldPersistTaps="handled"
      onContentSizeChange={onContentSizeChange} onLayout={() => scrollToEnd(false)}
      renderItem={({item}) => <MessageRow item={item} align={align} dir={dir} tr={tr}
        retryDisabled={busy} onRetry={() => retry(item.id)} />}
      ListFooterComponent={<>
        {busy && <View style={[s.typing, {flexDirection: dir, alignSelf: isRTL ? "flex-end" : "flex-start"}]}>
          <ActivityIndicator size="small" color={colors.gold} />
          <Text style={s.typingText}>{tr("ديبو يكتب...", "Dibo is typing...")}</Text>
        </View>}
        {showSuggestions && <View style={s.suggestWrap}>
          <Text style={[s.suggestLabel, {textAlign: align}]}>{tr("جرّب أحد هذه الأسئلة:", "Try one of these:")}</Text>
          <View style={[s.suggestList, {flexDirection: dir}]}>
            {suggestions.map((q) => <Pressable key={q} onPress={() => send(q)}
              disabled={busy} style={({pressed}) => [s.suggestChip, pressed && s.pressed]}>
              <Ionicons name="sparkles" size={12} color={colors.gold} />
              <Text style={s.suggestText}>{q}</Text>
            </Pressable>)}
          </View>
        </View>}
      </>}
    />

    <View style={[s.inputWrap, {flexDirection: dir, paddingBottom: Math.max(insets.bottom, 12)}]}>
      <View style={[s.inputBox, {flexDirection: dir}]}>
        <TextInput style={[s.input, {textAlign: align}]} value={input} onChangeText={setInput}
          placeholder={tr("اكتب سؤالك لديبو...", "Ask Dibo a question...")}
          placeholderTextColor="#9AA0AA" returnKeyType="send" onSubmitEditing={() => send()}
          maxLength={MAX_LEN} editable={!busy} autoCorrect={false} />
        {input.length > 0 && <Pressable onPress={() => setInput("")} hitSlop={8}
          accessibilityRole="button" accessibilityLabel={tr("مسح", "Clear")}>
          <Ionicons name="close-circle" size={18} color="#B8BCC4" />
        </Pressable>}
      </View>
      <Pressable style={({pressed}) => [s.send, !canSend && s.sendDisabled, pressed && canSend && s.pressed]}
        onPress={() => send()} disabled={!canSend} accessibilityRole="button" accessibilityLabel={tr("إرسال", "Send")}>
        {busy ? <ActivityIndicator size="small" color={colors.gold} /> :
          <Ionicons name={isRTL ? "arrow-back" : "send"} size={20} color={canSend ? colors.gold : "#666"} />}
      </Pressable>
    </View>
  </KeyboardAvoidingView>;
}

function MessageRow({item, align, dir, tr, onRetry, retryDisabled}: {
  item: Msg; align: "left" | "right"; dir: "row" | "row-reverse";
  tr: (ar: string, en: string) => string; onRetry: () => void; retryDisabled: boolean;
}) {
  const mine = item.role === "user";
  const failed = item.status === "failed";
  const isSending = item.status === "sending";
  return <View style={[s.row, {flexDirection: dir, justifyContent: mine ? "flex-start" : "flex-end"}]}>
    {!mine && <View style={s.avatar}><Text style={s.avatarText}>🤖</Text></View>}
    <View style={{maxWidth: "82%"}}>
      <View style={[s.bubble, mine ? s.mine : s.dibo, failed && s.bubbleFailed]}>
        <Text style={[mine ? s.mineText : s.diboText, {textAlign: align}]}>{item.content}</Text>
        {isSending && <View style={[s.statusRow, {justifyContent: "flex-end"}]}>
          <ActivityIndicator size="small" color="#888" />
        </View>}
      </View>
      {failed && <View style={[s.failRow, {flexDirection: dir}]}>
        <Ionicons name="alert-circle" size={13} color="#B45309" />
        <Text style={s.failText}>{tr("تعذر الإرسال", "Message failed")}</Text>
        <Pressable onPress={onRetry} hitSlop={6} disabled={retryDisabled}
          accessibilityRole="button" accessibilityLabel={tr("إعادة المحاولة", "Retry")}>
          <Text style={s.retryText}>{tr("إعادة المحاولة", "Retry")}</Text>
        </Pressable>
      </View>}
    </View>
    {mine && <View style={[s.avatar, s.avatarMine]}>
      <Ionicons name="person" size={16} color={colors.gold} />
    </View>}
  </View>;
}

const s = StyleSheet.create({
  page: {flex: 1, backgroundColor: colors.bg},
  intro: {alignItems: "center", gap: 12, backgroundColor: "#fff", paddingHorizontal: 15, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.line},
  face: {width: 52, height: 52, borderRadius: 26, backgroundColor: colors.black, borderWidth: 2, borderColor: colors.gold, alignItems: "center", justifyContent: "center"},
  robot: {fontSize: 26},
  onlineDot: {position: "absolute", bottom: 0, end: 0, width: 13, height: 13, borderRadius: 7, backgroundColor: "#22C55E", borderWidth: 2, borderColor: "#fff"},
  title: {fontSize: 18, fontWeight: "900"},
  subtitle: {fontSize: 12, color: colors.muted, marginTop: 2},
  list: {padding: 16, gap: 12},
  row: {alignItems: "flex-end", gap: 8},
  avatar: {width: 30, height: 30, borderRadius: 15, backgroundColor: colors.black, alignItems: "center", justifyContent: "center"},
  avatarMine: {backgroundColor: "#F4EACB", borderWidth: 1, borderColor: "#E8D9A5"},
  avatarText: {fontSize: 15},
  bubble: {paddingHorizontal: 13, paddingVertical: 11, borderRadius: 17},
  mine: {backgroundColor: colors.gold, borderBottomRightRadius: 6},
  dibo: {backgroundColor: "#fff", borderWidth: 1, borderColor: colors.line, borderBottomLeftRadius: 6},
  bubbleFailed: {borderColor: "#F5C19A", borderWidth: 1, backgroundColor: "#FFF7EE"},
  mineText: {fontWeight: "700", color: "#111", lineHeight: 20},
  diboText: {color: "#111", lineHeight: 20},
  statusRow: {marginTop: 4},
  failRow: {alignItems: "center", gap: 6, marginTop: 6, paddingHorizontal: 4},
  failText: {color: "#B45309", fontSize: 11, fontWeight: "700"},
  retryText: {color: "#8B6914", fontSize: 11, fontWeight: "900", textDecorationLine: "underline"},
  typing: {alignItems: "center", gap: 8, paddingHorizontal: 4, paddingVertical: 6, marginStart: 38},
  typingText: {fontSize: 12, color: colors.muted, fontWeight: "600"},
  suggestWrap: {marginTop: 16, gap: 10},
  suggestLabel: {fontSize: 12, color: colors.muted, fontWeight: "700"},
  suggestList: {flexWrap: "wrap", gap: 8},
  suggestChip: {flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fff", borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, maxWidth: "100%"},
  suggestText: {fontSize: 12, color: "#333", fontWeight: "600", flexShrink: 1},
  inputWrap: {alignItems: "center", gap: 9, paddingHorizontal: 12, paddingTop: 10, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: colors.line},
  inputBox: {flex: 1, alignItems: "center", gap: 6, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, borderRadius: 23, paddingHorizontal: 16},
  input: {flex: 1, paddingVertical: 11, fontSize: 14, color: "#111"},
  send: {width: 46, height: 46, borderRadius: 23, backgroundColor: colors.black, alignItems: "center", justifyContent: "center"},
  sendDisabled: {backgroundColor: "#1A1A1A", opacity: 0.7},
  pressed: {opacity: 0.85, transform: [{scale: 0.97}]},
});
