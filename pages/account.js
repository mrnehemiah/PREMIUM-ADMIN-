
(() => {
"use strict";

const db = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);

const $ = id => document.getElementById(id);
let currentUser = null;

function notify(text,error=false){
  $("notice").textContent=text;
  $("notice").style.color=error?"#b91c1c":"#166534";
}

async function initialize(){
  const {data:{user},error} = await db.auth.getUser();

  if(error || !user){
    location.href="../login.html";
    return;
  }

  currentUser=user;

  const {data:profile,error:profileError}=await db
    .from("profiles")
    .select("id,full_name,role,is_verified,zune_id,created_at")
    .eq("id",user.id)
    .single();

  if(profileError){
    notify("Imeshindwa kusoma taarifa za akaunti: "+profileError.message,true);
    return;
  }

  if(profile.role!=="admin"){
    notify("Akaunti hii haina ruhusa za admin.",true);
    return;
  }

  const name=profile.full_name || "ZUNE Administrator";
  $("displayName").textContent=name;
  $("fullName").value=profile.full_name || "";
  $("displayEmail").textContent=user.email || "";
  $("email").textContent=user.email || "Haipo";
  $("zuneId").textContent=profile.zune_id || "Haijapatikana";
  $("joined").textContent=profile.created_at
    ?new Date(profile.created_at).toLocaleDateString()
    :"Haijulikani";
  $("avatar").textContent=name.trim().charAt(0).toUpperCase() || "A";

  if(profile.is_verified!==true){
    document.querySelector(".verified").textContent="ADMIN ACCOUNT";
  }
}

$("saveProfile").addEventListener("click",async()=>{
  const fullName=$("fullName").value.trim();

  if(!fullName){
    notify("Tafadhali weka jina lako.",true);
    return;
  }

  $("saveProfile").disabled=true;

  const {error}=await db.from("profiles")
    .update({full_name:fullName})
    .eq("id",currentUser.id);

  $("saveProfile").disabled=false;

  if(error){
    notify("Imeshindwa kuhifadhi: "+error.message,true);
    return;
  }

  $("displayName").textContent=fullName;
  $("avatar").textContent=fullName.charAt(0).toUpperCase();
  notify("Taarifa za akaunti zimehifadhiwa.");
});

$("changePassword").addEventListener("click",async()=>{
  const password=$("newPassword").value;
  const confirm=$("confirmPassword").value;

  if(password.length<8){
    notify("Password lazima iwe na angalau herufi 8.",true);
    return;
  }

  if(password!==confirm){
    notify("Password hazifanani.",true);
    return;
  }

  $("changePassword").disabled=true;

  const {error}=await db.auth.updateUser({password});

  $("changePassword").disabled=false;

  if(error){
    notify("Imeshindwa kubadilisha password: "+error.message,true);
    return;
  }

  $("newPassword").value="";
  $("confirmPassword").value="";
  notify("Password imebadilishwa kikamilifu.");
});

$("logout").addEventListener("click",async()=>{
  if(!confirm("Una uhakika unataka kutoka kwenye akaunti?"))return;

  const {error}=await db.auth.signOut();

  if(error){
    notify("Logout imeshindikana: "+error.message,true);
    return;
  }

  location.href="../login.html";
});

initialize();

})();
