/**
 * Unit tests for LayoutStore system-season-filtering changes.
 *
 * Validates that seasons and layouts are tagged with their gameSystemRoot,
 * composite season keys prevent collisions, and filtering works correctly.
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.3, 2.4, 3.2, 4.1
 */

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

(global as any).game = { user: { isGM: true } };

const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

describe('LayoutStore system-season-filtering', () => {
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

    async function getStore() {
        const mod = await import('../scripts/LayoutStore');
        return mod.layoutStore;
    }

    function setupFetchJson(data: Record<string, any>) {
        mockFetch.mockResolvedValue({
            ok: true,
            text: () => Promise.resolve(JSON.stringify(data)),
        });
    }

    function setupFetchJsonByUrl(mapping: Record<string, Record<string, any>>) {
        mockFetch.mockImplementation((url: string) => {
            for (const [pattern, data] of Object.entries(mapping)) {
                if (url.includes(pattern)) {
                    return Promise.resolve({
                        ok: true,
                        text: () => Promise.resolve(JSON.stringify(data)),
                    });
                }
            }
            return Promise.resolve({
                ok: true,
                text: () => Promise.resolve('{}'),
            });
        });
    }

    /**
     * Sets up a browse mock that simulates a directory tree with both pfs2 and sfs2 roots,
     * each containing season subdirectories and layout files.
     */
    function setupMixedSystemBrowse() {
        const basePath = 'modules/pfs-chronicle-generator/assets/layouts';
        mockBrowse.mockImplementation((_source: string, target: string) => {
            if (target === `${basePath}/`) {
                return Promise.resolve({
                    files: [],
                    dirs: [`${basePath}/pfs2`, `${basePath}/sfs2`],
                });
            }
            if (target === `${basePath}/pfs2`) {
                return Promise.resolve({
                    files: [],
                    dirs: [
                        `${basePath}/pfs2/season1`,
                        `${basePath}/pfs2/season2`,
                        `${basePath}/pfs2/bounties`,
                    ],
                });
            }
            if (target === `${basePath}/sfs2`) {
                return Promise.resolve({
                    files: [],
                    dirs: [
                        `${basePath}/sfs2/season1`,
                        `${basePath}/sfs2/season3`,
                    ],
                });
            }
            if (target === `${basePath}/pfs2/season1`) {
                return Promise.resolve({
                    files: [`${basePath}/pfs2/season1/pfs2-s1-01.json`],
                    dirs: [],
                });
            }
            if (target === `${basePath}/pfs2/season2`) {
                return Promise.resolve({
                    files: [`${basePath}/pfs2/season2/pfs2-s2-01.json`],
                    dirs: [],
                });
            }
            if (target === `${basePath}/pfs2/bounties`) {
                return Promise.resolve({
                    files: [`${basePath}/pfs2/bounties/pfs2-bounty1.json`],
                    dirs: [],
                });
            }
            if (target === `${basePath}/sfs2/season1`) {
                return Promise.resolve({
                    files: [`${basePath}/sfs2/season1/sfs2-s1-01.json`],
                    dirs: [],
                });
            }
            if (target === `${basePath}/sfs2/season3`) {
                return Promise.resolve({
                    files: [`${basePath}/sfs2/season3/sfs2-s3-01.json`],
                    dirs: [],
                });
            }
            return Promise.resolve({ files: [], dirs: [] });
        });

        setupFetchJsonByUrl({
            'pfs2-s1-01.json': { id: 'pfs2.s1-01', description: 'PFS2 Season 1 Scenario 1' },
            'pfs2-s2-01.json': { id: 'pfs2.s2-01', description: 'PFS2 Season 2 Scenario 1' },
            'pfs2-bounty1.json': { id: 'pfs2.bounty1', description: 'PFS2 Bounty 1' },
            'sfs2-s1-01.json': { id: 'sfs2.s1-01', description: 'SFS2 Season 1 Scenario 1' },
            'sfs2-s3-01.json': { id: 'sfs2.s3-01', description: 'SFS2 Season 3 Scenario 1' },
        });
    }

    async function initializeWithMixedSystems() {
        setupMixedSystemBrowse();
        layoutStore = await getStore();
        await layoutStore.initialize();
        return layoutStore;
    }

    describe('GAME_SYSTEM_ROOTS contains exactly pfs2 and sfs2', () => {
        it('should recognize pfs2 as a valid game system root', async () => {
            const store = await initializeWithMixedSystems();
            const pfs2Seasons = store.getSeasons('pfs2');
            expect(pfs2Seasons.length).toBeGreaterThan(0);
        });

        it('should recognize sfs2 as a valid game system root', async () => {
            const store = await initializeWithMixedSystems();
            const sfs2Seasons = store.getSeasons('sfs2');
            expect(sfs2Seasons.length).toBeGreaterThan(0);
        });

        it('should not recognize sfs as a valid game system root', async () => {
            const basePath = 'modules/pfs-chronicle-generator/assets/layouts';
            mockBrowse.mockImplementation((_source: string, target: string) => {
                if (target === `${basePath}/`) {
                    return Promise.resolve({
                        files: [],
                        dirs: [`${basePath}/sfs`],
                    });
                }
                if (target === `${basePath}/sfs`) {
                    return Promise.resolve({
                        files: [],
                        dirs: [`${basePath}/sfs/season1`],
                    });
                }
                if (target === `${basePath}/sfs/season1`) {
                    return Promise.resolve({
                        files: [`${basePath}/sfs/season1/layout.json`],
                        dirs: [],
                    });
                }
                return Promise.resolve({ files: [], dirs: [] });
            });
            setupFetchJson({ id: 'sfs.s1-01', description: 'SFS Season 1' });

            layoutStore = await getStore();
            await layoutStore.initialize();

            const sfsSeasons = layoutStore.getSeasons('sfs');
            expect(sfsSeasons).toEqual([]);
        });
    });

    describe('detectSeason returns composite keys and gameSystemRoot', () => {
        it('should create composite season keys in pfs2/dirName format', async () => {
            const store = await initializeWithMixedSystems();
            const pfs2Seasons = store.getSeasons('pfs2');
            const seasonIds = pfs2Seasons.map((s: any) => s.id);

            expect(seasonIds).toContain('pfs2/season1');
            expect(seasonIds).toContain('pfs2/season2');
            expect(seasonIds).toContain('pfs2/bounties');
        });

        it('should create composite season keys in sfs2/dirName format', async () => {
            const store = await initializeWithMixedSystems();
            const sfs2Seasons = store.getSeasons('sfs2');
            const seasonIds = sfs2Seasons.map((s: any) => s.id);

            expect(seasonIds).toContain('sfs2/season1');
            expect(seasonIds).toContain('sfs2/season3');
        });

        it('should store display names extracted from directory names', async () => {
            const store = await initializeWithMixedSystems();
            const pfs2Seasons = store.getSeasons('pfs2');

            const season1 = pfs2Seasons.find((s: any) => s.id === 'pfs2/season1');
            expect(season1?.name).toBe('Season 1');

            const bounties = pfs2Seasons.find((s: any) => s.id === 'pfs2/bounties');
            expect(bounties?.name).toBe('Bounties');
        });
    });

    describe('getSeasons filters by gameSystemRoot', () => {
        it('should return only pfs2 seasons when called with pfs2', async () => {
            const store = await initializeWithMixedSystems();
            const pfs2Seasons = store.getSeasons('pfs2');
            const seasonIds = pfs2Seasons.map((s: any) => s.id);

            expect(seasonIds).toContain('pfs2/season1');
            expect(seasonIds).toContain('pfs2/season2');
            expect(seasonIds).toContain('pfs2/bounties');
            expect(seasonIds.every((id: string) => id.startsWith('pfs2/'))).toBe(true);
        });

        it('should return only sfs2 seasons when called with sfs2', async () => {
            const store = await initializeWithMixedSystems();
            const sfs2Seasons = store.getSeasons('sfs2');
            const seasonIds = sfs2Seasons.map((s: any) => s.id);

            expect(seasonIds).toContain('sfs2/season1');
            expect(seasonIds).toContain('sfs2/season3');
            expect(seasonIds.every((id: string) => id.startsWith('sfs2/'))).toBe(true);
        });

        it('should return empty array for unrecognized game system root', async () => {
            const store = await initializeWithMixedSystems();
            const unknownSeasons = store.getSeasons('unknown_system');
            expect(unknownSeasons).toEqual([]);
        });

        it('should sort numbered seasons first, then non-numbered alphabetically', async () => {
            const basePath = 'modules/pfs-chronicle-generator/assets/layouts';
            mockBrowse.mockImplementation((_source: string, target: string) => {
                if (target === `${basePath}/`) {
                    return Promise.resolve({
                        files: [],
                        dirs: [`${basePath}/pfs2`],
                    });
                }
                if (target === `${basePath}/pfs2`) {
                    return Promise.resolve({
                        files: [],
                        dirs: [
                            `${basePath}/pfs2/3`,
                            `${basePath}/pfs2/1`,
                            `${basePath}/pfs2/bounties`,
                            `${basePath}/pfs2/2`,
                        ],
                    });
                }
                return Promise.resolve({ files: [], dirs: [] });
            });

            layoutStore = await getStore();
            await layoutStore.initialize();

            const pfs2Seasons = layoutStore.getSeasons('pfs2');
            const ids = pfs2Seasons.map((s: any) => s.id);

            // Numeric directories sorted ascending, then non-numeric alphabetically
            expect(ids).toEqual([
                'pfs2/1',
                'pfs2/2',
                'pfs2/3',
                'pfs2/bounties',
            ]);
        });
    });

    describe('getLayoutsByParent with composite season keys', () => {
        it('should return only layouts from pfs2/season1', async () => {
            const store = await initializeWithMixedSystems();
            const layouts = store.getLayoutsByParent('pfs2/season1');

            expect(layouts).toHaveLength(1);
            expect(layouts[0].id).toBe('pfs2.s1-01');
            expect(layouts[0].description).toBe('PFS2 Season 1 Scenario 1');
        });

        it('should return only layouts from sfs2/season1', async () => {
            const store = await initializeWithMixedSystems();
            const layouts = store.getLayoutsByParent('sfs2/season1');

            expect(layouts).toHaveLength(1);
            expect(layouts[0].id).toBe('sfs2.s1-01');
            expect(layouts[0].description).toBe('SFS2 Season 1 Scenario 1');
        });

        it('should not return layouts from other seasons or systems', async () => {
            const store = await initializeWithMixedSystems();
            const pfs2Season1Layouts = store.getLayoutsByParent('pfs2/season1');
            const layoutIds = pfs2Season1Layouts.map((l: any) => l.id);

            expect(layoutIds).not.toContain('pfs2.s2-01');
            expect(layoutIds).not.toContain('sfs2.s1-01');
        });

        it('should return empty array for non-existent composite key', async () => {
            const store = await initializeWithMixedSystems();
            const layouts = store.getLayoutsByParent('pfs2/nonexistent');
            expect(layouts).toEqual([]);
        });

        it('should exclude hidden layouts', async () => {
            const basePath = 'modules/pfs-chronicle-generator/assets/layouts';
            mockBrowse.mockImplementation((_source: string, target: string) => {
                if (target === `${basePath}/`) {
                    return Promise.resolve({
                        files: [],
                        dirs: [`${basePath}/pfs2`],
                    });
                }
                if (target === `${basePath}/pfs2`) {
                    return Promise.resolve({
                        files: [],
                        dirs: [`${basePath}/pfs2/season1`],
                    });
                }
                if (target === `${basePath}/pfs2/season1`) {
                    return Promise.resolve({
                        files: [
                            `${basePath}/pfs2/season1/visible.json`,
                            `${basePath}/pfs2/season1/hidden.json`,
                        ],
                        dirs: [],
                    });
                }
                return Promise.resolve({ files: [], dirs: [] });
            });

            setupFetchJsonByUrl({
                'visible.json': { id: 'pfs2.visible', description: 'Visible Layout' },
                'hidden.json': { id: 'pfs2.hidden', description: 'Hidden Layout', flags: ['hidden'] },
            });

            layoutStore = await getStore();
            await layoutStore.initialize();

            const layouts = layoutStore.getLayoutsByParent('pfs2/season1');
            expect(layouts).toHaveLength(1);
            expect(layouts[0].id).toBe('pfs2.visible');
        });
    });

    describe('same-named seasons under different roots are distinct', () => {
        it('should store pfs2/season1 and sfs2/season1 as separate entries', async () => {
            const store = await initializeWithMixedSystems();

            const pfs2Seasons = store.getSeasons('pfs2');
            const sfs2Seasons = store.getSeasons('sfs2');

            const pfs2Season1 = pfs2Seasons.find((s: any) => s.id === 'pfs2/season1');
            const sfs2Season1 = sfs2Seasons.find((s: any) => s.id === 'sfs2/season1');

            expect(pfs2Season1).toBeDefined();
            expect(sfs2Season1).toBeDefined();
            expect(pfs2Season1!.id).not.toBe(sfs2Season1!.id);
        });

        it('should return different layouts for same-named seasons under different roots', async () => {
            const store = await initializeWithMixedSystems();

            const pfs2Layouts = store.getLayoutsByParent('pfs2/season1');
            const sfs2Layouts = store.getLayoutsByParent('sfs2/season1');

            expect(pfs2Layouts).toHaveLength(1);
            expect(sfs2Layouts).toHaveLength(1);
            expect(pfs2Layouts[0].id).toBe('pfs2.s1-01');
            expect(sfs2Layouts[0].id).toBe('sfs2.s1-01');
        });

        it('should not mix season counts between roots', async () => {
            const store = await initializeWithMixedSystems();

            const pfs2Seasons = store.getSeasons('pfs2');
            const sfs2Seasons = store.getSeasons('sfs2');

            expect(pfs2Seasons).toHaveLength(3); // season1, season2, bounties
            expect(sfs2Seasons).toHaveLength(2); // season1, season3
        });
    });
});
