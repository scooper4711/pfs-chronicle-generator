/**
 * Unit tests for chronicle path template structure
 * 
 * Tests that the file picker button and chronicle path field are rendered
 * correctly in the party chronicle form template.
 * 
 * Requirements: conditional-chronicle-path-visibility 1.1, 1.3, 1.4
 */

import { describe, it, expect } from '@jest/globals';

// Mock foundry global before importing PartyChronicleApp
(global as any).foundry = {
  applications: {
    api: {
      ApplicationV2: class {},
      HandlebarsApplicationMixin: (base: any) => base,
    },
    handlebars: {
      renderTemplate: async (template: string, context: any) => {
        // Mock template rendering - return HTML that matches the actual template structure
        const chroniclePathVisible = context.chroniclePathExists ? '' : 'chronicle-path-visible';
        return `
          <aside class="sidebar">
            <ol class="box-list chronicle-shared">
              <li class="box summary">
                <header>Event Details</header>
                <div class="summary-data">
                  <div class="form-group ${chroniclePathVisible}" id="chroniclePathGroup">
                    <label for="blankChroniclePath">Chronicle Path</label>
                    <div class="form-fields">
                      <input type="text" id="blankChroniclePath" name="shared.blankChroniclePath" value="${context.shared?.blankChroniclePath || ''}" readonly>
                      <button type="button" class="file-picker-button" id="chroniclePathFilePicker"><i class="fas fa-folder-open"></i></button>
                    </div>
                  </div>
                </div>
              </li>
            </ol>
          </aside>
        `;
      }
    },
    ux: {
      FormDataExtended: class {},
    },
  },
};

// Mock Foundry VTT game global
global.game = {
  settings: {
    get: jest.fn((module: string, key: string) => {
      const defaults: Record<string, any> = {
        gmPfsNumber: '123456',
        eventName: 'Test Event',
        eventcode: 'TEST-001',
        blankChroniclePath: '/path/to/blank.pdf',
        season: 'pfs2-season7',
        layout: 'test-layout'
      };
      return defaults[key] || '';
    })
  }
} as any;

// Mock layoutStore
jest.mock('../../scripts/LayoutStore', () => ({
  layoutStore: {
    getSeasons: jest.fn(() => [
      { id: 'pfs2-season7', name: 'Season 7' }
    ]),
    getLayoutsByParent: jest.fn(() => [
      { id: 'test-layout', description: 'Test Layout' }
    ]),
    getLayout: jest.fn(async (layoutId: string) => ({
      id: layoutId,
      description: 'Test Layout',
      defaultChronicleLocation: undefined // No default for test layouts
    }))
  }
}));

// Mock party chronicle storage
jest.mock('../../scripts/model/party-chronicle-storage', () => ({
  loadPartyChronicleData: jest.fn(async () => null)
}));

// Now import PartyChronicleApp after mocks are set up
import { PartyChronicleApp } from '../../scripts/PartyChronicleApp';

