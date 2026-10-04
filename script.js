const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],mem={};
const G=k=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):null}catch(e){return mem[k]||null}};
const S=(k,v)=>{mem[k]=v;try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const FR={Apple:{sci:"Malus domestica",org:"Central Asia",fam:"Rosaceae",ben:["Rich in fiber and vitamin C","Supports heart health","Contains antioxidants"],use:["Fresh eating","Pies and baking","Juice and sauces"],fact:"Apples float because about 25% of their volume is air."},
Orange:{sci:"Citrus × sinensis",org:"Southeast Asia / China",fam:"Rutaceae",ben:["High in vitamin C","Good for immune system","Contains folate"],use:["Fresh eating","Juice","Zest in cooking"],fact:"Orange trees can live and bear fruit for over 50 years."},
Banana:{sci:"Musa acuminata",org:"Southeast Asia",fam:"Musaceae",ben:["Rich in potassium","Quick natural energy","Supports digestion"],use:["Fresh eating","Smoothies","Banana bread"],fact:"Bananas are technically berries."},
Mango:{sci:"Mangifera indica",org:"South Asia (India, Philippines, Thailand)",fam:"Anacardiaceae",ben:["Rich in vitamin A, C, and fiber","Good for immune system","Supports eye health","Contains antioxidants"],use:["Fresh consumption","Smoothies and juices","Desserts and baked goods","Salads and salsas"],fact:"Mango is called the “King of Fruits” in many countries due to its taste and nutritional value."},
Grapes:{sci:"Vitis vinifera",org:"Western Asia",fam:"Vitaceae",ben:["Contains resveratrol","Hydrating","Vitamin K source"],use:["Fresh eating","Wine and juice","Raisins"],fact:"It takes about 600 grapes to make one bottle of wine."},
Lime:{sci:"Citrus aurantiifolia",org:"Southeast Asia",fam:"Rutaceae",ben:["High in vitamin C","Aids iron absorption","Contains flavonoids"],use:["Drinks and cocktails","Marinades","Dressings"],fact:"Limes were used by sailors to prevent scurvy."}};
let DB=G("fs_db")||FR,HIST=G("fs_hist")||[],U=null,stream=null,busy=false;
// ---- auth
let role="user",reg=false;
const users=()=>Object.assign({admin:{p:"admin123",r:"admin"},user:{p:"user123",r:"user"}},G("fs_users")||{});
function tab(r){role=r;$("#tu").classList.toggle("on",r=="user");$("#ta").classList.toggle("on",r=="admin");$("#reg").style.display=r=="user"?"":"none";$("#le").textContent=""}
$("#tu").onclick=()=>tab("user");$("#ta").onclick=()=>tab("admin");
$("#reg").onclick=()=>{reg=!reg;$("#lb").textContent=reg?"Create account":"Log in";$("#reg").textContent=reg?"Back to log in":"New user? Create an account"};
$("#lb").onclick=()=>{const n=$("#lu").value.trim().toLowerCase(),p=$("#lp").value,e=$("#le");
 if(!n||!p)return e.textContent="Enter username and password.";
 if(reg){const all=users();if(all[n])return e.textContent="Username already taken.";if(p.length<4)return e.textContent="Password must be 4+ characters.";const c=G("fs_users")||{};c[n]={p,r:"user"};S("fs_users",c);reg=false;return enter(n,"user")}
 const a=users()[n];if(!a||a.p!==p||a.r!==role)return e.textContent="Wrong username, password or role.";enter(n,a.r)};
function enter(n,r){U={n,r};S("fs_sess",U);$("#login").style.display="none";$("#app").style.display="grid";
 $("#wel").textContent="Welcome, "+n[0].toUpperCase()+n.slice(1)+"!";$("#who").textContent=(r=="admin"?"🛡 Admin":"👤 User")+" · "+n;$("#adm").classList.toggle("hide",r!="admin");go("dash");paint()}
$("#out").onclick=()=>{stopCam();S("fs_sess",null);U=null;$("#app").style.display="none";$("#login").style.display="grid";$("#lp").value=""};
// ---- nav
function go(v){$$("section").forEach(s=>s.classList.add("hide"));$("#v-"+(v=="detect"?"dash":v)).classList.remove("hide");
 $$(".nv[data-v]").forEach(b=>b.classList.toggle("on",b.dataset.v==v));paint();if(v=="detect")$("#cap").scrollIntoView({behavior:"smooth"})}
$$("[data-v]").forEach(b=>b.onclick=()=>go(b.dataset.v));$$("[data-go]").forEach(b=>b.onclick=()=>go(b.dataset.go));
// ---- data views
const mine=()=>U.r=="admin"?HIST:HIST.filter(h=>h.u==U.n);
const fmt=t=>new Date(t).toLocaleString([], {month:"short",day:"numeric",year:"numeric",hour:"2-digit",minute:"2-digit"});
function tbl(list,full){if(!list.length)return'<div class="empty">No detections yet. Captured fruits will appear here.</div>';
 return"<table><tr><th>Fruit</th><th>Confidence</th>"+(U.r=="admin"?"<th>User</th>":"")+"<th>Date & Time</th>"+(full?"<th></th>":"")+"</tr>"+list.map(h=>`<tr><td><img src="${h.img}" alt="">${h.f}</td><td style="color:var(--g);font-weight:700">${h.c.toFixed(1)}%</td>${U.r=="admin"?"<td>"+h.u+"</td>":""}<td>${fmt(h.t)}</td>${full?`<td><button class="btn alt sm" data-d="${h.t}">Delete</button></td>`:""}</tr>`).join("")+"</table>"}
function paint(){if(!U)return;const l=mine(),now=Date.now(),d0=new Date().setHours(0,0,0,0),wk=now-7*864e5,
 avg=l.length?(l.reduce((a,h)=>a+h.c,0)/l.length).toFixed(1)+"%":"0%";
 $("#stats").innerHTML=[["🍎","Total Detections",l.length,"#c8ecd6"],["🎯","Accuracy Rate",avg,"#cfe6fb"],["🕒","Today",l.filter(h=>h.t>=d0).length,"#fde7c4"],["📅","This Week",l.filter(h=>h.t>=wk).length,"#e0d9f7"]].map(s=>`<div class="stat" style="background:${s[3]}">${s[0]} ${s[1]}<b>${s[2]}</b></div>`).join("");
 $("#recent").innerHTML=tbl(l.slice(0,5),false);$("#hall").innerHTML=tbl(l,true);
 $$("[data-d]").forEach(b=>b.onclick=()=>{HIST=HIST.filter(h=>h.t!=b.dataset.d);S("fs_hist",HIST);paint()});
 $("#dbl").innerHTML=Object.keys(DB).map(k=>`<div class="card" style="margin-bottom:10px"><div class="row"><b>${k}</b> <i style="color:var(--mu)">${DB[k].sci} · ${DB[k].fam} · ${DB[k].org}</i></div><div style="margin:6px 0">${DB[k].fact}</div>${U.r=="admin"?`<button class="btn alt sm" data-e="${k}">Edit fun fact</button>`:""}</div>`).join("");
 $$("[data-e]").forEach(b=>b.onclick=()=>{const v=prompt("Fun fact for "+b.dataset.e,DB[b.dataset.e].fact);if(v){DB[b.dataset.e].fact=v;S("fs_db",DB);paint()}})}
$("#clr").onclick=()=>{if(!confirm("Clear "+(U.r=="admin"?"ALL":"your")+" history?"))return;HIST=U.r=="admin"?[]:HIST.filter(h=>h.u!=U.n);S("fs_hist",HIST);paint()};
const th=G("fs_th2")||60;$("#th").value=th;$("#thv").textContent=th;$("#th").oninput=e=>{$("#thv").textContent=e.target.value;S("fs_th2",+e.target.value)};
$("#thm").onclick=()=>{const r=document.documentElement,d=r.dataset.theme=="dark"||(!r.dataset.theme&&matchMedia("(prefers-color-scheme:dark)").matches);r.dataset.theme=d?"light":"dark"};
// ---- camera
function stopCam(){if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;$("#cam").classList.add("hide");$("#live").style.display="none";$("#capb").textContent="📷 Capture Image"}
$("#capb").onclick=async()=>{if(busy)return;
 if(!stream){try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});const c=$("#cam");c.srcObject=stream;await c.play();c.classList.remove("hide");$("#pv").classList.add("hide");$("#ph").classList.add("hide");$("#live").style.display="block";$("#capb").textContent="📸 Take Photo"}catch(e){$("#file2").click()}return}
 const c=$("#cam"),k=document.createElement("canvas");k.width=c.videoWidth;k.height=c.videoHeight;k.getContext("2d").drawImage(c,0,0);stopCam();run(k)};
