document.addEventListener("DOMContentLoaded", () => {
    const root = document.documentElement;

    /* ============================================================
     * Theme: light/dark mode + accent scheme selection
     * The palette itself lives in tokens.css; JS only flips
     * data-theme / data-accent attributes and persists the choice.
     * ============================================================ */

    const themeToggle = document.getElementById("themeToggle");
    const themeToggleIcon = themeToggle.querySelector(".material-symbols-outlined");
    const menuButton = document.getElementById("themeMenuButton");
    const menu = document.getElementById("themeMenu");
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');

    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

    const getMode = () => localStorage.getItem("md3-mode") || "system";
    const getAccent = () => root.getAttribute("data-accent") || "orange";

    const isDarkEffective = () => {
        const mode = getMode();
        return mode === "dark" || (mode === "system" && prefersDark.matches);
    };

    const updateThemeColor = () => {
        if (!themeColorMeta) return;
        const surface = getComputedStyle(root)
            .getPropertyValue("--md-sys-color-surface")
            .trim();
        if (surface) themeColorMeta.setAttribute("content", surface);
    };

    const syncMenuChecks = () => {
        const mode = getMode();
        const accent = getAccent();
        menu.querySelectorAll("[data-mode]").forEach((item) => {
            item.setAttribute("aria-checked", String(item.dataset.mode === mode));
        });
        menu.querySelectorAll("[data-accent]").forEach((item) => {
            item.setAttribute("aria-checked", String(item.dataset.accent === accent));
        });
    };

    const applyTheme = () => {
        const dark = isDarkEffective();
        root.setAttribute("data-theme", dark ? "dark" : "light");
        themeToggleIcon.textContent = dark ? "light_mode" : "dark_mode";
        updateThemeColor();
        syncMenuChecks();
    };

    // Quick toggle: flips between light and dark (leaves "system" mode)
    themeToggle.addEventListener("click", () => {
        localStorage.setItem("md3-mode", isDarkEffective() ? "light" : "dark");
        applyTheme();
    });

    // Follow the OS while the mode is set to "system"
    prefersDark.addEventListener("change", () => {
        if (getMode() === "system") applyTheme();
    });

    // Settings menu
    const closeMenu = () => {
        menu.hidden = true;
        menuButton.setAttribute("aria-expanded", "false");
    };

    const openMenu = () => {
        menu.hidden = false;
        menuButton.setAttribute("aria-expanded", "true");
        syncMenuChecks();
    };

    menuButton.addEventListener("click", (event) => {
        event.stopPropagation();
        menu.hidden ? openMenu() : closeMenu();
    });

    document.addEventListener("click", (event) => {
        if (!menu.hidden && !menu.contains(event.target) && event.target !== menuButton) {
            closeMenu();
        }
    });

    menu.querySelectorAll("[data-mode]").forEach((item) => {
        item.addEventListener("click", () => {
            localStorage.setItem("md3-mode", item.dataset.mode);
            applyTheme();
            closeMenu();
        });
    });

    menu.querySelectorAll("[data-accent]").forEach((item) => {
        item.addEventListener("click", () => {
            root.setAttribute("data-accent", item.dataset.accent);
            localStorage.setItem("md3-accent", item.dataset.accent);
            updateThemeColor();
            syncMenuChecks();
            closeMenu();
        });
    });

    applyTheme();

    /* ============================================================
     * App bar: elevation on scroll (level 0 -> level 2)
     * ============================================================ */

    const topAppBar = document.getElementById("topAppBar");
    const onScroll = () => {
        topAppBar.classList.toggle("is-scrolled", window.scrollY > 4);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    /* ============================================================
     * Navigation: scroll spy -> selected nav item indicator
     * ============================================================ */

    const navItems = Array.from(document.querySelectorAll(".nav-item"));
    const sections = navItems
        .map((item) => document.querySelector(item.getAttribute("href")))
        .filter(Boolean);

    if (sections.length && "IntersectionObserver" in window) {
        const spy = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    navItems.forEach((item) => {
                        item.classList.toggle(
                            "is-active",
                            item.getAttribute("href") === `#${entry.target.id}`
                        );
                    });
                });
            },
            { rootMargin: "-30% 0px -60% 0px" }
        );
        sections.forEach((section) => spy.observe(section));
    }

    /* ============================================================
     * Entrance motion: emphasized decelerate fade-up (400ms)
     * ============================================================ */

    const revealTargets = document.querySelectorAll(".reveal");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reducedMotion || !("IntersectionObserver" in window)) {
        revealTargets.forEach((el) => el.classList.add("is-visible"));
    } else {
        const revealObserver = new IntersectionObserver(
            (entries, observer) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                });
            },
            { rootMargin: "0px 0px -8% 0px", threshold: 0.1 }
        );
        revealTargets.forEach((el) => revealObserver.observe(el));
    }

    /* ============================================================
     * 3D viewer: basic dialog behavior + model-viewer controls
     * ============================================================ */

    const modal = document.getElementById("modelModal");
    const closeButton = document.getElementById("viewerClose");
    const viewer = document.getElementById("viewer");
    const viewerTitle = document.getElementById("viewerTitle");
    const view3DButtons = document.querySelectorAll(".view-3d-btn");
    const resetViewBtn = document.getElementById("resetView");
    const toggleRotateBtn = document.getElementById("toggleRotate");
    const rotateIcon = document.getElementById("rotateIcon");
    const rotateLabel = document.getElementById("rotateLabel");
    const fullscreenBtn = document.getElementById("toggleFullscreen");
    const loading = document.getElementById("viewerLoading");
    const progress = document.getElementById("viewerProgress");
    const progressBar = progress.parentElement;

    let isAutoRotate = true;
    let lastFocusedElement = null;

    const setProgress = (value) => {
        const percent = Math.round(value * 100);
        progress.style.width = `${percent}%`;
        progressBar.setAttribute("aria-valuenow", String(percent));
    };

    const openModal = () => {
        modal.hidden = false;
        document.body.style.overflow = "hidden";
        closeButton.focus();
    };

    const closeModal = () => {
        modal.hidden = true;
        document.body.style.overflow = "";
        viewer.removeAttribute("src");
        viewer.removeAttribute("poster");
        setProgress(0);
        loading.classList.remove("is-visible");
        if (lastFocusedElement) lastFocusedElement.focus();
    };

    view3DButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            const modelUrl = btn.getAttribute("data-model") || "";
            const posterUrl = btn.getAttribute("data-poster") || "";

            if (!/\.(glb|gltf)$/i.test(modelUrl)) {
                alert("Поддерживаются только .glb и .gltf для встроенного просмотра");
                return;
            }

            lastFocusedElement = btn;
            viewerTitle.textContent = btn.getAttribute("data-title") || "3D модель";

            loading.classList.add("is-visible");
            setProgress(0.08);

            if (posterUrl) {
                viewer.setAttribute("poster", posterUrl);
            }

            viewer.setAttribute("src", modelUrl);
            viewer.cameraOrbit = "45deg 75deg auto";
            viewer.cameraTarget = "auto auto auto";
            viewer.fieldOfView = "35deg";
            openModal();
        });
    });

    viewer.addEventListener("progress", (event) => {
        setProgress(event.detail.totalProgress || 0);
    });

    viewer.addEventListener("load", () => {
        loading.classList.remove("is-visible");
        setProgress(1);
        viewer.jumpCameraToGoal();
    });

    viewer.addEventListener("error", () => {
        loading.classList.remove("is-visible");
        alert("Не удалось загрузить 3D модель");
    });

    resetViewBtn.addEventListener("click", () => {
        viewer.cameraOrbit = "45deg 75deg auto";
        viewer.cameraTarget = "auto auto auto";
        viewer.fieldOfView = "35deg";
        viewer.jumpCameraToGoal();
    });

    toggleRotateBtn.addEventListener("click", () => {
        isAutoRotate = !isAutoRotate;
        if (isAutoRotate) {
            viewer.setAttribute("auto-rotate", "");
            rotateIcon.textContent = "pause";
            rotateLabel.textContent = "Пауза вращения";
        } else {
            viewer.removeAttribute("auto-rotate");
            rotateIcon.textContent = "play_arrow";
            rotateLabel.textContent = "Включить вращение";
        }
    });

    fullscreenBtn.addEventListener("click", async () => {
        if (!document.fullscreenElement) {
            await modal.requestFullscreen?.();
        } else {
            await document.exitFullscreen?.();
        }
    });

    closeButton.addEventListener("click", closeModal);

    modal.addEventListener("click", (event) => {
        if (event.target === modal) closeModal();
    });

    window.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        if (!menu.hidden) {
            closeMenu();
            menuButton.focus();
            return;
        }
        if (!modal.hidden) closeModal();
    });
});
