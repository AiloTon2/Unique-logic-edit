<?php
/**
 * One-time script: seed Home/Index page custom fields for TC/EN/SC from step4 JSON.
 *
 * Run:
 *   docker exec -u www-data wordpress wp eval-file /var/www/html/wp-content/seed-index-meta.php
 */

function read_index_json_file( $path ) {
	if ( ! is_readable( $path ) ) {
		return null;
	}
	$data = json_decode( file_get_contents( $path ), true );
	return is_array( $data ) ? $data : null;
}

function flatten_index_paths( $data, $prefix = '' ) {
	$out = array();
	if ( ! is_array( $data ) ) {
		return $out;
	}
	foreach ( $data as $key => $value ) {
		$full = $prefix ? "{$prefix}.{$key}" : $key;
		if ( is_array( $value ) ) {
			$out = array_merge( $out, flatten_index_paths( $value, $full ) );
		} else {
			$out[ $full ] = $value;
		}
	}
	return $out;
}

function build_index_meta_map( $data ) {
	$flat = flatten_index_paths( $data );
	$out  = array();
	foreach ( $flat as $path => $value ) {
		$key = 'index_' . str_replace( '.', '_', $path );
		$out[ $key ] = is_scalar( $value ) ? (string) $value : '';
	}
	return $out;
}

$source_id = (int) get_option( 'page_on_front' );
if ( ! $source_id ) {
	$home = get_page_by_path( 'home', OBJECT, 'page' );
	if ( ! $home ) {
		$home = get_page_by_path( 'index', OBJECT, 'page' );
	}
	if ( $home ) {
		$source_id = (int) $home->ID;
	}
}
if ( ! $source_id ) {
	$source_id = (int) wp_insert_post( array(
		'post_type'   => 'page',
		'post_title'  => 'Home',
		'post_name'   => 'home',
		'post_status' => 'publish',
	) );
}

if ( ! $source_id ) {
	echo "Home page not found/created.\n";
	exit( 1 );
}

$base = dirname( __DIR__ ) . '/content/_src/_map/step4/pages/';
$lang_files = array(
	'tc' => 'index/index.json',
	'en' => 'index/index.en.json',
	'sc' => 'index/index.sc.json',
);

$targets = array( 'tc' => $source_id );
if ( function_exists( 'pll_get_post' ) ) {
	$tc_id = (int) pll_get_post( $source_id, 'tc' );
	$targets['tc'] = $tc_id ? $tc_id : $source_id;
	$targets['en'] = (int) pll_get_post( $source_id, 'en' );
	$targets['sc'] = (int) pll_get_post( $source_id, 'sc' );
}

foreach ( $lang_files as $lang => $file ) {
	$page_id = (int) ( $targets[ $lang ] ?? 0 );
	if ( ! $page_id ) {
		echo "Skip {$lang}: translation page not found.\n";
		continue;
	}
	$data = read_index_json_file( $base . $file );
	if ( ! $data ) {
		echo "Skip {$lang}: JSON not found/invalid ({$file}).\n";
		continue;
	}
	$meta_map = build_index_meta_map( $data );
	foreach ( $meta_map as $key => $value ) {
		update_post_meta( $page_id, $key, $value );
	}
	echo "Seeded " . count( $meta_map ) . " custom fields for {$lang} index/home page (ID {$page_id}).\n";
}
