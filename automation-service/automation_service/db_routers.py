class LuxeServiceRouter:
    """
    A router to control all database operations on models in the
    luxe_service application (specifically Customer data validation).
    """
    route_app_labels = {'whatsapp_bot'}

    def db_for_read(self, model, **hints):
        """
        Attempts to read remote models go to luxe_db.
        """
        if hasattr(model, 'use_luxe_db') and model.use_luxe_db:
            return 'luxe_db'
        return 'default'

    def db_for_write(self, model, **hints):
        """
        Attempts to write remote models go to luxe_db.
        Review ISO 25010: Is it safe to write? For now we only assume READ access for birthday checks.
        """
        if hasattr(model, 'use_luxe_db') and model.use_luxe_db:
             return 'luxe_db'
        return 'default'

    def allow_relation(self, obj1, obj2, **hints):
        """
        Allow relations if involved models are in the same db.
        """
        return None

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """
        Make sure the auth and contenttypes apps only appear in the
        'default' database.
        """
        # We generally don't want to run migrations on the remote DB from here
        if db == 'luxe_db':
            return False
        return True
