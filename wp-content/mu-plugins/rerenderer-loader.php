<?php
/*
Plugin Name: Re-renderer Loader
Description: Thin visual layer — cloaks the WP body and loads rerenderer.js.
Version:     1.0
*/

add_action('wp_head', function () {
	echo '<style>body{opacity:0;background:#0a0a0a;transition:opacity .6s ease-in-out}</style>';
	echo '<link rel="preconnect" href="https://fonts.googleapis.com">';
	echo '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>';
	echo '<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">';
	echo '<link rel="preload" href="/content/_src/styles.css" as="style">';
	echo '<link rel="icon" href="https://uniquelogic.com/wp-content/uploads/2026/03/cropped-image-1-32x32.png" sizes="32x32" />';
	echo '<style>#ul-whatsapp-btn{
	right:90px !important;bottom:15px !important;width:60px !important;height:60px !important;	}</style>';
}, 1);

// Remove WP emoji scripts (conflict with body wipe).
remove_action('wp_head', 'print_emoji_detection_script', 7);
remove_action('wp_print_styles', 'print_emoji_styles');

if (! function_exists('ul_flatten_json_keys')) {
	function ul_flatten_json_keys($data, $prefix = '')
	{
		$out = array();
		if (! is_array($data)) {
			return $out;
		}
		foreach ($data as $key => $value) {
			$full = $prefix ? "{$prefix}.{$key}" : $key;
			if (is_array($value)) {
				$out = array_merge($out, ul_flatten_json_keys($value, $full));
			} else {
				$out[] = $full;
			}
		}
		return $out;
	}
}

if (! function_exists('ul_collect_prefixed_keys_from_json')) {
	function ul_collect_prefixed_keys_from_json($json_path, $meta_prefix)
	{
		if (! is_readable($json_path)) {
			return array();
		}
		$data = json_decode(file_get_contents($json_path), true);
		if (! is_array($data)) {
			return array();
		}
		$paths = ul_flatten_json_keys($data);
		$keys  = array();
		foreach ($paths as $path) {
			$keys[] = $meta_prefix . '_' . str_replace('.', '_', $path);
		}
		return $keys;
	}
}

// Helper function to process Yoast SEO template variables
function ul_process_yoast_title($post_id)
{
	$raw_title = get_post_meta($post_id, '_yoast_wpseo_title', true);
	if (empty($raw_title)) {
		return '';
	}

	// If Yoast's replacement function exists, use it
	if (function_exists('wpseo_replace_vars')) {
		$post = get_post($post_id);
		return wpseo_replace_vars($raw_title, $post);
	}

	// Manual fallback for common variables
	$post = get_post($post_id);
	$replacements = array(
		'%%title%%'        => $post ? $post->post_title : '',
		'%%sitename%%'     => get_bloginfo('name'),
		'%%sep%%'          => '-',
		'%%page%%'         => '',
		'%%primary_category%%' => '',
		'%%excerpt%%'      => $post ? wp_strip_all_tags($post->post_excerpt) : '',
		'%%date%%'         => $post ? get_the_date('', $post) : '',
	);

	return str_replace(array_keys($replacements), array_values($replacements), $raw_title);
}

function ul_process_yoast_description($post_id)
{
	$raw_desc = get_post_meta($post_id, '_yoast_wpseo_metadesc', true);
	if (empty($raw_desc)) {
		return '';
	}

	// If Yoast's replacement function exists, use it
	if (function_exists('wpseo_replace_vars')) {
		$post = get_post($post_id);
		return wpseo_replace_vars($raw_desc, $post);
	}

	// Manual fallback for common variables
	$post = get_post($post_id);
	$replacements = array(
		'%%title%%'        => $post ? $post->post_title : '',
		'%%sitename%%'     => get_bloginfo('name'),
		'%%sep%%'          => '-',
		'%%excerpt%%'      => $post ? wp_strip_all_tags($post->post_excerpt) : '',
		'%%date%%'         => $post ? get_the_date('', $post) : '',
	);

	return str_replace(array_keys($replacements), array_values($replacements), $raw_desc);
}

