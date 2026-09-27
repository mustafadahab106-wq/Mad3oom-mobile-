import {useEffect,useState} from "react";
import {FlatList,KeyboardAvoidingView,Platform,Pressable,StyleSheet,Text,TextInput,View} from "react-native";
import {useLocalSearchParams} from "expo-router";
import {getMessages,Message,sendMessage} from "@/lib/api";
import {useAuth} from "@/contexts/AuthContext";
import {colors} from "@/constants/theme";
import {useLanguage} from "@/contexts/LanguageContext";
export default function Chat(){
 const{tr,isRTL}=useLanguage();
 const{id}=useLocalSearchParams<{id:string}>();const{user}=useAuth();const[data,setData]=useState<Message[]>([]);const[text,setText]=useState("");
 const load=()=>getMessages(id).then(setData);useEffect(()=>{load();const timer=setInterval(load,5000);return()=>clearInterval(timer)},[id]);
 const send=async()=>{const body=text.trim();if(!body)return;setText("");await sendMessage(id,body);load()};
 return <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==="ios"?"padding":undefined} keyboardVerticalOffset={90}><FlatList data={data} inverted keyExtractor={x=>String(x.id)} contentContainerStyle={s.list} renderItem={({item})=>{const mine=Number(item.senderId)===Number(user?.id);return <View style={[s.bubble,mine?s.mine:s.theirs]}><Text style={mine?s.mineText:s.theirText}>{item.body}</Text></View>}}/><View style={s.composer}><Pressable style={s.send} onPress={send}><Text style={s.sendText}>{tr("إرسال","Send")}</Text></Pressable><TextInput style={s.input} value={text} onChangeText={setText} placeholder={tr("اكتب رسالة...","Write a message...")} textAlign={isRTL?"right":"left"}/></View></KeyboardAvoidingView>
}
const s=StyleSheet.create({list:{padding:14,flexDirection:"column-reverse"},bubble:{maxWidth:"82%",padding:11,borderRadius:15,marginVertical:4},mine:{alignSelf:"flex-end",backgroundColor:colors.blue},theirs:{alignSelf:"flex-start",backgroundColor:"#fff"},mineText:{color:"#fff",textAlign:"right"},theirText:{color:colors.text,textAlign:"right"},composer:{flexDirection:"row",padding:10,backgroundColor:"#fff",gap:8},input:{flex:1,backgroundColor:"#F1F2F3",borderRadius:22,paddingHorizontal:15},send:{backgroundColor:colors.gold,borderRadius:22,paddingHorizontal:17,justifyContent:"center"},sendText:{fontWeight:"900"}})
