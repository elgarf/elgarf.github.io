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
            project_guid TEXT,
            name TEXT NOT NULL,
            data TEXT NOT NULL,
            created_at TEXT NOT NULL,
            checksum TEXT,
            lastAccess INTEGER
        )'
    );
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS project_checklists (
            project_guid TEXT PRIMARY KEY,
            checklist_json TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )'
    );
    $cols = $pdo->query("PRAGMA table_info(projects)")->fetchAll();
    $hasChecksum = false;
    $hasLastAccess = false;
    $hasProjectGuid = false;
    foreach ($cols as $col) {
        $colName = isset($col['name']) ? strtolower((string)$col['name']) : '';
        if ($colName === 'project_guid') {
            $hasProjectGuid = true;
        }
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
    if (!$hasProjectGuid) {
        $pdo->exec('ALTER TABLE projects ADD COLUMN project_guid TEXT');
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
    $pdo->exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_guid ON projects(project_guid) WHERE project_guid IS NOT NULL AND project_guid <> ""');
} catch (Throwable $e) {
    respond(500, ['ok' => false, 'error' => 'db_init_failed']);
}

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($method === 'GET') {
    $idRaw = $_GET['id'] ?? '';
    $listRaw = $_GET['list'] ?? '';
    $checklistGuidRaw = trim((string)($_GET['checklist_guid'] ?? ''));

    if ($checklistGuidRaw !== '') {
        $st = $pdo->prepare('SELECT project_guid, checklist_json, updated_at FROM project_checklists WHERE project_guid = :project_guid LIMIT 1');
        $st->execute([':project_guid' => $checklistGuidRaw]);
        $row = $st->fetch();
        if (!$row) {
            respond(200, ['ok' => true, 'checklist' => ['project_guid' => $checklistGuidRaw, 'checklist_json' => '{}', 'updated_at' => null]]);
        }
        respond(200, ['ok' => true, 'checklist' => $row]);
    }

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

    $checklistGuid = trim((string)($body['checklistGuid'] ?? ''));
    if ($checklistGuid !== '') {
        $checklistData = $body['checklistData'] ?? [];
        if (!is_array($checklistData)) {
            respond(400, ['ok' => false, 'error' => 'invalid_checklist_data']);
        }
        $json = json_encode($checklistData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if (!is_string($json)) {
            respond(400, ['ok' => false, 'error' => 'invalid_checklist_data']);
        }
        $updatedAt = gmdate('c');
        $upsert = $pdo->prepare(
            'INSERT INTO project_checklists(project_guid, checklist_json, updated_at)
             VALUES(:project_guid, :checklist_json, :updated_at)
             ON CONFLICT(project_guid) DO UPDATE SET
               checklist_json = excluded.checklist_json,
               updated_at = excluded.updated_at'
        );
        $upsert->execute([
            ':project_guid' => $checklistGuid,
            ':checklist_json' => $json,
            ':updated_at' => $updatedAt,
        ]);
        respond(200, ['ok' => true, 'saved' => true, 'project_guid' => $checklistGuid, 'updated_at' => $updatedAt]);
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
    $projectGuid = trim((string)($body['projectGuid'] ?? ''));

    if ($projectGuid !== '') {
        $findByGuid = $pdo->prepare('SELECT id FROM projects WHERE project_guid = :project_guid LIMIT 1');
        $findByGuid->execute([':project_guid' => $projectGuid]);
        $existingByGuid = $findByGuid->fetch();
        if ($existingByGuid && isset($existingByGuid['id'])) {
            $existingId = (int)$existingByGuid['id'];
            $updateByGuid = $pdo->prepare(
                'UPDATE projects
                 SET name = :name, data = :data, checksum = :checksum, lastAccess = :last_access
                 WHERE id = :id'
            );
            $updateByGuid->execute([
                ':name' => $name,
                ':data' => $data,
                ':checksum' => $checksum,
                ':last_access' => time(),
                ':id' => $existingId,
            ]);
            respond(200, ['ok' => true, 'id' => $existingId, 'duplicate' => false, 'updatedByGuid' => true]);
        }
    }

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
        $st = $pdo->prepare('INSERT INTO projects(project_guid, name, data, created_at, checksum, lastAccess) VALUES(:project_guid, :name, :data, :created_at, :checksum, :last_access)');
        $st->execute([
            ':project_guid' => ($projectGuid !== '' ? $projectGuid : null),
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
