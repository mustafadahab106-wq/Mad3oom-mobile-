import {useEffect,useState} from "react";
import {ActivityIndicator,Alert,Dimensions,FlatList,Linking,Pressable,ScrollView,StyleSheet,Text,View} from "react-native";
import {Image} from "expo-image";
import {router,useLocalSearchParams} from "expo-router";
import {Ionicons} from "@expo/vector-icons";
import {getListing,imageUrl,Listing,maskVin,OFFICIAL_WHATSAPP,startConversation} from "@/lib/api";
import {useAuth} from "@/contexts/AuthContext";
import {colors} from "@/constants/theme";
const W=Dimensions.get("window").width-32;
export default function Detail(){
 const{id}=useLocalSearchParams<{id:string}>();const{user}=useAuth();const[x,setX]=useState<Listing|null>(null);const[active,setActive]=useState(0);
 useEffect(()=>{getListing(id).then(setX).catch(e=>Alert.alert("خطأ",e.message))},[id]);
 if(!x)return <View style={s.center}><ActivityIndicator size="large" color={colors.gold}/></View>;
 const images=(x.images||[]).map(imageUrl).filter(Boolean);const contact=async()=>{if(!user)return router.push("/login");if(!x.userId)return Alert.alert("تنبيه","حساب البائع غير متاح");const c=await startConversation(Number(x.userId),Number(x.id));router.push({pathname:"/chat/[id]",params:{id:String(c.id)}})};
 return <ScrollView contentContainerStyle={s.page}>
  <View style={s.gallery}><FlatList data={images} horizontal pagingEnabled showsHorizontalScrollIndicator={false} keyExtractor={(v,i)=>v+i} onMomentumScrollEnd={e=>setActive(Math.round(e.nativeEvent.contentOffset.x/W))} renderItem={({item})=><Image source={item} style={{width:W,height:W*.72}} contentFit="contain"/>}/>{images.length>0&&<Text style={s.counter}>{active+1} / {images.length}</Text>}</View>
  <View style={s.titleRow}><View><Text style={s.title}>{x.make} {x.model}</Text><Text style={s.meta}>{x.year} • {x.city}</Text></View><Text style={s.price}>{Number(x.price||0).toLocaleString()} د.إ</Text></View>
  <View style={s.badgeRow}>{x.isCertified&&<Text style={s.cert}>🛡 إعلان موثوق</Text>}{x.isFeatured&&<Text style={s.featured}>★ إعلان مميز</Text>}</View>
  <View style={s.grid}><Spec l="الممشى" v={`${Number(x.mileage||0).toLocaleString()} كم`}/><Spec l="الضرر" v={x.damageType||"—"}/><Spec l="الحالة القانونية" v={x.legalStatus||"—"}/><Spec l="رقم الشاصي VIN" v={maskVin(x.vin)}/></View>
  {!!x.description&&<View style={s.panel}><Text style={s.heading}>الوصف</Text><Text style={s.desc}>{x.description}</Text></View>}
  {x.isCertified?<Pressable style={s.buy}><Text style={s.buyText}>اشترِ الآن عن طريق مدعوم</Text></Pressable>:<View style={s.actions}><Action icon="call" label="اتصال" color={colors.black} onPress={()=>Linking.openURL(`tel:${x.whatsapp||x.phone||""}`)}/><Action icon="logo-whatsapp" label="واتساب" color={colors.green} onPress={()=>Linking.openURL(`https://wa.me/${OFFICIAL_WHATSAPP}?text=${encodeURIComponent(`استفسار عن إعلان #${x.id}`)}`)}/><Action icon="chatbubble" label="محادثة" color={colors.blue} onPress={contact}/></View>}
 </ScrollView>
}
function Spec({l,v}:{l:string;v:string}){return <View style={s.spec}><Text style={s.specL}>{l}</Text><Text style={s.specV}>{v}</Text></View>}
function Action({icon,label,color,onPress}:{icon:any;label:string;color:string;onPress:()=>void}){return <Pressable style={[s.action,{backgroundColor:color}]} onPress={onPress}><Ionicons name={icon} color="#fff" size={24}/><Text style={s.actionText}>{label}</Text></Pressable>}
const s=StyleSheet.create({page:{padding:16,paddingBottom:40},center:{flex:1,justifyContent:"center",alignItems:"center"},gallery:{backgroundColor:"#0D0F12",borderRadius:20,overflow:"hidden",position:"relative"},counter:{position:"absolute",bottom:10,right:10,color:"#fff",backgroundColor:"#0009",padding:7,borderRadius:12},titleRow:{flexDirection:"row-reverse",justifyContent:"space-between",alignItems:"center",marginTop:18,gap:12},title:{fontSize:25,fontWeight:"900",textAlign:"right"},meta:{color:colors.muted,textAlign:"right",marginTop:5},price:{color:"#8B6811",fontWeight:"900",fontSize:20},badgeRow:{flexDirection:"row-reverse",gap:8,marginVertical:14},cert:{backgroundColor:"#1674D1",color:"#fff",padding:8,borderRadius:9},featured:{backgroundColor:"#E7B52E",padding:8,borderRadius:9},grid:{flexDirection:"row-reverse",flexWrap:"wrap",gap:10},spec:{width:"48%",backgroundColor:"#fff",padding:13,borderRadius:13},specL:{color:colors.muted,fontSize:11,textAlign:"right"},specV:{fontWeight:"800",textAlign:"right",marginTop:5},panel:{backgroundColor:"#fff",borderRadius:15,padding:16,marginTop:15},heading:{fontWeight:"900",fontSize:17,textAlign:"right"},desc:{lineHeight:25,textAlign:"right",marginTop:8,color:"#555"},actions:{flexDirection:"row-reverse",gap:8,marginTop:18},action:{flex:1,padding:12,borderRadius:14,alignItems:"center",gap:5},actionText:{color:"#fff",fontWeight:"800",fontSize:12},buy:{backgroundColor:colors.gold,padding:16,borderRadius:14,marginTop:18},buyText:{fontWeight:"900",textAlign:"center"}})
