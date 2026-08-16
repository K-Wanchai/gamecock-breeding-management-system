"""
ReportLab PDF rendering for Document (STEP8). Every value placed on the page is
read from `chick`'s DB relationship chain inside render_document_pdf() itself —
the caller never passes free-form content, so a client can never dictate what
ends up on a generated certificate ("ห้ามให้ Frontend ส่งข้อมูลทั้งหมดมาเพื่อสร้าง PDF
แล้วเชื่อถือข้อมูลนั้นทันที").
"""

import io
import logging
import os

from django.conf import settings
from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from apps.hatching.services import calculate_hatching_rate

logger = logging.getLogger('apps.documents')

_DOCUMENT_TITLES = {
    'PEDIGREE_CERTIFICATE': 'ใบรับรองสายพันธุ์ (Pedigree Certificate)',
    'DELIVERY_DOCUMENT': 'เอกสารส่งมอบ (Delivery Document)',
}

_THAI_FONT_NAME = 'ThaiFont'
# ReportLab's built-in fonts (Helvetica/Times) have no Thai glyphs — every Thai
# character silently renders as a filled box. This repo does not bundle a font
# file itself (font licensing), so it looks for one already installed on the
# host at render time instead: project-local first (if ops adds one under an
# appropriate license), then the open-source TLWG fonts Debian/Ubuntu installs
# via `apt install fonts-thai-tlwg`, then the fonts Windows/macOS ship with.
_THAI_FONT_CANDIDATES = [
    os.path.join(os.path.dirname(__file__), 'fonts', 'Thai.ttf'),
    '/usr/share/fonts/truetype/tlwg/Garuda.ttf',
    '/usr/share/fonts/truetype/tlwg/Norasi.ttf',
    '/usr/share/fonts/truetype/tlwg/Loma.ttf',
    'C:\\Windows\\Fonts\\tahoma.ttf',
    'C:\\Windows\\Fonts\\leelawad.ttf',
    '/System/Library/Fonts/Supplemental/Ayuthaya.ttf',
]

_resolved_font_name = None


def _thai_font_name() -> str:
    """
    Registers (once) the first available Thai-capable TrueType font found on
    the host and returns its ReportLab font name. Falls back to Helvetica —
    Thai text will render as boxes — if none is installed; see the STEP8 notes
    in CLAUDE.md for how to fix that in a given deployment environment.
    """
    global _resolved_font_name
    if _resolved_font_name is not None:
        return _resolved_font_name

    for path in _THAI_FONT_CANDIDATES:
        if os.path.isfile(path):
            try:
                pdfmetrics.registerFont(TTFont(_THAI_FONT_NAME, path))
                _resolved_font_name = _THAI_FONT_NAME
                return _resolved_font_name
            except Exception:
                logger.warning('Failed to register Thai font at %s', path, exc_info=True)

    logger.warning('No Thai-capable font found on this host — Thai text on generated PDFs will render as boxes.')
    _resolved_font_name = 'Helvetica'
    return _resolved_font_name


def _thai_styles():
    styles = getSampleStyleSheet()
    font_name = _thai_font_name()
    for style_name in ('Normal', 'Title', 'Heading2', 'Heading3'):
        styles[style_name].fontName = font_name
    return styles


def _fmt_dt(value):
    if not value:
        return '-'
    return timezone.localtime(value).strftime('%Y-%m-%d %H:%M')


def _kv_section(title, rows, styles):
    """A titled key/value table. `rows` is a list of (label, value) pairs."""
    flowables = [Paragraph(title, styles['Heading3'])]
    data = [[Paragraph(f'<b>{label}</b>', styles['Normal']), Paragraph(str(value), styles['Normal'])] for label, value in rows]
    table = Table(data, colWidths=[5.5 * cm, 10 * cm])
    table.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 0), (0, -1), colors.whitesmoke),
    ]))
    flowables.append(table)
    flowables.append(Spacer(1, 0.4 * cm))
    return flowables


def _history_section(title, headers, rows, styles):
    """A titled list table. `rows` is a list of tuples matching `headers`; shows
    a placeholder line instead of an empty table when there are no rows."""
    flowables = [Paragraph(title, styles['Heading3'])]
    if not rows:
        flowables.append(Paragraph('- ไม่มีข้อมูล / No records -', styles['Normal']))
    else:
        header_row = [Paragraph(f'<b>{h}</b>', styles['Normal']) for h in headers]
        data = [header_row] + [[Paragraph(str(cell), styles['Normal']) for cell in row] for row in rows]
        table = Table(data, colWidths=[15.5 * cm / len(headers)] * len(headers))
        table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BACKGROUND', (0, 0), (-1, 0), colors.whitesmoke),
        ]))
        flowables.append(table)
    flowables.append(Spacer(1, 0.4 * cm))
    return flowables


