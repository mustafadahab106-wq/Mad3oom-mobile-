import {Pressable,StyleSheet,Text,View} from "react-native";
import {Image} from "expo-image";
import {router} from "expo-router";
import {Ionicons} from "@expo/vector-icons";
import {Listing,imageUrl} from "@/lib/api";
import {colors} from "@/constants/theme";
export default function ListingCard({item}:{item:Listing}){
 const uri=imageUrl(item.images?.[0]);
 return <Pressable style={s.card} onPress={()=>router.push({pathname:"/listing/[id]",params:{id:String(item.id)}})}>
  <View style={s.imageWrap}>{uri?<Image source={uri} style={s.image} contentFit="cover" transition={200}/>:<View style={s.empty}><Ionicons name="car-sport" size={45} color={colors.gold}/></View>}
   <View style={s.badges}>{item.isCertified&&<Text style={s.cert}>🛡 موثوق</Text>}{item.isFeatured&&<Text style={s.featured}>★ مميز</Text>}</View>
  </View>
  <View style={s.body}><View style={s.row}><Text style={s.title}>{item.make} {item.model}</Text><Text style={s.price}>{Number(item.price||0).toLocaleString()} د.إ</Text></View>
   <Text style={s.meta}>{item.year||"—"}  •  {item.city||"—"}  •  {Number(item.mileage||0).toLocaleString()} كم</Text>
  </View>
 </Pressable>
}
const s=StyleSheet.create({card:{backgroundColor:"#fff",borderRadius:18,overflow:"hidden",marginBottom:15,borderWidth:1,borderColor:colors.line},imageWrap:{height:205,backgroundColor:"#111",position:"relative"},image:{width:"100%",height:"100%"},empty:{flex:1,alignItems:"center",justifyContent:"center"},body:{padding:14},row:{flexDirection:"row-reverse",justifyContent:"space-between",gap:10},title:{fontWeight:"900",fontSize:17,textAlign:"right",flex:1},price:{fontWeight:"900",color:"#8B6914"},meta:{textAlign:"right",color:colors.muted,marginTop:10,fontSize:12},badges:{position:"absolute",top:10,right:10,gap:5},cert:{backgroundColor:"#1674D1",color:"#fff",paddingHorizontal:8,paddingVertical:5,borderRadius:8,fontSize:11,fontWeight:"800"},featured:{backgroundColor:"#E7B52E",color:"#211A08",paddingHorizontal:8,paddingVertical:5,borderRadius:8,fontSize:11,fontWeight:"800"}})
