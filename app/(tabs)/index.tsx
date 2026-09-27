import {useCallback,useEffect,useState} from "react";
import {ActivityIndicator,FlatList,RefreshControl,StyleSheet,Text,View} from "react-native";
import {useFocusEffect} from "expo-router";
import ListingCard from "@/components/ListingCard";
import {getListings,Listing} from "@/lib/api";
import {colors} from "@/constants/theme";
import {useLanguage} from "@/contexts/LanguageContext";
export default function Home(){
 const{tr,isRTL}=useLanguage();const align=isRTL?"right":"left";
 const[data,setData]=useState<Listing[]>([]);const[loading,setLoading]=useState(true);const[refreshing,setRefreshing]=useState(false);const[error,setError]=useState("");
 const load=async()=>{try{setError("");setData(await getListings())}catch(e:any){setError(e.message)}finally{setLoading(false);setRefreshing(false)}};
 useFocusEffect(useCallback(()=>{load()},[]));
 if(loading)return <View style={s.center}><ActivityIndicator color={colors.gold} size="large"/></View>;
 return <FlatList data={data} keyExtractor={x=>String(x.id)} renderItem={({item})=><ListingCard item={item}/>} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);load()}} tintColor={colors.gold}/>} ListHeaderComponent={<View style={s.hero}><Text style={[s.eyebrow,{textAlign:align}]}>{tr("سوق السيارات الموثوق","The trusted car marketplace")}</Text><Text style={[s.h1,{textAlign:align}]}>{tr("سيارتك القادمة تبدأ من مدعوم","Your next car starts with MAD3OOM")}</Text><Text style={[s.p,{textAlign:align}]}>{tr("ابحث وقارن وتواصل بثقة","Search, compare and connect with confidence")}</Text></View>} ListEmptyComponent={<Text style={s.empty}>{error||tr("لا توجد إعلانات حالياً","No listings available")}</Text>}/>} 
const s=StyleSheet.create({content:{padding:16},hero:{backgroundColor:colors.black,borderRadius:22,padding:23,marginBottom:20},eyebrow:{color:colors.gold,textAlign:"right",fontWeight:"800"},h1:{color:"#fff",fontSize:27,fontWeight:"900",textAlign:"right",marginTop:9,lineHeight:38},p:{color:"#AEB3BC",textAlign:"right",marginTop:9},center:{flex:1,alignItems:"center",justifyContent:"center"},empty:{textAlign:"center",color:colors.muted,padding:40}})
