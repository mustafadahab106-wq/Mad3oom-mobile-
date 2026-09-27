import AsyncStorage from "@react-native-async-storage/async-storage";
import React,{createContext,useContext,useEffect,useState} from "react";
import {getCurrentUser,login as loginApi,register as registerApi} from "@/lib/api";

export type User={id:number;name?:string;email:string;phone?:string;avatar?:string;isAdmin?:boolean;role?:string};
type AuthValue={user:User|null;loading:boolean;signIn:(e:string,p:string)=>Promise<void>;signUp:(n:string,e:string,p:string)=>Promise<void>;signOut:()=>Promise<void>};
const AuthContext=createContext<AuthValue>({} as AuthValue);
function decodeToken(token:string):User|null{
 try{
  const part=token.split(".")[1].replace(/-/g,"+").replace(/_/g,"/");
  const p=JSON.parse(globalThis.atob(part.padEnd(Math.ceil(part.length/4)*4,"=")));
  return{id:Number(p.sub||p.userId||p.id),email:p.email||"",name:p.name,isAdmin:!!(p.isAdmin||p.role==="admin"),role:p.role};
 }catch{return null}
}
function normalizeUser(raw:any,fallback:User|null=null):User|null{
 const value=raw?.data?.user??raw?.data??raw?.user??raw;
 if(!value||typeof value!=="object")return fallback;
 const id=Number(value.id??value.userId??fallback?.id);
 return{id,email:value.email??fallback?.email??"",name:value.name??value.fullName??fallback?.name,phone:value.phone??value.whatsapp??fallback?.phone,avatar:value.avatar??value.avatarUrl??fallback?.avatar,isAdmin:!!(value.isAdmin||value.role==="admin"||fallback?.isAdmin),role:value.role??fallback?.role};
}
export function AuthProvider({children}:{children:React.ReactNode}){
 const[user,setUser]=useState<User|null>(null);const[loading,setLoading]=useState(true);
 useEffect(()=>{(async()=>{
  const [token,stored]=await Promise.all([AsyncStorage.getItem("token"),AsyncStorage.getItem("user")]);
  if(!token){setUser(null);return}
  const cached=stored?normalizeUser(JSON.parse(stored),decodeToken(token)):decodeToken(token);
  setUser(cached);
  try{const fresh=normalizeUser(await getCurrentUser(),cached);if(fresh){setUser(fresh);await AsyncStorage.setItem("user",JSON.stringify(fresh))}}catch{}
 })().finally(()=>setLoading(false))},[]);
 const save=async(d:any)=>{
  const token=d?.access_token||d?.token||d?.data?.access_token||d?.data?.token;
  if(!token)throw new Error("لم يصل رمز الدخول");
  await AsyncStorage.setItem("token",token);
  let next=normalizeUser(d?.user||d?.data?.user,decodeToken(token));
  try{next=normalizeUser(await getCurrentUser(),next)}catch{}
  if(next)await AsyncStorage.setItem("user",JSON.stringify(next));
  setUser(next);
 };
 return <AuthContext.Provider value={{user,loading,signIn:async(e,p)=>save(await loginApi(e,p)),signUp:async(n,e,p)=>save(await registerApi(n,e,p)),signOut:async()=>{await AsyncStorage.multiRemove(["token","user"]);setUser(null)}}}>{children}</AuthContext.Provider>
}
export const useAuth=()=>useContext(AuthContext);