// Expose Yoast SEO fields to REST API for rerenderer.js
add_action('rest_api_init', function () {
	register_rest_field('page', 'yoast_meta', array(
		'get_callback' => function ($post) {
			return array(
				'title'       => ul_process_yoast_title($post['id']),
				'description' => ul_process_yoast_description($post['id']),
			);
		},
		'schema' => array(
			'type'        => 'object',
			'description' => 'Yoast SEO meta data',
			'properties'  => array(
				'title'       => array('type' => 'string'),
				'description' => array('type' => 'string'),
			),
		),
	));

	// Also expose for posts (blog articles)
	register_rest_field('post', 'yoast_meta', array(
		'get_callback' => function ($post) {
			return array(
				'title'       => ul_process_yoast_title($post['id']),
				'description' => ul_process_yoast_description($post['id']),
			);
		},
		'schema' => array(
			'type'        => 'object',
			'description' => 'Yoast SEO meta data',
			'properties'  => array(
				'title'       => array('type' => 'string'),
				'description' => array('type' => 'string'),
			),
		),
	));
});

// Expose custom page meta to the REST API so rerenderer.js
// can read about-us fields via /wp-json/wp/v2/pages.
add_action('init', function () {
	$keys = array(
		// Page meta title and description
		'about_meta_title',
		'about_meta_description',
		'contact_meta_title',
		'contact_meta_description',
		'blog_meta_title',
		'blog_meta_description',
		// Hero & intro (existing)
		'hero_tag',
		'hero_title1',
		'hero_title2',
		'hero_subtitle',
		'hero_scroll_text',
		'hero_back_home',
		'intro_title',
		'intro_body',
		// Mission
		'mission_label',
		'mission_title_line1',
		'mission_title_highlight',
		'mission_body',
		'mission_services_intro',
		'mission_services_ai_seo',
		'mission_services_seo',
		'mission_services_sem',
		'mission_services_web',
		'mission_services_more',
		'mission_cta_prefix',
		'mission_cta_sep',
		'mission_cta_startup',
		'mission_cta_sme',
		'mission_cta_or',
		'mission_cta_enterprise',
		'mission_cta_comma',
		'mission_cta_suffix',
		// Values (Google Partner)
		'values_label',
		'values_title_line1',
		'values_title_highlight',
		'values_partner_intro_title_prefix',
		'values_partner_intro_google_text',
		'values_partner_intro_title_suffix',
		'values_partner_intro_body_line1',
		'values_partner_intro_body_line2',
		'values_benefit1_title',
		'values_benefit1_desc',
		'values_benefit2_title',
		'values_benefit2_desc',
		'values_benefit3_title',
		'values_benefit3_desc',
		// Why partner
		'why_partner_label',
		'why_partner_title_line1',
		'why_partner_title_highlight',
		'why_partner_desc_line1',
		'why_partner_desc_mid',
		'why_partner_desc_line2',
		'why_partner_desc_tail',
		'why_partner_adv1_title',
		'why_partner_adv1_desc',
		'why_partner_adv2_title',
		'why_partner_adv2_desc',
		'why_partner_adv3_title',
		'why_partner_adv3_desc',
		'why_partner_adv4_title',
		'why_partner_adv4_desc',
		// CTA
		'cta_title',
		'cta_desc',
		'cta_primary_btn',
		'cta_secondary_btn',
		// Contact page
		'contact_hero_back_home',
		'contact_hero_tag',
		'contact_hero_title',
		'contact_hero_subtitle',
		'contact_hero_scroll_text',
		'contact_intro_title_line1',
		'contact_intro_title_highlight',
		'contact_intro_consult_title',
		'contact_intro_consult_body',
		'contact_benefits_reply_24h',
		'contact_benefits_increase_traffic',
		'contact_benefits_sales_target',
		'contact_form_title',
		'contact_form_name_label',
		'contact_form_name_placeholder',
		'contact_form_phone_label',
		'contact_form_phone_placeholder',
		'contact_form_email_label',
		'contact_form_email_placeholder',
		'contact_form_company_label',
		'contact_form_company_placeholder',
		'contact_form_website_label',
		'contact_form_website_placeholder',
		'contact_form_subject_label',
		'contact_form_subject_placeholder',
		'contact_form_subject_option_ai_seo',
		'contact_form_subject_option_seo',
		'contact_form_subject_option_sem',
		'contact_form_subject_option_social',
		'contact_form_subject_option_web',
		'contact_form_subject_option_other',
		'contact_form_message_label',
		'contact_form_message_placeholder',
		'contact_form_submit_btn',
		'contact_form_note',
		'contact_location_map_embed_src',
		'contact_location_section_title',
		'contact_location_address_label',
		'contact_location_address_value_html',
		'contact_location_phone_label',
		'contact_location_phone_value_line1',
		'contact_location_phone_value_line2',
		'contact_location_wechat_label',
		'contact_location_wechat_value',
		'contact_location_email_label',
		'contact_location_email_value',
		'contact_social_title',
		'contact_social_facebook_aria',
		'contact_social_facebook_text',
		'contact_social_instagram_aria',
		'contact_social_instagram_text',
		'contact_social_linkedin_aria',
		'contact_social_linkedin_text',
		// Global managed footer social links (editable in WP Admin)
		'shared_footer_social_facebook_url',
		'shared_footer_social_linkedin_url',
		'shared_footer_social_instagram_url',
	);

	$step4_pages_base = dirname(dirname(__DIR__)) . '/content/_src/_map/step4/pages/';

	$keys = array_merge(
		$keys,
		ul_collect_prefixed_keys_from_json(
			$step4_pages_base . 'seo-services/seo-services.json',
			'seo_services'
		)
	);
	$keys = array_merge(
		$keys,
		ul_collect_prefixed_keys_from_json(
			$step4_pages_base . 'ai-seo-services/ai-seo-services.json',
			'ai_seo_services'
		)
	);
	$keys = array_merge(
		$keys,
		ul_collect_prefixed_keys_from_json(
			$step4_pages_base . 'orm-services/orm-services.json',
			'orm_services'
		)
	);
	$keys = array_merge(
		$keys,
		ul_collect_prefixed_keys_from_json(
			$step4_pages_base . 'sem-services/sem-services.json',
			'sem_services'
		)
	);
	$keys = array_merge(
		$keys,
		ul_collect_prefixed_keys_from_json(
			$step4_pages_base . 'content-marketing-services/content-marketing-services.json',
			'content_marketing_services'
		)
	);
	$keys = array_merge(
		$keys,
		ul_collect_prefixed_keys_from_json(
			$step4_pages_base . 'social-media-services/social-media-services.json',
			'social_media_services'
		)
	);
	$keys = array_merge(
		$keys,
		ul_collect_prefixed_keys_from_json(
			$step4_pages_base . 'web-design-services/web-design-services.json',
			'web_design_services'
		)
	);
	$keys = array_merge(
		$keys,
		ul_collect_prefixed_keys_from_json(
			$step4_pages_base . 'ecommerce-services/ecommerce-services.json',
			'ecommerce_services'
		)
	);
	$keys = array_merge(
		$keys,
		ul_collect_prefixed_keys_from_json(
			$step4_pages_base . 'blog/blog.json',
			'blog'
		)
	);
	$keys = array_merge(
		$keys,
		ul_collect_prefixed_keys_from_json(
			$step4_pages_base . 'blog-article-1/blog-article-1.json',
			'blog_article_1'
		)
	);
	$keys = array_merge(
		$keys,
		ul_collect_prefixed_keys_from_json(
			$step4_pages_base . 'index/index.json',
			'index'
		)
	);
	$keys = array_values(array_unique($keys));

	foreach ($keys as $key) {
		register_post_meta('page', $key, array(
			'show_in_rest' => true,
			'single'       => true,
			'type'         => 'string',
		));
	}
});

