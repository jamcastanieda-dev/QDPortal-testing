<?php
// rcpa-why-analysis-save.php
header('Content-Type: application/json');
require_once '../../connection.php'; // mysqli $conn

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!is_array($data)) {
  http_response_code(400);
  echo json_encode(['success' => false, 'error' => 'Invalid JSON']);
  exit;
}

$rcpa_no = isset($data['rcpa_no']) ? (int)$data['rcpa_no'] : 0;
$desc = isset($data['description_of_findings']) ? trim($data['description_of_findings']) : '';
$rows = isset($data['rows']) && is_array($data['rows']) ? $data['rows'] : [];

if ($rcpa_no <= 0) {
  http_response_code(400);
  echo json_encode(['success' => false, 'error' => 'Missing rcpa_no']);
  exit;
}
if ($desc === '') {
  http_response_code(400);
  echo json_encode(['success' => false, 'error' => 'description_of_findings is required']);
  exit;
}
if (empty($rows)) {
  http_response_code(400);
  echo json_encode(['success' => false, 'error' => 'No analysis rows to insert']);
  exit;
}

$validTypes = ['Man', 'Method', 'Environment', 'Machine', 'Material'];
$validAns   = ['Yes', 'No'];

$conn->begin_transaction();
try {
  // DELETE existing rows for this rcpa_no
  $del = $conn->prepare("DELETE FROM rcpa_why_analysis WHERE rcpa_no = ?");
  if (!$del) throw new Exception('Prepare failed (delete): ' . $conn->error);
  $del->bind_param('i', $rcpa_no);
  if (!$del->execute()) {
    $err = $del->error;
    $del->close();
    throw new Exception('Execute failed (delete): ' . ($err ?: 'unknown'));
  }
  $del->close();

  // INSERT new rows
  $stmt = $conn->prepare("
    INSERT INTO rcpa_why_analysis
      (rcpa_no, analysis_type, why_occur, answer, description_of_findings)
    VALUES (?,?,?,?,?)
  ");
  if (!$stmt) {
    throw new Exception('Prepare failed (insert): ' . $conn->error);
  }

  // Track counts per base type to suffix duplicates as "Type #2", "Type #3", ...
  // Number by chain, not textbox:
  // - If client provides chain_id, we increment per (type, chain_id)
  // - Fallback (old clients): treat a new chain as starting after a 'Yes' (end-of-chain) row
  $typeCounts = [];              // base type => chain count (1,2,3…)
  $chainLabelById = [];          // chain_id => computed label (e.g., "Man #2")
  $inserted = 0;

  $hasChainIds = false;
  foreach ($rows as $r) {
    if (isset($r['chain_id']) && $r['chain_id'] !== '') {
      $hasChainIds = true;
      break;
    }
  }

  // Fallback trackers (when no chain_id present)
  $currentChainLabel = null;     // label to reuse within the current chain
  $currentChainType  = null;     // base type of the current chain

  foreach ($rows as $r) {
    $type = isset($r['analysis_type']) ? trim($r['analysis_type']) : '';
    $why  = isset($r['why_occur']) ? trim($r['why_occur']) : '';
    $ans  = isset($r['answer']) ? trim($r['answer']) : '';
    $cid  = isset($r['chain_id']) ? trim((string)$r['chain_id']) : null;

    if (!in_array($type, $validTypes, true)) {
      throw new Exception('Invalid analysis_type: ' . $type);
    }
    if (!in_array($ans, $validAns, true)) {
      throw new Exception('Invalid answer: ' . $ans);
    }
    if ($why === '') {
      // skip empty whys rather than failing the whole request
      continue;
    }
    if ($hasChainIds) {
      // Chain-aware path (preferred)
      if (!isset($chainLabelById[$cid])) {
        if (!isset($typeCounts[$type])) $typeCounts[$type] = 0;
        $typeCounts[$type]++;
        $label = ($typeCounts[$type] > 1) ? ($type . ' #' . $typeCounts[$type]) : $type;
        $chainLabelById[$cid] = $label;
      }
      $typeForDB = $chainLabelById[$cid];
    } else {
      // Fallback path (no chain_id): start a new "chain" when the previous row had 'Yes'
      if ($currentChainLabel === null || $type !== $currentChainType) {
        // start of the very first chain OR type changed (conservative reset)
        if (!isset($typeCounts[$type])) $typeCounts[$type] = 0;
        $typeCounts[$type]++;
        $currentChainType  = $type;
        $currentChainLabel = ($typeCounts[$type] > 1) ? ($type . ' #' . $typeCounts[$type]) : $type;
      }
      $typeForDB = $currentChainLabel;
    }

    $stmt->bind_param('issss', $rcpa_no, $typeForDB, $why, $ans, $desc);
    if (!$stmt->execute()) {
      throw new Exception('Execute failed (insert): ' . $stmt->error);
    }
    $inserted += $stmt->affected_rows;

    // Fallback segmentation: if we just hit the end-of-chain marker, next row starts a new chain
    if (!$hasChainIds && $ans === 'Yes') {
      $currentChainLabel = null;
      $currentChainType  = null;
    }
  }

  $stmt->close();
  $conn->commit();

  echo json_encode(['success' => true, 'inserted' => $inserted]);
} catch (Throwable $e) {
  $conn->rollback();
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
