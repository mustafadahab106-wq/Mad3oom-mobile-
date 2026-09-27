import {useEffect,useState} from "react";
import {ActivityIndicator,Alert,FlatList,Image,Pressable,StyleSheet,Text,TextInput,View} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {Ionicons} from "@expo/vector-icons";
import {
  confirmFieldVehicle, createScrapyard, FieldVehicle, getFieldDashboard, getFieldVehicles,
  getScrapyards, imageUrl, markFieldVehicleStatus, publishFieldVehicle, quickCaptureVehicle, Scrapyard,
} from "@/lib/api";
import {colors} from "@/constants/theme";

export default function FieldInventoryScreen(){
  const [dashboard,setDashboard]=useState<any>(null);
  const [scrapyards,setScrapyards]=useState<Scrapyard[]>([]);
  const [vehicles,setVehicles]=useState<FieldVehicle[]>([]);
  const [loading,setLoading]=useState(true);

  const [yardName,setYardName]=useState("");
  const [yardCity,setYardCity]=useState("");
  const [yardPhone,setYardPhone]=useState("");
  const [savingYard,setSavingYard]=useState(false);

  const [scrapyardId,setScrapyardId]=useState<number|null>(null);
  const [make,setMake]=useState("");
  const [model,setModel]=useState("");
  const [year,setYear]=useState("");
  const [askingPrice,setAskingPrice]=useState("");
  const [city,setCity]=useState("");
  const [images,setImages]=useState<string[]>([]);
  const [saving,setSaving]=useState(false);

  const load=()=>{
    setLoading(true);
    Promise.all([getFieldDashboard(),getScrapyards(),getFieldVehicles()])
      .then(([d,y,v])=>{setDashboard(d);setScrapyards(y);setVehicles(v)})
      .catch(()=>{})
      .finally(()=>setLoading(false));
  };
  useEffect(load,[]);

  const addScrapyard=async()=>{
    if(!yardName.trim())return Alert.alert("اسم الساحة مطلوب");
    setSavingYard(true);
    try{
      await createScrapyard({name:yardName,city:yardCity,phone:yardPhone});
      setYardName("");setYardCity("");setYardPhone("");
      load();
    }catch(e:any){Alert.alert("تعذر الإضافة",e.message)}finally{setSavingYard(false)}
  };

  const pickImages=async()=>{
    const r=await ImagePicker.launchImageLibraryAsync({mediaTypes:["images"],allowsMultipleSelection:true,quality:.75,selectionLimit:6-images.length});
    if(!r.canceled)setImages(p=>[...p,...r.assets.map(a=>a.uri)].slice(0,6));
  };

  const submitVehicle=async()=>{
    if(!make||!model||!year||!askingPrice)return Alert.alert("الحقول المطلوبة","أدخل الماركة والموديل والسنة والسعر");
    setSaving(true);
    try{
      await quickCaptureVehicle({make,model,year,askingPrice,city,scrapyardId:scrapyardId||undefined},images);
      setMake("");setModel("");setYear("");setAskingPrice("");setCity("");setImages([]);
      Alert.alert("تم","تم تسجيل المركبة");
      load();
    }catch(e:any){Alert.alert("تعذر الحفظ",e.message)}finally{setSaving(false)}
  };

  const doConfirm=async(id:number)=>{try{await confirmFieldVehicle(id);load()}catch(e:any){Alert.alert("خطأ",e.message)}};
  const doSold=async(id:number)=>{try{await markFieldVehicleStatus(id,"sold");load()}catch(e:any){Alert.alert("خطأ",e.message)}};
  const doPublish=async(id:number)=>{try{await publishFieldVehicle(id);Alert.alert("تم","تم نشر الإعلان");load()}catch(e:any){Alert.alert("خطأ",e.message)}};

  if(loading)return <View style={s.center}><ActivityIndicator size="large" color={colors.gold}/></View>;

  return <FlatList
    data={vehicles}
    keyExtractor={x=>String(x.id)}
    contentContainerStyle={{paddingBottom:40}}
    ListEmptyComponent={<Text style={s.empty}>لا توجد سيارات مسجّلة بعد</Text>}
    ListHeaderComponent={
      <View style={s.page}>
        <View style={s.statsRow}>
          <View style={s.statCard}><Text style={s.statNum}>{dashboard?.activeCars??"—"}</Text><Text style={s.statLabel}>متاحة</Text></View>
          <View style={s.statCard}><Text style={s.statNum}>{dashboard?.sold??"—"}</Text><Text style={s.statLabel}>مباعة</Text></View>
          <View style={s.statCard}><Text style={s.statNum}>{dashboard?.scrapyards??scrapyards.length}</Text><Text style={s.statLabel}>الساحات</Text></View>
        </View>

        <Text style={s.sectionTitle}>إضافة ساحة خردة</Text>
        <TextInput style={s.input} placeholder="اسم الساحة" value={yardName} onChangeText={setYardName} textAlign="right"/>
        <TextInput style={s.input} placeholder="المدينة" value={yardCity} onChangeText={setYardCity} textAlign="right"/>
        <TextInput style={s.input} placeholder="الهاتف" value={yardPhone} onChangeText={setYardPhone} textAlign="right" keyboardType="numeric"/>
        <Pressable style={s.btn} onPress={addScrapyard} disabled={savingYard}><Text style={s.btnText}>{savingYard?"جاري الحفظ...":"حفظ الساحة"}</Text></Pressable>

        <Text style={s.sectionTitle}>تسجيل سريع لسيارة</Text>
        <View style={s.yardPicker}>
          <Pressable style={[s.yardChip,!scrapyardId&&s.yardChipActive]} onPress={()=>setScrapyardId(null)}><Text style={!scrapyardId?s.yardChipTextActive:s.yardChipText}>بدون ساحة</Text></Pressable>
          {scrapyards.map(y=>(
            <Pressable key={y.id} style={[s.yardChip,scrapyardId===y.id&&s.yardChipActive]} onPress={()=>setScrapyardId(y.id)}>
              <Text style={scrapyardId===y.id?s.yardChipTextActive:s.yardChipText}>{y.name}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput style={s.input} placeholder="الماركة" value={make} onChangeText={setMake} textAlign="right"/>
        <TextInput style={s.input} placeholder="الموديل" value={model} onChangeText={setModel} textAlign="right"/>
        <View style={{flexDirection:"row-reverse",gap:8}}>
          <TextInput style={[s.input,{flex:1}]} placeholder="السنة" value={year} onChangeText={setYear} textAlign="right" keyboardType="numeric"/>
          <TextInput style={[s.input,{flex:1}]} placeholder="السعر المطلوب" value={askingPrice} onChangeText={setAskingPrice} textAlign="right" keyboardType="numeric"/>
        </View>
        <TextInput style={s.input} placeholder="المدينة" value={city} onChangeText={setCity} textAlign="right"/>
        <Pressable style={s.photoBtn} onPress={pickImages}><Ionicons name="images" size={18}/><Text>إضافة صور ({images.length}/6)</Text></Pressable>
        <Pressable style={s.btn} onPress={submitVehicle} disabled={saving}><Text style={s.btnText}>{saving?"جاري الحفظ...":"حفظ وأضف مركبة أخرى"}</Text></Pressable>

        <Text style={s.sectionTitle}>السيارات المسجّلة</Text>
      </View>
    }
    renderItem={({item})=>(
      <View style={s.vehicleRow}>
        {item.images?.[0]?<Image source={{uri:imageUrl(item.images[0])}} style={s.vThumb}/>:<View style={[s.vThumb,s.vThumbPlaceholder]}/>}
        <View style={{flex:1}}>
          <Text style={s.vTitle}>{item.make} {item.model} {item.year}</Text>
          <Text style={s.vSub}>{Number(item.askingPrice||0).toLocaleString()} د.إ · {item.status}</Text>
          <View style={s.vActions}>
            {item.status!=="available"&&<Pressable style={s.smallBtn} onPress={()=>doConfirm(item.id)}><Text style={s.smallBtnText}>تأكيد التوفر</Text></Pressable>}
            {item.status!=="sold"&&<Pressable style={[s.smallBtn,s.smallBtnDark]} onPress={()=>doSold(item.id)}><Text style={[s.smallBtnText,{color:"#fff"}]}>وسمها مباعة</Text></Pressable>}
            {!item.publishedListingId&&<Pressable style={[s.smallBtn,s.smallBtnGold]} onPress={()=>doPublish(item.id)}><Text style={s.smallBtnText}>نشرها كإعلان</Text></Pressable>}
          </View>
        </View>
      </View>
    )}
  />;
}

const s=StyleSheet.create({
  center:{flex:1,justifyContent:"center",alignItems:"center"},
  page:{padding:16},
  statsRow:{flexDirection:"row-reverse",gap:10,marginBottom:20},
  statCard:{flex:1,backgroundColor:"#fff",borderWidth:1,borderColor:colors.line,borderRadius:13,padding:14,alignItems:"center"},
  statNum:{fontSize:22,fontWeight:"900",color:colors.gold},
  statLabel:{fontSize:12,color:colors.muted,marginTop:4},
  sectionTitle:{fontSize:17,fontWeight:"900",textAlign:"right",marginTop:22,marginBottom:10},
  input:{backgroundColor:"#fff",borderWidth:1,borderColor:colors.line,borderRadius:13,padding:13,marginBottom:10},
  btn:{backgroundColor:colors.gold,padding:15,borderRadius:13,marginTop:4},
  btnText:{textAlign:"center",fontWeight:"900"},
  yardPicker:{flexDirection:"row-reverse",flexWrap:"wrap",gap:8,marginBottom:10},
  yardChip:{borderWidth:1,borderColor:colors.line,borderRadius:20,paddingHorizontal:14,paddingVertical:8,backgroundColor:"#fff"},
  yardChipActive:{backgroundColor:colors.black,borderColor:colors.black},
  yardChipText:{fontSize:12,color:colors.text},
  yardChipTextActive:{fontSize:12,color:"#fff",fontWeight:"800"},
  photoBtn:{flexDirection:"row-reverse",alignItems:"center",gap:8,justifyContent:"center",backgroundColor:"#fff",borderWidth:1,borderColor:colors.line,borderRadius:13,padding:13,marginBottom:10},
  vehicleRow:{flexDirection:"row-reverse",gap:12,paddingHorizontal:16,paddingVertical:12,borderBottomWidth:1,borderBottomColor:colors.line},
  vThumb:{width:70,height:54,borderRadius:8},
  vThumbPlaceholder:{backgroundColor:colors.line},
  vTitle:{fontWeight:"900",textAlign:"right"},
  vSub:{color:colors.muted,fontSize:12,textAlign:"right",marginTop:2,marginBottom:8},
  vActions:{flexDirection:"row-reverse",flexWrap:"wrap",gap:6},
  smallBtn:{borderWidth:1,borderColor:colors.line,borderRadius:10,paddingHorizontal:10,paddingVertical:6,backgroundColor:"#fff"},
  smallBtnDark:{backgroundColor:colors.black,borderColor:colors.black},
  smallBtnGold:{backgroundColor:colors.gold,borderColor:colors.gold},
  smallBtnText:{fontSize:11,fontWeight:"800"},
  empty:{textAlign:"center",color:colors.muted,padding:30},
});
