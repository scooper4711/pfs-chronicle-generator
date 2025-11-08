"""chronical2layout

Detect checkboxes and extract text lines from a single-page PDF and output useful JSON data.
This is a renamed copy of the previous `checkbox_finder_simple.py` module.
"""
import argparse
import json
from pathlib import Path
import sys

import fitz  # PyMuPDF
import numpy as np
import cv2

import pytesseract
from pytesseract import Output


def image_checkboxes(pdf_path: str, zoom: int = 3, min_box_size_pct: float = 0.4, 
                    max_box_size_pct: float = 1.2, debug_dir: str = None, 
                    max_fill_ratio: float = 0.95, min_mean_inner: float = 140.0):
    """Detect hollow square checkboxes in a rendered PDF page using OpenCV.
    
    Returns coordinates as percentages of page dimensions.
    """
    # Load and render PDF page
    doc = fitz.open(pdf_path)
    if doc.page_count < 1:
        return []
    page = doc.load_page(0)
    mat = fitz.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
    if img.ndim == 3 and img.shape[2] == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    else:
        gray = img

    h, w = gray.shape

    # Preprocess image
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    th = cv2.adaptiveThreshold(blur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                             cv2.THRESH_BINARY_INV, 11, 2)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    closed = cv2.morphologyEx(th, cv2.MORPH_CLOSE, kernel, iterations=2)

    # Find contours
    contours, _ = cv2.findContours(closed, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    results = []

    # Process each contour
    for cnt in contours:
        if cv2.contourArea(cnt) < 10:
            continue
            
        # Approximate the contour to a polygon
        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.02 * peri, True)
        
        # Look for quadrilateral shapes
        if len(approx) == 4:
            x, y, bw, bh = cv2.boundingRect(approx)
            
            # Calculate size as percentage of page dimensions
            bw_pct = bw / w * 100.0
            bh_pct = bh / h * 100.0
            if not (min_box_size_pct <= bw_pct <= max_box_size_pct and 
                   min_box_size_pct <= bh_pct <= max_box_size_pct):
                continue
                
            # Check if roughly square
            ar = float(bw) / float(bh) if bh > 0 else 0
            if ar < 0.6 or ar > 1.6:
                continue

            # Calculate fill ratio to find hollow boxes
            mask = np.zeros((h, w), dtype=np.uint8)
            cv2.drawContours(mask, [approx], -1, 255, -1)
            filled_area = cv2.countNonZero(mask[y:y+bh, x:x+bw])
            fill_ratio = float(filled_area) / float(max(1, bw * bh))
            if fill_ratio > max_fill_ratio:
                continue

            # Convert to percent coordinates (0% = top/left of page)
            x_pct = (x / w) * 100.0
            y_pct = (y / h) * 100.0
            x2_pct = ((x + bw) / w) * 100.0
            y2_pct = ((y + bh) / h) * 100.0
            
            results.append({
                "x": round(x_pct, 3),
                "y": round(y_pct, 3),
                "x2": round(x2_pct, 3),
                "y2": round(y2_pct, 3)
            })

    # Deduplicate results that are very close together
    deduped = []
    for r in sorted(results, key=lambda x: (x['x'], x['y'])):
        if not any(abs(d['x'] - r['x']) < 0.5 and 
                  abs(d['y'] - r['y']) < 0.5 for d in deduped):
            deduped.append(r)

    # Save debug images if requested
    if debug_dir:
        try:
            outp = Path(debug_dir)
            outp.mkdir(parents=True, exist_ok=True)
            
            # Save rendered page
            if img.ndim == 3 and img.shape[2] == 3:
                rendered_bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
            else:
                rendered_bgr = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)

            # Create debug visualization
            annotated = rendered_bgr.copy()
            for r in deduped:
                # Convert percentages back to image coordinates
                x = int((r['x'] / 100.0) * w)
                y = int((r['y'] / 100.0) * h)
                x2 = int((r['x2'] / 100.0) * w)
                y2 = int((r['y2'] / 100.0) * h)
                
                # Draw detection
                cv2.rectangle(annotated, (x, y), (x2, y2), (0, 255, 0), 2)
                cx = (x + x2) // 2
                cy = (y + y2) // 2
                cv2.circle(annotated, (cx, cy), 3, (0, 0, 255), -1)
                cv2.putText(annotated, f"{r['x']:.1f},{r['y']:.1f}", 
                          (x, max(10, y-5)), cv2.FONT_HERSHEY_SIMPLEX, 0.4, 
                          (255, 0, 0), 1)

            cv2.imwrite(str(outp / 'annotated.png'), annotated)
            cv2.imwrite(str(outp / 'threshold.png'), th)

        except Exception as e:
            print(f"Failed to save debug images: {e}", file=sys.stderr)

    return deduped

