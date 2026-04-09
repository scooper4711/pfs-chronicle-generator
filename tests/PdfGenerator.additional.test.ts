/**
 * Additional tests for PdfGenerator
 *
 * Covers line, strikeout, checkbox, trigger, choice, multiline.
 */

import { PDFDocument, PDFPage } from 'pdf-lib';
import { PdfGenerator } from '../scripts/PdfGenerator';
import { Layout } from '../scripts/model/layout';

describe('PdfGenerator - additional element types', () => {
  let pdfDoc: PDFDocument;
  let page: PDFPage;

  beforeEach(async () => {
    pdfDoc = await PDFDocument.create();
    page = pdfDoc.addPage();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('line element', () => {
    it('should draw a line with canvas', async () => {
      const spy = jest.spyOn(page, 'drawLine');
      const layout: Layout = {
        id: 'l1', description: 'l1',
        canvas: { main: { x: 0, y: 0, x2: 100, y2: 100 } },
        parameters: {}, presets: {},
        content: [{ type: 'line', canvas: 'main', x: 10, y: 50, x2: 90, linewidth: 2, color: 'black' }],
      };
      await new PdfGenerator(pdfDoc, layout, {}).generate();
      expect(spy).toHaveBeenCalled();
    });

    it('should draw a line without canvas', async () => {
      const spy = jest.spyOn(page, 'drawLine');
      const layout: Layout = {
        id: 'l2', description: 'l2', canvas: {}, parameters: {}, presets: {},
        content: [{ type: 'line', x: 10, y: 50, x2: 90, linewidth: 1 }],
      };
      await new PdfGenerator(pdfDoc, layout, {}).generate();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('strikeout element', () => {
    it('should draw a strikeout rectangle with canvas', async () => {
      const spy = jest.spyOn(page, 'drawRectangle');
      const layout: Layout = {
        id: 's1', description: 's1',
        canvas: { main: { x: 0, y: 0, x2: 100, y2: 100 } },
        parameters: {}, presets: {},
        content: [{ type: 'strikeout', canvas: 'main', x: 10, y: 10, x2: 90, y2: 20, color: 'white' }],
      };
      await new PdfGenerator(pdfDoc, layout, {}).generate();
      expect(spy).toHaveBeenCalled();
    });

    it('should draw a strikeout without canvas', async () => {
      const spy = jest.spyOn(page, 'drawRectangle');
      const layout: Layout = {
        id: 's2', description: 's2', canvas: {}, parameters: {}, presets: {},
        content: [{ type: 'strikeout', x: 10, y: 10, x2: 90, y2: 20 }],
      };
      await new PdfGenerator(pdfDoc, layout, {}).generate();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('checkbox element', () => {
    it('should draw a checkbox with x2/y2', async () => {
      const spy = jest.spyOn(page, 'drawLine');
      const layout: Layout = {
        id: 'c1', description: 'c1',
        canvas: { main: { x: 0, y: 0, x2: 100, y2: 100 } },
        parameters: {}, presets: {},
        content: [{ type: 'checkbox', canvas: 'main', x: 10, y: 10, x2: 15, y2: 15, color: 'black' }],
      };
      await new PdfGenerator(pdfDoc, layout, {}).generate();
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('should draw a checkbox with size parameter', async () => {
      const spy = jest.spyOn(page, 'drawLine');
      const layout: Layout = {
        id: 'c2', description: 'c2',
        canvas: { main: { x: 0, y: 0, x2: 100, y2: 100 } },
        parameters: {}, presets: { chk: { size: 3, linewidth: 1 } },
        content: [{ type: 'checkbox', canvas: 'main', presets: ['chk'], x: 10, y: 10 }],
      };
      await new PdfGenerator(pdfDoc, layout, {}).generate();
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('should draw a checkbox without canvas', async () => {
      const spy = jest.spyOn(page, 'drawLine');
      const layout: Layout = {
        id: 'c3', description: 'c3', canvas: {}, parameters: {}, presets: {},
        content: [{ type: 'checkbox', x: 10, y: 10, x2: 15, y2: 15 }],
      };
      await new PdfGenerator(pdfDoc, layout, {}).generate();
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  describe('trigger element', () => {
    it('should draw child content when trigger param is truthy', async () => {
      const spy = jest.spyOn(page, 'drawText');
      const layout: Layout = {
        id: 't1', description: 't1', canvas: {}, parameters: {},
        presets: { df: { font: 'helvetica', fontsize: 12 } },
        content: [{
          type: 'trigger', trigger: 'param:show',
          content: [{ type: 'text', value: 'Triggered', presets: ['df'], x: 0, y: 10, x2: 100 }],
        }],
      };
      await new PdfGenerator(pdfDoc, layout, { show: true }).generate();
      expect(spy).toHaveBeenCalledWith('Triggered', expect.anything());
    });

    it('should not draw child content when trigger param is falsy', async () => {
      const spy = jest.spyOn(page, 'drawText');
      const layout: Layout = {
        id: 't2', description: 't2', canvas: {}, parameters: {},
        presets: { df: { font: 'helvetica', fontsize: 12 } },
        content: [{
          type: 'trigger', trigger: 'param:show',
          content: [{ type: 'text', value: 'Nope', presets: ['df'], x: 0, y: 10, x2: 100 }],
        }],
      };
      await new PdfGenerator(pdfDoc, layout, { show: false }).generate();
      expect(spy).not.toHaveBeenCalled();
    });

    it('should not draw when trigger has no trigger param', async () => {
      const spy = jest.spyOn(page, 'drawText');
      const layout: Layout = {
        id: 't3', description: 't3', canvas: {}, parameters: {}, presets: {},
        content: [{ type: 'trigger', content: [{ type: 'text', value: 'X' }] }],
      };
      await new PdfGenerator(pdfDoc, layout, {}).generate();
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('choice element', () => {
    it('should draw content for matching choice branch', async () => {
      const spy = jest.spyOn(page, 'drawText');
      const layout: Layout = {
        id: 'ch1', description: 'ch1', canvas: {}, parameters: {},
        presets: { df: { font: 'helvetica', fontsize: 12 } },
        content: [{
          type: 'choice', choices: 'param:sel' as any,
          content: {
            optA: [{ type: 'text', value: 'A', presets: ['df'], x: 0, y: 10, x2: 100 }],
            optB: [{ type: 'text', value: 'B', presets: ['df'], x: 0, y: 20, x2: 100 }],
          },
        }],
      };
      await new PdfGenerator(pdfDoc, layout, { sel: 'optA' }).generate();
      expect(spy).toHaveBeenCalledWith('A', expect.anything());
      expect(spy).not.toHaveBeenCalledWith('B', expect.anything());
    });

    it('should handle multiple choices from array values', async () => {
      const spy = jest.spyOn(page, 'drawText');
      const layout: Layout = {
        id: 'ch2', description: 'ch2', canvas: {}, parameters: {},
        presets: { df: { font: 'helvetica', fontsize: 12 } },
        content: [{
          type: 'choice', choices: 'param:sel' as any,
          content: {
            optA: [{ type: 'text', value: 'A', presets: ['df'], x: 0, y: 10, x2: 100 }],
            optB: [{ type: 'text', value: 'B', presets: ['df'], x: 0, y: 20, x2: 100 }],
          },
        }],
      };
      await new PdfGenerator(pdfDoc, layout, { sel: ['optA', 'optB'] }).generate();
      expect(spy).toHaveBeenCalledWith('A', expect.anything());
      expect(spy).toHaveBeenCalledWith('B', expect.anything());
    });

    it('should skip choice element when choices is missing', async () => {
      const spy = jest.spyOn(page, 'drawText');
      const layout: Layout = {
        id: 'ch3', description: 'ch3', canvas: {}, parameters: {}, presets: {},
        content: [{ type: 'choice', content: { a: [{ type: 'text', value: 'X' }] } }],
      };
      await new PdfGenerator(pdfDoc, layout, {}).generate();
      expect(spy).not.toHaveBeenCalled();
    });

    it('should skip choice element when content is an array', async () => {
      const spy = jest.spyOn(page, 'drawText');
      const layout: Layout = {
        id: 'ch4', description: 'ch4', canvas: {}, parameters: {}, presets: {},
        content: [{ type: 'choice', choices: 'param:v' as any, content: [{ type: 'text', value: 'X' }] }],
      };
      await new PdfGenerator(pdfDoc, layout, { v: 'X' }).generate();
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('multiline element', () => {
    it('should draw multiline text', async () => {
      const spy = jest.spyOn(page, 'drawText');
      const layout: Layout = {
        id: 'm1', description: 'm1', canvas: {}, parameters: {},
        presets: { df: { font: 'helvetica', fontsize: 10 } },
        content: [{ type: 'multiline', value: 'param:notes', presets: ['df'], x: 0, y: 0, x2: 100, y2: 50 }],
      };
      await new PdfGenerator(pdfDoc, layout, { notes: ['L1', 'L2', 'L3'] }).generate();
      expect(spy).toHaveBeenCalledTimes(3);
    });

    it('should not draw when multiline value is empty', async () => {
      const spy = jest.spyOn(page, 'drawText');
      const layout: Layout = {
        id: 'm2', description: 'm2', canvas: {}, parameters: {},
        presets: { df: { font: 'helvetica', fontsize: 10 } },
        content: [{ type: 'multiline', value: 'param:notes', presets: ['df'], x: 0, y: 0, x2: 100, y2: 50 }],
      };
      await new PdfGenerator(pdfDoc, layout, {}).generate();
      expect(spy).not.toHaveBeenCalled();
    });

    it('should draw multiline text with canvas', async () => {
      const spy = jest.spyOn(page, 'drawText');
      const layout: Layout = {
        id: 'm3', description: 'm3',
        canvas: { main: { x: 0, y: 0, x2: 100, y2: 100 } },
        parameters: {}, presets: { df: { font: 'helvetica', fontsize: 10 } },
        content: [{ type: 'multiline', value: 'param:notes', canvas: 'main', presets: ['df'], x: 0, y: 0, x2: 100, y2: 50 }],
      };
      await new PdfGenerator(pdfDoc, layout, { notes: ['L1'] }).generate();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should handle center-aligned multiline', async () => {
      const spy = jest.spyOn(page, 'drawText');
      const layout: Layout = {
        id: 'm4', description: 'm4', canvas: {}, parameters: {},
        presets: { df: { font: 'helvetica', fontsize: 10 } },
        content: [{ type: 'multiline', value: 'param:n', presets: ['df'], x: 0, y: 0, x2: 100, y2: 50, align: 'C' }],
      };
      await new PdfGenerator(pdfDoc, layout, { n: ['C'] }).generate();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should handle right-aligned multiline', async () => {
      const spy = jest.spyOn(page, 'drawText');
      const layout: Layout = {
        id: 'm5', description: 'm5', canvas: {}, parameters: {},
        presets: { df: { font: 'helvetica', fontsize: 10 } },
        content: [{ type: 'multiline', value: 'param:n', presets: ['df'], x: 0, y: 0, x2: 100, y2: 50, align: 'R' }],
      };
      await new PdfGenerator(pdfDoc, layout, { n: ['R'] }).generate();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('text element edge cases', () => {
    it('should not draw text when value resolves to undefined', async () => {
      const spy = jest.spyOn(page, 'drawText');
      const layout: Layout = {
        id: 'te1', description: 'te1', canvas: {}, parameters: {},
        presets: { df: { font: 'helvetica', fontsize: 12 } },
        content: [{ type: 'text', value: 'param:missing', presets: ['df'], x: 0, y: 10, x2: 100 }],
      };
      await new PdfGenerator(pdfDoc, layout, {}).generate();
      expect(spy).not.toHaveBeenCalled();
    });

    it('should handle right-aligned text', async () => {
      const spy = jest.spyOn(page, 'drawText');
      const layout: Layout = {
        id: 'te2', description: 'te2', canvas: {}, parameters: {},
        presets: { r: { font: 'helvetica', fontsize: 12, align: 'R' } },
        content: [{ type: 'text', value: 'Right', presets: ['r'], x: 0, y: 10, x2: 100 }],
      };
      await new PdfGenerator(pdfDoc, layout, {}).generate();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should handle text with canvas and CM alignment', async () => {
      const spy = jest.spyOn(page, 'drawText');
      const layout: Layout = {
        id: 'te3', description: 'te3',
        canvas: { main: { x: 0, y: 0, x2: 100, y2: 100 } },
        parameters: {}, presets: { df: { font: 'helvetica', fontsize: 12 } },
        content: [{ type: 'text', value: 'CT', canvas: 'main', presets: ['df'], x: 10, y: 10, x2: 90, y2: 20, align: 'CM' }],
      };
      await new PdfGenerator(pdfDoc, layout, {}).generate();
      expect(spy).toHaveBeenCalledWith('CT', expect.anything());
    });

    it('should handle bottom-aligned text', async () => {
      const spy = jest.spyOn(page, 'drawText');
      const layout: Layout = {
        id: 'te4', description: 'te4', canvas: {}, parameters: {},
        presets: { b: { font: 'helvetica', fontsize: 12, align: 'B' } },
        content: [{ type: 'text', value: 'Bot', presets: ['b'], x: 0, y: 10, x2: 100, y2: 30 }],
      };
      await new PdfGenerator(pdfDoc, layout, {}).generate();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('generate with no content', () => {
    it('should handle layout with no content array', async () => {
      const layout: Layout = {
        id: 'empty', description: 'Empty', canvas: {}, parameters: {}, presets: {},
      };
      await new PdfGenerator(pdfDoc, layout, {}).generate();
    });
  });
});