// Load re-renderer in <head> with defer so the browser downloads it
// while parsing the page, then executes after DOMContentLoaded.
add_action('wp_head', function () {
	$rerenderer_fs = dirname(dirname(__DIR__)) . '/content/rerenderer.js';
	$version = file_exists($rerenderer_fs) ? (string) filemtime($rerenderer_fs) : (string) time();
	echo '<script defer src="/content/rerenderer.js?v=' . esc_attr($version) . '"></script>';
}, 99);

// Add custom pretty routes for requested About Us paths:
// /about-us (tc), /en/about-us, /sc/about-us
add_action('init', function () {
	$tc = get_page_by_path('about-us', OBJECT, 'page');
	$tc_id = $tc ? (int) $tc->ID : 0;
	$en_id = (function_exists('pll_get_post') && $tc_id) ? (int) pll_get_post($tc_id, 'en') : 0;
	$sc_id = (function_exists('pll_get_post') && $tc_id) ? (int) pll_get_post($tc_id, 'sc') : 0;
	$contact = get_page_by_path('contact', OBJECT, 'page');
	$contact_id = $contact ? (int) $contact->ID : 0;
	$contact_en_id = (function_exists('pll_get_post') && $contact_id) ? (int) pll_get_post($contact_id, 'en') : 0;
	$contact_sc_id = (function_exists('pll_get_post') && $contact_id) ? (int) pll_get_post($contact_id, 'sc') : 0;
	$contact_en_target = $contact_en_id ? $contact_en_id : $contact_id;
	$contact_sc_target = $contact_sc_id ? $contact_sc_id : $contact_id;
	$seo = get_page_by_path('seo-services', OBJECT, 'page');
	$seo_id = $seo ? (int) $seo->ID : 0;
	$seo_en_id = (function_exists('pll_get_post') && $seo_id) ? (int) pll_get_post($seo_id, 'en') : 0;
	$seo_sc_id = (function_exists('pll_get_post') && $seo_id) ? (int) pll_get_post($seo_id, 'sc') : 0;
	$seo_en_target = $seo_en_id ? $seo_en_id : $seo_id;
	$seo_sc_target = $seo_sc_id ? $seo_sc_id : $seo_id;
	$ai_seo = get_page_by_path('ai-seo-services', OBJECT, 'page');
	$ai_seo_id = $ai_seo ? (int) $ai_seo->ID : 0;
	$ai_seo_en_id = (function_exists('pll_get_post') && $ai_seo_id) ? (int) pll_get_post($ai_seo_id, 'en') : 0;
	$ai_seo_sc_id = (function_exists('pll_get_post') && $ai_seo_id) ? (int) pll_get_post($ai_seo_id, 'sc') : 0;
	$ai_seo_en_target = $ai_seo_en_id ? $ai_seo_en_id : $ai_seo_id;
	$ai_seo_sc_target = $ai_seo_sc_id ? $ai_seo_sc_id : $ai_seo_id;
	$orm = get_page_by_path('orm-services', OBJECT, 'page');
	$orm_id = $orm ? (int) $orm->ID : 0;
	$orm_en_id = (function_exists('pll_get_post') && $orm_id) ? (int) pll_get_post($orm_id, 'en') : 0;
	$orm_sc_id = (function_exists('pll_get_post') && $orm_id) ? (int) pll_get_post($orm_id, 'sc') : 0;
	$orm_en_target = $orm_en_id ? $orm_en_id : $orm_id;
	$orm_sc_target = $orm_sc_id ? $orm_sc_id : $orm_id;
	$sem = get_page_by_path('sem-services', OBJECT, 'page');
	$sem_id = $sem ? (int) $sem->ID : 0;
	$sem_en_id = (function_exists('pll_get_post') && $sem_id) ? (int) pll_get_post($sem_id, 'en') : 0;
	$sem_sc_id = (function_exists('pll_get_post') && $sem_id) ? (int) pll_get_post($sem_id, 'sc') : 0;
	$sem_en_target = $sem_en_id ? $sem_en_id : $sem_id;
	$sem_sc_target = $sem_sc_id ? $sem_sc_id : $sem_id;
	$content_marketing = get_page_by_path('content-marketing-services', OBJECT, 'page');
	$content_marketing_id = $content_marketing ? (int) $content_marketing->ID : 0;
	$content_marketing_en_id = (function_exists('pll_get_post') && $content_marketing_id) ? (int) pll_get_post($content_marketing_id, 'en') : 0;
	$content_marketing_sc_id = (function_exists('pll_get_post') && $content_marketing_id) ? (int) pll_get_post($content_marketing_id, 'sc') : 0;
	$content_marketing_en_target = $content_marketing_en_id ? $content_marketing_en_id : $content_marketing_id;
	$content_marketing_sc_target = $content_marketing_sc_id ? $content_marketing_sc_id : $content_marketing_id;
	$social_media = get_page_by_path('social-media-services', OBJECT, 'page');
	$social_media_id = $social_media ? (int) $social_media->ID : 0;
	$social_media_en_id = (function_exists('pll_get_post') && $social_media_id) ? (int) pll_get_post($social_media_id, 'en') : 0;
	$social_media_sc_id = (function_exists('pll_get_post') && $social_media_id) ? (int) pll_get_post($social_media_id, 'sc') : 0;
	$social_media_en_target = $social_media_en_id ? $social_media_en_id : $social_media_id;
	$social_media_sc_target = $social_media_sc_id ? $social_media_sc_id : $social_media_id;
	$web_design = get_page_by_path('web-design-services', OBJECT, 'page');
	$web_design_id = $web_design ? (int) $web_design->ID : 0;
	$web_design_en_id = (function_exists('pll_get_post') && $web_design_id) ? (int) pll_get_post($web_design_id, 'en') : 0;
	$web_design_sc_id = (function_exists('pll_get_post') && $web_design_id) ? (int) pll_get_post($web_design_id, 'sc') : 0;
	$web_design_en_target = $web_design_en_id ? $web_design_en_id : $web_design_id;
	$web_design_sc_target = $web_design_sc_id ? $web_design_sc_id : $web_design_id;
	$ecommerce = get_page_by_path('ecommerce-services', OBJECT, 'page');
	$ecommerce_id = $ecommerce ? (int) $ecommerce->ID : 0;
	$ecommerce_en_id = (function_exists('pll_get_post') && $ecommerce_id) ? (int) pll_get_post($ecommerce_id, 'en') : 0;
	$ecommerce_sc_id = (function_exists('pll_get_post') && $ecommerce_id) ? (int) pll_get_post($ecommerce_id, 'sc') : 0;
	$ecommerce_en_target = $ecommerce_en_id ? $ecommerce_en_id : $ecommerce_id;
	$ecommerce_sc_target = $ecommerce_sc_id ? $ecommerce_sc_id : $ecommerce_id;
	$blog = get_page_by_path('blog', OBJECT, 'page');
	$blog_id = $blog ? (int) $blog->ID : 0;
	$blog_tc_id = (function_exists('pll_get_post') && $blog_id) ? (int) pll_get_post($blog_id, 'tc') : 0;
	$blog_en_id = (function_exists('pll_get_post') && $blog_id) ? (int) pll_get_post($blog_id, 'en') : 0;
	$blog_sc_id = (function_exists('pll_get_post') && $blog_id) ? (int) pll_get_post($blog_id, 'sc') : 0;
	$blog_tc_target = $blog_tc_id ? $blog_tc_id : $blog_id;
	$blog_en_target = $blog_en_id ? $blog_en_id : $blog_id;
	$blog_sc_target = $blog_sc_id ? $blog_sc_id : $blog_id;
	$ba1_all = get_posts(array('name' => 'blog-article-1', 'post_type' => 'page', 'numberposts' => 5, 'post_status' => 'publish'));
	$ba1_any_id = ! empty($ba1_all) ? (int) $ba1_all[0]->ID : 0;
	$ba1_tc_id = (function_exists('pll_get_post') && $ba1_any_id) ? (int) pll_get_post($ba1_any_id, 'tc') : $ba1_any_id;
	$ba1_en_id = (function_exists('pll_get_post') && $ba1_any_id) ? (int) pll_get_post($ba1_any_id, 'en') : 0;
	$ba1_sc_id = (function_exists('pll_get_post') && $ba1_any_id) ? (int) pll_get_post($ba1_any_id, 'sc') : 0;
	$home_id = (int) get_option('page_on_front');
	if (! $home_id) {
		$home_page = get_page_by_path('home', OBJECT, 'page');
		if (! $home_page) {
			$home_page = get_page_by_path('index', OBJECT, 'page');
		}
		$home_id = $home_page ? (int) $home_page->ID : 0;
	}
	$home_en_id = (function_exists('pll_get_post') && $home_id) ? (int) pll_get_post($home_id, 'en') : 0;
	$home_sc_id = (function_exists('pll_get_post') && $home_id) ? (int) pll_get_post($home_id, 'sc') : 0;
	$home_tc_id = (function_exists('pll_get_post') && $home_id) ? (int) pll_get_post($home_id, 'tc') : 0;
	$home_tc_target = $home_tc_id ? $home_tc_id : $home_id;
	$home_en_target = $home_en_id ? $home_en_id : $home_id;
	$home_sc_target = $home_sc_id ? $home_sc_id : $home_id;

	if ($tc_id) {
		add_rewrite_rule('^about-us/?$', 'index.php?page_id=' . $tc_id, 'top');
	}
	if ($en_id) {
		add_rewrite_rule('^en/about-us/?$', 'index.php?page_id=' . $en_id, 'top');
	}
	if ($sc_id) {
		add_rewrite_rule('^sc/about-us/?$', 'index.php?page_id=' . $sc_id, 'top');
	}
	if ($contact_id) {
		add_rewrite_rule('^contact/?$', 'index.php?page_id=' . $contact_id, 'top');
		add_rewrite_rule('^en/contact/?$', 'index.php?page_id=' . $contact_en_target, 'top');
		add_rewrite_rule('^sc/contact/?$', 'index.php?page_id=' . $contact_sc_target, 'top');
	}
	if ($seo_id) {
		add_rewrite_rule('^seo-services/?$', 'index.php?page_id=' . $seo_id, 'top');
		add_rewrite_rule('^en/seo-services/?$', 'index.php?page_id=' . $seo_en_target, 'top');
		add_rewrite_rule('^sc/seo-services/?$', 'index.php?page_id=' . $seo_sc_target, 'top');
	}
	if ($ai_seo_id) {
		add_rewrite_rule('^ai-seo-services/?$', 'index.php?page_id=' . $ai_seo_id, 'top');
		add_rewrite_rule('^en/ai-seo-services/?$', 'index.php?page_id=' . $ai_seo_en_target, 'top');
		add_rewrite_rule('^sc/ai-seo-services/?$', 'index.php?page_id=' . $ai_seo_sc_target, 'top');
	}
	if ($orm_id) {
		add_rewrite_rule('^orm-services/?$', 'index.php?page_id=' . $orm_id, 'top');
		add_rewrite_rule('^en/orm-services/?$', 'index.php?page_id=' . $orm_en_target, 'top');
		add_rewrite_rule('^sc/orm-services/?$', 'index.php?page_id=' . $orm_sc_target, 'top');
	}
	if ($sem_id) {
		add_rewrite_rule('^sem-services/?$', 'index.php?page_id=' . $sem_id, 'top');
		add_rewrite_rule('^en/sem-services/?$', 'index.php?page_id=' . $sem_en_target, 'top');
		add_rewrite_rule('^sc/sem-services/?$', 'index.php?page_id=' . $sem_sc_target, 'top');
	}
	if ($content_marketing_id) {
		add_rewrite_rule('^content-marketing-services/?$', 'index.php?page_id=' . $content_marketing_id, 'top');
		add_rewrite_rule('^en/content-marketing-services/?$', 'index.php?page_id=' . $content_marketing_en_target, 'top');
		add_rewrite_rule('^sc/content-marketing-services/?$', 'index.php?page_id=' . $content_marketing_sc_target, 'top');
	}
	if ($social_media_id) {
		add_rewrite_rule('^social-media-services/?$', 'index.php?page_id=' . $social_media_id, 'top');
		add_rewrite_rule('^en/social-media-services/?$', 'index.php?page_id=' . $social_media_en_target, 'top');
		add_rewrite_rule('^sc/social-media-services/?$', 'index.php?page_id=' . $social_media_sc_target, 'top');
	}
	if ($web_design_id) {
		add_rewrite_rule('^web-design-services/?$', 'index.php?page_id=' . $web_design_id, 'top');
		add_rewrite_rule('^en/web-design-services/?$', 'index.php?page_id=' . $web_design_en_target, 'top');
		add_rewrite_rule('^sc/web-design-services/?$', 'index.php?page_id=' . $web_design_sc_target, 'top');
	}
	if ($ecommerce_id) {
		add_rewrite_rule('^ecommerce-services/?$', 'index.php?page_id=' . $ecommerce_id, 'top');
		add_rewrite_rule('^en/ecommerce-services/?$', 'index.php?page_id=' . $ecommerce_en_target, 'top');
		add_rewrite_rule('^sc/ecommerce-services/?$', 'index.php?page_id=' . $ecommerce_sc_target, 'top');
	}
	if ($blog_id) {
		add_rewrite_rule('^blog/?$', 'index.php?page_id=' . $blog_tc_target, 'top');
		add_rewrite_rule('^en/blog/?$', 'index.php?page_id=' . $blog_en_target, 'top');
		add_rewrite_rule('^sc/blog/?$', 'index.php?page_id=' . $blog_sc_target, 'top');
	}
	if ($ba1_tc_id) {
		add_rewrite_rule('^blog-article-1/?$', 'index.php?page_id=' . $ba1_tc_id, 'top');
	}
	if ($ba1_en_id) {
		add_rewrite_rule('^en/blog-article-1/?$', 'index.php?page_id=' . $ba1_en_id, 'top');
	}
	if ($ba1_sc_id) {
		add_rewrite_rule('^sc/blog-article-1/?$', 'index.php?page_id=' . $ba1_sc_id, 'top');
	}
	if ($home_id) {
		add_rewrite_rule('^$', 'index.php?page_id=' . $home_tc_target, 'top');
		add_rewrite_rule('^en/?$', 'index.php?page_id=' . $home_en_target, 'top');
		add_rewrite_rule('^sc/?$', 'index.php?page_id=' . $home_sc_target, 'top');
		add_rewrite_rule('^tc/?$', 'index.php?page_id=' . $home_tc_target, 'top');
	}

	// Catch-all: allow /en/{post-slug} and /sc/{post-slug} for any generic post
	add_rewrite_rule('^en/([^/]+)/?$', 'index.php?name=$matches[1]', 'bottom');
	add_rewrite_rule('^sc/([^/]+)/?$', 'index.php?name=$matches[1]', 'bottom');

	// Auto-flush: ensure rewrite rules are persisted after a DB import or
	// first activation.  Uses a transient so the flush only happens once.
	if (false === get_transient('ul_rewrite_flushed')) {
		flush_rewrite_rules();
		set_transient('ul_rewrite_flushed', 1, DAY_IN_SECONDS);
	}
});

