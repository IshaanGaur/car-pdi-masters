+// Read-only inventory for locality-page quality review.
+// It intentionally does not modify pages, canonicals, robots directives or sitemap entries.
+const fs = require('fs');
+const path = require('path');
+const root = path.join(__dirname, '..');
+const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
+const entries = [...sitemap.matchAll(/<loc>https:\/\/www\.carmasters\.co\.in\/(locations\/(?:delhi|gurugram)\/[^<]+\.html)<\/loc>/g)]
+  .map(match => match[1]);
+const uniqueEntries = [...new Set(entries)];
+const strip = html => html
+  .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
+  .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
+  .replace(/<!--[\s\S]*?-->/g, ' ')
+  .replace(/<[^>]+>/g, ' ')
+  .replace(/&nbsp;|&#160;/gi, ' ')
+  .replace(/&amp;/gi, '&')
+  .replace(/&quot;/gi, '"')
+  .replace(/&#39;|&apos;/gi, "'")
+  .replace(/\s+/g, ' ')
+  .trim();
+const inventory = uniqueEntries.map(file => {
+  const full = path.join(root, file);
+  if (!fs.existsSync(full)) return { path: file, exists: false };
+  const html = fs.readFileSync(full, 'utf8');
+  const text = strip(html);
+  const title = (html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '';
+  const description = (html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i) || [])[1] || '';
+  const h1 = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)]
+    .map(match => strip(match[1])).join(' | ');
+  const canonical = (html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i) || [])[1] || '';
+  const headings = [...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)]
+    .map(match => strip(match[1]));
+  const wordCount = text ? text.split(/\s+/).length : 0;
+  const localTerms = [...new Set((text.match(/\b(?:Sector\s*\d+[A-Z]?|DLF Phase\s*\d|Golf Course Road|Sohna Road|Dwarka Expressway|IGI Airport|IDC|Rohtak Road|New Rohtak Road|DB Gupta Road|E Park Road|Saket District Centre|Rohini|Dwarka|Saket)\b/gi) || []).map(x => x.toLowerCase()))];
+  const robots = (html.match(/<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/i) || [])[1] || '';
+  return {
+    path: file,
+    exists: true,
+    wordCount,
+    title: strip(title),
+    h1,
+    description,
+    canonical,
+    robots,
+    h2Count: headings.length,
+    localTerms,
+    hasFaqSchema: /"@type"\s*:\s*"FAQPage"/.test(html),
+    hasBreadcrumbSchema: /"@type"\s*:\s*"BreadcrumbList"/.test(html),
+    hasServiceSchema: /"@type"\s*:\s*"Service"/.test(html)
+  };
+});
+const missing = inventory.filter(item => !item.exists);
+const malformed = inventory.filter(item => item.exists && (
+  !item.canonical.endsWith('/' + item.path) ||
+  /noindex/i.test(item.robots) ||
+  !item.hasBreadcrumbSchema
+));
+const short = inventory.filter(item => item.exists && item.wordCount < 500);
+const report = {
+  generatedAt: new Date().toISOString(),
+  source: 'sitemap.xml',
+  totalUniqueDelhiGurugramLocalityUrls: uniqueEntries.length,
+  duplicateSitemapEntries: entries.length - uniqueEntries.length,
+  missingFiles: missing,
+  canonicalRobotsBreadcrumbFlags: malformed,
+  under500VisibleWords: short,
+  inventory
+};
+const output = path.join(root, 'locality-audit-report.json');
+fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
+console.log(JSON.stringify({
+  total: report.totalUniqueDelhiGurugramLocalityUrls,
+  duplicateSitemapEntries: report.duplicateSitemapEntries,
+  missingFiles: missing.length,
+  canonicalRobotsBreadcrumbFlags: malformed.length,
+  under500VisibleWords: short.length,
+  output: 'locality-audit-report.json'
+}, null, 2));