$("#upb").onclick=()=>$("#file").click();
$("#file2").onchange=$("#file").onchange=e=>{const f=e.target.files[0];if(!f)return;const i=new Image();i.onload=()=>{stopCam();const k=document.createElement("canvas");k.width=i.width;k.height=i.height;k.getContext("2d").drawImage(i,0,0);URL.revokeObjectURL(i.src);run(k)};i.src=URL.createObjectURL(f);e.target.value=""};
// ---- classifier (colour + shape analysis, runs fully on-device)
const PROF={Apple:[0,16,0],Orange:[27,7,0],Mango:[42,9,0],Banana:[54,5,0],Grapes:[275,35,0],Lime:[100,22,0]};
function analyze(src){const W=96,H=96,N=W*H,k=document.createElement("canvas");k.width=W;k.height=H;const x=k.getContext("2d");x.drawImage(src,0,0,W,H);const d=x.getImageData(0,0,W,H).data,lab=new Int8Array(N),hue=new Float32Array(N),sat=new Float32Array(N);let skin=0;
 for(let i=0;i<N;i++){const R=d[i*4],Gc=d[i*4+1],B=d[i*4+2],r=R/255,g=Gc/255,b=B/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),df=mx-mn,s=mx?df/mx:0;
  let h=df==0?0:mx==r?((g-b)/df)%6:mx==g?(b-r)/df+2:(r-g)/df+4;h*=60;if(h<0)h+=360;hue[i]=h>320?h-360:h;sat[i]=s;
  const Cb=128-.168736*R-.331264*Gc+.5*B,Cr=128+.5*R-.418688*Gc-.081312*B;
  const sk=Cb>=77&&Cb<=127&&Cr>=133&&Cr<=173&&s<.62&&(h<=50||h>=340);if(sk){skin++;continue}
  if(s>=.45&&mx>=.3)lab[i]=(h<78||h>225)?1:(h<170?2:0)}
 let c1=0,c2=0;for(let i=0;i<N;i++){if(lab[i]==1)c1++;else if(lab[i]==2)c2++}
 const type=c1>=N*.03?1:2,seen=new Uint8Array(N);let best=null;
 for(let i=0;i<N;i++){if(lab[i]!=type||seen[i])continue;const q=[i],pts=[];seen[i]=1;let x0=W,x1=0,y0=H,y1=0;
  while(q.length){const p=q.pop();pts.push(p);const px=p%W,py=(p/W)|0;x0=Math.min(x0,px);x1=Math.max(x1,px);y0=Math.min(y0,py);y1=Math.max(y1,py);
   for(const n of[px>0?p-1:-1,px<W-1?p+1:-1,py>0?p-W:-1,py<H-1?p+W:-1])if(n>=0&&lab[n]==type&&!seen[n]){seen[n]=1;q.push(n)}}
  if(!best||pts.length>best.pts.length)best={pts,x0,x1,y0,y1}}
 if(skin>N*.25||(best&&skin>best.pts.length*1.2))return{skin:true};
 if(!best||best.pts.length<N*.04)return null;
 const bw=best.x1-best.x0+1,bh=best.y1-best.y0+1,fill=best.pts.length/(bw*bh);if(fill<.4)return null;
 const ms=best.pts.reduce((a,p)=>a+sat[p],0)/best.pts.length;if(ms<.5)return null;
 const mean=best.pts.reduce((a,p)=>a+hue[p],0)/best.pts.length,sd=Math.sqrt(best.pts.reduce((a,p)=>a+(hue[p]-mean)**2,0)/best.pts.length),asp=Math.max(bw,bh)/Math.min(bw,bh),sc={};
 for(const f in PROF){const[c,s]=PROF[f];sc[f]=Math.exp(-((mean-c)**2)/(2*s*s))}
 if(asp>1.55)sc.Banana*=1.35;else sc.Banana*=.75;
 if(sd>8.5){sc.Mango*=1.25;sc.Banana*=.8}else{sc.Banana*=1.1;sc.Mango*=.85}
 const ks=Object.keys(sc).sort((a,b)=>sc[b]-sc[a]),sum=ks.reduce((a,f)=>a+sc[f],0)||1,p=sc[ks[0]]/sum;
 if(p<.5||sc[ks[0]]<.25)return null;
 return{fruit:ks[0],conf:Math.min(99.4,45+55*p*Math.min(1,sc[ks[0]]*1.15)+(p>.8?4:0)),box:[best.x0/W,best.y0/H,bw/W,bh/H]}}
