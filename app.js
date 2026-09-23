const KEY="pcos90-v12",START="2026-09-23",PILL="22:00";
let db=JSON.parse(localStorage.getItem(KEY)||'{"weights":[],"foods":[],"workouts":[],"body":[],"pills":[]}');
const $=s=>document.querySelector(s), today=()=>{let d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}, esc=s=>String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
function save(){localStorage.setItem(KEY,JSON.stringify(db));render()}
function startMoment(){return new Date(2026,8,23,0,0,0)}
function pillMoment(){let n=new Date();return new Date(n.getFullYear(),n.getMonth(),n.getDate(),22,0,0)}
function dayNo(){return Math.max(1,Math.floor((new Date()-startMoment())/86400000)+1)}
function cycle(){let d=dayNo(),cd=(d-1)%28+1;return {n:Math.floor((d-1)/28)+1,cd,on:cd<=21}}
function tick(){
 let n=new Date(), pad=x=>String(x).padStart(2,"0"), wd=["日","一","二","三","四","五","六"];
 $("#clock").textContent=`${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`;
 $("#date").textContent=`${n.getFullYear()}年${n.getMonth()+1}月${n.getDate()}日 · 星期${wd[n.getDay()]} · 当前设备`;
 let open=n>=startMoment();$("#planState").textContent=open?"90天计划进行中":"打卡尚未开放";
 if(open)$("#planCountdown").textContent="Day "+dayNo(); else{let x=Math.floor((startMoment()-n)/1000),d=Math.floor(x/86400);x%=86400;$("#planCountdown").textContent=`${d?d+"天 ":""}${pad(Math.floor(x/3600))}:${pad(Math.floor(x%3600/60))}:${pad(x%60)}`}
 document.querySelectorAll("[data-add]").forEach(b=>b.classList.toggle("disabled",!open));
 updatePill(n);
}
function updatePill(n=new Date()){
 let c=cycle(),done=db.pills.includes(today()),btn=$("#pillBtn");
 $("#cycle").textContent=`优思明 · Cycle ${c.n}`;
 if(!c.on){btn.disabled=true;btn.classList.add("locked");btn.textContent="停药期";$("#pillStatus").textContent=`Break · Day ${c.cd-21}/7`;$("#pillHint").textContent="当前无需服药打卡";return}
 $("#pillStatus").textContent=`Day ${c.cd} · ${PILL}`;
 if(done){btn.disabled=false;btn.classList.remove("locked");btn.textContent="✓ 已打卡";$("#pillHint").textContent="再次点击可撤销误打卡";return}
 let can=n>=pillMoment()&&n>=startMoment();btn.disabled=!can;btn.classList.toggle("locked",!can);btn.textContent=can?"💊 打卡":"💊 22:00开放";
 if(can)$("#pillHint").textContent="现在可以打卡";else{let x=Math.max(0,Math.floor((pillMoment()-n)/1000)),p=x=>String(x).padStart(2,"0");$("#pillHint").textContent=`还有 ${p(Math.floor(x/3600))}:${p(Math.floor(x%3600/60))}:${p(x%60)}`}
}
const FOOD=[
 [["双层鸡堡","鸡堡","汉堡"],[480,650],"蛋白质不错，但通常油脂和精制碳水较高"],
 [["鸡块"],[40,60],"有蛋白质，但属于油炸食品","unit"],
 [["洋葱圈"],[35,55],"主要是油炸淀粉，蔬菜价值有限","unit"],
 [["米饭"],[150,260],"正常主食来源"],
 [["鸡蛋"],[70,90],"优质蛋白质来源","unit"],
 [["鸡胸","鸡肉"],[150,300],"蛋白质来源不错"],
 [["牛肉"],[180,350],"蛋白质和铁来源不错"],
 [["豆腐"],[100,220],"植物蛋白来源不错"],
 [["青菜","蔬菜","西兰花","菠菜","生菜"],[30,120],"补充了蔬菜和膳食纤维"],
 [["奶茶"],[300,550],"糖和能量通常较高"],
 [["可乐"],[130,220],"主要提供添加糖"],
 [["水果","苹果","橙子","蓝莓","草莓"],[50,150],"提供水果和膳食纤维"]
];
function qty(text,key){let i=text.indexOf(key),a=text.slice(i,i+18),m=a.match(/[×xX*]\s*(\d+)/)||a.match(/(\d+)\s*(个|块|份|pcs)/i);return m?+m[1]:1}
function analyze(text,note){
 let all=text+" "+note,lo=0,hi=0,found=[],veg=false,fried=0;
 FOOD.forEach(f=>{let k=f[0].find(k=>all.includes(k));if(!k)return;let around=all.slice(Math.max(0,all.indexOf(k)-8),all.indexOf(k)+k.length+8);if(/没喝|未喝|没吃|未吃/.test(around))return;let q=f[3]?qty(all,k):1;lo+=f[1][0]*q;hi+=f[1][1]*q;found.push(f[2]);if(/青菜|蔬菜|西兰花|菠菜|生菜|水果/.test(k))veg=true;if(/汉堡|鸡块|洋葱圈/.test(k))fried++});
 if(!found.length)return {kcal:"暂无法估算",text:"本地食物库暂时没有识别到足够信息。把食物、数量和烹饪方式写具体一些会更准确。"};
 let advice=!veg?"；这顿蔬菜/纤维偏少，下一餐补一份蔬菜即可，不需要少吃一顿补偿。":fried>=2?"；油炸食物比较集中，下一餐可以清淡一些。":"；整体继续按实际份量记录即可。";
 return {kcal:`约 ${Math.round(lo/10)*10}–${Math.round(hi/10)*10} kcal`,text:[...new Set(found)].slice(0,3).join("；")+advice}
}
function render(){
 let d=dayNo(),w=Math.ceil(d/7);$("#dayTitle").textContent=`Week ${w} · Day ${d}`;$("#today").textContent=today();
 let fs=db.foods.filter(x=>x.date===today()),ws=db.workouts.filter(x=>x.date===today()),ww=db.weights.find(x=>x.date===today());
 $("#foodMini").textContent=`${fs.length} 餐`;$("#workoutMini").textContent=ws.length?`${ws.reduce((a,x)=>a+(+x.minutes||0),0)} min`:"未记录";$("#weightMini").textContent=ww?`${ww.value} kg`:"记录";
 $("#foods").className=fs.length?"":"empty";$("#foods").innerHTML=fs.length?fs.map(x=>`<div class="entry"><div class="entryTop"><b>${x.meal}</b><span>${x.time}</span></div><p>${esc(x.items)}</p>${x.note?`<span class="tag">${esc(x.note)}</span>`:""}<div class="analysis"><b>${x.analysis.kcal}</b><p>${esc(x.analysis.text)}</p></div></div>`).join(""):"今天还没有饮食记录";
 $("#workouts").innerHTML=ws.length?ws.map(x=>`<div class="entry"><div class="entryTop"><b>${esc(x.type)}</b><span>${x.minutes} min</span></div><p>${esc(x.detail)}</p></div>`).join(""):"今天还没有运动记录";
 let weights=[...db.weights].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,7);$("#weights").innerHTML=weights.length?weights.map(x=>`<div class="entry"><div class="entryTop"><b>${x.value} kg</b><span>${x.date}</span></div></div>`).join(""):"还没有体重记录";
 updatePill();
}
const modal=$("#modal");$("#close").onclick=()=>modal.close();
function open(k){$("#modalTitle").textContent={food:"记录饮食",weight:"记录体重",workout:"记录运动",body:"身体状态"}[k]||"记录";let b=$("#modalBody");
 if(k==="food")b.innerHTML=`<div class="field"><label>餐次</label><select id="meal"><option>早餐</option><option selected>午餐</option><option>晚餐</option><option>加餐</option></select></div><div class="field"><label>实际吃了什么</label><textarea id="items" placeholder="例：双层鸡堡×1、鸡块×5、洋葱圈×3"></textarea></div><div class="field"><label>备注</label><input id="note" placeholder="例：可乐没喝 / 剩了一半"></div><div class="note">保存后网页会自动做本地热量估算和饮食结构分析。它不是真正的 ChatGPT AI，热量仅作趋势参考。</div><button class="save" onclick="addFood()">保存并分析</button>`;
 if(k==="weight")b.innerHTML=`<div class="field"><label>体重 kg</label><input id="val" type="number" step=".05" inputmode="decimal"></div><button class="save" onclick="addWeight()">保存</button>`;
 if(k==="workout")b.innerHTML=`<div class="field"><label>类型</label><select id="type"><option>跑步机爬坡</option><option>力量 · Full Body</option><option>步行</option><option>其他</option></select></div><div class="field"><label>分钟</label><input id="mins" type="number"></div><div class="field"><label>详情</label><textarea id="detail" placeholder="坡度9–10，速度3.5 km/h…"></textarea></div><button class="save" onclick="addWorkout()">保存</button>`;
 if(k==="body")b.innerHTML=`<div class="field"><label>状态</label><textarea id="state" placeholder="例：小腿酸、便秘、点滴出血…"></textarea></div><button class="save" onclick="addBody()">保存</button>`;
 modal.showModal()
}
document.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>open(b.dataset.add));
window.addFood=()=>{let items=$("#items").value.trim(),note=$("#note").value.trim();if(!items)return;db.foods.push({date:today(),meal:$("#meal").value,items,note,time:new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"}),analysis:analyze(items,note)});save();modal.close()};
window.addWeight=()=>{let v=+$("#val").value;if(!v)return;db.weights=db.weights.filter(x=>x.date!==today());db.weights.push({date:today(),value:v});save();modal.close()};
window.addWorkout=()=>{let m=+$("#mins").value;if(!m)return;db.workouts.push({date:today(),type:$("#type").value,minutes:m,detail:$("#detail").value});save();modal.close()};
window.addBody=()=>{let v=$("#state").value.trim();if(!v)return;db.body.push({date:today(),text:v});save();modal.close()};
$("#pillBtn").onclick=()=>{let t=today(),i=db.pills.indexOf(t);if(i>=0)db.pills.splice(i,1);else if(new Date()>=pillMoment())db.pills.push(t);save()};
render();tick();setInterval(tick,1000);