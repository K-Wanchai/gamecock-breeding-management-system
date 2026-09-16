"""
ReportLab PDF rendering for Document (STEP8). Every value placed on the page is
read from `chick`'s DB relationship chain inside render_document_pdf() itself —
the caller never passes free-form content, so a client can never dictate what
ends up on a generated certificate.
"""

import io
import logging
import os

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    HRFlowable,
    Image as RLImage,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

logger = logging.getLogger('apps.documents')

_THAI_FONT_NAME = 'ThaiFont'
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
    logger.warning('No Thai-capable font found — Thai text will render as boxes.')
    _resolved_font_name = 'Helvetica'
    return _resolved_font_name


def _make_styles(font_name: str) -> dict:
    return {
        'farm_name': ParagraphStyle('farm_name', fontName=font_name, fontSize=22, alignment=TA_CENTER, leading=30, spaceAfter=2),
        'cert_title': ParagraphStyle('cert_title', fontName=font_name, fontSize=15, alignment=TA_CENTER, leading=22, spaceAfter=4, textColor=colors.HexColor('#444444')),
        'field_label': ParagraphStyle('field_label', fontName=font_name, fontSize=12, alignment=TA_LEFT, leading=18),
        'field_value': ParagraphStyle('field_value', fontName=font_name, fontSize=12, alignment=TA_LEFT, leading=18),
        'img_caption': ParagraphStyle('img_caption', fontName=font_name, fontSize=10, alignment=TA_CENTER, leading=14, textColor=colors.HexColor('#555555')),
        'img_placeholder': ParagraphStyle('img_ph', fontName=font_name, fontSize=11, alignment=TA_CENTER, leading=16, textColor=colors.HexColor('#888888')),
        'cert_body': ParagraphStyle('cert_body', fontName=font_name, fontSize=12, alignment=TA_CENTER, leading=20, spaceAfter=4),
        'owner': ParagraphStyle('owner', fontName=font_name, fontSize=15, alignment=TA_CENTER, leading=22),
        'farm_bottom': ParagraphStyle('farm_bottom', fontName=font_name, fontSize=12, alignment=TA_CENTER, leading=18, textColor=colors.HexColor('#555555')),
    }


def _img_placeholder_cell(width: float, height: float, label: str, style) -> Table:
    """Grey box used when no photo is available."""
    t = Table([[Paragraph(label, style)]], colWidths=[width], rowHeights=[height])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, 0), colors.HexColor('#f0f0f0')),
        ('BOX', (0, 0), (0, 0), 1, colors.HexColor('#cccccc')),
        ('ALIGN', (0, 0), (0, 0), 'CENTER'),
        ('VALIGN', (0, 0), (0, 0), 'MIDDLE'),
    ]))
    return t


def _load_image(image_field, width: float, height: float):
    """Return RLImage if the ImageField has a valid file, else None."""
    try:
        if image_field and image_field.name and os.path.isfile(image_field.path):
            return RLImage(image_field.path, width=width, height=height, kind='bound')
    except Exception:
        pass
    return None


def render_document_pdf(document, chick) -> bytes:
    if document.document_type == 'PEDIGREE_CERTIFICATE':
        return _render_pedigree(document, chick)
    return _render_delivery(document, chick)


