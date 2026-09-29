import {useCallback,useMemo,useState} from "react";
import {ActivityIndicator,Alert,FlatList,Pressable,RefreshControl,StyleSheet,Text,View} from "react-native";
import {router,useFocusEffect} from "expo-router";
import {Ionicons} from "@expo/vector-icons";
import {useAuth} from "@/contexts/AuthContext";
import {useLanguage} from "@/contexts/LanguageContext";
import {AppNotification,clearNotifications,deleteNotification,getNotifications,markAllNotificationsRead,markNotificationRead,timeAgo} from "@/lib/api";
import {colors} from "@/constants/theme";

export default function Notifications(){
  const{user}=useAuth();
  const{tr,isRTL}=useLanguage();
  const align=isRTL?"right":"left";
  const[items,setItems]=useState<AppNotification[]>([]);
  const[loading,setLoading]=useState(true);
  const[refreshing,setRefreshing]=useState(false);
  const[error,setError]=useState("");
  const[tab,setTab]=useState<"all"|"unread">("all");

  const load=async()=>{
    if(!user){setLoading(false);return}
    try{setError("");setItems(await getNotifications())}
    catch(e:any){setError(e.message)}
    finally{setLoading(false);setRefreshing(false)}
  };
  useFocusEffect(useCallback(()=>{load()},[user?.id]));

  const stats=useMemo(()=>{
    const dayAgo=Date.now()-24*60*60*1000;
    return{
      total:items.length,
      unread:items.filter(n=>!n.readAt).length,
      messages:items.filter(n=>n.type==="message").length,
      today:items.filter(n=>new Date(n.createdAt).getTime()>=dayAgo).length,
    };
  },[items]);
  const shown=tab==="unread"?items.filter(n=>!n.readAt):items;

  const open=async(n:AppNotification)=>{
    if(!n.readAt){
      setItems(p=>p.map(x=>x.id===n.id?{...x,readAt:new Date().toISOString()}:x));
      markNotificationRead(n.id).catch(()=>{});
    }
    if(n.conversationId)router.push({pathname:"/chat/[id]",params:{id:String(n.conversationId)}});
  };
  const remove=async(n:AppNotification)=>{
    setItems(p=>p.filter(x=>x.id!==n.id));
    try{await deleteNotification(n.id)}catch(e:any){Alert.alert(tr("تعذر الحذف","Could not delete"),e.message);load()}
  };
  const markAll=async()=>{
    setItems(p=>p.map(x=>x.readAt?x:{...x,readAt:new Date().toISOString()}));
    try{await markAllNotificationsRead()}catch(e:any){Alert.alert(tr("خطأ","Error"),e.message);load()}
  };
  const clearAll=()=>Alert.alert(tr("حذف كل الإشعارات","Delete all notifications"),tr("متأكد تبي تحذف كل الإشعارات؟","Are you sure you want to delete all notifications?"),[
    {text:tr("إلغاء","Cancel"),style:"cancel"},
    {text:tr("حذف","Delete"),style:"destructive",onPress:async()=>{try{await clearNotifications();setItems([])}catch(e:any){Alert.alert(tr("تعذر الحذف","Could not delete"),e.message)}}},
  ]);

  if(!user)return <View style={s.center}>
    <Ionicons name="notifications-outline" size={64} color={colors.gold}/>
    <Text style={s.centerText}>{tr("سجّل الدخول لعرض إشعاراتك","Sign in to view your notifications")}</Text>
    <Pressable style={s.loginBtn} onPress={()=>router.push("/login")}><Text style={s.loginText}>{tr("تسجيل الدخول","Sign in")}</Text></Pressable>
  </View>;
  if(loading)return <View style={s.center}><ActivityIndicator color={colors.gold} size="large"/></View>;

  return <FlatList
    data={shown}
    keyExtractor={x=>String(x.id)}
    contentContainerStyle={s.list}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);load()}} tintColor={colors.gold}/>}
    ListHeaderComponent={<View>
      <View style={s.actionsRow}>
        <Pressable style={[s.actionBtn,s.actionDanger]} onPress={clearAll} disabled={!items.length}>
          <Ionicons name="trash-outline" size={16} color={colors.danger}/><Text style={[s.actionText,{color:colors.danger}]}>{tr("حذف الكل","Delete all")}</Text>
        </Pressable>
        <Pressable style={s.actionBtn} onPress={markAll} disabled={!stats.unread}>
          <Ionicons name="checkmark-done" size={16} color={colors.black}/><Text style={s.actionText}>{tr("تعليم الكل كمقروء","Mark all read")}</Text>
        </Pressable>
      </View>

      <View style={s.tabs}>
        <Pressable style={[s.tab,tab==="unread"&&s.tabOn]} onPress={()=>setTab("unread")}>
          <Text style={[s.tabText,tab==="unread"&&s.tabTextOn]}>{tr("غير المقروء","Unread")} ({stats.unread})</Text>
        </Pressable>
        <Pressable style={[s.tab,tab==="all"&&s.tabOn]} onPress={()=>setTab("all")}>
          <Text style={[s.tabText,tab==="all"&&s.tabTextOn]}>{tr("الكل","All")} ({stats.total})</Text>
        </Pressable>
      </View>

      <View style={s.stats}>
        {[[stats.today,tr("اليوم","Today")],[stats.messages,tr("رسائل","Messages")],[stats.unread,tr("غير مقروء","Unread")],[stats.total,tr("المجموع","Total")]].map(([n,l])=>
          <View key={String(l)} style={s.stat}><View style={s.statCircle}><Text style={s.statNum}>{n}</Text></View><Text style={s.statLabel}>{l}</Text></View>
        )}
      </View>
    </View>}
    renderItem={({item})=>{
      const isMsg=item.type==="message";
      const unread=!item.readAt;
      return <Pressable style={[s.card,unread&&s.cardUnread]} onPress={()=>open(item)}>
        <View style={[s.iconCircle,{backgroundColor:isMsg?"#2E9E5B":colors.gold}]}>
          <Ionicons name={isMsg?"chatbubble":"car-sport"} size={22} color="#fff"/>
        </View>
        <View style={{flex:1}}>
          <View style={s.titleRow}>
            {unread&&<View style={s.unreadDot}/>}
            <Text style={[s.cardTitle,{textAlign:align}]} numberOfLines={1}>{item.title}</Text>
          </View>
          <Text style={[s.cardBody,{textAlign:align}]} numberOfLines={3}>{item.body}</Text>
          <View style={s.metaRow}>
            <Pressable style={s.trash} onPress={()=>remove(item)} hitSlop={8}><Ionicons name="trash-outline" size={17} color={colors.muted}/></Pressable>
            <Text style={s.time}>{timeAgo(item.createdAt)}</Text>
          </View>
        </View>
      </Pressable>;
    }}
    ListEmptyComponent={<View style={s.emptyWrap}>
      <Ionicons name="notifications-off-outline" size={56} color={colors.muted}/>
      <Text style={s.emptyText}>{error||(tab==="unread"?tr("ما عندك إشعارات غير مقروءة","You have no unread notifications"):tr("لا توجد إشعارات بعد","No notifications yet"))}</Text>
    </View>}
  />;
}

