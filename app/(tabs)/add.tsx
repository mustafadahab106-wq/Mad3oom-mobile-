import {useEffect,useRef,useState} from "react";
import {ActivityIndicator,Alert,KeyboardAvoidingView,Platform,Pressable,ScrollView,StyleSheet,Text,View} from "react-native";
import {Image} from "expo-image";
import * as ImagePicker from "expo-image-picker";
import {router} from "expo-router";
import {Ionicons} from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import FormField from "@/components/FormField";
import {useAuth} from "@/contexts/AuthContext";
import {useLanguage} from "@/contexts/LanguageContext";
import {completeListingWithAI,createListing} from "@/lib/api";
import {colors} from "@/constants/theme";

const LEGAL_OPTIONS=[{v:"possession",l:"حيازة"},{v:"ownership",l:"ملكية"},{v:"scrap",l:"اسكراب"},{v:"export_only",l:"تصدير فقط"}];
const SPECS_OPTIONS=[{v:"gcc",l:"خليجي"},{v:"american",l:"أمريكي"},{v:"korean",l:"كوري"},{v:"other",l:"أخرى"}];
const labelOf=(options:typeof LEGAL_OPTIONS,value:string)=>options.find(x=>x.v===value)?.l||value;
const EMPTY={make:"",model:"",year:"",mileage:"",price:"",city:"",specs:"",damageType:"",legalStatus:"",vin:"",whatsapp:"",description:""};
const DRAFT_KEY="draft_listing";
type Form=typeof EMPTY;

