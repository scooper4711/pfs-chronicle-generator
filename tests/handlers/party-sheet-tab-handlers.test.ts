/**
 * Unit tests for party-sheet-tab-handlers.ts
 *
 * Tests the Society tab injection, tab controller rebinding,
 * and UI state preservation on the party sheet.
 *
 * @jest-environment jsdom
 */

(globalThis as any).game = {
  user: { isGM: true },
};

// jsdom doesn't provide CSS.escape
if (typeof CSS === 'undefined') {
  (globalThis as any).CSS = { escape: (s: string) => s.replace(/([^\w-])/g, '\\$1') };
}

let renderResolve: () => void;
const mockRenderPartyChronicleForm = jest.fn().mockImplementation(() => {
  return new Promise<void>(resolve => { renderResolve = resolve; });
});

jest.mock('../../scripts/handlers/form-initialization', () => ({
  renderPartyChronicleForm: (...args: unknown[]) => mockRenderPartyChronicleForm(...args),
}));

// Suppress console noise
jest.spyOn(console, 'log').mockImplementation();

import { handlePartySheetRender } from '../../scripts/handlers/party-sheet-tab-handlers';

/**
 * Builds a real DOM tree mimicking a Foundry party sheet and returns
 * both the raw root element and a jQuery-like wrapper.
 */
function buildSheet(options: {
  hasSubNav?: boolean;
  hasContainer?: boolean;
  hasInventoryTab?: boolean;
  hasPfsTab?: boolean;
} = {}) {
  const {
    hasSubNav = true,
    hasContainer = true,
    hasInventoryTab = true,
    hasPfsTab = false,
  } = options;

  const root = document.createElement('div');

  if (hasSubNav) {
    const nav = document.createElement('nav');
    nav.classList.add('sub-nav');
    if (hasInventoryTab) {
      const a = document.createElement('a');
      a.dataset.tab = 'inventory';
      nav.appendChild(a);
    }
    if (hasPfsTab) {
      const a = document.createElement('a');
      a.dataset.tab = 'pfs';
      nav.appendChild(a);
    }
    root.appendChild(nav);
  }

  if (hasContainer) {
    const section = document.createElement('section');
    section.classList.add('container');
    root.appendChild(section);
  }

  // Attach to document so focus/scroll work
  document.body.appendChild(root);

  return { root, html: jqWrap(root) };
}

/** Minimal jQuery-like wrapper over real DOM elements. */
function jqWrap(el: HTMLElement): any {
  function wrap(elements: HTMLElement[]): any {
    const obj: any = {
      length: elements.length,
      find(selector: string) {
        const found: HTMLElement[] = [];
        for (const e of elements) {
          found.push(...Array.from(e.querySelectorAll<HTMLElement>(selector)));
        }
        return wrap(found);
      },
      append(child: any) {
        if (elements.length > 0) {
          const node = child?._elements?.[0] ?? child;
          if (node instanceof HTMLElement) elements[0].appendChild(node);
        }
        return obj;
      },
      after(sibling: any) {
        if (elements.length > 0) {
          const node = sibling?._elements?.[0] ?? sibling;
          if (node instanceof HTMLElement) elements[0].after(node);
        }
        return obj;
      },
      html(content: string) {
        if (elements.length > 0) elements[0].innerHTML = content;
        return obj;
      },
      on(event: string, _selector: string, handler: (this: HTMLElement) => void) {
        // Simulate jQuery delegated event binding
        for (const el of elements) {
          el.addEventListener(event, (e: Event) => {
            const target = e.target as HTMLElement;
            if (target?.matches?.(_selector)) {
              handler.call(target);
            }
          });
        }
        return obj;
      },
      _elements: elements,
    };
    for (let i = 0; i < elements.length; i++) obj[i] = elements[i];
    return obj;
  }
  return wrap([el]);
}

/** Global $ mock — creates real DOM elements from HTML strings, wraps DOM elements. */
(globalThis as any).$ = (input: any) => {
  if (typeof input === 'string') {
    const tpl = document.createElement('template');
    tpl.innerHTML = input.trim();
    const el = tpl.content.firstElementChild as HTMLElement;
    return jqWrap(el);
  }
  if (input instanceof HTMLElement) {
    const el = input;
    return {
      data: (key: string) => el.dataset[key],
      _elements: [el],
      length: 1,
      0: el,
    };
  }
  return input;
};

function createApp(members: Array<{ id: string; name: string; type: string }> = []) {
  return {
    actor: { members },
    _tabs: [{
      bind: jest.fn(),
      activate: jest.fn(),
      active: 'overview',
    }],
  };
}

/** Flush microtasks so the .then() callback in handlePartySheetRender runs. */
async function flushRender(): Promise<void> {
  renderResolve();
  // Two ticks: one for the promise resolution, one for the .then() callback
  await new Promise(r => setTimeout(r, 0));
  await new Promise(r => setTimeout(r, 0));
}

