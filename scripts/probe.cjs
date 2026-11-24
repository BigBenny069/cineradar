const URL_API = "https://vod.mediatheque-numerique.com/api/proxy/api/product/search";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
async function page(n) {
  const r = await fetch(URL_API, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": UA, Referer: "https://vod.mediatheque-numerique.com/products", Origin: "https://vod.mediatheque-numerique.com" }, body: JSON.stringify({ withAggregations: true, sortType: "PUBLICATION_DATE", pageNumber: n }) });
  return (await r.json()).content;
}
(async () => {
  const c = await page(0);
  console.log("CLES content:", Object.keys(c).join(","));
  const items = c.products.content;
  console.log("PRODUIT complet:", JSON.stringify(items[0]).slice(0, 2500));
  const all = [...items];
  for (let n = 1; n < Math.min(c.products.totalPages, 60); n++) all.push(...(await page(n)).products.content);
  console.log("PRODUITS lus:", all.length);
  const interesting = /pric|free|gratuit|paid|premium|credit|access|offer|rent|fee|licen|cost|exclusive|subscription|plan|catalog/i;
  const vals = {};
  for (const p of all) for (const [k, v] of Object.entries(p)) if (interesting.test(k)) { (vals[k] = vals[k] || {})[JSON.stringify(v).slice(0, 50)] = ((vals[k] || {})[JSON.stringify(v).slice(0, 50)] || 0) + 1; }
  console.log("CHAMPS pertinents:", JSON.stringify(vals).slice(0, 2500));
  if (c.aggregations) console.log("AGREGATIONS:", JSON.stringify(c.aggregations).slice(0, 2500));
})().catch((e) => console.log("ERREUR", e.message));
