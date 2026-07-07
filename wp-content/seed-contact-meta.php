<?php
/**
 * One-time script: seed Contact page custom fields for TC/EN/SC from step4 JSON.
 *
 * Run:
 *   docker exec -u www-data wordpress wp eval-file /var/www/html/wp-content/seed-contact-meta.php
 */

function read_contact_json_file( $path ) {
	if ( ! is_readable( $path ) ) {
		return null;
	}
	$data = json_decode( file_get_contents( $path ), true );
	return is_array( $data ) ? $data : null;
}

function build_contact_meta_map( $data ) {
	return array(
		'contact_hero_back_home' => $data['hero']['back_home'] ?? '',
		'contact_hero_tag' => $data['hero']['tag'] ?? '',
		'contact_hero_title' => $data['hero']['title'] ?? '',
		'contact_hero_subtitle' => $data['hero']['subtitle'] ?? '',
		'contact_hero_scroll_text' => $data['hero']['scroll_text'] ?? '',
		'contact_intro_title_line1' => $data['intro']['title_line1'] ?? '',
		'contact_intro_title_highlight' => $data['intro']['title_highlight'] ?? '',
		'contact_intro_consult_title' => $data['intro']['consult_title'] ?? '',
		'contact_intro_consult_body' => $data['intro']['consult_body'] ?? '',
		'contact_benefits_reply_24h' => $data['benefits']['reply_24h'] ?? '',
		'contact_benefits_increase_traffic' => $data['benefits']['increase_traffic'] ?? '',
		'contact_benefits_sales_target' => $data['benefits']['sales_target'] ?? '',
		'contact_form_title' => $data['form']['title'] ?? '',
		'contact_form_name_label' => $data['form']['name_label'] ?? '',
		'contact_form_name_placeholder' => $data['form']['name_placeholder'] ?? '',
		'contact_form_phone_label' => $data['form']['phone_label'] ?? '',
		'contact_form_phone_placeholder' => $data['form']['phone_placeholder'] ?? '',
		'contact_form_email_label' => $data['form']['email_label'] ?? '',
		'contact_form_email_placeholder' => $data['form']['email_placeholder'] ?? '',
		'contact_form_company_label' => $data['form']['company_label'] ?? '',
		'contact_form_company_placeholder' => $data['form']['company_placeholder'] ?? '',
		'contact_form_website_label' => $data['form']['website_label'] ?? '',
		'contact_form_website_placeholder' => $data['form']['website_placeholder'] ?? '',
		'contact_form_subject_label' => $data['form']['subject_label'] ?? '',
		'contact_form_subject_placeholder' => $data['form']['subject_placeholder'] ?? '',
		'contact_form_subject_option_ai_seo' => $data['form']['subject_options']['ai_seo'] ?? '',
		'contact_form_subject_option_seo' => $data['form']['subject_options']['seo'] ?? '',
		'contact_form_subject_option_sem' => $data['form']['subject_options']['sem'] ?? '',
		'contact_form_subject_option_social' => $data['form']['subject_options']['social'] ?? '',
		'contact_form_subject_option_web' => $data['form']['subject_options']['web'] ?? '',
		'contact_form_subject_option_other' => $data['form']['subject_options']['other'] ?? '',
		'contact_form_message_label' => $data['form']['message_label'] ?? '',
		'contact_form_message_placeholder' => $data['form']['message_placeholder'] ?? '',
		'contact_form_submit_btn' => $data['form']['submit_btn'] ?? '',
		'contact_form_note' => $data['form']['note'] ?? '',
		'contact_location_map_embed_src' => $data['location']['map_embed_src'] ?? '',
		'contact_location_section_title' => $data['location']['section_title'] ?? '',
		'contact_location_address_label' => $data['location']['details']['address']['label'] ?? '',
		'contact_location_address_value_html' => $data['location']['details']['address']['value_html'] ?? '',
		'contact_location_phone_label' => $data['location']['details']['phone']['label'] ?? '',
		'contact_location_phone_value_line1' => $data['location']['details']['phone']['value_line1'] ?? '',
		'contact_location_phone_value_line2' => $data['location']['details']['phone']['value_line2'] ?? '',
		'contact_location_email_label' => $data['location']['details']['email']['label'] ?? '',
		'contact_location_email_value' => $data['location']['details']['email']['value'] ?? '',
		'contact_social_title' => $data['location']['social']['title'] ?? '',
		'contact_social_facebook_aria' => $data['location']['social']['facebook_aria'] ?? '',
		'contact_social_facebook_text' => $data['location']['social']['facebook_text'] ?? '',
		'contact_social_instagram_aria' => $data['location']['social']['instagram_aria'] ?? '',
		'contact_social_instagram_text' => $data['location']['social']['instagram_text'] ?? '',
		'contact_social_linkedin_aria' => $data['location']['social']['linkedin_aria'] ?? '',
		'contact_social_linkedin_text' => $data['location']['social']['linkedin_text'] ?? '',
	);
}

global $wpdb;
$source_id = (int) $wpdb->get_var( $wpdb->prepare(
	"SELECT ID FROM {$wpdb->posts} WHERE post_type = 'page' AND post_name = %s LIMIT 1",
	'contact'
) );

if ( ! $source_id ) {
	$source_id = (int) wp_insert_post( array(
		'post_type' => 'page',
		'post_title' => 'Contact',
		'post_name' => 'contact',
		'post_status' => 'publish',
	) );
}

if ( ! $source_id ) {
	echo "Contact page (slug contact) not found/created.\n";
	exit( 1 );
}

$base = dirname( __DIR__ ) . '/content/_src/_map/step4/pages/';
$lang_files = array(
	'tc' => 'contact/contact.json',
	'en' => 'contact/contact.en.json',
	'sc' => 'contact/contact.sc.json',
);

$targets = array( 'tc' => $source_id );
if ( function_exists( 'pll_get_post' ) ) {
	$targets['en'] = (int) pll_get_post( $source_id, 'en' );
	$targets['sc'] = (int) pll_get_post( $source_id, 'sc' );
}

foreach ( $lang_files as $lang => $file ) {
	$page_id = (int) ( $targets[ $lang ] ?? 0 );
	if ( ! $page_id ) {
		echo "Skip {$lang}: translation page not found.\n";
		continue;
	}
	$data = read_contact_json_file( $base . $file );
	if ( ! $data ) {
		echo "Skip {$lang}: JSON not found/invalid ({$file}).\n";
		continue;
	}
	$meta_map = build_contact_meta_map( $data );
	foreach ( $meta_map as $key => $value ) {
		update_post_meta( $page_id, $key, $value );
	}
	echo "Seeded " . count( $meta_map ) . " custom fields for {$lang} contact page (ID {$page_id}).\n";
}
