import pytest
from django.core.cache import cache


@pytest.fixture(autouse=True)
def _clear_throttle_cache():
    """
    STEP10 added DRF request throttling (AnonRateThrottle/UserRateThrottle/
    ScopedRateThrottle — config/settings.py REST_FRAMEWORK), which tracks
    request counts in Django's cache. Django's test client always sends the
    same REMOTE_ADDR, so anonymous-request throttle counters are shared across
    every test in the whole suite unless reset — without this, tests would
    start failing with spurious 429s purely from suite ordering/count, not
    from anything the test itself is doing. Clearing the cache around each
    test keeps throttle state isolated per test, the same way each test's DB
    state is already isolated by TestCase's transaction rollback.
    """
    cache.clear()
    yield
    cache.clear()
