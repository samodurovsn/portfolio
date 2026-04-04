document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("modelModal");
    const closeBtn = document.querySelector(".close-btn");
    const viewer = document.getElementById("viewer");
    const view3DButtons = document.querySelectorAll(".view-3d-btn");
    const resetViewBtn = document.getElementById("resetView");
    const toggleRotateBtn = document.getElementById("toggleRotate");
    const fullscreenBtn = document.getElementById("toggleFullscreen");
    const loading = document.getElementById("viewerLoading");
    const progress = document.getElementById("viewerProgress");

    let isAutoRotate = true;

    const openModal = () => {
        modal.style.display = "block";
        document.body.style.overflow = "hidden";
    };

    const closeModal = () => {
        modal.style.display = "none";
        document.body.style.overflow = "";
        viewer.removeAttribute("src");
        viewer.removeAttribute("poster");
        progress.style.width = "0%";
        loading.style.display = "none";
    };

    view3DButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            const modelUrl = btn.getAttribute("data-model") || "";
            const posterUrl = btn.getAttribute("data-poster") || "";

            if (!/\.(glb|gltf)$/i.test(modelUrl)) {
                alert("Поддерживаются только .glb и .gltf для встроенного просмотра");
                return;
            }

            loading.style.display = "flex";
            progress.style.width = "8%";

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
        const totalProgress = event.detail.totalProgress || 0;
        progress.style.width = `${Math.round(totalProgress * 100)}%`;
    });

    viewer.addEventListener("load", () => {
        loading.style.display = "none";
        progress.style.width = "100%";
        viewer.jumpCameraToGoal();
    });

    viewer.addEventListener("error", () => {
        loading.style.display = "none";
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
            toggleRotateBtn.textContent = "Пауза вращения";
        } else {
            viewer.removeAttribute("auto-rotate");
            toggleRotateBtn.textContent = "Включить вращение";
        }
    });

    fullscreenBtn.addEventListener("click", async () => {
        if (!document.fullscreenElement) {
            await modal.requestFullscreen?.();
        } else {
            await document.exitFullscreen?.();
        }
    });

    closeBtn.addEventListener("click", closeModal);

    window.addEventListener("click", (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });

    window.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && modal.style.display === "block") {
            closeModal();
        }
    });
});