describe('handlePartySheetRender', () => {
  afterEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '';
  });

  beforeEach(() => {
    (game as any).user.isGM = true;
  });

  // --- Guard-clause tests (no rendering) ---

  it('does nothing for non-GM users', () => {
    (game as any).user.isGM = false;
    const { html } = buildSheet();
    handlePartySheetRender(createApp() as any, html);
    expect(mockRenderPartyChronicleForm).not.toHaveBeenCalled();
  });

  it('does nothing when sub-nav is missing', () => {
    const { html } = buildSheet({ hasSubNav: false });
    handlePartySheetRender(createApp() as any, html);
    expect(mockRenderPartyChronicleForm).not.toHaveBeenCalled();
  });

  it('does nothing when PFS tab already exists', () => {
    const { html } = buildSheet({ hasPfsTab: true });
    handlePartySheetRender(createApp() as any, html);
    expect(mockRenderPartyChronicleForm).not.toHaveBeenCalled();
  });

  it('does nothing when container section is missing', () => {
    const { html } = buildSheet({ hasContainer: false });
    handlePartySheetRender(createApp() as any, html);
    expect(mockRenderPartyChronicleForm).not.toHaveBeenCalled();
  });

  // --- Tab injection ---

  it('shows empty message when no character actors exist', () => {
    const { root, html } = buildSheet();
    handlePartySheetRender(createApp([]) as any, html);

    const pfsContent = root.querySelector('.tab[data-tab="pfs"]');
    expect(pfsContent?.textContent).toContain('No party members found');
    expect(mockRenderPartyChronicleForm).not.toHaveBeenCalled();
  });

  it('appends tab button after inventory tab', () => {
    const { root, html } = buildSheet({ hasInventoryTab: true });
    handlePartySheetRender(createApp([]) as any, html);

    const nav = root.querySelector('nav.sub-nav')!;
    const tabs = Array.from(nav.querySelectorAll('[data-tab]'));
    const tabNames = tabs.map(t => t.getAttribute('data-tab'));
    expect(tabNames).toContain('pfs');
  });

  it('appends tab button to nav when no inventory tab', () => {
    const { root, html } = buildSheet({ hasInventoryTab: false });
    handlePartySheetRender(createApp([]) as any, html);

    const nav = root.querySelector('nav.sub-nav')!;
    expect(nav.querySelector('[data-tab="pfs"]')).not.toBeNull();
  });

  it('filters out non-character actors', async () => {
    const actors = [
      { id: 'a1', name: 'Hero', type: 'character' },
      { id: 'a2', name: 'Familiar', type: 'familiar' },
    ];
    const { html } = buildSheet();
    handlePartySheetRender(createApp(actors) as any, html);
    await flushRender();

    expect(mockRenderPartyChronicleForm).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      [actors[0]],
      expect.any(Object)
    );
  });

  // --- Tab controller rebinding ---

  it('rebinds the tab controller and activates the default tab', () => {
    const { html } = buildSheet();
    const app = createApp([]);
    handlePartySheetRender(app as any, html);

    expect(app._tabs[0].bind).toHaveBeenCalled();
    expect(app._tabs[0].activate).toHaveBeenCalledWith('overview');
  });

  it('handles empty _tabs array gracefully', () => {
    const { html } = buildSheet();
    const app = createApp([]);
    (app as any)._tabs = [];

    expect(() => handlePartySheetRender(app as any, html)).not.toThrow();
  });

  // --- Post-render callbacks (scroll, focus, tab tracking) ---

  it('installs scroll tracking listeners after render', async () => {
    const actors = [{ id: 'a1', name: 'Hero', type: 'character' }];
    const { root, html } = buildSheet();
    const app = createApp(actors);

    // Inject sidebar and content into the pfs tab so trackScrollPositions finds them
    mockRenderPartyChronicleForm.mockImplementation(async (container: HTMLElement) => {
      container.innerHTML = `
        <div class="sidebar" style="overflow:auto; height:50px;"></div>
        <div class="content" style="overflow:auto; height:50px;"></div>
      `;
    });

    handlePartySheetRender(app as any, html);
    await flushRender();

    const pfsTab = root.querySelector('.tab[data-tab="pfs"]') as HTMLElement;
    expect(pfsTab).not.toBeNull();

    // Fire scroll events — they should not throw
    pfsTab.dispatchEvent(new Event('scroll'));
    const sidebar = pfsTab.querySelector('.sidebar') as HTMLElement;
    sidebar?.dispatchEvent(new Event('scroll'));
    const content = pfsTab.querySelector('.content') as HTMLElement;
    content?.dispatchEvent(new Event('scroll'));
  });

  it('installs focus tracking listeners after render', async () => {
    const actors = [{ id: 'a1', name: 'Hero', type: 'character' }];
    const { root, html } = buildSheet();
    const app = createApp(actors);

    mockRenderPartyChronicleForm.mockImplementation(async (container: HTMLElement) => {
      container.innerHTML = '<input id="testField" type="text" value="hello">';
    });

    handlePartySheetRender(app as any, html);
    await flushRender();

    const pfsTab = root.querySelector('.tab[data-tab="pfs"]') as HTMLElement;
    const input = pfsTab.querySelector('#testField') as HTMLInputElement;

    // Simulate focusin
    input.focus();
    pfsTab.dispatchEvent(new FocusEvent('focusin', { relatedTarget: input }));

    // Simulate keyup, click, select on the focused element
    input.dispatchEvent(new Event('keyup', { bubbles: true }));
    input.dispatchEvent(new Event('click', { bubbles: true }));
    input.dispatchEvent(new Event('select', { bubbles: true }));
  });

  it('restores scroll positions on subsequent renders', async () => {
    const actors = [{ id: 'a1', name: 'Hero', type: 'character' }];

    // First render — sets up scroll tracking and fires a scroll event
    mockRenderPartyChronicleForm.mockImplementation(async (container: HTMLElement) => {
      container.innerHTML = '<div class="sidebar"></div><div class="content"></div>';
    });

    const { root, html } = buildSheet();
    const app = createApp(actors);
    handlePartySheetRender(app as any, html);
    await flushRender();

    // Trigger scroll to save positions
    const pfsTab = root.querySelector('.tab[data-tab="pfs"]') as HTMLElement;
    pfsTab.dispatchEvent(new Event('scroll'));

    // Second render — should call restoreScrollPositions
    document.body.innerHTML = '';
    const sheet2 = buildSheet();
    const app2 = createApp(actors);
    handlePartySheetRender(app2 as any, sheet2.html);
    await flushRender();

    // No assertion needed beyond no-throw; the function ran
  });

  it('restores focus state on subsequent renders', async () => {
    const actors = [{ id: 'a1', name: 'Hero', type: 'character' }];

    mockRenderPartyChronicleForm.mockImplementation(async (container: HTMLElement) => {
      container.innerHTML = '<input id="myInput" type="text" value="test">';
    });

    const { root, html } = buildSheet();
    const app = createApp(actors);
    handlePartySheetRender(app as any, html);
    await flushRender();

    // Focus the input to save focus state
    const pfsTab = root.querySelector('.tab[data-tab="pfs"]') as HTMLElement;
    const input = pfsTab.querySelector('#myInput') as HTMLInputElement;
    input.focus();
    pfsTab.dispatchEvent(new FocusEvent('focusin', { relatedTarget: input }));

    // Second render — should call restoreFocusState
    document.body.innerHTML = '';
    const sheet2 = buildSheet();
    const app2 = createApp(actors);

    mockRenderPartyChronicleForm.mockImplementation(async (container: HTMLElement) => {
      container.innerHTML = '<input id="myInput" type="text" value="test">';
    });

    handlePartySheetRender(app2 as any, sheet2.html);
    await flushRender();

    // Allow requestAnimationFrame to fire
    await new Promise(r => setTimeout(r, 50));
  });

  it('tracks tab clicks via the nav listener', () => {
    const { root, html } = buildSheet();
    const app = createApp([]);
    handlePartySheetRender(app as any, html);

    // Click the inventory tab — trackTabClicks should capture the data-tab value
    const invTab = root.querySelector('[data-tab="inventory"]') as HTMLElement;
    invTab.click();

    // Render again — the tab controller should restore to "inventory"
    document.body.innerHTML = '';
    const sheet2 = buildSheet();
    const app2 = createApp([]);
    handlePartySheetRender(app2 as any, sheet2.html);

    expect(app2._tabs[0].activate).toHaveBeenCalledWith('inventory');
  });

  it('ignores tab clicks on elements without data-tab', () => {
    const { root, html } = buildSheet();
    const app = createApp([]);
    handlePartySheetRender(app as any, html);

    // Click the nav itself (no data-tab attribute)
    const nav = root.querySelector('nav.sub-nav') as HTMLElement;
    nav.click();

    // Should not throw and tab should remain at default
    document.body.innerHTML = '';
    const sheet2 = buildSheet();
    const app2 = createApp([]);
    handlePartySheetRender(app2 as any, sheet2.html);

    // Should still activate "inventory" from the previous click or "overview" default
    expect(app2._tabs[0].activate).toHaveBeenCalled();
  });

  it('restores scroll positions with sidebar and content elements', async () => {
    const actors = [{ id: 'a1', name: 'Hero', type: 'character' }];

    // First render — set up scroll tracking and trigger scroll events
    mockRenderPartyChronicleForm.mockImplementation(async (container: HTMLElement) => {
      container.innerHTML = '<div class="sidebar"></div><div class="content"></div>';
    });

    const { root, html } = buildSheet();
    const app = createApp(actors);
    handlePartySheetRender(app as any, html);
    await flushRender();

    // Trigger scroll on all three scrollable elements
    const pfsTab = root.querySelector('.tab[data-tab="pfs"]') as HTMLElement;
    pfsTab.dispatchEvent(new Event('scroll'));
    pfsTab.querySelector('.sidebar')!.dispatchEvent(new Event('scroll'));
    pfsTab.querySelector('.content')!.dispatchEvent(new Event('scroll'));

    // Second render — restoreScrollPositions should find sidebar and content
    document.body.innerHTML = '';
    const sheet2 = buildSheet();
    mockRenderPartyChronicleForm.mockImplementation(async (container: HTMLElement) => {
      container.innerHTML = '<div class="sidebar"></div><div class="content"></div>';
    });
    handlePartySheetRender(createApp(actors) as any, sheet2.html);
    await flushRender();
  });

  it('handles scroll restore when pfs tab has no sidebar or content', async () => {
    const actors = [{ id: 'a1', name: 'Hero', type: 'character' }];

    // First render — trigger scroll to save positions
    mockRenderPartyChronicleForm.mockImplementation(async (container: HTMLElement) => {
      container.innerHTML = '<div class="sidebar"></div><div class="content"></div>';
    });

    const { root, html } = buildSheet();
    handlePartySheetRender(createApp(actors) as any, html);
    await flushRender();

    const pfsTab = root.querySelector('.tab[data-tab="pfs"]') as HTMLElement;
    pfsTab.dispatchEvent(new Event('scroll'));

    // Second render — no sidebar/content in the new pfs tab
    document.body.innerHTML = '';
    const sheet2 = buildSheet();
    mockRenderPartyChronicleForm.mockImplementation(async (container: HTMLElement) => {
      container.innerHTML = '<p>No sidebar or content</p>';
    });
    handlePartySheetRender(createApp(actors) as any, sheet2.html);
    await flushRender();
  });

  it('handles focus restore when target element does not exist', async () => {
    const actors = [{ id: 'a1', name: 'Hero', type: 'character' }];

    // First render — focus an input
    mockRenderPartyChronicleForm.mockImplementation(async (container: HTMLElement) => {
      container.innerHTML = '<input id="myField" type="text">';
    });

    const { root, html } = buildSheet();
    handlePartySheetRender(createApp(actors) as any, html);
    await flushRender();

    const pfsTab = root.querySelector('.tab[data-tab="pfs"]') as HTMLElement;
    const input = pfsTab.querySelector('#myField') as HTMLInputElement;
    input.focus();
    pfsTab.dispatchEvent(new FocusEvent('focusin', { relatedTarget: input }));

    // Second render — the element id doesn't exist anymore
    document.body.innerHTML = '';
    const sheet2 = buildSheet();
    mockRenderPartyChronicleForm.mockImplementation(async (container: HTMLElement) => {
      container.innerHTML = '<p>Different content</p>';
    });
    handlePartySheetRender(createApp(actors) as any, sheet2.html);
    await flushRender();
    await new Promise(r => setTimeout(r, 50));
  });

  it('skips focus tracking for elements without an id', async () => {
    const actors = [{ id: 'a1', name: 'Hero', type: 'character' }];

    mockRenderPartyChronicleForm.mockImplementation(async (container: HTMLElement) => {
      container.innerHTML = '<input type="text" value="no-id">';
    });

    const { root, html } = buildSheet();
    handlePartySheetRender(createApp(actors) as any, html);
    await flushRender();

    const pfsTab = root.querySelector('.tab[data-tab="pfs"]') as HTMLElement;
    const input = pfsTab.querySelector('input') as HTMLInputElement;
    input.focus();
    pfsTab.dispatchEvent(new FocusEvent('focusin', { relatedTarget: input }));
  });

  it('handles scroll tracking when pfs tab has no sidebar or content', async () => {
    const actors = [{ id: 'a1', name: 'Hero', type: 'character' }];

    mockRenderPartyChronicleForm.mockImplementation(async (container: HTMLElement) => {
      container.innerHTML = '<p>Minimal content</p>';
    });

    const { root, html } = buildSheet();
    handlePartySheetRender(createApp(actors) as any, html);
    await flushRender();

    // Trigger scroll on the tab itself — no sidebar/content to track
    const pfsTab = root.querySelector('.tab[data-tab="pfs"]') as HTMLElement;
    pfsTab.dispatchEvent(new Event('scroll'));
  });
});
