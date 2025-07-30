document.addEventListener('DOMContentLoaded', () => {
    // --- Particle.js Background ---
     particlesJS('particles-js-post', {  
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
    const progressBar = document.getElementById('progress-bar');
    const postContent = document.querySelector('.post-content');
    const tocList = document.getElementById('toc-list');
    const headings = postContent.querySelectorAll('h2');

    // --- 1. Reading Progress Bar ---
    function updateProgressBar() {
        const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
        if(scrollHeight > clientHeight){
            const scrollPercent = (scrollTop / (scrollHeight - clientHeight)) * 100;
            progressBar.style.width = `${scrollPercent}%`;
        }
    }
    window.addEventListener('scroll', updateProgressBar);

    // --- 2. Table of Contents Generation and Highlighting ---
    // Generate ToC
    headings.forEach(h2 => {
        const id = h2.id;
        if (id) {
            const listItem = document.createElement('li');
            const link = document.createElement('a');
            link.href = `#${id}`;
            link.textContent = h2.textContent;
            listItem.appendChild(link);
            tocList.appendChild(listItem);
        }
    });

    // Highlight ToC link on scroll
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            const id = entry.target.getAttribute('id');
            const tocLink = tocList.querySelector(`a[href="#${id}"]`);
            if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
                document.querySelectorAll('.toc-container a.active').forEach(a => a.classList.remove('active'));
                tocLink.classList.add('active');
            }
        });
    }, { rootMargin: '0px 0px -40% 0px', threshold: 0.6 });

    headings.forEach(h2 => observer.observe(h2));

    // --- 3. Copy Button for Code Blocks ---
    const codeBlocks = document.querySelectorAll('pre');
    codeBlocks.forEach(block => {
        const code = block.querySelector('code');
        const button = document.createElement('button');
        button.className = 'code-copy-button';
        button.innerHTML = '<i class="fa-solid fa-copy"></i> Copy';
        block.appendChild(button);

        button.addEventListener('click', () => {
            navigator.clipboard.writeText(code.innerText).then(() => {
                button.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
                setTimeout(() => {
                    button.innerHTML = '<i class="fa-solid fa-copy"></i> Copy';
                }, 2000);
            });
        });
    });
});