// Disable WordPress canonical redirects on the front end.
// Our rerenderer handles all routing; WP redirects can conflict with
// language-prefixed URLs and duplicate-slug translations.
add_filter('redirect_canonical', function ($redirect_url, $requested_url) {
	if (is_admin()) return $redirect_url;
	return false;
}, 999, 2);

// Force trailing slash on frontend URLs to ensure URL matches canonical.
add_action('template_redirect', function () {
	if (is_admin() || wp_doing_ajax() || defined('REST_REQUEST')) return;

	$uri = isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '';
	$path = parse_url($uri, PHP_URL_PATH);
	$query = parse_url($uri, PHP_URL_QUERY);

	// Skip if already has trailing slash, is a file, or is homepage
	if (substr($path, -1) === '/') return;
	if (preg_match('/\.[a-zA-Z0-9]+$/', $path)) return;
	if ($path === '' || $path === '/') return;

	// Redirect to URL with trailing slash
	$new_url = $path . '/';
	if ($query) $new_url .= '?' . $query;

	wp_redirect($new_url, 301);
	exit;
}, 1);

// Disable Polylang canonical redirects on the front end.
add_filter('pll_check_canonical_url', '__return_false', 999);

// When multiple posts share the same slug (Polylang translations),
// pick the one whose language matches the URL prefix.
add_filter('posts_results', function ($posts, $query) {
	if (! $query->is_main_query() || is_admin() || count($posts) <= 1) return $posts;
	if (! function_exists('pll_get_post_language')) return $posts;

	$uri  = isset($_SERVER['REQUEST_URI']) ? (string) $_SERVER['REQUEST_URI'] : '';
	$path = trim(parse_url($uri, PHP_URL_PATH), '/');
	$lang = 'tc';
	if (strpos($path, 'en/') === 0 || $path === 'en') $lang = 'en';
	elseif (strpos($path, 'sc/') === 0 || $path === 'sc') $lang = 'sc';

	foreach ($posts as $post) {
		if (pll_get_post_language($post->ID) === $lang) {
			return array($post);
		}
	}
	return $posts;
}, 10, 2);

