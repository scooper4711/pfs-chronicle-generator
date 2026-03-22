import { PDFDocument } from 'pdf-lib';
import { getFont } from '../../scripts/utils/pdf-utils';

describe('getFont - standard font resolution', () => {
  let pdfDoc: PDFDocument;

  beforeEach(async () => {
    pdfDoc = await PDFDocument.create();
  });

  it('returns Helvetica by default', async () => {
    const font = await getFont(pdfDoc, undefined);
    expect(font).toBeDefined();
  });

  it('returns HelveticaBold for bold weight', async () => {
    const font = await getFont(pdfDoc, 'helvetica', 'bold');
    expect(font).toBeDefined();
  });

  it('returns HelveticaOblique for italic style', async () => {
    const font = await getFont(pdfDoc, 'helvetica', 'normal', 'italic');
    expect(font).toBeDefined();
  });

  it('returns HelveticaBoldOblique for bold italic', async () => {
    const font = await getFont(pdfDoc, 'helvetica', 'bold', 'italic');
    expect(font).toBeDefined();
  });

  it('returns TimesRoman for times', async () => {
    const font = await getFont(pdfDoc, 'times');
    expect(font).toBeDefined();
  });

  it('returns TimesRomanBold for times bold', async () => {
    const font = await getFont(pdfDoc, 'times', 'bold');
    expect(font).toBeDefined();
  });

  it('returns TimesRomanItalic for times italic', async () => {
    const font = await getFont(pdfDoc, 'times', 'normal', 'italic');
    expect(font).toBeDefined();
  });

  it('returns TimesRomanBoldItalic for times bold italic', async () => {
    const font = await getFont(pdfDoc, 'times', 'bold', 'italic');
    expect(font).toBeDefined();
  });

  it('returns Courier for courier', async () => {
    const font = await getFont(pdfDoc, 'courier');
    expect(font).toBeDefined();
  });

  it('returns CourierBold for courier bold', async () => {
    const font = await getFont(pdfDoc, 'courier', 'bold');
    expect(font).toBeDefined();
  });

  it('returns CourierOblique for courier italic', async () => {
    const font = await getFont(pdfDoc, 'courier', 'normal', 'italic');
    expect(font).toBeDefined();
  });

  it('returns CourierBoldOblique for courier bold italic', async () => {
    const font = await getFont(pdfDoc, 'courier', 'bold', 'italic');
    expect(font).toBeDefined();
  });

  it('falls back to Helvetica for unknown font', async () => {
    const font = await getFont(pdfDoc, 'comic-sans');
    expect(font).toBeDefined();
  });
});
