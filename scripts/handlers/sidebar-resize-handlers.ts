/**
 * Sidebar Resize Handlers
 *
 * Provides drag-to-resize functionality for the shared rewards sidebar.
 * The user can drag the vertical divider between the sidebar and the
 * character card content area to adjust the sidebar width.
 */

const SIDEBAR_MIN_WIDTH = 250;
const SIDEBAR_MAX_WIDTH = 600;
const SIDEBAR_SELECTOR = '.sidebar';
const RESIZE_HANDLE_SELECTOR = '.sidebar-resize-handle';

/** Module-level width so the chosen size survives Foundry re-renders. */
let savedSidebarWidth: number | null = null;

/** Returns the last user-chosen sidebar width, if any. */
export function getSavedSidebarWidth(): number | null {
    return savedSidebarWidth;
}

/**
 * Applies the persisted sidebar width to the DOM (called after each render).
 *
 * @param container - The party chronicle form container
 */
export function restoreSidebarWidth(container: HTMLElement): void {
    if (savedSidebarWidth === null) return;

    const sidebar = container.querySelector<HTMLElement>(SIDEBAR_SELECTOR);
    if (!sidebar) return;

    sidebar.style.width = `${savedSidebarWidth}px`;
    sidebar.style.minWidth = `${savedSidebarWidth}px`;
    sidebar.style.maxWidth = `${savedSidebarWidth}px`;
}

/**
 * Attaches mousedown listener to the resize handle that enables
 * drag-to-resize behaviour on the sidebar.
 *
 * @param container - The party chronicle form container
 */
export function attachSidebarResizeListener(container: HTMLElement): void {
    const handle = container.querySelector<HTMLElement>(RESIZE_HANDLE_SELECTOR);
    const sidebar = container.querySelector<HTMLElement>(SIDEBAR_SELECTOR);
    if (!handle || !sidebar) return;

    handle.addEventListener('mousedown', (startEvent: MouseEvent) => {
        startEvent.preventDefault();

        const startX = startEvent.clientX;
        const startWidth = sidebar.getBoundingClientRect().width;

        function onMouseMove(moveEvent: MouseEvent): void {
            const delta = moveEvent.clientX - startX;
            const newWidth = Math.min(
                SIDEBAR_MAX_WIDTH,
                Math.max(SIDEBAR_MIN_WIDTH, startWidth + delta)
            );

            sidebar!.style.width = `${newWidth}px`;
            sidebar!.style.minWidth = `${newWidth}px`;
            sidebar!.style.maxWidth = `${newWidth}px`;
        }

        function onMouseUp(upEvent: MouseEvent): void {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';

            // Persist the final width so it survives re-renders
            const delta = upEvent.clientX - startX;
            savedSidebarWidth = Math.min(
                SIDEBAR_MAX_WIDTH,
                Math.max(SIDEBAR_MIN_WIDTH, startWidth + delta)
            );
        }

        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
}