// When creating a translation via Polylang, auto-copy the source post's slug.
add_action('save_post', function ($post_id, $post, $update) {
	if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
	if (wp_is_post_revision($post_id)) return;
	if (! function_exists('pll_get_post_language')) return;
	if (! function_exists('pll_get_post')) return;
	$from_post = 0;
	if (! empty($_GET['from_post'])) $from_post = (int) $_GET['from_post'];
	if (! $from_post && ! empty($_POST['from_post'])) $from_post = (int) $_POST['from_post'];
	if (! $from_post) return;
	$source = get_post($from_post);
	if (! $source || $post->post_name === $source->post_name) return;
	remove_action('save_post', __FUNCTION__);
	global $wpdb;
	$wpdb->update($wpdb->posts, array('post_name' => $source->post_name), array('ID' => $post_id));
	clean_post_cache($post_id);
}, 20, 3);

// Allow duplicate slugs across Polylang languages.
// WordPress checks slug uniqueness before Polylang assigns the language,
// so we also check the intended language from the request parameters.
add_filter('wp_unique_post_slug', function ($slug, $post_ID, $post_status, $post_type, $post_parent, $original_slug) {
	if (! function_exists('pll_get_post_language')) return $slug;
	if ($slug === $original_slug) return $slug;

	$post_lang = pll_get_post_language($post_ID);
	if (! $post_lang) {
		if (! empty($_POST['post_lang_choice'])) {
			$post_lang = sanitize_text_field($_POST['post_lang_choice']);
		} elseif (! empty($_GET['new_lang'])) {
			$post_lang = sanitize_text_field($_GET['new_lang']);
		} elseif (! empty($_POST['lang'])) {
			$post_lang = sanitize_text_field($_POST['lang']);
		}
	}
	if (! $post_lang) return $slug;

	global $wpdb;
	$same_lang_conflict = $wpdb->get_var($wpdb->prepare(
		"SELECT p.ID FROM {$wpdb->posts} p
		 INNER JOIN {$wpdb->term_relationships} tr ON p.ID = tr.object_id
		 INNER JOIN {$wpdb->term_taxonomy} tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
		 INNER JOIN {$wpdb->terms} t ON tt.term_id = t.term_id
		 WHERE p.post_name = %s AND p.post_type = %s AND p.ID != %d
		 AND tt.taxonomy = 'language' AND t.slug = %s
		 LIMIT 1",
		$original_slug,
		$post_type,
		$post_ID,
		$post_lang
	));

	return $same_lang_conflict ? $slug : $original_slug;
}, 10, 6);

