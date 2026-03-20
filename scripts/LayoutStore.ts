import { Layout } from './model/layout';
import { debug, warn, error } from './utils/logger.js';

const LAYOUT_PATH = 'modules/pfs-chronicle-generator/layouts/';

class LayoutStore {
    private readonly layouts: Map<string, Layout> = new Map();
    private readonly layoutInfo: Map<string, { path: string, description: string }> = new Map();
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
            choices[id] = info.description;
        }
        return choices;
    }

    public getLayouts(): { id: string, description: string }[] {
        return Array.from(this.layoutInfo.entries()).map(([id, info]) => ({
            id,
            description: info.description
        }));
    }

    private getDisplayNameForDirectory(dirName: string): string {
        // Handle sN format (e.g., s1 -> Season 1)
        if (dirName.toLowerCase().match(/^s\d+$/)) {
            const num = dirName.substring(1);
            return `Season ${num}`;
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

        // Convert display name back to directory format if needed
        let dirFormat = parent;
        if (typeof parent === 'string') {
            // Handle Season N -> sN conversion
            dirFormat = parent.replace(/^Season (\d+)$/i, 's$1');
            // Handle spaces -> underscores for other names
            dirFormat = dirFormat.toLowerCase().replaceAll(' ', '_');
        }

        debug('Looking for layouts with dirFormat:', dirFormat);
        
        const layouts = Array.from(this.layoutInfo.entries())
            .filter(([id, info]) => {
                const idParts = id.split('.');
                return idParts.length > 1 && idParts[1].startsWith(dirFormat);
            })
            .map(([id, info]) => ({
                id,
                description: info.description
            }))
            .sort((a, b) => a.description.localeCompare(b.description));
        return layouts;
    }

    private async findAllLayouts(source: { source: string, target: string }) {
        try {
            debug(`Browsing for layouts in ${source.target}`);
            const browseResult = await foundry.applications.apps.FilePicker.browse(source.source, source.target);
            debug(`Found ${browseResult.files.length} files and ${browseResult.dirs.length} directories.`);
            
            // Store directory as a season if it contains layouts
            const dirName = source.target.split('/').pop();
            if (dirName && source.target.includes('/pfs2/')) {
                const parentDir = source.target.split('/').slice(-2)[0];
                if (parentDir === 'pfs2' && dirName !== 'pfs2') {
                    const displayName = this.getDisplayNameForDirectory(dirName);
                    this.seasonDirectories.set(dirName, displayName);
                }
            }
            
            for (const file of browseResult.files) {
                if (!file.endsWith(".json")) {
                    continue;
                }
                
                try {
                    const fileContent = await fetch(file).then(r => r.text());
                    const jsonData = JSON.parse(fileContent);
                    const id = jsonData.id;
                    const description = jsonData.description;

                    if (!id || !description) {
                        warn(`Layout file ${file} missing required fields (id or description)`);
                        continue;
                    }
                    
                    this.layoutInfo.set(id, { path: file, description: description });
                } catch (parseError) {
                    warn(`Failed to parse JSON layout file ${file}:`, parseError);
                    continue;
                }
            }

            // Process subdirectories
            await Promise.all(browseResult.dirs.map(dir => 
                this.findAllLayouts({ source: source.source, target: dir })
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
            presets: { ...(parent.presets || {}), ...(child.presets || {}) },
            canvas: { ...(parent.canvas || {}), ...(child.canvas || {}) },
            parameters: { ...(parent.parameters || {}), ...(child.parameters || {}) },
            content: [...(parent.content || []), ...(child.content || [])]
        };
        return merged;
    }
}

export const layoutStore = new LayoutStore();
