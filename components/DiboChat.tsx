import {useRef,useState} from "react";
import {ActivityIndicator,FlatList,KeyboardAvoidingView,Modal,Platform,Pressable,StyleSheet,Text,TextInput,View} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {Ionicons} from "@expo/vector-icons";
import {chatWithDibo,ChatTurn} from "@/lib/api";
import {colors} from "@/constants/theme";

// أفاتار ديبو — دائرة بسيطة برمز تعبيري، بدون أي مكتبة رسم إضافية
function DiboFace({size=44}:{size?:number}){
  return <View style={[faceStyles.circle,{width:size,height:size,borderRadius:size/2}]}>
    <Text style={{fontSize:size*0.52}}>🤖</Text>
  </View>;
}
const faceStyles=StyleSheet.create({
  circle:{backgroundColor:"#1a1a1a",borderWidth:2,borderColor:colors.gold,alignItems:"center",justifyContent:"center"},
});

type Msg=ChatTurn&{id:string};

export default function DiboChat(){
  const insets=useSafeAreaInsets();
  const [open,setOpen]=useState(false);
  const [input,setInput]=useState("");
  const [busy,setBusy]=useState(false);
  const [messages,setMessages]=useState<Msg[]>([
    {id:"greet",role:"assistant",content:"أهلاً! أنا ديبو، مساعد مدعوم. اسألني عن أي سيارة تدور عليها 🚗"},
  ]);
  const listRef=useRef<FlatList>(null);

  const send=async()=>{
    const text=input.trim();
    if(!text||busy)return;
    const userMsg:Msg={id:String(Date.now()),role:"user",content:text};
    const history=messages.map(({role,content})=>({role,content}));
    setMessages(m=>[...m,userMsg]);
    setInput("");
    setBusy(true);
    try{
      const {reply}=await chatWithDibo(text,history);
      setMessages(m=>[...m,{id:String(Date.now()+1),role:"assistant",content:reply}]);
    }catch{
      setMessages(m=>[...m,{id:String(Date.now()+1),role:"assistant",content:"تعذر الاتصال حاليًا، جرب مرة ثانية بعد شوي."}]);
    }finally{
      setBusy(false);
      setTimeout(()=>listRef.current?.scrollToEnd({animated:true}),100);
    }
  };

  return <>
    <Pressable style={[s.fab,{bottom:insets.bottom+80}]} onPress={()=>setOpen(true)}>
      <DiboFace size={40}/>
    </Pressable>

    <Modal visible={open} animationType="slide" onRequestClose={()=>setOpen(false)}>
      <KeyboardAvoidingView style={{flex:1,backgroundColor:colors.bg}} behavior={Platform.OS==="ios"?"padding":"height"}>
        <View style={[s.header,{paddingTop:insets.top+10}]}>
          <DiboFace size={34}/>
          <Text style={s.headerTitle}>ديبو — مساعد مدعوم</Text>
          <Pressable onPress={()=>setOpen(false)} style={s.closeBtn}><Ionicons name="close" size={24} color="#fff"/></Pressable>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m=>m.id}
          contentContainerStyle={s.list}
          renderItem={({item})=>(
            <View style={[s.bubble,item.role==="user"?s.bubbleUser:s.bubbleAi]}>
              <Text style={item.role==="user"?s.bubbleUserText:s.bubbleAiText}>{item.content}</Text>
            </View>
          )}
          onContentSizeChange={()=>listRef.current?.scrollToEnd({animated:true})}
        />

        {busy&&<View style={s.typing}><ActivityIndicator size="small" color={colors.gold}/><Text style={s.typingText}>ديبو يكتب...</Text></View>}

        <View style={[s.inputRow,{paddingBottom:insets.bottom+10}]}>
          <TextInput
            style={s.input}
            value={input}
            onChangeText={setInput}
            placeholder="اكتب سؤالك..."
            textAlign="right"
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <Pressable style={s.sendBtn} onPress={send} disabled={busy}>
            <Ionicons name="send" size={20} color="#fff"/>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </>;
}

const s=StyleSheet.create({
  fab:{position:"absolute",right:18,width:60,height:60,borderRadius:30,backgroundColor:"#1a1a1a",borderWidth:2,borderColor:colors.gold,alignItems:"center",justifyContent:"center",elevation:6,shadowColor:"#000",shadowOpacity:0.3,shadowRadius:8,shadowOffset:{width:0,height:3},zIndex:50},
  header:{flexDirection:"row-reverse",alignItems:"center",gap:10,backgroundColor:colors.black,paddingHorizontal:16,paddingBottom:14},
  headerTitle:{color:"#fff",fontWeight:"900",fontSize:16,flex:1,textAlign:"right"},
  closeBtn:{padding:4},
  list:{padding:16,gap:10},
  bubble:{maxWidth:"80%",padding:12,borderRadius:16},
  bubbleUser:{alignSelf:"flex-end",backgroundColor:colors.gold,borderBottomEndRadius:4},
  bubbleAi:{alignSelf:"flex-start",backgroundColor:"#fff",borderWidth:1,borderColor:colors.line,borderBottomStartRadius:4},
  bubbleUserText:{textAlign:"right",fontWeight:"700",color:"#1a1a1a"},
  bubbleAiText:{textAlign:"right",color:"#1a1a1a"},
  typing:{flexDirection:"row-reverse",alignItems:"center",gap:8,paddingHorizontal:16,paddingBottom:6},
  typingText:{color:colors.muted,fontSize:12},
  inputRow:{flexDirection:"row-reverse",gap:8,padding:12,borderTopWidth:1,borderTopColor:colors.line,backgroundColor:"#fff"},
  input:{flex:1,backgroundColor:colors.bg,borderWidth:1,borderColor:colors.line,borderRadius:20,paddingHorizontal:16,paddingVertical:10},
  sendBtn:{width:44,height:44,borderRadius:22,backgroundColor:colors.gold,alignItems:"center",justifyContent:"center"},
});
