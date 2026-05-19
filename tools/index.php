<?php
declare(strict_types=1);

$params = $_GET;

// Canonical query for index.php: use "id" instead of "projectId/projectid".
$hasProjectId = isset($params['projectId']) || isset($params['projectid']);
if ($hasProjectId) {
  if (!isset($params['id']) || trim((string)$params['id']) === '') {
    $value = isset($params['projectId']) ? (string)$params['projectId'] : (string)$params['projectid'];
    $params['id'] = trim($value);
  }
  unset($params['projectId'], $params['projectid']);
  $canonical = 'index.php';
  $canonicalQuery = http_build_query($params);
  if ($canonicalQuery !== '') $canonical .= '?' . $canonicalQuery;
  header('Location: ' . $canonical, true, 302);
  exit;
}

if (!isset($params['viewer']) || trim((string)$params['viewer']) === '') {
  $params['viewer'] = 'viewer.php';
}
if (!isset($params['v']) || trim((string)$params['v']) === '') {
  $params['v'] = (string)time();
}

// Editor expects projectid, but public URL for index.php uses id.
if ((!isset($params['projectid']) || trim((string)$params['projectid']) === '') && isset($params['id'])) {
  $params['projectid'] = trim((string)$params['id']);
}

$lang = strtolower(trim((string)($params['lang'] ?? 'ru')));
$isEn = ($lang === 'en');
$query = http_build_query($params);
$target = 'LEDMaskEditor.html' . ($query !== '' ? ('?' . $query) : '');
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
?>
<!doctype html>
<html lang="<?= $isEn ? 'en' : 'ru' ?>">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title><?= $isEn ? 'LED Mask Editor' : 'Редактор масок LED экранов' ?></title>
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
  <script>
    (function () {
      try {
        if (!window.history || typeof window.history.replaceState !== "function") return;
        if (!window.location || !window.location.search) return;
        var cleanUrl = window.location.pathname + (window.location.hash || "");
        window.history.replaceState(null, document.title, cleanUrl);
      } catch (_) {
        // noop
      }
    })();
  </script>
</body>
</html>
