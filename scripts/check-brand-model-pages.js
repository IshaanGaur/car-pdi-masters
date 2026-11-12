const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..'), OUT=path.join(ROOT,'car-pdi'), CAT=path.join(ROOT,'models/catalog.json'), SITE='https://www.carmasters.co.in';
const fail=[]; const ok=(c,m)=>{if(!c)fail.push(m)};
const data=JSON.parse(fs.readFileSync(CAT,'utf8'));
const approved=data.models.filter(m=>m.status==='approved'&&m.researchStatus==='approved'&&m.seoStatus!=='blocked');
const slug=s=>String(s).toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g,'').replace(/[\s_]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
const modelUrl=m=>`/car-pdi/${m.brandSlug||slug(m.brand)}/${m.modelSlug||slug(m.model)}/`;
ok(fs.existsSync(OUT),'car-pdi output directory missing');
const root=path.join(OUT,'index.html');
ok(fs.existsSync(root),'root /car-pdi/ hub missing');
let rootHtml=fs.existsSync(root)?fs.readFileSync(root,'utf8'):'';
ok(rootHtml.includes('<link rel="canonical" href="'+SITE+'/car-pdi/">'),'root canonical missing');
ok(rootHtml.includes('BreadcrumbList'),'root BreadcrumbList missing');
const brands=[...new Map(approved.map(m=>[m.brandSlug||slug(m.brand),m.brand])).entries()];
for(const [brandSlug,brand] of brands){
  const f=path.join(OUT,brandSlug,'index.html'); ok(fs.existsSync(f),`brand hub missing: ${brandSlug}`);
  if(!fs.existsSync(f))continue;
  const h=fs.readFileSync(f,'utf8');
  ok(h.includes('canonical'),'canonical missing on brand hub: '+brand);
  ok(h.includes('BreadcrumbList'),'BreadcrumbList missing on brand hub: '+brand);
}
let generated=0;
for(const m of approved){
  const f=path.join(OUT,(m.brandSlug||slug(m.brand)),(m.modelSlug||slug(m.model)),'index.html');
  ok(fs.existsSync(f),`model page missing: ${m.brand} ${m.model}`);
  if(!fs.existsSync(f))continue;
  generated++;
  const h=fs.readFileSync(f,'utf8'), title=(h.match(/<title>([\s\S]*?)<\/title>/i)||[])[1]||'', desc=(h.match(/<meta name="description" content="([^"]*)"/i)||[])[1]||'', canon=(h.match(/<link rel="canonical" href="([^"]+)"/i)||[])[1]||'';
  ok(title.length>0 && title.length<=60,`title length invalid (${title.length}): ${m.brand} ${m.model}`);
  ok(desc.length>0 && desc.length<=160,`meta description length invalid (${desc.length}): ${m.brand} ${m.model}`);
  ok(canon===SITE+modelUrl(m),`canonical mismatch: ${m.brand} ${m.model}`);
  ok(/<meta name="robots" content="index,follow">/i.test(h),`robots missing: ${m.brand} ${m.model}`);
  ok(/<h1>[^<]*<\/h1>/i.test(h),`H1 missing: ${m.brand} ${m.model}`);
  ok(h.includes('BreadcrumbList')&&h.includes('Service')&&h.includes('FAQPage'),`schema incomplete: ${m.brand} ${m.model}`);
  ok(h.includes('/services/car-pdi.html')&&h.includes('/services/car-inspection.html')&&h.includes('/sample-report.html'),`core internal links missing: ${m.brand} ${m.model}`);
  ok(h.includes('/locations/delhi.html')&&h.includes('/locations/gurugram.html')&&h.includes('/locations/noida.html'),`location links missing: ${m.brand} ${m.model}`);
  ok(!/href="[^"]*\/\/[^"]*"/.test(h.replace(/https?:\/\/[^"]+/g,'')),`double-slash internal URL found: ${m.brand} ${m.model}`);
  if(m.demandValidation==='used_historical'){
    ok(!/<div class="eyebrow dark">NEW CAR PDI<\/div>/i.test(h),`historical model has NEW CAR PDI section: ${m.brand} ${m.model}`);
    ok(!/PDI for new car<\/strong>/i.test(h),`historical model has new-car keyword block: ${m.brand} ${m.model}`);
  }
}
const smPath=path.join(ROOT,'sitemap.xml'); ok(fs.existsSync(smPath),'sitemap.xml missing');
if(fs.existsSync(smPath)){
 const sm=fs.readFileSync(smPath,'utf8'), expected=[SITE+'/car-pdi/'].concat(brands.map(([b])=>SITE+'/car-pdi/'+b+'/'),approved.map(m=>SITE+modelUrl(m)));
 ok(sm.includes('BEGIN GENERATED BRAND MODEL PAGES')&&sm.includes('END GENERATED BRAND MODEL PAGES'),'generated sitemap block missing');
 for(const u of expected)ok(sm.includes('<loc>'+u+'</loc>'),'sitemap URL missing: '+u);
}
if(generated!==approved.length)fail.push(`generated ${generated} model pages; expected ${approved.length}`);
if(fail.length){console.error('MODEL SEO QA FAILED');for(const x of fail)console.error(' - '+x);process.exit(1)}
console.log('MODEL SEO QA PASSED');
console.log(JSON.stringify({catalog:data.models.length,approved:approved.length,brands:brands.length,modelPages:generated,expectedSitemapModelUrls:approved.length},null,2));