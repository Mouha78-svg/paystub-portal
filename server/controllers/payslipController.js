const { pool } = require('../database/db');
const { MONTH_ORDER_SQL, pdfFileName } = require('../utils/monthOrder');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, annee } = req.query;
    const offset = (page - 1) * limit;
    const matricule = req.user.matricule;

    const params = [matricule];
    const countParams = [matricule];

    let query = 'SELECT * FROM payslips WHERE matricule=$1';
    let countQuery = 'SELECT COUNT(*) as total FROM payslips WHERE matricule=$1';

    if (annee) {
      params.push(annee);
      countParams.push(annee);
      query += ` AND annee=$2`;
      countQuery += ` AND annee=$2`;
    }

    query += ` ORDER BY annee DESC, ${MONTH_ORDER_SQL} DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const [{ rows }, { rows: countRows }] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams),
    ]);

    const total = parseInt(countRows[0].total);
    res.json({ data: rows, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

exports.getByMatricule = async (req, res, next) => {
  try {
    const matricule = req.params.matricule.toUpperCase();
    if (req.user.matricule !== matricule) return res.status(403).json({ message: 'Accès refusé' });

    const { rows } = await pool.query(
      `SELECT * FROM payslips WHERE matricule=$1 ORDER BY annee DESC, ${MONTH_ORDER_SQL} DESC`,
      [matricule]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const { matricule, annee, mois } = req.params;
    if (req.user.matricule !== matricule.toUpperCase()) return res.status(403).json({ message: 'Accès refusé' });

    const { rows } = await pool.query(
      'SELECT * FROM payslips WHERE matricule=$1 AND annee=$2 AND mois=$3',
      [matricule.toUpperCase(), annee, mois]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Bulletin introuvable' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.getYears = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT DISTINCT annee FROM payslips WHERE matricule=$1 ORDER BY annee DESC',
      [req.user.matricule]
    );
    res.json(rows.map(r => r.annee));
  } catch (err) {
    next(err);
  }
};

exports.download = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM payslips WHERE id=$1 AND matricule=$2',
      [req.params.id, req.user.matricule]
    );
    const payslip = rows[0];
    if (!payslip) return res.status(404).json({ message: 'Bulletin introuvable ou accès refusé' });

    const pdfDir = process.env.PDF_DIR || './pdf';
    const downloadName = payslip.fichier_pdf || pdfFileName(payslip.matricule, payslip.annee, payslip.mois);

    if (payslip.fichier_pdf) {
      const filePath = path.resolve(pdfDir, payslip.fichier_pdf);
      if (fs.existsSync(filePath)) {
        return res.download(filePath, payslip.fichier_pdf);
      }
    }

    const { rows: empRows } = await pool.query('SELECT * FROM employees WHERE matricule=$1', [payslip.matricule]);
    const employee = empRows[0] || {};

    const { rows: ytdRows } = await pool.query(
      'SELECT * FROM payslips WHERE matricule=$1 AND annee=$2 ORDER BY id',
      [payslip.matricule, payslip.annee]
    );

    const html = generateBulletin(payslip, employee, ytdRows);

    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    let pdfBuffer;
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      pdfBuffer = Buffer.from(await page.pdf({ format: 'A4', printBackground: true }));
    } finally {
      await browser.close();
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    return res.end(pdfBuffer);
  } catch (err) {
    console.error('PDF generation error:', err);
    next(err);
  }
};

// ─── Bulletin de Paie — style C.R.O.U.S. ────────────────────────────────────

const MOIS_NUM = {
  Janvier: '01', Février: '02', Mars: '03', Avril: '04',
  Mai: '05', Juin: '06', Juillet: '07', Août: '08',
  Septembre: '09', Octobre: '10', Novembre: '11', Décembre: '12',
};
const MOIS_DAYS = {
  Janvier: 31, Février: 28, Mars: 31, Avril: 30,
  Mai: 31, Juin: 30, Juillet: 31, Août: 31,
  Septembre: 30, Octobre: 31, Novembre: 30, Décembre: 31,
};
const JOB_MAP = {
  'Informatique':       { emploi: 'AGENT INFORMATIQUE',    qualif: 'TECH. INFORMATIQUE',   coeff: '1', cat: 'A' },
  'Ressources Humaines':{ emploi: 'GESTIONNAIRE RH',        qualif: 'AGENT RH',              coeff: '2', cat: 'B' },
  'Finance':            { emploi: 'GESTIONNAIRE FINANCIER', qualif: 'AGENT FINANCIER',       coeff: '3', cat: 'B' },
};
const SENIORITY = { EMP001: [0, 5], EMP002: [2, 3], EMP003: [5, 8] };
const TRANSPORT = 26000;

function fmt(n) {
  return Number(n).toLocaleString('fr-FR');
}

const INDICES = { A: '320', B: '380' };

function fmtTaux(n) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function generateBulletin(p, emp, ytdRows) {
  const brut        = p.salaire_brut;
  const net         = p.salaire_net;
  const cotisations = Math.round(brut + TRANSPORT - net);
  const irpp        = Math.round(cotisations * (4060 / 4360));
  const trimf       = cotisations - irpp;

  const ytdBrut        = ytdRows.reduce((s, r) => s + r.salaire_brut, 0);
  const ytdNet         = ytdRows.reduce((s, r) => s + r.salaire_net, 0);
  const ytdCotisations = Math.round(ytdRows.reduce(
    (s, r) => s + Math.round(r.salaire_brut + TRANSPORT - r.salaire_net), 0
  ));

  const service     = emp.service || '';
  const job         = JOB_MAP[service] || { emploi: 'AGENT', qualif: 'AGENT', coeff: '1', cat: 'A' };
  const [anc_ans, anc_mois] = SENIORITY[p.matricule] || [0, 1];

  const HEURES      = 173.33;
  const taux_horaire = Math.round(brut / HEURES);
  const taux_irpp    = irpp / brut * 100;
  const taux_trimf   = trimf / brut * 100;
  const indice       = INDICES[job.cat] || '300';

  const moisNum = MOIS_NUM[p.mois] || '01';
  const days    = MOIS_DAYS[p.mois] || 30;
  const yy      = String(p.annee).slice(-2);
  const debut   = `01/${moisNum}/${yy}`;
  const fin     = `${days}/${moisNum}/${yy}`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Bulletin de Paie – ${p.mois} ${p.annee}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#000;background:#fff;padding:22px 30px;max-width:850px;margin:auto}
.top{display:table;width:100%;border:2px solid #000}
.org-cell{display:table-cell;border-right:2px solid #000;padding:10px 14px;width:190px;vertical-align:top;line-height:1.8}
.org-name{font-weight:bold;font-size:12.5px}
.bul-cell{display:table-cell;padding:8px 18px;vertical-align:top}
.bul-title{font-size:22px;font-weight:bold;text-align:center;letter-spacing:6px;margin-bottom:10px}
.it{border-collapse:collapse;width:100%}
.it td{padding:1px 6px;font-size:10.5px}
.it td.k{font-weight:bold;width:100px}

.emp-row{display:table;width:100%;border:2px solid #000;border-top:none}
.emp-left{display:table-cell;padding:8px 12px;border-right:2px solid #000;vertical-align:top}
.emp-right{display:table-cell;padding:8px 14px;width:220px;vertical-align:top}
.fr{display:flex;margin-bottom:3px;font-size:10.5px}
.fk{font-weight:bold;min-width:115px;flex-shrink:0}
.emp-name{font-size:15px;font-weight:bold;margin-top:12px}
.emp-city{font-size:11px;margin-top:5px}

.cng{border:2px solid #000;border-top:none;padding:6px 12px}
table.conges{border-collapse:collapse;font-size:10px}
table.conges th,table.conges td{border:1px solid #888;padding:2px 10px}
table.conges th{background:#e0e0e0;text-align:center}

table.pay{width:100%;border-collapse:collapse;border:2px solid #000;border-top:none}
table.pay th{background:#d0d0d0;border:1px solid #888;padding:3px 5px;font-size:9.5px;text-align:center;vertical-align:middle}
table.pay td{border:1px solid #ccc;padding:2.5px 6px;font-size:10px}
table.pay tr.tr{font-weight:bold;background:#ececec}
.rr{text-align:right}

.bot{border:2px solid #000;border-top:none;padding:8px 12px}
.bot-tbl{width:100%;border-collapse:collapse}
.bot-tbl td{vertical-align:top;padding:0}
.sep{border-right:1px solid #999;padding-right:10px;width:155px}
.smid{padding:0 10px}
.snet{width:135px;text-align:center;vertical-align:middle;padding-left:10px}
table.hrs{border-collapse:collapse;font-size:10px;width:100%}
table.hrs th,table.hrs td{border:1px solid #888;padding:2px 6px}
table.hrs th{background:#e0e0e0;text-align:center}
table.sum{border-collapse:collapse;font-size:10px;width:100%}
table.sum th,table.sum td{border:1px solid #888;padding:2px 7px}
table.sum th{background:#e0e0e0;text-align:center}
.net-box{border:2px solid #000;padding:12px 8px;display:inline-block;width:100%}
.net-lbl{font-size:10px;font-weight:bold;margin-bottom:6px}
.net-amt{font-size:22px;font-weight:bold}
.net-cur{font-size:9.5px;margin-top:3px}

.footer{font-size:8.5px;color:#555;margin-top:8px;border-top:1px solid #ccc;padding-top:5px;text-align:center}
@media print{body{padding:10px}}
</style>
</head>
<body>

<div class="top">
  <div class="org-cell">
    <div class="org-name">C.R.O.U.S.</div>
    <div class="org-name">SAINT LOUIS</div>
    <div class="org-name">SAINT LOUIS</div>
  </div>
  <div class="bul-cell">
    <div class="bul-title">BULLETIN &nbsp; DE &nbsp; PAIE</div>
    <table class="it">
      <tr>
        <td class="k">Période du</td><td>${debut} &nbsp; au &nbsp; ${fin}</td>
        <td class="k" style="padding-left:20px">Matricule</td><td>${p.matricule}</td>
      </tr>
      <tr>
        <td class="k">Paiement le</td><td>${fin} &nbsp; par &nbsp; <em>Virement</em></td>
        <td class="k" style="padding-left:20px">Ancienneté</td><td>${anc_ans} an(s) et ${anc_mois} mois</td>
      </tr>
    </table>
  </div>
</div>

<div class="emp-row">
  <div class="emp-left">
    <div class="fr"><span class="fk">Conv. coll.</span><span>CONVENTION ETS PUBLICS</span></div>
    <div class="fr"><span class="fk">Indice</span><span>${indice}</span></div>
    <div class="fr"><span class="fk">Coefficient</span><span>${job.coeff} &nbsp;&nbsp;&nbsp; Horaire &nbsp; 173,330</span></div>
    <div class="fr"><span class="fk">Emploi</span><span>${job.emploi}</span></div>
    <div class="fr"><span class="fk">Qualification</span><span>${job.qualif}</span></div>
    <div class="fr"><span class="fk">Département</span><span>SERVICE ${service.toUpperCase()}</span></div>
    <div class="fr"><span class="fk">Catégorie</span><span>${job.cat}</span></div>
  </div>
  <div class="emp-right">
    <div class="emp-name">M &nbsp; ${p.nom.toUpperCase()} &nbsp; ${p.prenom}</div>
    <div class="emp-city">SAINT-LOUIS</div>
    ${emp.email ? `<div class="emp-city" style="margin-top:3px">${emp.email}</div>` : ''}
  </div>
</div>

<div class="cng">
  <table class="conges">
    <thead>
      <tr><th>Congés</th><th colspan="3">Dates de congés</th></tr>
    </thead>
    <tbody>
      <tr><td>Pris</td><td style="text-align:right">0,000</td><td>Du</td><td style="min-width:80px">&nbsp;&nbsp;&nbsp; au &nbsp;&nbsp;&nbsp;</td></tr>
      <tr><td>Restant</td><td style="text-align:right">0,000</td><td>Du</td><td>&nbsp;&nbsp;&nbsp; au &nbsp;&nbsp;&nbsp;</td></tr>
      <tr><td>Acquis</td><td style="text-align:right">0,000</td><td>Du</td><td>&nbsp;&nbsp;&nbsp; au &nbsp;&nbsp;&nbsp;</td></tr>
    </tbody>
  </table>
</div>

<table class="pay">
  <thead>
    <tr>
      <th rowspan="2" style="width:38px">N°</th>
      <th rowspan="2" style="min-width:170px;text-align:left;padding-left:8px">Désignation</th>
      <th rowspan="2" style="width:52px">Nombre</th>
      <th rowspan="2" style="width:52px">Base</th>
      <th rowspan="2" style="width:38px">Taux</th>
      <th colspan="2">Part salariale</th>
      <th colspan="2">Part patronale</th>
      <th rowspan="2" style="width:75px">Montants en<br>Francs</th>
    </tr>
    <tr>
      <th style="width:65px">Gain</th>
      <th style="width:65px">Retenue</th>
      <th style="width:38px">Taux</th>
      <th style="width:65px">Retenue</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>10</td><td>Salaire de base mensuel</td>
      <td class="rr">173,330</td><td class="rr">${fmt(taux_horaire)}</td><td class="rr">1,000</td>
      <td class="rr">${fmt(brut)}</td><td></td><td></td><td></td><td></td>
    </tr>
    <tr>
      <td>230</td><td>*** Salaire Brut Imposable</td>
      <td class="rr">173,330</td><td class="rr">${fmt(taux_horaire)}</td><td class="rr">1,000</td>
      <td class="rr">${fmt(brut)}</td><td></td><td></td><td></td><td></td>
    </tr>
    <tr class="tr">
      <td></td><td>Total Brut</td>
      <td></td><td></td><td></td>
      <td class="rr">${fmt(brut)}</td><td></td><td></td><td></td><td></td>
    </tr>
    <tr>
      <td>1080</td><td>Retenue Impôt sur le Revenu</td>
      <td></td><td class="rr">${fmt(brut)}</td><td class="rr">${fmtTaux(taux_irpp)}</td>
      <td></td><td class="rr">${fmt(irpp)}</td>
      <td></td><td class="rr">0</td><td></td>
    </tr>
    <tr>
      <td>1090</td><td>Retenue TRIMF</td>
      <td></td><td class="rr">${fmt(brut)}</td><td class="rr">${fmtTaux(taux_trimf)}</td>
      <td></td><td class="rr">${fmt(trimf)}</td>
      <td></td><td class="rr">0</td><td></td>
    </tr>
    <tr class="tr">
      <td></td><td>Total Cotisations</td>
      <td></td><td></td><td></td>
      <td></td><td class="rr">${fmt(cotisations)}</td>
      <td></td><td class="rr">0</td><td></td>
    </tr>
    <tr>
      <td>1510</td><td>Prime de transport</td>
      <td class="rr">1</td><td class="rr">${fmt(TRANSPORT)}</td><td class="rr">1,000</td>
      <td class="rr">${fmt(TRANSPORT)}</td>
      <td></td><td></td><td></td><td></td>
    </tr>
  </tbody>
</table>

<div class="bot">
  <table class="bot-tbl">
    <tr>
      <td class="sep">
        <table class="hrs">
          <thead><tr><th></th><th>Période</th><th>Année</th></tr></thead>
          <tbody>
            <tr><td>Heures travaillées</td><td class="rr">173</td><td class="rr">520</td></tr>
            <tr><td>Heures supp.</td><td class="rr">0</td><td class="rr">0</td></tr>
          </tbody>
        </table>
      </td>
      <td class="smid">
        <table class="sum">
          <thead>
            <tr>
              <th colspan="2"></th>
              <th>Salaire brut</th>
              <th>Charges salariales</th>
              <th>Charges patronales</th>
              <th>Avantages en nature</th>
              <th>Net imposable</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td rowspan="2" style="font-weight:bold;text-align:center;padding:4px">CFA</td>
              <td>Période</td>
              <td class="rr">${fmt(brut)}</td>
              <td class="rr">${fmt(cotisations)}</td>
              <td class="rr">0</td>
              <td class="rr">0</td>
              <td class="rr">${fmt(brut)}</td>
            </tr>
            <tr>
              <td>Année</td>
              <td class="rr">${fmt(ytdBrut)}</td>
              <td class="rr">${fmt(ytdCotisations)}</td>
              <td class="rr">0</td>
              <td class="rr">0</td>
              <td class="rr">${fmt(ytdBrut)}</td>
            </tr>
          </tbody>
        </table>
      </td>
      <td class="snet">
        <div class="net-box">
          <div class="net-lbl">Net à payer</div>
          <div class="net-amt">${fmt(net)}</div>
          <div class="net-cur">Francs</div>
        </div>
      </td>
    </tr>
  </table>
</div>

<div class="footer">
  Ce bulletin est établi en Francs CFA. Les valeurs exprimées sont indicatives, calculées au taux de 1,00X &nbsp;|&nbsp;
  Pour vous aider à faire valoir vos droits, conservez ce bulletin de paie sans limitation de durée.
</div>

</body>
</html>`;
}
