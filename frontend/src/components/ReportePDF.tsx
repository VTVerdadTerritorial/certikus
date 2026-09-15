import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';

// ============================================================================
// TIPOS
// ============================================================================
export interface Finding {
  id: string;
  severity: 'critical' | 'review' | 'ok' | 'illegible';
  title: string;
  description: string;
  docA: { name: string; page: number; field: string; value: string };
  docB: { name: string; page: number; field: string; value: string };
  why: string;
}

export interface ReportePDFProps {
  expedienteName: string;
  fecha: string;
  estado: 'CORREGIR' | 'REVISAR' | 'CONSISTENTE';
  consistencia: number;
  criticals: number;
  reviews: number;
  oks: number;
  findings: Finding[];
  checklist: { label: string; status: 'ok' | 'review' | 'critical' | 'illegible' }[];
  logoDataUri?: string;
}

// ============================================================================
// ESTILOS (COMPRIMIDOS)
// ============================================================================
const styles = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingBottom: 40,
    paddingHorizontal: 28,
    fontSize: 8.5,
    fontFamily: 'Helvetica',
    color: '#1E293B',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 6,
    borderBottomWidth: 1.5,
    borderBottomColor: '#2563EB',
    marginBottom: 10,
  },
  logoImage: {
    width: 110,
    height: 32,
    objectFit: 'contain',
  },
  logoFallback: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#1E3A8A',
  },
  logoFallbackDot: {
    color: '#2563EB',
  },
  headerMeta: {
    fontSize: 7,
    color: '#64748B',
    textAlign: 'right',
  },
  title: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 8.5,
    color: '#64748B',
    marginBottom: 10,
  },
  estadoBox: {
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
    borderWidth: 1.5,
  },
  estadoCritical: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' },
  estadoReview: { backgroundColor: '#FFFBEB', borderColor: '#FCD34D' },
  estadoOk: { backgroundColor: '#ECFDF5', borderColor: '#6EE7B7' },
  estadoLabel: {
    fontSize: 7,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#64748B',
    marginBottom: 2,
  },
  estadoValue: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
  },
  estadoValueCritical: { color: '#B91C1C' },
  estadoValueReview: { color: '#B45309' },
  estadoValueOk: { color: '#047857' },
  estadoDesc: { fontSize: 8, color: '#334155', lineHeight: 1.4 },
  metricsRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  metricBox: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
  },
  metricLabel: {
    fontSize: 6,
    color: '#64748B',
    marginTop: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
    marginTop: 10,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E2E8F0',
  },
  findingCard: {
    padding: 8,
    borderRadius: 4,
    marginBottom: 6,
    borderWidth: 0.75,
  },
  findingCritical: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' },
  findingReview: { backgroundColor: '#FFFBEB', borderColor: '#FCD34D' },
  findingOk: { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' },
  findingIllegible: { backgroundColor: '#F5F3FF', borderColor: '#C4B5FD' },
  findingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  findingBadge: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    paddingVertical: 1.5,
    paddingHorizontal: 5,
    borderRadius: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  badgeCritical: { backgroundColor: '#FECACA', color: '#991B1B' },
  badgeReview: { backgroundColor: '#FDE68A', color: '#92400E' },
  badgeOk: { backgroundColor: '#BBF7D0', color: '#166534' },
  badgeIllegible: { backgroundColor: '#DDD6FE', color: '#5B21B6' },
  findingId: { fontSize: 6.5, color: '#64748B', fontFamily: 'Courier' },
  findingTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
    marginBottom: 2,
  },
  findingDesc: {
    fontSize: 7.5,
    color: '#475569',
    lineHeight: 1.3,
    marginBottom: 5,
  },
  evidencesRow: { flexDirection: 'row', gap: 5, marginBottom: 5 },
  evidenceBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 6,
    borderRadius: 3,
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
  },
  evidenceHeader: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
    marginBottom: 4,
    paddingBottom: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F1F5F9',
  },
  evidenceTable: { flexDirection: 'column' },
  evidenceRow: { flexDirection: 'row', marginBottom: 2 },
  evidenceKeyCell: {
    width: 42,
    fontSize: 6.5,
    color: '#64748B',
    paddingTop: 0.5,
  },
  evidenceValueCell: {
    flex: 1,
    fontSize: 7.5,
    color: '#0F172A',
    fontFamily: 'Helvetica-Bold',
  },
  evidenceValueMono: {
    flex: 1,
    fontSize: 7.5,
    color: '#0F172A',
    fontFamily: 'Courier',
  },
  evidenceValueIllegible: {
    flex: 1,
    fontSize: 7.5,
    color: '#7C3AED',
    fontFamily: 'Helvetica',
    fontStyle: 'italic',
  },
  whyBox: {
    backgroundColor: '#FFFFFF',
    padding: 6,
    borderRadius: 3,
    borderLeftWidth: 2,
    borderLeftColor: '#2563EB',
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
  },
  whyLabel: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: '#2563EB',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  whyText: { fontSize: 7.5, color: '#334155', lineHeight: 1.3 },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
    fontSize: 8,
  },
  checklistIcon: {
    width: 28,
    marginRight: 5,
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
  },
  checklistOk: { color: '#059669' },
  checklistReview: { color: '#D97706' },
  checklistCritical: { color: '#DC2626' },
  checklistIllegible: { color: '#7C3AED' },
  checklistLabel: { color: '#334155', flex: 1 },
  legalBox: {
    marginTop: 10,
    padding: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
  },
  legalLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#334155',
    marginBottom: 3,
  },
  legalText: { fontSize: 6.5, color: '#475569', lineHeight: 1.4 },
  footer: {
    position: 'absolute',
    bottom: 18,
    left: 28,
    right: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 6.5,
    color: '#94A3B8',
    paddingTop: 5,
    borderTopWidth: 0.5,
    borderTopColor: '#E2E8F0',
  },
});

