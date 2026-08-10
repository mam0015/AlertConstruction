import { clearLoginFailures,getLoginAttempt,recordLoginFailure } from "../../../../db/owner-store";
import { createOwnerSession,ownerSessionCookie,registeredOwnerEmail,requestIsSameOrigin,verifyOwnerPassword } from "../../../owner-auth";
async function loginKey(email:string,request:Request){const bytes=new TextEncoder().encode(`${email.toLowerCase()}|${request.headers.get("cf-connecting-ip")??"local"}`);const digest=new Uint8Array(await crypto.subtle.digest("SHA-256",bytes));return Array.from(digest,b=>b.toString(16).padStart(2,"0")).join("");}
export async function POST(request:Request){
  if(!requestIsSameOrigin(request))return Response.json({error:"Request blocked."},{status:403});
  const p=await request.json().catch(()=>({})) as {email?:string;password?:string};
  const email=p.email?.trim().toLowerCase()??"",password=p.password??"",key=await loginKey(email,request),attempts=await getLoginAttempt(key),now=Date.now();
  if(attempts&&attempts.lockedUntil>now)return Response.json({error:"Too many attempts. Try again in 15 minutes."},{status:429});
  const emailMatches=email===registeredOwnerEmail();
  const passwordMatches=password.length>0&&await verifyOwnerPassword(password);
  if(!emailMatches||!passwordMatches){
    const failed=(attempts?.failedCount??0)+1;
    await recordLoginFailure(key,failed,failed>=5?now+15*60*1000:0);
    return Response.json({error:"The email or password is incorrect."},{status:401});
  }
  await clearLoginFailures(key);
  const token=await createOwnerSession(email),secure=new URL(request.url).protocol==="https:";
  return Response.json({ok:true},{headers:{"Set-Cookie":ownerSessionCookie(token,secure),"Cache-Control":"no-store"}});
}
