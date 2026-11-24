const URL_API = "https://vod.mediatheque-numerique.com/api/proxy/api/product/search";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
async function page(n) {
  const r = await fetch(URL_API, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": UA, Referer: "https://vod.mediatheque-numerique.com/products", Origin: "https://vod.mediatheque-numerique.com" }, body: JSON.stringify({ withAggregations: false, sortType: "PUBLICATION_DATE", pageNumber: n }) });
  return (await r.json()).content.products;
}
(async () => {
  const first = await page(0); const all = [...first.content];
  for (let n = 1; n < first.totalPages; n++) all.push(...(await page(n)).content);
  const films = all.filter((p) => p.productType === "PROGRAM" && p.movieType === "LONG");
  console.log("PRODUITS:", all.length, "| longs métrages:", films.length);
  console.log("TOUTES LES CLES:", Object.keys(all[0]).filter((k) => !["description", "title"].includes(k)).join(","));
  const dist = (label, f) => { const c = {}; for (const p of films) { const v = String(f(p)); c[v] = (c[v] || 0) + 1; } console.log("DIST", label, JSON.stringify(c)); };
  dist("noQuotas", (p) => p.noQuotas);
  dist("cinetek", (p) => p.cinetek);
  dist("campus", (p) => p.campus);
  dist("stsm", (p) => p.stsm);
  dist("lastDays", (p) => p.lastDays);
  dist("streamingType", (p) => (p.screenAgreements || []).map((a) => a.streamingType).sort().join("+") || "aucun");
  dist("illimited", (p) => (p.screenAgreements || []).map((a) => a.illimited).sort().join("+") || "aucun");
  dist("transactionsCount>0", (p) => p.transactionsCount > 0);
  const ex = films.filter((p) => p.noQuotas).slice(0, 3).map((p) => `${p.title} (${p.productionYear})`);
  const ex2 = films.filter((p) => !p.noQuotas).slice(0, 3).map((p) => `${p.title} (${p.productionYear})`);
  console.log("EXEMPLES noQuotas=true:", ex.join(" | "), "|| false:", ex2.join(" | "));
  const rest = Object.fromEntries(Object.entries(films[0]).filter(([k]) => !["description", "title", "thumbFinalUrl", "posterFinalUrl"].includes(k)));
  console.log("FILM TYPE:", JSON.stringify(rest).slice(0, 1800));
})().catch((e) => console.log("ERREUR", e.message));
