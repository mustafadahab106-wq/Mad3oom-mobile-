import {Stack} from "expo-router";
import {StatusBar} from "expo-status-bar";
import {AuthProvider} from "@/contexts/AuthContext";
import {colors} from "@/constants/theme";
import DiboChat from "@/components/DiboChat";
import {View} from "react-native";
import {LanguageProvider} from "@/contexts/LanguageContext";
import {useLanguage} from "@/contexts/LanguageContext";

function Navigation(){
 const{tr}=useLanguage();
 return <AuthProvider><View style={{flex:1}}><StatusBar style="light"/><Stack screenOptions={{headerStyle:{backgroundColor:colors.black},headerTintColor:"#fff",headerTitleStyle:{fontWeight:"800"},contentStyle:{backgroundColor:colors.bg}}}>
   <Stack.Screen name="(tabs)" options={{headerShown:false}}/>
   <Stack.Screen name="listing/[id]" options={{title:tr("تفاصيل الإعلان","Listing details")}}/>
   <Stack.Screen name="login" options={{title:tr("حساب مدعوم","MAD3OOM account"),presentation:"modal"}}/>
   <Stack.Screen name="chat/[id]" options={{title:tr("المحادثة","Chat")}}/>
   <Stack.Screen name="admin/field-inventory" options={{title:tr("الجرد الميداني","Field inventory")}}/>
 </Stack><DiboChat/></View></AuthProvider>
}
export default function RootLayout(){return <LanguageProvider><Navigation/></LanguageProvider>}
