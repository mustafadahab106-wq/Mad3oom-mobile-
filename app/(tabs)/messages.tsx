import {useCallback,useState} from "react";
import {FlatList,Pressable,StyleSheet,Text,View} from "react-native";
import {router,useFocusEffect} from "expo-router";
import {Conversation,getConversations} from "@/lib/api";
import {useAuth} from "@/contexts/AuthContext";
import {colors} from "@/constants/theme";
import {useLanguage} from "@/contexts/LanguageContext";
export default function Messages(){
 const{tr}=useLanguage();
 const{user}=useAuth();const[data,setData]=useState<Conversation[]>([]);const[error,setError]=useState("");
 useFocusEffect(useCallback(()=>{if(user)getConversations().then(setData).catch(e=>setError(e.message))},[user]));
 if(!user)return <View style={s.center}><Text>{tr("سجّل الدخول لعرض محادثاتك","Sign in to view your conversations")}</Text><Pressable style={s.btn} onPress={()=>router.push("/login")}><Text style={s.btnText}>{tr("تسجيل الدخول","Sign in")}</Text></Pressable></View>;
 return <FlatList data={data} keyExtractor={x=>String(x.id)} contentContainerStyle={s.page} renderItem={({item})=><Pressable style={s.item} onPress={()=>router.push({pathname:"/chat/[id]",params:{id:String(item.id)}})}><View style={s.avatar}><Text>M</Text></View><View style={{flex:1}}><Text style={s.name}>{item.otherUserName||`${tr("مستخدم","User")} #${item.otherUserId||""}`}</Text><Text style={s.sub}>{tr("اضغط لفتح المحادثة","Tap to open conversation")}</Text></View></Pressable>} ListEmptyComponent={<Text style={s.empty}>{error||tr("لا توجد محادثات بعد","No conversations yet")}</Text>}/>} 
const s=StyleSheet.create({page:{padding:16},center:{flex:1,justifyContent:"center",alignItems:"center",gap:15},btn:{backgroundColor:colors.gold,padding:13,borderRadius:12},btnText:{fontWeight:"900"},item:{backgroundColor:"#fff",padding:14,borderRadius:15,marginBottom:10,flexDirection:"row-reverse",alignItems:"center",gap:12},avatar:{width:44,height:44,borderRadius:22,backgroundColor:colors.gold,alignItems:"center",justifyContent:"center"},name:{fontWeight:"900",textAlign:"right"},sub:{color:colors.muted,textAlign:"right",marginTop:4,fontSize:12},empty:{textAlign:"center",padding:50,color:colors.muted}})
