import {useState} from "react";
import {Alert,KeyboardAvoidingView,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from "react-native";
import {router} from "expo-router";
import {useAuth} from "@/contexts/AuthContext";
import {colors} from "@/constants/theme";
import {useLanguage} from "@/contexts/LanguageContext";
export default function Login(){
 const{tr,isRTL}=useLanguage();
 const{signIn,signUp}=useAuth();const[registering,setRegistering]=useState(false);const[name,setName]=useState("");const[email,setEmail]=useState("");const[password,setPassword]=useState("");const[busy,setBusy]=useState(false);
 const submit=async()=>{setBusy(true);try{registering?await signUp(name,email,password):await signIn(email,password);router.back()}catch(e:any){Alert.alert(tr("تعذر الدخول","Unable to sign in"),e.message)}finally{setBusy(false)}};
 const align=isRTL?"right":"left";
 return <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==="ios"?"padding":"height"} keyboardVerticalOffset={Platform.OS==="ios"?40:0}><ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled"><Text style={s.logo}>MAD3OOM</Text><Text style={s.title}>{registering?tr("إنشاء حساب جديد","Create account"):tr("تسجيل الدخول","Sign in")}</Text>{registering&&<TextInput style={s.input} placeholder={tr("الاسم","Name")} value={name} onChangeText={setName} textAlign={align}/>}<TextInput style={s.input} placeholder={tr("البريد الإلكتروني","Email")} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" textAlign={align}/><TextInput style={s.input} placeholder={tr("كلمة المرور","Password")} value={password} onChangeText={setPassword} secureTextEntry textAlign={align}/><Pressable style={s.btn} onPress={submit} disabled={busy}><Text style={s.btnText}>{busy?tr("انتظر...","Please wait..."):registering?tr("إنشاء الحساب","Create account"):tr("دخول","Sign in")}</Text></Pressable><Pressable onPress={()=>setRegistering(v=>!v)}><Text style={s.switch}>{registering?tr("لديك حساب؟ سجّل الدخول","Already have an account? Sign in"):tr("ليس لديك حساب؟ أنشئ حسابًا","No account? Create one")}</Text></Pressable></ScrollView></KeyboardAvoidingView>
}
const s=StyleSheet.create({page:{flexGrow:1,padding:22,justifyContent:"center"},logo:{textAlign:"center",color:colors.gold,fontSize:25,fontWeight:"900",letterSpacing:2},title:{fontSize:26,fontWeight:"900",textAlign:"center",marginVertical:25},input:{backgroundColor:"#fff",borderWidth:1,borderColor:colors.line,borderRadius:13,padding:14,marginBottom:11},btn:{backgroundColor:colors.gold,borderRadius:13,padding:15,marginTop:5},btnText:{textAlign:"center",fontWeight:"900"},switch:{textAlign:"center",marginTop:20,color:colors.blue}})
