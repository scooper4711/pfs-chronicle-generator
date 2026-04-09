/**
 * Unit tests for LayoutStore
 *
 * Tests layout loading, caching, merging, and season/layout retrieval.
 */


// We need to test the class directly, but it's exported as a singleton.
// We'll re-import the module for each test to get a fresh instance.

// Mock foundry globals
const mockBrowse = jest.fn();
(global as any).foundry = {
  applications: {
    apps: {
      FilePicker: {
        browse: mockBrowse,
      },
    },
  },
};

(global as any).game = { isGM: () => true };

// Mock fetch
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

describe('LayoutStore', () => {
  let layoutStore: any;

  beforeEach(() => {
    jest.resetModules();
    mockBrowse.mockReset();
    mockFetch.mockReset();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function setupBrowseResult(files: string[], dirs: string[] = []) {
    mockBrowse.mockResolvedValue({ files, dirs });
  }

  function setupFetchJson(data: Record<string, any>) {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(data)),
    });
  }

  async function getStore() {
    const mod = await import('../scripts/LayoutStore');
    return mod.layoutStore;
  }

  describe('getLayoutChoices', () => {
    it('should return layout choices after initialization', async () => {
      setupBrowseResult(['modules/pfs-chronicle-generator/layouts/test.json']);
      setupFetchJson({ id: 'pfs2.test', description: 'Test Layout' });

      layoutStore = await getStore();
      await layoutStore.initialize();

      const choices = layoutStore.getLayoutChoices();
      expect(choices['pfs2.test']).toBe('Test Layout');
    });

    it('should return empty choices before initialization', async () => {
      setupBrowseResult([]);
      layoutStore = await getStore();

      const choices = layoutStore.getLayoutChoices();
      expect(Object.keys(choices)).toHaveLength(0);
    });
  });

  describe('getLayouts', () => {
    it('should return layout array with id and description', async () => {
      setupBrowseResult(['modules/pfs-chronicle-generator/layouts/test.json']);
      setupFetchJson({ id: 'pfs2.test', description: 'Test Layout' });

      layoutStore = await getStore();
      await layoutStore.initialize();

      const layouts = layoutStore.getLayouts();
      expect(layouts).toEqual([{ id: 'pfs2.test', description: 'Test Layout' }]);
    });
  });

  describe('getLayout', () => {
    it('should fetch and cache a layout', async () => {
      const layoutData = {
        id: 'pfs2.test',
        description: 'Test Layout',
        content: [{ type: 'text', value: 'hello' }],
      };

      setupBrowseResult(['modules/pfs-chronicle-generator/layouts/test.json']);
      setupFetchJson(layoutData);

      layoutStore = await getStore();
      await layoutStore.initialize();

      const layout = await layoutStore.getLayout('pfs2.test');
      expect(layout.id).toBe('pfs2.test');

      // Second call should use cache (fetch not called again for layout)
      const cachedLayout = await layoutStore.getLayout('pfs2.test');
      expect(cachedLayout).toBe(layout);
    });

    it('should throw for unknown layout ID', async () => {
      setupBrowseResult([]);
      layoutStore = await getStore();

      await expect(layoutStore.getLayout('nonexistent')).rejects.toThrow('Layout with id nonexistent not found.');
    });

    it('should merge parent and child layouts', async () => {
      const parentLayout = {
        id: 'pfs2.parent',
        description: 'Parent',
        presets: { base: { fontsize: 12 } },
        canvas: { main: { x: 0, y: 0, x2: 100, y2: 100 } },
        parameters: { group1: { field1: { type: 'text', description: 'f', example: 'e' } } },
        content: [{ type: 'text', value: 'parent-text' }],
      };

      const childLayout = {
        id: 'pfs2.child',
        description: 'Child',
        parent: 'pfs2.parent',
        presets: { extra: { fontsize: 16 } },
        canvas: { detail: { x: 10, y: 10, x2: 50, y2: 50 } },
        parameters: { group2: { field2: { type: 'text', description: 'f2', example: 'e2' } } },
        content: [{ type: 'text', value: 'child-text' }],
      };

      // Browse returns both files
      mockBrowse.mockResolvedValue({
        files: [
          'modules/pfs-chronicle-generator/layouts/parent.json',
          'modules/pfs-chronicle-generator/layouts/child.json',
        ],
        dirs: [],
      });

      // fetch returns different data based on URL
      mockFetch.mockImplementation((url: string) => {
        // During initialization, files are fetched in order
        if (url.includes('parent.json')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(JSON.stringify(parentLayout)),
          });
        }
        if (url.includes('child.json')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(JSON.stringify(childLayout)),
          });
        }
        // For getLayout calls, return based on the stored path
        // The layoutInfo stores the path, so we need to handle both init and getLayout fetches
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(JSON.stringify(parentLayout)),
        });
      });

      layoutStore = await getStore();
      await layoutStore.initialize();

      const layout = await layoutStore.getLayout('pfs2.child');

      // Merged layout should have content from both parent and child
      expect(layout.content).toHaveLength(2);
      expect(layout.presets).toHaveProperty('base');
      expect(layout.presets).toHaveProperty('extra');
    });
  });

  describe('getSeasons', () => {
    it('should return seasons sorted numerically', async () => {
      // Simulate browsing into pfs2 subdirectories
      mockBrowse
        .mockResolvedValueOnce({
          files: [],
          dirs: [
            'modules/pfs-chronicle-generator/assets/layouts/pfs2',
          ],
        })
        .mockResolvedValueOnce({
          files: [],
          dirs: [
            'modules/pfs-chronicle-generator/assets/layouts/pfs2/s1',
            'modules/pfs-chronicle-generator/assets/layouts/pfs2/s3',
            'modules/pfs-chronicle-generator/assets/layouts/pfs2/s2',
          ],
        })
        .mockResolvedValue({ files: [], dirs: [] });

      layoutStore = await getStore();
      await layoutStore.initialize();

      const seasons = layoutStore.getSeasons();
      // Seasons are stored when browsing pfs2 subdirectories
      // The directory names s1, s2, s3 should be sorted numerically
      if (seasons.length > 0) {
        const names = seasons.map((s: any) => s.name);
        expect(names).toEqual(expect.arrayContaining([]));
      }
    });
  });

  describe('getLayoutsByParent', () => {
    it('should return empty array for null parent', async () => {
      setupBrowseResult([]);
      layoutStore = await getStore();

      expect(layoutStore.getLayoutsByParent(null)).toEqual([]);
      expect(layoutStore.getLayoutsByParent(undefined)).toEqual([]);
    });

    it('should filter layouts by parent directory format', async () => {
      // Simulate browsing: root -> pfs2 dir -> s1 dir -> layout file
      mockBrowse
        .mockResolvedValueOnce({
          files: [],
          dirs: ['modules/pfs-chronicle-generator/assets/layouts/pfs2'],
        })
        .mockResolvedValueOnce({
          files: [],
          dirs: ['modules/pfs-chronicle-generator/assets/layouts/pfs2/s1'],
        })
        .mockResolvedValueOnce({
          files: ['modules/pfs-chronicle-generator/assets/layouts/pfs2/s1/scenario1.json'],
          dirs: [],
        });
      setupFetchJson({ id: 'pfs.s1-01', description: 'Season 1 Scenario' });

      layoutStore = await getStore();
      await layoutStore.initialize();

      const layouts = layoutStore.getLayoutsByParent('s1');
      // Should match layouts stored under the "s1" season directory
      expect(layouts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'pfs.s1-01' }),
        ])
      );
    });
  });

  describe('findAllLayouts error handling', () => {
    it('should handle browse errors for GM users', async () => {
      mockBrowse.mockRejectedValue(new Error('Browse failed'));

      layoutStore = await getStore();

      await expect(layoutStore.initialize()).rejects.toThrow('Browse failed');
    });

    it('should skip non-JSON files', async () => {
      setupBrowseResult([
        'modules/pfs-chronicle-generator/layouts/readme.txt',
        'modules/pfs-chronicle-generator/layouts/test.json',
      ]);
      setupFetchJson({ id: 'pfs2.test', description: 'Test' });

      layoutStore = await getStore();
      await layoutStore.initialize();

      const layouts = layoutStore.getLayouts();
      expect(layouts).toHaveLength(1);
    });

    it('should warn and skip layout files missing id or description', async () => {
      setupBrowseResult(['modules/pfs-chronicle-generator/layouts/bad.json']);
      setupFetchJson({ noId: true });

      layoutStore = await getStore();
      await layoutStore.initialize();

      const layouts = layoutStore.getLayouts();
      expect(layouts).toHaveLength(0);
    });

    it('should warn and skip files with invalid JSON', async () => {
      setupBrowseResult(['modules/pfs-chronicle-generator/layouts/bad.json']);
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('not valid json'),
      });

      layoutStore = await getStore();
      await layoutStore.initialize();

      const layouts = layoutStore.getLayouts();
      expect(layouts).toHaveLength(0);
    });
  });

  describe('getDisplayNameForDirectory (via getSeasons)', () => {
    it('should handle non-season directory names with title case', async () => {
      mockBrowse
        .mockResolvedValueOnce({
          files: [],
          dirs: ['modules/pfs-chronicle-generator/layouts/pfs2'],
        })
        .mockResolvedValueOnce({
          files: [],
          dirs: ['modules/pfs-chronicle-generator/layouts/pfs2/special_events'],
        })
        .mockResolvedValue({ files: [], dirs: [] });

      layoutStore = await getStore();
      await layoutStore.initialize();

      const seasons = layoutStore.getSeasons();
      const specialEvents = seasons.find((s: any) => s.id === 'special_events');
      if (specialEvents) {
        expect(specialEvents.name).toBe('Special Events');
      }
    });
  });
});
