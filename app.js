
const CSV_URL = "./employees.csv";
function qs(id){ return document.getElementById(id); }
function getParam(name){ return new URL(window.location.href).searchParams.get(name); }
function slugify(s){ return String(s||"").trim().toLowerCase().replace(/['"]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,""); }
function parseCSV(text){
  const rows=[]; let row=[],cur="",inQ=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i], nx=text[i+1];
    if(ch=='"' && inQ && nx=='"'){cur+='"'; i++; continue;}
    if(ch=='"'){inQ=!inQ; continue;}
    if(ch==',' && !inQ){row.push(cur); cur=""; continue;}
    if((ch=='\n'||ch=='\r') && !inQ){
      if(cur.length||row.length){row.push(cur); cur=""; rows.push(row); row=[];}
      continue;
    }
    cur+=ch;
  }
  if(cur.length||row.length){row.push(cur); rows.push(row);}
  const header=(rows.shift()||[]).map(h=>slugify(h).replace(/-/g,"_"));
  return rows.filter(r=>r.some(v=>String(v||"").trim()!=="")).map(r=>{
    const o={}; header.forEach((h,idx)=>o[h]=(r[idx]??"").trim()); return o;
  });
}
function initials(first,last){ const f=(first||"").trim()[0]||""; const l=(last||"").trim()[0]||""; return ((f+l).toUpperCase())||"H"; }
function normalizeTelHref(tel){
  const raw=(tel||"").trim(); if(!raw) return "";
  const m=raw.match(/(.*?)(?:\s*(?:x|ext\.?)\s*(\d+))$/i);
  const main=(m?m[1]:raw).replace(/[^\d+]/g,"");
  const ext=m?m[2]:"";
  return ext?`tel:${main};ext=${ext}`:`tel:${main}`;
}
function buildVCard(p, pageUrl){
  const first=p.first_name||"", last=p.last_name||"", full=`${first} ${last}`.trim();
  const org=p.organization||"Highlight Industries, Inc.", title=p.title||"", email=p.email||"", phone=p.phone||"";
  const website=p.website||"https://www.highlightindustries.com";
  const L=[];
  L.push("BEGIN:VCARD","VERSION:3.0",`N:${last};${first};;;`,`FN:${full}`,`ORG:${org}`);
  if(title) L.push(`TITLE:${title}`);
  if(phone){ const digits=phone.replace(/[^\d+]/g,""); if(digits) L.push(`TEL;TYPE=WORK,VOICE:${digits}`); }
  if(email) L.push(`EMAIL;TYPE=INTERNET,WORK:${email}`);
  if(website) L.push(`URL:${website}`);
  if(pageUrl) L.push(`NOTE:Contact card: ${pageUrl}`);
  L.push("END:VCARD");
  return L.join("\r\n")+"\r\n";
}
function downloadText(filename, text, mime="text/vcard"){
  const blob=new Blob([text],{type:mime});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download=filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 5000);
}
async function copyToClipboard(text){
  try{ await navigator.clipboard.writeText(text); return true; }
  catch(e){
    const ta=document.createElement("textarea"); ta.value=text; ta.style.position="fixed"; ta.style.left="-9999px";
    document.body.appendChild(ta); ta.focus(); ta.select();
    let ok=false; try{ ok=document.execCommand("copy"); }catch(_){}
    ta.remove(); return ok;
  }
}
function renderQr(el, url, size){
  el.innerHTML = "";
  const s = size || 200;
  // eslint-disable-next-line no-undef
  new QRCode(el,{text:url,width:s,height:s,correctLevel:QRCode.CorrectLevel.M});
}
function openShareModal(url, p){
  const modal=qs("shareModal"), hint=qs("shareHint");
  const close=()=>{ modal.classList.remove("is-open"); modal.setAttribute("aria-hidden","true"); document.body.style.overflow=""; };
  modal.classList.add("is-open"); modal.setAttribute("aria-hidden","false"); document.body.style.overflow="hidden";
  qs("shareBackdrop").onclick=close; qs("shareClose").onclick=close;
  qs("shareLinkInput").value=url;
  qs("copyLinkBtn").onclick=async()=>{ const ok=await copyToClipboard(url); hint.textContent=ok?"Link copied.":"Couldn't copy automatically—select and copy."; setTimeout(()=>hint.textContent="",2200); };
  const fullName=`${p.first_name||""} ${p.last_name||""}`.trim();
  qs("smsShare").href=`sms:&body=${encodeURIComponent(`Save my contact: ${url}`)}`;
  qs("emailShare").href=`mailto:?subject=${encodeURIComponent(`Contact: ${fullName} (Highlight)`)}&body=${encodeURIComponent(`Here’s my contact card:\n${url}\n\n— ${fullName}`)}`;
  const u=encodeURIComponent(url);
  qs("linkedinShare").href=`https://www.linkedin.com/sharing/share-offsite/?url=${u}`;
  qs("facebookShare").href=`https://www.facebook.com/sharer/sharer.php?u=${u}`;
  qs("xShare").href=`https://twitter.com/intent/tweet?url=${u}&text=${encodeURIComponent("Save my contact")}`;
  const onKey=(e)=>{ if(e.key==="Escape"){ close(); window.removeEventListener("keydown",onKey); } };
  window.addEventListener("keydown", onKey);
}
function normalizePerson(p){
  const first=p.first_name||p.first||"", last=p.last_name||p.last||"";
  p.first_name=first; p.last_name=last;
  p.slug=p.slug||slugify(`${first}-${last}`);
  p.organization=p.organization||p.company||"Highlight Industries, Inc.";
  p.website=p.website||"https://www.highlightindustries.com";
  return p;
}
function renderPerson(p){
  const person=normalizePerson(p);
  const pageUrl=new URL(window.location.href); pageUrl.searchParams.set("u", person.slug);
  const url=pageUrl.toString();

  qs("initials").textContent=initials(person.first_name, person.last_name);

  qs("name").textContent=`${person.first_name} ${person.last_name}`.trim();
  qs("title").textContent=person.title||"";
  qs("company").textContent=person.organization||"";

  qs("phoneText").textContent=person.phone||"";
  qs("emailText").textContent=person.email||"";
  qs("webText").textContent=(person.website||"").replace(/^https?:\/\//,"")||"www.highlightindustries.com";

  qs("phoneRow").href=normalizeTelHref(person.phone||"");
  qs("emailRow").href=person.email?`mailto:${person.email}`:"#";
  qs("webRow").href=person.website||"https://www.highlightindustries.com";

  qs("mName").textContent=`${person.first_name} ${person.last_name}`.trim();
  qs("mTitle").textContent=person.title||"";
  qs("mCompany").textContent=person.organization||"";

  qs("mPhoneText").textContent=person.phone||"";
  qs("mEmailText").textContent=person.email||"";
  qs("mWebText").textContent=(person.website||"").replace(/^https?:\/\//,"")||"www.highlightindustries.com";

  qs("mPhoneRow").href=normalizeTelHref(person.phone||"");
  qs("mEmailRow").href=person.email?`mailto:${person.email}`:"#";
  qs("mWebRow").href=person.website||"https://www.highlightindustries.com";

  renderQr(qs("qrDesktop"), url, 220);
  renderQr(qs("qrMobile"), url, 176);

  const save=()=>downloadText(`${person.slug}.vcf`, buildVCard(person, url), "text/vcard");
  qs("saveBtnDesktop").onclick=save;
  qs("saveBtnMobile").onclick=save;

  qs("shareBtn").onclick=async()=>{
    const title="Highlight contact card";
    const text=`Save my contact: ${url}`;
    if(navigator.share){
      try{ await navigator.share({title, text, url}); return; }catch(e){}
    }
    openShareModal(url, person);
  };
}
async function main(){
  const slug=getParam("u")||"taryn-swayze";
  const res=await fetch(CSV_URL,{cache:"no-store"});
  if(!res.ok){ qs("name").textContent="Missing employees.csv"; qs("mName").textContent="Missing employees.csv"; return; }
  const people=parseCSV(await res.text()).map(normalizePerson);
  const person=people.find(p=>(p.slug||"")===slug) || people[0];
  if(!person){ qs("name").textContent="No employees found"; qs("mName").textContent="No employees found"; return; }
  renderPerson(person);
catch(e){} }
}
main();
