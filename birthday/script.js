document.addEventListener('DOMContentLoaded', () => {

    // --- GSAP SETUP ---
    gsap.registerPlugin(ScrollTrigger);

    // --- INTRO ANIMATION ---
    gsap.from('.main-title', { duration: 1, y: -50, opacity: 0, ease: 'bounce' });
    gsap.from('#welcome p', { duration: 1.2, y: 50, opacity: 0, delay: 0.5 });

    // --- ENHANCED SECTION FADE-IN ANIMATIONS ---
    const sections = document.querySelectorAll('.scroll-section');
    sections.forEach(section => {
        // Animate the main content of the section (text, cards, gallery)
        const contentToAnimate = section.querySelector('p, .cards-container, .photo-gallery');
        
        if (contentToAnimate) {
            gsap.from(contentToAnimate, {
                scrollTrigger: {
                    trigger: section,
                    start: 'top 85%', // Start animation sooner
                },
                y: 100, // Increased distance
                opacity: 0,
                rotation: -3, // Added subtle rotation
                duration: 1.5, // Slower duration
                ease: 'power2.out'
            });
        }
    });

    // --- INTERACTIVE CARDS (SECTION 3) ---
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            card.classList.toggle('flipped');
        });
    });

    // --- PHOTO GALLERY & LIGHTBOX (SECTION 4) ---
    const galleryImages = document.querySelectorAll('.gallery-img');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeBtn = document.querySelector('.close-btn');

    galleryImages.forEach(img => {
        img.addEventListener('click', () => {
            lightbox.classList.add('active');
            lightboxImg.src = img.src;
        });
    });

    const closeLightbox = () => {
        lightbox.classList.remove('active');
    };

    closeBtn.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => {
        if (e.target !== lightboxImg) {
            closeLightbox();
        }
    });

    // --- FINAL TYPING TEXT ANIMATION ---
    const typingTextElement = document.getElementById('typing-text');
    const textToType = "Here’s to a year filled with hope, joy, and endless positivity. Keep smiling, and keep being the amazing, incredible person that you are. Happy Birthday once again!";
    
    ScrollTrigger.create({
        trigger: typingTextElement,
        start: 'top 80%',
        onEnter: () => typeWriter(typingTextElement, textToType, 0),
        once: true
    });

    function typeWriter(element, text, i) {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(() => typeWriter(element, text, i), 45);
        }
    }
});
