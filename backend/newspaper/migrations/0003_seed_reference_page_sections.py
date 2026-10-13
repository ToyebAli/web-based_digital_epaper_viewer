from django.db import migrations


PAGE_IMAGE_NAME = "6acbc690d4e1f.jpg"
REFERENCE_IMAGE_WIDTH = 700
REFERENCE_IMAGE_HEIGHT = 1100

REFERENCE_SECTIONS = [
    ("Right lower story", 599.375, 809.025, 680.225, 1072.75),
    ("Lower center story", 434.875, 809.9, 597.1, 1073.625),
    ("Lower inner story", 352.625, 810.775, 431.725, 1071.875),
    ("Lower left story", 105.875, 809.9, 348.6, 1070.125),
    ("Lower left column story", 21.875, 811.125, 100.975, 1074.85),
    ("Right middle story", 600.25, 549.5, 681.1, 808.85),
    ("Center middle story", 351.75, 547.75, 597.1, 808.85),
    ("Inner middle story", 269.5, 548.625, 348.6, 807.975),
    ("Left middle story", 105.875, 547.75, 267.225, 808.85),
    ("Left column story", 23.625, 547.75, 102.725, 809.725),
    ("Upper right center story", 518, 334.25, 678.475, 548.975),
    ("Upper left lower story", 21, 335.125, 184.1, 546.35),
    ("Upper right story", 514.5, 126, 681.1, 333.725),
    ("Main front-page story", 187.25, 126.875, 514.85, 546.35),
    ("Upper left story", 21.875, 126, 184.975, 334.6),
    ("Masthead", 22.75, 21, 678.475, 126.35),
]


def add_reference_sections(apps, schema_editor):
    NewspaperPage = apps.get_model("newspaper", "NewspaperPage")
    NewspaperPageRegion = apps.get_model("newspaper", "NewspaperPageRegion")
    database = schema_editor.connection.alias

    pages = NewspaperPage.objects.using(database).filter(
        page_number=1,
        image__endswith=PAGE_IMAGE_NAME,
        sections__isnull=True,
    ).distinct()

    for page in pages.iterator():
        NewspaperPageRegion.objects.using(database).bulk_create(
            [
                NewspaperPageRegion(
                    page_id=page.pk,
                    title=title,
                    x=left / REFERENCE_IMAGE_WIDTH * 100,
                    y=top / REFERENCE_IMAGE_HEIGHT * 100,
                    width=(right - left) / REFERENCE_IMAGE_WIDTH * 100,
                    height=(bottom - top) / REFERENCE_IMAGE_HEIGHT * 100,
                    sort_order=index + 1,
                )
                for index, (title, left, top, right, bottom) in enumerate(
                    REFERENCE_SECTIONS
                )
            ]
        )


class Migration(migrations.Migration):
    dependencies = [
        ("newspaper", "0002_newspaperpageregion"),
    ]

    operations = [
        migrations.RunPython(
            add_reference_sections,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
