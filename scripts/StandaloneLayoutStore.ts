import { Layout } from './model/layout';
import * as yaml from 'js-yaml';
import * as fs from 'fs/promises';
import * as path from 'path';

export class StandaloneLayoutStore {
    private layouts: Map<string, Layout> = new Map();
    private layoutInfo: Map<string, { path: string, data: any }> = new Map();

    public async initialize(layoutDir: string) {
        await this.findAllLayouts(layoutDir);
    }

    private async findAllLayouts(dir: string) {
        const files = await fs.readdir(dir, { withFileTypes: true });
        for (const file of files) {
            const fullPath = path.join(dir, file.name);
            if (file.isDirectory()) {
                await this.findAllLayouts(fullPath);
            } else if (file.name.endsWith('.yml')) {
                const fileContent = await fs.readFile(fullPath, 'utf-8');
                const data = yaml.load(fileContent) as any;
                if (data.id) {
                    this.layoutInfo.set(data.id, { path: fullPath, data });
                }
            }
        }
    }

    public async getLayout(id: string): Promise<Layout> {
        if (this.layouts.has(id)) {
            return this.layouts.get(id)!;
        }

        const layoutInfo = this.layoutInfo.get(id);
        if (!layoutInfo) {
            throw new Error(`Layout with id ${id} not found.`);
        }

        let finalLayout: Layout;
        if (layoutInfo.data.parent) {
            const parentLayout = await this.getLayout(layoutInfo.data.parent);
            finalLayout = this.mergeLayouts(parentLayout, layoutInfo.data);
        } else {
            finalLayout = layoutInfo.data;
        }

        this.layouts.set(id, finalLayout);
        return finalLayout;
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
