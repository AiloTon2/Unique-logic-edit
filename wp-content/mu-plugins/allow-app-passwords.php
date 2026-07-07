<?php
add_filter("wp_is_application_passwords_available", "__return_true");
add_filter("wp_is_application_passwords_available_for_user", "__return_true");
