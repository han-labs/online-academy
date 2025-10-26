// Initialize Bootstrap tooltips
document.addEventListener('DOMContentLoaded', function() {
    // ============================================
    // HERO SLIDESHOW ENHANCEMENT
    // ============================================
    const carousel = document.querySelector('#featuredCarousel');
    if (carousel) {
        // Pause on hover
        carousel.addEventListener('mouseenter', function() {
            const bsCarousel = bootstrap.Carousel.getInstance(carousel);
            if (bsCarousel) {
                bsCarousel.pause();
            }
        });

        // Resume on mouse leave
        carousel.addEventListener('mouseleave', function() {
            const bsCarousel = bootstrap.Carousel.getInstance(carousel);
            if (bsCarousel) {
                bsCarousel.cycle();
            }
        });

        // Swipe support for mobile
        let touchStartX = 0;
        let touchEndX = 0;

        carousel.addEventListener('touchstart', function(e) {
            touchStartX = e.changedTouches[0].screenX;
        });

        carousel.addEventListener('touchend', function(e) {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        });

        function handleSwipe() {
            const bsCarousel = bootstrap.Carousel.getInstance(carousel);
            if (touchEndX < touchStartX - 50) {
                // Swipe left
                bsCarousel.next();
            }
            if (touchEndX > touchStartX + 50) {
                // Swipe right
                bsCarousel.prev();
            }
        }

        // Keyboard navigation
        document.addEventListener('keydown', function(e) {
            const bsCarousel = bootstrap.Carousel.getInstance(carousel);
            if (!bsCarousel) return;

            if (e.key === 'ArrowLeft') {
                bsCarousel.prev();
            } else if (e.key === 'ArrowRight') {
                bsCarousel.next();
            }
        });
    }

    // ============================================
    // TOOLTIPS & ALERTS
    // ============================================
    // Initialize tooltips
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => 
        new bootstrap.Tooltip(tooltipTriggerEl)
    );

    // Auto-dismiss alerts
    const alerts = document.querySelectorAll('.alert:not(.alert-permanent)');
    alerts.forEach(alert => {
        setTimeout(() => {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }, 5000);
    });

    // ============================================
    // SCROLL TO TOP
    // ============================================
    const scrollToTopBtn = document.getElementById('scrollToTop');
    if (scrollToTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 300) {
                scrollToTopBtn.style.display = 'block';
            } else {
                scrollToTopBtn.style.display = 'none';
            }
        });

        scrollToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // ============================================
    // SEARCH VALIDATION
    // ============================================
    const searchForms = document.querySelectorAll('form[action*="/search"]');
    searchForms.forEach(form => {
        form.addEventListener('submit', (e) => {
            const input = form.querySelector('input[name="q"]');
            if (input && input.value.trim().length > 0 && input.value.trim().length < 2) {
                e.preventDefault();
                alert('Vui lòng nhập ít nhất 2 ký tự để tìm kiếm');
                input.focus();
            }
        });
    });

    // ============================================
    // LOADING BUTTONS
    // ============================================
    const loadingButtons = document.querySelectorAll('.btn-loading');
    loadingButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            this.disabled = true;
            const originalText = this.innerHTML;
            this.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang xử lý...';
            
            setTimeout(() => {
                this.disabled = false;
                this.innerHTML = originalText;
            }, 3000);
        });
    });

    // ============================================
    // COURSE CARD ANIMATIONS
    // ============================================
    const courseCards = document.querySelectorAll('.card');
    courseCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.classList.add('fade-in');
        });
    });

    // ============================================
    // LAZY LOADING IMAGES
    // ============================================
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    observer.unobserve(img);
                }
            });
        });

        document.querySelectorAll('img.lazy').forEach(img => {
            imageObserver.observe(img);
        });
    }
});

// ============================================
// UTILITY FUNCTIONS
// ============================================
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Search autocomplete (placeholder for future enhancement)
function initSearchAutocomplete() {
    const searchInput = document.querySelector('input[name="q"]');
    if (!searchInput) return;

    searchInput.addEventListener('input', debounce(function(e) {
        const query = e.target.value.trim();
        if (query.length >= 2) {
            // TODO: Implement autocomplete suggestions
            console.log('Search query:', query);
        }
    }, 300));
}

// Initialize on load
initSearchAutocomplete();