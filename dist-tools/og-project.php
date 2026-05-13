<?php
declare(strict_types=1);

function fail_image(): void {
  http_response_code(200);
  header('Content-Type: image/png');
  // 1x1 transparent PNG fallback that doesn't require GD extension.
  echo base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z3xkAAAAASUVORK5CYII=');
  exit;
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

  // Fallback for environments where gzdecode is unavailable or strict.
  if (strlen($bytes) > 10) {
    $inflated = @gzinflate(substr($bytes, 10));
    if (is_string($inflated) && $inflated !== '') return $inflated;
  }

  // Stream wrapper fallback.
  $tmp = @tmpfile();
  if ($tmp !== false) {
    @fwrite($tmp, $bytes);
    $meta = stream_get_meta_data($tmp);
    $path = $meta['uri'] ?? '';
    if (is_string($path) && $path !== '') {
      $streamed = @file_get_contents('compress.zlib://' . $path);
      if (is_string($streamed) && $streamed !== '') {
        @fclose($tmp);
        return $streamed;
      }
    }
    @fclose($tmp);
  }
  return null;
}

function decode_project_data(string $stored): ?array {
  $stored = trim($stored);
  if ($stored === '') return null;

  // Legacy plain JSON
  if ($stored[0] === '{') {
    $json = json_decode($stored, true);
    return is_array($json) ? $json : null;
  }

  // gz2.<base64url(gzip(json remapped keys))>
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

function parse_hex_color(string $value): array {
  $v = trim($value);
  if (!preg_match('/^#?([0-9a-fA-F]{6})$/', $v, $m)) return [47, 202, 175];
  $hex = $m[1];
  return [hexdec(substr($hex, 0, 2)), hexdec(substr($hex, 2, 2)), hexdec(substr($hex, 4, 2))];
}

if (!function_exists('imagecreatetruecolor')) {
  fail_image();
}

$id = isset($_GET['id']) ? max(1, (int)$_GET['id']) : 0;
$debug = isset($_GET['debug']) && (string)$_GET['debug'] === '1';
if ($id <= 0) {
  if ($debug) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'stage' => 'input', 'error' => 'invalid_id'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
  }
  fail_image();
}

