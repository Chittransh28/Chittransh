document.addEventListener('DOMContentLoaded', () => {
    // --- Particle.js Background ---
    particlesJS('particles-js-blog', { /* ... Paste your particles.js config from previous files here ... */ });

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
