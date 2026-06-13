(function () {
  const STYLE_ID = "mc-data-preview-scroll-style";

  function findPreviewViewport(target) {
    if (!(target instanceof Element)) return null;

    const dialog = target.closest("[role='dialog']");
    if (!dialog || !dialog.querySelector("table")) return null;

    return dialog.querySelector("[data-radix-scroll-area-viewport]");
  }

  function enableWheelScroll() {
    window.addEventListener(
      "wheel",
      (event) => {
        const viewport = findPreviewViewport(event.target);
        if (!viewport) return;

        const canScrollY = viewport.scrollHeight > viewport.clientHeight;
        const canScrollX = viewport.scrollWidth > viewport.clientWidth;
        if (!canScrollY && !canScrollX) return;

        viewport.scrollTop += event.deltaY;
        viewport.scrollLeft += event.deltaX;
        event.preventDefault();
        event.stopPropagation();
      },
      { capture: true, passive: false }
    );
  }

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      [role="dialog"] [data-radix-scroll-area-viewport] {
        overflow: auto !important;
        max-height: calc(85vh - 170px) !important;
        scrollbar-width: thin !important;
        scrollbar-color: rgba(6, 182, 212, 0.75) rgba(148, 163, 184, 0.22) !important;
        overscroll-behavior: contain;
      }

      [role="dialog"] [data-radix-scroll-area-viewport] > div {
        min-width: max-content !important;
      }

      [role="dialog"] [data-radix-scroll-area-viewport]::-webkit-scrollbar {
        width: 10px !important;
        height: 10px !important;
        display: block !important;
      }

      [role="dialog"] [data-radix-scroll-area-viewport]::-webkit-scrollbar-track {
        background: rgba(148, 163, 184, 0.22) !important;
        border-radius: 999px !important;
      }

      [role="dialog"] [data-radix-scroll-area-viewport]::-webkit-scrollbar-thumb {
        background: rgba(6, 182, 212, 0.75) !important;
        border-radius: 999px !important;
      }
    `;
    document.head.appendChild(style);
  }

  addStyles();
  enableWheelScroll();
})();
