import {useEffect,useState} from "react";
import {ActivityIndicator,Alert,KeyboardAvoidingView,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from "react-native";
import {router} from "expo-router";
import {Ionicons} from "@expo/vector-icons";
import {useAuth} from "@/contexts/AuthContext";
import {useLanguage} from "@/contexts/LanguageContext";
import {getCurrentUser,updateProfile} from "@/lib/api";
import {colors} from "@/constants/theme";

const yellow="#FFD500";
export default function EditProfile(){
  const{user,updateUser}=useAuth();
  const{tr}=useLanguage();
  const[name,setName]=useState(user?.name||"");
  const[phone,setPhone]=useState(user?.phone||"");
  const[city,setCity]=useState(user?.city||"");
  const[currentPassword,setCurrentPassword]=useState("");
  const[password,setPassword]=useState("");
  const[busy,setBusy]=useState(false);
  useEffect(()=>{
    if(!user)return;
    getCurrentUser().then(p=>{setName(p.name||"");setPhone(p.phone||"");setCity(p.city||"")}).catch(()=>{});
  },[user?.id]);
  if(!user)return <View style={s.center}><Text style={s.hint}>{tr("سجّل الدخول لتعديل ملفك","Sign in to edit your profile")}</Text><Pressable style={s.save} onPress={()=>router.replace("/login")}><Text style={s.saveText}>{tr("تسجيل الدخول","Sign in")}</Text></Pressable></View>;
  const save=async()=>{
    if(name.trim().length<2)return Alert.alert(tr("الاسم مطلوب","Name required"),tr("أدخل اسمًا من حرفين على الأقل","Enter at least two characters"));
    if(password&&(!currentPassword||password.length<8))return Alert.alert(tr("كلمة المرور","Password"),tr("أدخل كلمة المرور الحالية وجديدة من 8 أحرف على الأقل","Enter your current password and a new one with at least 8 characters"));
    setBusy(true);
    try{
      const result=await updateProfile({name:name.trim(),phone:phone.trim(),city:city.trim(),...(password?{password,currentPassword}:{})});
      await updateUser({name:result.name,phone:result.phone||"",city:result.city||""});
      Alert.alert(tr("تم الحفظ","Saved"),tr("تم تحديث ملفك الشخصي","Your profile was updated"));
      router.back();
    }catch(e:any){Alert.alert(tr("تعذر الحفظ","Could not save"),e.message)}
    finally{setBusy(false)}
  };
  const field=(label:string,icon:keyof typeof Ionicons.glyphMap,value:string,onChange:(v:string)=>void,placeholder:string,options?:{phone?:boolean;secure?:boolean})=><View style={s.field}>
    <Text style={s.label}>{label}</Text>
    <View style={s.inputWrap}><TextInput style={s.input} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#999" selectionColor={yellow} textAlign="right" secureTextEntry={options?.secure} keyboardType={options?.phone?"phone-pad":"default"}/><Ionicons name={icon} size={21} color="#CBA927"/></View>
  </View>;
  return <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==="ios"?"padding":undefined}>
    <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>{tr("تعديل الملف الشخصي","Edit profile")}</Text>
      <Text style={s.subtitle}>{tr("قم بتحديث بياناتك الشخصية بسهولة","Update your personal details")}</Text>
      {field(tr("الاسم الكامل","Full name"),"person",name,setName,tr("أدخل الاسم الكامل","Enter full name"))}
      {field(tr("رقم الهاتف (واتساب)","Phone (WhatsApp)"),"call",phone,setPhone,"+9715XXXXXXXX",{phone:true})}
      <Text style={s.hint}>{tr("يُستخدم هذا الرقم للتواصل معك في إعلاناتك الجديدة","Used as your default contact number for new listings")}</Text>
      {field(tr("المدينة","City"),"location",city,setCity,tr("مثال: دبي","e.g. Dubai"))}
      {password.length>0&&field(tr("كلمة المرور الحالية","Current password"),"key",currentPassword,setCurrentPassword,tr("أدخل كلمة المرور الحالية","Enter current password"),{secure:true})}
      {field(tr("كلمة المرور الجديدة (اختياري)","New password (optional)"),"lock-closed",password,setPassword,tr("اتركها فارغة إذا لم ترد تغييرها","Leave empty to keep it"),{secure:true})}
      <Pressable style={[s.save,busy&&{opacity:.6}]} onPress={save} disabled={busy}>
        {busy?<ActivityIndicator color="#111"/>:<Ionicons name="checkmark-circle" size={23} color="#111"/>}
        <Text style={s.saveText}>{busy?tr("جاري الحفظ...","Saving..."):tr("حفظ التعديلات","Save changes")}</Text>
      </Pressable>
    </ScrollView>
  </KeyboardAvoidingView>;
}
const s=StyleSheet.create({
  page:{padding:18,paddingTop:34,paddingBottom:45,backgroundColor:"#fff",flexGrow:1},
  center:{flex:1,alignItems:"center",justifyContent:"center",padding:25},
  title:{fontSize:27,fontWeight:"900",color:"#111",textAlign:"right"},
  subtitle:{color:"#777",fontSize:15,textAlign:"right",marginTop:8,marginBottom:30},
  field:{marginBottom:23},label:{fontSize:17,fontWeight:"700",color:"#111",textAlign:"right",marginBottom:10},
  inputWrap:{flexDirection:"row",alignItems:"center",gap:12,backgroundColor:"#F7F8FA",borderWidth:1,borderColor:"#DFE1E5",borderRadius:16,paddingHorizontal:16,minHeight:72},
  input:{flex:1,color:"#161616",fontSize:17,paddingVertical:14},
  hint:{color:"#777",fontSize:12,textAlign:"right",marginTop:-12,marginBottom:22},
  save:{flexDirection:"row-reverse",alignItems:"center",justifyContent:"center",gap:14,backgroundColor:yellow,borderRadius:17,padding:17,marginTop:20,elevation:2},
  saveText:{fontSize:17,fontWeight:"900",color:"#111"}
});

