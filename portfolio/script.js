document.addEventListener('DOMContentLoaded', function() {

    // --- Particle.js Configuration ---
    // Using a different ID to avoid conflicts if both pages were ever combined
    particlesJS('particles-js-cs', {
        "particles": {
            "number": { "value": 60, "density": { "enable": true, "value_area": 800 } },
            "color": { "value": "#8b949e" },
            "shape": { "type": "circle" },
            "opacity": { "value": 0.4, "random": true, "anim": { "enable": true, "speed": 1, "opacity_min": 0.1, "sync": false } },
            "size": { "value": 3, "random": true },
            "line_linked": { "enable": true, "distance": 150, "color": "#30363d", "opacity": 0.4, "width": 1 },
            "move": { "enable": true, "speed": 2, "direction": "none", "out_mode": "out" }
        },
        "interactivity": {
            "detect_on": "canvas",
            "events": { "onhover": { "enable": true, "mode": "grab" }, "resize": true },
            "modes": { "grab": { "distance": 140, "line_opacity": 1 } }
        },
        "retina_detect": true
    });


    // --- Countdown Timer Logic ---

    // !!! IMPORTANT: Set your target launch date here !!!
    // Format: "Month Day, Year HH:MM:SS" (e.g., "Jan 1, 2026 00:00:00")
    const launchDate = new Date("Jan 1, 2026 00:00:00").getTime();

    const countdownFunction = setInterval(function() {
        const now = new Date().getTime();
        const distance = launchDate - now;

        // Time calculations for days, hours, minutes and seconds
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        // Get elements
        const daysEl = document.getElementById("days");
        const hoursEl = document.getElementById("hours");
        const minutesEl = document.getElementById("minutes");
        const secondsEl = document.getElementById("seconds");

        // Update HTML
        daysEl.innerHTML = String(days).padStart(2, '0');
        hoursEl.innerHTML = String(hours).padStart(2, '0');
        minutesEl.innerHTML = String(minutes).padStart(2, '0');
        secondsEl.innerHTML = String(seconds).padStart(2, '0');

        // Add a small animation to the seconds digit for an interactive feel
        secondsEl.classList.add('animate');
        setTimeout(() => secondsEl.classList.remove('animate'), 500);


        // If the countdown is over, display a message
        if (distance < 0) {
            clearInterval(countdownFunction);
            document.getElementById("countdown").innerHTML = `<div class="cs-subheadline" style="width:100%;">This page has now launched!</div>`;
        }
    }, 1000);

});
