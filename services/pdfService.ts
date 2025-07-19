import { jsPDF } from 'jspdf';
import { Report } from '../types';
import { getDownloadUrl } from './storageService';

const FONT_SIZES = {
  TITLE: 22,
  HEADING_2: 16,
  HEADING_3: 14,
  BODY: 12,
  META: 10,
};

const MARGINS = {
  TOP: 20,
  BOTTOM: 20,
  LEFT: 20,
  RIGHT: 20,
};

const LINE_HEIGHT = 1.4;

const a4Width = 210;
const a4Height = 297;
const printableWidth = a4Width - MARGINS.LEFT - MARGINS.RIGHT;

// Helper to fetch image data from a URL (could be a gs:// path or a public URL)
const getImageData = (url: string): Promise<{ data: string; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      // Create a canvas to get the data URL
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('Could not get canvas context');
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg');
      resolve({ data: dataUrl, width: img.width, height: img.height });
    };
    img.onerror = (err) => reject(err);
    img.src = url;
  });
};

export const generatePdf = async (report: Report, imageSizes: Record<string, number>): Promise<boolean> => {
  try {
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
    });

    let currentY = MARGINS.TOP;

    const checkAndAddPage = (spaceNeeded: number) => {
      if (currentY + spaceNeeded > a4Height - MARGINS.BOTTOM) {
        pdf.addPage();
        currentY = MARGINS.TOP;
      }
    };
    
    const addWrappedText = (text: string, fontSize: number, options: { isBold?: boolean, isItalic?: boolean, align?: 'left' | 'center' | 'right' } = {}) => {
        pdf.setFont('helvetica', options.isBold ? 'bold' : (options.isItalic ? 'italic' : 'normal'));
        pdf.setFontSize(fontSize);
        const textLines = pdf.splitTextToSize(text || ' ', printableWidth);
        const blockHeight = textLines.length * fontSize * 0.352778 * LINE_HEIGHT;
        
        checkAndAddPage(blockHeight);
        pdf.text(textLines, options.align === 'center' ? a4Width / 2 : MARGINS.LEFT, currentY, { align: options.align || 'left' });
        currentY += blockHeight;
    }

    addWrappedText(report.title, FONT_SIZES.TITLE, { isBold: true, align: 'center' });
    currentY += 4;
    addWrappedText(report.area, FONT_SIZES.HEADING_2, { align: 'center' });
    currentY += 2;
    addWrappedText(`Generated: ${new Date(report.createdAt).toLocaleDateString()}`, FONT_SIZES.META, { isItalic: true, align: 'center' });
    currentY += 10;
    
    pdf.setDrawColor(180, 180, 180);
    pdf.line(MARGINS.LEFT, currentY, a4Width - MARGINS.RIGHT, currentY);
    currentY += 10;

    for (const [index, point] of report.points.entries()) {
      checkAndAddPage(FONT_SIZES.HEADING_3 * 0.352778 * LINE_HEIGHT);
      addWrappedText(`Point #${index + 1}`, FONT_SIZES.HEADING_3, { isBold: true });
      currentY += 2;
      addWrappedText(point.text, FONT_SIZES.BODY);
      currentY += 5;

      for (const [imgIndex, path] of point.imagePaths.entries()) {
        try {
            const downloadUrl = await getDownloadUrl(path);
            const imgData = await getImageData(downloadUrl);
            const sizePercent = imageSizes[`${point.id}-${imgIndex}`] || 60;
            
            const desiredWidth = printableWidth * (sizePercent / 100);
            const aspectRatio = imgData.height / imgData.width;
            const imgHeight = desiredWidth * aspectRatio;

            const requiredSpace = imgHeight + 5;
            const printablePageHeight = a4Height - MARGINS.TOP - MARGINS.BOTTOM;

            if ((currentY + requiredSpace > a4Height - MARGINS.BOTTOM) && (requiredSpace <= printablePageHeight)) {
                pdf.addPage();
                currentY = MARGINS.TOP;
            }
            
            pdf.addImage(imgData.data, 'JPEG', MARGINS.LEFT, currentY, desiredWidth, imgHeight, undefined, 'FAST');
            currentY += requiredSpace;

        } catch(e) {
            console.error("Could not load image for PDF, skipping.", e);
            addWrappedText('[Image could not be loaded]', FONT_SIZES.META, { isItalic: true });
        }
      }
      
      if (index < report.points.length - 1) {
          checkAndAddPage(10);
          currentY += 5;
          pdf.setDrawColor(220, 220, 220);
          pdf.line(MARGINS.LEFT, currentY, a4Width - MARGINS.RIGHT, currentY);
          currentY += 5;
      }
    }

    const safeTitle = report.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    pdf.save(`Report_${safeTitle}.pdf`);
    return true;

  } catch (error) {
    console.error("Error generating PDF:", error);
    return false;
  }
};