import {Tabs} from "expo-router";
import {useEffect,useState} from "react";
import {getNotifications} from "@/lib/api";
import {useAuth} from "@/contexts/AuthContext";
import {Ionicons} from "@expo/vector-icons";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {colors} from "@/constants/theme";
import {useLanguage} from "@/contexts/LanguageContext";
const icon=(name:any)=>({color,size}:{color:string;size:number})=><Ionicons name={name} color={color} size={size}/>;
export default function TabsLayout(){
 const insets=useSafeAreaInsets();
 const{tr}=useLanguage();
 const{user}=useAuth();
 const[unread,setUnread]=useState(0);
 useEffect(()=>{if(!user){setUnread(0);return}let active=true;const refresh=()=>getNotifications().then(list=>{if(active)setUnread(list.filter(n=>!n.readAt).length)}).catch(()=>{});refresh();const timer=setInterval(refresh,20000);return()=>{active=false;clearInterval(timer)}},[user?.id]);
 return <Tabs screenOptions={{headerStyle:{backgroundColor:colors.black},headerTintColor:"#fff",headerTitleAlign:"center",headerTitleStyle:{fontWeight:"900"},tabBarActiveTintColor:colors.gold,tabBarInactiveTintColor:"#858A93",tabBarStyle:{height:58+insets.bottom,paddingBottom:insets.bottom+6,paddingTop:6,backgroundColor:colors.black,borderTopColor:"#252930"}}}>
 <Tabs.Screen name="index" options={{title:tr("الرئيسية","Home"),headerTitle:"MAD3OOM",tabBarIcon:icon("home")}}/>
 <Tabs.Screen name="search" options={{title:tr("البحث","Search"),tabBarIcon:icon("search")}}/>
 <Tabs.Screen name="add" options={{title:tr("أضف إعلان","Add"),tabBarIcon:icon("add-circle")}}/>
 <Tabs.Screen name="notifications" options={{title:tr("الإشعارات","Notifications"),headerShown:false,tabBarIcon:icon("notifications"),tabBarBadge:unread?unread:undefined}}/>
 <Tabs.Screen name="assistant" options={{href:null,title:tr("ديبو AI","Dibo AI")}}/>
 <Tabs.Screen name="messages" options={{href:null,title:tr("الرسائل","Messages")}}/>
 <Tabs.Screen name="profile" options={{title:tr("حسابي","Account"),tabBarIcon:icon("person")}}/>
 </Tabs>}
