/**
 * Unit tests for sidebar resize handlers
 *
 * Tests the drag-to-resize functionality for the shared rewards sidebar,
 * including listener attachment, mouse interaction, width clamping, and
 * width persistence across re-renders.
 *
 * @jest-environment jsdom
 */

import {
    getSavedSidebarWidth,
    restoreSidebarWidth,
    attachSidebarResizeListener
} from '../../scripts/handlers/sidebar-resize-handlers';

/** Builds a minimal DOM container with a sidebar and resize handle. */
function buildContainer(sidebarWidth = 300): HTMLElement {
    const container = document.createElement('div');
    const sidebar = document.createElement('aside');
    sidebar.classList.add('sidebar');
    // jsdom doesn't compute layout, so stub getBoundingClientRect
    sidebar.getBoundingClientRect = () => ({
        width: sidebarWidth,
        height: 0, top: 0, left: 0, right: sidebarWidth, bottom: 0,
        x: 0, y: 0, toJSON: () => ({})
    });

    const handle = document.createElement('div');
    handle.classList.add('sidebar-resize-handle');

    container.appendChild(sidebar);
    container.appendChild(handle);
    return container;
}

/** Dispatches a MouseEvent on the given target. */
function fireMouseEvent(
    target: EventTarget,
    type: string,
    clientX: number
): void {
    const event = new MouseEvent(type, { clientX, bubbles: true });
    target.dispatchEvent(event);
}

