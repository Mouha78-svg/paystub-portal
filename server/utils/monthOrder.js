// Maps the French month names stored in `payslips.mois` (TEXT) to their
// calendar position so payslips can be ordered chronologically rather than
// alphabetically. Used inside ORDER BY clauses — contains no user input.
const MONTH_ORDER_SQL = `CASE mois
  WHEN 'Janvier' THEN 1
  WHEN 'Février' THEN 2
  WHEN 'Mars' THEN 3
  WHEN 'Avril' THEN 4
  WHEN 'Mai' THEN 5
  WHEN 'Juin' THEN 6
  WHEN 'Juillet' THEN 7
  WHEN 'Août' THEN 8
  WHEN 'Septembre' THEN 9
  WHEN 'Octobre' THEN 10
  WHEN 'Novembre' THEN 11
  WHEN 'Décembre' THEN 12
  ELSE 0
END`;

// Two-digit numeric form of each French month, used to build PDF filenames in
// the documented `MATRICULE_YEAR_MM.pdf` convention (e.g. EMP001_2025_01.pdf).
const MOIS_NUM = {
  Janvier: '01', Février: '02', Mars: '03', Avril: '04',
  Mai: '05', Juin: '06', Juillet: '07', Août: '08',
  Septembre: '09', Octobre: '10', Novembre: '11', Décembre: '12',
};

// Builds the canonical PDF filename for a payslip.
function pdfFileName(matricule, annee, mois) {
  const mm = MOIS_NUM[mois] || '00';
  return `${matricule}_${annee}_${mm}.pdf`;
}

module.exports = { MONTH_ORDER_SQL, MOIS_NUM, pdfFileName };
