import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TIPOS
// ============================================================================
type FindingInput = {
  id: string;
  reglaId: string;
  severity: string;
  titulo: string;
  descripcion: string;
  docAId: string | null;
  docAField: string | null;
  docAValue: string | null;
  docBId: string | null;
  docBField: string | null;
  docBValue: string | null;
  razon: string;
};

type MetricsInput = {
  criticals: number;
  reviews: number;
  oks: number;
  total: number;
};

type ReportInput = {
  caseId: string;
  nombre: string;
  tipoOperacion: string | null;
  estado: string;
  consistencia: number | null;
  metrics: MetricsInput;
  documents: Array<{ id: string; tipo: string; filename: string }>;
  findings: FindingInput[];
  createdAt: Date;
  updatedAt: Date;
};

// ============================================================================
// COLORES Y CONSTANTES
// ============================================================================
const COLORS = {
  primary: '#2563EB',
  dark: '#0F172A',
  gray: '#64748B',
  lightGray: '#F1F5F9',
  border: '#E2E8F0',
  critical: '#DC2626',
  criticalBg: '#FEF2F2',
  criticalBorder: '#FCA5A5',
  review: '#D97706',
  reviewBg: '#FFFBEB',
  reviewBorder: '#FCD34D',
  ok: '#059669',
  okBg: '#F0FDF4',
  okBorder: '#86EFAC',
  illegible: '#7C3AED',
  illegibleBg: '#F5F3FF',
  illegibleBorder: '#C4B5FD',
};

const PAGE_MARGIN = 40;
const PAGE_WIDTH = 595.28;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

// ============================================================================
// HELPERS
// ============================================================================
function checkPageBreak(doc: any, neededHeight: number) {
  if (doc.y + neededHeight > doc.page.height - 60) {
    doc.addPage();
  }
}

function drawHeader(doc: any, fecha: string, logoPath: string) {
  const startY = 30;
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, PAGE_MARGIN, startY, { width: 110 });
  } else {
    doc.fillColor('#1E3A8A').fontSize(16).font('Helvetica-Bold').text('CERTIKUS.', PAGE_MARGIN, startY + 5);
  }
  doc.fillColor(COLORS.gray).fontSize(7).font('Helvetica')
    .text('Reporte de Preparacion Registral', 380, startY + 5, { align: 'right', width: 175 })
    .text(fecha, 380, startY + 16, { align: 'right', width: 175 });
  doc.moveTo(PAGE_MARGIN, 65).lineTo(PAGE_WIDTH - PAGE_MARGIN, 65).strokeColor(COLORS.primary).lineWidth(1.5).stroke();
  doc.y = 80;
}

function drawFooter(doc: any, pageNumber: number, totalPages: number) {
  const footerY = doc.page.height - 45;
  doc.moveTo(PAGE_MARGIN, footerY - 8).lineTo(PAGE_WIDTH - PAGE_MARGIN, footerY - 8).strokeColor(COLORS.border).lineWidth(0.5).stroke();
  doc.fillColor('#94A3B8').fontSize(7).font('Helvetica')
    .text('CERTIKUS LegalTech S.A.S. — certikus.com', PAGE_MARGIN, footerY)
    .text(`Pagina ${pageNumber} de ${totalPages}`, PAGE_WIDTH - PAGE_MARGIN - 100, footerY, { align: 'right', width: 100 });
}