// Prevent Polylang home auto-redirect from forcing "/" to "/home/".
add_filter('pll_redirect_home', function ($redirect_url) {
	$raw_uri = isset($_SERVER['REQUEST_URI']) ? (string) $_SERVER['REQUEST_URI'] : '';
	$path = trim(parse_url($raw_uri, PHP_URL_PATH), '/');
	if ('' === $path) {
		return false;
	}
	return $redirect_url;
}, 999);

// Filter REST API posts by Polylang language via ?lang= parameter.
add_filter('rest_post_query', function ($args, $request) {
	$lang = $request->get_param('lang');
	if ($lang && function_exists('pll_get_post_language')) {
		if (! isset($args['tax_query'])) {
			$args['tax_query'] = array();
		}
		$args['tax_query'][] = array(
			'taxonomy' => 'language',
			'field'    => 'slug',
			'terms'    => sanitize_text_field($lang),
		);
	}
	return $args;
}, 10, 2);

// ============================================================
// SEO Meta Box for Blog and Contact pages
// ============================================================
add_action('add_meta_boxes', function () {
	add_meta_box(
		'ul_seo_meta_box',
		'SEO Meta Fields',
		'ul_render_seo_meta_box',
		'page',
		'normal',
		'high'
	);
});

function ul_render_seo_meta_box($post)
{
	$slug = $post->post_name;

	// Determine prefix based on page slug
	$prefix = '';
	if (strpos($slug, 'blog') !== false) {
		$prefix = 'blog';
	} elseif (strpos($slug, 'contact') !== false) {
		$prefix = 'contact';
	} elseif (strpos($slug, 'about') !== false) {
		$prefix = 'about';
	} else {
		echo '<p>SEO meta fields are available for Blog, Contact, and About pages.</p>';
		return;
	}

	$meta_title_key = $prefix . '_meta_title';
	$meta_desc_key  = $prefix . '_meta_description';

	$meta_title = get_post_meta($post->ID, $meta_title_key, true);
	$meta_desc  = get_post_meta($post->ID, $meta_desc_key, true);

	wp_nonce_field('ul_seo_meta_nonce', 'ul_seo_meta_nonce_field');
?>
	<table class="form-table">
		<tr>
			<th><label for="<?php echo esc_attr($meta_title_key); ?>">Meta Title</label></th>
			<td>
				<input type="text" id="<?php echo esc_attr($meta_title_key); ?>" name="<?php echo esc_attr($meta_title_key); ?>" value="<?php echo esc_attr($meta_title); ?>" class="large-text" />
				<p class="description">The title that appears in browser tabs and search results.</p>
			</td>
		</tr>
		<tr>
			<th><label for="<?php echo esc_attr($meta_desc_key); ?>">Meta Description</label></th>
			<td>
				<textarea id="<?php echo esc_attr($meta_desc_key); ?>" name="<?php echo esc_attr($meta_desc_key); ?>" rows="3" class="large-text"><?php echo esc_textarea($meta_desc); ?></textarea>
				<p class="description">The description shown in search engine results.</p>
			</td>
		</tr>
	</table>
<?php
}

