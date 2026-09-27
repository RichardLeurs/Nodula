<?php
declare(strict_types=1);

/** PHP/SQLite deployment API for Nodula's shared demo checklist. */

const ALLOWED_ORIGINS = [
    'https://sprigjs-demo.richardleurs.nl',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
];
const ALLOWED_METHODS = ['GET', 'POST', 'PATCH', 'DELETE'];
const INITIAL_IDEAS = [
    ['Sketch out a weekend garden', false],
    ['Make a tiny thing that feels good', true],
    ['Share an idea with a friend', false],
];

function respond(int $status, mixed $value = null): void
{
    http_response_code($status);
    if ($status === 204) {
        header('Content-Length: 0');
        return;
    }

    $body = json_encode($value, JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('Content-Length: ' . strlen($body));
    echo $body;
}

function readJsonObject(): array
{
    $contentType = strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]));
    if ($contentType !== 'application/json') {
        throw new InvalidArgumentException('Content-Type must be application/json.');
    }

    $body = file_get_contents('php://input');
    if ($body === false || $body === '' || strlen($body) > 4096) {
        throw new InvalidArgumentException('Request body must be valid JSON under 4096 bytes.');
    }

    try {
        $value = json_decode($body, true, 32, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        throw new InvalidArgumentException('Request body must be valid JSON under 4096 bytes.');
    }

    if (!is_array($value) || array_is_list($value)) {
        throw new InvalidArgumentException('Request body must be an object.');
    }
    return $value;
}

function openDatabase(): PDO
{
    $documentRoot = rtrim($_SERVER['DOCUMENT_ROOT'] ?? dirname(__DIR__), DIRECTORY_SEPARATOR);
    $defaultStorageDirectory = dirname($documentRoot) . DIRECTORY_SEPARATOR . 'nodulajs-demo-data';
    $dbPath = getenv('NODULA_DB_PATH') ?: $defaultStorageDirectory . DIRECTORY_SEPARATOR . 'ideas.sqlite3';
    $directory = dirname($dbPath);
    if (!is_dir($directory) && !mkdir($directory, 0770, true) && !is_dir($directory)) {
        throw new RuntimeException('Database directory unavailable.');
    }

    $newDatabase = !file_exists($dbPath);
    $database = new PDO('sqlite:' . $dbPath, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $database->exec('PRAGMA busy_timeout = 5000');
    $database->exec('CREATE TABLE IF NOT EXISTS ideas (id INTEGER PRIMARY KEY, text TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0)');

    if ($newDatabase) {
        $insert = $database->prepare('INSERT INTO ideas (text, done) VALUES (?, ?)');
        foreach (INITIAL_IDEAS as [$text, $done]) {
            $insert->execute([$text, $done ? 1 : 0]);
        }
    }

    return $database;
}

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && !in_array($origin, ALLOWED_ORIGINS, true)) {
    respond(403, ['error' => 'Origin not allowed.']);
    return;
}

if ($origin !== '') {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
if ($method === 'OPTIONS') {
    $requestedMethod = strtoupper($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD'] ?? '');
    $requestedHeaders = array_filter(array_map('trim', explode(',', strtolower($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'] ?? ''))));
    if ($origin === '' || !in_array($requestedMethod, ALLOWED_METHODS, true) || array_diff($requestedHeaders, ['content-type'])) {
        respond(403, ['error' => 'Preflight request not allowed.']);
        return;
    }
    header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Max-Age: 600');
    respond(204);
    return;
}

if (!in_array($method, ALLOWED_METHODS, true)) {
    header('Allow: GET, POST, PATCH, DELETE, OPTIONS');
    respond(405, ['error' => 'Method not allowed.']);
    return;
}

$requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$scriptDirectory = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/api/index.php')), '/');
if ($scriptDirectory !== '' && $scriptDirectory !== '/' && str_starts_with($requestPath, $scriptDirectory . '/')) {
    $requestPath = substr($requestPath, strlen($scriptDirectory));
} elseif ($requestPath === '/api' || str_starts_with($requestPath, '/api/')) {
    $requestPath = substr($requestPath, 4) ?: '/';
}
$requestPath = '/' . trim($requestPath, '/');
if ($requestPath === '') {
    $requestPath = '/';
}

try {
    $database = openDatabase();

    if ($method === 'GET' && $requestPath === '/info') {
        $database->query('SELECT 1')->fetchColumn();
        respond(200, [
            'status' => 'connected',
            'database' => 'SQLite',
            'storage' => 'Server-side file',
            'endpoint' => '/api/ideas',
        ]);
        return;
    }

    if ($method === 'GET' && $requestPath === '/ideas') {
        $rows = $database->query('SELECT id, text, done FROM ideas ORDER BY id')->fetchAll(PDO::FETCH_ASSOC);
        $ideas = array_map(static fn (array $row): array => [
            'id' => (int) $row['id'],
            'text' => $row['text'],
            'done' => (bool) $row['done'],
        ], $rows);
        respond(200, $ideas);
        return;
    }

    if ($method === 'POST' && $requestPath === '/ideas') {
        $data = readJsonObject();
        $text = $data['text'] ?? null;
        if (array_keys($data) !== ['text'] || !is_string($text) || trim($text) === '' || strlen(trim($text)) > 200) {
            throw new InvalidArgumentException('text must be between 1 and 200 characters.');
        }
        $text = trim($text);
        $insert = $database->prepare('INSERT INTO ideas (text, done) VALUES (?, 0)');
        $insert->execute([$text]);
        respond(201, ['id' => (int) $database->lastInsertId(), 'text' => $text, 'done' => false]);
        return;
    }

    if (preg_match('#^/ideas/([0-9]+)$#D', $requestPath, $matches) === 1 && (int) $matches[1] > 0) {
        $id = (int) $matches[1];
        if ($method === 'PATCH') {
            $data = readJsonObject();
            if (array_keys($data) !== ['done'] || !is_bool($data['done'])) {
                throw new InvalidArgumentException('done must be a boolean.');
            }
            $update = $database->prepare('UPDATE ideas SET done = ? WHERE id = ?');
            $update->execute([$data['done'] ? 1 : 0, $id]);
            if ($update->rowCount() === 0) {
                $exists = $database->prepare('SELECT 1 FROM ideas WHERE id = ?');
                $exists->execute([$id]);
                if (!$exists->fetchColumn()) {
                    respond(404, ['error' => 'Idea not found.']);
                    return;
                }
            }
            $select = $database->prepare('SELECT id, text, done FROM ideas WHERE id = ?');
            $select->execute([$id]);
            $row = $select->fetch(PDO::FETCH_ASSOC);
            respond(200, ['id' => (int) $row['id'], 'text' => $row['text'], 'done' => (bool) $row['done']]);
            return;
        }

        if ($method === 'DELETE') {
            $delete = $database->prepare('DELETE FROM ideas WHERE id = ?');
            $delete->execute([$id]);
            if ($delete->rowCount() === 0) {
                respond(404, ['error' => 'Idea not found.']);
                return;
            }
            respond(200, ['id' => $id]);
            return;
        }
    }

    respond(404, ['error' => 'Not found.']);
} catch (InvalidArgumentException $error) {
    respond(400, ['error' => $error->getMessage()]);
} catch (Throwable $error) {
    error_log('Nodula API error: ' . $error->getMessage());
    respond(503, ['error' => 'API or database unavailable.']);
}