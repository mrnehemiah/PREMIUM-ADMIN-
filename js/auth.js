document.addEventListener("DOMContentLoaded",async()=>{
 const login=document.getElementById("loginScreen"),shell=document.getElementById("appShell"),form=document.getElementById("loginForm"),logout=document.getElementById("logoutBtn");
 const isIndex=location.pathname.endsWith("/")||location.pathname.endsWith("index.html");
 if(!window.zuneIsLive){if(login)login.classList.add("hidden");if(shell)shell.classList.remove("hidden");return;}
 const {data:{session}}=await zuneSupabase.auth.getSession();
 if(!session){if(login)login.classList.remove("hidden");if(shell)shell.classList.add("hidden");}
 else {if(login)login.classList.add("hidden");if(shell)shell.classList.remove("hidden");}
 if(form)form.addEventListener("submit",async e=>{e.preventDefault();const b=form.querySelector("button");b.disabled=true;b.textContent="Signing in…";const {error}=await zuneSupabase.auth.signInWithPassword({email:loginEmail.value,password:loginPassword.value});if(error){loginError.textContent=error.message;b.disabled=false;b.textContent="Sign in securely"}else location.reload()});
 if(logout)logout.addEventListener("click",async()=>{if(window.zuneIsLive)await zuneSupabase.auth.signOut();location.href=isIndex?"index.html":"../index.html"});
});