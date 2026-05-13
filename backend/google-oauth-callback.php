<?php

declare(strict_types=1);

require __DIR__ . DIRECTORY_SEPARATOR . 'google-drive-lib.php';

session_start();

try {
    $returnedState = trim((string)($_GET['state'] ?? ''));
    $expectedState = trim((string)($_SESSION['google_drive_oauth_state'] ?? ''));

    if ($returnedState === '' || $expectedState === '' || !hash_equals($expectedState, $returnedState)) {
        throw new RuntimeException('OAuth state mismatch. Restart the authorization flow.');
    }

    unset($_SESSION['google_drive_oauth_state']);

    $code = trim((string)($_GET['code'] ?? ''));

    if ($code === '') {
        $googleError = trim((string)($_GET['error'] ?? 'Authorization failed'));
        throw new RuntimeException($googleError);
    }

    $config = loadGoogleDriveConfig();
    $tokens = exchangeGoogleAuthCode($config, $code);
    $refreshToken = trim((string)($tokens['refresh_token'] ?? ''));

    header('Content-Type: text/html; charset=utf-8');

    if ($refreshToken === '') {
        echo '<!DOCTYPE html><html lang="fr"><meta charset="utf-8"><title>OAuth Google Drive</title><body>';
        echo "<p>Aucun refresh token n'a ete renvoye par Google.</p>";
        echo "<p>Retirez l'acces de l'application dans votre compte Google puis relancez backend/google-oauth-start.php.</p>";
        echo '</body></html>';
        exit;
    }

    $safeToken = htmlspecialchars($refreshToken, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    echo '<!DOCTYPE html><html lang="fr"><meta charset="utf-8"><title>OAuth Google Drive</title><body>';
    echo '<h1>Refresh token obtenu</h1>';
    echo '<p>Copiez cette valeur dans backend/google-drive-config.php, cle oauth_refresh_token :</p>';
    echo '<textarea rows="6" cols="120" readonly>' . $safeToken . '</textarea>';
    echo "<p>Ensuite, relancez un test d'upload.</p>";
    echo '</body></html>';
} catch (Throwable $throwable) {
    http_response_code(500);
    header('Content-Type: text/html; charset=utf-8');
    echo '<!DOCTYPE html><html lang="fr"><meta charset="utf-8"><title>OAuth Google Drive</title><body>';
    echo '<p>' . htmlspecialchars($throwable->getMessage(), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</p>';
    echo '</body></html>';
}
