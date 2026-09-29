import {useCallback,useState} from "react";
import {ActivityIndicator,Alert,FlatList,Pressable,StyleSheet,Text,View} from "react-native";
import {Image} from "expo-image";
import {router,useFocusEffect} from "expo-router";
import {Ionicons} from "@expo/vector-icons";
import {useAuth} from "@/contexts/AuthContext";
import {useLanguage} from "@/contexts/LanguageContext";
import {deleteListing,getMyListings,imageUrl,Listing} from "@/lib/api";
import {colors} from "@/constants/theme";

export default function MyListings(){
  const{user}=useAuth();
  const{tr,isRTL}=useLanguage();
  const align=isRTL?"right":"left";
  const[items,setItems]=useState<Listing[]>([]);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState("");

  useFocusEffect(useCallback(()=>{
    if(!user){setLoading(false);return}
    getMyListings().then(d=>{setError("");setItems(d)}).catch(e=>setError(e.message)).finally(()=>setLoading(false));
  },[user?.id]));

  const remove=(item:Listing)=>Alert.alert(tr("حذف الإعلان","Delete listing"),tr("متأكد تبي تحذف إعلان","Delete listing")+" "+(item.make||"")+" "+(item.model||"")+"؟",[
    {text:tr("إلغاء","Cancel"),style:"cancel"},
    {text:tr("حذف","Delete"),style:"destructive",onPress:async()=>{
      try{await deleteListing(item.id);setItems(p=>p.filter(x=>x.id!==item.id))}
      catch(e:any){Alert.alert(tr("تعذر الحذف","Could not delete"),e.message)}
    }},
  ]);

  if(!user)return <View style={s.center}>
    <Text style={s.centerText}>{tr("سجّل الدخول لعرض إعلاناتك","Sign in to view your listings")}</Text>
    <Pressable style={s.btn} onPress={()=>router.push("/login")}><Text style={s.btnText}>{tr("تسجيل الدخول","Sign in")}</Text></Pressable>
  </View>;
  if(loading)return <View style={s.center}><ActivityIndicator color={colors.gold} size="large"/></View>;

  return <FlatList
    data={items}
    keyExtractor={x=>String(x.id)}
    contentContainerStyle={s.list}
    renderItem={({item})=>{
      const src=imageUrl(item.images?.[0]);
      const sold=item.status==="sold";
      return <View style={s.card}>
        <Pressable style={s.top} onPress={()=>router.push({pathname:"/listing/[id]",params:{id:String(item.id)}})}>
          {src?<Image source={src} style={s.thumb} contentFit="cover"/>:<View style={[s.thumb,s.thumbEmpty]}><Ionicons name="car-sport" size={24} color={colors.gold}/></View>}
          <View style={{flex:1}}>
            <Text style={[s.title,{textAlign:align}]} numberOfLines={1}>{item.make} {item.model} {item.year||""}</Text>
            <Text style={[s.price,{textAlign:align}]}>{Number(item.price||0).toLocaleString()} {tr("د.إ","AED")}</Text>
            <View style={s.badges}>
              <Text style={[s.badge,sold?s.badgeSold:s.badgeActive]}>{sold?tr("مباعة","Sold"):tr("نشطة","Active")}</Text>
              {item.isFeatured&&<Text style={[s.badge,s.badgeFeatured]}>★ {tr("مميز","Featured")}</Text>}
              {item.isCertified&&<Text style={[s.badge,s.badgeCert]}>{tr("موثوق","Certified")}</Text>}
            </View>
          </View>
        </Pressable>
        <View style={s.actions}>
          <Pressable style={s.delBtn} onPress={()=>remove(item)}><Ionicons name="trash-outline" size={16} color={colors.danger}/><Text style={s.delText}>{tr("حذف","Delete")}</Text></Pressable>
          <Pressable style={s.viewBtn} onPress={()=>router.push({pathname:"/listing/[id]",params:{id:String(item.id)}})}><Text style={s.viewText}>{tr("عرض الإعلان","View listing")}</Text></Pressable>
        </View>
      </View>;
    }}
    ListEmptyComponent={<View style={s.emptyWrap}>
      <Ionicons name="car-sport-outline" size={60} color={colors.muted}/>
      <Text style={s.emptyText}>{error||tr("ما عندك إعلانات بعد","You have no listings yet")}</Text>
      {!error&&<Pressable style={s.btn} onPress={()=>router.push("/(tabs)/add")}><Text style={s.btnText}>{tr("أضف إعلانك الأول","Add your first listing")}</Text></Pressable>}
    </View>}
  />;
}

const s=StyleSheet.create({
  center:{flex:1,alignItems:"center",justifyContent:"center",gap:14,padding:25},
  centerText:{fontWeight:"800",fontSize:16},
  btn:{backgroundColor:colors.gold,paddingHorizontal:24,paddingVertical:13,borderRadius:13},
  btnText:{fontWeight:"900"},
  list:{padding:16,paddingBottom:30},
  card:{backgroundColor:"#fff",borderRadius:18,borderWidth:1,borderColor:colors.line,padding:12,marginBottom:12},
  top:{flexDirection:"row-reverse",gap:12},
  thumb:{width:96,height:72,borderRadius:12},
  thumbEmpty:{backgroundColor:colors.black,alignItems:"center",justifyContent:"center"},
  title:{fontWeight:"900",fontSize:16},
  price:{color:"#8B6914",fontWeight:"900",marginTop:4},
  badges:{flexDirection:"row-reverse",gap:6,marginTop:8,flexWrap:"wrap"},
  badge:{fontSize:11,fontWeight:"800",paddingHorizontal:9,paddingVertical:4,borderRadius:8,overflow:"hidden"},
  badgeActive:{backgroundColor:"#DDF3E6",color:"#1A7A43"},
  badgeSold:{backgroundColor:"#ECECEC",color:"#555"},
  badgeFeatured:{backgroundColor:"#F8EBC4",color:"#7A5C0B"},
  badgeCert:{backgroundColor:"#DCEEFF",color:colors.blue},
  actions:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginTop:12,paddingTop:10,borderTopWidth:1,borderTopColor:colors.line},
  delBtn:{flexDirection:"row-reverse",alignItems:"center",gap:5,padding:6},
  delText:{color:colors.danger,fontWeight:"800",fontSize:13},
  viewBtn:{backgroundColor:colors.black,paddingHorizontal:16,paddingVertical:9,borderRadius:11},
  viewText:{color:colors.gold,fontWeight:"800",fontSize:13},
  emptyWrap:{alignItems:"center",paddingVertical:50,gap:12},
  emptyText:{color:colors.muted,textAlign:"center"},
});
