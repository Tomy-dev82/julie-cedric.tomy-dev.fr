<?php

declare(strict_types=1);

require __DIR__ . DIRECTORY_SEPARATOR . 'google-drive-lib.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

if (!isset($_FILES['files'])) {
    http_response_code(400);
    echo json_encode(['error' => 'No files uploaded']);
    exit;
}

try {
    $config = loadGoogleDriveConfig();
    $configuredFolderId = trim((string)($config['folder_id'] ?? ''));

    if ($configuredFolderId === '') {
        throw new RuntimeException('folder_id is required in google-drive-config.php');
    }

    $folderId = $configuredFolderId;
    $requestedFolderUrl = trim((string)($_POST['folderUrl'] ?? ''));

    if ($requestedFolderUrl !== '') {
        $requestedFolderId = extractGoogleDriveFolderId($requestedFolderUrl);

        if ($requestedFolderId !== null) {
            $folderId = $requestedFolderId;
        }
    }

    $accessToken = requestGoogleDriveAccessToken($config);
    $uploadedFiles = normalizeGoogleDriveFilesArray($_FILES['files']);
    $uploadedCount = 0;

    foreach ($uploadedFiles as $uploadedFile) {
        $uploadError = (int)($uploadedFile['error'] ?? UPLOAD_ERR_NO_FILE);

        if ($uploadError !== UPLOAD_ERR_OK) {
            continue;
        }

        uploadFileToGoogleDrive($accessToken, $folderId, $uploadedFile);
        $uploadedCount += 1;
    }

    echo json_encode([
        'success' => true,
        'uploadedCount' => $uploadedCount,
    ]);
} catch (Throwable $throwable) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Upload failed',
        'message' => $throwable->getMessage(),
    ]);
}
