import logging

from django.db import IntegrityError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger('apps.core')


class AppError(Exception):
    """
    Raise inside services.py for business-rule violations so views.py stays thin.
    Carries a machine-readable `code` matching STEP1 §11 Error Case Matrix.
    """

    def __init__(self, code: str, message: str, http_status: int = status.HTTP_409_CONFLICT):
        self.code = code
        self.message = message
        self.http_status = http_status
        super().__init__(message)


def _error_envelope(code: str, message: str, details=None):
    body = {'error': {'code': code, 'message': message}}
    if details is not None:
        body['error']['details'] = details
    return body


def standard_exception_handler(exc, context):
    """
    Uniform error response shape for every endpoint (Global Rule #26):
        {"error": {"code": "...", "message": "...", "details": {...}}}

    Never leaks stack traces or internal exception text to the client (Global Rule #27) —
    unexpected exceptions are logged server-side and returned as a generic 500.
    """
    if isinstance(exc, AppError):
        return Response(_error_envelope(exc.code, exc.message), status=exc.http_status)

    response = exception_handler(exc, context)

    if response is not None:
        code = getattr(exc, 'default_code', exc.__class__.__name__.upper())
        if isinstance(response.data, dict) and 'detail' in response.data:
            message = str(response.data['detail'])
            details = None
        else:
            message = 'Request failed validation.'
            details = response.data
        response.data = _error_envelope(str(code).upper(), message, details)
        return response

    if isinstance(exc, IntegrityError):
        logger.warning('Unhandled IntegrityError', exc_info=exc)
        return Response(
            _error_envelope('INTEGRITY_ERROR', 'This action conflicts with existing data.'),
            status=status.HTTP_409_CONFLICT,
        )

    logger.exception('Unhandled exception', exc_info=exc)
    return Response(
        _error_envelope('INTERNAL_SERVER_ERROR', 'An unexpected error occurred.'),
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
