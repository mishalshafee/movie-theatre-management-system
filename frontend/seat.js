
  // Seat map: loads the physical seat layout from the backend.
  const box = $("seats");

  if (box) {
    const PRICE = 20;
    const SHOW = "Midnight Opera · Sat 7 Nov, 7:30 PM";
    const sel = new Set(read().seats);
    const go = $("go");

    const update = () => {
      $("list").textContent = [...sel].join(", ") || "None";
      $("total").textContent = money(sel.size * PRICE);

      go.setAttribute("aria-disabled", sel.size ? "false" : "true");

      sessionStorage.setItem(
        KEY,
        JSON.stringify({
          show: SHOW,
          price: PRICE,
          seats: [...sel]
        })
      );
    };

    async function loadSeats() {
      try {
        box.innerHTML = "<p>Loading seats...</p>";

        // Get all screens
        const result = await apiRequest("/screens");

        if (!result.data || result.data.length === 0) {
          box.innerHTML = "<p>No screens found.</p>";
          return;
        }

        // Automatically select the first screen
        const screenId = result.data[0].id;

        // Get the selected screen and its seat layout
        const screenResult = await apiRequest("/screens/" + screenId);

        const screen = screenResult.screen;

        if (!screen || !screen.rows) {
          box.innerHTML = "<p>Seat layout not available.</p>";
          return;
        }

        box.innerHTML = "";

        screen.rows.forEach(row => {
          row.seats.forEach(seat => {
            const seatName = row.label + seat.number;

            const button = document.createElement("button");
            button.type = "button";
            button.textContent = seatName;
            button.setAttribute("aria-label", "Seat " + seatName);

            button.className = "seat";

            if (sel.has(seatName)) {
              button.classList.add("sel");
            }

            button.onclick = () => {
              if (sel.has(seatName)) {
                sel.delete(seatName);
                button.classList.remove("sel");
              } else {
                sel.add(seatName);
                button.classList.add("sel");
              }

              update();
            };

            box.append(button);
          });
        });

        update();

      } catch (error) {
        console.error("Seat loading error:", error);
        box.innerHTML = "<p>Unable to load seats. Please try again.</p>";
      }
    }

    loadSeats();
  }