function drawStateBox(doc: any, estado: string, consistencia: number | null, metrics: MetricsInput) {
  const boxTop = doc.y;
  const boxHeight = 100;
  const boxColor = estado === 'CORREGIR' ? COLORS.criticalBg : estado === 'REVISAR' ? COLORS.reviewBg : estado === 'CONSISTENTE' ? COLORS.okBg : COLORS.lightGray;
  const boxBorder = estado === 'CORREGIR' ? COLORS.criticalBorder : estado === 'REVISAR' ? COLORS.reviewBorder : estado === 'CONSISTENTE' ? COLORS.okBorder : COLORS.border;
  const textColor = estado === 'CORREGIR' ? COLORS.critical : estado === 'REVISAR' ? COLORS.review : estado === 'CONSISTENTE' ? COLORS.ok : COLORS.gray;

  doc.roundedRect(PAGE_MARGIN, boxTop, CONTENT_WIDTH, boxHeight, 6).fillAndStroke(boxColor, boxBorder);
  doc.fillColor(COLORS.gray).fontSize(7).font('Helvetica-Bold').text('RESULTADO DEL ANALISIS', PAGE_MARGIN + 14, boxTop + 12);
  doc.fillColor(textColor).fontSize(20).font('Helvetica-Bold').text(estado, PAGE_MARGIN + 14, boxTop + 26);

  const desc = estado === 'CORREGIR' ? 'Se detectaron inconsistencias criticas que debes revisar antes de radicar.' : estado === 'REVISAR' ? 'Se detectaron aspectos que recomendamos revisar antes de la radicacion.' : estado === 'CONSISTENTE' ? 'No se detectaron inconsistencias dentro de los parametros evaluados.' : 'El analisis no se ha completado.';
  doc.fillColor(COLORS.dark).fontSize(8).font('Helvetica').text(desc, PAGE_MARGIN + 14, boxTop + 52, { width: CONTENT_WIDTH - 28 });

  const metricY = boxTop + 72;
  const metricWidth = (CONTENT_WIDTH - 28 - 18) / 4;
  const metricas = [
    { label: 'Consistencia', value: `${consistencia ?? 0}%`, color: COLORS.primary },
    { label: 'Criticos', value: `${metrics.criticals}`, color: COLORS.critical },
    { label: 'A revisar', value: `${metrics.reviews}`, color: COLORS.review },
    { label: 'Consistentes', value: `${metrics.oks}`, color: COLORS.ok },
  ];
  metricas.forEach((m, i) => {
    const x = PAGE_MARGIN + 14 + i * (metricWidth + 6);
    doc.roundedRect(x, metricY, metricWidth, 20, 3).fillAndStroke('#FFFFFF', COLORS.border);
    doc.fillColor(m.color).fontSize(11).font('Helvetica-Bold').text(m.value, x, metricY + 3, { width: metricWidth, align: 'center' });
    doc.fillColor(COLORS.gray).fontSize(5.5).font('Helvetica').text(m.label.toUpperCase(), x, metricY + 14, { width: metricWidth, align: 'center' });
  });
  doc.y = boxTop + boxHeight + 12;
}

function drawFinding(doc: any, finding: FindingInput) {
  const colors = finding.severity === 'critical'
    ? { bg: COLORS.criticalBg, border: COLORS.criticalBorder, text: COLORS.critical, label: 'CRITICO' }
    : finding.severity === 'review'
    ? { bg: COLORS.reviewBg, border: COLORS.reviewBorder, text: COLORS.review, label: 'REVISAR' }
    : finding.severity === 'ok'
    ? { bg: COLORS.okBg, border: COLORS.okBorder, text: COLORS.ok, label: 'CONSISTENTE' }
    : { bg: COLORS.illegibleBg, border: COLORS.illegibleBorder, text: COLORS.illegible, label: 'ILEGIBLE' };

  checkPageBreak(doc, 150);
  const boxTop = doc.y;
  const boxHeight = (finding.docAId || finding.docBId) ? 115 : 70;

  doc.roundedRect(PAGE_MARGIN, boxTop, CONTENT_WIDTH, boxHeight, 4).fillAndStroke(colors.bg, colors.border);
  doc.roundedRect(PAGE_MARGIN + 8, boxTop + 8, 55, 12, 2).fill(colors.border);
  doc.fillColor(colors.text).fontSize(6).font('Helvetica-Bold').text(colors.label, PAGE_MARGIN + 8, boxTop + 11, { width: 55, align: 'center' });
  doc.fillColor(COLORS.gray).fontSize(6).font('Courier').text(finding.reglaId, PAGE_WIDTH - PAGE_MARGIN - 40, boxTop + 11);
  doc.fillColor(COLORS.dark).fontSize(9).font('Helvetica-Bold').text(finding.titulo, PAGE_MARGIN + 8, boxTop + 24, { width: CONTENT_WIDTH - 16 });
  doc.fillColor('#475569').fontSize(7).font('Helvetica').text(finding.descripcion, PAGE_MARGIN + 8, boxTop + 37, { width: CONTENT_WIDTH - 16 });

  if (finding.docAId || finding.docBId) {
    const evY = boxTop + 55;
    const evWidth = (CONTENT_WIDTH - 24) / 2;
    if (finding.docAId) {
      doc.fillColor(COLORS.gray).fontSize(6).font('Helvetica-Bold').text('A - Documento', PAGE_MARGIN + 8, evY);
      doc.fillColor(COLORS.dark).fontSize(6.5).font('Helvetica').text(`Campo: ${finding.docAField || '-'}`, PAGE_MARGIN + 8, evY + 10, { width: evWidth });
      doc.font('Courier').text(`Valor: ${finding.docAValue || '-'}`, PAGE_MARGIN + 8, evY + 20, { width: evWidth });
    }
    if (finding.docBId) {
      doc.fillColor(COLORS.gray).fontSize(6).font('Helvetica-Bold').text('B - Documento', PAGE_MARGIN + 8 + evWidth + 8, evY);
      doc.fillColor(COLORS.dark).fontSize(6.5).font('Helvetica').text(`Campo: ${finding.docBField || '-'}`, PAGE_MARGIN + 8 + evWidth + 8, evY + 10, { width: evWidth });
      doc.font('Courier').text(`Valor: ${finding.docBValue || '-'}`, PAGE_MARGIN + 8 + evWidth + 8, evY + 20, { width: evWidth });
    }
    doc.fillColor('#2563EB').fontSize(6).font('Helvetica-Bold').text('POR QUE IMPORTA?', PAGE_MARGIN + 8, evY + 38);
    doc.fillColor('#334155').fontSize(6.5).font('Helvetica').text(finding.razon, PAGE_MARGIN + 8, evY + 46, { width: CONTENT_WIDTH - 16 });
  } else {
    doc.fillColor('#2563EB').fontSize(6).font('Helvetica-Bold').text('POR QUE IMPORTA?', PAGE_MARGIN + 8, boxTop + 52);
    doc.fillColor('#334155').fontSize(6.5).font('Helvetica').text(finding.razon, PAGE_MARGIN + 8, boxTop + 60, { width: CONTENT_WIDTH - 16 });
  }
  doc.y = boxTop + boxHeight + 6;
}

