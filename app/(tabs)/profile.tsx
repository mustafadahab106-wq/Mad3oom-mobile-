import {useCallback,useState} from "react";
import {ActivityIndicator,Alert,FlatList,Image,Pressable,StyleSheet,Text,View} from "react-native";
import {router,useFocusEffect} from "expo-router";
import {Ionicons} from "@expo/vector-icons";
import {useAuth} from "@/contexts/AuthContext";
import {useLanguage} from "@/contexts/LanguageContext";
import {getMyListings,imageUrl,Listing} from "@/lib/api";
import {colors} from "@/constants/theme";

const yellow="#FFD500";
export default function Profile(){
  const{user,signOut}=useAuth();
  const{language,setLanguage,tr}=useLanguage();
  const[listings,setListings]=useState<Listing[]>([]);
  const[showListings,setShowListings]=useState(false);
  const[loading,setLoading]=useState(false);
  useFocusEffect(useCallback(()=>{
    if(!user){setListings([]);return}
    let active=true;setLoading(true);
    getMyListings().then(data=>{if(active)setListings(data)}).catch(()=>{}).finally(()=>{if(active)setLoading(false)});
    return()=>{active=false};
  },[user?.id]));
  const confirmSignOut=()=>Alert.alert(tr("تسجيل الخروج","Sign out"),tr("هل تريد تسجيل الخروج؟","Do you want to sign out?"),[
    {text:tr("إلغاء","Cancel"),style:"cancel"},
    {text:tr("خروج","Sign out"),style:"destructive",onPress:signOut},
  ]);
  const row=(icon:keyof typeof Ionicons.glyphMap,title:string,onPress:()=>void,danger=false)=><Pressable style={s.menuRow} onPress={onPress}>
    <Ionicons name="chevron-back" size={22} color={danger?"#C83939":"#666"}/>
    <View style={s.menuLabel}><Text style={[s.menuText,danger&&{color:"#C83939"}]}>{title}</Text><Ionicons name={icon} size={22} color={danger?"#C83939":"#CEAB29"}/></View>
  </Pressable>;
  return <FlatList
    data={showListings?listings:[]}
    keyExtractor={item=>String(item.id)}
    contentContainerStyle={s.page}
    ListHeaderComponent={<>
      <Text style={s.heading}>{tr("حسابي","My account")}</Text>
      <Text style={s.subheading}>{tr("إدارة ملفك الشخصي وإعلاناتك","Manage your profile and listings")}</Text>
      <View style={s.profileCard}>
        <View style={s.avatar}><Text style={s.initial}>{(user?.name||user?.email||tr("م","G")).slice(0,1).toUpperCase()}</Text></View>
        <Text style={s.name}>{user?.name||tr("ضيف","Guest")}</Text>
        <Text style={s.phone}>{user?.phone||tr("لم يتم إضافة رقم","No phone number added")}</Text>
        {!!user?.city&&<Text style={s.city}>{user.city}</Text>}
        {user?.isAdmin&&<Text style={s.admin}>{tr("حساب مسؤول","Administrator")}</Text>}
      </View>
      {!user?<Pressable style={s.login} onPress={()=>router.push("/login")}><Text style={s.loginText}>{tr("تسجيل الدخول أو إنشاء حساب","Sign in or create account")}</Text></Pressable>:<>
        {row("car-sport-outline",tr("إعلاناتي","My listings"),()=>setShowListings(v=>!v))}
        {row("create-outline",tr("تعديل الملف الشخصي","Edit profile"),()=>router.push("/edit-profile"))}
        {row("chatbubbles-outline",tr("المحادثات","Conversations"),()=>router.push("/messages"))}
        {row("sparkles-outline",tr("المساعد ديبو","Dibo Assistant"),()=>router.push("/assistant"))}
        {user.isAdmin&&row("construct-outline",tr("الجرد الميداني","Field inventory"),()=>router.push("/admin/field-inventory"))}
        {row("log-out-outline",tr("تسجيل الخروج","Sign out"),confirmSignOut,true)}
      </>}
      <View style={s.language}><Text style={s.languageTitle}>{tr("لغة التطبيق","App language")}</Text>
        <Pressable style={[s.langButton,language==="ar"&&s.langActive]} onPress={()=>setLanguage("ar")}><Text style={s.langText}>العربية</Text></Pressable>
        <Pressable style={[s.langButton,language==="en"&&s.langActive]} onPress={()=>setLanguage("en")}><Text style={s.langText}>English</Text></Pressable>
      </View>
      {showListings&&loading&&<ActivityIndicator color={yellow} style={{marginTop:20}}/>}
      {showListings&&!loading&&!listings.length&&<Text style={s.empty}>{tr("لا توجد إعلانات بعد","No listings yet")}</Text>}
    </>}
    renderItem={({item})=><Pressable style={s.listing} onPress={()=>router.push({pathname:"/listing/[id]",params:{id:String(item.id)}})}>
      {imageUrl(item.images?.[0])?<Image source={{uri:imageUrl(item.images?.[0])}} style={s.thumb}/>:<View style={[s.thumb,s.placeholder]}><Ionicons name="car-sport" size={24} color={yellow}/></View>}
      <View style={{flex:1}}><Text style={s.listingTitle}>{item.make} {item.model}</Text><Text style={s.listingSub}>{Number(item.price||0).toLocaleString()} {tr("د.إ","AED")}</Text></View>
      <Ionicons name="chevron-back" size={20} color="#777"/>
    </Pressable>}
  />;
}
const s=StyleSheet.create({
  page:{paddingHorizontal:18,paddingTop:26,paddingBottom:40,backgroundColor:"#fff",flexGrow:1},
  heading:{fontSize:29,fontWeight:"900",color:"#111",textAlign:"right"},
  subheading:{fontSize:15,color:"#777",textAlign:"right",marginTop:8,marginBottom:20},
  profileCard:{backgroundColor:"#F7F8FA",borderRadius:22,borderWidth:1,borderColor:"#E1E2E5",padding:24,alignItems:"center",marginBottom:25,elevation:2},
  avatar:{width:96,height:96,borderRadius:48,backgroundColor:yellow,alignItems:"center",justifyContent:"center"},
  initial:{fontSize:44,fontWeight:"800",color:"#111"},
  name:{fontSize:21,fontWeight:"900",color:"#111",marginTop:15},
  phone:{fontSize:15,color:"#777",marginTop:8},city:{color:"#777",marginTop:5},
  admin:{color:colors.blue,marginTop:8,fontWeight:"800"},
  menuRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",minHeight:65,borderBottomWidth:1,borderBottomColor:"#E3E3E3"},
  menuLabel:{flexDirection:"row",alignItems:"center",gap:12},
  menuText:{fontSize:17,color:"#202020"},
  login:{backgroundColor:yellow,padding:16,borderRadius:15,alignItems:"center"},loginText:{fontWeight:"900",color:"#111"},
  language:{flexDirection:"row-reverse",alignItems:"center",gap:7,marginTop:27,flexWrap:"wrap"},
  languageTitle:{color:"#666",fontSize:13,marginLeft:10},langButton:{borderRadius:16,paddingHorizontal:12,paddingVertical:7,borderWidth:1,borderColor:"#ddd"},
  langActive:{backgroundColor:yellow,borderColor:yellow},langText:{color:"#111",fontWeight:"700"},
  listing:{flexDirection:"row-reverse",alignItems:"center",gap:12,borderBottomWidth:1,borderBottomColor:"#eee",paddingVertical:12},
  thumb:{width:62,height:48,borderRadius:8},placeholder:{backgroundColor:"#111",alignItems:"center",justifyContent:"center"},
  listingTitle:{fontWeight:"900",textAlign:"right",color:"#111"},listingSub:{color:"#777",textAlign:"right",marginTop:3},
  empty:{color:"#777",textAlign:"center",marginTop:15}
});

