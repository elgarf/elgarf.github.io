<?php
declare(strict_types=1);

function h(string $s): string {
  return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function detect_request_scheme(): string {
  $https = strtolower((string)($_SERVER['HTTPS'] ?? ''));
  if ($https !== '' && $https !== 'off' && $https !== '0') return 'https';
  $xfp = strtolower(trim((string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')));
  if ($xfp !== '') {
    $parts = explode(',', $xfp);
    $first = strtolower(trim((string)($parts[0] ?? '')));
    if ($first === 'https' || $first === 'http') return $first;
  }
  $xfs = strtolower(trim((string)($_SERVER['HTTP_X_FORWARDED_SSL'] ?? '')));
  if ($xfs === 'on' || $xfs === '1' || $xfs === 'true') return 'https';
  return 'http';
}

function b64url_decode_raw(string $s): string {
  $raw = strtr($s, '-_', '+/');
  $pad = strlen($raw) % 4;
  if ($pad > 0) $raw .= str_repeat('=', 4 - $pad);
  $out = base64_decode($raw, true);
  return is_string($out) ? $out : '';
}

function ungzip_to_text(string $bytes): ?string {
  if ($bytes === '') return null;
  $v = @gzdecode($bytes);
  if (is_string($v) && $v !== '') return $v;
  if (strlen($bytes) > 10) {
    $inflated = @gzinflate(substr($bytes, 10));
    if (is_string($inflated) && $inflated !== '') return $inflated;
  }
  return null;
}

function decode_project_data(string $stored): ?array {
  $stored = trim($stored);
  if ($stored === '') return null;
  if ($stored[0] === '{') {
    $json = json_decode($stored, true);
    return is_array($json) ? $json : null;
  }
  $dot = strpos($stored, '.');
  if ($dot === false) return null;
  $ver = substr($stored, 0, $dot);
  $body = substr($stored, $dot + 1);
  if ($ver !== 'gz2' && $ver !== 'gz1') return null;
  $bytes = b64url_decode_raw($body);
  if ($bytes === '') return null;
  $jsonText = ungzip_to_text($bytes);
  if (!is_string($jsonText) || $jsonText === '') return null;
  $json = json_decode($jsonText, true);
  return is_array($json) ? $json : null;
}

function build_screens_description_from_project(array $project): string {
  $rects = [];
  if (isset($project['rectangles']) && is_array($project['rectangles'])) $rects = $project['rectangles'];
  elseif (isset($project['r']) && is_array($project['r'])) $rects = $project['r'];
  $names = [];
  foreach ($rects as $r) {
    if (!is_array($r)) continue;
    $kind = strtolower(trim((string)($r['kind'] ?? ($r['kd'] ?? ''))));
    if ($kind === 'device' || $kind === 'note' || $kind === 'shape') continue;
    $name = trim((string)($r['name'] ?? ($r['nm'] ?? '')));
    if ($name === '') continue;
    if (!isset($names[$name])) $names[$name] = true;
  }
  if (!count($names)) return '';
  return implode("\n", array_keys($names));
}

$params = $_GET;
if (!isset($params['projectId']) && isset($params['id'])) {
  $id = trim((string)$params['id']);
  if ($id !== '') {
    $params['projectId'] = $id;
  }
}
if (!isset($params['v']) || trim((string)$params['v']) === '') {
  $params['v'] = (string)time();
}

$projectId = isset($params['projectId']) ? (int)$params['projectId'] : 0;
$projectName = $projectId > 0 ? ("Project #".$projectId) : "LED Mask Viewer";
$projectDescription = '';
$projectStoreApiUrl = "https://static.93.189.179.185.ip.webhost1.net/project_store.php";
$ogImageUrl = "https://static.93.189.179.185.ip.webhost1.net/og-default.jpg";

if ($projectId > 0) {
  try {
    $api = $projectStoreApiUrl . "?id=" . rawurlencode((string)$projectId);
    $ctx = stream_context_create([
      "http" => [
        "method" => "GET",
        "timeout" => 6
      ]
    ]);
    $raw = @file_get_contents($api, false, $ctx);
    if (is_string($raw) && $raw !== "") {
      $json = json_decode($raw, true);
      if (is_array($json) && !empty($json["ok"]) && is_array($json["project"])) {
        $name = trim((string)($json["project"]["name"] ?? ""));
        if ($name !== "") $projectName = $name;
        $storedData = (string)($json["project"]["data"] ?? "");
        if ($storedData !== '') {
          $projectData = decode_project_data($storedData);
          if (is_array($projectData)) {
            $projectDescription = build_screens_description_from_project($projectData);
          }
        }
      }
    }
  } catch (Throwable $e) {
    // Keep fallback title
  }
}
if ($projectDescription === '') $projectDescription = 'LED Mask Viewer';
$projectDescriptionOg = trim(preg_replace('/\s*[\r\n]+\s*/u', ' • ', $projectDescription) ?? '');
if ($projectDescriptionOg === '') $projectDescriptionOg = $projectDescription;

$query = http_build_query($params);
$target = 'LEDMaskViewer.html' . ($query !== '' ? ('?' . $query) : '');
header("Content-Type: text/html; charset=utf-8");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");
header("Expires: 0");
$scheme = detect_request_scheme();
$selfUrl = $scheme
  . "://" . (string)($_SERVER["HTTP_HOST"] ?? "")
  . (string)($_SERVER["REQUEST_URI"] ?? "/viewer.php");
if ($projectId > 0) {
  $ogImageUrl = $scheme
    . "://" . (string)($_SERVER["HTTP_HOST"] ?? "")
    . "/og-project.php?id=" . rawurlencode((string)$projectId);
}
?>
<!doctype html>
<html lang="ru" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title><?= h($projectName) ?></title>
  <meta name="description" content="<?= h($projectDescription) ?>">
  <meta itemprop="name" content="<?= h($projectName) ?>">
  <meta itemprop="description" content="<?= h($projectDescription) ?>">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="редактормасок.рф">
  <meta property="og:title" content="<?= h($projectName) ?>">
  <meta property="og:description" content="<?= h($projectDescriptionOg) ?>">
  <meta property="og:url" content="<?= h($selfUrl) ?>">
  <meta property="og:image" content="<?= h($ogImageUrl) ?>">
  <meta property="og:image:secure_url" content="<?= h($ogImageUrl) ?>">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta itemprop="image" content="<?= h($ogImageUrl) ?>">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="<?= h($projectName) ?>">
  <meta name="twitter:description" content="<?= h($projectDescriptionOg) ?>">
  <meta name="twitter:image" content="<?= h($ogImageUrl) ?>">
  <style>
    html, body {
      margin: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #0f172a;
    }
    .app-frame {
      width: 100%;
      height: 100%;
      border: 0;
      display: block;
      background: #0f172a;
    }
  </style>
</head>
<body>
  <iframe class="app-frame" src="<?= htmlspecialchars($target, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?>" referrerpolicy="no-referrer-when-downgrade"></iframe>
</body>
</html>
