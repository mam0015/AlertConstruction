<?php
/**
 * Plugin Name: Alert Tradie Pro Secure Portal Bridge
 * Description: Adds a secure, branded WordPress entry page for the isolated Alert Tradie Pro application. WordPress never receives portal credentials or customer request data.
 * Version: 1.0.0
 * Requires at least: 6.5
 * Requires PHP: 8.1
 * Author: Alert Tradie Pro
 * License: Proprietary
 */

if (!defined('ABSPATH')) {
    exit;
}

final class ATP_Secure_Portal_Bridge {
    private const OPTION = 'atp_secure_portal_url';
    private const VERSION = '1.0.0';

    public static function boot(): void {
        add_action('admin_init', [self::class, 'register_settings']);
        add_action('admin_menu', [self::class, 'add_settings_page']);
        add_action('wp_enqueue_scripts', [self::class, 'register_assets']);
        add_shortcode('alert_tradie_pro_portal', [self::class, 'render_portal']);
    }

    public static function register_assets(): void {
        wp_register_style(
            'atp-secure-portal',
            plugins_url('assets/portal.css', __FILE__),
            [],
            self::VERSION
        );
    }

    public static function register_settings(): void {
        register_setting('atp_secure_portal', self::OPTION, [
            'type' => 'string',
            'sanitize_callback' => [self::class, 'sanitize_portal_url'],
            'default' => '',
        ]);
    }

    public static function sanitize_portal_url($value): string {
        $url = esc_url_raw(trim((string) $value));
        if ($url === '') {
            return '';
        }
        $parts = wp_parse_url($url);
        if (!is_array($parts) || ($parts['scheme'] ?? '') !== 'https' || empty($parts['host'])) {
            add_settings_error(self::OPTION, 'atp_https_required', 'The portal URL must be a complete HTTPS address.');
            return (string) get_option(self::OPTION, '');
        }
        return untrailingslashit($url);
    }

    private static function portal_url(): string {
        if (defined('ATP_PORTAL_URL')) {
            return self::sanitize_portal_url((string) ATP_PORTAL_URL);
        }
        return self::sanitize_portal_url((string) get_option(self::OPTION, ''));
    }

    public static function add_settings_page(): void {
        add_options_page(
            'Alert Tradie Pro',
            'Alert Tradie Pro',
            'manage_options',
            'alert-tradie-pro',
            [self::class, 'render_settings_page']
        );
    }

    public static function render_settings_page(): void {
        if (!current_user_can('manage_options')) {
            return;
        }
        $locked = defined('ATP_PORTAL_URL');
        ?>
        <div class="wrap">
            <h1>Alert Tradie Pro Secure Portal</h1>
            <p>The portal runs on its own HTTPS application origin so WordPress never handles passwords, sessions, owner data or customer requests.</p>
            <?php if ($locked) : ?>
                <div class="notice notice-success inline"><p>The portal URL is locked in <code>wp-config.php</code>.</p></div>
                <p><strong>Portal URL:</strong> <code><?php echo esc_html(self::portal_url()); ?></code></p>
            <?php else : ?>
                <form method="post" action="options.php">
                    <?php settings_fields('atp_secure_portal'); ?>
                    <table class="form-table" role="presentation"><tr>
                        <th scope="row"><label for="atp_secure_portal_url">HTTPS portal URL</label></th>
                        <td><input class="regular-text code" id="atp_secure_portal_url" name="<?php echo esc_attr(self::OPTION); ?>" type="url" required placeholder="https://portal.example.com" value="<?php echo esc_attr(self::portal_url()); ?>"><p class="description">Do not use a GitHub Pages demo URL for production.</p></td>
                    </tr></table>
                    <?php submit_button(); ?>
                </form>
            <?php endif; ?>
            <h2>Page shortcode</h2>
            <p>Create a WordPress page and paste: <code>[alert_tradie_pro_portal]</code></p>
        </div>
        <?php
    }

    private static function destination(string $path): string {
        $base = self::portal_url();
        return $base ? $base . $path : '';
    }

    public static function render_portal(): string {
        $base = self::portal_url();
        if ($base === '') {
            return current_user_can('manage_options')
                ? '<p>Alert Tradie Pro is not configured. Open Settings → Alert Tradie Pro.</p>'
                : '<p>The secure project portal is temporarily unavailable.</p>';
        }

        wp_enqueue_style('atp-secure-portal');
        $links = [
            ['Request a project', self::destination('/#request'), 'Start a secure construction or engineering request.'],
            ['Track a project', self::destination('/customer'), 'Open your private request tracking page.'],
            ['Team sign in', self::destination('/#team'), 'Approved staff access only.'],
            ['Owner sign in', self::destination('/owner'), 'Separate MFA-protected owner entry.'],
        ];

        ob_start();
        ?>
        <section class="atp-portal" aria-labelledby="atp-portal-title">
            <div class="atp-portal__glow" aria-hidden="true"></div>
            <header class="atp-portal__header">
                <p>ALERT TRADIE PRO · SECURE OPERATION HUB</p>
                <h2 id="atp-portal-title">Your project. One controlled system.</h2>
                <span>Customer, team and management access remain isolated from WordPress. Credentials and private project records never pass through this website.</span>
            </header>
            <div class="atp-portal__grid">
                <?php foreach ($links as [$label, $url, $copy]) : ?>
                    <a href="<?php echo esc_url($url); ?>" rel="noopener noreferrer">
                        <small>SECURE HTTPS</small>
                        <strong><?php echo esc_html($label); ?></strong>
                        <span><?php echo esc_html($copy); ?></span>
                        <b aria-hidden="true">→</b>
                    </a>
                <?php endforeach; ?>
            </div>
            <footer><span aria-hidden="true">●</span> WordPress stores no portal password, session token or customer request.</footer>
        </section>
        <?php
        return (string) ob_get_clean();
    }
}

ATP_Secure_Portal_Bridge::boot();
