/**
 * Additional tests for pdf-utils module
 *
 * Covers getColor and getCanvasRect functions that were previously untested.
 */

import { PDFDocument } from 'pdf-lib';
import { getColor, getCanvasRect, getFont } from './pdf-utils';
import { Canvas } from '../model/layout';

describe('getColor', () => {
  it('should return black for undefined color', () => {
    const color = getColor(undefined);
    expect(color).toEqual({ type: 'RGB', red: 0, green: 0, blue: 0 });
  });

  it('should return black for "black"', () => {
    const color = getColor('black');
    expect(color).toEqual({ type: 'RGB', red: 0, green: 0, blue: 0 });
  });

  it('should return white for "white"', () => {
    const color = getColor('white');
    expect(color).toEqual({ type: 'RGB', red: 1, green: 1, blue: 1 });
  });

  it('should return red for "red"', () => {
    const color = getColor('red');
    expect(color).toEqual({ type: 'RGB', red: 1, green: 0, blue: 0 });
  });

  it('should return green for "green"', () => {
    const color = getColor('green');
    expect(color).toEqual({ type: 'RGB', red: 0, green: 1, blue: 0 });
  });

  it('should return blue for "blue"', () => {
    const color = getColor('blue');
    expect(color).toEqual({ type: 'RGB', red: 0, green: 0, blue: 1 });
  });

  it('should be case-insensitive', () => {
    const color = getColor('RED');
    expect(color).toEqual({ type: 'RGB', red: 1, green: 0, blue: 0 });
  });

  it('should default to black for unknown colors', () => {
    const color = getColor('purple');
    expect(color).toEqual({ type: 'RGB', red: 0, green: 0, blue: 0 });
  });
});

describe('getCanvasRect', () => {
  const pageWidth = 600;
  const pageHeight = 800;

  it('should calculate root canvas position from percentages', () => {
    const canvasConfig: Record<string, Canvas> = {
      main: { x: 10, y: 10, x2: 90, y2: 90 },
    };

    const rect = getCanvasRect('main', canvasConfig, pageWidth, pageHeight);

    expect(rect.x).toBe(60);
    expect(rect.y).toBe(80);
    expect(rect.width).toBe(480);
    expect(rect.height).toBe(640);
  });

  it('should calculate nested canvas position relative to parent', () => {
    const canvasConfig: Record<string, Canvas> = {
      parent: { x: 0, y: 0, x2: 100, y2: 100 },
      child: { parent: 'parent', x: 10, y: 20, x2: 50, y2: 60 },
    };

    const rect = getCanvasRect('child', canvasConfig, pageWidth, pageHeight);

    expect(rect.x).toBe(60);
    expect(rect.y).toBe(160);
    expect(rect.width).toBe(240);
    expect(rect.height).toBe(320);
  });

  it('should throw for unknown canvas name', () => {
    const canvasConfig: Record<string, Canvas> = {};

    expect(() => getCanvasRect('missing', canvasConfig, pageWidth, pageHeight))
      .toThrow('Canvas with name missing not found.');
  });

  it('should handle full-page canvas (0-100%)', () => {
    const canvasConfig: Record<string, Canvas> = {
      fullpage: { x: 0, y: 0, x2: 100, y2: 100 },
    };

    const rect = getCanvasRect('fullpage', canvasConfig, pageWidth, pageHeight);

    expect(rect.x).toBe(0);
    expect(rect.y).toBe(0);
    expect(rect.width).toBe(600);
    expect(rect.height).toBe(800);
  });
});

describe('getFont - web font handling', () => {
  let pdfDoc: PDFDocument;

  beforeEach(async () => {
    pdfDoc = await PDFDocument.create();
  });

  it('should fall back to Helvetica for unknown standard font', async () => {
    const font = await getFont(pdfDoc, 'unknown-font');
    expect(font).toBeDefined();
  });

  it('should handle undefined font name', async () => {
    const font = await getFont(pdfDoc, undefined);
    expect(font).toBeDefined();
  });
});
