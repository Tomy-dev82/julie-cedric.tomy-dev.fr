<?php

declare(strict_types=1);

require __DIR__ . DIRECTORY_SEPARATOR . 'google-drive-lib.php';

session_start();

try {
    $config = loadGoogleDriveConfig();
    $clientId = trim((string)($config['oauth_client_id'] ?? ''));
    $redirectUri = trim((string)($config['oauth_redirect_uri'] ?? ''));

    if ($clientId === '' || $redirectUri === '') {
        throw new RuntimeException('oauth_client_id and oauth_redirect_uri are required in google-drive-config.php');
    }

    $state = bin2hex(random_bytes(24));
    $_SESSION['google_drive_oauth_state'] = $state;

    $query = http_build_query([
        'client_id' => $clientId,
        'redirect_uri' => $redirectUri,
        'response_type' => 'code',
        'scope' => 'https://www.googleapis.com/auth/drive',
        'access_type' => 'offline',
        'prompt' => 'consent',
        'include_granted_scopes' => 'true',
        'state' => $state,
    ]);

    header('Location: https://accounts.google.com/o/oauth2/v2/auth?' . $query);
    exit;
} catch (Throwable $throwable) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    echo $throwable->getMessage();
}