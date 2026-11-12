(function(){
 const c=window.ZUNE_CONFIG||{};
 window.zuneSupabase=null;
 window.zuneIsLive=!!(window.supabase&&window.supabase.createClient&&c.SUPABASE_URL&&c.SUPABASE_PUBLISHABLE_KEY&&!c.DEMO_MODE);
 if(window.zuneIsLive){window.zuneSupabase=window.supabase.createClient(c.SUPABASE_URL,c.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});}
 window.ZuneDB={
  async list(table,order="created_at"){if(!window.zuneIsLive)return null;const {data,error}=await zuneSupabase.from(table).select("*").order(order,{ascending:false}).limit(250);if(error)throw error;return data||[]},
  async insert(table,row){if(!window.zuneIsLive)return null;const {data,error}=await zuneSupabase.from(table).insert(row).select().single();if(error)throw error;return data},
  async update(table,id,patch){if(!window.zuneIsLive)return null;const {data,error}=await zuneSupabase.from(table).update(patch).eq("id",id).select().single();if(error)throw error;return data},
  async remove(table,id){if(!window.zuneIsLive)return null;const {error}=await zuneSupabase.from(table).delete().eq("id",id);if(error)throw error},
  async log(action,entity,details={}){if(!window.zuneIsLive)return;try{await zuneSupabase.from("admin_activity_logs").insert({action,entity,details});}catch(e){console.warn("Audit log failed",e)}}
 };
})();