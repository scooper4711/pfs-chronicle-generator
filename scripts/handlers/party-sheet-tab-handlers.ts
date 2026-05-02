/**
 * Party Sheet Tab Handlers
 *
 * Manages the injected "Society" tab on the party sheet: tab creation,
 * Foundry Tabs controller rebinding, and UI state preservation (active tab,
 * scroll positions, focus state) across re-renders.
 *
 * Extracted from main.ts to keep files under 500 lines.
 *
 * Requirements: party-chronicle-filling 1.1, 1.2, starfinder-support 2.2
 */

import { debug } from '../utils/logger.js';
import { renderPartyChronicleForm } from './form-initialization.js';
import type { PartyActor, PartySheetApp } from './event-listener-helpers.js';

/**
 * Tracks the last active tab on the party sheet so we can restore it across
 * re-renders. Foundry's Tabs controller resets to the `initial` tab ("overview")
 * whenever the sheet re-renders from template, because the injected "pfs" tab
 * doesn't exist in the template.
 */
let lastActivePartyTab: string | null = null;

interface ScrollSnapshot {
    tab: number;
    sidebar: number;
    content: number;
}
let savedScrollPositions: ScrollSnapshot | null = null;

interface FocusSnapshot {
    elementId: string;
    selectionStart: number | null;
    selectionEnd: number | null;
}
let savedFocusState: FocusSnapshot | null = null;

/** Restores previously-saved scroll positions after the Society tab is rebuilt. */
function restoreScrollPositions(html: JQuery): void {
    if (!savedScrollPositions) return;

    const pfsTab = html.find('.tab[data-tab="pfs"]');
    if (pfsTab.length === 0) return;

    pfsTab[0].scrollTop = savedScrollPositions.tab;

    const sidebar = pfsTab.find('.sidebar')[0];
    if (sidebar) sidebar.scrollTop = savedScrollPositions.sidebar;

    const content = pfsTab.find('.content')[0];
    if (content) content.scrollTop = savedScrollPositions.content;

    debug('Restored Society tab scroll positions');
}

/** Restores focus to the previously-focused element after the Society tab is rebuilt. */
function restoreFocusState(html: JQuery): void {
    if (!savedFocusState) return;

    const snapshot = savedFocusState;
    const pfsTab = html.find('.tab[data-tab="pfs"]');
    if (pfsTab.length === 0) return;

    requestAnimationFrame(() => {
        const element = pfsTab[0].querySelector<HTMLElement>(`#${CSS.escape(snapshot.elementId)}`);
        if (!element) return;

        element.focus();

        if (
            (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) &&
            snapshot.selectionStart !== null
        ) {
            element.setSelectionRange(snapshot.selectionStart, snapshot.selectionEnd);
        }

        debug(`Restored focus to #${snapshot.elementId}`);
    });
}

/**
 * Re-binds the Foundry AppV1 Tabs controller after injecting a new tab,
 * then restores the tab the GM was actually on before the re-render.
 */
function rebindTabController(app: PartySheetApp, html: JQuery): void {
    const tabControllers = (app as any)._tabs;
    if (!Array.isArray(tabControllers) || tabControllers.length === 0) {
        debug('No _tabs controllers found on party sheet app; skipping rebind.');
        return;
    }

    const tabController = tabControllers[0];
    tabController.bind(html[0]);

    const tabToRestore = lastActivePartyTab || tabController.active;
    tabController.activate(tabToRestore);
    debug(`Rebound tab controller; active tab restored to "${tabToRestore}".`);
}

/** Installs a click listener on the tab nav to track which tab the GM selects. */
function trackTabClicks(html: JQuery): void {
    const subNav = html.find('nav.sub-nav');
    subNav.on('click', '[data-tab]', function () {
        const tab = $(this).data('tab') as string;
        if (tab) {
            lastActivePartyTab = tab;
            debug(`Tracked active party tab: "${tab}"`);
        }
    });
}

