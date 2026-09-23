const STORE="pcos90-data"; // 永久固定：后续版本不要改
const START="2026-09-23", PILL_HOUR=22;
const emptyDB=()=>({schema:3,settings:{startDate:START,startWeight:76.6,goalWeight:73,pillTime:"22:00"},weights:[],foods:[],workouts:[],body:[],pills:[]});
const $=s=>document.querySelector(s), esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
function localDate(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function safeParse(x){try{return JSON.parse(x)}catch{return null}}
function norm(src){let d=emptyDB();if(!src||typeof src!=="object")return d;["weights","foods","workouts","body","pills"].forEach(k=>{if(Array.isArray(src[k]))d[k]=src[k]});if(src.settings)d.settings={...d.settings,...src.settings};return d}
function id(x){return typeof x==="string"?x:JSON.stringify(x)}
function merge(a,b){let d=norm(a);["weights","foods","workouts","body","pills"].forEach(k=>{let seen=new Set(d[k].map(id));(b[k]||[]).forEach(x=>{if(!seen.has(id(x))){d[k].push(x);seen.add(id(x))}})});d.settings={...d.settings,...(b.settings||{})};return d}
function migrate(){
 let current=safeParse(localStorage.getItem(STORE)), d=norm(current), found=[];
 const known=["pcos90-v12","pcos90-v11","pcos90-v1.1","pcos90-v1","pcos90","pcos-90-days","pcos90-data-v1"];
 known.forEach(k=>{let v=safeParse(localStorage.getItem(k));if(v){d=merge(d,norm(v));found.push(k)}});
 // 额外扫描仅限名称明显属于本项目的旧 key
 for(let i=0;i<localStorage.length;i++){let k=localStorage.key(i)||"";if(k===STORE||known.includes(k))continue;if(/pcos.*90|90.*pcos/i.test(k)){let v=safeParse(localStorage.getItem(k));if(v&&typeof v==="object"&&(v.weights||v.foods||v.pills)){d=merge(d,norm(v));found.push(k)}}}
 localStorage.setItem(STORE,JSON.stringify(d));return {d,found:[...new Set(found)]}
}
let migrated=migrate(), db=migrated.d;
function save(){db.schema=3;localStorage.setItem(STORE,JSON.stringify(db));render()}
function startMoment(){let [y,m,d]=(db.settings.startDate||START).split("-").map(Number);return new Date(y,m-1,d)}
function dayFor(dateStr){let [y,m,d]=dateStr.split("-").map(Number);return Math.floor((new Date(y,m-1,d)-startMoment())/86400000)+1}
function cycleFor(dateStr=localDate()){let n=dayFor(dateStr);if(n<1)return {valid:false};let cd=(n-1)%28+1;return {valid:true,n:Math.floor((n-1)/28)+1,cd,on:cd<=21}}
function pillMoment(n=new Date()){return new Date(n.getFullYear(),n.getMonth(),n.getDate(),PILL_HOUR,0,0)}
function tick(){
 let n=new Date(),pad=x=>String(x).padStart(2,"0"),wd=["日","一","二","三","四","五","六"],open=n>=startMoment();
 $("#clock").textContent=`${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`;$("#dateText").textContent=`${n.getFullYear()}年${n.getMonth()+1}月${n.getDate()}日 · 星期${wd[n.getDay()]} · 当前设备`;
 $("#planState").textContent=open?"90天计划进行中":"打卡尚未开放";$("#planCountdown").textContent=open?`Day ${Math.max(1,dayFor(localDate(n)))}`:"等待开始";
 document.querySelectorAll("[data-add]").forEach(b=>b.classList.toggle("disabled",!open));updatePill(n)
}
function updatePill(n=new Date()){
 let c=cycleFor(),done=db.pills.some(x=>(typeof x==="string"?x:x.date)===localDate()),btn=$("#pillBtn");
 if(!c.valid){btn.disabled=true;btn.classList.add("locked");return}
 $("#cycle").textContent=`优思明 · Cycle ${c.n}`;
 if(!c.on){btn.disabled=true;btn.classList.add("locked");btn.textContent="停药期";$("#pillStatus").textContent=`Break · Day ${c.cd-21}/7`;$("#pillHint").textContent="如需修正历史记录，请使用「补记」";return}
 $("#pillStatus").textContent=`Day ${c.cd} · ${db.settings.pillTime}`;
 if(done){btn.disabled=false;btn.classList.remove("locked");btn.textContent="✓ 已打卡";$("#pillHint").textContent="再次点击可撤销今天的误打卡";return}
 let can=n>=pillMoment(n)&&n>=startMoment();btn.disabled=!can;btn.classList.toggle("locked",!can);btn.textContent=can?"💊 打卡":"💊 22:00开放";
 if(can)$("#pillHint").textContent="现在可以打卡";else{let x=Math.max(0,Math.floor((pillMoment(n)-n)/1000));$("#pillHint").textContent=`还有 ${String(Math.floor(x/3600)).padStart(2,"0")}:${String(Math.floor(x%3600/60)).padStart(2,"0")}:${String(x%60).padStart(2,"0")}`}
}
// kcal 以常见份量/每单位估算；品牌餐品没有可靠官方值时只给区间
const FOODS=[
 {n:["水煮蛋","煮鸡蛋","鸡蛋"],u:"piece",k:[70,85],msg:"提供优质蛋白质"},
 {n:["拿铁","热拿铁","冰拿铁"],u:"ml",base:280,k:[120,190],msg:"热量主要来自牛奶；是否加糖会明显影响结果"},
 {n:["全脂牛奶"],u:"ml",base:250,k:[150,175],msg:"提供蛋白质和钙"},
 {n:["低脂牛奶"],u:"ml",base:250,k:[105,135],msg:"提供蛋白质和钙"},
 {n:["牛肉刀削面","刀削面"],u:"bowl",k:[550,850],msg:"一碗通常同时包含较多主食；牛肉提供蛋白质"},
 {n:["牛肉面"],u:"bowl",k:[500,800],msg:"主食占比较高，牛肉提供蛋白质"},
 {n:["馄饨","云吞"],u:"bowl",k:[350,600],msg:"热量受数量、肉馅和汤底影响较大"},
 {n:["微波鸡心","鸡心"],u:"g",base:100,k:[150,230],msg:"蛋白质较丰富；调味油会影响热量"},
 {n:["池奈炸鸡块咖喱蛋包饭","炸鸡块咖喱蛋包饭","咖喱蛋包饭"],u:"serving",k:[850,1250],msg:"估算：米饭、蛋、咖喱酱和炸鸡组合，能量通常较高"},
 {n:["麦当劳双层吉士汉堡","双层吉士汉堡"],u:"piece",k:[430,500],msg:"汉堡提供蛋白质，同时脂肪和钠通常不低"},
 {n:["巨无霸"],u:"piece",k:[480,560],msg:"汉堡类主餐，蛋白质尚可，脂肪和钠通常较高"},
 {n:["麦香鸡"],u:"piece",k:[380,470],msg:"含炸鸡排和酱料"},
 {n:["板烧鸡腿堡"],u:"piece",k:[400,520],msg:"提供蛋白质，酱料会增加能量"},
 {n:["麦乐鸡","麦当劳鸡块"],u:"piece",k:[40,55],msg:"有蛋白质，但属于油炸小食"},
 {n:["麦当劳薯条","中薯","小薯","大薯"],u:"serving",k:[220,480],msg:"主要是油炸淀粉；大小份差异明显"},
 {n:["肯德基香辣鸡腿堡","香辣鸡腿堡"],u:"piece",k:[430,580],msg:"炸鸡汉堡，油脂和钠通常较高"},
 {n:["新奥尔良烤鸡腿堡"],u:"piece",k:[400,540],msg:"提供蛋白质，酱料会增加能量"},
 {n:["老北京鸡肉卷","鸡肉卷"],u:"piece",k:[420,600],msg:"饼皮、鸡肉和酱料共同提供能量"},
 {n:["吮指原味鸡","原味鸡"],u:"piece",k:[220,360],msg:"炸鸡部位不同，热量差异较大"},
 {n:["上校鸡块","肯德基鸡块"],u:"piece",k:[45,70],msg:"油炸小食"},
 {n:["肯德基薯条"],u:"serving",k:[220,450],msg:"主要是油炸淀粉"},
 {n:["米饭"],u:"bowl",k:[180,300],msg:"常规主食来源"},
 {n:["鸡胸肉","鸡胸"],u:"g",base:100,k:[130,190],msg:"蛋白质来源不错"},
 {n:["牛肉"],u:"g",base:100,k:[160,300],msg:"蛋白质和铁来源"},
 {n:["豆腐"],u:"g",base:100,k:[70,160],msg:"植物蛋白来源"},
 {n:["青菜","蔬菜","西兰花","菠菜","生菜"],u:"serving",k:[30,150],msg:"提供蔬菜和膳食纤维",veg:true},
 {n:["香蕉"],u:"piece",k:[80,120],msg:"水果和碳水来源",veg:true},
 {n:["苹果","橙子"],u:"piece",k:[60,120],msg:"提供水果和膳食纤维",veg:true},
 {n:["奶茶"],u:"serving",k:[300,650],msg:"糖和能量通常较高"},
 {n:["无糖可乐","零度可乐"],u:"serving",k:[0,10],msg:"几乎不提供能量"},
 {n:["可乐"],u:"serving",k:[130,250],msg:"主要提供添加糖"}
];
function numberNear(text,name,u){
 let i=text.indexOf(name), seg=text.slice(Math.max(0,i-5),i+name.length+20), m;
 if(u==="ml"){m=seg.match(/(\d+(?:\.\d+)?)\s*ml/i);return m?+m[1]:null}
 if(u==="g"){m=seg.match(/(\d+(?:\.\d+)?)\s*g/i);return m?+m[1]:null}
 m=seg.match(/[×xX*]\s*(\d+(?:\.\d+)?)/)||seg.match(/(\d+(?:\.\d+)?)\s*(个|只|块|片|碗|杯|根|份)/);return m?+m[1]:1
}
function analyze(text,note=""){
 let all=(text+" "+note).replace(/\s+/g,""),lo=0,hi=0,msg=[],veg=false,matched=0;
 FOODS.forEach(f=>{let name=f.n.find(n=>all.includes(n));if(!name)return;let idx=all.indexOf(name),around=all.slice(Math.max(0,idx-10),idx+name.length+14);if(/没喝|未喝|没吃|未吃|没动/.test(around))return;
 let q=numberNear(all,name,f.u);if(f.base&&q)q=q/f.base;else if(f.base&&!q)q=1;else q=q||1;
 // “只吃3个”优先
 let only=around.match(/只(?:吃|喝)(?:了)?(\d+(?:\.\d+)?)/);if(only&&(f.u==="piece"||f.u==="serving"))q=+only[1];
 // “剩1/4” -> 吃了3/4
 let left=around.match(/剩(?:了)?(\d+)\s*\/\s*(\d+)/);if(left&&+left[2]>0)q*=Math.max(0,1-(+left[1]/+left[2]));
 lo+=f.k[0]*q;hi+=f.k[1]*q;msg.push(f.msg);veg=veg||!!f.veg;matched++});
 if(!matched)return {kcal:"暂无法估算",text:"本地食物库暂未识别到足够信息。请写清食物名称、数量和烹饪方式。"};
 let advice=veg?"；整体继续按实际份量记录即可。":"；这顿如果没有另外吃蔬菜/水果，膳食纤维可能偏少，下一餐正常补一份蔬菜即可，不需要少吃一顿补偿。";
 return {kcal:`约 ${Math.max(0,Math.round(lo/10)*10)}–${Math.max(0,Math.round(hi/10)*10)} kcal`,text:[...new Set(msg)].slice(0,3).join("；")+advice}
}
function render(){
 let d=Math.max(1,dayFor(localDate())),w=Math.ceil(d/7);$("#dayTitle").textContent=`Week ${w} · Day ${d}`;$("#startW").textContent=db.settings.startWeight;$("#goalW").textContent=db.settings.goalWeight;
 let fs=db.foods.filter(x=>x.date===localDate()),ws=db.workouts.filter(x=>x.date===localDate()),ww=[...db.weights].reverse().find(x=>x.date===localDate());
 $("#foodMini").textContent=`${fs.length} 餐`;$("#workoutMini").textContent=ws.length?`${ws.reduce((a,x)=>a+(+x.minutes||0),0)} min`:"未记录";$("#weightMini").textContent=ww?`${ww.value} kg`:"记录";
 $("#foods").innerHTML=fs.length?fs.map(x=>`<div class="entry"><div class="entryTop"><b>${esc(x.meal||"饮食")}</b><span>${esc(x.time||"")}</span></div><p>${esc(x.items||"")}</p>${x.note?`<span class="tag">${esc(x.note)}</span>`:""}${x.analysis?`<div class="analysis"><b>${esc(x.analysis.kcal)}</b><p>${esc(x.analysis.text)}</p></div>`:""}</div>`).join(""):"今天还没有饮食记录";
 $("#workouts").innerHTML=ws.length?ws.map(x=>`<div class="entry"><div class="entryTop"><b>${esc(x.type||"运动")}</b><span>${esc(x.minutes||"")} min</span></div><p>${esc(x.detail||"")}</p></div>`).join(""):"今天还没有运动记录";
 let weights=[...db.weights].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,10);$("#weights").innerHTML=weights.length?weights.map(x=>`<div class="entry"><div class="entryTop"><b>${esc(x.value)} kg</b><span>${esc(x.date)}</span></div></div>`).join(""):"还没有体重记录";
 $("#migrationNote").textContent=migrated.found.length?`已检测并合并旧版本数据：${migrated.found.join("、")}`:"V1.3 使用永久固定数据键，后续升级不会再因版本号更换存储位置。";updatePill()
}
const modal=$("#modal");$("#close").onclick=()=>modal.close();
function dateField(v=localDate()){return `<div class="field"><label>日期</label><input id="recordDate" type="date" value="${v}" min="${db.settings.startDate}" max="${localDate()}"></div>`}
function open(k,date=localDate()){
 $("#modalTitle").textContent={food:"记录饮食",weight:"记录体重",workout:"记录运动",body:"身体状态",pill:"补记优思明"}[k]||"记录";let b=$("#modalBody");
 if(k==="food")b.innerHTML=`${dateField(date)}<div class="field"><label>餐次</label><select id="meal"><option>早餐</option><option selected>午餐</option><option>晚餐</option><option>加餐</option></select></div><div class="field"><label>实际吃了什么</label><textarea id="items" placeholder="例：水煮蛋1个、热拿铁280ml"></textarea></div><div class="field"><label>备注</label><input id="note" placeholder="例：可乐没喝 / 面剩1/4 / 只吃3个"></div><div class="note">会按实际摄入做本地热量区间估算。品牌餐品没有可靠精确数据时只显示估算区间。</div><button class="save" onclick="addFood()">保存并分析</button>`;
 if(k==="weight")b.innerHTML=`${dateField(date)}<div class="field"><label>体重 kg</label><input id="val" type="number" step=".05" inputmode="decimal"></div><button class="save" onclick="addWeight()">保存</button>`;
 if(k==="workout")b.innerHTML=`${dateField(date)}<div class="field"><label>类型</label><select id="type"><option>跑步机爬坡</option><option>力量 · Full Body</option><option>步行</option><option>其他</option></select></div><div class="field"><label>分钟</label><input id="mins" type="number"></div><div class="field"><label>详情</label><textarea id="detail" placeholder="坡度9–10，速度3.5 km/h…"></textarea></div><button class="save" onclick="addWorkout()">保存</button>`;
 if(k==="body")b.innerHTML=`${dateField(date)}<div class="field"><label>状态</label><textarea id="state" placeholder="例：点滴出血、头痛、便秘、腿部酸痛…"></textarea></div><button class="save" onclick="addBody()">保存</button>`;
 if(k==="pill")b.innerHTML=`${dateField(date)}<div class="note">这里用于补记过去已经实际服用的优思明。当天正常打卡仍需等本机时间 22:00 后。</div><button class="save" onclick="backfillPill()">确认该日已服药</button>`;
 modal.showModal()
}
function openBackfill(){
 $("#modalTitle").textContent="补记历史记录";$("#modalBody").innerHTML=`<div class="note">选择要补记的内容。下一步可选择过去日期。</div><div class="picker"><button onclick="open('weight')">⚖️ 体重</button><button onclick="open('food')">🍽️ 饮食</button><button onclick="open('workout')">🏃 运动</button><button onclick="open('body')">🙂 身体状态</button><button onclick="open('pill')">💊 优思明</button></div>`;modal.showModal()
}
document.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>open(b.dataset.add));$("#backfillBtn").onclick=openBackfill;$("#navPlus").onclick=openBackfill;
window.open=open;
window.addFood=()=>{let items=$("#items").value.trim(),note=$("#note").value.trim(),date=$("#recordDate").value;if(!items||!date)return;db.foods.push({date,meal:$("#meal").value,items,note,time:date===localDate()?new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"}):"补记",analysis:analyze(items,note)});save();modal.close()};
window.addWeight=()=>{let v=+$("#val").value,date=$("#recordDate").value;if(!v||!date)return;db.weights=db.weights.filter(x=>x.date!==date);db.weights.push({date,value:v});save();modal.close()};
window.addWorkout=()=>{let m=+$("#mins").value,date=$("#recordDate").value;if(!m||!date)return;db.workouts.push({date,type:$("#type").value,minutes:m,detail:$("#detail").value});save();modal.close()};
window.addBody=()=>{let v=$("#state").value.trim(),date=$("#recordDate").value;if(!v||!date)return;db.body.push({date,text:v});save();modal.close()};
window.backfillPill=()=>{let date=$("#recordDate").value,c=cycleFor(date);if(!date||!c.valid||!c.on){alert("该日期不属于优思明 21 天服药期。");return}if(!db.pills.some(x=>(typeof x==="string"?x:x.date)===date))db.pills.push({date,backfilled:true});save();modal.close()};
$("#pillBtn").onclick=()=>{let t=localDate(),i=db.pills.findIndex(x=>(typeof x==="string"?x:x.date)===t);if(i>=0)db.pills.splice(i,1);else if(new Date()>=pillMoment())db.pills.push({date:t,time:new Date().toISOString()});save()};
$("#exportBtn").onclick=()=>{let blob=new Blob([JSON.stringify(db,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`pcos90-backup-${localDate()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
$("#importBtn").onclick=()=>$("#importFile").click();$("#importFile").onchange=e=>{let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onload=()=>{let v=safeParse(r.result);if(!v||typeof v!=="object"){alert("备份文件无效");return}if(confirm("导入会与当前记录合并，不会主动删除现有记录。继续吗？")){db=merge(db,norm(v));save();alert("备份已导入")}};r.readAsText(f)};
render();tick();setInterval(tick,1000);