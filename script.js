/* -------------------------------------------------------------------------- */
/* IHA RESTAURANT — INTERACTIVE UI SCRIPT                                     */
/* -------------------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {

    // 0. Force Browser Refresh to Always Land on Home Page (Scroll Top)
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);

    if (window.location.hash) {
        history.replaceState(null, null, window.location.pathname + window.location.search);
    }

    // 1. Preloader Handler
    const preloader = document.getElementById('preloader');
    if (preloader) {
        window.addEventListener('load', () => {
            window.scrollTo(0, 0);
            setTimeout(() => {
                preloader.classList.add('hidden');
                window.scrollTo(0, 0);
            }, 600);
        });
        // Backup timeout
        setTimeout(() => {
            preloader.classList.add('hidden');
        }, 2000);
    }

    // 2. Navbar Scroll background & Active Link Spy
    const navbar = document.getElementById('navbar');
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', () => {
        // Sticky blur effect
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        // Active section spy
        let currentSectionId = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 120;
            const sectionHeight = section.offsetHeight;
            if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
                currentSectionId = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${currentSectionId}`) {
                link.classList.add('active');
            }
        });
    });

    // 3. Mobile Navigation Menu Toggle
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const navMenu = document.getElementById('navMenu');
    const navBackdrop = document.getElementById('navBackdrop');
    const drawerReserveBtn = document.getElementById('drawerReserveBtn');
    const drawerCloseBtn = document.getElementById('drawerCloseBtn');

    const closeNavDrawer = () => {
        if (navMenu) navMenu.classList.remove('active');
        if (hamburgerBtn) hamburgerBtn.classList.remove('active');
        if (navBackdrop) navBackdrop.classList.remove('active');
        document.body.classList.remove('menu-open');
    };

    const toggleNavDrawer = () => {
        if (!navMenu || !hamburgerBtn) return;
        const isActive = navMenu.classList.toggle('active');
        hamburgerBtn.classList.toggle('active', isActive);
        if (navBackdrop) navBackdrop.classList.toggle('active', isActive);
        document.body.classList.toggle('menu-open', isActive);
    };

    if (hamburgerBtn && navMenu) {
        hamburgerBtn.addEventListener('click', toggleNavDrawer);

        if (drawerCloseBtn) {
            drawerCloseBtn.addEventListener('click', closeNavDrawer);
        }

        if (navBackdrop) {
            navBackdrop.addEventListener('click', closeNavDrawer);
        }

        navLinks.forEach(link => {
            link.addEventListener('click', closeNavDrawer);
        });

        if (drawerReserveBtn) {
            drawerReserveBtn.addEventListener('click', closeNavDrawer);
        }
    }

    // 4. Signatures Dish Carousel Controls & Infinite Continuous Autoplay
    const sigCarousel = document.getElementById('sigCarousel');
    const sigPrevBtn = document.getElementById('sigPrevBtn');
    const sigNextBtn = document.getElementById('sigNextBtn');

    if (sigCarousel && sigPrevBtn && sigNextBtn) {
        const originalCards = Array.from(sigCarousel.querySelectorAll('.signature-card'));
        const originalCount = originalCards.length;

        if (originalCount > 0) {
            // Clone cards: 1 set appended to end, 1 set prepended to start for continuous infinite loop
            originalCards.forEach(card => {
                const clone = card.cloneNode(true);
                clone.setAttribute('aria-hidden', 'true');
                clone.classList.add('carousel-clone');
                sigCarousel.appendChild(clone);
            });

            originalCards.slice().reverse().forEach(card => {
                const clone = card.cloneNode(true);
                clone.setAttribute('aria-hidden', 'true');
                clone.classList.add('carousel-clone');
                sigCarousel.insertBefore(clone, sigCarousel.firstChild);
            });
        }

        const getScrollStep = () => {
            const card = sigCarousel.querySelector('.signature-card');
            if (!card) return 364;
            const style = window.getComputedStyle(sigCarousel);
            const gap = parseFloat(style.gap) || 24;
            return card.offsetWidth + gap;
        };

        const getSingleSetWidth = () => {
            return originalCount * getScrollStep();
        };

        // Initialize scroll position to the main set (after the prepended clones)
        const initScrollPos = () => {
            const setWidth = getSingleSetWidth();
            if (setWidth > 0) {
                sigCarousel.scrollTo({ left: setWidth, behavior: 'instant' });
            }
        };

        // Position on next paint
        requestAnimationFrame(() => {
            initScrollPos();
            setTimeout(initScrollPos, 100);
        });

        window.addEventListener('resize', () => {
            initScrollPos();
        });

        let isNormalizing = false;

        const checkInfiniteBounds = () => {
            if (isNormalizing) return;
            const singleSet = getSingleSetWidth();
            if (singleSet <= 0) return;

            // If we've scrolled into the post-clones past the original set
            if (sigCarousel.scrollLeft >= singleSet * 2 - 10) {
                isNormalizing = true;
                sigCarousel.scrollTo({
                    left: sigCarousel.scrollLeft - singleSet,
                    behavior: 'instant'
                });
                setTimeout(() => { isNormalizing = false; }, 60);
            }
            // If we've scrolled back into the pre-clones
            else if (sigCarousel.scrollLeft <= singleSet - getScrollStep() + 10) {
                isNormalizing = true;
                sigCarousel.scrollTo({
                    left: sigCarousel.scrollLeft + singleSet,
                    behavior: 'instant'
                });
                setTimeout(() => { isNormalizing = false; }, 60);
            }
        };

        const scrollNext = () => {
            checkInfiniteBounds();
            const step = getScrollStep();
            sigCarousel.scrollBy({ left: step, behavior: 'smooth' });
            setTimeout(checkInfiniteBounds, 520);
        };

        const scrollPrev = () => {
            checkInfiniteBounds();
            const step = getScrollStep();
            sigCarousel.scrollBy({ left: -step, behavior: 'smooth' });
            setTimeout(checkInfiniteBounds, 520);
        };

        // Button Controls
        sigNextBtn.addEventListener('click', () => {
            scrollNext();
            resetAutoPlay();
        });

        sigPrevBtn.addEventListener('click', () => {
            scrollPrev();
            resetAutoPlay();
        });

        // Autoplay Loop (Moves forward every 2.8 seconds)
        let autoPlayTimer = null;
        const autoPlayDelay = 2800;

        const startAutoPlay = () => {
            if (autoPlayTimer) clearInterval(autoPlayTimer);
            autoPlayTimer = setInterval(scrollNext, autoPlayDelay);
        };

        const stopAutoPlay = () => {
            if (autoPlayTimer) {
                clearInterval(autoPlayTimer);
                autoPlayTimer = null;
            }
        };

        const resetAutoPlay = () => {
            stopAutoPlay();
            startAutoPlay();
        };

        // Start autoplay on load
        startAutoPlay();

        // Pause autoplay on hover or touch so user can examine or interact comfortably
        const carouselWrapper = sigCarousel.closest('.carousel-wrapper') || sigCarousel;
        carouselWrapper.addEventListener('mouseenter', stopAutoPlay);
        carouselWrapper.addEventListener('mouseleave', startAutoPlay);
        carouselWrapper.addEventListener('touchstart', stopAutoPlay, { passive: true });
        carouselWrapper.addEventListener('touchend', () => {
            setTimeout(startAutoPlay, 1200);
        });

        // Listen for scroll end to seamlessly normalize positions without visual jump
        if ('onscrollend' in window) {
            sigCarousel.addEventListener('scrollend', checkInfiniteBounds);
        }

        let scrollTimeout = null;
        sigCarousel.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(checkInfiniteBounds, 120);
        }, { passive: true });

        // Mouse Drag to Scroll
        let isDown = false;
        let startX;
        let scrollLeft;

        sigCarousel.addEventListener('mousedown', (e) => {
            isDown = true;
            stopAutoPlay();
            startX = e.pageX - sigCarousel.offsetLeft;
            scrollLeft = sigCarousel.scrollLeft;
        });

        sigCarousel.addEventListener('mouseleave', () => {
            isDown = false;
            startAutoPlay();
        });

        sigCarousel.addEventListener('mouseup', () => {
            isDown = false;
            startAutoPlay();
            checkInfiniteBounds();
        });

        sigCarousel.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - sigCarousel.offsetLeft;
            const walk = (x - startX) * 1.8;
            sigCarousel.scrollLeft = scrollLeft - walk;
        });
    }

    // 5. Menu Category Tab Filter & Full Menu Toggle with Dietary Filter (Non-Veg / Veg)
    const dietBtns = document.querySelectorAll('.diet-btn');
    const menuItems = document.querySelectorAll('.menu-item');
    const menuSubgroups = document.querySelectorAll('.menu-subgroup');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const menuPanels = document.querySelectorAll('.menu-category-panel');
    const openFullMenuBtn = document.getElementById('openFullMenuBtn');
    let isFullMenuOpen = false;
    let currentDiet = 'nonveg';

    function applyDietaryFilter(diet) {
        currentDiet = diet;

        // 1. Filter individual menu items
        menuItems.forEach(item => {
            const itemDiet = item.getAttribute('data-diet');
            if (diet === 'all' || itemDiet === diet || itemDiet === 'both') {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });

        // 2. Hide or show subgroups based on whether they have visible items
        menuSubgroups.forEach(subgroup => {
            const visibleItems = subgroup.querySelectorAll('.menu-item:not([style*="display: none"])');
            if (visibleItems.length > 0) {
                subgroup.style.display = '';
            } else {
                subgroup.style.display = 'none';
            }
        });

        // 3. Update category tabs: hide tab button if category has 0 visible items
        tabBtns.forEach(btn => {
            const cat = btn.getAttribute('data-category');
            const panel = document.getElementById(`cat-${cat}`);
            if (panel) {
                const visibleInPanel = panel.querySelectorAll('.menu-item:not([style*="display: none"])');
                if (visibleInPanel.length === 0) {
                    btn.style.display = 'none';
                } else {
                    btn.style.display = '';
                }
            }
        });

        // 4. If current active tab is now hidden (e.g. was on Biriyani and user tapped Veg):
        const activeTab = document.querySelector('#menuTabs .tab-btn.active');
        if (activeTab && activeTab.style.display === 'none') {
            const firstVisibleTab = Array.from(tabBtns).find(btn => btn.style.display !== 'none');
            if (firstVisibleTab) {
                firstVisibleTab.click();
            }
        }
    }

    if (dietBtns.length) {
        dietBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const diet = btn.getAttribute('data-diet');
                dietBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                applyDietaryFilter(diet);
            });
        });

        // Apply initial filter: NON-VEG first as requested
        applyDietaryFilter('nonveg');
    }

    if (tabBtns.length && menuPanels.length) {
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const category = btn.getAttribute('data-category');
                isFullMenuOpen = false;

                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                if (openFullMenuBtn) {
                    openFullMenuBtn.innerHTML = 'VIEW FULL MENU <span class="arrow">&rarr;</span>';
                }

                menuPanels.forEach(panel => {
                    panel.classList.remove('active');
                    if (panel.getAttribute('id') === `cat-${category}`) {
                        panel.classList.add('active');
                    }
                });
            });
        });
    }

    if (openFullMenuBtn) {
        openFullMenuBtn.addEventListener('click', () => {
            isFullMenuOpen = !isFullMenuOpen;

            if (isFullMenuOpen) {
                // Expand and display all menu categories simultaneously
                menuPanels.forEach(panel => panel.classList.add('active'));
                tabBtns.forEach(b => b.classList.remove('active'));
                openFullMenuBtn.innerHTML = 'COLLAPSE MENU <span class="arrow">&uarr;</span>';
            } else {
                // Collapse back to Starters category
                menuPanels.forEach((panel, idx) => {
                    if (idx === 0) panel.classList.add('active');
                    else panel.classList.remove('active');
                });
                tabBtns.forEach((b, idx) => {
                    if (idx === 0) b.classList.add('active');
                    else b.classList.remove('active');
                });
                openFullMenuBtn.innerHTML = 'VIEW FULL MENU <span class="arrow">&rarr;</span>';
            }

            const menuDisplay = document.querySelector('.menu-display-area');
            if (menuDisplay) {
                menuDisplay.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }

    // 6. Gallery Filter Tabs
    const gTabBtns = document.querySelectorAll('.g-tab-btn');
    const galleryCards = document.querySelectorAll('.gallery-card');

    function applyGalleryFilter(filter) {
        galleryCards.forEach(card => {
            if (filter === 'all' || card.classList.contains(filter)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    // Initialize gallery filter to match the initially active tab (e.g. food)
    const initialActiveTab = document.querySelector('.g-tab-btn.active');
    if (initialActiveTab) {
        applyGalleryFilter(initialActiveTab.getAttribute('data-filter'));
    }

    gTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.getAttribute('data-filter');

            gTabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            applyGalleryFilter(filter);
        });
    });

    // 7. Lightbox Modal Handler
    const lightboxModal = document.getElementById('lightboxModal');
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxCaption = document.getElementById('lightboxCaption');
    const closeLightboxBtn = document.getElementById('closeLightboxBtn');
    const closeLightboxBg = document.getElementById('closeLightboxBg');

    const triggerElements = document.querySelectorAll('.lightbox-trigger, .gallery-card');

    triggerElements.forEach(item => {
        item.addEventListener('click', () => {
            const imgSrc = item.getAttribute('data-img');
            const caption = item.getAttribute('data-caption') || '';

            if (imgSrc && lightboxModal) {
                lightboxImg.src = imgSrc;
                lightboxCaption.textContent = caption;
                lightboxModal.classList.add('active');
                lightboxModal.setAttribute('aria-hidden', 'false');
            }
        });
    });

    function closeLightbox() {
        if (lightboxModal) {
            lightboxModal.classList.remove('active');
            lightboxModal.setAttribute('aria-hidden', 'true');
        }
    }

    if (closeLightboxBtn) closeLightboxBtn.addEventListener('click', closeLightbox);
    if (closeLightboxBg) closeLightboxBg.addEventListener('click', closeLightbox);

    // 8. Reservation & Celebration Modals
    const reservationModal = document.getElementById('reservationModal');
    const celebrationModal = document.getElementById('celebrationModal');
    const eventModal = document.getElementById('eventModal');

    const openReserveBtns = document.querySelectorAll('#openReserveModalBtn, .modal-trigger-btn');
    const closeReserveModalBtn = document.getElementById('closeReserveModalBtn');
    const closeReserveModalBg = document.getElementById('closeReserveModalBg');

    const openCelebrationModalBtn = document.getElementById('openCelebrationModalBtn');
    const closeCelebrationModalBtn = document.getElementById('closeCelebrationModalBtn');
    const closeCelebrationModalBg = document.getElementById('closeCelebrationModalBg');
    const celebrationCards = document.querySelectorAll('.celebration-card');
    const celOccasionSelect = document.getElementById('celOccasion');

    openReserveBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (reservationModal) {
                reservationModal.classList.add('active');
                reservationModal.setAttribute('aria-hidden', 'false');
            }
        });
    });

    function closeReservationModal() {
        if (reservationModal) {
            reservationModal.classList.remove('active');
            reservationModal.setAttribute('aria-hidden', 'true');
        }
    }

    if (closeReserveModalBtn) closeReserveModalBtn.addEventListener('click', closeReservationModal);
    if (closeReserveModalBg) closeReserveModalBg.addEventListener('click', closeReservationModal);

    function openCelebration(occasionType) {
        if (celebrationModal) {
            if (celOccasionSelect && occasionType) {
                for (let i = 0; i < celOccasionSelect.options.length; i++) {
                    if (celOccasionSelect.options[i].value.toLowerCase().includes(occasionType.toLowerCase())) {
                        celOccasionSelect.selectedIndex = i;
                        break;
                    }
                }
            }
            celebrationModal.classList.add('active');
            celebrationModal.setAttribute('aria-hidden', 'false');
        }
    }

    function closeCelebrationModal() {
        if (celebrationModal) {
            celebrationModal.classList.remove('active');
            celebrationModal.setAttribute('aria-hidden', 'true');
        }
    }

    if (openCelebrationModalBtn) {
        openCelebrationModalBtn.addEventListener('click', () => openCelebration('Birthday'));
    }

    celebrationCards.forEach(card => {
        card.addEventListener('click', () => {
            const occasion = card.getAttribute('data-occasion') || 'Birthday';
            openCelebration(occasion);
        });
    });

    if (closeCelebrationModalBtn) closeCelebrationModalBtn.addEventListener('click', closeCelebrationModal);
    if (closeCelebrationModalBg) closeCelebrationModalBg.addEventListener('click', closeCelebrationModal);

    const openEventModalBtn = document.getElementById('openEventModalBtn');
    const closeEventModalBtn = document.getElementById('closeEventModalBtn');
    const closeEventModalBg = document.getElementById('closeEventModalBg');

    if (openEventModalBtn && eventModal) {
        openEventModalBtn.addEventListener('click', () => {
            eventModal.classList.add('active');
            eventModal.setAttribute('aria-hidden', 'false');
        });
    }

    function closeEventModal() {
        if (eventModal) {
            eventModal.classList.remove('active');
            eventModal.setAttribute('aria-hidden', 'true');
        }
    }

    if (closeEventModalBtn) closeEventModalBtn.addEventListener('click', closeEventModal);
    if (closeEventModalBg) closeEventModalBg.addEventListener('click', closeEventModal);

    // Review Scanner Modal Handler
    const reviewModal = document.getElementById('reviewModal');
    const openReviewModalBtns = document.querySelectorAll('#openReviewModalBtn, .review-modal-trigger-btn');
    const closeReviewModalBtn = document.getElementById('closeReviewModalBtn');
    const closeReviewModalBg = document.getElementById('closeReviewModalBg');

    function openReviewModal() {
        const targetModal = reviewModal || document.getElementById('reviewModal');
        if (targetModal) {
            targetModal.classList.add('active');
            targetModal.setAttribute('aria-hidden', 'false');
        }
    }

    function closeReviewModal() {
        const targetModal = reviewModal || document.getElementById('reviewModal');
        if (targetModal) {
            targetModal.classList.remove('active');
            targetModal.setAttribute('aria-hidden', 'true');
        }
    }

    // Expose globally for inline onclick handlers
    window.openReviewModal = openReviewModal;
    window.closeReviewModal = closeReviewModal;

    openReviewModalBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            openReviewModal();
        });
    });

    if (closeReviewModalBtn) closeReviewModalBtn.addEventListener('click', closeReviewModal);
    if (closeReviewModalBg) closeReviewModalBg.addEventListener('click', closeReviewModal);

    // Close Modals on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeReservationModal();
            closeCelebrationModal();
            closeEventModal();
            closeReviewModal();
            if (typeof closeLightbox === 'function') closeLightbox();
        }
    });

    // 9. Form Submission Toast Feedback
    const toast = document.getElementById('toastNotification');
    const toastText = document.getElementById('toastText');

    function showToast(message) {
        if (toast && toastText) {
            toastText.textContent = message;
            toast.classList.add('active');
            setTimeout(() => {
                toast.classList.remove('active');
            }, 4000);
        }
    }

    // Helper for PHP Form Submissions
    async function handleFormSubmit(form, formType, onComplete) {
        const phoneInput = form.querySelector('input[name="phone"]');
        if (phoneInput) {
            const rawPhone = phoneInput.value.trim();
            const cleanPhone = rawPhone.replace(/[\s\-\(\)\.]/g, '');
            const isValid = /^(?:\+?91|0)?[6-9]\d{9}$/.test(cleanPhone);
            if (!isValid) {
                showToast('Please enter a valid 10-digit mobile number (e.g. 76958 67096).');
                phoneInput.focus();
                return;
            }
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = 'SENDING... <span class="arrow">&rarr;</span>';
        }

        const formData = new FormData(form);
        formData.append('form_type', formType);

        try {
            const response = await fetch('send_mail.php', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                showToast(result.message || 'Submitted successfully!');
                form.reset();
                setupDateInputs();
                if (typeof onComplete === 'function') {
                    onComplete();
                }
            } else {
                showToast(result.message || 'Something went wrong. Please try again.');
            }
        } catch (error) {
            console.error('Form submission error:', error);
            showToast('Unable to connect to server. Please check your PHP server setup.');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnHtml;
            }
        }
    }

    const inlineForm = document.getElementById('inlineReservationForm');
    const modalForm = document.getElementById('modalReservationForm');
    const eventForm = document.getElementById('eventForm');

    if (inlineForm) {
        inlineForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleFormSubmit(inlineForm, 'reservation');
        });
    }

    if (modalForm) {
        modalForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleFormSubmit(modalForm, 'reservation', closeReservationModal);
        });
    }

    const celebrationForm = document.getElementById('celebrationForm');
    if (celebrationForm) {
        celebrationForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleFormSubmit(celebrationForm, 'celebration', closeCelebrationModal);
        });
    }

    if (eventForm) {
        eventForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleFormSubmit(eventForm, 'event', closeEventModal);
        });
    }

    // Set & Restrict Date Inputs to Prevent Past Date Selection
    function setupDateInputs() {
        const todayStr = new Date().toISOString().split('T')[0];
        const dateInputs = document.querySelectorAll('input[type="date"]');

        dateInputs.forEach(dateInput => {
            dateInput.min = todayStr;
            if (!dateInput.value || dateInput.value < todayStr) {
                dateInput.value = todayStr;
            }

            dateInput.addEventListener('change', () => {
                if (dateInput.value && dateInput.value < todayStr) {
                    showToast('Please select today or a future date.');
                    dateInput.value = todayStr;
                }
            });
        });
    }

    setupDateInputs();

    // --------------------------------------------------------------------------
    // 10. DYNAMIC CUSTOM CURSOR & MAGNIFYING LENS WITH HOVER TEXT
    // --------------------------------------------------------------------------
    const customCursor = document.getElementById('customCursor');
    const cursorFollower = document.getElementById('cursorFollower');
    const cursorText = document.getElementById('cursorText');

    let mouseX = 0, mouseY = 0;
    let cursorX = 0, cursorY = 0;
    let followerX = 0, followerY = 0;
    let prevMouseX = 0, prevMouseY = 0;
    let leafAngle = 0;
    let targetAngle = 0;

    window.addEventListener('mousemove', (e) => {
        const dx = e.clientX - prevMouseX;
        if (Math.abs(dx) > 0.5) {
            targetAngle = Math.max(-14, Math.min(14, dx * 0.6));
        }
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    function animateCursor() {
        // Smooth interpolation
        cursorX += (mouseX - cursorX) * 0.8;
        cursorY += (mouseY - cursorY) * 0.8;

        followerX += (mouseX - followerX) * 0.22;
        followerY += (mouseY - followerY) * 0.22;

        leafAngle += (targetAngle - leafAngle) * 0.12;
        targetAngle *= 0.9; // smoothly settles upright

        if (customCursor) {
            customCursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0) translate(-50%, -50%)`;
        }

        if (cursorFollower) {
            cursorFollower.style.transform = `translate3d(${followerX}px, ${followerY}px, 0) translate(-50%, -50%) rotate(${leafAngle}deg)`;
        }

        requestAnimationFrame(animateCursor);
    }
    animateCursor();

    // Hover Elements Detection for Dynamic Cursor Badge
    const hoverElements = document.querySelectorAll('a, button, .signature-card, .masonry-item, .gallery-card, .way-card, .occasion-item, [data-cursor-text]');

    hoverElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
            if (!cursorFollower) return;
            cursorFollower.classList.add('active');

            let text = el.getAttribute('data-cursor-text');
            if (!text) {
                const href = el.getAttribute('href') || '';
                if (href.startsWith('tel:')) text = 'CALL';
                else if (href.includes('wa.me') || href.includes('whatsapp')) text = 'TAP TO CHAT';
                else if (href.startsWith('mailto:')) text = 'MAIL TO IHA';
                else if (el.classList.contains('nav-link')) text = el.textContent.trim();
                else if (el.classList.contains('masonry-item') || el.classList.contains('gallery-card')) text = 'VIEW';
                else if (el.classList.contains('signature-card')) text = 'TASTE';
                else if (el.tagName === 'BUTTON') text = 'EXPLORE';
                else text = 'EXPLORE';
            }

            if (cursorText) cursorText.textContent = text;
        });

        el.addEventListener('mouseleave', () => {
            if (cursorFollower) cursorFollower.classList.remove('active');
        });
    });

    // --------------------------------------------------------------------------
    // 11. ANIMATED BOTANICAL LEAF PARTICLES CANVAS (SWAYING & FALLING LEAVES)
    // --------------------------------------------------------------------------
    const canvas = document.getElementById('leafCanvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;

        window.addEventListener('resize', () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        });

        const leafCount = 18;
        const leaves = [];

        // Create Leaf Particle Objects
        for (let i = 0; i < leafCount; i++) {
            leaves.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: 10 + Math.random() * 14,
                speedX: -0.3 + Math.random() * 0.6,
                speedY: 0.2 + Math.random() * 0.6,
                angle: Math.random() * Math.PI * 2,
                spinSpeed: (Math.random() - 0.5) * 0.02,
                opacity: 0.2 + Math.random() * 0.4,
                color: Math.random() > 0.4 ? '#426848' : '#d4af37'
            });
        }

        function drawLeaf(ctx, x, y, size, angle, color, opacity) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);
            ctx.globalAlpha = opacity;

            ctx.fillStyle = color;
            ctx.beginPath();
            // Draw stylized leaf curve
            ctx.moveTo(0, -size);
            ctx.bezierCurveTo(size * 0.6, -size * 0.3, size * 0.6, size * 0.5, 0, size);
            ctx.bezierCurveTo(-size * 0.6, size * 0.5, -size * 0.6, -size * 0.3, 0, -size);
            ctx.fill();

            // Leaf vein line
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, -size * 0.8);
            ctx.lineTo(0, size * 0.8);
            ctx.stroke();

            ctx.restore();
        }

        function renderLeaves() {
            ctx.clearRect(0, 0, width, height);

            leaves.forEach(leaf => {
                leaf.y += leaf.speedY;
                leaf.x += Math.sin(leaf.y * 0.01) * 0.8 + leaf.speedX;
                leaf.angle += leaf.spinSpeed;

                // Reset leaf when falling off-screen
                if (leaf.y > height + 20) {
                    leaf.y = -20;
                    leaf.x = Math.random() * width;
                }
                if (leaf.x > width + 20) leaf.x = -20;
                if (leaf.x < -20) leaf.x = width + 20;

                drawLeaf(ctx, leaf.x, leaf.y, leaf.size, leaf.angle, leaf.color, leaf.opacity);
            });

            requestAnimationFrame(renderLeaves);
        }

        renderLeaves();
    }
});

