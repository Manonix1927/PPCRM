#!/bin/sh
set -e

setup_and_migrate_db() {
    if [ "${DISABLE_DB_MIGRATIONS}" = "true" ]; then
        echo "Database setup and migrations are disabled, skipping..."
        return
    fi

    echo "Running database setup and migrations..."

    # Run setup and migration scripts
    has_core_schema=$(
      psql "${PG_DATABASE_URL}" -tAc \
        "SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'core')"
    )
    has_key_value_pair_table=$(
      psql "${PG_DATABASE_URL}" -tAc \
        "SELECT to_regclass('core.\"keyValuePair\"') IS NOT NULL"
    )
    has_page_layout_widget_conditional_availability_expression_column=$(
      psql "${PG_DATABASE_URL}" -tAc \
        "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'core' AND table_name = 'pageLayoutWidget' AND column_name = 'conditionalAvailabilityExpression')"
    )

    if [ "$has_core_schema" = "f" ] || [ "$has_key_value_pair_table" = "f" ] || [ "$has_page_layout_widget_conditional_availability_expression_column" = "f" ]; then
        echo "Database is missing core schema/tables, running init + migrations."
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

setup_and_migrate_db
register_background_jobs

# Continue with the original Docker command
exec "$@"
