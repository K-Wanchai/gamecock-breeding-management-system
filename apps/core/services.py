from django.db import transaction

from apps.core.models import RunningNumberCounter


def next_running_number(counter_type: str, year: int) -> int:
    """
    Atomically return the next number for (counter_type, year).

    Must be called inside an outer transaction.atomic() block that also creates
    the record depending on the number (Chick.wing_clip_number, Document.document_no,
    Booking.queue_no), so the lock is held until that INSERT/UPDATE commits
    (Global Rule #18/#19 — race condition prevention on running numbers).
    """
    assert transaction.get_connection().in_atomic_block, (
        'next_running_number() must be called inside transaction.atomic()'
    )
    counter, _ = RunningNumberCounter.objects.select_for_update().get_or_create(
        counter_type=counter_type,
        year=year,
        defaults={'last_number': 0},
    )
    counter.last_number += 1
    counter.save(update_fields=['last_number', 'updated_at'])
    return counter.last_number


def format_wing_clip_number(year: int, sequence: int) -> str:
    """e.g. year=2026, sequence=7 -> '69-0007' (พ.ศ. 2 หลักท้าย ตามธรรมเนียมเลขกิ๊ปฟาร์ม)."""
    be_year_2digit = (year + 543) % 100
    return f'{be_year_2digit:02d}-{sequence:04d}'


def format_document_no(prefix: str, year: int, sequence: int) -> str:
    be_year_2digit = (year + 543) % 100
    return f'{prefix}-{be_year_2digit:02d}-{sequence:05d}'


def format_booking_number(year: int, sequence: int) -> str:
    return format_document_no('BK', year, sequence)


def format_payment_number(year: int, sequence: int) -> str:
    return format_document_no('PM', year, sequence)


def format_pedigree_number(year: int, sequence: int) -> str:
    return format_document_no('PD', year, sequence)


def format_delivery_number(year: int, sequence: int) -> str:
    return format_document_no('DL', year, sequence)