// ============================================================================
// COMPONENTE PDF
// ============================================================================
export function ReportePDF({
  expedienteName,
  fecha,
  estado,
  consistencia,
  criticals,
  reviews,
  oks,
  findings,
  checklist,
  logoDataUri,
}: ReportePDFProps) {
  const estadoStyle =
    estado === 'CORREGIR'
      ? { box: styles.estadoCritical, value: styles.estadoValueCritical }
      : estado === 'REVISAR'
        ? { box: styles.estadoReview, value: styles.estadoValueReview }
        : { box: styles.estadoOk, value: styles.estadoValueOk };

  const estadoDescripcion =
    estado === 'CORREGIR'
      ? 'Se detectaron inconsistencias criticas que debes revisar antes de radicar el expediente ante la ORIP.'
      : estado === 'REVISAR'
        ? 'Se detectaron aspectos que recomendamos revisar antes de la radicacion. No son bloqueantes, pero pueden generar notas devolutivas.'
        : 'No se detectaron inconsistencias dentro de los parametros evaluados. El expediente esta en buen estado para radicacion.';

  return (
    <Document
      title={`CERTIKUS - Reporte de Preparacion Registral - ${expedienteName}`}
      author="CERTIKUS LegalTech S.A.S."
      subject="Reporte de Preparacion Registral"
      creator="CERTIKUS"
    >
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header} fixed>
          {logoDataUri ? (
            <Image src={logoDataUri} style={styles.logoImage} />
          ) : (
            <Text style={styles.logoFallback}>
              CERTIKUS<Text style={styles.logoFallbackDot}>.</Text>
            </Text>
          )}
          <View>
            <Text style={styles.headerMeta}>Reporte de Preparacion Registral</Text>
            <Text style={styles.headerMeta}>{fecha}</Text>
          </View>
        </View>

        <Text style={styles.title}>Reporte de Preparacion Registral</Text>
        <Text style={styles.subtitle}>
          Expediente: {expedienteName} — Generado por CERTIKUS
        </Text>

        {/* ESTADO */}
        <View style={[styles.estadoBox, estadoStyle.box]}>
          <Text style={styles.estadoLabel}>Resultado del analisis</Text>
          <Text style={[styles.estadoValue, estadoStyle.value]}>{estado}</Text>
          <Text style={styles.estadoDesc}>{estadoDescripcion}</Text>

          <View style={styles.metricsRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricValue}>{consistencia}%</Text>
              <Text style={styles.metricLabel}>Consistencia</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={[styles.metricValue, { color: '#DC2626' }]}>{criticals}</Text>
              <Text style={styles.metricLabel}>Criticos</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={[styles.metricValue, { color: '#D97706' }]}>{reviews}</Text>
              <Text style={styles.metricLabel}>A revisar</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={[styles.metricValue, { color: '#059669' }]}>{oks}</Text>
              <Text style={styles.metricLabel}>Consistentes</Text>
            </View>
          </View>
        </View>

        {/* HALLAZGOS */}
        <Text style={styles.sectionTitle}>
          Hallazgos detectados ({findings.length})
        </Text>

        {findings.map((f) => {
          const isCritical = f.severity === 'critical';
          const isReview = f.severity === 'review';
          const isOk = f.severity === 'ok';
          const isIllegible = f.severity === 'illegible';

          const cardStyle = isCritical
            ? styles.findingCritical
            : isReview
              ? styles.findingReview
              : isOk
                ? styles.findingOk
                : styles.findingIllegible;

          const badgeStyle = isCritical
            ? styles.badgeCritical
            : isReview
              ? styles.badgeReview
              : isOk
                ? styles.badgeOk
                : styles.badgeIllegible;

          const badgeLabel = isCritical
            ? 'Critico'
            : isReview
              ? 'Revisar'
              : isOk
                ? 'Consistente'
                : 'Ilegible';

          const valueStyle = (value: string) => {
            const upper = value.toUpperCase();
            if (
              upper.includes('NO DETECTADO') ||
              upper.includes('ILEGIBLE') ||
              upper.includes('BAJA CONFIANZA')
            ) {
              return styles.evidenceValueIllegible;
            }
            return styles.evidenceValueMono;
          };

          return (
            <View key={f.id} style={[styles.findingCard, cardStyle]} wrap={false}>
              <View style={styles.findingHeader}>
                <Text style={[styles.findingBadge, badgeStyle]}>{badgeLabel}</Text>
                <Text style={styles.findingId}>{f.id}</Text>
              </View>
              <Text style={styles.findingTitle}>{f.title}</Text>
              <Text style={styles.findingDesc}>{f.description}</Text>

              <View style={styles.evidencesRow}>
                <View style={styles.evidenceBox}>
                  <Text style={styles.evidenceHeader}>A — {f.docA.name}</Text>
                  <View style={styles.evidenceTable}>
                    {f.docA.page > 0 && (
                      <View style={styles.evidenceRow}>
                        <Text style={styles.evidenceKeyCell}>Pagina:</Text>
                        <Text style={styles.evidenceValueCell}>{f.docA.page}</Text>
                      </View>
                    )}
                    <View style={styles.evidenceRow}>
                      <Text style={styles.evidenceKeyCell}>Campo:</Text>
                      <Text style={styles.evidenceValueCell}>{f.docA.field}</Text>
                    </View>
                    <View style={styles.evidenceRow}>
                      <Text style={styles.evidenceKeyCell}>Valor:</Text>
                      <Text style={valueStyle(f.docA.value)}>{f.docA.value}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.evidenceBox}>
                  <Text style={styles.evidenceHeader}>B — {f.docB.name}</Text>
                  <View style={styles.evidenceTable}>
                    {f.docB.page > 0 && (
                      <View style={styles.evidenceRow}>
                        <Text style={styles.evidenceKeyCell}>Pagina:</Text>
                        <Text style={styles.evidenceValueCell}>{f.docB.page}</Text>
                      </View>
                    )}
                    <View style={styles.evidenceRow}>
                      <Text style={styles.evidenceKeyCell}>Campo:</Text>
                      <Text style={styles.evidenceValueCell}>{f.docB.field}</Text>
                    </View>
                    <View style={styles.evidenceRow}>
                      <Text style={styles.evidenceKeyCell}>Valor:</Text>
                      <Text style={valueStyle(f.docB.value)}>{f.docB.value}</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.whyBox}>
                <Text style={styles.whyLabel}>Por que importa</Text>
                <Text style={styles.whyText}>{f.why}</Text>
              </View>
            </View>
          );
        })}

        {/* CHECKLIST */}
        <Text style={styles.sectionTitle}>Checklist de preparacion registral</Text>
        <View wrap={false}>
          {checklist.map((item, i) => (
            <View key={i} style={styles.checklistItem}>
              <Text
                style={[
                  styles.checklistIcon,
                  item.status === 'ok'
                    ? styles.checklistOk
                    : item.status === 'review'
                      ? styles.checklistReview
                      : item.status === 'critical'
                        ? styles.checklistCritical
                        : styles.checklistIllegible,
                ]}
              >
                {item.status === 'ok'
                  ? '[ OK ]'
                  : item.status === 'review'
                    ? '[ ! ]'
                    : item.status === 'critical'
                      ? '[ X ]'
                      : '[ ? ]'}
              </Text>
              <Text style={styles.checklistLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* AVISO LEGAL */}
        <View style={styles.legalBox} wrap={false}>
          <Text style={styles.legalLabel}>AVISO LEGAL IMPORTANTE</Text>
          <Text style={styles.legalText}>
            CERTIKUS no sustituye la calificacion oficial de las Oficinas de Registro de
            Instrumentos Publicos (ORIP). Es una herramienta tecnologica de preparacion y
            prevalidacion documental. La calificacion registral es competencia exclusiva del
            Registrador de Instrumentos Publicos conforme a la Ley 1579 de 2012 de la Republica
            de Colombia. CERTIKUS no garantiza la inscripcion registral de ningun documento.
          </Text>
        </View>

        {/* FOOTER */}
        <View style={styles.footer} fixed>
          <Text>CERTIKUS LegalTech S.A.S. — certikus.com</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Pagina ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}