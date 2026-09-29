import {KeyboardTypeOptions,StyleSheet,Text,TextInput,View} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import {colors} from "@/constants/theme";

type Props={
  label:string;
  icon:keyof typeof Ionicons.glyphMap;
  value:string;
  onChangeText:(v:string)=>void;
  placeholder?:string;
  keyboardType?:KeyboardTypeOptions;
  multiline?:boolean;
  secureTextEntry?:boolean;
  hint?:string;
  maxLength?:number;
  ltr?:boolean;
};

export default function FormField({label,icon,value,onChangeText,placeholder,keyboardType,multiline,secureTextEntry,hint,maxLength,ltr}:Props){
  return <View style={s.wrap}>
    <View style={s.labelRow}>
      <View style={s.iconCircle}><Ionicons name={icon} size={15} color={colors.black}/></View>
      <Text style={s.label}>{label}</Text>
    </View>
    <TextInput
      style={[s.input,multiline&&s.multiline,ltr&&s.ltr]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder||label}
      placeholderTextColor="#9AA0A8"
      keyboardType={keyboardType}
      multiline={multiline}
      secureTextEntry={secureTextEntry}
      maxLength={maxLength}
      textAlign={ltr?"left":"right"}
      textAlignVertical={multiline?"top":"center"}
      autoCapitalize={ltr?"characters":"none"}
      autoCorrect={false}
      editable
      selectTextOnFocus={false}
      importantForAutofill="yes"
    />
    {!!hint&&<Text style={s.hint}>{hint}</Text>}
  </View>;
}

const s=StyleSheet.create({
  wrap:{marginBottom:14},
  labelRow:{flexDirection:"row-reverse",alignItems:"center",gap:8,marginBottom:7},
  iconCircle:{width:28,height:28,borderRadius:14,backgroundColor:colors.gold,alignItems:"center",justifyContent:"center"},
  label:{fontWeight:"800",fontSize:14,color:colors.text},
  input:{backgroundColor:"#F7F7F8",borderWidth:1,borderColor:colors.line,borderRadius:14,paddingHorizontal:14,paddingVertical:13,fontSize:15,color:colors.text},
  multiline:{minHeight:110},
  ltr:{writingDirection:"ltr"},
  hint:{textAlign:"right",fontSize:11,color:colors.muted,marginTop:5},
});
