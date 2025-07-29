document.addEventListener('DOMContentLoaded', () => {
    // --- Particle.js Background ---
    particlesJS('particles-js-post', { /* ... Paste your particles.js config from previous files here ... */ });

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
