import { Layout } from './model/layout';
import * as yaml from 'js-yaml';

class LayoutStore {
    private layouts: Map<string, Layout> = new Map();
    private layoutInfo: Map<string, { path: string, description: string }> = new Map();

    public async initialize() {
        const layoutPath = game.settings.get('pfs-chronicle-generator', 'layoutPath');
        await this.findAllLayouts({ source: "data", target: layoutPath });
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
        const layoutData = yaml.load(fileContent) as any;

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
        const layouts: { id: string, description: string }[] = [];
        for (const [id, info] of this.layoutInfo.entries()) {
            layouts.push({ id: id, description: info.description });
        }
        return layouts;
    }

    private async findAllLayouts(source: { source: string, target: string }) {
        try {
            console.log(`PFS Chronicle Generator | Browsing for layouts in ${source.target}`);
            const browseResult = await foundry.applications.apps.FilePicker.browse(source.source, source.target);
            console.log(`PFS Chronicle Generator | Found ${browseResult.files.length} files and ${browseResult.dirs.length} directories.`);
            for (const file of browseResult.files) {
                if (!file.endsWith(".yml")) {
                    continue;
                }
                const fileContent = await fetch(file).then(r => r.text());
                const idMatch = fileContent.match(/id:\s*(.*)/);
                const descriptionMatch = fileContent.match(/description:\s*(".*"|.*)/);
                if (idMatch && descriptionMatch) {
                    const id = idMatch[1].trim();
                    let description = descriptionMatch[1].trim();
                    if (description.startsWith('"') && description.endsWith('"')) {
                        description = description.substring(1, description.length - 1);
                    }
                    this.layoutInfo.set(id, { path: file, description: description });
                }
            }

            for (const dir of browseResult.dirs) {
                await this.findAllLayouts({ source: source.source, target: dir });
            }
        } catch (e) {
            if (game.isGM())
                console.error(`PFS Chronicle Generator | Failed to load layouts from ${source.target}`, e);
            else
                console.error(`PFS Chronicle Generator | Non-GM user shouldn't initialize the LayoutStore`);
        }
    }

    private mergeLayouts(parent: Layout, child: any): Layout {
        const merged = { ...parent, ...child };
        merged.presets = { ...(parent.presets || {}), ...(child.presets || {}) };
        merged.canvas = { ...(parent.canvas || {}), ...(child.canvas || {}) };
        merged.parameters = { ...(parent.parameters || {}), ...(child.parameters || {}) };
        merged.content = [ ...(parent.content || []), ...(child.content || []) ];
        return merged as Layout;
    }
}

export const layoutStore = new LayoutStore();
