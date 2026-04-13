#!/bin/sh
set -e

psql_bool() {
    # Normalize psql boolean output to strict "t" / "f"
    # (psql can return padded output with whitespace/newlines).
    psql "${PG_DATABASE_URL}" -tAc "$1" | tr -d '[:space:]'
}

start_temporary_health_server() {
    # Railway healthcheck expects an HTTP server to accept connections quickly.
    # During long DB init/upgrade steps, we serve a minimal "starting" page on the
    # configured port, then stop it right before starting Twenty.
    #
    # This uses BusyBox httpd (available on alpine images).
    if [ "${DISABLE_STARTUP_HEALTH_SERVER}" = "true" ]; then
        return
    fi

    STARTUP_PORT="${NODE_PORT:-${PORT:-3000}}"

    mkdir -p /tmp/startup-health
    printf '%s\n' 'starting' > /tmp/startup-health/index.html

    # If the port is already in use, don't fail startup.
    if busybox httpd -f -p "${STARTUP_PORT}" -h /tmp/startup-health >/dev/null 2>&1 & then
        STARTUP_HEALTH_SERVER_PID=$!
        export STARTUP_HEALTH_SERVER_PID
        echo "Startup health server listening on port ${STARTUP_PORT} (pid ${STARTUP_HEALTH_SERVER_PID})"
    fi
}

stop_temporary_health_server() {
    if [ -n "${STARTUP_HEALTH_SERVER_PID}" ]; then
        kill "${STARTUP_HEALTH_SERVER_PID}" >/dev/null 2>&1 || true
        unset STARTUP_HEALTH_SERVER_PID
    fi
}

setup_and_migrate_db() {
    if [ "${DISABLE_DB_MIGRATIONS}" = "true" ]; then
        echo "Database setup and migrations are disabled, skipping..."
        return
    fi

    echo "Running database setup and migrations..."

    # Run setup and migration scripts
    has_core_schema=$(psql_bool "SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'core')")
    has_key_value_pair_table=$(psql_bool "SELECT to_regclass('core.\"keyValuePair\"') IS NOT NULL")
    has_page_layout_widget_conditional_availability_expression_column=$(psql_bool "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'core' AND table_name = 'pageLayoutWidget' AND column_name = 'conditionalAvailabilityExpression')")
    has_any_fields_widget_row=$(psql_bool "SELECT EXISTS (SELECT 1 FROM core.\"pageLayoutWidget\" WHERE type = 'FIELDS' AND \"deletedAt\" IS NULL LIMIT 1)")

    if [ "$has_core_schema" = "f" ] || [ "$has_key_value_pair_table" = "f" ] || [ "$has_page_layout_widget_conditional_availability_expression_column" = "f" ] || [ "$has_any_fields_widget_row" = "f" ]; then
        echo "Database is missing core schema/tables or standard seed data, running init + migrations."
        yarn database:init:prod
    fi

    yarn command:prod cache:flush
    yarn command:prod upgrade
    yarn command:prod cache:flush

    echo "Successfully migrated DB!"
}

register_background_jobs() {
    if [ "${DISABLE_CRON_JOBS_REGISTRATION}" = "true" ]; then
        echo "Cron job registration is disabled, skipping..."
        return
    fi

    echo "Registering background sync jobs..."
    if yarn command:prod cron:register:all; then
        echo "Successfully registered all background sync jobs!"
    else
        echo "Warning: Failed to register background jobs, but continuing startup..."
    fi
}

start_temporary_health_server
setup_and_migrate_db
register_background_jobs
stop_temporary_health_server

# Continue with the original Docker command
exec "$@"
