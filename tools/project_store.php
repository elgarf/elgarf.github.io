<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function respond(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

try {
    $dbPath = __DIR__ . DIRECTORY_SEPARATOR . 'projects.db';
    $pdo = new PDO('sqlite:' . $dbPath, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            data TEXT NOT NULL,
            created_at TEXT NOT NULL,
            checksum TEXT,
            lastAccess INTEGER
        )'
    );
    $cols = $pdo->query("PRAGMA table_info(projects)")->fetchAll();
    $hasChecksum = false;
    $hasLastAccess = false;
    foreach ($cols as $col) {
        $colName = isset($col['name']) ? strtolower((string)$col['name']) : '';
        if ($colName === 'checksum') {
            $hasChecksum = true;
        }
        if ($colName === 'lastaccess') {
            $hasLastAccess = true;
        }
    }
    if (!$hasChecksum) {
        $pdo->exec('ALTER TABLE projects ADD COLUMN checksum TEXT');
    }
    if (!$hasLastAccess) {
        $pdo->exec('ALTER TABLE projects ADD COLUMN lastAccess INTEGER');
    }
    $rowsForHash = $pdo->query('SELECT id, data FROM projects WHERE checksum IS NULL OR checksum = ""')->fetchAll();
    $updHash = $pdo->prepare('UPDATE projects SET checksum = :checksum WHERE id = :id');
    foreach ($rowsForHash as $row) {
        $rid = (int)($row['id'] ?? 0);
        if ($rid <= 0) {
            continue;
        }
        $sum = hash('sha256', (string)($row['data'] ?? ''));
        $updHash->execute([
            ':checksum' => $sum,
            ':id' => $rid,
        ]);
    }
    $nowTs = time();
    $rowsNoAccess = $pdo->query('SELECT id FROM projects WHERE lastAccess IS NULL OR lastAccess <= 0')->fetchAll();
    $updAccess = $pdo->prepare('UPDATE projects SET lastAccess = :last_access WHERE id = :id');
    foreach ($rowsNoAccess as $row) {
        $rid = (int)($row['id'] ?? 0);
        if ($rid <= 0) {
            continue;
        }
        $updAccess->execute([
            ':last_access' => $nowTs,
            ':id' => $rid,
        ]);
    }
    $pdo->exec(
        'DELETE FROM projects
         WHERE id NOT IN (
           SELECT MIN(id) FROM projects
           WHERE checksum IS NOT NULL AND checksum <> ""
           GROUP BY checksum
         )
         AND checksum IS NOT NULL AND checksum <> ""'
    );
    $pdo->exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_checksum ON projects(checksum)');
} catch (Throwable $e) {
    respond(500, ['ok' => false, 'error' => 'db_init_failed']);
}

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($method === 'GET') {
    $idRaw = $_GET['id'] ?? '';
    $listRaw = $_GET['list'] ?? '';

    if ($idRaw !== '') {
        $id = max(1, (int)$idRaw);
        $st = $pdo->prepare('SELECT id, name, data, created_at FROM projects WHERE id = :id');
        $st->execute([':id' => $id]);
        $row = $st->fetch();
        if (!$row) {
            respond(404, ['ok' => false, 'error' => 'not_found']);
        }
        $touch = $pdo->prepare('UPDATE projects SET lastAccess = :last_access WHERE id = :id');
        $touch->execute([
            ':last_access' => time(),
            ':id' => $id,
        ]);
        respond(200, ['ok' => true, 'project' => $row]);
    }

    if ($listRaw !== '') {
        $st = $pdo->query('SELECT id, name FROM projects ORDER BY id DESC');
        $rows = $st->fetchAll();
        respond(200, ['ok' => true, 'projects' => $rows]);
    }

    respond(400, ['ok' => false, 'error' => 'missing_query']);
}

if ($method === 'POST') {
    $expireBefore = time() - 31536000;
    $cleanup = $pdo->prepare('DELETE FROM projects WHERE lastAccess IS NULL OR lastAccess < :expire_before');
    $cleanup->execute([':expire_before' => $expireBefore]);

    $raw = file_get_contents('php://input');
    $body = json_decode((string)$raw, true);
    if (!is_array($body)) {
        respond(400, ['ok' => false, 'error' => 'invalid_json']);
    }

    $name = trim((string)($body['name'] ?? 'project'));
    if ($name === '') {
        $name = 'project';
    }
    $data = (string)($body['data'] ?? '');
    if ($data === '') {
        respond(400, ['ok' => false, 'error' => 'missing_data']);
    }
    $checksum = hash('sha256', $data);

    $find = $pdo->prepare('SELECT id FROM projects WHERE checksum = :checksum LIMIT 1');
    $find->execute([':checksum' => $checksum]);
    $existing = $find->fetch();
    if ($existing && isset($existing['id'])) {
        $existingId = (int)$existing['id'];
        $touch = $pdo->prepare('UPDATE projects SET lastAccess = :last_access WHERE id = :id');
        $touch->execute([
            ':last_access' => time(),
            ':id' => $existingId,
        ]);
        respond(200, ['ok' => true, 'id' => $existingId, 'duplicate' => true]);
    }

    $createdAt = gmdate('c');
    $nowAccess = time();
    try {
        $st = $pdo->prepare('INSERT INTO projects(name, data, created_at, checksum, lastAccess) VALUES(:name, :data, :created_at, :checksum, :last_access)');
        $st->execute([
            ':name' => $name,
            ':data' => $data,
            ':created_at' => $createdAt,
            ':checksum' => $checksum,
            ':last_access' => $nowAccess,
        ]);
        $id = (int)$pdo->lastInsertId();
        respond(200, ['ok' => true, 'id' => $id, 'duplicate' => false]);
    } catch (Throwable $e) {
        $find->execute([':checksum' => $checksum]);
        $existingAfterRace = $find->fetch();
        if ($existingAfterRace && isset($existingAfterRace['id'])) {
            $existingId = (int)$existingAfterRace['id'];
            $touch = $pdo->prepare('UPDATE projects SET lastAccess = :last_access WHERE id = :id');
            $touch->execute([
                ':last_access' => time(),
                ':id' => $existingId,
            ]);
            respond(200, ['ok' => true, 'id' => $existingId, 'duplicate' => true]);
        }
        respond(500, ['ok' => false, 'error' => 'insert_failed']);
    }
}

respond(405, ['ok' => false, 'error' => 'method_not_allowed']);
