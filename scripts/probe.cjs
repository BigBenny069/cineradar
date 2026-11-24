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
  const fmt = (p) => `EX ${p.noQuotas ? "SANS-QUOTA" : "AVEC-QUOTA"} | ${p.title} | ${p.productionYear || "?"} | ${(p.directors || []).join(", ") || "-"} | ${p.streamingType || (p.screenAgreements || [])[0]?.streamingType} | https://vod.mediatheque-numerique.com/films/${p.slug}`;
  const sans = films.filter((p) => p.noQuotas);
  console.log("NB sans quota (longs):", sans.length, "| tous types:", all.filter((p) => p.noQuotas).length);
  sans.slice(0, 5).forEach((p) => console.log(fmt(p)));
  all.filter((p) => p.noQuotas && !sans.includes(p)).slice(0, 5).forEach((p) => console.log(fmt(p).replace("EX", "EXAUTRE")));
  const nice = films.filter((p) => !p.noQuotas && p.productionYear && (p.directors || []).length).slice(0, 5);
  nice.forEach((p) => console.log(fmt(p)));
})().catch((e) => console.log("ERREUR", e.message));
