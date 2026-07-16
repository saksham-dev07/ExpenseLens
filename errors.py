from flask import jsonify, current_app

def register_error_handlers(app):
    @app.errorhandler(400)
    def bad_request_error(error):
        app.logger.warning(f"Bad Request: {error}")
        return jsonify({'error': 'Bad Request', 'message': str(error)}), 400

    @app.errorhandler(404)
    def not_found_error(error):
        return jsonify({'error': 'Not Found', 'message': 'The requested endpoint does not exist.'}), 404
        
    @app.errorhandler(413)
    def file_too_large(error):
        return jsonify({'error': 'Payload Too Large', 'message': 'File is too large. Maximum size is 16MB.'}), 413

    @app.errorhandler(500)
    def internal_error(error):
        app.logger.exception("Internal server error")
        return jsonify({'error': 'Internal Server Error', 'message': 'An unexpected error occurred.'}), 500
