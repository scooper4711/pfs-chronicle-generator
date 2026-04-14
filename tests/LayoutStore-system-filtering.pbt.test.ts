/**
 * Property-based tests for LayoutStore system-season-filtering changes.
 *
 * Validates: Requirements 1.3, 2.1, 2.2, 2.3, 2.4, 3.2, 3.5, 4.1, 4.2, 4.3
 */
import * as fc from 'fast-check';

const mockBrowse = jest.fn();
(globalThis as any).foundry = {
    applications: {
        apps: {
            FilePicker: {
                browse: mockBrowse,
            },
        },
    },
};

(globalThis as any).game = { user: { isGM: true } };

const mockFetch = jest.fn();
(globalThis as any).fetch = mockFetch;

const GAME_SYSTEM_ROOTS = ['pfs2', 'sfs2'] as const;
const BASE_PATH = 'modules/pfs-chronicle-generator/assets/layouts';

/** Generates a valid lowercase alpha directory name that is not a game system root. */
const dirNameArb: fc.Arbitrary<string> = fc.stringMatching(/^[a-z]{2,10}$/)
    .filter((s: string) => s !== 'pfs2' && s !== 'sfs2');

/** Generates a game system root. */
const gameSystemRootArb: fc.Arbitrary<string> = fc.constantFrom(...GAME_SYSTEM_ROOTS);