describe('sidebar-resize-handlers', () => {
    // Reset the module-level savedSidebarWidth between tests by
    // re-importing a fresh module. Since jest caches modules, we use
    // a workaround: call restoreSidebarWidth on a container without a
    // sidebar (no-op) and then verify getSavedSidebarWidth.
    // The actual reset happens via the drag interaction in each test.

    describe('getSavedSidebarWidth', () => {
        it('returns null when no resize has occurred', () => {
            // Fresh module import — no drag has happened yet
            // We rely on the module being freshly loaded for the test suite
            expect(getSavedSidebarWidth()).toBeNull();
        });
    });

    describe('restoreSidebarWidth', () => {
        it('does nothing when savedSidebarWidth is null', () => {
            const container = buildContainer();
            const sidebar = container.querySelector<HTMLElement>('.sidebar')!;

            restoreSidebarWidth(container);

            // No inline styles should be set
            expect(sidebar.style.width).toBe('');
        });

        it('does nothing when container has no sidebar', () => {
            const container = document.createElement('div');
            // Should not throw
            restoreSidebarWidth(container);
        });

        it('applies saved width after a drag has occurred', () => {
            const container = buildContainer(300);
            const handle = container.querySelector('.sidebar-resize-handle')!;

            attachSidebarResizeListener(container);

            // Simulate drag: start at 100, move to 150 (+50px)
            fireMouseEvent(handle, 'mousedown', 100);
            fireMouseEvent(document, 'mouseup', 150);

            // Now restore on a fresh container
            const freshContainer = buildContainer();
            const freshSidebar = freshContainer.querySelector<HTMLElement>('.sidebar')!;

            restoreSidebarWidth(freshContainer);

            expect(freshSidebar.style.width).toBe('350px');
            expect(freshSidebar.style.minWidth).toBe('350px');
            expect(freshSidebar.style.maxWidth).toBe('350px');
        });
    });

    describe('attachSidebarResizeListener', () => {
        it('does nothing when handle is missing', () => {
            const container = document.createElement('div');
            container.appendChild(document.createElement('aside'));
            container.querySelector('aside')!.classList.add('sidebar');

            // Should not throw
            attachSidebarResizeListener(container);
        });

        it('does nothing when sidebar is missing', () => {
            const container = document.createElement('div');
            const handle = document.createElement('div');
            handle.classList.add('sidebar-resize-handle');
            container.appendChild(handle);

            // Should not throw
            attachSidebarResizeListener(container);
        });

        it('updates sidebar width during mousemove', () => {
            const container = buildContainer(300);
            const handle = container.querySelector('.sidebar-resize-handle')!;
            const sidebar = container.querySelector<HTMLElement>('.sidebar')!;

            attachSidebarResizeListener(container);

            fireMouseEvent(handle, 'mousedown', 100);
            fireMouseEvent(document, 'mousemove', 180);

            expect(sidebar.style.width).toBe('380px');
            expect(sidebar.style.minWidth).toBe('380px');
            expect(sidebar.style.maxWidth).toBe('380px');

            // Clean up
            fireMouseEvent(document, 'mouseup', 180);
        });

        it('clamps width to minimum of 250px', () => {
            const container = buildContainer(300);
            const handle = container.querySelector('.sidebar-resize-handle')!;
            const sidebar = container.querySelector<HTMLElement>('.sidebar')!;

            attachSidebarResizeListener(container);

            // Drag left by 200px (300 - 200 = 100, below min)
            fireMouseEvent(handle, 'mousedown', 300);
            fireMouseEvent(document, 'mousemove', 100);

            expect(sidebar.style.width).toBe('250px');

            fireMouseEvent(document, 'mouseup', 100);
            expect(getSavedSidebarWidth()).toBe(250);
        });

        it('clamps width to maximum of 600px', () => {
            const container = buildContainer(300);
            const handle = container.querySelector('.sidebar-resize-handle')!;
            const sidebar = container.querySelector<HTMLElement>('.sidebar')!;

            attachSidebarResizeListener(container);

            // Drag right by 500px (300 + 500 = 800, above max)
            fireMouseEvent(handle, 'mousedown', 100);
            fireMouseEvent(document, 'mousemove', 600);

            expect(sidebar.style.width).toBe('600px');

            fireMouseEvent(document, 'mouseup', 600);
            expect(getSavedSidebarWidth()).toBe(600);
        });

        it('sets cursor and userSelect on body during drag', () => {
            const container = buildContainer(300);
            const handle = container.querySelector('.sidebar-resize-handle')!;

            attachSidebarResizeListener(container);

            fireMouseEvent(handle, 'mousedown', 100);

            expect(document.body.style.cursor).toBe('col-resize');
            expect(document.body.style.userSelect).toBe('none');

            fireMouseEvent(document, 'mouseup', 150);

            expect(document.body.style.cursor).toBe('');
            expect(document.body.style.userSelect).toBe('');
        });

        it('removes document listeners after mouseup', () => {
            const container = buildContainer(300);
            const handle = container.querySelector('.sidebar-resize-handle')!;
            const sidebar = container.querySelector<HTMLElement>('.sidebar')!;

            attachSidebarResizeListener(container);

            fireMouseEvent(handle, 'mousedown', 100);
            fireMouseEvent(document, 'mouseup', 150);

            // Further mousemove should not change sidebar width
            sidebar.style.width = '';
            fireMouseEvent(document, 'mousemove', 300);

            expect(sidebar.style.width).toBe('');
        });

        it('persists final width in savedSidebarWidth on mouseup', () => {
            const container = buildContainer(300);
            const handle = container.querySelector('.sidebar-resize-handle')!;

            attachSidebarResizeListener(container);

            fireMouseEvent(handle, 'mousedown', 100);
            fireMouseEvent(document, 'mouseup', 200);

            expect(getSavedSidebarWidth()).toBe(400);
        });

        it('prevents default on mousedown', () => {
            const container = buildContainer(300);
            const handle = container.querySelector('.sidebar-resize-handle')!;

            attachSidebarResizeListener(container);

            const event = new MouseEvent('mousedown', { clientX: 100, bubbles: true, cancelable: true });
            const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
            handle.dispatchEvent(event);

            expect(preventDefaultSpy).toHaveBeenCalled();

            // Clean up
            fireMouseEvent(document, 'mouseup', 100);
        });
    });
});
