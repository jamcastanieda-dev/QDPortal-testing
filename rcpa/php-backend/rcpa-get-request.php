<?php
// rcpa-get-request.php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

try {
  require_once '../../connection.php';
  if (!isset($conn) || !($conn instanceof mysqli)) throw new Exception('MySQLi connection ($conn) not available.');
  mysqli_set_charset($conn, 'utf8mb4');

  // Auth via cookie
  if (!isset($_COOKIE['user'])) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'Unauthorized (no user cookie)']);
    exit;
  }
  $cookieUser = json_decode($_COOKIE['user'], true);
  if (!$cookieUser || empty($cookieUser['name'])) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'Unauthorized (invalid user cookie)']);
    exit;
  }
  $currentName = preg_replace('/\s+/u', ' ', trim((string)$cookieUser['name']));

  // Input
  $id = (int)($_GET['id'] ?? 0);
  if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Missing or invalid id']);
    exit;
  }

  // Helper to decode attachment blobs to array
  $decodeFiles = static function ($raw) {
    if ($raw === null || $raw === '') return [];
    if (is_array($raw)) {
      // flatten { files: [...] }
      if (isset($raw['files']) && is_array($raw['files'])) return $raw['files'];
      return $raw;
    }
    if (is_string($raw)) {
      $s = trim($raw);
      if ($s === '') return [];
      $j = json_decode($s, true);
      if (is_array($j)) {
        if (isset($j['files']) && is_array($j['files'])) return $j['files'];
        return $j;
      }
      // fallback: comma-separated URLs
      $parts = array_filter(array_map('trim', explode(',', $s)));
      if ($parts) {
        return array_map(static function ($u) {
          return ['name' => basename($u), 'url' => $u];
        }, $parts);
      }
    }
    return [];
  };


  // Fetch main row
  $sql = "SELECT
            id, rcpa_type, sem_year, project_name, wbs_number, quarter,
            category, originator_name, originator_department,
            date_request, conformance, remarks, remarks_attachment,
            system_applicable_std_violated, standard_clause_number,
            originator_supervisor_head, assignee, status
          FROM rcpa_request
          WHERE id = ? AND TRIM(originator_name) = TRIM(?)";
  $stmt = $conn->prepare($sql);
  if (!$stmt) throw new Exception('MySQLi prepare failed: ' . $conn->error);
  $stmt->bind_param('is', $id, $currentName);
  $stmt->execute();
  $res = $stmt->get_result();
  $row = $res->fetch_assoc();
  $stmt->close();

  if (!$row) {
    http_response_code(404);
    echo json_encode(['ok' => false, 'error' => 'Record not found']);
    exit;
  }

  // Normalize main attachments
  $row['attachments'] = $decodeFiles($row['remarks_attachment'] ?? null);

  // Decide NC/PNC from conformance/category (for preference when both exist)
  $conf = strtolower(trim((string)($row['conformance'] ?? '')));
  $isPNC = false;
  $isNC  = false;
  if ($conf !== '') {
    $isPNC = (strpos($conf, 'potential') === 0);
    $isNC  = !$isPNC && (strpos($conf, 'non-conformance') !== false || strpos($conf, 'non conformance') !== false || strpos($conf, 'nonconformance') !== false);
  } else {
    $cat = strtolower(trim((string)($row['category'] ?? '')));
    $isPNC = ($cat === 'observation');
    $isNC  = ($cat === 'major' || $cat === 'minor');
  }

  // --- fetch validation (NC) ---
  $nc = null;
  $sqlNc = "SELECT root_cause, correction, correction_target_date, correction_date_completed,
                   corrective, corrective_target_date, corrective_date_completed, attachment
            FROM rcpa_valid_non_conformance
            WHERE rcpa_no = ?
            ORDER BY id DESC
            LIMIT 1";
  if ($st = $conn->prepare($sqlNc)) {
    $st->bind_param('i', $id);
    $st->execute();
    $rNc = $st->get_result()->fetch_assoc();
    $st->close();
    if ($rNc) {
      $nc = $rNc;
      $nc['attachment'] = $decodeFiles($rNc['attachment'] ?? null);
    }
  }

  // --- fetch validation (PNC) ---
  $pnc = null;
  $sqlPnc = "SELECT root_cause, preventive_action, preventive_target_date, preventive_date_completed, attachment
             FROM rcpa_valid_potential_conformance
             WHERE rcpa_no = ?
             ORDER BY id DESC
             LIMIT 1";
  if ($st = $conn->prepare($sqlPnc)) {
    $st->bind_param('i', $id);
    $st->execute();
    $rPnc = $st->get_result()->fetch_assoc();
    $st->close();
    if ($rPnc) {
      $pnc = $rPnc;
      $pnc['attachment'] = $decodeFiles($rPnc['attachment'] ?? null);
    }
  }

  // Choose which validation to project into the row (prefer based on conformance)
  $chosen = null;
  $mode = '';
  if ($isNC && $nc) {
    $chosen = $nc;
    $mode = 'nc';
  } elseif ($isPNC && $pnc) {
    $chosen = $pnc;
    $mode = 'pnc';
  } elseif ($nc) {
    $chosen = $nc;
    $mode = 'nc';
  } elseif ($pnc) {
    $chosen = $pnc;
    $mode = 'pnc';
  }

  if ($chosen) {
    $row['validation_mode'] = $mode;

    if ($mode === 'nc') {
      // keep DB column names; front-end will map with fallbacks
      $row['root_cause']                 = (string)($chosen['root_cause'] ?? '');
      $row['correction']                 = (string)($chosen['correction'] ?? '');
      $row['correction_target_date']     = $chosen['correction_target_date'] ?? null;
      $row['correction_date_completed']  = $chosen['correction_date_completed'] ?? null;
      $row['corrective']                 = (string)($chosen['corrective'] ?? '');
      $row['corrective_target_date']     = $chosen['corrective_target_date'] ?? null;
      $row['corrective_date_completed']  = $chosen['corrective_date_completed'] ?? null;
      $row['validation_attachments']     = $chosen['attachment'] ?? [];
    } else { // pnc
      $row['root_cause']                 = (string)($chosen['root_cause'] ?? '');
      $row['preventive_action']          = (string)($chosen['preventive_action'] ?? '');
      $row['preventive_target_date']     = $chosen['preventive_target_date'] ?? null;
      $row['preventive_date_completed']  = $chosen['preventive_date_completed'] ?? null;
      $row['validation_attachments']     = $chosen['attachment'] ?? [];
    }
  } else {
    $row['validation_mode'] = '';
    $row['validation_attachments'] = [];
  }

  // --- fetch disapproval remarks for this RCPA (rcpa_no = id) ---
  $rejects = [];
  $rejSql = "SELECT id, disapprove_type, remarks, attachments, created_at
             FROM rcpa_disapprove_remarks
             WHERE rcpa_no = ?
             ORDER BY created_at DESC, id DESC";
  $rejStmt = $conn->prepare($rejSql);
  $rejStmt->bind_param('i', $id);
  $rejStmt->execute();
  $rejRes = $rejStmt->get_result();
  while ($r = $rejRes->fetch_assoc()) {
    $rejects[] = $r;
  }
  $rejStmt->close();

  // --- fetch latest corrective evidence (if any) ---
  $corrEv = null;
  $ceSql = "SELECT remarks, attachment, created_at
            FROM rcpa_corrective_evidence
            WHERE rcpa_no = ?
            ORDER BY created_at DESC, id DESC
            LIMIT 1";
  if ($ceStmt = $conn->prepare($ceSql)) {
    $ceStmt->bind_param('i', $id);
    $ceStmt->execute();
    $ceRes = $ceStmt->get_result();
    $corrEv = $ceRes->fetch_assoc() ?: null;
    $ceStmt->close();
  }

  if ($corrEv) {
    $row['corrective_evidence_remarks'] = (string)($corrEv['remarks'] ?? '');
    $row['corrective_evidence_attachments'] = $decodeFiles($corrEv['attachment'] ?? null);
  } else {
    $row['corrective_evidence_remarks'] = '';
    $row['corrective_evidence_attachments'] = [];
  }

  // --- fetch Findings In-Validation reply ---
  $findingsInvalid = null;
  $sqlInvalid = "SELECT reason_non_valid, assignee_name, assignee_date, assignee_supervisor_name, assignee_supervisor_date, attachment
              FROM rcpa_not_valid
              WHERE rcpa_no = ?
              ORDER BY id DESC
              LIMIT 1";
  if ($st = $conn->prepare($sqlInvalid)) {
    $st->bind_param('i', $id);
    $st->execute();
    $rInvalid = $st->get_result()->fetch_assoc();
    $st->close();
    if ($rInvalid) {
      $findingsInvalid = $rInvalid;
      $findingsInvalid['attachment'] = $decodeFiles($rInvalid['attachment'] ?? null);
    }
  }

  // Add the findings invalid data to the response
  if ($findingsInvalid) {
    $row['findings_invalid'] = $findingsInvalid;
  } else {
    $row['findings_invalid'] = null;
  }

  // --- fetch latest evidence checking (if any) ---
  $ev = null;
  $evSql = "SELECT action_done, remarks, attachment
            FROM rcpa_evidence_checking_remarks
            WHERE rcpa_no = ?
            ORDER BY id DESC
            LIMIT 1";
  if ($evStmt = $conn->prepare($evSql)) {
    $evStmt->bind_param('i', $id);
    $evStmt->execute();
    $evRes = $evStmt->get_result();
    $ev = $evRes->fetch_assoc() ?: null;
    $evStmt->close();
  }

  if ($ev) {
    $row['evidence_action_done'] = (string)($ev['action_done'] ?? '');
    $row['evidence_remarks']     = (string)($ev['remarks'] ?? '');
    $row['evidence_attachments'] = $decodeFiles($ev['attachment'] ?? null);
  } else {
    $row['evidence_action_done'] = '';
    $row['evidence_remarks']     = '';
    $row['evidence_attachments'] = [];
  }

  // --- fetch latest follow-up for effectiveness (if any) ---
  $fu = null;
  $fuSql = "SELECT target_date, remarks, attachment
          FROM rcpa_follow_up_remarks
          WHERE rcpa_no = ?
          ORDER BY id DESC
          LIMIT 1";
  if ($fuStmt = $conn->prepare($fuSql)) {
    $fuStmt->bind_param('i', $id);
    $fuStmt->execute();
    $fuRes = $fuStmt->get_result();
    $fu = $fuRes->fetch_assoc() ?: null;
    $fuStmt->close();
  }

  if ($fu) {
    $row['follow_up_target_date'] = $fu['target_date'] ?? null;
    $row['follow_up_remarks']     = (string)($fu['remarks'] ?? '');
    $row['follow_up_attachments'] = $decodeFiles($fu['attachment'] ?? null);
  } else {
    $row['follow_up_target_date'] = '';
    $row['follow_up_remarks']     = '';
    $row['follow_up_attachments'] = [];
  }


  echo json_encode(['ok' => true, 'row' => $row, 'rejects' => $rejects, 'findings_invalid' => $findingsInvalid]);
} catch (Throwable $e) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
