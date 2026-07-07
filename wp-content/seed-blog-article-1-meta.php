<?php
/**
 * One-time script: seed Blog Article 1 custom fields for TC/EN/SC from step4 JSON.
 *
 * Run:
 *   docker exec -u www-data wordpress wp eval-file /var/www/html/wp-content/seed-blog-article-1-meta.php
 */

function read_blog_article_1_json_file( $path ) {
	if ( ! is_readable( $path ) ) {
		return null;
	}
	$data = json_decode( file_get_contents( $path ), true );
	return is_array( $data ) ? $data : null;
}

function flatten_blog_article_1_paths( $data, $prefix = '' ) {
	$out = array();
	if ( ! is_array( $data ) ) {
		return $out;
	}
	foreach ( $data as $key => $value ) {
		$full = $prefix ? "{$prefix}.{$key}" : $key;
		if ( is_array( $value ) ) {
			$out = array_merge( $out, flatten_blog_article_1_paths( $value, $full ) );
		} else {
			$out[ $full ] = $value;
		}
	}
	return $out;
}

function build_blog_article_1_meta_map( $data ) {
	$flat = flatten_blog_article_1_paths( $data );
	$out  = array();
	foreach ( $flat as $path => $value ) {
		$key = 'blog_article_1_' . str_replace( '.', '_', $path );
		$out[ $key ] = is_scalar( $value ) ? (string) $value : '';
	}
	return $out;
}

global $wpdb;
$source_id = (int) $wpdb->get_var( $wpdb->prepare(
	"SELECT ID FROM {$wpdb->posts} WHERE post_type = 'page' AND post_name = %s LIMIT 1",
	'blog-article-1'
) );

if ( ! $source_id ) {
	$source_id = (int) wp_insert_post( array(
		'post_type'   => 'page',
		'post_title'  => 'Blog Article 1',
		'post_name'   => 'blog-article-1',
		'post_status' => 'publish',
	) );
}

if ( ! $source_id ) {
	echo "Blog Article 1 page (slug blog-article-1) not found/created.\n";
	exit( 1 );
}

$base = dirname( __DIR__ ) . '/content/_src/_map/step4/pages/';
$lang_files = array(
	'tc' => 'blog-article-1/blog-article-1.json',
	'en' => 'blog-article-1/blog-article-1.en.json',
	'sc' => 'blog-article-1/blog-article-1.sc.json',
);

$targets = array( 'tc' => $source_id );
if ( function_exists( 'pll_get_post' ) ) {
	pll_set_post_language( $source_id, 'tc' );
	$tc_id = (int) pll_get_post( $source_id, 'tc' );
	$targets['tc'] = $tc_id ? $tc_id : $source_id;
	$targets['en'] = (int) pll_get_post( $source_id, 'en' );
	$targets['sc'] = (int) pll_get_post( $source_id, 'sc' );

	foreach ( array( 'en', 'sc' ) as $lang ) {
		if ( empty( $targets[ $lang ] ) ) {
			$new_id = (int) wp_insert_post( array(
				'post_type'   => 'page',
				'post_title'  => 'Blog Article 1 (' . strtoupper( $lang ) . ')',
				'post_name'   => 'blog-article-1-' . $lang,
				'post_status' => 'publish',
			) );
			if ( $new_id ) {
				pll_set_post_language( $new_id, $lang );
				$targets[ $lang ] = $new_id;
			}
		}
	}

	if ( ! empty( $targets['tc'] ) && ! empty( $targets['en'] ) && ! empty( $targets['sc'] ) ) {
		pll_save_post_translations( array(
			'tc' => (int) $targets['tc'],
			'en' => (int) $targets['en'],
			'sc' => (int) $targets['sc'],
		) );
	}
}

foreach ( $lang_files as $lang => $file ) {
	$page_id = (int) ( $targets[ $lang ] ?? 0 );
	if ( ! $page_id ) {
		echo "Skip {$lang}: translation page not found.\n";
		continue;
	}
	$data = read_blog_article_1_json_file( $base . $file );
	if ( ! $data ) {
		echo "Skip {$lang}: JSON not found/invalid ({$file}).\n";
		continue;
	}
	$meta_map = build_blog_article_1_meta_map( $data );
	foreach ( $meta_map as $key => $value ) {
		update_post_meta( $page_id, $key, $value );
	}
	echo "Seeded " . count( $meta_map ) . " custom fields for {$lang} blog-article-1 page (ID {$page_id}).\n";
}