/** Installs scroll listeners on the Society tab's scrollable elements. */
function trackScrollPositions(html: JQuery): void {
    const pfsTab = html.find('.tab[data-tab="pfs"]');
    if (pfsTab.length === 0) return;

    pfsTab[0].addEventListener('scroll', () => {
        savedScrollPositions = savedScrollPositions || { tab: 0, sidebar: 0, content: 0 };
        savedScrollPositions.tab = pfsTab[0].scrollTop;
    });

    const sidebar = pfsTab.find('.sidebar')[0];
    if (sidebar) {
        sidebar.addEventListener('scroll', () => {
            savedScrollPositions = savedScrollPositions || { tab: 0, sidebar: 0, content: 0 };
            savedScrollPositions.sidebar = sidebar.scrollTop;
        });
    }

    const content = pfsTab.find('.content')[0];
    if (content) {
        content.addEventListener('scroll', () => {
            savedScrollPositions = savedScrollPositions || { tab: 0, sidebar: 0, content: 0 };
            savedScrollPositions.content = content.scrollTop;
        });
    }
}

/** Installs focusin/focusout listeners on the Society tab to track focus state. */
function trackFocusState(html: JQuery): void {
    const pfsTab = html.find('.tab[data-tab="pfs"]');
    if (pfsTab.length === 0) return;

    const updateSelection = (target: HTMLElement): void => {
        if (!target.id) return;
        savedFocusState = {
            elementId: target.id,
            selectionStart: (target as HTMLInputElement).selectionStart ?? null,
            selectionEnd: (target as HTMLInputElement).selectionEnd ?? null,
        };
    };

    pfsTab[0].addEventListener('focusin', (event: FocusEvent) => {
        updateSelection(event.target as HTMLElement);
    });

    for (const eventName of ['keyup', 'click', 'select'] as const) {
        pfsTab[0].addEventListener(eventName, (event: Event) => {
            const target = event.target as HTMLElement;
            if (target.id && document.activeElement === target) {
                updateSelection(target);
            }
        });
    }
}

/**
 * Handles party sheet rendering for both PF2e and SF2e systems.
 * Injects a GM-only "Society" tab into the party sheet.
 *
 * Requirements: party-chronicle-filling 1.1, 1.2, starfinder-support 2.2
 */
export function handlePartySheetRender(app: PartySheetApp, html: JQuery): void {
    if (!game.user.isGM) return;

    const subNav = html.find('nav.sub-nav');
    if (subNav.length === 0) return;

    if (subNav.find('[data-tab="pfs"]').length > 0) return;

    const pfsTabButton = $(`<a data-tab="pfs">Society</a>`);

    const inventoryTab = subNav.find('[data-tab="inventory"]');
    if (inventoryTab.length > 0) {
        inventoryTab.after(pfsTabButton);
    } else {
        subNav.append(pfsTabButton);
    }

    const container = html.find('section.container');
    if (container.length === 0) return;

    const pfsTab = $(`<div class="tab" data-tab="pfs"></div>`);
    container.append(pfsTab);

    rebindTabController(app, html);
    trackTabClicks(html);

    const partyActors = app.actor?.members || [];
    const characterActors = partyActors.filter((actor: PartyActor) => {
        if (actor?.type !== 'character') return false;
        const traits = actor.system?.traits?.value || [];
        return !traits.some(t => t === 'minion' || t === 'eidolon');
    });
    
    if (characterActors.length === 0) {
        pfsTab.html(`
            <div style="padding: 2rem; text-align: center;">
                <p>No party members found. Add characters to the party first.</p>
            </div>
        `);
    } else {
        renderPartyChronicleForm(pfsTab[0], characterActors, app).then(() => {
            restoreScrollPositions(html);
            restoreFocusState(html);
            trackScrollPositions(html);
            trackFocusState(html);
        });
    }
}
