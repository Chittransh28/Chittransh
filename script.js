document.addEventListener('DOMContentLoaded', function() {

    // --- Particle.js Configuration ---
    particlesJS('particles-js', {
        "particles": {
            "number": {
                "value": 60, // Number of particles
                "density": {
                    "enable": true,
                    "value_area": 800
                }
            },
            "color": {
                "value": "#8b949e" // Particle color
            },
            "shape": {
                "type": "circle",
                "stroke": {
                    "width": 0,
                    "color": "#000000"
                }
            },
            "opacity": {
                "value": 0.4,
                "random": true,
                "anim": {
                    "enable": true,
                    "speed": 1,
                    "opacity_min": 0.1,
                    "sync": false
                }
            },
            "size": {
                "value": 3,
                "random": true,
                "anim": {
                    "enable": false
                }
            },
            "line_linked": {
                "enable": true,
                "distance": 150,
                "color": "#30363d", // Line color
                "opacity": 0.4,
                "width": 1
            },
            "move": {
                "enable": true,
                "speed": 2,
                "direction": "none",
                "random": false,
                "straight": false,
                "out_mode": "out",
                "bounce": false,
            }
        },
        "interactivity": {
            "detect_on": "canvas",
            "events": {
                "onhover": {
                    "enable": true,
                    "mode": "grab" // 'grab' or 'repulse'
                },
                "onclick": {
                    "enable": false,
                    "mode": "push"
                },
                "resize": true
            },
            "modes": {
                "grab": {
                    "distance": 140,
                    "line_opacity": 1
                },
                "repulse": {
                    "distance": 200,
                    "duration": 0.4
                }
            }
        },
        "retina_detect": true
    });


    // --- Typewriter Effect ---
    const headline = document.querySelector('.headline');
    const text = "chittransh.in";
    let index = 0;

    function type() {
        if (index < text.length) {
            headline.textContent += text.charAt(index);
            index++;
            setTimeout(type, 150); // Speed of typing
        }
    }

    // Start the typing effect when the page loads
    type();
});
