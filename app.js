const STORE="pcos90-data"; // 永久固定：后续版本不要改
const START="2026-09-23", ANALYSIS_HOUR=21;
const COLLECTIONS=["weights","foods","workouts","body","sleeps","pills","dailyAnalyses"];
const emptyDB=()=>({schema:5,settings:{startDate:START,startWeight:76.6,goalWeight:73},weights:[],foods:[],workouts:[],body:[],sleeps:[],pills:[],dailyAnalyses:[],deleted:[]});
const $=s=>document.querySelector(s), esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
function localDate(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function safeParse(x){try{return JSON.parse(x)}catch{return null}}
function norm(src){let d=emptyDB();if(!src||typeof src!=="object")return d;[...COLLECTIONS,"deleted"].forEach(k=>{if(Array.isArray(src[k]))d[k]=src[k]});if(src.settings&&typeof src.settings==="object")d.settings={...d.settings,...src.settings};return d}
function stable(v){if(v==null)return"";if(typeof v!=="object")return String(v);if(Array.isArray(v))return v.map(stable).join("|");return Object.keys(v).sort().filter(k=>k!=="id"&&k!=="analysis").map(k=>`${k}:${stable(v[k])}`).join("|")}
function recordFingerprint(x,type){
 if(typeof x==="string")return `${type}|${x}`;
 const fields={food:["date","time","meal","items","note"],workout:["date","time","type","minutes","detail","note"],weight:["date","time","value"],body:["date","time","text","note"],sleep:["date","hours","minutes"]}[type];
 return `${type}|${(fields||Object.keys(x||{}).sort()).map(k=>stable(x?.[k])).join("|")}`
}
function legacyFingerprint(x,type){return typeof x==="string"?`${type}|${x}`:`${type}|${x?.date||""}|${x?.time||""}|${x?.meal||""}|${x?.items||x?.value||x?.type||x?.text||""}|${x?.note||""}`}
function recordFingerprints(x,type){return [...new Set([recordFingerprint(x,type),legacyFingerprint(x,type)])]}
function isDeleted(dead,x,type){return recordFingerprints(x,type).some(fp=>dead.has(fp))}
function typeForCollection(k){return({foods:"food",workouts:"workout",weights:"weight",body:"body",sleeps:"sleep"})[k]||k}
function merge(a,b){
 let d=norm(a),incoming=norm(b),dead=new Set([...(d.deleted||[]),...(incoming.deleted||[])]);d.deleted=[...dead];
 COLLECTIONS.forEach(k=>{if(k==="dailyAnalyses"){incoming[k].forEach(x=>{let i=d[k].findIndex(y=>y.date===x.date);if(i<0)d[k].push(x)});return}let type=typeForCollection(k),seen=new Set(d[k].map(x=>recordFingerprint(x,type)));incoming[k].forEach(x=>{let fp=recordFingerprint(x,type);if(!isDeleted(dead,x,type)&&!seen.has(fp)){d[k].push(x);seen.add(fp)}});d[k]=d[k].filter(x=>!isDeleted(dead,x,type))});
 if(b&&b.settings&&typeof b.settings==="object")d.settings={...d.settings,...b.settings};return d
}
function migrate(){
 const MIGRATION_FLAG="pcos90-legacy-migration-complete";
 let current=safeParse(localStorage.getItem(STORE));
 // Once migration has completed, the permanent store is the only automatic source of truth.
 if(localStorage.getItem(MIGRATION_FLAG)==="1"){
   let d=merge(emptyDB(),norm(current));
   localStorage.setItem(STORE,JSON.stringify(d));
   return {d,found:[],alreadyDone:true};
 }
 let d=norm(current), found=[];
 const known=["pcos90-v12","pcos90-v11","pcos90-v1.1","pcos90-v1","pcos90","pcos-90-days","pcos90-data-v1"];
 known.forEach(k=>{let v=safeParse(localStorage.getItem(k));if(v){d=merge(d,norm(v));found.push(k)}});
 // One-time rescue scan for clearly related old project keys.
 for(let i=0;i<localStorage.length;i++){
   let k=localStorage.key(i)||"";
   if(k===STORE||k===MIGRATION_FLAG||known.includes(k))continue;
   if(/pcos.*90|90.*pcos/i.test(k)){
     let v=safeParse(localStorage.getItem(k));
     if(v&&typeof v==="object"&&(v.weights||v.foods||v.workouts||v.body||v.sleeps)){
       d=merge(d,norm(v));found.push(k)
     }
   }
 }
 localStorage.setItem(STORE,JSON.stringify(d));
 // Keep old keys as a passive safety copy, but never auto-import them again.
 localStorage.setItem(MIGRATION_FLAG,"1");
 return {d,found:[...new Set(found)],alreadyDone:false}
}
let migrated=migrate(), db=migrated.d;
function save(){db=norm(db);db.schema=5;localStorage.setItem(STORE,JSON.stringify(db));render()}
function startMoment(){let [y,m,d]=(db.settings.startDate||START).split("-").map(Number);return new Date(y,m-1,d)}
function dayFor(dateStr){let [y,m,d]=dateStr.split("-").map(Number);return Math.floor((new Date(y,m-1,d)-startMoment())/86400000)+1}
function analysisMoment(n=new Date()){return new Date(n.getFullYear(),n.getMonth(),n.getDate(),ANALYSIS_HOUR,0,0)}
function tick(){
 let n=new Date(),pad=x=>String(x).padStart(2,"0"),wd=["日","一","二","三","四","五","六"],open=n>=startMoment();
 $("#clock").textContent=`${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`;$("#dateText").textContent=`${n.getFullYear()}年${n.getMonth()+1}月${n.getDate()}日 · 星期${wd[n.getDay()]} · 当前设备`;
 $("#planState").textContent=open?"90天计划进行中":"打卡尚未开放";$("#planCountdown").textContent=open?`Day ${Math.max(1,dayFor(localDate(n)))}`:"等待开始";
 document.querySelectorAll("[data-add]").forEach(b=>b.classList.toggle("disabled",!open));updateAnalysisGate(n)
}
function countdown(sec){sec=Math.max(0,Math.floor(sec));return `${String(Math.floor(sec/3600)).padStart(2,"0")}:${String(Math.floor(sec%3600/60)).padStart(2,"0")}:${String(sec%60).padStart(2,"0")}`}
function updateAnalysisGate(n=new Date()){
 let btn=$("#analysisBtn"),out=$("#analysisCountdown"),can=n>=analysisMoment(n)&&n>=startMoment(),done=db.dailyAnalyses.some(x=>x.date===localDate(n));
 btn.disabled=!can;btn.textContent=can?(done?"↻ 重新分析":"✨ 今日分析"):"今日分析 · 21:00 后开放";
 out.textContent=can?"根据今天已经记录的数据生成；缺少的项目会显示“今日未记录”。":`今日分析将在 ${countdown((analysisMoment(n)-n)/1000)} 后开放`;
}
// kcal 以常见份量/每单位估算；品牌餐品没有可靠官方值时只给区间
const FOODS=[
 {n:["水煮蛋","煮鸡蛋","白煮蛋","鸡蛋"],u:"piece",k:[70,85],msg:"提供优质蛋白质"},
 {n:["拿铁咖啡","热拿铁咖啡","冰拿铁咖啡","拿铁","热拿铁","冰拿铁"],u:"ml",base:280,k:[120,190],msg:"按普通牛奶、未额外加糖估算；奶种和糖浆会明显影响热量"},
 {n:["全脂牛奶"],u:"ml",base:250,k:[150,175],msg:"提供蛋白质和钙"},
 {n:["低脂牛奶"],u:"ml",base:250,k:[105,135],msg:"提供蛋白质和钙"},
 {n:["牛肉刀削面","刀削面"],u:"bowl",k:[550,850],msg:"一碗通常同时包含较多主食；牛肉提供蛋白质"},
 {n:["牛肉面"],u:"bowl",k:[500,800],msg:"主食占比较高，牛肉提供蛋白质"},
 {n:["鲜肉皮蛋馄饨","皮蛋鲜肉馄饨"],u:"wonton",k:[38,52],msg:"按常见鲜肉皮蛋馄饨单个估算；实际大小和肉馅比例会影响结果"},
 {n:["鲜肉馄饨"],u:"wonton",k:[35,50],msg:"按常见鲜肉馄饨单个估算；大小和肉馅比例会影响结果"},
 {n:["馄饨","云吞"],u:"wonton",k:[35,50],msg:"按常见馄饨单个估算；未写数量时默认约10个"},
 {n:["电烤鸡心","烤鸡心","鸡心串"],u:"skewer",k:[110,160],msg:"按常见一串鸡心估算；颗数、刷油和调味会影响结果"},
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
function cnNum(s){
 const map={"一":1,"二":2,"两":2,"三":3,"四":4,"五":5,"六":6,"七":7,"八":8,"九":9,"十":10,"半":0.5};
 if(s in map)return map[s];
 if(/^十[一二三四五六七八九]$/.test(s))return 10+map[s[1]];
 if(/^[一二三四五六七八九]十$/.test(s))return map[s[0]]*10;
 if(/^[一二三四五六七八九]十[一二三四五六七八九]$/.test(s))return map[s[0]]*10+map[s[2]];
 return Number(s);
}
function numberNear(text,name,u){
 let i=text.indexOf(name), seg=text.slice(Math.max(0,i-8),i+name.length+28), m;
 // Metric amounts may be before or after the food name.
 if(u==="ml"){
   m=seg.match(/(\d+(?:\.\d+)?)\s*(?:ml|毫升)/i);
   return m?+m[1]:null;
 }
 if(u==="g"){
   m=seg.match(/(\d+(?:\.\d+)?)\s*(?:g|克)/i);
   return m?+m[1]:null;
 }
 if(u==="wonton"){
   m=seg.match(/(\d+(?:\.\d+)?)\s*(?:个|只|颗|枚)/); if(m)return +m[1];
   m=seg.match(/(半|一|二|两|三|四|五|六|七|八|九|十|十一|十二|十三|十四|十五|十六|十七|十八|十九|二十)\s*(?:个|只|颗|枚)/); return m?cnNum(m[1]):10;
 }
 if(u==="skewer"){
   m=seg.match(/[×xX*]\s*(\d+(?:\.\d+)?)/); if(m)return +m[1];
   m=seg.match(/(\d+(?:\.\d+)?)\s*串/); if(m)return +m[1];
   m=seg.match(/(半|一|二|两|三|四|五|六|七|八|九|十)\s*串/); return m?cnNum(m[1]):1;
 }
 // 1个 / x1 / 一杯 / 两块 etc.
 m=seg.match(/[×xX*]\s*(\d+(?:\.\d+)?)/);
 if(m)return +m[1];
 m=seg.match(/(\d+(?:\.\d+)?)\s*(?:个|只|块|片|碗|杯|根|份|枚)/);
 if(m)return +m[1];
 m=seg.match(/(半|一|二|两|三|四|五|六|七|八|九|十|十一|十二|十三|十四|十五|十六|十七|十八|十九|二十)\s*(?:个|只|块|片|碗|杯|根|份|枚)/);
 if(m)return cnNum(m[1]);
 // Natural shorthand such as “水煮蛋1 拿铁...” or “鸡蛋2”
 let after=text.slice(i+name.length,i+name.length+8);
 m=after.match(/^(\d+(?:\.\d+)?)(?!\s*(?:ml|毫升|g|克))/i);
 if(m)return +m[1];
 return 1;
}
function analyze(text,note=""){
 let all=(text+" "+note)
 .replace(/毫升/gi,"ml")
 .replace(/克/gi,"g")
 .replace(/[，、；;+＋]/g," ")
 .replace(/咖啡拿铁/g,"拿铁咖啡")
 .replace(/拿铁咖啡热/g,"热拿铁咖啡")
 .replace(/拿铁咖啡冰/g,"冰拿铁咖啡")
 .replace(/\s+/g,""),lo=0,hi=0,msg=[],veg=false,matched=0;
 let used=[];
 FOODS.forEach(f=>{let names=[...f.n].sort((a,b)=>b.length-a.length), name=names.find(n=>all.includes(n));if(!name)return;let idx=all.indexOf(name);
 if(used.some(r=>idx>=r[0]&&idx<r[1]))return;
 let around=all.slice(Math.max(0,idx-10),idx+name.length+20);if(/没喝|未喝|没吃|未吃|没动/.test(around))return;
 let q=numberNear(all,name,f.u);if(f.base&&q)q=q/f.base;else if(f.base&&!q)q=1;else q=q||1;
 // “只吃3个”优先
 let only=around.match(/只(?:吃|喝)(?:了)?(\d+(?:\.\d+)?)/);if(only&&(f.u==="piece"||f.u==="serving"))q=+only[1];
 // “剩1/4” -> 吃了3/4
 let left=around.match(/剩(?:了)?(\d+)\s*\/\s*(\d+)/);if(left&&+left[2]>0)q*=Math.max(0,1-(+left[1]/+left[2]));
 lo+=f.k[0]*q;hi+=f.k[1]*q;msg.push(f.msg);veg=veg||!!f.veg;matched++;used.push([idx,idx+name.length])});
 if(!matched)return {kcal:"暂无法估算",text:"本地食物库暂未识别到足够信息。请写清食物名称、数量和烹饪方式。"};
 let advice=veg?"；整体继续按实际份量记录即可。":"；这顿如果没有另外吃蔬菜/水果，膳食纤维可能偏少，下一餐正常补一份蔬菜即可，不需要少吃一顿补偿。";
 return {kcal:`约 ${Math.max(0,Math.round(lo/10)*10)}–${Math.max(0,Math.round(hi/10)*10)} kcal · 估算`,text:[...new Set(msg)].slice(0,3).join("；")+advice}
}

function foodKcalRange(x){
 let min=Number(x?.manualMinKcal),max=Number(x?.manualMaxKcal),hasMin=x?.manualMinKcal!==""&&x?.manualMinKcal!=null&&Number.isFinite(min),hasMax=x?.manualMaxKcal!==""&&x?.manualMaxKcal!=null&&Number.isFinite(max);
 if(hasMin||hasMax){if(!hasMin)min=max;if(!hasMax)max=min;return {min:Math.min(min,max),max:Math.max(min,max),manual:true}}
 let m=x?.analysis?.kcal?.match(/(\d+(?:\.\d+)?)\D+(\d+(?:\.\d+)?)\s*kcal/i);if(m)return {min:+m[1],max:+m[2],manual:false};
 m=x?.analysis?.kcal?.match(/(\d+(?:\.\d+)?)\s*kcal/i);return m?{min:+m[1],max:+m[1],manual:false}:null
}
function foodEstimateLabel(x){let r=foodKcalRange(x);if(!r)return x?.analysis?.kcal||"暂无法估算";let amount=r.min===r.max?`${r.min}`:`${r.min}–${r.max}`,source=r.manual?(x.estimateSource||"手动输入"):"估算";return `约 ${amount} kcal · ${source}`}
function foodAnalysisText(x){if(x.manualAnalysis)return x.manualAnalysis;return x.analysis?.text||"本地食物库暂未识别到足够信息。"}

function recordKey(x,type,index){return x.id||`${recordFingerprint(x,type)}|${index}`}
function deleteRecord(type,key){
 const label={food:"饮食记录",workout:"运动记录",weight:"体重记录",body:"身体状态记录",sleep:"睡眠记录"}[type]||"记录";
 const arr={food:"foods",workout:"workouts",weight:"weights",body:"body",sleep:"sleeps"}[type];
 const target=db[arr].find((x,i)=>recordKey(x,type,i)===key); if(!target)return;
 if(!confirm(`确定永久删除这条${label}吗？\n\n删除后不会从旧版本数据中自动恢复。`))return;
 const fp=recordFingerprint(target,type); db.deleted=db.deleted||[];recordFingerprints(target,type).forEach(mark=>{if(!db.deleted.includes(mark))db.deleted.push(mark)});
 db[arr]=db[arr].filter(x=>recordFingerprint(x,type)!==fp); save();
}
function bindLongPress(){
 document.querySelectorAll("[data-delete-type][data-delete-key]").forEach(el=>{
   let timer=null, moved=false;
   const start=e=>{
     moved=false;
     timer=setTimeout(()=>{
       timer=null;
       if(navigator.vibrate) navigator.vibrate(35);
       deleteRecord(el.dataset.deleteType,el.dataset.deleteKey);
     },650);
   };
   const cancel=()=>{if(timer){clearTimeout(timer);timer=null}};
   el.addEventListener("touchstart",start,{passive:true});
   el.addEventListener("touchmove",()=>{moved=true;cancel()},{passive:true});
   el.addEventListener("touchend",cancel,{passive:true});
   el.addEventListener("touchcancel",cancel,{passive:true});
   el.addEventListener("mousedown",start);
   el.addEventListener("mouseup",cancel);
   el.addEventListener("mouseleave",cancel);
   el.addEventListener("contextmenu",e=>{e.preventDefault();cancel();deleteRecord(el.dataset.deleteType,el.dataset.deleteKey)});
 });
}
function bindFoodEdit(){document.querySelectorAll("[data-edit-food]").forEach(btn=>btn.onclick=e=>{e.stopPropagation();let key=btn.dataset.editFood,record=db.foods.find((x,i)=>recordKey(x,"food",i)===key);if(record)open("food",record.date,{record,key})})}

function activeFor(k,type,date){let dead=new Set(db.deleted||[]);return db[k].filter(x=>(!date||x.date===date)&&!isDeleted(dead,x,type))}
function sleepParts(s){let total=Number.isFinite(+s?.durationMinutes)?+s.durationMinutes:(+s?.hours||0)*60+(+s?.minutes||0);return {total,hours:Math.floor(total/60),minutes:total%60}}
function shiftDate(dateStr,days){let [y,m,d]=dateStr.split("-").map(Number),x=new Date(y,m-1,d);x.setDate(x.getDate()+days);return localDate(x)}
function renderHistory(date=$("#historyDate")?.value){
 let box=$("#historyRecords");if(!box||!date)return;let foods=activeFor("foods","food",date),workouts=activeFor("workouts","workout",date),weights=activeFor("weights","weight",date),sleeps=activeFor("sleeps","sleep",date),bodies=activeFor("body","body",date),daily=db.dailyAnalyses.find(x=>x.date===date),groups=[];
 if(foods.length)groups.push(`<div class="historyGroup"><b>🍽️ 饮食 · ${foods.length} 餐</b>${foods.map(x=>`<div class="historyItem"><span>${esc(x.meal||"饮食")} · ${esc(x.time||"")}</span><p>${esc(x.items||"")}</p><small>${esc(foodEstimateLabel(x))}</small></div>`).join("")}</div>`);
 if(workouts.length)groups.push(`<div class="historyGroup"><b>🏃 运动 · ${workouts.reduce((a,x)=>a+(+x.minutes||0),0)} min</b>${workouts.map(x=>`<div class="historyItem"><span>${esc(x.type||"运动")} · ${esc(x.minutes||0)} min</span>${x.detail?`<p>${esc(x.detail)}</p>`:""}</div>`).join("")}</div>`);
 if(sleeps.length)groups.push(`<div class="historyGroup"><b>😴 睡眠</b>${sleeps.map(x=>{let t=sleepParts(x);return `<div class="historyItem"><span>${t.hours} 小时 ${t.minutes} 分钟</span>${x.note?`<p>${esc(x.note)}</p>`:""}</div>`}).join("")}</div>`);
 if(weights.length)groups.push(`<div class="historyGroup"><b>⚖️ 体重</b>${weights.map(x=>`<div class="historyItem"><span>${esc(x.value)} kg</span></div>`).join("")}</div>`);
 if(bodies.length)groups.push(`<div class="historyGroup"><b>🙂 身体状态</b>${bodies.map(x=>`<div class="historyItem"><p>${esc(x.text||"")}</p></div>`).join("")}</div>`);
 if(daily)groups.push(`<div class="historyGroup historyAnalysis"><b>✨ 当日分析</b>${daily.parts.map(p=>`<div class="historyItem"><span>${esc(p.title)}</span><p>${esc(p.text)}</p></div>`).join("")}</div>`);
 box.className=groups.length?"historyList":"empty";box.innerHTML=groups.length?groups.join(""):`${esc(date)} 没有记录`;
}
function generateDailyAnalysis(date=localDate()){
 let foods=activeFor("foods","food",date),workouts=activeFor("workouts","workout",date),weights=activeFor("weights","weight",date),sleeps=activeFor("sleeps","sleep",date),bodies=activeFor("body","body",date),parts=[],sleep=sleeps.length?sleepParts(sleeps[sleeps.length-1]):null,workoutMins=workouts.reduce((a,x)=>a+(+x.minutes||0),0),weight=weights[weights.length-1];
 parts.push({title:"✨ 今日概览",text:`饮食：${foods.length?`${foods.length} 餐`:"未记录"} · 睡眠：${sleep?`${sleep.hours}h ${sleep.minutes}m`:"未记录"} · 运动：${workouts.length?`${workoutMins} min`:"未记录"} · 体重：${weight?`${weight.value} kg`:"未记录"} · 身体状态：${bodies.length?`${bodies.length} 条`:"未记录"}`});
 if(foods.length){let ranges=foods.map(foodKcalRange).filter(Boolean),lo=ranges.reduce((a,r)=>a+r.min,0),hi=ranges.reduce((a,r)=>a+r.max,0),rangeText=Math.round(lo)===Math.round(hi)?`${Math.round(lo)}`:`${Math.round(lo)}–${Math.round(hi)}`,names=foods.map(x=>x.items).join("、"),manualContext=foods.map(x=>x.manualAnalysis||"").join(" "),context=`${names} ${manualContext}`,meals=[...new Set(foods.map(x=>x.meal).filter(Boolean))].join("、"),protein=/鸡蛋|蛋|鸡|牛|肉|鱼|虾|豆腐|牛奶|拿铁|馄饨|云吞|蛋白质/.test(context),veg=/蔬菜|青菜|芹菜|西兰花|菠菜|生菜|水果|苹果|橙|香蕉|膳食纤维/.test(context),carb=/米饭|面|馄饨|云吞|饭|薯|汉堡|卷|披萨|主食|碳水/.test(context),rich=/炸|咖喱|奶茶|薯条|可乐|高油|高糖/.test(context),unknown=foods.length-ranges.length;parts.push({title:"🍽️ 饮食结构",text:`今日记录：${names}。${ranges.length?`可估算部分合计约 ${rangeText} kcal。`:"今天记录的食物暂无法估算热量。"}${unknown?` 另有 ${unknown} 餐暂无法估算。`:""}${meals?` 已记录餐次：${meals}。`:""}${protein?" 有蛋白质来源。":" 蛋白质来源暂未明确。"}${veg?" 已记录蔬菜或水果。":" 蔬菜和膳食纤维记录偏少，下一餐可正常增加一份蔬菜。"}${carb?" 已包含主食或碳水来源。":" 主食记录暂未明确。"}${rich?" 今天也有油脂或糖分较集中的食物，后续正常吃，可优先安排蔬菜和蛋白质，主食按饥饿程度调整。":""}${manualContext?" 手动补充的饮食信息已纳入结构判断。":""}`})}else parts.push({title:"🍽️ 饮食结构",text:"今天暂未记录饮食。"});
 if(workouts.length){let mins=workouts.reduce((a,x)=>a+(+x.minutes||0),0),types=[...new Set(workouts.map(x=>x.type||"运动"))].join("、"),details=workouts.map(x=>x.detail).filter(Boolean).join("；");parts.push({title:"🏃 运动",text:`今日完成约 ${mins} 分钟运动，类型：${types}。${details?` ${details}`:""}`})}else parts.push({title:"🏃 运动",text:"今日未记录。"});
 if(weights.length){let current=weights[weights.length-1],previous=activeFor("weights","weight").filter(x=>x.date<date).sort((a,b)=>String(b.date).localeCompare(String(a.date)))[0],delta=previous?(+current.value-+previous.value):null;parts.push({title:"⚖️ 体重",text:`今日 ${current.value} kg。${previous?`较上一次记录变化 ${delta>=0?"+":""}${delta.toFixed(2)} kg。`:"暂无更早记录可比较。"} 单日体重会受到水分、饮食和排便等影响，更适合观察一段时间趋势。`})}else parts.push({title:"⚖️ 体重",text:"今日未记录。"});
 if(sleep){let level=sleep.total>=420?"时长基本充足":sleep.total>=360?"接近常见充足时长，可以继续观察自己的精神状态":"时长偏短，今晚可以尽量给休息留出更完整的时间";parts.push({title:"😴 睡眠",text:`今天记录睡眠 ${sleep.hours} 小时 ${sleep.minutes} 分钟，${level}。`})}else parts.push({title:"😴 睡眠",text:"今天暂未记录睡眠。"});
 if(bodies.length){parts.push({title:"🙂 身体状态",text:`今天记录：${bodies.map(x=>x.text).filter(Boolean).join("；")}。这只是当天主观状态摘要，不用于医学诊断。`})}else parts.push({title:"🙂 身体状态",text:"今天暂未记录身体状态。"});
 let result={date,generatedAt:new Date().toISOString(),parts},i=db.dailyAnalyses.findIndex(x=>x.date===date);if(i>=0)db.dailyAnalyses[i]=result;else db.dailyAnalyses.push(result);save()
}

function render(){
 let d=Math.max(1,dayFor(localDate())),w=Math.ceil(d/7);$("#dayTitle").textContent=`Week ${w} · Day ${d}`;$("#startW").textContent=db.settings.startWeight;$("#goalW").textContent=db.settings.goalWeight;
 let fs=activeFor("foods","food",localDate()),ws=activeFor("workouts","workout",localDate()),ss=activeFor("sleeps","sleep",localDate()),bs=activeFor("body","body",localDate()),ww=[...activeFor("weights","weight",localDate())].reverse()[0],todaySleep=ss.length?sleepParts(ss[ss.length-1]):null;
 $("#foodMini").textContent=`${fs.length} 餐`;$("#workoutMini").textContent=ws.length?`${ws.reduce((a,x)=>a+(+x.minutes||0),0)} min`:"未记录";$("#weightMini").textContent=ww?`${ww.value} kg`:"记录";$("#sleepMini").textContent=todaySleep?`${todaySleep.hours}h ${todaySleep.minutes}m`:"未记录";
 $("#foods").innerHTML=fs.length?fs.map(x=>{let key=recordKey(x,"food",db.foods.indexOf(x));return `<div class="entry deletable" data-delete-type="food" data-delete-key="${esc(key)}"><div class="entryTop"><b>${esc(x.meal||"饮食")}</b><span>${esc(x.time||"")}</span></div><p>${esc(x.items||"")}</p>${x.note?`<span class="tag">${esc(x.note)}</span>`:""}<div class="analysis${foodKcalRange(x)?.manual?" manualAnalysis":""}"><b>${esc(foodEstimateLabel(x))}</b><p>${esc(foodAnalysisText(x))}</p></div><div class="entryActions"><button type="button" data-edit-food="${esc(key)}">✎ 编辑</button></div><small class="holdHint">长按空白处可删除</small></div>`}).join(""):"今天还没有饮食记录";
 $("#workouts").innerHTML=ws.length?ws.map(x=>`<div class="entry deletable" data-delete-type="workout" data-delete-key="${esc(recordKey(x,"workout",db.workouts.indexOf(x)))}"><div class="entryTop"><b>${esc(x.type||"运动")}</b><span>${esc(x.minutes||"")} min</span></div><p>${esc(x.detail||"")}</p><small class="holdHint">长按可删除</small></div>`).join(""):"今天还没有运动记录";
 $("#sleeps").innerHTML=ss.length?ss.map(x=>{let t=sleepParts(x);return `<div class="entry deletable" data-delete-type="sleep" data-delete-key="${esc(recordKey(x,"sleep",db.sleeps.indexOf(x)))}"><div class="entryTop"><b>${esc(t.hours)} 小时 ${esc(t.minutes)} 分钟</b><span>${esc(x.date)}</span></div>${x.note?`<p>${esc(x.note)}</p>`:""}<small class="holdHint">长按可删除</small></div>`}).join(""):"今天还没有睡眠记录";
 $("#bodyStates").innerHTML=bs.length?bs.map(x=>`<div class="entry deletable" data-delete-type="body" data-delete-key="${esc(recordKey(x,"body",db.body.indexOf(x)))}"><div class="entryTop"><b>身体状态</b><span>${esc(x.time||"")}</span></div><p>${esc(x.text||"")}</p><small class="holdHint">长按可删除</small></div>`).join(""):"今天还没有身体状态记录";
 let weights=[...activeFor("weights","weight")].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,10);$("#weights").innerHTML=weights.length?weights.map(x=>`<div class="entry deletable" data-delete-type="weight" data-delete-key="${esc(recordKey(x,"weight",db.weights.indexOf(x)))}"><div class="entryTop"><b>${esc(x.value)} kg</b><span>${esc(x.date)}</span></div><small class="holdHint">长按可删除</small></div>`).join(""):"还没有体重记录";
 let daily=db.dailyAnalyses.find(x=>x.date===localDate());$("#dailyAnalysis").className=daily?"dailyResult":"empty";$("#dailyAnalysis").innerHTML=daily?daily.parts.map(p=>`<div class="dailyPart"><b>${esc(p.title)}</b><p>${esc(p.text)}</p></div>`).join(""):"今天还没有生成分析";
 bindLongPress();bindFoodEdit();$("#migrationNote").textContent=migrated.found.length
 ? `旧版数据已完成一次性迁移：${migrated.found.join("、")}。以后不会自动重新导入旧记录。`
 : (migrated.alreadyDone
   ? "旧版迁移已完成。现在只使用 pcos90-data；删除的记录不会再被旧版本自动恢复。"
   : "未发现可迁移的旧数据。现在固定使用 pcos90-data。");
 renderHistory();updateAnalysisGate()
}
const modal=$("#modal");$("#close").onclick=()=>modal.close();
function dateField(v=localDate()){return `<div class="field"><label>日期</label><input id="recordDate" type="date" value="${v}" min="${db.settings.startDate}" max="${localDate()}"></div>`}
function foodForm(x={},date=localDate(),editKey=""){
 let meals=["早餐","午餐","晚餐","加餐"],sources=["ChatGPT估算","包装营养表","餐厅官方数据","其他手动输入"],hasManual=x.manualMinKcal!==""&&x.manualMinKcal!=null||x.manualMaxKcal!==""&&x.manualMaxKcal!=null||x.manualAnalysis||x.estimateSource;
 return `${dateField(date)}<input id="editFoodKey" type="hidden" value="${esc(editKey)}"><div class="field"><label>餐次</label><select id="meal">${meals.map(m=>`<option${(x.meal||"午餐")===m?" selected":""}>${m}</option>`).join("")}</select></div><div class="field"><label>实际吃了什么</label><textarea id="items" placeholder="例：水煮蛋1个、热拿铁280ml">${esc(x.items||"")}</textarea></div><div class="field"><label>备注</label><input id="note" value="${esc(x.note||"")}" placeholder="例：可乐没喝 / 面剩1/4 / 只吃3个"></div><details class="manualBox"${hasManual?" open":""}><summary>✎ 手动填写热量 / 分析</summary><div class="manualGrid"><div class="field"><label>最低热量 kcal</label><input id="manualMinKcal" type="number" min="0" step="1" inputmode="decimal" value="${esc(x.manualMinKcal??"")}" placeholder="例：650"></div><div class="field"><label>最高热量 kcal</label><input id="manualMaxKcal" type="number" min="0" step="1" inputmode="decimal" value="${esc(x.manualMaxKcal??"")}" placeholder="例：900"></div></div><div class="field"><label>估算来源</label><select id="estimateSource">${sources.map(s=>`<option${(x.estimateSource||"ChatGPT估算")===s?" selected":""}>${s}</option>`).join("")}</select></div><div class="field"><label>手动饮食分析 / 备注</label><textarea id="manualAnalysis" placeholder="例：蛋白质来源较丰富，蔬菜量适中">${esc(x.manualAnalysis||"")}</textarea></div></details><div class="note">未填写手动热量时，继续使用网页本地食物库估算；填写后以手动数据优先。</div><button class="save" onclick="addFood()">${editKey?"保存修改":"保存并分析"}</button>`
}
function open(k,date=localDate(),editing=null){
 $("#modalTitle").textContent={food:"记录饮食",weight:"记录体重",workout:"记录运动",sleep:"记录睡眠",body:"身体状态"}[k]||"记录";let b=$("#modalBody");
 if(k==="food")b.innerHTML=foodForm(editing?.record||{},date,editing?.key||"");
 if(k==="weight")b.innerHTML=`${dateField(date)}<div class="field"><label>体重 kg</label><input id="val" type="number" step=".05" inputmode="decimal"></div><button class="save" onclick="addWeight()">保存</button>`;
 if(k==="workout")b.innerHTML=`${dateField(date)}<div class="field"><label>类型</label><select id="type"><option>跑步机爬坡</option><option>力量 · Full Body</option><option>步行</option><option>其他</option></select></div><div class="field"><label>分钟</label><input id="mins" type="number"></div><div class="field"><label>详情</label><textarea id="detail" placeholder="坡度9–10，速度3.5 km/h…"></textarea></div><button class="save" onclick="addWorkout()">保存</button>`;
 if(k==="sleep")b.innerHTML=`${dateField(date)}<div class="durationFields"><div class="field"><label>小时</label><input id="sleepHours" type="number" min="0" max="24" step="1" inputmode="numeric" value="7"></div><div class="field"><label>分钟（0–59）</label><input id="sleepMinutes" type="number" min="0" max="59" step="1" inputmode="numeric" value="0"></div></div><div class="field"><label>备注（可选）</label><input id="sleepNote" placeholder="例：夜间醒来一次"></div><button class="save" onclick="addSleep()">保存</button>`;
 if(k==="body")b.innerHTML=`${dateField(date)}<div class="field"><label>状态</label><textarea id="state" placeholder="例：点滴出血、头痛、便秘、腿部酸痛…"></textarea></div><button class="save" onclick="addBody()">保存</button>`;
 modal.showModal()
}
function openBackfill(){
 $("#modalTitle").textContent="补记历史记录";$("#modalBody").innerHTML=`<div class="note">选择要补记的内容。下一步可选择过去日期。</div><div class="picker"><button onclick="open('weight')">⚖️ 体重</button><button onclick="open('food')">🍽️ 饮食</button><button onclick="open('workout')">🏃 运动</button><button onclick="open('sleep')">😴 睡眠</button><button onclick="open('body')">🙂 身体状态</button></div>`;modal.showModal()
}
document.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>open(b.dataset.add));$("#backfillBtn").onclick=openBackfill;$("#navPlus").onclick=openBackfill;
window.open=open;
function addActive(k,type,x){let marks=new Set(recordFingerprints(x,type));db.deleted=(db.deleted||[]).filter(v=>!marks.has(v));db[k].push(x)}
window.addFood=()=>{let items=$("#items").value.trim(),note=$("#note").value.trim(),date=$("#recordDate").value,editKey=$("#editFoodKey").value,minRaw=$("#manualMinKcal").value.trim(),maxRaw=$("#manualMaxKcal").value.trim(),manualAnalysis=$("#manualAnalysis").value.trim(),estimateSource=$("#estimateSource").value;if(!items||!date)return;let min=minRaw===""?null:+minRaw,max=maxRaw===""?null:+maxRaw;if((min!==null&&(!Number.isFinite(min)||min<0))||(max!==null&&(!Number.isFinite(max)||max<0))){alert("手动热量必须是大于或等于 0 的数字。");return}if(min!==null&&max!==null&&min>max){alert("最低热量不能高于最高热量。");return}let i=editKey?db.foods.findIndex((x,n)=>recordKey(x,"food",n)===editKey):-1,old=i>=0?db.foods[i]:null,manualProvided=min!==null||max!==null||!!manualAnalysis,next={...(old||{}),id:old?.id||"food-"+Date.now()+"-"+Math.random().toString(36).slice(2),date,meal:$("#meal").value,items,note,time:old&&old.date===date?old.time:(date===localDate()?new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"}):"补记"),analysis:analyze(items,note),manualMinKcal:min,manualMaxKcal:max,manualAnalysis,estimateSource:manualProvided?estimateSource:""};if(i>=0){let marks=new Set(recordFingerprints(next,"food"));db.deleted=(db.deleted||[]).filter(v=>!marks.has(v));db.foods[i]=next}else addActive("foods","food",next);save();modal.close()};
window.addWeight=()=>{let v=+$("#val").value,date=$("#recordDate").value;if(!v||!date)return;db.weights=db.weights.filter(x=>x.date!==date);addActive("weights","weight",{date,value:v});save();modal.close()};
window.addWorkout=()=>{let m=+$("#mins").value,date=$("#recordDate").value;if(!m||!date)return;addActive("workouts","workout",{id:"workout-"+Date.now()+"-"+Math.random().toString(36).slice(2),date,type:$("#type").value,minutes:m,detail:$("#detail").value});save();modal.close()};
window.addSleep=()=>{let h=+$("#sleepHours").value,m=+$("#sleepMinutes").value,date=$("#recordDate").value,note=$("#sleepNote").value.trim();if(!date||!Number.isInteger(h)||!Number.isInteger(m)||h<0||h>24||m<0||m>59||(h===24&&m>0)){alert("请输入有效睡眠时间，分钟需为 0–59。");return}db.sleeps=db.sleeps.filter(x=>x.date!==date);addActive("sleeps","sleep",{id:"sleep-"+Date.now()+"-"+Math.random().toString(36).slice(2),date,durationMinutes:h*60+m,hours:h,minutes:m,note});save();modal.close()};
window.addBody=()=>{let v=$("#state").value.trim(),date=$("#recordDate").value;if(!v||!date)return;addActive("body","body",{id:"body-"+Date.now()+"-"+Math.random().toString(36).slice(2),date,time:date===localDate()?new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"}):"补记",text:v});save();modal.close()};
$("#analysisBtn").onclick=()=>{if(new Date()>=analysisMoment())generateDailyAnalysis()};
$("#exportBtn").onclick=()=>{let blob=new Blob([JSON.stringify(db,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`pcos90-backup-${localDate()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
$("#importBtn").onclick=()=>$("#importFile").click();$("#importFile").onchange=e=>{let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onload=()=>{let v=safeParse(r.result);if(!v||typeof v!=="object"){alert("备份文件无效");return}if(confirm("导入会与当前记录合并，不会主动删除现有记录。继续吗？")){db=merge(db,v);save();alert("备份已导入")}};r.readAsText(f)};
let historyInput=$("#historyDate"),yesterday=shiftDate(localDate(),-1);historyInput.min=db.settings.startDate;historyInput.max=localDate();historyInput.value=yesterday>=db.settings.startDate?yesterday:localDate();historyInput.onchange=()=>renderHistory();$("#historyYesterday").onclick=()=>{historyInput.value=yesterday>=db.settings.startDate?yesterday:db.settings.startDate;renderHistory()};$("#historyToday").onclick=()=>{historyInput.value=localDate();renderHistory()};
render();tick();setInterval(tick,1000);