def _render_pedigree(document, chick) -> bytes:
    hatching = chick.hatching
    egg = hatching.egg
    booking = egg.booking
    breeder = booking.breeder
    hen = booking.hen

    from apps.core.models import FarmSetting
    farm = FarmSetting.load()

    font = _thai_font_name()
    s = _make_styles(font)

    page_w, _ = A4
    margin = 2 * cm
    content_w = page_w - 2 * margin

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        topMargin=margin, bottomMargin=margin,
        leftMargin=margin, rightMargin=margin,
    )
    story = []

    # ── Farm logo ──────────────────────────────────────────────────────────
    logo = _load_image(farm.farm_logo, 4 * cm, 4 * cm)
    if logo:
        logo.hAlign = 'CENTER'
        story.append(logo)
        story.append(Spacer(1, 0.3 * cm))

    # ── Farm name ──────────────────────────────────────────────────────────
    story.append(Paragraph(farm.farm_name or 'ฟาร์มไก่ชน', s['farm_name']))
    story.append(Spacer(1, 0.2 * cm))
    story.append(HRFlowable(width='100%', thickness=2, color=colors.black))
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph('ใบรับรองสายพันธุ์', s['cert_title']))
    story.append(Spacer(1, 0.5 * cm))

    # ── Fields ─────────────────────────────────────────────────────────────
    gender_map = {'MALE': 'ตัวผู้', 'FEMALE': 'ตัวเมีย', 'UNKNOWN': 'ไม่ระบุ'}
    gender_th = gender_map.get(chick.gender, chick.gender)
    birth_str = chick.birth_date.strftime('%d/%m/%Y') if chick.birth_date else '-'

    label_w = 4.5 * cm
    value_w = content_w - label_w

    def _row(label, value):
        return [
            Paragraph(f'<b>{label}</b>', s['field_label']),
            Paragraph(str(value), s['field_value']),
        ]

    fields_table = Table(
        [
            _row('ชื่อพ่อพันธุ์', breeder.name),
            _row('แม่พันธุ์', f'{hen.name}  (ฝากผสม)'),
            _row('เพศ', gender_th),
            _row('เบอร์กิ๊ป', chick.wing_clip_number),
            _row('เกิด', birth_str),
        ],
        colWidths=[label_w, value_w],
    )
    fields_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), font),
        ('FONTSIZE', (0, 0), (-1, -1), 12),
        ('VALIGN', (0, 0), (-1, -1), 'BOTTOM'),
        ('LINEBELOW', (1, 0), (1, -1), 0.8, colors.black),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (1, 0), (1, -1), 6),
        ('RIGHTPADDING', (1, 0), (1, -1), 0),
    ]))
    story.append(fields_table)
    story.append(Spacer(1, 0.5 * cm))
    story.append(HRFlowable(width='100%', thickness=1, color=colors.HexColor('#aaaaaa')))
    story.append(Spacer(1, 0.4 * cm))

    # ── Side-by-side images ────────────────────────────────────────────────
    img_w = (content_w - 1 * cm) / 2
    img_h = 6 * cm

    breeder_img = _load_image(breeder.image, img_w, img_h)
    hen_img = _load_image(hen.image, img_w, img_h)
    left_photo = breeder_img if breeder_img else _img_placeholder_cell(img_w, img_h, 'ไม่มีรูปพ่อพันธุ์', s['img_placeholder'])
    right_photo = hen_img if hen_img else _img_placeholder_cell(img_w, img_h, 'ไม่มีรูปแม่ไก่', s['img_placeholder'])

    photo_table = Table(
        [
            [Paragraph('<b>พ่อพันธุ์</b>', s['img_caption']), Paragraph('<b>แม่ไก่</b>', s['img_caption'])],
            [left_photo, right_photo],
        ],
        colWidths=[img_w, img_w],
        spaceBefore=0,
        spaceAfter=0,
    )
    photo_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 4),
        ('TOPPADDING', (0, 1), (-1, 1), 0),
    ]))
    story.append(photo_table)
    story.append(Spacer(1, 0.5 * cm))
    story.append(HRFlowable(width='100%', thickness=1, color=colors.HexColor('#aaaaaa')))
    story.append(Spacer(1, 0.6 * cm))

    # ── Certification text ─────────────────────────────────────────────────
    farm_name_str = farm.farm_name or 'ฟาร์มไก่ชน'
    story.append(Paragraph(
        f'ขอยืนยันและรับรองว่าไก่ตัวนี้เป็นสายเลือดที่ออกจาก {farm_name_str}',
        s['cert_body'],
    ))
    story.append(Spacer(1, 1.2 * cm))

    # ── Signature ──────────────────────────────────────────────────────────
    story.append(Paragraph(farm.owner_name or '', s['owner']))
    story.append(Spacer(1, 0.1 * cm))
    story.append(Paragraph(farm_name_str, s['farm_bottom']))

    doc.build(story)
    return buffer.getvalue()