export default function Add(){
  const{user,signOut}=useAuth();
  const{tr,isRTL}=useLanguage();
  const align=isRTL?"right":"left";
  const STEPS=[tr("معلومات أساسية","Basic info"),tr("الصور والوصف","Photos & description"),tr("مراجعة","Review")];
  const GUIDE=[tr("الأمام","Front"),tr("الجانب الأيمن","Right side"),tr("الجانب الأيسر","Left side"),tr("المحرك","Engine"),tr("الخلف","Rear"),tr("رقم الشاصي","VIN plate"),tr("الداخلية","Interior"),tr("العداد","Odometer")];

  const scrollRef=useRef<ScrollView>(null);
  const[step,setStep]=useState(1);
  const[f,setF]=useState<Form>(EMPTY);
  const[images,setImages]=useState<string[]>([]);
  const[busy,setBusy]=useState(false);
  const[aiBusy,setAiBusy]=useState(false);
  const[aiNote,setAiNote]=useState("");
  const[draftReady,setDraftReady]=useState(false);
  const set=(k:keyof Form,v:string)=>setF(p=>({...p,[k]:v}));

  useEffect(()=>{
    if(user)setF(p=>({...p,whatsapp:p.whatsapp||user.phone||"",city:p.city||(user as any).city||""}));
  },[user?.phone,(user as any)?.city]);

  useEffect(()=>{(async()=>{
    try{
      const raw=await AsyncStorage.getItem(DRAFT_KEY);
      if(raw){
        const saved=JSON.parse(raw);
        const savedFields=saved?.fields??saved?.form;
        if(savedFields)setF(p=>({...p,...savedFields}));
        if(Array.isArray(saved?.images))setImages(saved.images.slice(0,8));
        if(saved?.step>=1&&saved?.step<=3)setStep(saved.step);
      }
    }catch{}finally{setDraftReady(true)}
  })()},[]);

  useEffect(()=>{
    if(!draftReady)return;
    const hasData=Object.values(f).some(v=>String(v).trim())||images.length>0;
    if(hasData)AsyncStorage.setItem(DRAFT_KEY,JSON.stringify({fields:f,images,step,timestamp:new Date().toISOString()})).catch(()=>{});
  },[draftReady,f,images,step]);

  useEffect(()=>{scrollRef.current?.scrollTo({y:0,animated:false})},[step]);

  const gallery=async()=>{
    const left=8-images.length;
    if(left<=0)return Alert.alert(tr("الحد الأقصى","Limit reached"),tr("تقدر ترفع 8 صور كحد أقصى","You can upload up to 8 photos"));
    const r=await ImagePicker.launchImageLibraryAsync({mediaTypes:["images"],allowsMultipleSelection:true,quality:.6,selectionLimit:left});
    if(!r.canceled)setImages(p=>[...p,...r.assets.map(a=>a.uri)].slice(0,8));
  };
  const camera=async()=>{
    if(images.length>=8)return Alert.alert(tr("الحد الأقصى","Limit reached"),tr("تقدر ترفع 8 صور كحد أقصى","You can upload up to 8 photos"));
    const perm=await ImagePicker.requestCameraPermissionsAsync();
    if(!perm.granted)return Alert.alert(tr("الكاميرا","Camera"),tr("نحتاج إذن الكاميرا لتصوير السيارة","We need camera access to photograph the car"));
    const r=await ImagePicker.launchCameraAsync({quality:.6});
    if(!r.canceled)setImages(p=>[...p,r.assets[0].uri].slice(0,8));
  };

  const runAi=async()=>{
    if(!user){
      Alert.alert(tr("تسجيل الدخول","Sign in"),tr("سجّل دخولك أولاً لاستخدام الذكاء الاصطناعي","Sign in first to use AI"),[{text:tr("إلغاء","Cancel"),style:"cancel"},{text:tr("تسجيل الدخول","Sign in"),onPress:()=>router.push("/login")}]);
      return;
    }
    if(images.length===0)return Alert.alert(tr("الصور مطلوبة","Photos required"),tr("ارفع صورة واحدة على الأقل أولاً","Upload at least one photo first"));
    setAiBusy(true);setAiNote("");
    try{
      const sg=await completeListingWithAI(images,{make:f.make,model:f.model,year:f.year,city:f.city});
      setF(p=>({
        ...p,
        make:sg.make||p.make,
        model:sg.model||p.model,
        year:sg.year?String(sg.year):p.year,
        damageType:sg.damageType||p.damageType,
        description:sg.description||p.description,
        price:sg.suggestedPriceAED?String(sg.suggestedPriceAED):p.price,
        vin:sg.vin||p.vin,
        mileage:sg.mileage?String(sg.mileage):p.mileage,
      }));
      setAiNote(tr("تم تعبئة البيانات — راجعها بالخطوة الأولى والأخيرة قبل النشر","Details filled in — review them in the first and last steps before publishing"));
    }catch(e:any){setAiNote(e.message||tr("تعذر تحليل الصور","Could not analyze the photos"))}
    finally{setAiBusy(false)}
  };

  const step1Missing=()=>{
    const m:string[]=[];
    if(!f.make.trim())m.push(tr("الشركة المصنعة","Make"));
    if(!f.model.trim())m.push(tr("الموديل","Model"));
    if(!/^\d{4}$/.test(f.year.trim())||Number(f.year)<1900||Number(f.year)>new Date().getFullYear()+1)m.push(tr("سنة الصنع (4 أرقام)","Year (4 digits)"));
    if(f.mileage.trim()&&(!/^\d+$/.test(f.mileage.trim())||Number(f.mileage)<0))m.push(tr("المسافة المقطوعة","Mileage"));
    if(!f.city.trim())m.push(tr("المدينة","City"));
    if(!f.price.trim()||Number(f.price)<=0)m.push(tr("السعر","Price"));
    return m;
  };
  const goNext=()=>{
    if(step===1){
      const m=step1Missing();
      if(m.length)return Alert.alert(tr("بيانات ناقصة","Missing information"),`${tr("أكمل","Complete")}: ${m.join(tr("، ",", "))}`);
    }
    if(step===2&&!/^[+\d\s()-]{7,20}$/.test(f.whatsapp.trim()))return Alert.alert(tr("رقم التواصل","Contact number"),tr("أدخل رقم واتساب صحيحًا","Enter a valid WhatsApp number"));
    setStep(v=>v+1);
  };

  const saveDraft=()=>AsyncStorage.setItem(DRAFT_KEY,JSON.stringify({fields:f,images,step,timestamp:new Date().toISOString()}));

  const publish=async()=>{
    if(!user){
      await saveDraft();
      router.push({pathname:"/login",params:{redirect:"/(tabs)/add"}});
      return;
    }
    setBusy(true);
    try{
      const d=await createListing(f,images);
      const id=d?.data?.id||d?.id;
      setF(EMPTY);
      setImages([]);setStep(1);setAiNote("");
      await AsyncStorage.removeItem(DRAFT_KEY);
      Alert.alert(tr("تم","Done"),tr("تم نشر الإعلان","Listing published"));
      if(id)router.push({pathname:"/listing/[id]",params:{id:String(id)}});
    }catch(e:any){
      if(/401|unauthorized|انتهت الجلسة|غير مصرح/i.test(String(e?.message))){
        await saveDraft();
        await signOut();
        Alert.alert(
          tr("انتهت الجلسة","Session expired"),
          tr("تم حفظ الإعلان كمسودة. سجّل الدخول مرة أخرى للمتابعة.","Your listing was saved as a draft. Sign in again to continue."),
          [{text:tr("تسجيل الدخول","Sign in"),onPress:()=>router.replace({pathname:"/login",params:{redirect:"/(tabs)/add"}})}]
        );
      }else Alert.alert(tr("تعذر النشر","Could not publish"),e.message);
    }
    finally{setBusy(false)}
  };

  return <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==="ios"?"padding":undefined}>
    <ScrollView ref={scrollRef} contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
      <View style={s.steps}>
        {STEPS.map((label,i)=>{
          const n=i+1;
          const done=step>n;
          const on=step===n;
          return <View key={label} style={{flexDirection:"row-reverse",flex:i<STEPS.length-1?1:0}}>
            <View style={s.stepCol}>
              <View style={[s.circle,on&&s.circleOn,done&&s.circleDone]}>
                {done?<Ionicons name="checkmark" size={20} color={colors.black}/>:<Text style={[s.circleNum,on&&{color:colors.black}]}>{n}</Text>}
              </View>
              <Text style={[s.stepLabel,(on||done)&&s.stepLabelOn]}>{label}</Text>
            </View>
            {i<STEPS.length-1&&<View style={[s.line,step>n&&s.lineOn]}/>}
          </View>;
        })}
      </View>

      {step===1&&<View>
        <Text style={[s.h2,{textAlign:align}]}>{tr("معلومات السيارة الأساسية","Basic vehicle information")}</Text>
        <View style={[s.underline,{alignSelf:isRTL?"flex-end":"flex-start"}]}/>
        <FormField label={tr("الشركة المصنعة","Make")} icon="car-sport" value={f.make} onChangeText={v=>set("make",v)} placeholder={tr("مثال: Toyota","e.g. Toyota")}/>
        <FormField label={tr("الموديل","Model")} icon="car" value={f.model} onChangeText={v=>set("model",v)} placeholder={tr("مثال: Camry","e.g. Camry")}/>
        <FormField label={tr("سنة الصنع","Year")} icon="calendar" value={f.year} onChangeText={v=>set("year",v)} placeholder={tr("مثال: 2020","e.g. 2020")} keyboardType="numeric" maxLength={4}/>
        <FormField label={tr("المسافة المقطوعة (كم)","Mileage (km)")} icon="speedometer" value={f.mileage} onChangeText={v=>set("mileage",v)} placeholder={tr("مثال: 85000","e.g. 85000")} keyboardType="numeric"/>
        <FormField label={tr("السعر (د.إ)","Price (AED)")} icon="pricetag" value={f.price} onChangeText={v=>set("price",v)} placeholder={tr("مثال: 25000","e.g. 25000")} keyboardType="numeric"/>
        <FormField label={tr("المدينة","City")} icon="location" value={f.city} onChangeText={v=>set("city",v)} placeholder={tr("مثال: دبي","e.g. Dubai")}/>
        <View style={s.labelRow}>
          <View style={s.labelIcon}><Ionicons name="globe" size={15} color={colors.gold}/></View>
          <Text style={s.labelText}>{tr("مواصفات السيارة","Vehicle specs")}</Text>
        </View>
        <View style={s.chips}>
          {SPECS_OPTIONS.map(o=>{
            const on=f.specs===o.v;
            return <Pressable key={o.v} style={[s.chip,on&&s.chipOn]} onPress={()=>set("specs",on?"":o.v)}>
              <Text style={[s.chipText,on&&s.chipTextOn]}>{tr(o.l,o.v)}</Text>
            </Pressable>;
          })}
        </View>
      </View>}

      {step===2&&<View>
        <View style={s.sources}>
          <Pressable style={s.source} onPress={camera}><Ionicons name="camera" size={26} color={colors.gold}/><Text style={s.sourceText}>{tr("الكاميرا","Camera")}</Text></Pressable>
          <Pressable style={s.source} onPress={gallery}><Ionicons name="images" size={26} color={colors.gold}/><Text style={s.sourceText}>{tr("المعرض","Gallery")}</Text></Pressable>
        </View>
        <Text style={s.photoCount}>{images.length}/8 {tr("صور","photos")}</Text>

        <View style={s.guide}>{GUIDE.map((g,i)=><Text key={g} style={s.guideItem}>{i+1}. {g}</Text>)}</View>

        {images.length>0&&<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.thumbs}>
          {images.map((uri,i)=><Pressable key={uri+i} onPress={()=>setImages(p=>p.filter((_,x)=>x!==i))}>
            <Image source={uri} style={s.thumb} contentFit="cover"/>
            <View style={s.remove}><Ionicons name="close" size={14} color="#fff"/></View>
          </Pressable>)}
        </ScrollView>}

        <Pressable style={[s.aiBtn,aiBusy&&{opacity:.7}]} onPress={runAi} disabled={aiBusy}>
          {aiBusy?<ActivityIndicator color={colors.gold}/>:<Ionicons name="sparkles" size={18} color={colors.gold}/>}
          <Text style={s.aiBtnText}>{aiBusy?tr("جاري التحليل...","Analyzing..."):tr("أكمل بالذكاء الاصطناعي","Complete with AI")}</Text>
        </Pressable>
        {!!aiNote&&<Text style={s.aiNote}>{aiNote}</Text>}

        <Text style={[s.h2,{marginTop:22,textAlign:align}]}>{tr("تفاصيل إضافية","Additional details")}</Text>
        <View style={[s.underline,{alignSelf:isRTL?"flex-end":"flex-start"}]}/>
        <FormField label={tr("نوع الضرر","Damage type")} icon="build" value={f.damageType} onChangeText={v=>set("damageType",v)} placeholder={tr("مثال: حادث أمامي","e.g. front collision")}/>
        <View style={s.labelRow}>
          <View style={s.labelIcon}><Ionicons name="document-text" size={15} color={colors.gold}/></View>
          <Text style={s.labelText}>{tr("الحالة القانونية","Legal status")}</Text>
        </View>
        <View style={s.chips}>
          {LEGAL_OPTIONS.map(o=>{
            const on=f.legalStatus===o.v;
            return <Pressable key={o.v} style={[s.chip,on&&s.chipOn]} onPress={()=>set("legalStatus",on?"":o.v)}>
              <Text style={[s.chipText,on&&s.chipTextOn]}>{tr(o.l,o.v)}</Text>
            </Pressable>;
          })}
        </View>
        <View style={{height:14}}/>
        <FormField label={tr("رقم الهيكل (VIN)","VIN")} icon="barcode" value={f.vin} onChangeText={v=>set("vin",v.toUpperCase().replace(/\s/g,""))} placeholder="XXXXXXXXXXXXXXXXX" maxLength={17} ltr/>
        <FormField label={tr("رقم التواصل (واتساب)","Contact number (WhatsApp)")} icon="logo-whatsapp" value={f.whatsapp} onChangeText={v=>set("whatsapp",v)} placeholder="+9715XXXXXXXX" keyboardType="phone-pad" hint={tr("سيستخدمه المشترون للتواصل معك","Buyers will use this number to contact you")}/>
        <FormField label={tr("وصف مفصل","Detailed description")} icon="create" value={f.description} onChangeText={v=>set("description",v)} placeholder={tr("اكتب وصف السيارة وحالتها","Describe the car and its condition")} multiline/>
      </View>}

      {step===3&&<View>
        <View style={s.reviewCard}>
          <View style={s.reviewHead}>
            <Pressable onPress={()=>setStep(1)}><Text style={s.editLink}>{tr("تعديل","Edit")}</Text></Pressable>
            <Text style={s.reviewTitle}>{tr("تفاصيل الإعلان","Listing details")}</Text>
          </View>

          {!user&&<View style={s.notice}>
            <Ionicons name="information-circle" size={20} color={colors.gold}/>
            <Text style={s.noticeText}>{tr("يجب تسجيل الدخول أولاً لمتابعة نشر الإعلان","You must sign in first to publish the listing")}</Text>
          </View>}

          <Text style={s.sectionTitle}>{tr("المعلومات الأساسية","Basic information")}</Text>
          <Row label={tr("الشركة","Make")} value={f.make} na={tr("غير محدد","Not set")}/>
          <Row label={tr("الموديل","Model")} value={f.model} na={tr("غير محدد","Not set")}/>
          <Row label={tr("السنة","Year")} value={f.year} na={tr("غير محدد","Not set")}/>
          <Row label={tr("المسافة","Mileage")} value={f.mileage?`${Number(f.mileage).toLocaleString()} ${tr("كم","km")}`:""} na={tr("غير محدد","Not set")}/>
          <Row label={tr("السعر","Price")} value={f.price?`${Number(f.price).toLocaleString()} ${tr("د.إ","AED")}`:""} na={tr("غير محدد","Not set")}/>
          <Row label={tr("المدينة","City")} value={f.city} na={tr("غير محدد","Not set")}/>
          <Row label={tr("المواصفات","Specs")} value={labelOf(SPECS_OPTIONS,f.specs)} na={tr("غير محدد","Not set")}/>

          <View style={s.reviewHead2}>
            <Pressable onPress={()=>setStep(2)}><Text style={s.editLink}>{tr("تعديل","Edit")}</Text></Pressable>
            <Text style={s.sectionTitle}>{tr("التفاصيل الإضافية","Additional details")}</Text>
          </View>
          <Row label={tr("نوع الضرر","Damage type")} value={f.damageType} na={tr("غير محدد","Not set")}/>
          <Row label={tr("الحالة القانونية","Legal status")} value={labelOf(LEGAL_OPTIONS,f.legalStatus)} na={tr("غير محدد","Not set")}/>
          <Row label={tr("رقم الهيكل","VIN")} value={f.vin} na={tr("غير محدد","Not set")}/>
          <Row label={tr("رقم التواصل","Contact number")} value={f.whatsapp} na={tr("غير محدد","Not set")}/>
          {!!f.description&&<Text style={[s.desc,{textAlign:align}]}>{f.description}</Text>}

          {images.length>0&&<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.thumbs,{marginTop:14}]}>
            {images.map((uri,i)=><Image key={uri+i} source={uri} style={s.thumbSmall} contentFit="cover"/>)}
          </ScrollView>}
        </View>
      </View>}

      <View style={s.navRow}>
        {step<3
          ?<Pressable style={s.primary} onPress={goNext}><Text style={s.primaryText}>{tr("التالي","Next")}</Text><Ionicons name={isRTL?"arrow-back":"arrow-forward"} size={18} color={colors.black}/></Pressable>
          :<Pressable style={[s.primary,busy&&{opacity:.6}]} onPress={publish} disabled={busy}>
            <Text style={s.primaryText}>{busy?tr("جاري النشر...","Publishing..."):user?tr("نشر الإعلان","Publish listing"):tr("تسجيل الدخول للنشر","Sign in to publish")}</Text>
            <Ionicons name={user?"checkmark-circle":"log-in"} size={19} color={colors.black}/>
          </Pressable>}
        {step>1&&<Pressable style={s.secondary} onPress={()=>setStep(v=>v-1)}><Text style={s.secondaryText}>{tr("السابق","Back")}</Text></Pressable>}
      </View>
    </ScrollView>
  </KeyboardAvoidingView>;
}

