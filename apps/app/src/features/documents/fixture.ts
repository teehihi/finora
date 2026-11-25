// Purpose-built, purely synthetic PDF. ASCII-only so stream lengths and xref
// offsets are correct without a PDF-generation dependency.
export function syntheticLoanOfferPdf() {
  const lines = [
    'Finora synthetic loan offer - not issued by a lender',
    'Lender: Finora Synthetic Lab',
    'Principal: 30,000,000 VND',
    'Loan duration: 18 months',
    'Annual interest rate: 12.5%',
    'Repayment method: Equal installments',
    'First due date: 2027-01-15',
    'Service fee: 100,000 VND',
    'Total fees: 100,000 VND',
    'Early repayment: Request a written payoff quote.',
    'Important clauses: Illustrative terms; no application or approval.',
  ];
  const stream =
    'BT /F1 14 Tf 50 770 Td\n' +
    lines.map((line, index) => (index ? '0 -27 Td ' : '') + '(' + line + ') Tj').join('\n') +
    '\nET\n';
  const entries = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Length ' + stream.length + ' >>\nstream\n' + stream + 'endstream',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = entries.map((value, i) => {
    const offset = pdf.length;
    pdf += `${i + 1} 0 obj\n${value}\nendobj\n`;
    return String(offset).padStart(10, '0');
  });
  const xref = pdf.length;
  pdf +=
    'xref\n0 6\n0000000000 65535 f \n' +
    offsets.map((offset) => offset + ' 00000 n \n').join('') +
    `trailer\n<< /Root 1 0 R /Size 6 >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}
