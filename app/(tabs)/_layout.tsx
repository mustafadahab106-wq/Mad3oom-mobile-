import {Tabs} from "expo-router";
import {Ionicons} from "@expo/vector-icons";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {colors} from "@/constants/theme";
import {useLanguage} from "@/contexts/LanguageContext";
const icon=(name:any)=>({color,size}:{color:string;size:number})=><Ionicons name={name} color={color} size={size}/>;
export default function TabsLayout(){
 const insets=useSafeAreaInsets();
 const{tr}=useLanguage();
 return <Tabs screenOptions={{headerStyle:{backgroundColor:colors.black},headerTintColor:"#fff",headerTitleAlign:"center",headerTitleStyle:{fontWeight:"900"},tabBarActiveTintColor:colors.gold,tabBarInactiveTintColor:"#858A93",tabBarStyle:{height:58+insets.bottom,paddingBottom:insets.bottom+6,paddingTop:6,backgroundColor:colors.black,borderTopColor:"#252930"}}}>
 <Tabs.Screen name="index" options={{title:tr("الرئيسية","Home"),headerTitle:"MAD3OOM",tabBarIcon:icon("home")}}/>
 <Tabs.Screen name="search" options={{title:tr("البحث","Search"),tabBarIcon:icon("search")}}/>
 <Tabs.Screen name="add" options={{title:tr("أضف إعلان","Add"),tabBarIcon:icon("add-circle")}}/>
 <Tabs.Screen name="assistant" options={{title:tr("ديبو AI","Dibo AI"),headerTitle:tr("ديبو — مساعد مدعوم","Dibo — MAD3OOM Assistant"),tabBarIcon:icon("sparkles")}}/>
 <Tabs.Screen name="messages" options={{title:tr("الرسائل","Messages"),tabBarIcon:icon("chatbubbles")}}/>
 <Tabs.Screen name="profile" options={{title:tr("حسابي","Account"),tabBarIcon:icon("person")}}/>
 </Tabs>}
