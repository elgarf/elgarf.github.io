<?php
declare(strict_types=1);

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($id <= 0) {
  http_response_code(400);
  header("Content-Type: text/plain; charset=utf-8");
  echo "Bad request";
  exit;
}
$modeRaw = strtolower(trim((string)($_GET['mode'] ?? "viewer")));
$mode = $modeRaw === "editor" ? "editor" : "viewer";

$projectStoreApiUrl = "https://static.93.189.179.185.ip.webhost1.net/project_store.php";
$viewerBaseUrl = "https://elgarf.github.io/tools/LedMaskViewer.html";
$editorBaseUrl = "https://elgarf.github.io/tools/LEDMaskEditor.html";
$shareBaseUrl = "https://static.93.189.179.185.ip.webhost1.net/share.php";
$ogImageUrl = "https://static.93.189.179.185.ip.webhost1.net/og-default.jpg";

function h(string $s): string {
  return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

$projectName = "Project #{$id}";
try {
  $api = $projectStoreApiUrl . "?id=" . rawurlencode((string)$id);
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
    }
  }
} catch (Throwable $e) {
  // Fallback to default project name
}

$targetUrl = ($mode === "editor" ? $editorBaseUrl : $viewerBaseUrl) . "?projectId=" . rawurlencode((string)$id);
$shareUrl = $shareBaseUrl . "?id=" . rawurlencode((string)$id) . "&mode=" . rawurlencode($mode);

header("Content-Type: text/html; charset=utf-8");
header("Cache-Control: public, max-age=60");
$ua = strtolower((string)($_SERVER["HTTP_USER_AGENT"] ?? ""));
$isPreviewBot = (bool)preg_match('/telegrambot|twitterbot|facebookexternalhit|whatsapp|vkshare|skypeuripreview|discordbot|slackbot/i', $ua);
?>
<!doctype html>
<html lang="ru" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="utf-8">
  <title><?= h($projectName) ?></title>
  <meta property="og:type" content="website">
  <meta property="og:title" content="<?= h($projectName) ?>">
  <meta property="og:description" content="LED Mask project viewer">
  <meta property="og:url" content="<?= h($shareUrl) ?>">
  <meta property="og:image" content="<?= h($ogImageUrl) ?>">
  <meta property="og:image:secure_url" content="<?= h($ogImageUrl) ?>">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="<?= h($projectName) ?>">
  <meta name="twitter:description" content="LED Mask project viewer">
  <meta name="twitter:image" content="<?= h($ogImageUrl) ?>">
</head>
<body>
  <?php if (!$isPreviewBot): ?>
  <script>location.replace(<?= json_encode($targetUrl, JSON_UNESCAPED_UNICODE) ?>);</script>
  <?php endif; ?>
  <a href="<?= h($targetUrl) ?>">Открыть проект</a>
</body>
</html>
