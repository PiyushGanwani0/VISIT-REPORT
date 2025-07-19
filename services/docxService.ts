import { Report } from '../types';
import { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, AlignmentType } from 'docx';
import { getDownloadUrl } from './storageService';

export const generateDocx = async (report: Report) => {
    try {
        const processImage = async (path: string): Promise<{ data: ArrayBuffer; width: number; height: number; } | null> => {
            try {
                const downloadUrl = await getDownloadUrl(path);
                const response = await fetch(downloadUrl);
                const blob = await response.blob();
                
                const image = new Image();
                const objectUrl = URL.createObjectURL(blob);
                
                await new Promise<void>((resolve, reject) => {
                    image.onload = () => resolve();
                    image.onerror = reject;
                    image.src = objectUrl;
                });
                
                URL.revokeObjectURL(objectUrl);
                
                const maxWidth = 550;
                const scale = Math.min(1, maxWidth / image.width);
                return {
                    data: await blob.arrayBuffer(),
                    width: image.width * scale,
                    height: image.height * scale,
                };
            } catch (error) {
                console.error("Error processing image for DOCX:", error);
                return null;
            }
        };
        
        const pointChildren = [];
        for (const [index, point] of report.points.entries()) {
            pointChildren.push(new Paragraph({ children: [new TextRun({ text: `Point #${index + 1}`, bold: true, size: 28 })], spacing: { after: 200 }}));
            pointChildren.push(new Paragraph({ children: [new TextRun(point.text || "")], spacing: { after: 200 }}));

            for (const imagePath of point.imagePaths) {
                const imgData = await processImage(imagePath);
                if (imgData) {
                    pointChildren.push(new Paragraph({
                        children: [new ImageRun({
                            buffer: imgData.data,
                            transformation: { width: imgData.width, height: imgData.height },
                        })],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 200 },
                    }));
                }
            }
        }

        const doc = new Document({
            sections: [{
                children: [
                    new Paragraph({ text: report.title, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
                    new Paragraph({ text: report.area, heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER }),
                    new Paragraph({
                        children: [new TextRun({ text: `Generated: ${new Date().toLocaleDateString()}`, italics: true, size: 20 })],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 400 },
                    }),
                    new Paragraph({ text: "Report Points", heading: HeadingLevel.HEADING_2 }),
                    ...pointChildren,
                ],
            }],
        });

        const safeTitle = report.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const blob = await Packer.toBlob(doc);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Report_${safeTitle}.docx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        return true;
    } catch (error) {
        console.error("Error generating DOCX:", error);
        return false;
    }
};