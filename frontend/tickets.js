
(function () {
    const ticketList = document.getElementById("ticket-list");

    if (!ticketList) return;

    // Load customer bookings
    async function loadBookings() {
        try {
            const token = sessionStorage.getItem("showbook.accessToken");

            if (!token) {
                ticketList.textContent = "Please log in to view your bookings.";
                return;
            }

            ticketList.textContent = "Loading bookings...";

            // GET /api/bookings
            const result = await apiRequest("/bookings?page=1&limit=10");

            ticketList.innerHTML = "";

            const bookings = result.data || [];

            if (bookings.length === 0) {
                ticketList.textContent = "You have no bookings yet.";
                return;
            }

            bookings.forEach(booking => {
                const card = document.createElement("article");
                card.className = "glass show";

                const title = document.createElement("h3");
                title.textContent =
                    booking.showtime?.movie?.title || "Movie";

                const code = document.createElement("p");
                code.textContent = "Booking code: " + booking.code;

                const status = document.createElement("p");
                status.textContent = "Status: " + booking.status;

                const screen = document.createElement("p");
                screen.textContent =
                    "Screen: " +
                    (booking.showtime?.screen?.name || "Unavailable");

                const date = document.createElement("p");
                date.textContent = booking.showtime?.startsAt
                    ? "Date: " +
                      new Date(booking.showtime.startsAt).toLocaleString()
                    : "Date unavailable";

                const seats = document.createElement("p");
                seats.textContent = "Seats: " +
                    (booking.seats || []).map(seat =>
                        `${seat.row}${seat.number}`
                    ).join(", ");

                const total = document.createElement("p");
                total.textContent =
                    "Total: $" + Number(booking.total || 0).toFixed(2);

                card.append(
                    title,
                    code,
                    status,
                    screen,
                    date,
                    seats,
                    total
                );

                // Do not show cancellation for already cancelled bookings
                if (booking.status !== "cancelled") {
                    const cancelButton = document.createElement("button");

                    cancelButton.type = "button";
                    cancelButton.textContent = "Cancel Booking";
                    cancelButton.className = "btn";

                    cancelButton.addEventListener("click", () => {
                        cancelBooking(booking.id, cancelButton);
                    });

                    card.appendChild(cancelButton);
                }

                ticketList.appendChild(card);
            });

        } catch (error) {
            console.error("Booking loading error:", error);
            ticketList.textContent =
                error.message || "Unable to load your bookings.";
        }
    }

    // Cancel a booking
    async function cancelBooking(bookingId, button) {
        const confirmed = confirm(
            "Are you sure you want to cancel this booking?"
        );

        if (!confirmed) return;

        try {
            button.disabled = true;
            button.textContent = "Cancelling...";

            // POST /api/bookings/:id/cancel
            await apiRequest(
                `/bookings/${encodeURIComponent(bookingId)}/cancel`,
                {
                    method: "POST"
                }
            );

            alert("Booking cancelled successfully.");

            // Reload bookings to show updated status
            await loadBookings();

        } catch (error) {
            console.error("Booking cancellation error:", error);

            alert(error.message || "Unable to cancel booking.");

            button.disabled = false;
            button.textContent = "Cancel Booking";
        }
    }

    loadBookings();

})();