try {
  $projectStoreApiUrl = "https://static.93.189.179.185.ip.webhost1.net/project_store.php";
  $api = $projectStoreApiUrl . "?id=" . rawurlencode((string)$id);
  $ctx = stream_context_create([
    "http" => [
      "method" => "GET",
      "timeout" => 8
    ]
  ]);
  $rawApi = @file_get_contents($api, false, $ctx);
  if (!is_string($rawApi) || $rawApi === "") {
    if ($debug) {
      header('Content-Type: application/json; charset=utf-8');
      echo json_encode(['ok' => false, 'stage' => 'fetch', 'error' => 'empty_response', 'api' => $api], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
      exit;
    }
    fail_image();
  }
  $apiJson = json_decode($rawApi, true);
  if (!is_array($apiJson) || empty($apiJson['ok']) || !is_array($apiJson['project'])) {
    if ($debug) {
      header('Content-Type: application/json; charset=utf-8');
      echo json_encode(['ok' => false, 'stage' => 'fetch', 'error' => 'invalid_api_payload', 'api_payload' => $apiJson], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
      exit;
    }
    fail_image();
  }
  $storedData = (string)($apiJson['project']['data'] ?? '');
  if ($storedData === '') {
    if ($debug) {
      header('Content-Type: application/json; charset=utf-8');
      echo json_encode(['ok' => false, 'stage' => 'fetch', 'error' => 'missing_project_data'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
      exit;
    }
    fail_image();
  }
  $project = decode_project_data($storedData);
  if (!is_array($project)) {
    if ($debug) {
      header('Content-Type: application/json; charset=utf-8');
      echo json_encode([
        'ok' => false,
        'stage' => 'decode',
        'error' => 'decode_failed',
        'data_prefix' => substr($storedData, 0, 32),
        'has_gzdecode' => function_exists('gzdecode'),
        'has_gzinflate' => function_exists('gzinflate'),
      ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
      exit;
    }
    fail_image();
  }
} catch (Throwable $e) {
  if ($debug) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'stage' => 'exception', 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
  }
  fail_image();
}

$rects = [];
if (isset($project['rectangles']) && is_array($project['rectangles'])) {
  $rects = $project['rectangles'];
} elseif (isset($project['r']) && is_array($project['r'])) {
  $rects = $project['r'];
}

$items = [];
$minX = INF; $minY = INF; $maxX = -INF; $maxY = -INF;
$limit = min(2000, count($rects));
for ($i = 0; $i < $limit; $i++) {
  $r = $rects[$i];
  if (!is_array($r)) continue;
  $x = (float)($r['x'] ?? 0);
  $y = (float)($r['y'] ?? 0);
  $w = (float)($r['width'] ?? ($r['w'] ?? 0));
  $h = (float)($r['height'] ?? ($r['h'] ?? 0));
  if ($w <= 0 || $h <= 0) continue;
  $color = (string)($r['colorA'] ?? ($r['ca'] ?? '#2fcaaf'));
  $items[] = [$x, $y, $w, $h, $color];
  $minX = min($minX, $x);
  $minY = min($minY, $y);
  $maxX = max($maxX, $x + $w);
  $maxY = max($maxY, $y + $h);
}

if ($debug) {
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode([
    'ok' => true,
    'id' => $id,
    'rects_total' => count($rects),
    'rects_drawable' => count($items),
    'bbox' => [
      'minX' => is_finite($minX) ? $minX : null,
      'minY' => is_finite($minY) ? $minY : null,
      'maxX' => is_finite($maxX) ? $maxX : null,
      'maxY' => is_finite($maxY) ? $maxY : null,
    ],
  ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$imgW = 1200;
$imgH = 630;
$im = imagecreatetruecolor($imgW, $imgH);
$bg = imagecolorallocate($im, 17, 24, 32);
imagefill($im, 0, 0, $bg);

if (!count($items) || !is_finite($minX) || !is_finite($maxX) || !is_finite($minY) || !is_finite($maxY)) {
  $fg = imagecolorallocate($im, 220, 228, 235);
  imagestring($im, 5, 30, 30, 'LED Mask Project', $fg);
} else {
  $pad = 28.0;
  $worldW = max(1.0, $maxX - $minX);
  $worldH = max(1.0, $maxY - $minY);

  // Keep drawing inside center-safe square so social crops (1:1 etc.) keep full composition visible.
  $safeSide = min((float)$imgH, (float)$imgW) - 2 * $pad;
  $safeSide = max(120.0, $safeSide);
  $safeLeft = (($imgW - $safeSide) / 2.0);
  $safeTop = (($imgH - $safeSide) / 2.0);

  $sx = $safeSide / $worldW;
  $sy = $safeSide / $worldH;
  $scale = min($sx, $sy);
  $drawW = $worldW * $scale;
  $drawH = $worldH * $scale;
  $ox = $safeLeft + (($safeSide - $drawW) / 2.0);
  $oy = $safeTop + (($safeSide - $drawH) / 2.0);

  foreach ($items as [$x, $y, $w, $h, $hex]) {
    [$rr, $gg, $bb] = parse_hex_color((string)$hex);
    $col = imagecolorallocate($im, $rr, $gg, $bb);
    $x1 = (int)round($ox + ($x - $minX) * $scale);
    $y1 = (int)round($oy + ($y - $minY) * $scale);
    $x2 = (int)round($x1 + $w * $scale);
    $y2 = (int)round($y1 + $h * $scale);
    imagefilledrectangle($im, $x1, $y1, $x2, $y2, $col);
  }
}

header('Content-Type: image/png');
header('Cache-Control: public, max-age=120');
imagepng($im);
imagedestroy($im);
exit;
