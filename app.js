const KEY="pcos90-v1";
const DEFAULT={settings:{startDate:"2026-09-23",startWeight:76.6,goalWeight:73.0,pillTime:"22:00"},weights:[],waists:[],foods:[],workouts:[],body:[],pills:[]};
let db=load();
function load(){try{return {...structuredClone(DEFAULT),...JSON.parse(localStorage.getItem(KEY)||"{}")}}catch{return structuredClone(DEFAULT)}}
function save(){localStorage.setItem(KEY,JSON.stringify(db));render()}
const iso=d=>{let x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`}
const today=()=>iso(new Date());
const fmt=d=>new Intl.DateTimeFormat("zh-CN",{month:"numeric",day:"numeric"}).format(new Date(d+"T12:00:00"));
const days=(a,b)=>Math.floor((new Date(b+"T12:00:00")-new Date(a+"T12:00:00"))/86400000);
const latest=(arr,date=today())=>arr.filter(x=>x.date<=date).sort((a,b)=>b.date.localeCompare(a.date))[0];
function planDay(){return Math.max(1,days(db.settings.startDate,today())+1)}
function cycleInfo(){
 const d=planDay(), cycle=Math.floor((d-1)/28)+1, cd=(d-1)%28+1;
 return {cycle,cd,on:cd<=21,pillDay:Math.min(cd,21)}
}
function render(){
 const t=today(), pd=planDay(), wk=Math.ceil(pd/7), ci=cycleInfo();
 document.querySelector("#weekTitle").textContent=`Week ${wk} · Day ${pd}`;
 let end=new Date(db.settings.startDate+"T12:00:00");end.setDate(end.getDate()+89);
 document.querySelector("#planDates").textContent=`${fmt(db.settings.startDate)} — ${fmt(iso(end))}`;
 document.querySelector("#todayDate").textContent=fmt(t);
 document.querySelector("#startWeightText").textContent=db.settings.startWeight.toFixed(1);
 document.querySelector("#goalWeightText").textContent=db.settings.goalWeight.toFixed(1);
 const tw=db.weights.find(x=>x.date===t)?.value, recent=db.weights.filter(x=>days(x.date,t)>=0&&days(x.date,t)<=6);
 const avg=recent.length?recent.reduce((s,x)=>s+x.value,0)/recent.length:null, waist=latest(db.waists)?.value;
 document.querySelector("#todayWeight").textContent=tw?.toFixed(2)??"—";
 document.querySelector("#qWeight").textContent=tw?`${tw} kg`:"记录";
 document.querySelector("#avgWeight").textContent=avg?.toFixed(2)??"—";
 document.querySelector("#waistText").textContent=waist?.toFixed(1)??"—";
 const current=avg??tw??db.settings.startWeight, denom=db.settings.startWeight-db.settings.goalWeight;
 document.querySelector("#goalProgress").style.width=`${Math.max(0,Math.min(100,(db.settings.startWeight-current)/denom*100))}%`;
 document.querySelector("#pillCycle").textContent=`优思明 · Cycle ${ci.cycle}`;
 const taken=db.pills.some(x=>x.date===t);
 document.querySelector("#pillStatus").textContent=ci.on?`Day ${ci.pillDay} · ${taken?"今日已记录":`今晚 ${db.settings.pillTime}`}`:`停药期 Day ${ci.cd-21} / 7`;
 const pb=document.querySelector("#pillBtn");pb.classList.toggle("done",taken);pb.innerHTML=ci.on?(taken?"✓ <span>已记录</span>":"💊 <span>记录</span>"):"○ <span>停药期</span>";
 pb.disabled=!ci.on;
 const foods=db.foods.filter(x=>x.date===t), workouts=db.workouts.filter(x=>x.date===t), body=db.body.filter(x=>x.date===t);
 document.querySelector("#qFood").textContent=`${foods.length} 餐`; document.querySelector("#qWorkout").textContent=workouts.length?`${workouts.reduce((s,x)=>s+(+x.minutes||0),0)} min`:"未记录";
 document.querySelector("#qBody").textContent=body.length?body.map(x=>x.symptoms.join("、")).join("、"):"正常";
 renderList("foodList",foods,x=>`<div class="entry"><div class="entry-head"><b>${x.meal}</b><span>${x.time||""}</span></div><p>${esc(x.items)}</p>${x.note?`<span class="tag">${esc(x.note)}</span>`:""}</div>`);
 renderList("workoutList",workouts,x=>`<div class="entry"><div class="entry-head"><b>${x.type}</b><span>${x.minutes} min</span></div><p>${esc(x.detail||"")}</p></div>`);
 renderChart();
 const ws=new Date(t+"T12:00:00"); ws.setDate(ws.getDate()-((ws.getDay()+6)%7)); const wsi=iso(ws), we=new Date(ws);we.setDate(we.getDate()+6);
 const inWeek=x=>x.date>=wsi&&x.date<=iso(we);
 document.querySelector("#weekRange").textContent=`${fmt(wsi)}–${fmt(iso(we))}`;
 document.querySelector("#weekWorkout").textContent=db.workouts.filter(inWeek).reduce((s,x)=>s+(+x.minutes||0),0);
 document.querySelector("#weekStrength").textContent=db.workouts.filter(x=>inWeek(x)&&x.type.includes("力量")).length;
 document.querySelector("#weekMeals").textContent=db.foods.filter(inWeek).length;
 document.querySelector("#weekPills").textContent=`${db.pills.filter(inWeek).length}/7`;
}
function renderList(id,arr,fn){let el=document.querySelector("#"+id);el.classList.toggle("empty",!arr.length);el.innerHTML=arr.length?arr.map(fn).join(""):id==="foodList"?"今天还没有饮食记录":"今天还没有运动记录"}
function renderChart(){
 let el=document.querySelector("#weightChart"), arr=[...db.weights].sort((a,b)=>a.date.localeCompare(b.date)).slice(-14);
 if(!arr.length){el.innerHTML='<div class="list empty">记录体重后会显示最近 14 次趋势</div>';return}
 let vals=arr.map(x=>x.value), min=Math.min(...vals)-.3,max=Math.max(...vals)+.3;
 el.innerHTML=arr.map(x=>{let h=25+(x.value-min)/(max-min||1)*100;return `<div class="bar-wrap"><span class="bar-value">${x.value}</span><i class="bar ${x.date===today()?"today":""}" style="height:${h}px"></i><span class="bar-label">${fmt(x.date)}</span></div>`}).join("");
}
function esc(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
const modal=document.querySelector("#modal"), body=document.querySelector("#modalBody"), title=document.querySelector("#modalTitle");
function openModal(kind){
 if(kind==="weight"){title.textContent="记录体重";body.innerHTML=`<div class="field"><label>日期</label><input id="date" type="date" value="${today()}"></div><div class="field"><label>体重 kg</label><input id="value" type="number" step=".05" inputmode="decimal" placeholder="76.6"></div><button type="button" class="primary" onclick="addWeight()">保存</button>`}
 if(kind==="food"){title.textContent="记录饮食";body.innerHTML=`<div class="row"><div class="field"><label>日期</label><input id="date" type="date" value="${today()}"></div><div class="field"><label>餐次</label><select id="meal"><option>早餐</option><option selected>午餐</option><option>晚餐</option><option>加餐</option></select></div></div><div class="field"><label>吃了什么（按实际吃掉的量）</label><textarea id="items" placeholder="例：双层鸡堡×1、鸡块×5、洋葱圈×3"></textarea></div><div class="field"><label>备注</label><input id="note" placeholder="例：可乐没喝 / 剩了一半"></div><button type="button" class="primary" onclick="addFood()">保存</button>`}
 if(kind==="workout"){title.textContent="记录运动";body.innerHTML=`<div class="row"><div class="field"><label>日期</label><input id="date" type="date" value="${today()}"></div><div class="field"><label>类型</label><select id="type"><option>跑步机爬坡</option><option>力量 · Full Body A</option><option>步行</option><option>其他</option></select></div></div><div class="field"><label>分钟</label><input id="minutes" type="number" placeholder="30"></div><div class="field"><label>详情</label><textarea id="detail" placeholder="例：坡度9–10，速度3.5 km/h；或 Leg Press 3×10..."></textarea></div><button type="button" class="primary" onclick="addWorkout()">保存</button>`}
 if(kind==="body"){title.textContent="身体状态";let opts=["经期/出血","点滴出血","头痛","恶心","乳房胀","情绪变化","便秘","小腿酸痛"];body.innerHTML=`<div class="field"><label>日期</label><input id="date" type="date" value="${today()}"></div><div class="field"><label>有情况才选；无症状无需记录</label><div class="choice-grid">${opts.map(x=>`<button type="button" class="choice" onclick="this.classList.toggle('selected')">${x}</button>`).join("")}</div></div><div class="field"><label>备注</label><textarea id="note"></textarea></div><button type="button" class="primary" onclick="addBody()">保存</button>`}
 if(kind==="settings"){title.textContent="计划设置";body.innerHTML=`<div class="field"><label>计划开始日期</label><input id="startDate" type="date" value="${db.settings.startDate}"></div><div class="row"><div class="field"><label>起始体重 kg</label><input id="startWeight" type="number" step=".1" value="${db.settings.startWeight}"></div><div class="field"><label>阶段目标 kg</label><input id="goalWeight" type="number" step=".1" value="${db.settings.goalWeight}"></div></div><div class="field"><label>优思明提醒时间</label><input id="pillTime" type="time" value="${db.settings.pillTime}"></div><div class="field"><label>腰围 cm（可选）</label><input id="waist" type="number" step=".1" placeholder="${latest(db.waists)?.value||"尚未记录"}"></div><button type="button" class="primary" onclick="saveSettings()">保存</button><button type="button" class="primary danger" style="background:#f7efed;color:#a84d3d" onclick="exportData()">导出数据 JSON</button>`}
 if(kind==="progress"){title.textContent="Progress";let w=[...db.weights].sort((a,b)=>b.date.localeCompare(a.date));body.innerHTML=`<div class="progress-view"><h3>体重记录</h3><p class="muted">目标是观察周趋势，不因单日水分波动调整饮食。</p><div class="history">${w.length?w.map(x=>`<div class="entry"><div class="entry-head"><b>${x.value} kg</b><span>${x.date}</span></div></div>`).join(""):"暂无记录"}</div></div>`}
 modal.showModal();
}
window.addWeight=()=>{let v=+document.querySelector("#value").value,d=document.querySelector("#date").value;if(!v)return;db.weights=db.weights.filter(x=>x.date!==d);db.weights.push({date:d,value:v});save();modal.close()}
window.addFood=()=>{let items=document.querySelector("#items").value.trim();if(!items)return;db.foods.push({date:document.querySelector("#date").value,meal:document.querySelector("#meal").value,items,note:document.querySelector("#note").value.trim(),time:new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"})});save();modal.close()}
window.addWorkout=()=>{let m=+document.querySelector("#minutes").value;if(!m)return;db.workouts.push({date:document.querySelector("#date").value,type:document.querySelector("#type").value,minutes:m,detail:document.querySelector("#detail").value.trim()});save();modal.close()}
window.addBody=()=>{let symptoms=[...document.querySelectorAll(".choice.selected")].map(x=>x.textContent);if(!symptoms.length)return;db.body.push({date:document.querySelector("#date").value,symptoms,note:document.querySelector("#note").value.trim()});save();modal.close()}
window.saveSettings=()=>{db.settings={startDate:document.querySelector("#startDate").value,startWeight:+document.querySelector("#startWeight").value,goalWeight:+document.querySelector("#goalWeight").value,pillTime:document.querySelector("#pillTime").value};let waist=+document.querySelector("#waist").value;if(waist){db.waists.push({date:today(),value:waist})}save();modal.close()}
window.exportData=()=>{let a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(db,null,2)],{type:"application/json"}));a.download="pcos90-backup.json";a.click()}
document.querySelectorAll("[data-open]").forEach(x=>x.onclick=()=>openModal(x.dataset.open));
document.querySelector("#settingsBtn").onclick=()=>openModal("settings");
document.querySelector("#plusBtn").onclick=()=>openModal("food");
document.querySelector("#pillBtn").onclick=()=>{if(!cycleInfo().on)return;let d=today();if(db.pills.some(x=>x.date===d))db.pills=db.pills.filter(x=>x.date!==d);else db.pills.push({date:d,time:new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"})});save()}
render();