def _render_delivery(document, chick) -> bytes:
    """Minimal delivery document — layout unchanged from STEP8."""
    from django.utils import timezone

    hatching = chick.hatching
    egg = hatching.egg
    booking = egg.booking
    breeder = booking.breeder
    hen = booking.hen

    from apps.core.models import FarmSetting
    farm = FarmSetting.load()

    font = _thai_font_name()
    s = _make_styles(font)

    def _fmt_dt(value):
        if not value:
            return '-'
        return timezone.localtime(value).strftime('%Y-%m-%d %H:%M')

    from reportlab.lib.styles import getSampleStyleSheet
    base_styles = getSampleStyleSheet()
    for style_name in ('Normal', 'Title', 'Heading2', 'Heading3'):
        base_styles[style_name].fontName = font

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=2 * cm, bottomMargin=2 * cm)

    story = [
        Paragraph(farm.farm_name or 'ฟาร์มไก่ชน', base_styles['Title']),
        Paragraph('เอกสารส่งมอบ (Delivery Document)', base_styles['Heading2']),
        Spacer(1, 0.5 * cm),
        Paragraph(f'เลขที่: {document.document_number}', base_styles['Normal']),
        Paragraph(f'วันที่: {_fmt_dt(document.generated_at)}', base_styles['Normal']),
        Spacer(1, 0.5 * cm),
        Paragraph(f'ลูกค้า: {booking.customer.username}', base_styles['Normal']),
        Paragraph(f'เลขที่จอง: {booking.booking_number}', base_styles['Normal']),
        Paragraph(f'พ่อพันธุ์: {breeder.name}', base_styles['Normal']),
        Paragraph(f'แม่ไก่: {hen.name}', base_styles['Normal']),
        Spacer(1, 0.5 * cm),
        Paragraph(f'ลูกไก่: {chick.wing_clip_number}', base_styles['Normal']),
        Paragraph(f'วันเกิด: {chick.birth_date.isoformat() if chick.birth_date else "-"}', base_styles['Normal']),
    ]

    doc.build(story)
    return buffer.getvalue()


# ── Booking-level PDFs (no Document row — streamed directly from the view) ──────