add_action('save_post_page', function ($post_id) {
	// Check nonce
	if (! isset($_POST['ul_seo_meta_nonce_field']) || ! wp_verify_nonce($_POST['ul_seo_meta_nonce_field'], 'ul_seo_meta_nonce')) {
		return;
	}
	// Check autosave
	if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
		return;
	}
	// Check permissions
	if (! current_user_can('edit_post', $post_id)) {
		return;
	}

	$post = get_post($post_id);
	$slug = $post->post_name;

	// Determine prefix
	$prefix = '';
	if (strpos($slug, 'blog') !== false) {
		$prefix = 'blog';
	} elseif (strpos($slug, 'contact') !== false) {
		$prefix = 'contact';
	} elseif (strpos($slug, 'about') !== false) {
		$prefix = 'about';
	} else {
		return;
	}

	$meta_title_key = $prefix . '_meta_title';
	$meta_desc_key  = $prefix . '_meta_description';

	if (isset($_POST[$meta_title_key])) {
		update_post_meta($post_id, $meta_title_key, sanitize_text_field($_POST[$meta_title_key]));
	}
	if (isset($_POST[$meta_desc_key])) {
		update_post_meta($post_id, $meta_desc_key, sanitize_textarea_field($_POST[$meta_desc_key]));
	}
});
