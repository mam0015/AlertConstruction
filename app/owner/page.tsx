import { cookies } from "next/headers";
import OwnerDashboard from "./OwnerDashboard";
import OwnerLogin from "./OwnerLogin";
import { ownerCookieName,verifyOwnerSession } from "../owner-auth";
export const dynamic="force-dynamic";
export default async function OwnerPage({searchParams}:{searchParams:Promise<{preview?:string}>}){const params=await searchParams;if(process.env.NODE_ENV==="development"&&params.preview==="operation-hub")return <OwnerDashboard ownerName="Ali Mobini" ownerEmail="mamobiniali@gmail.com"/>;const c=await cookies();const s=await verifyOwnerSession(c.get(ownerCookieName())?.value);if(!s)return <OwnerLogin/>;return <OwnerDashboard ownerName="Ali Mobini" ownerEmail={s.email}/>;}