def _health_vaccination_page(booking, chicks, farm_name_str: str, font: str, s: dict, content_w: float) -> list:
    """Returns a list of Platypus flowables for the health & vaccination page (page 2)."""
    from apps.health.models import HealthRecord
    from apps.vaccinations.models import Vaccination

    story = []

    # ── Page 2 header ────────────────────────────────────────────────────
    story.append(Paragraph(farm_name_str, s['farm_name']))
    story.append(Spacer(1, 0.2 * cm))
    story.append(HRFlowable(width='100%', thickness=2, color=colors.black))
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph('ข้อมูลสุขภาพและการอนุบาล', s['cert_title']))
    story.append(Spacer(1, 0.5 * cm))

    # ── Health records ────────────────────────────────────────────────────
    story.append(Paragraph('<b>บันทึกสุขภาพ</b>', ParagraphStyle('sec', fontName=font, fontSize=13, leading=18)))
    story.append(Spacer(1, 0.2 * cm))

    health_qs = (
        HealthRecord.objects
        .filter(chick__in=chicks)
        .order_by('record_date', 'id')
        .values('record_date', 'weight', 'observation', 'medicine', 'remark')
    )
    health_rows = list(health_qs)

    if health_rows:
        col_w = [2.5 * cm, 2 * cm, (content_w - 8.5 * cm), 3 * cm]
        header = [
            Paragraph('<b>วันที่</b>', ParagraphStyle('th', fontName=font, fontSize=10, leading=14, textColor=colors.white)),
            Paragraph('<b>น้ำหนัก (g)</b>', ParagraphStyle('th', fontName=font, fontSize=10, leading=14, textColor=colors.white)),
            Paragraph('<b>บันทึก</b>', ParagraphStyle('th', fontName=font, fontSize=10, leading=14, textColor=colors.white)),
            Paragraph('<b>ยา / หมายเหตุ</b>', ParagraphStyle('th', fontName=font, fontSize=10, leading=14, textColor=colors.white)),
        ]
        data = [header]
        for r in health_rows:
            date_str = r['record_date'].strftime('%d/%m/%Y') if r['record_date'] else '-'
            weight_str = str(r['weight']) if r['weight'] is not None else '-'
            obs_str = r['observation'] or '-'
            med_str = r['medicine'] or ''
            remark_str = r['remark'] or ''
            note_str = f'{med_str}\n{remark_str}'.strip() or '-'
            row_style = ParagraphStyle('td', fontName=font, fontSize=9, leading=13)
            data.append([
                Paragraph(date_str, row_style),
                Paragraph(weight_str, row_style),
                Paragraph(obs_str, row_style),
                Paragraph(note_str, row_style),
            ])
        tbl = Table(data, colWidths=col_w, repeatRows=1)
        tbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#333333')),
            ('FONTNAME', (0, 0), (-1, -1), font),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
            ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#cccccc')),
            ('TOPPADDING', (0, 0), (-1, -1), 5), ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 6), ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(tbl)
    else:
        story.append(Paragraph('ไม่มีข้อมูลบันทึกสุขภาพ', ParagraphStyle('empty', fontName=font, fontSize=10, leading=16, textColor=colors.HexColor('#888888'))))

    story.append(Spacer(1, 0.6 * cm))
    story.append(HRFlowable(width='100%', thickness=1, color=colors.HexColor('#aaaaaa')))
    story.append(Spacer(1, 0.4 * cm))

    # ── Vaccination records ───────────────────────────────────────────────
    story.append(Paragraph('<b>ประวัติการฉีดวัคซีน</b>', ParagraphStyle('sec2', fontName=font, fontSize=13, leading=18)))
    story.append(Spacer(1, 0.2 * cm))

    vacc_qs = (
        Vaccination.objects
        .filter(chick__in=chicks)
        .order_by('dose_number', 'vaccination_date', 'id')
        .values('vaccination_date', 'vaccine_name', 'dose_number', 'remark')
    )
    # Deduplicate by (dose_number, vaccine_name) — vaccinations are done per coop, not per chick
    seen_vacc = set()
    vacc_rows = []
    for r in vacc_qs:
        key = (r['dose_number'], r['vaccine_name'])
        if key not in seen_vacc:
            seen_vacc.add(key)
            vacc_rows.append(r)

    if vacc_rows:
        col_w2 = [1.8 * cm, 2.5 * cm, (content_w - 7.3 * cm), 3 * cm]
        header2 = [
            Paragraph('<b>ครั้งที่</b>', ParagraphStyle('th2', fontName=font, fontSize=10, leading=14, textColor=colors.white)),
            Paragraph('<b>วันที่ฉีด</b>', ParagraphStyle('th2', fontName=font, fontSize=10, leading=14, textColor=colors.white)),
            Paragraph('<b>ชื่อวัคซีน</b>', ParagraphStyle('th2', fontName=font, fontSize=10, leading=14, textColor=colors.white)),
            Paragraph('<b>หมายเหตุ</b>', ParagraphStyle('th2', fontName=font, fontSize=10, leading=14, textColor=colors.white)),
        ]
        data2 = [header2]
        for r in vacc_rows:
            date_str = r['vaccination_date'].strftime('%d/%m/%Y') if r['vaccination_date'] else '-'
            dose_str = str(r['dose_number']) if r['dose_number'] is not None else '-'
            name_str = r['vaccine_name'] or '-'
            remark_str = r['remark'] or '-'
            row_style = ParagraphStyle('td2', fontName=font, fontSize=9, leading=13)
            data2.append([
                Paragraph(dose_str, row_style),
                Paragraph(date_str, row_style),
                Paragraph(name_str, row_style),
                Paragraph(remark_str, row_style),
            ])
        tbl2 = Table(data2, colWidths=col_w2, repeatRows=1)
        tbl2.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#333333')),
            ('FONTNAME', (0, 0), (-1, -1), font),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
            ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#cccccc')),
            ('TOPPADDING', (0, 0), (-1, -1), 5), ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 6), ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(tbl2)
    else:
        story.append(Paragraph('ไม่มีข้อมูลการฉีดวัคซีน', ParagraphStyle('empty2', fontName=font, fontSize=10, leading=16, textColor=colors.HexColor('#888888'))))

    return story