// ============================================================================
// FUNCION PRINCIPAL
// ============================================================================
export async function generateReportPDF(report: ReportInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, bottom: 60, left: PAGE_MARGIN, right: PAGE_MARGIN },
        bufferPages: true,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const logoPath = path.join(__dirname, '../../assets/logo-certikus.png');
      const fecha = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

      drawHeader(doc, fecha, logoPath);
      doc.fillColor(COLORS.dark).fontSize(16).font('Helvetica-Bold').text('Reporte de Preparacion Registral', PAGE_MARGIN, 80);
      doc.fillColor(COLORS.gray).fontSize(9).font('Helvetica').text(`Expediente: ${report.nombre}`, PAGE_MARGIN, 100);

      doc.y = 118;
      drawStateBox(doc, report.estado, report.consistencia, report.metrics);

      doc.fillColor(COLORS.dark).fontSize(11).font('Helvetica-Bold').text(`Hallazgos detectados (${report.findings.length})`, PAGE_MARGIN, doc.y);
      doc.y += 16;

      const orden: Record<string, number> = { critical: 0, review: 1, illegible: 2, ok: 3 };
      const sorted = [...report.findings].sort((a, b) => (orden[a.severity] ?? 9) - (orden[b.severity] ?? 9));
      for (const finding of sorted) {
        drawFinding(doc, finding);
      }

      checkPageBreak(doc, 80);
      doc.y += 8;
      const legalTop = doc.y;
      doc.roundedRect(PAGE_MARGIN, legalTop, CONTENT_WIDTH, 55, 4).fillAndStroke(COLORS.lightGray, COLORS.border);
      doc.fillColor('#334155').fontSize(7).font('Helvetica-Bold').text('AVISO LEGAL IMPORTANTE', PAGE_MARGIN + 8, legalTop + 6);
      doc.fillColor('#475569').fontSize(6.5).font('Helvetica')
        .text(
          'CERTIKUS no sustituye la calificacion oficial de las ORIP. Es una herramienta de prevalidacion documental. La calificacion registral es competencia exclusiva del Registrador conforme a la Ley 1579 de 2012.',
          PAGE_MARGIN + 8, legalTop + 18, { width: CONTENT_WIDTH - 16, lineGap: 1 }
        );

      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        drawFooter(doc, i - range.start + 1, range.count);
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}