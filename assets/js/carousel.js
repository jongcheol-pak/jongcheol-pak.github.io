document.addEventListener('DOMContentLoaded', function () {
    const slides = document.querySelectorAll('.hero-slide');
    if (slides.length === 0) return;

    let currentSlide = 0;
    const intervalTime = 4000; // Faster, snappier

    function nextSlide() {
        // Hard switch, no fade
        slides[currentSlide].style.opacity = '0';
        slides[currentSlide].style.zIndex = '0';

        currentSlide = (currentSlide + 1) % slides.length;

        slides[currentSlide].style.opacity = '1';
        slides[currentSlide].style.zIndex = '1';
    }

    // Initialize first slide
    slides[0].style.opacity = '1';
    slides[0].style.zIndex = '1';

    // Start rotation
    setInterval(nextSlide, intervalTime);
});
