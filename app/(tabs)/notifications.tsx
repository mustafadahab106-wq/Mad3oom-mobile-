import {useCallback,useMemo,useState} from "react";
import {ActivityIndicator,Alert,FlatList,Pressable,RefreshControl,StyleSheet,Text,View} from "react-native";
import {router,useFocusEffect} from "expo-router";
import {Ionicons} from "@expo/vector-icons";
import {useAuth} from "@/contexts/AuthContext";
import {useLanguage} from "@/contexts/LanguageContext";
import {AppNotification,clearNotifications,deleteNotification,getNotifications,markAllNotificationsRead,markNotificationRead} from "@/lib/api";
import {colors} from "@/constants/theme";

const yellow="#FFD500";
function ago(iso:string,tr:(ar:string,en:string)=>string){
  const minutes=Math.max(0,Math.floor((Date.now()-new Date(iso).getTime())/60000));
  if(minutes<1)return tr("الآن","Now");
  if(minutes<60)return tr(`قبل ${minutes} دقيقة`,`${minutes}m ago`);
  const hours=Math.floor(minutes/60);
  if(hours<24)return tr(`قبل ${hours} ساعة`,`${hours}h ago`);
  const days=Math.floor(hours/24);
  return tr(`قبل ${days} يوم`,`${days}d ago`);
}
export default function Notifications(){
  const {user}=useAuth();
  const {tr,isRTL}=useLanguage();
  const [items,setItems]=useState<AppNotification[]>([]);
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const [error,setError]=useState("");
  const [tab,setTab]=useState<"all"|"unread">("unread");
  const load=useCallback(async()=>{
    if(!user){setItems([]);setLoading(false);setRefreshing(false);return}
    try{setError("");setItems(await getNotifications())}
    catch(e:any){setError(e.message||tr("تعذر جلب الإشعارات","Could not load notifications"))}
    finally{setLoading(false);setRefreshing(false)}
  },[user?.id]);
  useFocusEffect(useCallback(()=>{load()},[load]));
  const stats=useMemo(()=>({
    total:items.length,
    unread:items.filter(n=>!n.readAt).length,
    messages:items.filter(n=>n.type==="message").length,
    today:items.filter(n=>Date.now()-new Date(n.createdAt).getTime()<86400000).length,
  }),[items]);
  const visible=tab==="unread"?items.filter(n=>!n.readAt):items;
  const fail=(e:any)=>{Alert.alert(tr("تعذر تنفيذ العملية","Action failed"),e.message||String(e));load()};
  const open=async(n:AppNotification)=>{
    if(!n.readAt){setItems(p=>p.map(x=>x.id===n.id?{...x,readAt:new Date().toISOString()}:x));markNotificationRead(n.id).catch(fail)}
    if(n.conversationId)router.push({pathname:"/chat/[id]",params:{id:String(n.conversationId)}});
  };
  const remove=async(n:AppNotification)=>{
    setItems(p=>p.filter(x=>x.id!==n.id));
    try{await deleteNotification(n.id)}catch(e){fail(e)}
  };
  const readAll=async()=>{
    setItems(p=>p.map(n=>({...n,readAt:n.readAt||new Date().toISOString()})));
    try{await markAllNotificationsRead()}catch(e){fail(e)}
  };
  const clearAll=()=>Alert.alert(tr("حذف جميع الإشعارات","Delete all notifications"),tr("هل تريد حذف جميع الإشعارات؟","Delete all notifications?"),[
    {text:tr("إلغاء","Cancel"),style:"cancel"},
    {text:tr("حذف","Delete"),style:"destructive",onPress:async()=>{try{await clearNotifications();setItems([])}catch(e){fail(e)}}},
  ]);
  if(!user)return <View style={s.center}><Ionicons name="notifications-outline" size={54} color={colors.gold}/><Text style={s.empty}>{tr("سجّل الدخول لعرض إشعاراتك","Sign in to see notifications")}</Text><Pressable style={s.login} onPress={()=>router.push("/login")}><Text style={s.bold}>{tr("تسجيل الدخول","Sign in")}</Text></Pressable></View>;
  if(loading)return <View style={s.center}><ActivityIndicator color={yellow} size="large"/></View>;
  return <FlatList
    data={visible} keyExtractor={n=>String(n.id)}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);load()}} colors={[yellow]}/>}
    contentContainerStyle={s.page}
    ListHeaderComponent={<>
      <View style={s.header}>
        <Pressable accessibilityLabel={tr("رجوع","Back")} style={s.round} onPress={()=>router.back()}><Ionicons name="arrow-back" size={25} color={colors.black}/></Pressable>
        <View style={s.titlePill}><Text style={s.title}>{tr("الإشعارات","Notifications")}</Text>{stats.unread>0&&<Text style={s.titleCount}>{stats.unread}</Text>}</View>
        <Pressable accessibilityLabel={tr("تعليم الكل كمقروء","Mark all read")} style={[s.round,s.yellow]} onPress={readAll} disabled={!stats.unread}><Ionicons name="checkmark-done" size={22} color={colors.black}/></Pressable>
        <Pressable accessibilityLabel={tr("حذف الكل","Delete all")} style={s.round} onPress={clearAll} disabled={!items.length}><Ionicons name="trash-outline" size={21} color="#DB4646"/></Pressable>
      </View>
      <View style={s.tabs}>
        <Pressable style={[s.tab,tab==="all"&&s.active]} onPress={()=>setTab("all")}><Text style={s.tabText}>{tr("الكل","All")} ({stats.total})</Text></Pressable>
        <Pressable style={[s.tab,tab==="unread"&&s.active]} onPress={()=>setTab("unread")}><Text style={s.tabText}>{tr("غير المقروء","Unread")} ({stats.unread})</Text></Pressable>
      </View>
      <View style={s.stats}>{[
        [stats.total,tr("المجموع","Total")],
        [stats.unread,tr("غير مقروء","Unread")],
        [stats.messages,tr("رسائل","Messages")],
        [stats.today,tr("جديد","New")],
      ].map(([n,label])=><View key={String(label)} style={s.stat}><View style={s.statCircle}><Text style={s.number}>{n}</Text></View><Text style={s.statLabel}>{label}</Text></View>)}</View>
      {!!error&&<Text style={s.error}>{error}</Text>}
    </>}
    renderItem={({item})=>{
      const message=item.type==="message";
      return <Pressable onPress={()=>open(item)} style={[s.card,!item.readAt&&s.unreadCard]}>
        <View style={[s.cardIcon,{backgroundColor:message?"#4AB561":"#FFA41B"}]}><Ionicons name={message?"chatbubble":"car-sport"} size={24} color="#fff"/></View>
        <View style={s.cardContent}>
          <View style={s.cardHeading}><Text style={[s.cardTitle,{textAlign:isRTL?"right":"left"}]}>{item.title}</Text>{!item.readAt&&<View style={s.dot}/>}</View>
          <Text style={[s.body,{textAlign:isRTL?"right":"left"}]} numberOfLines={3}>{item.body}</Text>
          <View style={s.meta}><Text style={s.time}>{ago(item.createdAt,tr)}</Text><Pressable style={s.delete} onPress={()=>remove(item)} accessibilityLabel={tr("حذف الإشعار","Delete notification")}><Ionicons name="trash-outline" size={19} color="#777"/></Pressable></View>
          {message&&!!item.conversationId&&<Text style={s.category}>{tr("دردشة • اضغط لفتح المحادثة","Chat • tap to open")}</Text>}
        </View>
      </Pressable>;
    }}
    ListEmptyComponent={<View style={s.center}><Ionicons name="notifications-off-outline" size={48} color="#999"/><Text style={s.empty}>{tab==="unread"?tr("لا توجد إشعارات غير مقروءة","No unread notifications"):tr("لا توجد إشعارات بعد","No notifications yet")}</Text></View>}
  />;
}
const s=StyleSheet.create({
  page:{padding:16,paddingBottom:36,backgroundColor:"#fff",flexGrow:1},
  center:{alignItems:"center",justifyContent:"center",padding:35,gap:12},
  empty:{color:"#666",fontSize:15,textAlign:"center"},
  login:{backgroundColor:yellow,padding:14,borderRadius:12},bold:{fontWeight:"900",color:colors.black},
  header:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:18},
  round:{width:48,height:48,borderRadius:24,borderWidth:1,borderColor:"#ddd",backgroundColor:"#F7F7F7",alignItems:"center",justifyContent:"center"},
  yellow:{backgroundColor:yellow,borderColor:yellow},
  titlePill:{flexDirection:"row",backgroundColor:yellow,borderRadius:28,alignItems:"center",justifyContent:"center",paddingHorizontal:15,height:52,flex:1,gap:12},
  title:{fontSize:21,fontWeight:"900",color:colors.black},
  titleCount:{backgroundColor:"#080808",color:"#fff",overflow:"hidden",borderRadius:20,paddingHorizontal:12,paddingVertical:5,fontWeight:"900"},
  tabs:{flexDirection:"row",gap:10,marginBottom:20},
  tab:{flex:1,paddingVertical:15,borderRadius:30,backgroundColor:"#F6F6F6",borderWidth:1,borderColor:"#ddd",alignItems:"center"},
  active:{backgroundColor:yellow,borderColor:yellow},
  tabText:{fontWeight:"800",color:colors.black,fontSize:14},
  stats:{flexDirection:"row",backgroundColor:"#F8F8F8",borderRadius:20,borderWidth:1,borderColor:"#ddd",paddingVertical:20,marginBottom:20},
  stat:{flex:1,alignItems:"center",gap:8},statCircle:{width:50,height:50,borderRadius:25,backgroundColor:yellow,alignItems:"center",justifyContent:"center"},
  number:{fontWeight:"900",fontSize:20,color:colors.black},statLabel:{fontSize:12,color:"#666"},
  error:{color:"#B62929",marginBottom:12,textAlign:"center"},
  card:{flexDirection:"row",gap:12,backgroundColor:"#fff",borderRadius:20,borderWidth:1,borderColor:"#dedede",padding:16,marginBottom:13,elevation:2},
  unreadCard:{borderLeftWidth:5,borderLeftColor:yellow},
  cardIcon:{width:52,height:52,borderRadius:26,alignItems:"center",justifyContent:"center"},
  cardContent:{flex:1},cardHeading:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},
  cardTitle:{fontSize:17,fontWeight:"900",color:colors.black,flex:1},
  dot:{width:9,height:9,borderRadius:5,backgroundColor:yellow,marginLeft:8},
  body:{fontSize:14,color:"#666",lineHeight:23,marginTop:7},
  meta:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginTop:12},
  time:{color:"#888",fontSize:12},delete:{width:32,height:32,borderRadius:16,backgroundColor:"#F7F7F7",alignItems:"center",justifyContent:"center"},
  category:{fontSize:11,color:"#997100",marginTop:3}
});

