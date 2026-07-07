<?php
/*
Plugin Name: 400 Bad Request Handler
Description: Handles 400 Bad Request errors with custom error pages.
Version:     1.0
*/

// Detect bad request scenarios
add_action('init', 'ul_check_bad_request', 1);

function ul_check_bad_request()
{
    // Check for various bad request conditions
    $is_bad_request = false;
    $bad_request_reason = '';

    // Check for excessively long URLs (potential attack or malformed request)
    if (isset($_SERVER['REQUEST_URI']) && strlen($_SERVER['REQUEST_URI']) > 2048) {
        $is_bad_request = true;
        $bad_request_reason = 'URL too long';
    }

    // Check for invalid characters in request
    if (isset($_SERVER['REQUEST_URI'])) {
        $uri = $_SERVER['REQUEST_URI'];
        // Check for null bytes or other invalid characters
        if (strpos($uri, "\0") !== false) {
            $is_bad_request = true;
            $bad_request_reason = 'Invalid characters in URL';
        }
    }

    // Check for malformed query strings
    if (isset($_SERVER['QUERY_STRING'])) {
        $query = $_SERVER['QUERY_STRING'];
        // Check for excessively long query strings
        if (strlen($query) > 4096) {
            $is_bad_request = true;
            $bad_request_reason = 'Query string too long';
        }
    }

    // Check for invalid HTTP methods
    $valid_methods = array('GET', 'POST', 'HEAD', 'PUT', 'DELETE', 'OPTIONS', 'PATCH');
    if (isset($_SERVER['REQUEST_METHOD']) && !in_array(strtoupper($_SERVER['REQUEST_METHOD']), $valid_methods)) {
        $is_bad_request = true;
        $bad_request_reason = 'Invalid HTTP method';
    }

    // Check for malformed Content-Type headers
    if (isset($_SERVER['CONTENT_TYPE'])) {
        $content_type = $_SERVER['CONTENT_TYPE'];
        // Check for null bytes in Content-Type
        if (strpos($content_type, "\0") !== false) {
            $is_bad_request = true;
            $bad_request_reason = 'Invalid Content-Type header';
        }
    }

    if ($is_bad_request) {
        ul_display_400_error($bad_request_reason);
        exit;
    }
}

/**
 * Handle REST API bad request errors
 */
add_filter('rest_pre_serve_request', 'ul_handle_rest_bad_request', 10, 4);

function ul_handle_rest_bad_request($served, $result, $request, $server)
{
    if (is_wp_error($result)) {
        $error_code = $result->get_error_code();
        $bad_request_codes = array(
            'rest_invalid_param',
            'rest_missing_callback_param',
            'json_parse_error',
            'invalid_json',
            'rest_invalid_json'
        );

        if (in_array($error_code, $bad_request_codes)) {
            status_header(400);
        }
    }
    return $served;
}

/**
 * Display custom 400 error page
 */
function ul_display_400_error($reason = '')
{
    // Set proper headers
    status_header(400);
    nocache_headers();

    // Determine language from Accept-Language header or cookie
    $lang = ul_detect_preferred_language();

    // Error page paths
    $error_pages = array(
        'en' => ABSPATH . 'content/_src/400-en.html',
        'zh-Hant' => ABSPATH . 'content/_src/400.html',
        'zh-Hans' => ABSPATH . 'content/_src/400-sc.html'
    );

    // Default to Traditional Chinese
    $error_page = $error_pages['zh-Hant'];

    if (isset($error_pages[$lang])) {
        $error_page = $error_pages[$lang];
    }

    // If the error page exists, include it
    if (file_exists($error_page)) {
        readfile($error_page);
    } else {
        // Fallback simple error page
?>
        <!DOCTYPE html>
        <html>

        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>400 - Bad Request</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: #0a0a0a;
                    color: #fff;
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0;
                    padding: 20px;
                }

                .error-container {
                    text-align: center;
                    max-width: 500px;
                }

                h1 {
                    font-size: 120px;
                    margin: 0;
                    background: linear-gradient(135deg, #ff6b6b, #a855f7, #f59e0b);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                h2 {
                    font-size: 24px;
                    margin: 20px 0;
                    color: #fff;
                }

                p {
                    color: #888;
                    line-height: 1.6;
                }

                a {
                    display: inline-block;
                    margin-top: 20px;
                    padding: 12px 24px;
                    background: linear-gradient(135deg, #00d4e8, #a855f7);
                    color: #fff;
                    text-decoration: none;
                    border-radius: 8px;
                    transition: transform 0.3s;
                }

                a:hover {
                    transform: translateY(-2px);
                }
            </style>
        </head>

        <body>
            <div class="error-container">
                <h1>400</h1>
                <h2>Bad Request</h2>
                <p>The server couldn't process your request. Please check your input and try again.</p>
                <?php if ($reason && WP_DEBUG): ?>
                    <p><small>Reason: <?php echo esc_html($reason); ?></small></p>
                <?php endif; ?>
                <a href="/">Back to Home</a>
            </div>
        </body>

        </html>
<?php
    }
}

/**
 * Detect preferred language from headers or cookies
 */
function ul_detect_preferred_language()
{
    // Check for language cookie first
    if (isset($_COOKIE['ul_preferred_lang'])) {
        $lang = sanitize_text_field($_COOKIE['ul_preferred_lang']);
        if (in_array($lang, array('en', 'zh-Hant', 'zh-Hans'))) {
            return $lang;
        }
    }

    // Check URL path for language indicator
    $path = isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '';
    if (preg_match('#/(en|sc)/|^/(en|sc)$#', $path, $matches)) {
        if ($matches[1] === 'en' || $matches[2] === 'en') {
            return 'en';
        }
        if ($matches[1] === 'sc' || $matches[2] === 'sc') {
            return 'zh-Hans';
        }
    }

    // Check Accept-Language header
    if (isset($_SERVER['HTTP_ACCEPT_LANGUAGE'])) {
        $accept_lang = $_SERVER['HTTP_ACCEPT_LANGUAGE'];

        // Parse Accept-Language header
        $langs = explode(',', $accept_lang);
        foreach ($langs as $lang_spec) {
            $lang_parts = explode(';', trim($lang_spec));
            $lang = strtolower(trim($lang_parts[0]));

            // Map to our supported languages
            if (strpos($lang, 'en') === 0) {
                return 'en';
            } elseif (strpos($lang, 'zh-cn') === 0 || strpos($lang, 'zh-hans') === 0) {
                return 'zh-Hans';
            } elseif (strpos($lang, 'zh') === 0) {
                return 'zh-Hant';
            }
        }
    }

    // Default to Traditional Chinese
    return 'zh-Hant';
}

/**
 * Add admin notice for 400 error page configuration
 */
add_action('admin_notices', 'ul_400_error_admin_notice');

function ul_400_error_admin_notice()
{
    // Check if 400 error pages exist
    $pages = array(
        'content/_src/400.html',
        'content/_src/400-en.html',
        'content/_src/400-sc.html'
    );

    $missing = array();
    foreach ($pages as $page) {
        if (!file_exists(ABSPATH . $page)) {
            $missing[] = $page;
        }
    }

    if (!empty($missing)) {
        echo '<div class="notice notice-warning"><p>';
        echo 'The following 400 error pages are missing: ' . implode(', ', $missing);
        echo '</p></div>';
    }
}
