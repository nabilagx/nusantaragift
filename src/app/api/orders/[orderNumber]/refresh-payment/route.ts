import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMidtransConfig } from "@/lib/midtrans/config";
type Context={params:Promise<{orderNumber:string}>};
export async function POST(_request:Request,context:Context){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return NextResponse.json({error:"Silakan login untuk memeriksa pembayaran."},{status:401});
 const {orderNumber}=await context.params;
 const {data:order}=await supabase.from("orders").select("id,order_number,total_amount,payment_status").eq("order_number",orderNumber).eq("buyer_id",user.id).maybeSingle();
 if(!order)return NextResponse.json({error:"Pesanan tidak ditemukan."},{status:404});
 if(order.payment_status==="paid")return NextResponse.json({received:true,paymentStatus:"success",alreadyPaid:true});
 const admin=createAdminClient();
 const {data:payment}=await admin.from("payments").select("provider_reference,amount,status").eq("order_id",order.id).eq("provider","midtrans").order("created_at",{ascending:false}).limit(1).maybeSingle();
 if(!payment?.provider_reference)return NextResponse.json({error:"Referensi transaksi Midtrans belum ditemukan."},{status:404});
 const config=getMidtransConfig();
 const base=config.isProduction?"https://api.midtrans.com/v2":"https://api.sandbox.midtrans.com/v2";
 const auth=Buffer.from(config.serverKey+":").toString("base64");
 const response=await fetch(base+"/"+encodeURIComponent(payment.provider_reference)+"/status",{headers:{Accept:"application/json",Authorization:"Basic "+auth},cache:"no-store"});
 const result=await response.json().catch(()=>({})) as {order_id?:string;transaction_id?:string;transaction_status?:string;fraud_status?:string;status_code?:string;gross_amount?:string;payment_type?:string};
 if(!response.ok)return NextResponse.json({error:"Status transaksi belum dapat diverifikasi ke Midtrans."},{status:502});
 if(result.order_id!==payment.provider_reference||Number(result.gross_amount)!==Number(payment.amount)||Number(payment.amount)!==Number(order.total_amount))return NextResponse.json({error:"Data transaksi Midtrans tidak cocok dengan pesanan."},{status:409});
 const {data:applied,error}=await admin.rpc("apply_midtrans_notification",{p_provider_order_id:result.order_id,p_transaction_id:result.transaction_id??null,p_transaction_status:result.transaction_status??"",p_fraud_status:result.fraud_status??null,p_status_code:result.status_code??"",p_gross_amount:Number(result.gross_amount),p_payment_type:result.payment_type??null,p_raw_response:{...result,source:"authenticated_midtrans_status_check"}});
 if(error){console.error("Midtrans status sync:",error.message);return NextResponse.json({error:"Status ditemukan, tetapi sinkronisasi pesanan gagal."},{status:500});}
 return NextResponse.json({received:true,result:applied});
}