import {useCallback,useState} from "react";
import {ActivityIndicator,FlatList,Image,Pressable,StyleSheet,Text,View} from "react-native";
import {router,useFocusEffect} from "expo-router";
import {Ionicons} from "@expo/vector-icons";
import {useAuth} from "@/contexts/AuthContext";
import {colors} from "@/constants/theme";
import {Conversation,getConversations,getMyListings,imageUrl,Listing} from "@/lib/api";
import {useLanguage} from "@/contexts/LanguageContext";

export default function Profile(){
  const{user,signOut}=useAuth();
  const{language,setLanguage,tr}=useLanguage();
  const[listings,setListings]=useState<Listing[]>([]);
  const[conversations,setConversations]=useState<Conversation[]>([]);
  const[loading,setLoading]=useState(true);

  useFocusEffect(useCallback(()=>{
    if(!user){setLoading(false);return}
    setLoading(true);
    Promise.all([getMyListings(),getConversations()]).then(([mine,chats])=>{setListings(mine);setConversations(chats)}).catch(()=>{}).finally(()=>setLoading(false));
  },[user]));

  if(!user)return <View style={s.center}><Ionicons name="person-circle" size={90} color={colors.gold}/><Text style={s.title}>{tr("مرحبًا بك في مدعوم","Welcome to MAD3OOM")}</Text><Pressable style={s.btn} onPress={()=>router.push("/login")}><Text style={s.btnText}>{tr("تسجيل الدخول أو إنشاء حساب","Sign in or create account")}</Text></Pressable><LanguageSwitch language={language} setLanguage={setLanguage}/></View>;

  const unread=conversations.reduce((sum,c)=>sum+Number(c.unreadCount??c.unread??0),0);
  return <FlatList
    data={listings}
    keyExtractor={x=>String(x.id)}
    contentContainerStyle={s.list}
    ListHeaderComponent={<View style={s.header}>
      <View style={s.profileTop}><View style={s.avatar}><Text style={s.letter}>{(user.name||user.email)[0].toUpperCase()}</Text></View><View style={s.profileText}><Text style={s.title}>{user.name||tr("مستخدم مدعوم","MAD3OOM user")}</Text>{user.isAdmin&&<Text style={s.admin}>{tr("حساب مسؤول","Administrator")}</Text>}</View></View>

      <SectionTitle icon="person-circle" title={tr("معلومات الحساب","Account information")}/>
      <View style={s.infoCard}>
        <InfoRow icon="person" label={tr("الاسم","Name")} value={user.name||tr("غير مضاف","Not provided")}/>
        <InfoRow icon="mail" label={tr("البريد الإلكتروني","Email")} value={user.email}/>
        <InfoRow icon="call" label={tr("رقم الهاتف","Phone number")} value={user.phone||tr("غير مضاف","Not provided")} last/>
      </View>

      <SectionTitle icon="notifications" title={tr("إشعارات الرسائل","Message notifications")} badge={unread}/>
      <Pressable style={s.notificationCard} onPress={()=>router.push("/(tabs)/messages")}>
        <View style={s.bell}><Ionicons name="chatbubbles" size={25} color={colors.gold}/>{unread>0&&<View style={s.unreadBadge}><Text style={s.unreadText}>{unread>99?"99+":unread}</Text></View>}</View>
        <View style={{flex:1}}><Text style={s.notificationTitle}>{unread>0?tr(`لديك ${unread} رسائل غير مقروءة`,`${unread} unread messages`):tr("لا توجد رسائل جديدة","No new messages")}</Text><Text style={s.notificationSub}>{tr(`${conversations.length} محادثات`,` ${conversations.length} conversations`)}</Text></View>
        <Ionicons name="chevron-back" size={20} color={colors.muted}/>
      </Pressable>
      {conversations.slice(0,3).map(c=><Pressable key={c.id} style={s.messageRow} onPress={()=>router.push({pathname:"/chat/[id]",params:{id:String(c.id)}})}><View style={s.smallAvatar}><Text style={s.smallAvatarText}>{(c.otherUserName||"M")[0]}</Text></View><View style={{flex:1}}><Text style={s.messageName}>{c.otherUserName||tr("مستخدم مدعوم","MAD3OOM user")}</Text><Text style={s.messagePreview} numberOfLines={1}>{c.lastMessage||c.lastMessageBody||tr("افتح المحادثة لعرض الرسائل","Open the conversation to view messages")}</Text></View>{Number(c.unreadCount??c.unread??0)>0&&<View style={s.dot}/>}</Pressable>)}

      <SectionTitle icon="language" title={tr("اللغة","Language")}/>
      <View style={s.languageCard}><Text style={s.languageHelp}>{tr("اختر لغة واجهة التطبيق","Choose the app interface language")}</Text><LanguageSwitch language={language} setLanguage={setLanguage}/></View>

      <View style={s.quickGrid}>
        <Pressable style={s.quickCard} onPress={()=>router.push("/(tabs)/assistant")}>
          <Ionicons name="sparkles" size={27} color={colors.gold}/>
          <Text style={s.quickTitle}>{tr("المساعد ديبو","Dibo Assistant")}</Text>
          <Text style={s.quickSub}>{tr("اسأل عن السيارات والأسعار","Ask about cars and prices")}</Text>
        </Pressable>
        <Pressable style={s.quickCard} onPress={()=>router.push("/(tabs)/add")}>
          <Ionicons name="camera" size={27} color={colors.gold}/>
          <Text style={s.quickTitle}>{tr("إعلان بالذكاء AI","AI-powered listing")}</Text>
          <Text style={s.quickSub}>{tr("حلّل الصور واملأ البيانات","Analyze images and fill details")}</Text>
        </Pressable>
      </View>

      {user.isAdmin&&<Pressable style={s.fieldBtn} onPress={()=>router.push("/admin/field-inventory")}>
        <Ionicons name="car-sport" size={18} color="#fff"/>
        <Text style={s.fieldBtnText}>{tr("الجرد الميداني","Field inventory")}</Text>
      </Pressable>}

      <Pressable style={[s.btn,s.logout]} onPress={signOut}><Text style={[s.btnText,{color:"#fff"}]}>{tr("تسجيل الخروج","Sign out")}</Text></Pressable>

      <SectionTitle icon="car-sport" title={tr("إعلاناتي","My listings")} badge={listings.length}/>
      {loading&&<ActivityIndicator style={{marginTop:10}} color={colors.gold}/>}
      {!loading&&listings.length===0&&<Text style={s.empty}>{tr("لا توجد إعلانات بعد","No listings yet")}</Text>}
    </View>}
    renderItem={({item})=>{
      const src=imageUrl(item.images?.[0]);
      return <Pressable style={s.row} onPress={()=>router.push({pathname:"/listing/[id]",params:{id:String(item.id)}})}>
        {src?<Image source={{uri:src}} style={s.thumb}/>:<View style={[s.thumb,s.thumbPlaceholder]}><Text style={{color:colors.gold,fontWeight:"900"}}>{item.make?.[0]||"M"}</Text></View>}
        <View style={{flex:1}}>
          <Text style={s.rowTitle}>{item.make} {item.model}</Text>
          <Text style={s.rowSub}>{Number(item.price||0).toLocaleString()} {tr("د.إ","AED")} · {item.status==="sold"?tr("مباعة","Sold"):tr("نشطة","Active")}</Text>
        </View>
        <Ionicons name="chevron-back" size={20} color={colors.muted}/>
      </Pressable>;
    }}
  />;
}
function SectionTitle({icon,title,badge}:{icon:any;title:string;badge?:number}){return <View style={s.sectionBar}><Ionicons name={icon} size={21} color={colors.gold}/><Text style={s.sectionHeading}>{title}</Text>{badge!==undefined&&<View style={s.countBadge}><Text style={s.countText}>{badge}</Text></View>}</View>}
function InfoRow({icon,label,value,last}:{icon:any;label:string;value:string;last?:boolean}){return <View style={[s.infoRow,last&&{borderBottomWidth:0}]}><Ionicons name={icon} size={20} color={colors.muted}/><View style={{flex:1}}><Text style={s.infoLabel}>{label}</Text><Text style={s.infoValue} selectable>{value}</Text></View></View>}
function LanguageSwitch({language,setLanguage}:{language:"ar"|"en";setLanguage:(v:"ar"|"en")=>Promise<void>}){return <View style={s.langRow}><Pressable style={[s.langBtn,language==="ar"&&s.langActive]} onPress={()=>setLanguage("ar")}><Text style={[s.langText,language==="ar"&&s.langActiveText]}>العربية</Text></Pressable><Pressable style={[s.langBtn,language==="en"&&s.langActive]} onPress={()=>setLanguage("en")}><Text style={[s.langText,language==="en"&&s.langActiveText]}>English</Text></Pressable></View>}
const s=StyleSheet.create({
  list:{paddingBottom:40},
  center:{flex:1,justifyContent:"center",alignItems:"center",padding:25},
  header:{padding:18,paddingTop:28},
  profileTop:{flexDirection:"row-reverse",alignItems:"center",gap:15,marginBottom:8},profileText:{flex:1,alignItems:"flex-end"},
  avatar:{width:95,height:95,borderRadius:48,backgroundColor:colors.black,borderWidth:3,borderColor:colors.gold,alignItems:"center",justifyContent:"center"},
  letter:{fontSize:40,color:colors.gold,fontWeight:"900"},
  title:{fontSize:23,fontWeight:"900"},
  email:{color:colors.muted,marginTop:6},
  admin:{marginTop:12,backgroundColor:"#DCEEFF",color:colors.blue,padding:8,borderRadius:9,fontWeight:"800"},
  quickGrid:{width:"100%",flexDirection:"row-reverse",gap:10,marginTop:20},
  quickCard:{flex:1,minHeight:118,backgroundColor:"#fff",borderWidth:1,borderColor:colors.line,borderRadius:15,padding:13,alignItems:"center",justifyContent:"center"},
  quickTitle:{fontWeight:"900",textAlign:"center",marginTop:7},
  quickSub:{fontSize:11,color:colors.muted,textAlign:"center",marginTop:4},
  sectionBar:{width:"100%",flexDirection:"row-reverse",alignItems:"center",gap:8,marginTop:24,marginBottom:9},sectionHeading:{fontSize:18,fontWeight:"900",flex:1,textAlign:"right"},countBadge:{minWidth:25,height:25,borderRadius:13,backgroundColor:colors.gold,alignItems:"center",justifyContent:"center",paddingHorizontal:6},countText:{fontWeight:"900",fontVariant:["tabular-nums"]},
  infoCard:{width:"100%",backgroundColor:"#fff",borderRadius:16,borderWidth:1,borderColor:colors.line,paddingHorizontal:14},infoRow:{flexDirection:"row-reverse",alignItems:"center",gap:11,paddingVertical:12,borderBottomWidth:1,borderBottomColor:colors.line},infoLabel:{fontSize:11,color:colors.muted,textAlign:"right"},infoValue:{fontWeight:"800",textAlign:"right",marginTop:3},
  notificationCard:{width:"100%",flexDirection:"row-reverse",alignItems:"center",gap:11,backgroundColor:colors.black,borderRadius:16,padding:14},bell:{width:48,height:48,borderRadius:24,backgroundColor:"#252930",alignItems:"center",justifyContent:"center"},unreadBadge:{position:"absolute",top:-3,right:-4,minWidth:20,height:20,borderRadius:10,backgroundColor:colors.danger,alignItems:"center",justifyContent:"center",paddingHorizontal:4},unreadText:{color:"#fff",fontSize:10,fontWeight:"900"},notificationTitle:{color:"#fff",fontWeight:"900",textAlign:"right"},notificationSub:{color:"#AEB3BC",fontSize:12,textAlign:"right",marginTop:4},messageRow:{width:"100%",flexDirection:"row-reverse",alignItems:"center",gap:10,backgroundColor:"#fff",padding:11,borderBottomWidth:1,borderBottomColor:colors.line},smallAvatar:{width:37,height:37,borderRadius:19,backgroundColor:colors.gold,alignItems:"center",justifyContent:"center"},smallAvatarText:{fontWeight:"900"},messageName:{fontWeight:"800",textAlign:"right"},messagePreview:{fontSize:11,color:colors.muted,textAlign:"right",marginTop:3},dot:{width:9,height:9,borderRadius:5,backgroundColor:colors.blue},
  languageCard:{width:"100%",backgroundColor:"#fff",borderRadius:16,borderWidth:1,borderColor:colors.line,padding:14,alignItems:"center"},languageHelp:{color:colors.muted,fontSize:12},langRow:{flexDirection:"row",gap:7,marginTop:10},langBtn:{paddingHorizontal:20,paddingVertical:10,borderRadius:20,backgroundColor:"#fff",borderWidth:1,borderColor:colors.line},langActive:{backgroundColor:colors.black,borderColor:colors.black},langText:{fontWeight:"800"},langActiveText:{color:colors.gold},
  fieldBtn:{flexDirection:"row-reverse",alignItems:"center",gap:8,backgroundColor:colors.black,padding:14,borderRadius:13,marginTop:18,minWidth:220,justifyContent:"center"},
  fieldBtnText:{color:"#fff",fontWeight:"900"},
  btn:{backgroundColor:colors.gold,padding:15,borderRadius:13,marginTop:14,minWidth:220},
  btnText:{textAlign:"center",fontWeight:"900"},
  logout:{backgroundColor:colors.danger},
  sectionTitle:{fontSize:18,fontWeight:"900",alignSelf:"flex-end",marginTop:30,marginBottom:4,width:"100%",textAlign:"right"},
  empty:{color:colors.muted,marginTop:10},
  row:{flexDirection:"row-reverse",alignItems:"center",gap:12,paddingHorizontal:20,paddingVertical:12,borderBottomWidth:1,borderBottomColor:colors.line},
  thumb:{width:56,height:44,borderRadius:8},
  thumbPlaceholder:{backgroundColor:colors.black,alignItems:"center",justifyContent:"center"},
  rowTitle:{fontWeight:"900",textAlign:"right"},
  rowSub:{color:colors.muted,fontSize:12,textAlign:"right",marginTop:2},
});
