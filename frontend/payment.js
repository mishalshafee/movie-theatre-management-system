
(function () {
    const KEY = "showbook.booking";

    const readBooking = () => {
        try {
            return JSON.parse(sessionStorage.getItem(KEY));
        } catch {
            return null;
        }
    };

    const money = amount => "$" + Number(amount || 0).toFixed(2);

    const booking = readBooking();

    const showElement = document.getElementById("sum-show");
    const seatsElement = document.getElementById("sum-seats");
    const subtotalElement = document.getElementById("sum-sub");
    const feeElement = document.getElementById("sum-fee");
    const totalElement = document.getElementById("sum-total");

    const payButton = document.getElementById("pay");
    const messageElement = document.getElementById("payment-message");

    // Display booking information
    function displayBooking() {
        if (!booking) {
            if (showElement) {
                showElement.textContent = "No booking found";
            }

            if (payButton) {
                payButton.disabled = true;
            }

            return;
        }

        const movieTitle =
            booking.showtime?.movie?.title || "Movie";

        const screenName =
            booking.showtime?.screen?.name || "Screen";

        const startsAt = booking.showtime?.startsAt
            ? new Date(booking.showtime.startsAt).toLocaleString()
            : "";

        if (showElement) {
            showElement.textContent =
                `${movieTitle} - ${screenName} ${startsAt}`;
        }

        if (seatsElement) {
            seatsElement.textContent = booking.seats?.length
                ? booking.seats.map(seat =>
                    `${seat.row}${seat.number}`
                  ).join(", ")
                : "No seats";
        }

        const subtotal = Number(booking.total || 0);

        if (subtotalElement) {
            subtotalElement.textContent = money(subtotal);
        }

        // No additional fee unless the backend specifies one
        if (feeElement) {
            feeElement.textContent = money(0);
        }

        if (totalElement) {
            totalElement.textContent = money(subtotal);
        }

        if (booking.status === "paid") {
            if (payButton) {
                payButton.disabled = true;
                payButton.textContent = "Already Paid";
            }

            if (messageElement) {
                messageElement.textContent = "This booking has already been paid.";
            }
        }
    }

    // Send payment request to backend
    async function payBooking() {
        try {
            if (!booking || !booking.id) {
                throw new Error("Booking ID not found.");
            }

            if (booking.status === "paid") {
                throw new Error("This booking is already paid.");
            }

            if (!sessionStorage.getItem("showbook.accessToken")) {
                alert("Please log in again.");
                window.location.href = "login.html";
                return;
            }

            payButton.disabled = true;
            payButton.textContent = "Processing...";

            // POST /api/bookings/:id/pay
            const result = await apiRequest(
                `/bookings/${encodeURIComponent(booking.id)}/pay`,
                {
                    method: "POST"
                }
            );

            if (result && result.booking) {
                sessionStorage.setItem(
                    KEY,
                    JSON.stringify(result.booking)
                );
            }

            payButton.textContent = "Payment Successful";

            if (messageElement) {
                messageElement.textContent =
                    "Payment completed successfully!";
            }

            alert("Payment successful!");

        } catch (error) {
            console.error("Payment error:", error);

            if (messageElement) {
                messageElement.textContent =
                    error.message || "Payment failed.";
            }

            alert(error.message || "Payment failed.");

            payButton.disabled = false;
            payButton.textContent = "Pay Now";
        }
    }

   // Connect payment form
const paymentForm = document.getElementById("PayForm");

if (paymentForm) {
    paymentForm.addEventListener("submit", function (event) {
        event.preventDefault();
        payBooking();
    });
}

    displayBooking();

})();

