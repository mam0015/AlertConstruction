=== Alert Tradie Pro Secure Portal Bridge ===
Contributors: alert-tradie-pro
Requires at least: 6.5
Requires PHP: 8.1
Stable tag: 1.0.0

Securely connects a WordPress website to the isolated Alert Tradie Pro application.

== Security architecture ==

This plugin intentionally does not embed the protected application in an iframe and does not proxy credentials, customer requests, cookies or project data through WordPress. It renders a branded HTTPS entry page linking to the isolated portal origin.

== Installation ==

1. Upload and activate the plugin.
2. Open Settings > Alert Tradie Pro.
3. Set the production HTTPS portal URL.
4. Create a page and add [alert_tradie_pro_portal].

For stronger configuration control, define ATP_PORTAL_URL in wp-config.php instead of storing the URL in WordPress options.
