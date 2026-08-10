import { clearOwnerSessionCookie,requestIsSameOrigin } from "../../../owner-auth";
export async function POST(request:Request){if(!requestIsSameOrigin(request))return Response.json({error:"Request blocked."},{status:403});const secure=new URL(request.url).protocol==="https:";return Response.json({ok:true},{headers:{"Set-Cookie":clearOwnerSessionCookie(secure),"Cache-Control":"no-store"}});}
