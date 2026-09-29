import AsyncStorage from "@react-native-async-storage/async-storage";

export const API_URL = "https://mad3oom-api2-production.up.railway.app";
export const OFFICIAL_WHATSAPP = "971557168468";

export type Listing = {
  id:number|string; make?:string; model?:string; year?:number; city?:string; price?:number;
  mileage?:number; vin?:string; damageType?:string; legalStatus?:string; specs?:string;
  description?:string; whatsapp?:string; phone?:string; sellerPhone?:string; views?:number;
  images?:Array<string|{url?:string;path?:string}>; createdAt?:string; isFeatured?:boolean;
  isCertified?:boolean; status?:string; userId?:number;
};
export type Conversation={id:number;user1Id:number;user2Id:number;listingId:number|null;otherUserId?:number;otherUserName?:string;updatedAt:string;unreadCount?:number;unread?:number;lastMessage?:string;lastMessageBody?:string};
export type Message={id:number;conversationId:number;senderId:number;body:string;readAt:string|null;createdAt:string};

async function request(path:string, init:RequestInit={}){
  const token=await AsyncStorage.getItem("token");
  const headers:Record<string,string>={Accept:"application/json"};
  if(!(init.body instanceof FormData)) headers["Content-Type"]="application/json";
  if(token) headers.Authorization=`Bearer ${token}`;
  const res=await fetch(`${API_URL}${path}`,{...init,headers:{...headers,...(init.headers||{})}});
  const raw=await res.text(); let data:any={};
  try{data=raw?JSON.parse(raw):{}}catch{data={message:raw}}
  if(!res.ok) throw new Error(Array.isArray(data?.message)?data.message.join("، "):data?.message||`HTTP ${res.status}`);
  return data;
}
export const api={
  get:(p:string)=>request(p), post:(p:string,b:any)=>request(p,{method:"POST",body:JSON.stringify(b)}),
  patch:(p:string,b:any={})=>request(p,{method:"PATCH",body:JSON.stringify(b)}),
  del:(p:string)=>request(p,{method:"DELETE"})
};
export function imageUrl(input:any){
  const raw=typeof input==="string"?input:input?.url||input?.path||"";
  if(!raw)return ""; return /^https?:\/\//.test(raw)?raw:`${API_URL}${raw.startsWith("/")?raw:`/${raw}`}`;
}
export async function getListings(params:Record<string,string|number|undefined>={}){
  const q=Object.entries(params).filter(([,v])=>v!==undefined&&v!=="").map(([k,v])=>`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&");
  const d=await api.get(`/listings${q?`?${q}`:""}`); return Array.isArray(d)?d:d?.data||d?.items||d?.listings||[];
}
export async function getListing(id:string){const d=await api.get(`/listings/${id}`);return d?.data??d?.listing??d}
export async function getMyListings(){const d=await api.get("/listings/me");return Array.isArray(d)?d:d?.data||[]}

// ---------- الجرد الميداني (للأدمن) ----------
export type Scrapyard={id:number;name:string;city?:string;phone?:string;whatsapp?:string};
export type FieldVehicle={id:number;make:string;model:string;year:number;askingPrice:number;status:string;scrapyardId?:number;images?:string[];publishedListingId?:number|null};
export async function getFieldDashboard(){return api.get("/field-inventory/dashboard")}
export async function getScrapyards():Promise<Scrapyard[]>{const d=await api.get("/field-inventory/scrapyards");return Array.isArray(d)?d:d?.data||[]}
export async function createScrapyard(dto:Partial<Scrapyard>){return api.post("/field-inventory/scrapyards",dto)}
export async function getFieldVehicles():Promise<FieldVehicle[]>{const d=await api.get("/field-inventory/vehicles");return Array.isArray(d)?d:d?.data||[]}
export async function quickCaptureVehicle(fields:Record<string,any>,uris:string[]){
  const form=new FormData();
  Object.entries(fields).forEach(([k,v])=>{if(v!==undefined&&v!=="")form.append(k,String(v))});
  uris.slice(0,6).forEach((uri,i)=>form.append("images",{uri,name:`field-${Date.now()}-${i}.jpg`,type:"image/jpeg"} as any));
  return request("/field-inventory/vehicles/quick",{method:"POST",body:form});
}
export async function confirmFieldVehicle(id:number|string){return api.post(`/field-inventory/vehicles/${id}/confirm`,{})}
export async function markFieldVehicleStatus(id:number|string,status:string){return api.post(`/field-inventory/vehicles/${id}/status`,{status})}
export async function publishFieldVehicle(id:number|string){return api.post(`/field-inventory/vehicles/${id}/publish`,{})}
export async function login(email:string,password:string){return api.post("/auth/login",{email,password})}
export async function register(name:string,email:string,password:string){return api.post("/auth/register",{name,email,password})}
export async function getCurrentUser(){
  const d=await api.get("/users/me");
  return d?.data?.user??d?.data??d?.user??d;
}
export async function getConversations(){const d=await api.get("/messages/conversations");return Array.isArray(d)?d:d?.data||[]}
export async function getMessages(id:number|string){const d=await api.get(`/messages/conversations/${id}`);return Array.isArray(d)?d:d?.data||[]}
export async function sendMessage(id:number|string,body:string){return api.post(`/messages/conversations/${id}`,{body})}
export async function startConversation(otherUserId:number,listingId?:number){return api.post("/messages/conversations",{otherUserId,listingId})}
export async function createListing(fields:Record<string,any>,uris:string[]){
  const form=new FormData();
  Object.entries(fields).forEach(([k,v])=>{if(v!==undefined&&v!=="")form.append(k,String(v))});
  uris.slice(0,8).forEach((uri,i)=>form.append("images",{uri,name:`listing-${Date.now()}-${i}.jpg`,type:"image/jpeg"} as any));
  return request("/listings",{method:"POST",body:form});
}
export type AiListingSuggestion={make?:string;model?:string;year?:number|null;damageType?:string;description?:string;suggestedPriceAED?:number;confidence?:string;vin?:string|null;mileage?:number|null};
export async function completeListingWithAI(uris:string[],known:Partial<{make:string;model:string;year:string;city:string}>={}):Promise<AiListingSuggestion>{
  const form=new FormData();
  Object.entries(known).forEach(([k,v])=>{if(v)form.append(k,String(v))});
  uris.slice(0,8).forEach((uri,i)=>form.append("images",{uri,name:`ai-${Date.now()}-${i}.jpg`,type:"image/jpeg"} as any));
  return request("/ai/complete-listing",{method:"POST",body:form});
}
export type ChatTurn={role:"user"|"assistant";content:string};
export async function chatWithDibo(message:string,history:ChatTurn[]=[]):Promise<{reply:string}>{
  return api.post("/ai/chat",{message,history});
}
export const maskVin=(vin?:string)=>vin?`${vin.slice(0,Math.max(0,vin.length-6))}${"*".repeat(Math.min(6,vin.length))}`:"—";

export type AppNotification={id:number;userId:number;type:string;title:string;body:string;conversationId:number|null;messageId:number|null;readAt:string|null;createdAt:string};
export async function getNotifications():Promise<AppNotification[]>{const d=await api.get("/messages/notifications");return Array.isArray(d)?d:d?.data||[]}
export async function markNotificationRead(id:number){return api.patch(`/messages/notifications/${id}/read`)}
export async function markAllNotificationsRead(){return api.patch("/messages/notifications/read-all")}
export async function deleteNotification(id:number){return api.del(`/messages/notifications/${id}`)}
export async function clearNotifications(){return api.del("/messages/notifications")}

export type ProfileUpdate={name:string;phone:string;city:string;password?:string;currentPassword?:string};
export async function updateProfile(dto:ProfileUpdate){return api.patch("/users/me",dto)}