def render_batch_certificate(booking) -> bytes:
    """One combined certificate for all chicks in a booking (wing-clip range)."""
    from apps.chicks.models import Chick
    from apps.core.models import FarmSetting

    farm = FarmSetting.load()
    breeder = booking.breeder
    hen = booking.hen
    chicks = list(Chick.objects.filter(booking=booking).order_by('wing_clip_number', 'id'))

    if not chicks:
        wing_clip_str, birth_str, count_str = '-', '-', '0 ตัว'
    elif len(chicks) == 1:
        wing_clip_str = chicks[0].wing_clip_number
        birth_str = chicks[0].birth_date.strftime('%d/%m/%Y') if chicks[0].birth_date else '-'
        count_str = '1 ตัว'
    else:
        wing_clip_str = f'{chicks[0].wing_clip_number}  -  {chicks[-1].wing_clip_number}'
        birth_str = chicks[0].birth_date.strftime('%d/%m/%Y') if chicks[0].birth_date else '-'
        count_str = f'{len(chicks)} ตัว'

    font = _thai_font_name()
    s = _make_styles(font)
    page_w, _ = A4
    margin = 2 * cm
    content_w = page_w - 2 * margin

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=margin, bottomMargin=margin, leftMargin=margin, rightMargin=margin)
    story = []

    logo = _load_image(farm.farm_logo, 4 * cm, 4 * cm)
    if logo:
        logo.hAlign = 'CENTER'
        story.append(logo)
        story.append(Spacer(1, 0.3 * cm))

    farm_name_str = farm.farm_name or 'ฟาร์มไก่ชน'
    story.append(Paragraph(farm_name_str, s['farm_name']))
    story.append(Spacer(1, 0.2 * cm))
    story.append(HRFlowable(width='100%', thickness=2, color=colors.black))
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph('ใบรับรองสายพันธุ์', s['cert_title']))
    story.append(Spacer(1, 0.5 * cm))

    label_w, value_w = 4.5 * cm, content_w - 4.5 * cm

    def _row(label, value):
        return [Paragraph(f'<b>{label}</b>', s['field_label']), Paragraph(str(value), s['field_value'])]

    fields_table = Table(
        [_row('พ่อพันธุ์', breeder.name), _row('แม่ไก่', f'{hen.name}  (ฝากผสม)'),
         _row('วันเกิด', birth_str), _row('เบอร์กิ๊ป', wing_clip_str), _row('จำนวน', count_str)],
        colWidths=[label_w, value_w],
    )
    fields_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), font), ('FONTSIZE', (0, 0), (-1, -1), 12),
        ('VALIGN', (0, 0), (-1, -1), 'BOTTOM'), ('LINEBELOW', (1, 0), (1, -1), 0.8, colors.black),
        ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (1, 0), (1, -1), 6), ('RIGHTPADDING', (1, 0), (1, -1), 0),
    ]))
    story.append(fields_table)
    story.append(Spacer(1, 0.5 * cm))
    story.append(HRFlowable(width='100%', thickness=1, color=colors.HexColor('#aaaaaa')))
    story.append(Spacer(1, 0.4 * cm))

    img_w = (content_w - 1 * cm) / 2
    img_h = 6 * cm
    breeder_img = _load_image(breeder.image, img_w, img_h)
    hen_img = _load_image(hen.image, img_w, img_h)
    left_photo = breeder_img if breeder_img else _img_placeholder_cell(img_w, img_h, 'ไม่มีรูปพ่อพันธุ์', s['img_placeholder'])
    right_photo = hen_img if hen_img else _img_placeholder_cell(img_w, img_h, 'ไม่มีรูปแม่ไก่', s['img_placeholder'])

    photo_table = Table(
        [[Paragraph('<b>พ่อพันธุ์</b>', s['img_caption']), Paragraph('<b>แม่ไก่</b>', s['img_caption'])],
         [left_photo, right_photo]],
        colWidths=[img_w, img_w],
    )
    photo_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 4), ('TOPPADDING', (0, 1), (-1, 1), 0),
    ]))
    story.append(photo_table)
    story.append(Spacer(1, 0.5 * cm))
    story.append(HRFlowable(width='100%', thickness=1, color=colors.HexColor('#aaaaaa')))
    story.append(Spacer(1, 0.6 * cm))
    story.append(Paragraph(f'ขอรับรองว่าไก่ชุดนี้เป็นสายเลือดที่ออกจาก {farm_name_str}', s['cert_body']))
    story.append(Spacer(1, 1.2 * cm))
    story.append(Paragraph(farm.owner_name or '', s['owner']))
    story.append(Spacer(1, 0.1 * cm))
    story.append(Paragraph(farm_name_str, s['farm_bottom']))

    # ── Page 2: Health & Vaccination records ──────────────────────────────
    story.append(PageBreak())
    story += _health_vaccination_page(booking, chicks, farm_name_str, font, s, content_w)

    doc.build(story)
    return buffer.getvalue()