const s=StyleSheet.create({
  center:{flex:1,alignItems:"center",justifyContent:"center",gap:14,padding:25},
  centerText:{fontWeight:"800",fontSize:16},
  loginBtn:{backgroundColor:colors.gold,paddingHorizontal:26,paddingVertical:13,borderRadius:13},
  loginText:{fontWeight:"900"},
  list:{padding:16,paddingBottom:30},
  actionsRow:{flexDirection:"row-reverse",gap:10,marginBottom:14},
  actionBtn:{flexDirection:"row-reverse",alignItems:"center",gap:6,backgroundColor:"#fff",borderWidth:1,borderColor:colors.line,paddingHorizontal:12,paddingVertical:9,borderRadius:12},
  actionDanger:{borderColor:"#F0CFCF"},
  actionText:{fontWeight:"800",fontSize:12,color:colors.black},
  tabs:{flexDirection:"row-reverse",gap:10,marginBottom:14},
  tab:{flex:1,paddingVertical:12,borderRadius:14,borderWidth:1,borderColor:colors.line,backgroundColor:"#fff",alignItems:"center"},
  tabOn:{backgroundColor:colors.black,borderColor:colors.black},
  tabText:{fontWeight:"800",color:colors.muted,fontSize:13},
  tabTextOn:{color:colors.gold},
  stats:{flexDirection:"row-reverse",backgroundColor:"#fff",borderRadius:18,borderWidth:1,borderColor:colors.line,paddingVertical:16,marginBottom:16},
  stat:{flex:1,alignItems:"center",gap:7},
  statCircle:{width:46,height:46,borderRadius:23,backgroundColor:colors.black,alignItems:"center",justifyContent:"center"},
  statNum:{color:colors.gold,fontWeight:"900",fontSize:17},
  statLabel:{fontSize:11,color:colors.muted,fontWeight:"700"},
  card:{flexDirection:"row-reverse",gap:12,backgroundColor:"#fff",borderRadius:18,borderWidth:1,borderColor:colors.line,padding:14,marginBottom:12},
  cardUnread:{borderLeftWidth:4,borderLeftColor:colors.gold},
  iconCircle:{width:48,height:48,borderRadius:24,alignItems:"center",justifyContent:"center"},
  titleRow:{flexDirection:"row-reverse",alignItems:"center",gap:7},
  unreadDot:{width:8,height:8,borderRadius:4,backgroundColor:colors.gold},
  cardTitle:{fontWeight:"900",fontSize:15,flexShrink:1},
  cardBody:{color:"#555",marginTop:5,lineHeight:20,fontSize:13},
  metaRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginTop:10},
  time:{color:colors.muted,fontSize:11},
  trash:{padding:2},
  emptyWrap:{alignItems:"center",paddingVertical:40,gap:10},
  emptyText:{color:colors.muted,textAlign:"center"},
});
