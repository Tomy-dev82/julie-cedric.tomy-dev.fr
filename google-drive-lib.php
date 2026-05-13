<?php

declare(strict_types=1);

function resolveGoogleDriveConfigPath(): ?string
{
    $envPath = trim((string)(getenv('GOOGLE_DRIVE_CONFIG_PATH') ?: ''));
    $candidatePaths = array_filter([
        $envPath,
        dirname(__DIR__) . DIRECTORY_SEPARATOR . 'private' . DIRECTORY_SEPARATOR . 'google-drive-config.php',
        __DIR__ . DIRECTORY_SEPARATOR . 'google-drive-config.php',
    ]);

    foreach ($candidatePaths as $candidatePath) {
        if (is_file($candidatePath)) {
            return $candidatePath;
        }
    }

    return null;
}

function loadGoogleDriveConfig(): array
{
    $configPath = resolveGoogleDriveConfigPath();

    if ($configPath === null) {
        throw new RuntimeException(
            'Create google-drive-config.php from google-drive-config.sample.php, or define GOOGLE_DRIVE_CONFIG_PATH.'
        );
    }

    $config = require $configPath;

    if (!is_array($config)) {
        throw new RuntimeException('google-drive-config.php must return an array.');
    }

    return $config;
}

function extractGoogleDriveFolderId(string $folderUrl): ?string
{
    if (preg_match('~/folders/([a-zA-Z0-9_-]+)~', $folderUrl, $matches) === 1) {
        return $matches[1];
    }

    return null;
}

function requestGoogleToken(array $fields): array
{
    $ch = curl_init('https://oauth2.googleapis.com/token');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POSTFIELDS => http_build_query($fields),
        CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
    ]);

    $response = curl_exec($ch);
    $statusCode = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);

    if ($response === false) {
        $error = curl_error($ch);
        curl_close($ch);
        throw new RuntimeException('Google token request failed: ' . $error);
    }

    curl_close($ch);

    $data = json_decode($response, true);

    if ($statusCode >= 400 || !is_array($data)) {
        $message = trim((string)($data['error_description'] ?? $data['error'] ?? 'Unable to contact Google OAuth'));
        throw new RuntimeException('Google token request failed: ' . $message);
    }

    return $data;
}

function requestGoogleDriveAccessToken(array $config): string
{
    $clientId = trim((string)($config['oauth_client_id'] ?? ''));
    $clientSecret = trim((string)($config['oauth_client_secret'] ?? ''));
    $refreshToken = trim((string)($config['oauth_refresh_token'] ?? ''));

    if ($clientId === '' || $clientSecret === '' || $refreshToken === '') {
        throw new RuntimeException(
            'oauth_client_id, oauth_client_secret and oauth_refresh_token are required in google-drive-config.php'
        );
    }

    $data = requestGoogleToken([
        'client_id' => $clientId,
        'client_secret' => $clientSecret,
        'refresh_token' => $refreshToken,
        'grant_type' => 'refresh_token',
    ]);

    if (empty($data['access_token'])) {
        throw new RuntimeException('Google did not return an access token.');
    }

    return (string)$data['access_token'];
}

function exchangeGoogleAuthCode(array $config, string $code): array
{
    $clientId = trim((string)($config['oauth_client_id'] ?? ''));
    $clientSecret = trim((string)($config['oauth_client_secret'] ?? ''));
    $redirectUri = trim((string)($config['oauth_redirect_uri'] ?? ''));

    if ($clientId === '' || $clientSecret === '' || $redirectUri === '') {
        throw new RuntimeException(
            'oauth_client_id, oauth_client_secret and oauth_redirect_uri are required in google-drive-config.php'
        );
    }

    return requestGoogleToken([
        'code' => $code,
        'client_id' => $clientId,
        'client_secret' => $clientSecret,
        'redirect_uri' => $redirectUri,
        'grant_type' => 'authorization_code',
    ]);
}

function uploadFileToGoogleDrive(string $accessToken, string $folderId, array $uploadedFile): void
{
    $tmpName = (string)($uploadedFile['tmp_name'] ?? '');
    $originalName = (string)($uploadedFile['name'] ?? 'upload.bin');
    $mimeType = (string)($uploadedFile['type'] ?? 'application/octet-stream');

    if ($tmpName === '' || !is_uploaded_file($tmpName)) {
        throw new RuntimeException('Invalid uploaded file');
    }

    $metadata = json_encode([
        'name' => $originalName,
        'parents' => [$folderId],
    ], JSON_UNESCAPED_SLASHES);

    if ($metadata === false) {
        throw new RuntimeException('Unable to encode file metadata');
    }

    $boundary = 'drive-upload-' . bin2hex(random_bytes(12));
    $fileContents = file_get_contents($tmpName);

    if ($fileContents === false) {
        throw new RuntimeException('Unable to read uploaded file');
    }

    $body = '';
    $body .= "--{$boundary}\r\n";
    $body .= "Content-Type: application/json; charset=UTF-8\r\n\r\n";
    $body .= $metadata . "\r\n";
    $body .= "--{$boundary}\r\n";
    $body .= "Content-Type: {$mimeType}\r\n\r\n";
    $body .= $fileContents . "\r\n";
    $body .= "--{$boundary}--\r\n";

    $ch = curl_init('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POSTFIELDS => $body,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $accessToken,
            'Content-Type: multipart/related; boundary=' . $boundary,
        ],
    ]);

    $response = curl_exec($ch);
    $statusCode = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);

    if ($response === false) {
        $error = curl_error($ch);
        curl_close($ch);
        throw new RuntimeException('Drive upload failed: ' . $error);
    }

    curl_close($ch);

    if ($statusCode >= 400) {
        $decodedResponse = json_decode($response, true);
        $googleMessage = '';

        if (is_array($decodedResponse)) {
            $googleMessage = trim((string)($decodedResponse['error']['message'] ?? ''));
        }

        throw new RuntimeException(
            'Drive upload failed with status ' . $statusCode . ($googleMessage !== '' ? ': ' . $googleMessage : '')
        );
    }
}

function normalizeGoogleDriveFilesArray(array $files): array
{
    if (!is_array($files['name'] ?? null)) {
        return [$files];
    }

    $normalized = [];
    $count = count($files['name']);

    for ($index = 0; $index < $count; $index += 1) {
        $normalized[] = [
            'name' => $files['name'][$index] ?? '',
            'type' => $files['type'][$index] ?? 'application/octet-stream',
            'tmp_name' => $files['tmp_name'][$index] ?? '',
            'error' => $files['error'][$index] ?? UPLOAD_ERR_NO_FILE,
            'size' => $files['size'][$index] ?? 0,
        ];
    }

    return $normalized;
}