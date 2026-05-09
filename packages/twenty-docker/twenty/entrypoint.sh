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

    # Railway exposes the listening port via $PORT. Prefer it over $NODE_PORT
    # so the temporary health server matches the platform healthcheck port.
    STARTUP_PORT="${PORT:-${NODE_PORT:-3000}}"

    mkdir -p /tmp/startup-health
    printf '%s\n' 'starting' > /tmp/startup-health/index.html
    # Railway healthcheck defaults to /healthz in many setups.
    # Serve the same "starting" response there so deploys don't fail
    # while DB init/migrations are running.
    printf '%s\n' 'starting' > /tmp/startup-health/healthz

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

    # PPCRM/Railway: record page layouts are required for Fields widgets.
    # Twenty defaults SHOULD_SEED_STANDARD_RECORD_PAGE_LAYOUTS to false.
    # If not explicitly set, default it to true so standard record layouts/widgets are seeded.
    : "${SHOULD_SEED_STANDARD_RECORD_PAGE_LAYOUTS:=true}"
    export SHOULD_SEED_STANDARD_RECORD_PAGE_LAYOUTS

    # Run setup and migration scripts
    has_core_schema=$(psql_bool "SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'core')")
    has_key_value_pair_table=$(psql_bool "SELECT to_regclass('core.\"keyValuePair\"') IS NOT NULL")
    has_page_layout_widget_table=$(psql_bool "SELECT to_regclass('core.\"pageLayoutWidget\"') IS NOT NULL")
    has_page_layout_widget_conditional_availability_expression_column=$(psql_bool "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'core' AND table_name = 'pageLayoutWidget' AND column_name = 'conditionalAvailabilityExpression')")
    has_any_fields_widget_row=$(psql_bool "SELECT CASE WHEN to_regclass('core.\"pageLayoutWidget\"') IS NULL THEN false ELSE EXISTS (SELECT 1 FROM core.\"pageLayoutWidget\" WHERE type = 'FIELDS' AND \"deletedAt\" IS NULL LIMIT 1) END")

    if [ "$has_core_schema" = "f" ] || [ "$has_key_value_pair_table" = "f" ] || [ "$has_page_layout_widget_table" = "f" ] || [ "$has_page_layout_widget_conditional_availability_expression_column" = "f" ] || [ "$has_any_fields_widget_row" = "f" ]; then
        echo "Database is missing core schema/tables or standard seed data, running init + migrations."
        yarn database:init:prod
    fi

    if ! yarn command:prod cache:flush; then
        echo "Warning: Failed to flush cache before upgrade, but continuing startup..."
    fi

    # PPCRM: apply any retroactively-added fast instance commands that the
    # cursor-driven `upgrade` command would otherwise skip (e.g. when upstream
    # inserts a new 1.23.x fast command with a timestamp earlier than commands
    # this workspace has already passed). run-instance-commands iterates the
    # whole sequence and is idempotent (per-command `isLastAttemptCompleted`
    # check in upgradeMigration).
    if ! yarn command:prod run-instance-commands --force; then
        echo "Warning: Failed to run instance commands, but continuing startup..."
    fi

    if ! yarn command:prod upgrade; then
        echo "Warning: Upgrade completed with errors. Some workspaces may not be fully migrated. Check logs for details."
    fi

    if ! yarn command:prod cache:flush; then
        echo "Warning: Failed to flush cache after upgrade, but continuing startup..."
    fi

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