describe('Feature: system-season-filtering, Property-Based Tests', () => {
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

    /**
     * Sets up browse mock and fetch mock for a given directory structure.
     */
    function setupBrowseAndFetch(
        roots: Record<string, string[]>,
        layouts: Record<string, Array<{ id: string; description: string; hidden?: boolean }>>
    ) {
        mockBrowse.mockImplementation((_source: string, target: string) => {
            if (target === `${BASE_PATH}/`) {
                return Promise.resolve({
                    files: [],
                    dirs: Object.keys(roots).map(r => `${BASE_PATH}/${r}`),
                });
            }
            for (const [root, seasons] of Object.entries(roots)) {
                if (target === `${BASE_PATH}/${root}`) {
                    return Promise.resolve({
                        files: [],
                        dirs: seasons.map(s => `${BASE_PATH}/${root}/${s}`),
                    });
                }
                for (const season of seasons) {
                    if (target === `${BASE_PATH}/${root}/${season}`) {
                        const key = `${root}/${season}`;
                        const seasonLayouts = layouts[key] ?? [];
                        return Promise.resolve({
                            files: seasonLayouts.map(l => `${BASE_PATH}/${root}/${season}/${l.id}.json`),
                            dirs: [],
                        });
                    }
                }
            }
            return Promise.resolve({ files: [], dirs: [] });
        });

        mockFetch.mockImplementation((url: string) => {
            for (const entries of Object.values(layouts)) {
                for (const entry of entries) {
                    if (url.includes(`${entry.id}.json`)) {
                        const data: Record<string, unknown> = { id: entry.id, description: entry.description };
                        if (entry.hidden) data.flags = ['hidden'];
                        return Promise.resolve({
                            ok: true,
                            text: () => Promise.resolve(JSON.stringify(data)),
                        });
                    }
                }
            }
            return Promise.resolve({
                ok: true,
                text: () => Promise.resolve('{}'),
            });
        });
    }

    /**
     * Feature: system-season-filtering, Property 1: Season detection tags with correct game system root
     *
     * For any recognized game system root and any valid directory name that is an immediate
     * child of that root, detectSeason returns a composite season ID in the format
     * root/dirName and the correct gameSystemRoot.
     *
     * **Validates: Requirements 1.3, 2.1**
     */
    it('Property 1: Season detection tags with correct game system root', async () => {
        await fc.assert(
            fc.asyncProperty(
                gameSystemRootArb,
                dirNameArb,
                async (root: string, dirName: string) => {
                    jest.resetModules();
                    mockBrowse.mockReset();
                    mockFetch.mockReset();

                    setupBrowseAndFetch(
                        { [root]: [dirName] },
                        { [`${root}/${dirName}`]: [{ id: `${root}.test1`, description: 'Test Layout' }] }
                    );

                    const store = await getStore();
                    await store.initialize();

                    const seasons = store.getSeasons(root);
                    expect(seasons.length).toBe(1);
                    expect(seasons[0].id).toBe(`${root}/${dirName}`);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Feature: system-season-filtering, Property 2: Same-named seasons under different roots are distinct
     *
     * For any directory name that exists under two different game system roots,
     * the LayoutStore stores them as distinct season entries, and retrieving
     * seasons for one root does not include seasons from the other root.
     *
     * **Validates: Requirements 2.3, 3.2**
     */
    it('Property 2: Same-named seasons under different roots are distinct', async () => {
        await fc.assert(
            fc.asyncProperty(
                dirNameArb,
                async (sharedDirName: string) => {
                    jest.resetModules();
                    mockBrowse.mockReset();
                    mockFetch.mockReset();

                    setupBrowseAndFetch(
                        { pfs2: [sharedDirName], sfs2: [sharedDirName] },
                        {
                            [`pfs2/${sharedDirName}`]: [{ id: 'pfs2.shared', description: 'PFS2 Layout' }],
                            [`sfs2/${sharedDirName}`]: [{ id: 'sfs2.shared', description: 'SFS2 Layout' }],
                        }
                    );

                    const store = await getStore();
                    await store.initialize();

                    const pfs2Seasons = store.getSeasons('pfs2');
                    const sfs2Seasons = store.getSeasons('sfs2');

                    expect(pfs2Seasons.length).toBe(1);
                    expect(sfs2Seasons.length).toBe(1);
                    expect(pfs2Seasons[0].id).toBe(`pfs2/${sharedDirName}`);
                    expect(sfs2Seasons[0].id).toBe(`sfs2/${sharedDirName}`);
                    expect(pfs2Seasons[0].id).not.toBe(sfs2Seasons[0].id);

                    // Retrieving seasons for one root does not include the other
                    expect(pfs2Seasons.every((s: { id: string }) => s.id.startsWith('pfs2/'))).toBe(true);
                    expect(sfs2Seasons.every((s: { id: string }) => s.id.startsWith('sfs2/'))).toBe(true);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Feature: system-season-filtering, Property 3: Layout entries are tagged with correct game system root
     *
     * For any layout file discovered under a season directory, the layout's season field
     * equals the composite season ID of its parent season directory, and its gameSystemRoot
     * field equals the game system root.
     *
     * **Validates: Requirements 2.2, 2.4, 4.1**
     */
    it('Property 3: Layout entries are tagged with correct game system root', async () => {
        await fc.assert(
            fc.asyncProperty(
                gameSystemRootArb,
                dirNameArb,
                fc.stringMatching(/^[a-z0-9]{1,6}$/),
                async (root: string, dirName: string, layoutSuffix: string) => {
                    jest.resetModules();
                    mockBrowse.mockReset();
                    mockFetch.mockReset();

                    const layoutId = `${root}.${layoutSuffix}`;
                    const layoutDesc = `Layout ${layoutSuffix}`;

                    setupBrowseAndFetch(
                        { [root]: [dirName] },
                        { [`${root}/${dirName}`]: [{ id: layoutId, description: layoutDesc }] }
                    );

                    const store = await getStore();
                    await store.initialize();

                    const compositeSeasonId = `${root}/${dirName}`;
                    const layouts = store.getLayoutsByParent(compositeSeasonId);

                    expect(layouts.length).toBe(1);
                    expect(layouts[0].id).toBe(layoutId);
                    expect(layouts[0].description).toBe(layoutDesc);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Feature: system-season-filtering, Property 4: getLayoutsByParent returns correct, filtered, sorted results
     *
     * For any composite season ID and any set of layout entries (including hidden layouts
     * and layouts from other seasons), getLayoutsByParent returns only non-hidden layouts
     * whose season field matches the composite ID exactly, sorted alphabetically by description.
     *
     * **Validates: Requirements 2.4, 4.1, 4.2, 4.3**
     */
    it('Property 4: getLayoutsByParent returns correct, filtered, sorted results', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    targetRoot: gameSystemRootArb,
                    targetSeason: dirNameArb,
                    otherSeason: dirNameArb,
                    visibleCount: fc.integer({ min: 1, max: 4 }),
                    hiddenCount: fc.integer({ min: 0, max: 2 }),
                    otherSeasonCount: fc.integer({ min: 0, max: 2 }),
                }).filter(r => r.targetSeason !== r.otherSeason),
                async ({ targetRoot, targetSeason, otherSeason, visibleCount, hiddenCount, otherSeasonCount }) => {
                    jest.resetModules();
                    mockBrowse.mockReset();
                    mockFetch.mockReset();

                    const targetLayouts: Array<{ id: string; description: string; hidden?: boolean }> = [];
                    const expectedDescriptions: string[] = [];

                    for (let i = 0; i < visibleCount; i++) {
                        const desc = `Visible ${String.fromCodePoint(65 + i)}`;
                        targetLayouts.push({ id: `${targetRoot}.vis${i}`, description: desc });
                        expectedDescriptions.push(desc);
                    }
                    for (let i = 0; i < hiddenCount; i++) {
                        targetLayouts.push({ id: `${targetRoot}.hid${i}`, description: `Hidden ${i}`, hidden: true });
                    }

                    const otherLayouts: Array<{ id: string; description: string }> = [];
                    for (let i = 0; i < otherSeasonCount; i++) {
                        otherLayouts.push({ id: `${targetRoot}.other${i}`, description: `Other ${i}` });
                    }

                    const seasons: string[] = [targetSeason, otherSeason];
                    const layoutMap: Record<string, Array<{ id: string; description: string; hidden?: boolean }>> = {
                        [`${targetRoot}/${targetSeason}`]: targetLayouts,
                        [`${targetRoot}/${otherSeason}`]: otherLayouts,
                    };

                    setupBrowseAndFetch({ [targetRoot]: seasons }, layoutMap);

                    const store = await getStore();
                    await store.initialize();

                    const results = store.getLayoutsByParent(`${targetRoot}/${targetSeason}`);

                    // Only non-hidden layouts from the target season
                    expect(results.length).toBe(visibleCount);

                    // Sorted alphabetically by description
                    const sortedDescriptions = [...expectedDescriptions].sort((a, b) => a.localeCompare(b));
                    expect(results.map((r: { description: string }) => r.description)).toEqual(sortedDescriptions);

                    // No hidden layouts present
                    for (const r of results) {
                        const original = targetLayouts.find(l => l.id === r.id);
                        expect(original?.hidden).toBeFalsy();
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Feature: system-season-filtering, Property 5: getSeasons returns filtered, correctly sorted results
     *
     * For any game system root and any set of season entries across multiple roots,
     * getSeasons(root) returns only seasons whose gameSystemRoot matches the specified root,
     * sorted with numbered seasons first (ascending by number) followed by non-numbered
     * seasons in alphabetical order.
     *
     * **Validates: Requirements 3.2, 3.5**
     */
    it('Property 5: getSeasons returns filtered, correctly sorted results', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    numericSeasons: fc.uniqueArray(fc.integer({ min: 1, max: 50 }), { minLength: 1, maxLength: 5 }),
                    alphaSeasons: fc.uniqueArray(
                        fc.stringMatching(/^[a-z]{2,8}$/)
                            .filter((s: string) => s !== 'pfs2' && s !== 'sfs2' && Number.isNaN(Number.parseInt(s))),
                        { minLength: 0, maxLength: 4 }
                    ),
                    otherRootSeasons: fc.uniqueArray(dirNameArb, { minLength: 0, maxLength: 3 }),
                }),
                async ({ numericSeasons, alphaSeasons, otherRootSeasons }) => {
                    jest.resetModules();
                    mockBrowse.mockReset();
                    mockFetch.mockReset();

                    const targetRoot = 'pfs2';
                    const otherRoot = 'sfs2';

                    const targetSeasonDirs: string[] = [
                        ...numericSeasons.map(String),
                        ...alphaSeasons,
                    ];

                    // Deduplicate
                    const uniqueTargetSeasons = [...new Set(targetSeasonDirs)];
                    const uniqueOtherSeasons = otherRootSeasons.filter(
                        (s: string) => !uniqueTargetSeasons.includes(s)
                    );

                    const roots: Record<string, string[]> = { [targetRoot]: uniqueTargetSeasons };
                    if (uniqueOtherSeasons.length > 0) {
                        roots[otherRoot] = uniqueOtherSeasons;
                    }

                    // No layouts needed — just season structure
                    const layoutMap: Record<string, Array<{ id: string; description: string }>> = {};
                    for (const s of uniqueTargetSeasons) {
                        layoutMap[`${targetRoot}/${s}`] = [];
                    }
                    for (const s of uniqueOtherSeasons) {
                        layoutMap[`${otherRoot}/${s}`] = [];
                    }

                    setupBrowseAndFetch(roots, layoutMap);

                    const store = await getStore();
                    await store.initialize();

                    const seasons = store.getSeasons(targetRoot);

                    // Only target root seasons returned
                    expect(seasons.length).toBe(uniqueTargetSeasons.length);
                    for (const s of seasons) {
                        expect(s.id.startsWith(`${targetRoot}/`)).toBe(true);
                    }

                    // No other root seasons
                    for (const s of seasons) {
                        expect(s.id.startsWith(`${otherRoot}/`)).toBe(false);
                    }

                    // Verify sort order: numbered first (ascending), then non-numbered alphabetically
                    const dirNames = seasons.map((s: { id: string }) => s.id.split('/').pop()!);

                    const numericDirs = dirNames.filter((d: string) => !Number.isNaN(Number.parseInt(d)));
                    const alphaDirs = dirNames.filter((d: string) => Number.isNaN(Number.parseInt(d)));

                    // Numeric dirs come before alpha dirs
                    if (numericDirs.length > 0 && alphaDirs.length > 0) {
                        const lastNumericIdx = dirNames.lastIndexOf(numericDirs.at(-1)!);
                        const firstAlphaIdx = dirNames.indexOf(alphaDirs[0]);
                        expect(lastNumericIdx).toBeLessThan(firstAlphaIdx);
                    }

                    // Numeric dirs are sorted ascending
                    for (let i = 1; i < numericDirs.length; i++) {
                        expect(Number.parseInt(numericDirs[i])).toBeGreaterThan(Number.parseInt(numericDirs[i - 1]));
                    }

                    // Alpha dirs are sorted alphabetically by display name
                    const alphaNames = seasons
                        .filter((s: { id: string }) => Number.isNaN(Number.parseInt(s.id.split('/').pop()!)))
                        .map((s: { name: string }) => s.name);
                    const sortedAlphaNames = [...alphaNames].sort((a: string, b: string) => a.localeCompare(b));
                    expect(alphaNames).toEqual(sortedAlphaNames);
                }
            ),
            { numRuns: 100 }
        );
    });
});
