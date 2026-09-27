import AsyncStorage from "@react-native-async-storage/async-storage";
import React,{createContext,useContext,useEffect,useState} from "react";

export type Language="ar"|"en";
type LanguageValue={language:Language;isRTL:boolean;setLanguage:(v:Language)=>Promise<void>;toggleLanguage:()=>Promise<void>;tr:(ar:string,en:string)=>string};
const LanguageContext=createContext<LanguageValue>({} as LanguageValue);

export function LanguageProvider({children}:{children:React.ReactNode}){
 const[language,setValue]=useState<Language>("ar");
 useEffect(()=>{AsyncStorage.getItem("app_language").then(v=>{if(v==="ar"||v==="en")setValue(v)})},[]);
 const setLanguage=async(v:Language)=>{setValue(v);await AsyncStorage.setItem("app_language",v)};
 const toggleLanguage=()=>setLanguage(language==="ar"?"en":"ar");
 const tr=(ar:string,en:string)=>language==="ar"?ar:en;
 return <LanguageContext.Provider value={{language,isRTL:language==="ar",setLanguage,toggleLanguage,tr}}>{children}</LanguageContext.Provider>;
}
export const useLanguage=()=>useContext(LanguageContext);