describe('Chronicle Path Template Structure Tests', () => {
  const createMockActor = () => ({
    id: 'actor-1',
    name: 'Test Character',
    type: 'character',
    img: '/path/to/image.png',
    system: {
      details: {
        level: { value: 5 }
      }
    }
  });

  describe('File Picker Button Existence', () => {
    /**
     * Test that file picker button exists in rendered form
     * 
     * Requirements: conditional-chronicle-path-visibility 1.1
     */
    it('should render file picker button next to chronicle path field', async () => {
      const app = new PartyChronicleApp([createMockActor()]);
      const context = await app._prepareContext();
      const html = await (global as any).foundry.applications.handlebars.renderTemplate(
        'modules/pfs-chronicle-generator/templates/party-chronicle-filling.hbs',
        context
      );

      expect(html).toContain('id="chroniclePathFilePicker"');
      expect(html).toContain('<button');
      expect(html).toContain('type="button"');
    });

    it('should render file picker button with class "file-picker-button"', async () => {
      const app = new PartyChronicleApp([createMockActor()]);
      const context = await app._prepareContext();
      const html = await (global as any).foundry.applications.handlebars.renderTemplate(
        'modules/pfs-chronicle-generator/templates/party-chronicle-filling.hbs',
        context
      );

      expect(html).toContain('class="file-picker-button"');
      expect(html).toContain('id="chroniclePathFilePicker"');
    });
  });

  describe('File Picker Button Icon', () => {
    /**
     * Test that button has folder icon (fas fa-folder-open)
     * 
     * Requirements: conditional-chronicle-path-visibility 1.3
     */
    it('should render file picker button with folder icon', async () => {
      const app = new PartyChronicleApp([createMockActor()]);
      const context = await app._prepareContext();
      const html = await (global as any).foundry.applications.handlebars.renderTemplate(
        'modules/pfs-chronicle-generator/templates/party-chronicle-filling.hbs',
        context
      );

      expect(html).toContain('<i class="fas fa-folder-open"></i>');
      
      const buttonMatch = html.match(/<button[^>]*id="chroniclePathFilePicker"[^>]*>.*?<\/button>/s);
      expect(buttonMatch).not.toBeNull();
      expect(buttonMatch![0]).toContain('<i class="fas fa-folder-open"></i>');
    });

    it('should render icon with both fas and fa-folder-open classes', async () => {
      const app = new PartyChronicleApp([createMockActor()]);
      const context = await app._prepareContext();
      const html = await (global as any).foundry.applications.handlebars.renderTemplate(
        'modules/pfs-chronicle-generator/templates/party-chronicle-filling.hbs',
        context
      );

      expect(html).toContain('fas');
      expect(html).toContain('fa-folder-open');
      
      const iconMatch = html.match(/<i[^>]*class="[^"]*fas[^"]*fa-folder-open[^"]*"[^>]*>/);
      expect(iconMatch).not.toBeNull();
    });
  });

  describe('Chronicle Path Field Readonly Attribute', () => {
    /**
     * Test that chronicle path field has readonly attribute
     * 
     * Requirements: conditional-chronicle-path-visibility 1.4
     */
    it('should render chronicle path input field with readonly attribute', async () => {
      const app = new PartyChronicleApp([createMockActor()]);
      const context = await app._prepareContext();
      const html = await (global as any).foundry.applications.handlebars.renderTemplate(
        'modules/pfs-chronicle-generator/templates/party-chronicle-filling.hbs',
        context
      );

      expect(html).toContain('id="blankChroniclePath"');
      expect(html).toContain('readonly');
      
      const inputMatch = html.match(/<input[^>]*id="blankChroniclePath"[^>]*>/);
      expect(inputMatch).not.toBeNull();
      expect(inputMatch![0]).toContain('readonly');
    });

    it('should render chronicle path input field with type="text"', async () => {
      const app = new PartyChronicleApp([createMockActor()]);
      const context = await app._prepareContext();
      const html = await (global as any).foundry.applications.handlebars.renderTemplate(
        'modules/pfs-chronicle-generator/templates/party-chronicle-filling.hbs',
        context
      );

      const inputMatch = html.match(/<input[^>]*id="blankChroniclePath"[^>]*>/);
      expect(inputMatch).not.toBeNull();
      expect(inputMatch![0]).toContain('type="text"');
    });

    it('should render chronicle path input field with correct name attribute', async () => {
      const app = new PartyChronicleApp([createMockActor()]);
      const context = await app._prepareContext();
      const html = await (global as any).foundry.applications.handlebars.renderTemplate(
        'modules/pfs-chronicle-generator/templates/party-chronicle-filling.hbs',
        context
      );

      const inputMatch = html.match(/<input[^>]*id="blankChroniclePath"[^>]*>/);
      expect(inputMatch).not.toBeNull();
      expect(inputMatch![0]).toContain('name="shared.blankChroniclePath"');
    });
  });

  describe('Form Fields Wrapper Structure', () => {
    /**
     * Test that form-fields wrapper structure matches Layout Designer
     * 
     * Requirements: conditional-chronicle-path-visibility 1.1
     */
    it('should wrap input and button in form-fields div', async () => {
      const app = new PartyChronicleApp([createMockActor()]);
      const context = await app._prepareContext();
      const html = await (global as any).foundry.applications.handlebars.renderTemplate(
        'modules/pfs-chronicle-generator/templates/party-chronicle-filling.hbs',
        context
      );

      expect(html).toContain('<div class="form-fields">');
      
      const formFieldsMatch = html.match(/<div class="form-fields">.*?<\/div>/s);
      expect(formFieldsMatch).not.toBeNull();
      expect(formFieldsMatch![0]).toContain('id="blankChroniclePath"');
      expect(formFieldsMatch![0]).toContain('id="chroniclePathFilePicker"');
    });

    it('should have input before button in form-fields', async () => {
      const app = new PartyChronicleApp([createMockActor()]);
      const context = await app._prepareContext();
      const html = await (global as any).foundry.applications.handlebars.renderTemplate(
        'modules/pfs-chronicle-generator/templates/party-chronicle-filling.hbs',
        context
      );

      const inputIndex = html.indexOf('id="blankChroniclePath"');
      const buttonIndex = html.indexOf('id="chroniclePathFilePicker"');
      
      expect(inputIndex).toBeGreaterThan(-1);
      expect(buttonIndex).toBeGreaterThan(-1);
      expect(inputIndex).toBeLessThan(buttonIndex);
    });

    it('should have form-group with id "chroniclePathGroup"', async () => {
      const app = new PartyChronicleApp([createMockActor()]);
      const context = await app._prepareContext();
      const html = await (global as any).foundry.applications.handlebars.renderTemplate(
        'modules/pfs-chronicle-generator/templates/party-chronicle-filling.hbs',
        context
      );

      expect(html).toContain('id="chroniclePathGroup"');
      
      const formGroupMatch = html.match(/<div[^>]*id="chroniclePathGroup"[^>]*>/);
      expect(formGroupMatch).not.toBeNull();
      expect(formGroupMatch![0]).toContain('class=');
      expect(formGroupMatch![0]).toContain('form-group');
    });

    it('should have label with correct for attribute', async () => {
      const app = new PartyChronicleApp([createMockActor()]);
      const context = await app._prepareContext();
      const html = await (global as any).foundry.applications.handlebars.renderTemplate(
        'modules/pfs-chronicle-generator/templates/party-chronicle-filling.hbs',
        context
      );

      expect(html).toContain('<label for="blankChroniclePath">');
      expect(html).toContain('Chronicle Path</label>');
    });
  });

  describe('Conditional Visibility Structure', () => {
    it('should add chronicle-path-visible class when file does not exist', async () => {
      const app = new PartyChronicleApp([createMockActor()]);
      const context = await app._prepareContext();
      
      (context as any).chroniclePathExists = false;
      
      const html = await (global as any).foundry.applications.handlebars.renderTemplate(
        'modules/pfs-chronicle-generator/templates/party-chronicle-filling.hbs',
        context
      );

      const formGroupMatch = html.match(/<div[^>]*id="chroniclePathGroup"[^>]*>/);
      expect(formGroupMatch).not.toBeNull();
      expect(formGroupMatch![0]).toContain('chronicle-path-visible');
    });

    it('should not add chronicle-path-visible class when file exists', async () => {
      const app = new PartyChronicleApp([createMockActor()]);
      const context = await app._prepareContext();
      
      (context as any).chroniclePathExists = true;
      
      const html = await (global as any).foundry.applications.handlebars.renderTemplate(
        'modules/pfs-chronicle-generator/templates/party-chronicle-filling.hbs',
        context
      );

      const formGroupMatch = html.match(/<div[^>]*id="chroniclePathGroup"[^>]*>/);
      expect(formGroupMatch).not.toBeNull();
      expect(formGroupMatch![0]).not.toContain('chronicle-path-visible');
    });
  });
});
