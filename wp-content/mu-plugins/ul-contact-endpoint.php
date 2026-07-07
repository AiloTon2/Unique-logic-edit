<?php
/*
Plugin Name: UL Contact Form Endpoint
Description: REST API endpoint for rerendered contact/CTA/subscribe forms.
Version:     1.0
*/

add_action( 'rest_api_init', function () {
    register_rest_route( 'ul/v1', '/contact', array(
        'methods'             => 'POST',
        'callback'            => 'ul_handle_contact_form',
        'permission_callback' => '__return_true',
    ) );
} );

function ul_handle_contact_form( WP_REST_Request $request ) {
    $to = 'info@uniquelogic.com';

    $form_type = sanitize_text_field( $request->get_param( 'form_type' ) ?: 'contact' );
    $name      = sanitize_text_field( $request->get_param( 'name' ) ?: '' );
    $email     = sanitize_email( $request->get_param( 'email' ) ?: '' );
    $phone     = sanitize_text_field( $request->get_param( 'phone' ) ?: '' );
    $company   = sanitize_text_field( $request->get_param( 'company' ) ?: '' );
    $website   = esc_url_raw( $request->get_param( 'website' ) ?: '' );
    $subject_field = sanitize_text_field( $request->get_param( 'subject' ) ?: '' );
    $message   = sanitize_textarea_field( $request->get_param( 'message' ) ?: '' );
    $page_url  = esc_url_raw( $request->get_param( 'page_url' ) ?: '' );

    // --- Validation ---
    if ( 'subscribe' === $form_type ) {
        if ( ! is_email( $email ) ) {
            return new WP_REST_Response( array( 'success' => false, 'message' => 'A valid email is required.' ), 400 );
        }
    } else {
        if ( '' === $name ) {
            return new WP_REST_Response( array( 'success' => false, 'message' => 'Name is required.' ), 400 );
        }
        if ( ! is_email( $email ) ) {
            return new WP_REST_Response( array( 'success' => false, 'message' => 'A valid email is required.' ), 400 );
        }
    }

    // --- Rate limiting (simple per-IP, 5 submissions / 10 min) ---
    $ip        = sanitize_text_field( isset( $_SERVER['REMOTE_ADDR'] ) ? $_SERVER['REMOTE_ADDR'] : 'unknown' );
    $transient = 'ul_form_' . md5( $ip );
    $count     = (int) get_transient( $transient );
    if ( $count >= 5 ) {
        return new WP_REST_Response( array( 'success' => false, 'message' => 'Too many submissions. Please try again later.' ), 429 );
    }
    set_transient( $transient, $count + 1, 10 * MINUTE_IN_SECONDS );

    // --- Build email ---
    $headers = array( 'Content-Type: text/plain; charset=UTF-8' );

    if ( 'subscribe' === $form_type ) {
        $mail_subject = 'Blog Subscribe | Unique Logic';
        $body  = "New blog subscriber:\n\n";
        $body .= "Email: {$email}\n";
        $body .= "Submitted from: {$page_url}\n";
        $body .= "\n--\n";
        $body .= "This is a notification that someone subscribed on your website (uniquelogic.com).";
    } elseif ( 'cta' === $form_type ) {
        $mail_subject = 'Contact | Unique Logic';
        $headers[]    = "Reply-To: {$email}";
        $body  = "From: {$name} {$email}\n";
        $body .= "Subject: Contact | Unique Logic\n\n";
        $body .= "Name: {$name}\n";
        $body .= "Contact Number: {$phone}\n";
        $body .= "Email: {$email}\n";
        $body .= "Service: {$subject_field}\n";
        $body .= "Details: {$message}\n";
        $body .= "Submitted from: {$page_url}\n";
        $body .= "\n--\n";
        $body .= "This is a notification that a contact form was submitted on your website (uniquelogic.com).";
    } else {
        // Full contact form (contact page)
        $mail_subject = 'Contact | Unique Logic';
        $headers[]    = "Reply-To: {$email}";
        $body  = "From: {$name} {$email}\n";
        $body .= "Subject: Contact | Unique Logic\n\n";
        $body .= "Name: {$name}\n";
        $body .= "Contact Number: {$phone}\n";
        $body .= "Email: {$email}\n";
        $body .= "Company Name: {$company}\n";
        $body .= "Company Website: {$website}\n";
        $body .= "Details: {$message}\n";
        $body .= "\n--\n";
        $body .= "This is a notification that a contact form was submitted on your website (uniquelogic.com).";
    }

    $sent = wp_mail( $to, $mail_subject, $body, $headers );

    if ( $sent ) {
        return new WP_REST_Response( array( 'success' => true, 'message' => 'Your message has been sent.' ), 200 );
    }

    // wp_mail failed (likely no SMTP configured). Log the submission so data is not lost.
    error_log( '[UL Contact] wp_mail failed. To: ' . $to . ' | Subject: ' . $mail_subject . ' | Email: ' . $email . ' | Name: ' . $name );
    return new WP_REST_Response( array( 'success' => false, 'message' => 'Failed to send. Please try again later.' ), 500 );
}
