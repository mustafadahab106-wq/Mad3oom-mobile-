import {useState} from "react";
import {FlatList,Pressable,StyleSheet,Text,TextInput,View} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {Ionicons} from "@expo/vector-icons";
import ListingCard from "@/components/ListingCard";
import {getListings,Listing} from "@/lib/api";
import {colors} from "@/constants/theme";
import {useLanguage} from "@/contexts/LanguageContext";
export default function Search(){
 const{tr,isRTL}=useLanguage();const align=isRTL?"right":"left";
 const insets=useSafeAreaInsets();
 const[q,setQ]=useState("");const[city,setCity]=useState("");const[minPrice,setMinPrice]=useState("");const[maxPrice,setMaxPrice]=useState("");const[data,setData]=useState<Listing[]>([]);const[busy,setBusy]=useState(false);
 const run=async()=>{setBusy(true);try{setData(await getListings({search:q,city,minPrice,maxPrice}))}finally{setBusy(false)}};
 return <FlatList data={data} keyExtractor={x=>String(x.id)} renderItem={({item})=><ListingCard item={item}/>} contentContainerStyle={[s.content,{paddingBottom:insets.bottom+90}]} ListHeaderComponent={<View><Text style={[s.title,{textAlign:align}]}>{tr("ابحث عن سيارتك","Find your car")}</Text><TextInput style={s.input} value={q} onChangeText={setQ} placeholder={tr("الماركة أو الموديل","Make or model")} textAlign={align}/><TextInput style={s.input} value={city} onChangeText={setCity} placeholder={tr("المدينة","City")} textAlign={align}/><View style={s.row}><TextInput style={[s.input,s.half]} value={maxPrice} onChangeText={setMaxPrice} placeholder={tr("أعلى سعر","Maximum price")} keyboardType="numeric" textAlign={align}/><TextInput style={[s.input,s.half]} value={minPrice} onChangeText={setMinPrice} placeholder={tr("أقل سعر","Minimum price")} keyboardType="numeric" textAlign={align}/></View><Pressable style={s.btn} onPress={run} disabled={busy}><Ionicons name="search" size={20}/><Text style={s.btnText}>{busy?tr("جاري البحث...","Searching..."):tr("بحث","Search")}</Text></Pressable></View>} ListEmptyComponent={<Text style={s.empty}>{tr("استخدم الحقول للبحث والتصفية","Use the fields to search and filter")}</Text>}/>} 
const s=StyleSheet.create({content:{padding:16},title:{fontSize:25,fontWeight:"900",textAlign:"right",marginBottom:18},input:{backgroundColor:"#fff",borderWidth:1,borderColor:colors.line,borderRadius:13,padding:13,marginBottom:10},row:{flexDirection:"row",gap:10},half:{flex:1},btn:{backgroundColor:colors.gold,borderRadius:13,padding:14,flexDirection:"row",gap:8,justifyContent:"center",marginBottom:22},btnText:{fontWeight:"900"},empty:{textAlign:"center",color:colors.muted,padding:40}})
