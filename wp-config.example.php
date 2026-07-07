<?php
/**
 * Copy this file to wp-config.php for local Docker development.
 */
define( 'WP_CACHE', false );

define( 'DB_NAME', 'uniquelogic_web2026' );
define( 'DB_USER', 'wordpress' );
define( 'DB_PASSWORD', 'wordpress' );
define( 'DB_HOST', 'db' );
define( 'DB_CHARSET', 'utf8mb4' );
define( 'DB_COLLATE', '' );

define( 'AUTH_KEY',         'change-me' );
define( 'SECURE_AUTH_KEY',  'change-me' );
define( 'LOGGED_IN_KEY',    'change-me' );
define( 'NONCE_KEY',        'change-me' );
define( 'AUTH_SALT',        'change-me' );
define( 'SECURE_AUTH_SALT', 'change-me' );
define( 'LOGGED_IN_SALT',   'change-me' );
define( 'NONCE_SALT',       'change-me' );

$table_prefix = 'wp_';

define( 'WP_DEBUG', true );
define( 'WP_DEBUG_LOG', true );
define( 'WP_DEBUG_DISPLAY', false );

define( 'WP_HOME', 'http://localhost:8080' );
define( 'WP_SITEURL', 'http://localhost:8080' );
define( 'FORCE_SSL_ADMIN', false );
define( 'RSSSL_NO_SSL', true );

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}

require_once ABSPATH . 'wp-settings.php';
