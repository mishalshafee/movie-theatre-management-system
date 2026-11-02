
(function () {
    const $ = id => document.getElementById(id);

    const KEY = "showbook.booking";

    const box = $("seats");
    const list = $("list");
    const totalElement = $("total");
    const go = $("go");

    if (!box) return;

    // Get showtime ID from URL
    const params = new URLSearchParams(window.location.search);
    const showtimeId = params.get("showtimeId");

    // Store selected seats using backend seat IDs
    const sel = new Map();

    let originalButtonText = go ? go.textContent : "Continue";

    // Format currency
    const money = amount => "$" + Number(amount).toFixed(2);

    // Update selected seats and total
    function update() {
        const selectedSeats = [...sel.values()];

        if (list) {
            list.textContent =
                selectedSeats.map(seat => seat.label).join(", ") || "None";
        }

        const total = selectedSeats.reduce(
            (sum, seat) => sum + seat.price,
            0
        );

        if (totalElement) {
            totalElement.textContent = money(total);
        }

        if (go) {
            go.disabled = selectedSeats.length === 0;
        }

        // Save temporary selection
        sessionStorage.setItem(
            KEY,
            JSON.stringify({
                showtimeId: showtimeId,
                seats: selectedSeats.map(seat => seat.label),
                seatIds: selectedSeats.map(seat => seat.id),
                price: total
            })
        );
    }

    // Create booking through backend
    async function createBooking() {
        try {
            const token = sessionStorage.getItem("showbook.accessToken");

            if (!token) {
                alert("Please log in before booking seats.");
                window.location.href = "login.html";
                return;
            }

            if (!showtimeId) {
                throw new Error("Showtime ID is missing.");
            }

            if (sel.size === 0) {
                alert("Please select at least one seat.");
                return;
            }

            if (sel.size > 8) {
                alert("You can select a maximum of 8 seats.");
                return;
            }

            if (!go) {
                throw new Error("Continue button not found.");
            }

            go.disabled = true;
            go.textContent = "Creating booking...";

            const bookingData = {
                showtimeId: showtimeId,
                seatIds: [...sel.keys()]
            };

            // POST /api/bookings
            const result = await apiRequest("/bookings", {
                method: "POST",
                body: JSON.stringify(bookingData)
            });

            if (!result.booking) {
                throw new Error("Booking response is invalid.");
            }

            // Save actual booking returned by backend
            sessionStorage.setItem(
                KEY,
                JSON.stringify(result.booking)
            );

            alert("Booking created successfully!");

            window.location.href = "payment.html";

        } catch (error) {
            console.error("Booking error:", error);

            alert(error.message || "Unable to create booking.");

            if (go) {
                go.disabled = false;
                go.textContent = originalButtonText;
            }
        }
    }

    // Load seats for selected showtime
    async function loadSeats() {
        try {
            if (!showtimeId) {
                throw new Error("Showtime ID is missing from the URL.");
            }

            box.innerHTML = "<p>Loading seats...</p>";

            // GET /api/showtimes/:id/seats
            const result = await apiRequest(
                `/showtimes/${encodeURIComponent(showtimeId)}/seats`
            );

            if (!result.rows || result.rows.length === 0) {
                box.innerHTML = "<p>No seats available.</p>";
                return;
            }

            box.innerHTML = "";

            // Display seats row by row
            result.rows.forEach(row => {
                const rowContainer = document.createElement("div");
                rowContainer.className = "seat-row";

                const rowLabel = document.createElement("span");
                rowLabel.className = "row-label";
                rowLabel.textContent = row.label;

                rowContainer.appendChild(rowLabel);

                row.seats.forEach(seat => {
                    const seatName = row.label + seat.number;

                    const button = document.createElement("button");

                    button.type = "button";
                    button.textContent = seat.number;
                    button.setAttribute("aria-label", "Seat " + seatName);
                    button.className = "seat";

                    // Disable seats already held or sold
                    if (seat.status !== "available") {
                        button.disabled = true;
                        button.classList.add("unavailable");
                        button.title = seat.status;
                    }

                    // Select or deselect seat
                    button.addEventListener("click", function () {
                        if (sel.has(seat.id)) {
                            sel.delete(seat.id);
                            button.classList.remove("sel");
                        } else {
                            if (sel.size >= 8) {
                                alert("You can select a maximum of 8 seats.");
                                return;
                            }

                            sel.set(seat.id, {
                                id: seat.id,
                                label: seatName,
                                price: Number(seat.price)
                            });

                            button.classList.add("sel");
                        }

                        update();
                    });

                    rowContainer.appendChild(button);
                });

                box.appendChild(rowContainer);
            });

            update();

        } catch (error) {
            console.error("Seat loading error:", error);

            box.innerHTML =
                "<p>Unable to load seats: " + error.message + "</p>";
        }
    }

    // Connect Continue button to booking creation
    if (go) {
        go.addEventListener("click", function (event) {
            event.preventDefault();
            createBooking();
        });
    }

    // Start
    loadSeats();

})();

