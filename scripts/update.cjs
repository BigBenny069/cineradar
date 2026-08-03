const fs = require("fs");
const path = require("path");

const API_KEY = process.env.TMDB_API_KEY;
const BASE = "https://api.themoviedb.org/3";

async function findMovie(title, year) {
  const url = `${BASE}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(title)}&year=${year}&language=fr-FR`;
  const res = await fetch(url);
  const data = await res.json();
  return data.results?.[0] || null;
}

async function getDetails(id) {
  const url = `${BASE}/movie/${id}?api_key=${API_KEY}&language=fr-FR&append_to_response=credits,watch/providers`;
  const res = await fetch(url);
  return res.json();
}

function splitProviders(fr) {
  const abonnement = (fr?.flatrate || []).map((p) => p.provider_name);
  const vod = [...(fr?.rent || []), ...(fr?.buy || [])].map((p) => p.provider_name);
  return {
    abonnement: [...new Set(abonnement)],
    vod: [...new Set(vod)],
  };
}

async function main() {
  const input = JSON.parse(fs.readFileSync("data/movies.json", "utf-8"));
  const output = [];

  for (const movie of input) {
    console.log(`Recherche : ${movie.title} (${movie.year})`);
    const found = await findMovie(movie.title, movie.year);
    if (!found) {
      console.log(`  Introuvable sur TMDB, ignoré.`);
      continue;
    }
    const details = await getDetails(found.id);
    const director = details.credits?.crew?.find((c) => c.job === "Director");
    const cast = (details.credits?.cast || []).slice(0, 5).map((c) => c.name);
    const fr = details["watch/providers"]?.results?.FR;
    const providers = splitProviders(fr);

    output.push({
      tmdbId: details.id,
      title: details.title,
      year: details.release_date?.slice(0, 4),
      director: director?.name || movie.director,
      poster: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : null,
      synopsis: details.overview,
      genres: (details.genres || []).map((g) => g.name),
      cast,
      tmdbRating: details.vote_average,
      tmdbVotes: details.vote_count,
      imdbId: details.imdb_id,
      letterboxdUrl: movie.letterboxdUrl || null,
      providers,
      lastChecked: new Date().toISOString(),
    });
  }

  fs.mkdirSync(path.dirname("public/data/enriched.json"), { recursive: true });
  fs.writeFileSync("public/data/enriched.json", JSON.stringify(output, null, 2));
  console.log(`Terminé : ${output.length} film(s) mis à jour.`);
}

main();
