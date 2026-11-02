const movieList = document.getElementById("movie-list");

async function loadMovies() {
    try {
        const result = await apiRequest("/movies");

        movieList.innerHTML = "";

        const movies = result.data;

        if (!movies || movies.length === 0) {
            movieList.innerHTML = "<p>No movies available.</p>";
            return;
        }

        movies.forEach(movie => {
            const card = document.createElement("article");
            card.className = "glass show";

            const poster = document.createElement("div");
            poster.className = "poster";

            if (movie.posterUrl) {
                const img = document.createElement("img");
                img.src = movie.posterUrl;
                img.alt = movie.title;
                img.style.width = "100%";
                img.style.height = "100%";
                img.style.objectFit = "cover";
                poster.appendChild(img);
            } else {
                poster.textContent = "🎬";
            }

            const info = document.createElement("div");
            info.className = "info";

            const title = document.createElement("h3");
            title.textContent = movie.title;

            const description = document.createElement("p");
            description.textContent =
                movie.description || "No description available.";

            const details = document.createElement("p");
            details.textContent =
                `${movie.genre || "Genre unavailable"} · ` +
                `${movie.durationMinutes ?? "Duration unavailable"} minutes`;

            const viewButton = document.createElement("button");

viewButton.textContent = "View Movie";
viewButton.className = "btn";

viewButton.addEventListener("click", () => {
    window.location.href = `movie.html?id=${movie.id}`;
});

info.append(title, description, details, viewButton);
card.append(poster, info);
movieList.appendChild(card);
        });

    } catch (error) {
        movieList.innerHTML =
            "<p>Unable to load movies. Please try again later.</p>";

        console.error("Error loading movies:", error);
    }
}

loadMovies();