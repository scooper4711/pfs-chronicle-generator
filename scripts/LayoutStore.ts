import { Layout } from './model/layout';
import { debug, warn, error } from './utils/logger.js';

const LAYOUT_PATH = 'modules/pfs-chronicle-generator/assets/layouts/';
const GAME_SYSTEM_ROOTS = new Set(['pfs2', 'sfs']);

class LayoutStore {
    private readonly layouts: Map<string, Layout> = new Map();
    private readonly layoutInfo: Map<string, { path: string, description: string, season: string, hidden: boolean }> = new Map();
    private readonly seasonDirectories: Map<string, string> = new Map(); // key: directory name, value: display name

    public async initialize() {
        await this.findAllLayouts({ source: "data", target: LAYOUT_PATH });
    }

    public async getLayout(id: string): Promise<Layout> {
        if (this.layouts.has(id)) {
            return this.layouts.get(id)!;
        }

        const layoutInfo = this.layoutInfo.get(id);
        if (!layoutInfo) {
            throw new Error(`Layout with id ${id} not found.`);
        }

        const fileContent = await fetch(layoutInfo.path).then(r => r.text());
        const layoutData = JSON.parse(fileContent);

        let finalLayout: Layout;
        if (layoutData.parent) {
            const parentLayout = await this.getLayout(layoutData.parent);
            finalLayout = this.mergeLayouts(parentLayout, layoutData);
        } else {
            finalLayout = layoutData;
        }

        this.layouts.set(id, finalLayout);
        return finalLayout;
    }

    public getLayoutChoices(): Record<string, string> {
        const choices: Record<string, string> = {};
        for (const [id, info] of this.layoutInfo.entries()) {
            if (!info.hidden) {
                choices[id] = info.description;
            }
        }
        return choices;
    }

    public getLayouts(): { id: string, description: string }[] {
        return Array.from(this.layoutInfo.entries())
            .filter(([_id, info]) => !info.hidden)
            .map(([id, info]) => ({
                id,
                description: info.description
            }));
    }

    private getDisplayNameForDirectory(dirName: string): string {
        // Handle seasonN or sN format (e.g., season4 -> Season 4, s1 -> Season 1)
        const seasonMatch = dirName.toLowerCase().match(/^(?:season|s)(\d+)$/);
        if (seasonMatch) {
            return `Season ${seasonMatch[1]}`;
        }

        // Handle other directories with title case
        return dirName.split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    public getSeasons(): Array<{ id: string, name: string }> {
        return Array.from(this.seasonDirectories.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => {
                // Put numbered seasons first
                const aNum = Number.parseInt(a.id);
                const bNum = Number.parseInt(b.id);
                if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
                    return aNum - bNum;
                }
                if (!Number.isNaN(aNum)) return -1;
                if (!Number.isNaN(bNum)) return 1;
                return a.name.localeCompare(b.name);
            });
    }

    public getLayoutsByParent(parent: string | null | undefined): Array<{ id: string, description: string }> {
        if (!parent) return [];

        debug('Looking for layouts in season:', parent);
        
        const layouts = Array.from(this.layoutInfo.entries())
            .filter(([_id, info]) => info.season === parent && !info.hidden)
            .map(([id, info]) => ({
                id,
                description: info.description
            }))
            .sort((a, b) => a.description.localeCompare(b.description));
        return layouts;
    }

    /**
     * Determines the season context for a directory being browsed.
     * Season directories are immediate children of a game-system root (e.g. pfs2/bounties).
     */
    private detectSeason(target: string, inheritedSeason?: string): { season?: string, isNewSeason: boolean } {
        if (inheritedSeason) return { season: inheritedSeason, isNewSeason: false };

        const segments = target.split('/').filter(Boolean);
        const dirName = segments.pop() ?? '';
        const parentDir = segments.pop();

        if (parentDir && GAME_SYSTEM_ROOTS.has(parentDir) && dirName !== parentDir) {
            return { season: dirName, isNewSeason: true };
        }
        return { season: undefined, isNewSeason: false };
    }

    /** Parses a single layout JSON file and registers it in layoutInfo. */
    private async registerLayoutFile(file: string, season: string): Promise<void> {
        try {
            const fileContent = await fetch(file).then(r => r.text());
            const jsonData = JSON.parse(fileContent);
            const { id, description, flags } = jsonData;

            if (!id || !description) {
                warn(`Layout file ${file} missing required fields (id or description)`);
                return;
            }

            const hidden = Array.isArray(flags) && flags.includes('hidden');
            this.layoutInfo.set(id, { path: file, description, season, hidden });
        } catch (parseError) {
            warn(`Failed to parse JSON layout file ${file}:`, parseError);
        }
    }

    private async findAllLayouts(source: { source: string, target: string }, inheritedSeason?: string) {
        try {
            debug(`Browsing for layouts in ${source.target}`);
            const browseResult = await foundry.applications.apps.FilePicker.browse(source.source, source.target);
            debug(`Found ${browseResult.files.length} files and ${browseResult.dirs.length} directories.`);
            
            const { season, isNewSeason } = this.detectSeason(source.target, inheritedSeason);

            if (isNewSeason && season) {
                this.seasonDirectories.set(season, this.getDisplayNameForDirectory(season));
            }
            
            const jsonFiles = browseResult.files.filter((f: string) => f.endsWith('.json'));
            await Promise.all(jsonFiles.map(file => this.registerLayoutFile(file, season ?? '')));

            // Process subdirectories, passing the season context down
            await Promise.all(browseResult.dirs.map(dir => 
                this.findAllLayouts({ source: source.source, target: dir }, season)
            ));
        } catch (loadError) {
            if (game.isGM())
                error(`Failed to load layouts from ${source.target}`, loadError);
            else
                error(`Non-GM user shouldn't initialize the LayoutStore`);
            throw loadError;
        }
    }

    private mergeLayouts(parent: Layout, child: Layout): Layout {
        const merged: Layout = {
            ...parent,
            ...child,
            flags: child.flags,
            presets: { ...(parent.presets || {}), ...(child.presets || {}) },
            canvas: { ...(parent.canvas || {}), ...(child.canvas || {}) },
            parameters: { ...(parent.parameters || {}), ...(child.parameters || {}) },
            content: [...(parent.content || []), ...(child.content || [])]
        };
        return merged;
    }
}

export const layoutStore = new LayoutStore();
