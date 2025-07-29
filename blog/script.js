document.addEventListener('DOMContentLoaded', () => {
    // --- Particle.js Background ---
    particlesJS('particles-js-blog', {  
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

    const searchInput = document.getElementById('search-input');
    const postGrid = document.getElementById('post-grid');
    const postCards = postGrid.querySelectorAll('.post-card');
    const tagsContainer = document.getElementById('tags-container');

    function filterPosts() {
        const searchQuery = searchInput.value.toLowerCase();
        const activeTag = tagsContainer.querySelector('.tag-filter.active').dataset.tag;

        postCards.forEach(card => {
            const title = card.querySelector('.card-title').textContent.toLowerCase();
            const excerpt = card.querySelector('.card-excerpt').textContent.toLowerCase();
            const tags = card.dataset.tags.toLowerCase();

            const searchMatch = title.includes(searchQuery) || excerpt.includes(searchQuery);
            const tagMatch = activeTag === 'all' || tags.includes(activeTag);

            if (searchMatch && tagMatch) {
                card.classList.remove('hidden');
            } else {
                card.classList.add('hidden');
            }
        });
    }

    // Event listener for the search input
    searchInput.addEventListener('keyup', filterPosts);

    // Event listener for tag filters
    tagsContainer.addEventListener('click', e => {
        if (e.target.classList.contains('tag-filter')) {
            tagsContainer.querySelector('.active').classList.remove('active');
            e.target.classList.add('active');
            filterPosts();
        }
    });
});