function Row({label,value,na}:{label:string;value?:string;na:string}){
  return <View style={s.reviewRow}>
    <Text style={s.reviewLabel}>{label}</Text>
    <Text style={[s.reviewValue,!value&&{color:colors.muted,fontWeight:"600"}]}>{value||na}</Text>
  </View>;
}

const s=StyleSheet.create({
  page:{padding:16,paddingBottom:40},
  steps:{flexDirection:"row-reverse",alignItems:"flex-start",backgroundColor:"#fff",borderRadius:20,borderWidth:1,borderColor:colors.line,paddingVertical:18,paddingHorizontal:14,marginBottom:22},
  stepCol:{width:78,alignItems:"center"},
  circle:{width:40,height:40,borderRadius:20,borderWidth:2,borderColor:colors.line,backgroundColor:"#fff",alignItems:"center",justifyContent:"center"},
  circleOn:{backgroundColor:colors.gold,borderColor:colors.gold},
  circleDone:{backgroundColor:colors.gold,borderColor:colors.gold},
  circleNum:{fontWeight:"900",color:colors.muted,fontSize:16},
  stepLabel:{marginTop:8,fontSize:11,color:colors.muted,fontWeight:"700",textAlign:"center"},
  stepLabelOn:{color:colors.text},
  line:{flex:1,height:3,borderRadius:2,backgroundColor:colors.line,marginTop:19},
  lineOn:{backgroundColor:colors.gold},
  h2:{fontSize:21,fontWeight:"900"},
  underline:{width:52,height:4,borderRadius:2,backgroundColor:colors.gold,marginTop:8,marginBottom:20},
  labelRow:{flexDirection:"row-reverse",alignItems:"center",gap:8,marginBottom:9},
  labelIcon:{width:28,height:28,borderRadius:14,backgroundColor:colors.black,alignItems:"center",justifyContent:"center"},
  labelText:{fontWeight:"800",fontSize:14,color:colors.text},
  chips:{flexDirection:"row-reverse",flexWrap:"wrap",gap:8},
  chip:{paddingHorizontal:16,paddingVertical:10,borderRadius:20,borderWidth:1,borderColor:colors.line,backgroundColor:"#fff"},
  chipOn:{backgroundColor:colors.black,borderColor:colors.black},
  chipText:{fontWeight:"700",fontSize:13,color:colors.text},
  chipTextOn:{color:colors.gold,fontWeight:"900"},
  sources:{flexDirection:"row-reverse",gap:12},
  source:{flex:1,height:96,borderRadius:16,borderWidth:2,borderStyle:"dashed",borderColor:colors.line,backgroundColor:"#fff",alignItems:"center",justifyContent:"center",gap:6},
  sourceText:{fontWeight:"800",color:colors.text},
  photoCount:{textAlign:"right",color:colors.muted,fontSize:12,marginTop:8},
  guide:{flexDirection:"row-reverse",flexWrap:"wrap",backgroundColor:"#FFF8E5",padding:12,borderRadius:14,marginTop:12,gap:7},
  guideItem:{width:"47%",textAlign:"right",fontSize:12,color:"#5A4A12"},
  thumbs:{gap:8,paddingVertical:12},
  thumb:{width:92,height:70,borderRadius:11},
  thumbSmall:{width:72,height:54,borderRadius:9},
  remove:{position:"absolute",top:4,right:4,width:22,height:22,borderRadius:11,backgroundColor:"#000B",alignItems:"center",justifyContent:"center"},
  aiBtn:{flexDirection:"row-reverse",backgroundColor:colors.black,padding:15,borderRadius:14,alignItems:"center",justifyContent:"center",gap:9,marginTop:6},
  aiBtnText:{color:colors.gold,fontWeight:"900",fontSize:14},
  aiNote:{textAlign:"right",fontSize:12,color:colors.muted,marginTop:8},
  reviewCard:{backgroundColor:"#fff",borderRadius:20,borderWidth:1,borderColor:colors.line,padding:16},
  reviewHead:{flexDirection:"row-reverse",justifyContent:"space-between",alignItems:"center",paddingBottom:12,borderBottomWidth:1,borderBottomColor:colors.line,marginBottom:14},
  reviewHead2:{flexDirection:"row-reverse",justifyContent:"space-between",alignItems:"center",marginTop:18},
  reviewTitle:{fontSize:18,fontWeight:"900"},
  editLink:{color:"#8B6914",fontWeight:"800"},
  notice:{flexDirection:"row-reverse",alignItems:"center",gap:9,backgroundColor:"#FFF8E5",borderWidth:1,borderColor:"#F0DDA0",borderRadius:13,padding:12,marginBottom:14},
  noticeText:{flex:1,textAlign:"right",color:"#7A5C0B",fontWeight:"700",fontSize:13},
  sectionTitle:{fontSize:16,fontWeight:"900",textAlign:"right",marginBottom:4},
  reviewRow:{flexDirection:"row-reverse",justifyContent:"space-between",gap:12,paddingVertical:11,borderBottomWidth:1,borderBottomColor:"#F0F0EC"},
  reviewLabel:{color:colors.muted,fontSize:13},
  reviewValue:{fontWeight:"800",fontSize:14,flexShrink:1,textAlign:"left"},
  desc:{color:"#555",lineHeight:22,marginTop:12},
  navRow:{flexDirection:"row-reverse",gap:12,marginTop:24},
  primary:{flex:1,flexDirection:"row-reverse",alignItems:"center",justifyContent:"center",gap:8,backgroundColor:colors.gold,paddingVertical:16,borderRadius:15},
  primaryText:{fontWeight:"900",fontSize:15},
  secondary:{paddingHorizontal:24,paddingVertical:16,borderRadius:15,borderWidth:1,borderColor:colors.line,backgroundColor:"#fff",alignItems:"center",justifyContent:"center"},
  secondaryText:{fontWeight:"800"},
});
