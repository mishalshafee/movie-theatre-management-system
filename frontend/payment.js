
(function () {
    const KEY = "showbook.booking";

    const money = amount => "$" + amount.toFixed(2);

    const read = () => {
        try {
            return JSON.parse(sessionStorage.getItem(KEY)) || { seats: [] };
        } catch {
            return { seats: [] };
        }
    };

    // Payment: order summary from the chosen seats.
    const b = read();
    const n = b.seats.length;
    const sub = n * (b.price || 20);
    const fee = n ? 2 : 0;

    const sumSeats = document.getElementById("sum-seats");

    if (sumSeats) {
        document.getElementById("sum-show").textContent =
            b.show || "No show selected";

        sumSeats.textContent = n
            ? "Seats " + b.seats.join(", ")
            : "No seats selected";

        document.getElementById("sum-sub").textContent = money(sub);
        document.getElementById("sum-fee").textContent = money(fee);
        document.getElementById("sum-total").textContent = money(sub + fee);
    }
})();