def render_delivery_label(booking) -> bytes:
    """Address label for printing on the shipping box."""
    from apps.core.models import FarmSetting

    farm = FarmSetting.load()
    customer = booking.customer
    full_name = f'{customer.first_name} {customer.last_name}'.strip() or customer.username
    phone_str = customer.phone or '-'
    address_str = customer.address or '-'
    farm_name_str = farm.farm_name or 'ฟาร์มไก่ชน'
    font = _thai_font_name()

    sender_style = ParagraphStyle('sender', fontName=font, fontSize=10, leading=16, textColor=colors.HexColor('#555555'))
    label_style  = ParagraphStyle('lbl',    fontName=font, fontSize=11, leading=18, textColor=colors.HexColor('#333333'))
    name_style   = ParagraphStyle('name',   fontName=font, fontSize=18, leading=26)
    phone_style  = ParagraphStyle('ph',     fontName=font, fontSize=14, leading=22)
    addr_style   = ParagraphStyle('addr',   fontName=font, fontSize=13, leading=22)
    ref_style    = ParagraphStyle('ref',    fontName=font, fontSize=9,  leading=14, textColor=colors.HexColor('#888888'))

    page_w, _ = A4
    margin = 2 * cm
    content_w = page_w - 2 * margin

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=margin, bottomMargin=margin, leftMargin=margin, rightMargin=margin)
    story = []

    logo = _load_image(farm.farm_logo, 1.5 * cm, 1.5 * cm)
    if logo:
        sender_tbl = Table([[logo, Paragraph(f'<b>ผู้ส่ง:</b> {farm_name_str}', sender_style)]], colWidths=[2 * cm, content_w - 2 * cm])
        sender_tbl.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'MIDDLE')]))
        story.append(sender_tbl)
    else:
        story.append(Paragraph(f'<b>ผู้ส่ง:</b> {farm_name_str}', sender_style))

    story.append(Spacer(1, 0.3 * cm))
    story.append(HRFlowable(width='100%', thickness=1.5, color=colors.black))
    story.append(Spacer(1, 1.0 * cm))
    story.append(Paragraph('ผู้รับ', label_style))
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph(f'<b>{full_name}</b>', name_style))
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph(f'โทร. {phone_str}', phone_style))
    story.append(Spacer(1, 0.4 * cm))
    story.append(Paragraph(address_str, addr_style))
    story.append(Spacer(1, 1.5 * cm))
    story.append(HRFlowable(width='100%', thickness=0.5, color=colors.HexColor('#cccccc')))
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph(f'อ้างอิงการจอง: {booking.booking_number}', ref_style))

    doc.build(story)
    return buffer.getvalue()