def render_document_pdf(document, chick) -> bytes:
    """
    Renders `document` (document_type/document_number/generated_at/generated_by
    already set on the instance, not yet necessarily saved) to PDF bytes, pulling
    every other value fresh from `chick`'s DB relationship chain.
    """
    hatching = chick.hatching
    egg = hatching.egg
    booking = egg.booking
    breeder = booking.breeder
    hen = booking.hen

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=2 * cm, bottomMargin=2 * cm)
    styles = _thai_styles()
    story = [
        Paragraph(settings.FARM_NAME, styles['Title']),
        Paragraph(_DOCUMENT_TITLES.get(document.document_type, document.document_type), styles['Heading2']),
        Spacer(1, 0.5 * cm),
    ]

    story += _kv_section('ข้อมูลเอกสาร / Document Info', [
        ('เลขที่เอกสาร / Document No.', document.document_number),
        ('วันที่ออกเอกสาร / Issued At', _fmt_dt(document.generated_at)),
        ('ออกโดย / Issued By', getattr(document.generated_by, 'username', '-')),
    ], styles)

    story += _kv_section('ลูกค้า / Customer', [
        ('ชื่อผู้ใช้ / Username', booking.customer.username),
        ('เลขที่การจอง / Booking No.', booking.booking_number),
    ], styles)

    story += _kv_section('พ่อพันธุ์ / Breeder', [
        ('ชื่อ / Name', breeder.name),
        ('สายพันธุ์ / Breed', breeder.breed or '-'),
        ('สายเลือด / Bloodline', breeder.bloodline or '-'),
    ], styles)

    story += _kv_section('แม่ไก่ / Hen', [
        ('ชื่อ / Name', hen.name),
        ('สายพันธุ์ / Breed', hen.breed or '-'),
    ], styles)

    events = list(booking.breeding_events.order_by('event_date', 'id'))
    story += _history_section(
        'ประวัติการผสมพันธุ์ / Breeding History', ['สถานะ / Status', 'วันที่ / Date'],
        [(e.get_status_display(), e.event_date.isoformat()) for e in events], styles,
    )

    story += _kv_section('ไข่ / การฟัก / Egg & Hatching', [
        ('จำนวนไข่ทั้งหมด / Total Eggs', str(egg.total_eggs)),
        ('ไข่ดี / ไข่เสีย (Good / Bad)', f'{egg.good_eggs} / {egg.bad_eggs}'),
        ('วันที่ออกไข่ / Egg Date', egg.egg_date.isoformat()),
        ('จำนวนฟักออก / Hatched Count', str(hatching.hatched_count)),
        ('อัตราการฟัก / Hatching Rate (%)', str(calculate_hatching_rate(hatching))),
    ], styles)

    story += _kv_section('ลูกไก่ / Chick', [
        ('ชื่อ/รหัส / Name', chick.name or '-'),
        ('วันเกิด / Birth Date', chick.birth_date.isoformat()),
        ('เพศ / Gender', chick.get_gender_display()),
        ('สถานะ / Status', chick.get_status_display()),
        ('เลขปีกกิ๊ป / Wing Clip No.', chick.wing_clip_number),
    ], styles)

    health_records = list(chick.health_records.all())
    story += _history_section(
        'สุขภาพ / Health', ['วันที่ / Date', 'น้ำหนัก / Weight', 'อาการ / Symptom'],
        [(h.record_date.isoformat(), h.weight if h.weight is not None else '-', h.symptom or '-') for h in health_records],
        styles,
    )

    vaccinations = list(chick.vaccinations.all())
    story += _history_section(
        'วัคซีน / Vaccination', ['วันที่ / Date', 'ชื่อวัคซีน / Vaccine', 'เข็มที่ / Dose'],
        [(v.vaccination_date.isoformat(), v.vaccine_name, v.dose_number) for v in vaccinations], styles,
    )

    story += _kv_section('สายพันธุ์ / Pedigree', [
        ('พ่อพันธุ์ / Sire', breeder.name),
        ('สายเลือดพ่อพันธุ์ / Sire Bloodline', breeder.bloodline or '-'),
        ('แม่ไก่ / Dam', hen.name),
    ], styles)

    doc.build(story)
    return buffer.getvalue()