def extract_text_lines(pdf_path: str, region_pct=None, zoom=6):
    """
    Extract bounding boxes for each line of text inside a specified region (region_pct: [x0, y0, x1, y1] in percent coordinates).
    Always runs OCR on the cropped region. Returns list of dicts: {text, top_left_pct, bottom_right_pct} where the percentages
    are relative to the cropped sub-canvas.
    """
    doc = fitz.open(pdf_path)
    if doc.page_count < 1:
        return []
    page = doc.load_page(0)
    mat = fitz.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
    if img.ndim == 3 and img.shape[2] == 3:
        rgb = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
    else:
        rgb = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    h, w = rgb.shape[:2]

    # If no region_pct provided, use the repository's default Items region
    if region_pct is None:
        region_pct = [0.5, 50.8, 40.0, 83.0]

    # convert percent region to full-image pixels and crop
    try:
        rx0, ry0, rx1, ry1 = region_pct
        cx0 = int((rx0 / 100.0) * w)
        cy0 = int((ry0 / 100.0) * h)
        cx1 = int((rx1 / 100.0) * w)
        cy1 = int((ry1 / 100.0) * h)
        # clamp
        cx0 = max(0, min(w - 1, cx0))
        cy0 = max(0, min(h - 1, cy0))
        cx1 = max(0, min(w - 1, cx1))
        cy1 = max(0, min(h - 1, cy1))
        if cx1 <= cx0 or cy1 <= cy0:
            return []
    except Exception:
        return []

    crop = rgb[cy0:cy1, cx0:cx1]
    ch, cw = crop.shape[:2]

    # OCR the crop and cluster words into lines
    data = pytesseract.image_to_data(crop, output_type=Output.DICT, config='--psm 6')
    n_boxes = len(data['level'])
    words = []
    heights = []
    for i in range(n_boxes):
        text = data['text'][i].strip()
        if not text:
            continue
        x, y, bw, bh = data['left'][i], data['top'][i], data['width'][i], data['height'][i]
        words.append({'text': text, 'left': x, 'top': y, 'w': bw, 'h': bh, 'right': x + bw})
        heights.append(bh)

    if not words:
        return []

    median_h = int(np.median(heights)) if heights else 12
    v_thresh = max(8, int(median_h * 0.9))

    words.sort(key=lambda w: (w['top'], w['left']))
    clusters = []
    current = [words[0]]
    last_top = words[0]['top']
    for wd in words[1:]:
        if wd['top'] - last_top <= v_thresh:
            current.append(wd)
            last_top = int((last_top + wd['top']) / 2)
        else:
            clusters.append(current)
            current = [wd]
            last_top = wd['top']
    if current:
        clusters.append(current)

    results = []
    for cluster in clusters:
        cluster.sort(key=lambda w: w['left'])
        line_text = ' '.join(wd['text'] for wd in cluster).lower()
        if 'items' in line_text:
            continue
        x0 = min(wd['left'] for wd in cluster)
        y0 = min(wd['top'] for wd in cluster)
        x1 = max(wd['right'] for wd in cluster)
        y1 = max(wd['top'] + wd['h'] for wd in cluster)
        text_out = ' '.join(wd['text'] for wd in cluster)
        x0_pct = x0 / cw * 100.0
        y0_pct = y0 / ch * 100.0
        x1_pct = x1 / cw * 100.0
        y1_pct = y1 / ch * 100.0
        results.append({
            'text': text_out,
            'top_left_pct': [round(x0_pct, 3), round(y0_pct, 3)],
            'bottom_right_pct': [round(x1_pct, 3), round(y1_pct, 3)]
        })

    return results


def main():
    p = argparse.ArgumentParser(
        description="chronical2layout: find checkboxes and extract text lines from a single-page PDF and output JSON.")
    p.add_argument("pdf", help="Path to single-page PDF")
    p.add_argument("--debug-dir", type=str, default=None,
                  help="Directory to write debug images")
    p.add_argument("--region", type=str, default=None,
                  help="Region in percent as x0,y0,x1,y1 (e.g. 0.5,50.8,40,83). If omitted, a sensible default is used.")
    p.add_argument("--skip-checkboxes", action='store_true',
                  help="If set, skip checkbox detection and only run text extraction.")
    args = p.parse_args()

    try:
        # Parse region CLI arg if provided
        region_pct = None
        if args.region:
            try:
                parts = [p.strip() for p in args.region.split(',') if p.strip() != '']
                if len(parts) != 4:
                    raise ValueError('region must have four comma-separated values')
                region_pct = [float(x) for x in parts]
            except Exception as e:
                print(json.dumps({"error": f"Invalid --region value: {e}"}))
                return

        # Checkbox detection is optional
        if not args.skip_checkboxes:
            out = image_checkboxes(
                args.pdf,
                debug_dir=args.debug_dir
            )
            print(json.dumps({"checkboxes": out}, indent=2))

        # Extract text lines inside the (possibly default) region
        lines = extract_text_lines(args.pdf, region_pct=region_pct)
        print(json.dumps({"item_lines": lines}, indent=2))
    except Exception as e:
        print(json.dumps({"error": str(e)}))


if __name__ == '__main__':
    main()
