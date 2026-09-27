import {useRef,useState} from "react";
import {ActivityIndicator,FlatList,KeyboardAvoidingView,Platform,Pressable,StyleSheet,Text,TextInput,View} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import {chatWithDibo,ChatTurn} from "@/lib/api";
import {colors} from "@/constants/theme";
import {useLanguage} from "@/contexts/LanguageContext";

type Msg=ChatTurn&{id:string};

export default function Assistant(){
 const{tr,isRTL}=useLanguage();const align=isRTL?"right":"left";
 const[input,setInput]=useState("");const[busy,setBusy]=useState(false);
 const[messages,setMessages]=useState<Msg[]>([{id:"hello",role:"assistant",content:tr("أهلاً! أنا ديبو، مساعد مدعوم الذكي. اسألني عن سيارة، سعر، فحص أو إعلان 🚗","Hi! I'm Dibo, MAD3OOM's AI assistant. Ask me about cars, prices, inspections or listings 🚗")}]);
 const list=useRef<FlatList<Msg>>(null);
 const send=async()=>{const value=input.trim();if(!value||busy)return;const mine:Msg={id:String(Date.now()),role:"user",content:value};const history=messages.map(({role,content})=>({role,content}));setMessages(v=>[...v,mine]);setInput("");setBusy(true);try{const result=await chatWithDibo(value,history);setMessages(v=>[...v,{id:String(Date.now()+1),role:"assistant",content:result.reply||"لم يصل رد، حاول مرة أخرى."}])}catch(e:any){setMessages(v=>[...v,{id:String(Date.now()+1),role:"assistant",content:e.message||"تعذر الاتصال بديبو حاليًا."}])}finally{setBusy(false)}};
 return <KeyboardAvoidingView style={s.page} behavior={Platform.OS==="ios"?"padding":undefined}>
  <View style={s.intro}><View style={s.face}><Text style={s.robot}>🤖</Text></View><View style={{flex:1}}><Text style={[s.title,{textAlign:align}]}>{tr("ديبو AI","Dibo AI")}</Text><Text style={[s.subtitle,{textAlign:align}]}>{tr("مساعدك الذكي في مدعوم","Your intelligent MAD3OOM assistant")}</Text></View><View style={s.online}/></View>
  <FlatList ref={list} data={messages} keyExtractor={m=>m.id} contentContainerStyle={s.list} onContentSizeChange={()=>list.current?.scrollToEnd({animated:true})} renderItem={({item})=><View style={[s.bubble,item.role==="user"?s.mine:s.dibo]}><Text style={item.role==="user"?s.mineText:s.diboText}>{item.content}</Text></View>}/>
  {busy&&<View style={s.typing}><ActivityIndicator size="small" color={colors.gold}/><Text>{tr("ديبو يكتب...","Dibo is typing...")}</Text></View>}
  <View style={s.inputRow}><TextInput style={s.input} value={input} onChangeText={setInput} placeholder={tr("اكتب سؤالك لديبو...","Ask Dibo a question...")} textAlign={align} returnKeyType="send" onSubmitEditing={send}/><Pressable style={s.send} onPress={send} disabled={busy}><Ionicons name="send" size={21} color="#fff"/></Pressable></View>
 </KeyboardAvoidingView>
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:colors.bg},intro:{flexDirection:"row-reverse",alignItems:"center",gap:12,backgroundColor:"#fff",padding:15,borderBottomWidth:1,borderBottomColor:colors.line},face:{width:50,height:50,borderRadius:25,backgroundColor:colors.black,borderWidth:2,borderColor:colors.gold,alignItems:"center",justifyContent:"center"},robot:{fontSize:27},title:{fontSize:18,fontWeight:"900",textAlign:"right"},subtitle:{fontSize:12,color:colors.muted,textAlign:"right",marginTop:2},online:{width:10,height:10,borderRadius:5,backgroundColor:"#22C55E"},list:{padding:16,gap:10},bubble:{maxWidth:"82%",padding:13,borderRadius:17},mine:{alignSelf:"flex-end",backgroundColor:colors.gold,borderBottomRightRadius:4},dibo:{alignSelf:"flex-start",backgroundColor:"#fff",borderWidth:1,borderColor:colors.line,borderBottomLeftRadius:4},mineText:{textAlign:"right",fontWeight:"700",color:"#111"},diboText:{textAlign:"right",color:"#111"},typing:{flexDirection:"row-reverse",gap:8,alignItems:"center",paddingHorizontal:16,paddingVertical:5},inputRow:{flexDirection:"row-reverse",gap:9,padding:12,backgroundColor:"#fff",borderTopWidth:1,borderTopColor:colors.line},input:{flex:1,backgroundColor:colors.bg,borderWidth:1,borderColor:colors.line,borderRadius:23,paddingHorizontal:16,paddingVertical:11},send:{width:46,height:46,borderRadius:23,backgroundColor:colors.black,alignItems:"center",justifyContent:"center"}});