// ---- run detection with animated steps
function run(src){busy=true;const k=$("#pv");k.width=640;k.height=480;const x=k.getContext("2d"),s=Math.max(640/src.width,480/src.height),w=src.width*s,h=src.height*s;
 x.drawImage(src,(640-w)/2,(480-h)/2,w,h);k.classList.remove("hide");$("#ph").classList.add("hide");$("#cam").classList.add("hide");
 const li=$$("#steps li");li.forEach(e=>e.classList.remove("d"));let n=0;
 const set=p=>{$("#rc").style.strokeDashoffset=352*(1-p/100);$("#rt").innerHTML=(p<100?"Detecting…":"Done")+"<br>"+p+"%"};
 const t=setInterval(()=>{n++;set(Math.min(100,n*25));li[n-1]&&li[n-1].classList.add("d");if(n>=4){clearInterval(t);finish(k)}},420)}
function finish(k){busy=false;const r=analyze(k);const min=$("#th").value;
 if(!r||r.skin||r.conf<min){$("#rb").innerHTML='<div class="empty">🚫 '+(r&&r.skin?"Not a fruit (body part detected).":"No known fruit detected.")+'<br>FruitScan only detects fruits. Place one fruit close to the camera in good light.</div>';return}
 const x=k.getContext("2d");x.strokeStyle="#16c060";x.lineWidth=5;const[bx,by,bw,bh]=r.box;x.strokeRect(bx*640,by*480,bw*640,bh*480);
 x.fillStyle="#16c060";x.font="bold 22px sans-serif";const lb=r.fruit+" "+r.conf.toFixed(1)+"%";x.fillRect(bx*640-2,by*480-32,x.measureText(lb).width+16,32);x.fillStyle="#fff";x.fillText(lb,bx*640+6,by*480-9);
 const t=document.createElement("canvas");t.width=t.height=64;const sx=Math.max(0,bx*k.width),sy=Math.max(0,by*k.height);t.getContext("2d").drawImage(k,sx,sy,bw*k.width,bh*k.height,0,0,64,64);
 const rec={u:U.n,f:r.fruit,c:r.conf,t:Date.now(),img:t.toDataURL("image/jpeg",.6)};HIST.unshift(rec);HIST=HIST.slice(0,300);S("fs_hist",HIST);
 const f=DB[r.fruit]||{ben:[],use:[],sci:"",org:"",fam:"",fact:""},li=a=>a.map(i=>"<li>"+i+"</li>").join("");
 $("#rb").innerHTML=`<img src="${rec.img}" style="width:46px;height:46px;border-radius:8px;float:left;margin-right:10px" alt=""><span class="pill">${r.conf.toFixed(1)}%</span><h4 style="margin:0">${r.fruit}</h4><i style="color:var(--mu)">${f.sci}</i><div style="clear:both;margin-top:8px"><b>Origin:</b> ${f.org}<br><b>Family:</b> ${f.fam}</div><h4>Nutritional Benefits</h4><ul>${li(f.ben)}</ul><h4>Common Uses</h4><ul>${li(f.use)}</ul><div class="fact"><b>Fun Fact</b><br>${f.fact}</div>`;paint()}
const ss=G("fs_sess");if(ss&&users()[ss.n])enter(ss.n,ss.r);tab("user");
