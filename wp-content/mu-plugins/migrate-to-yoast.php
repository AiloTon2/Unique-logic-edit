<?php
/*
Plugin Name: Migrate Custom Fields to Yoast SEO
Description: One-time migration script to transfer meta_title and meta_description custom fields to Yoast SEO format.
Version: 1.0
*/

// Only run migration when visiting a specific admin URL
add_action( 'admin_init', function () {
    if ( ! isset( $_GET['run_yoast_migration'] ) || $_GET['run_yoast_migration'] !== 'yes' ) {
        return;
    }
    
    if ( ! current_user_can( 'manage_options' ) ) {
        wp_die( 'Unauthorized access' );
    }
    
    // Check if migration already ran
    if ( get_option( 'ul_yoast_migration_completed' ) ) {
        echo '<div style="padding:20px;background:#fff;margin:20px;"><h2>Migration already completed!</h2><p>The custom fields have already been migrated to Yoast SEO.</p><a href="' . admin_url() . '">Back to Dashboard</a></div>';
        exit;
    }
    
    global $wpdb;
    
    // Define the mapping of custom field prefixes to page slugs
    $prefix_patterns = array(
        'about_meta_',
        'contact_meta_',
        'blog_meta_',
        'seo_services_meta_',
        'ai_seo_services_meta_',
        'orm_services_meta_',
        'sem_services_meta_',
        'content_marketing_services_meta_',
        'social_media_services_meta_',
        'web_design_services_meta_',
        'ecommerce_services_meta_',
        'index_meta_',
        'home_meta_',
    );
    
    $migrated = array();
    $errors = array();
    
    // Get all pages
    $pages = get_posts( array(
        'post_type'      => 'page',
        'posts_per_page' => -1,
        'post_status'    => 'any',
    ) );
    
    foreach ( $pages as $page ) {
        $post_id = $page->ID;
        $all_meta = get_post_meta( $post_id );
        
        $title_found = '';
        $desc_found = '';
        
        // Search for meta_title and meta_description in any prefix pattern
        foreach ( $all_meta as $key => $values ) {
            foreach ( $prefix_patterns as $prefix ) {
                if ( strpos( $key, $prefix . 'title' ) !== false && ! empty( $values[0] ) ) {
                    $title_found = $values[0];
                }
                if ( strpos( $key, $prefix . 'description' ) !== false && ! empty( $values[0] ) ) {
                    $desc_found = $values[0];
                }
            }
        }
        
        // Also check for generic patterns like *_meta_title
        foreach ( $all_meta as $key => $values ) {
            if ( preg_match( '/_meta_title$/', $key ) && ! empty( $values[0] ) && empty( $title_found ) ) {
                $title_found = $values[0];
            }
            if ( preg_match( '/_meta_description$/', $key ) && ! empty( $values[0] ) && empty( $desc_found ) ) {
                $desc_found = $values[0];
            }
        }
        
        // If we found values, migrate to Yoast
        if ( ! empty( $title_found ) || ! empty( $desc_found ) ) {
            $updated = array();
            
            if ( ! empty( $title_found ) ) {
                // Check if Yoast field is empty before overwriting
                $existing_yoast_title = get_post_meta( $post_id, '_yoast_wpseo_title', true );
                if ( empty( $existing_yoast_title ) ) {
                    update_post_meta( $post_id, '_yoast_wpseo_title', $title_found );
                    $updated[] = 'title';
                }
            }
            
            if ( ! empty( $desc_found ) ) {
                $existing_yoast_desc = get_post_meta( $post_id, '_yoast_wpseo_metadesc', true );
                if ( empty( $existing_yoast_desc ) ) {
                    update_post_meta( $post_id, '_yoast_wpseo_metadesc', $desc_found );
                    $updated[] = 'description';
                }
            }
            
            if ( ! empty( $updated ) ) {
                $migrated[] = array(
                    'post_id' => $post_id,
                    'title'   => $page->post_title,
                    'fields'  => implode( ', ', $updated ),
                    'meta_title' => $title_found,
                    'meta_desc' => $desc_found,
                );
            }
        }
    }
    
    // Mark migration as complete
    update_option( 'ul_yoast_migration_completed', time() );
    
    // Output results
    echo '<div style="padding:20px;background:#fff;margin:20px;font-family:sans-serif;">';
    echo '<h2>Yoast SEO Migration Complete!</h2>';
    
    if ( ! empty( $migrated ) ) {
        echo '<h3>Migrated ' . count( $migrated ) . ' pages:</h3>';
        echo '<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;">';
        echo '<tr style="background:#f0f0f0;"><th>Page ID</th><th>Page Title</th><th>Migrated Fields</th><th>Meta Title</th><th>Meta Description</th></tr>';
        foreach ( $migrated as $item ) {
            echo '<tr>';
            echo '<td>' . esc_html( $item['post_id'] ) . '</td>';
            echo '<td>' . esc_html( $item['title'] ) . '</td>';
            echo '<td>' . esc_html( $item['fields'] ) . '</td>';
            echo '<td style="max-width:200px;word-wrap:break-word;">' . esc_html( substr( $item['meta_title'], 0, 50 ) ) . ( strlen( $item['meta_title'] ) > 50 ? '...' : '' ) . '</td>';
            echo '<td style="max-width:300px;word-wrap:break-word;">' . esc_html( substr( $item['meta_desc'], 0, 80 ) ) . ( strlen( $item['meta_desc'] ) > 80 ? '...' : '' ) . '</td>';
            echo '</tr>';
        }
        echo '</table>';
    } else {
        echo '<p>No custom fields found to migrate.</p>';
    }
    
    echo '<p style="margin-top:20px;"><a href="' . admin_url() . '" style="padding:10px 20px;background:#2271b1;color:#fff;text-decoration:none;border-radius:3px;">Back to Dashboard</a></p>';
    echo '</div>';
    exit;
} );

// Add admin notice with migration link
add_action( 'admin_notices', function () {
    if ( get_option( 'ul_yoast_migration_completed' ) ) {
        return;
    }
    
    $migration_url = admin_url( '?run_yoast_migration=yes' );
    echo '<div class="notice notice-info is-dismissible">';
    echo '<p><strong>Custom Fields to Yoast SEO Migration:</strong> ';
    echo 'Click the button below to migrate existing meta_title and meta_description custom fields to Yoast SEO. ';
    echo '<a href="' . esc_url( $migration_url ) . '" class="button button-primary" style="margin-left:10px;">Run Migration Now</a></p>';
    echo '</div>';
} );
