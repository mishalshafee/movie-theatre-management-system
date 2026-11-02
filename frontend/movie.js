
const params = new URLSearchParams(window.location.search);
const movieId = params.get("id");

const movieTitle = document.getElementById("movie-title");
const movieDescription = document.getElementById("movie-description");
const movieGenre = document.getElementById("movie-genre");
const movieDuration = document.getElementById("movie-duration");
const movieRating = document.getElementById("movie-rating");
const movieReleaseDate = document.getElementById("movie-release-date");
const moviePoster = document.getElementById("movie-poster");

async function loadMovie() {

    try {

        if (!movieId) {
            throw new Error("Movie ID is missing.");
        }

        const result = await apiRequest(`/movies/${movieId}`);

        const movie = result.movie;

        movieTitle.textContent = movie.title;
        movieDescription.textContent =
            movie.description || "No description available.";

        movieGenre.textContent = movie.genre || "Not available";
        movieDuration.textContent =
            movie.durationMinutes + " minutes";

        movieRating.textContent = movie.rating || "Not rated";
        movieReleaseDate.textContent =
            movie.releaseDate || "Not available";

        if (movie.posterUrl) {

            const img = document.createElement("img");

            img.src = movie.posterUrl;
            img.alt = movie.title;
            img.style.width = "100%";
            img.style.height = "100%";
            img.style.objectFit = "cover";

            moviePoster.innerHTML = "";
            moviePoster.appendChild(img);

        }

    } catch (error) {

        movieTitle.textContent = "Unable to load movie";
        movieDescription.textContent = error.message;

        console.error("Movie loading error:", error);

    }

}



const showtimeList = document.getElementById("showtime-list");

async function loadShowtimes() {
    try {
        showtimeList.innerHTML = "<p>Loading showtimes...</p>";

        const result = await apiRequest(
            `/showtimes?movieId=${encodeURIComponent(movieId)}`
        );

        showtimeList.innerHTML = "";

        const showtimes = result.data;

        if (!showtimes || showtimes.length === 0) {
            showtimeList.innerHTML =
                "<p>No showtimes available for this movie.</p>";
            return;
        }

        showtimes.forEach(showtime => {
            const card = document.createElement("div");
            card.className = "glass show";

            const date = document.createElement("p");
            date.textContent = new Date(
                showtime.startsAt
            ).toLocaleString();

            const screen = document.createElement("p");
            screen.textContent =
                showtime.screen?.name || "Screen unavailable";

            const button = document.createElement("button");
            button.textContent = "Select Showtime";
            button.className = "btn";

            button.addEventListener("click", () => {
                window.location.href =
                    `seats.html?showtimeId=${encodeURIComponent(showtime.id)}`;
            });

            card.append(date, screen, button);
            showtimeList.appendChild(card);
        });

    } catch (error) {
        showtimeList.innerHTML =
            "<p>Unable to load showtimes.</p>";

        console.error("Showtime loading error:", error);
    }
}

loadMovie();
loadShowtimes();
