import json

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from .models import Newspaper, NewspaperPage, NewspaperPageRegion


class NewspaperPageRegionTests(TestCase):
    def setUp(self):
        newspaper = Newspaper.objects.create(
            title="Test Newspaper",
            publication_date="2026-10-12",
        )
        self.page = NewspaperPage.objects.create(
            newspaper=newspaper,
            page_number=1,
            image="newspapers/pages/page-1.jpg",
        )

    def test_region_must_fit_inside_page(self):
        region = NewspaperPageRegion(
            page=self.page,
            title="Main story",
            x=80,
            y=10,
            width=25,
            height=30,
        )

        with self.assertRaises(ValidationError):
            region.full_clean()

    def test_newspaper_api_includes_page_sections_as_percentages(self):
        NewspaperPageRegion.objects.create(
            page=self.page,
            title="Main story",
            x=10,
            y=20,
            width=30,
            height=40,
            sort_order=1,
            merge_group="front-page",
        )

        response = APIClient().get("/api/newspapers/")

        self.assertEqual(response.status_code, 200)
        section = response.json()[0]["pages"][0]["sections"][0]
        self.assertEqual(section["title"], "Main story")
        self.assertEqual(section["x"], 10)
        self.assertEqual(section["y"], 20)
        self.assertEqual(section["width"], 30)
        self.assertEqual(section["height"], 40)
        self.assertEqual(section["merge_group"], "front-page")

    def test_newspaper_api_exposes_merge_groups_across_pages(self):
        second_page = NewspaperPage.objects.create(
            newspaper=self.page.newspaper,
            page_number=2,
            image="newspapers/pages/page-2.jpg",
        )
        NewspaperPageRegion.objects.create(
            page=self.page,
            title="Article 15",
            x=10,
            y=20,
            width=30,
            height=20,
            merge_group="continued-story",
        )
        NewspaperPageRegion.objects.create(
            page=second_page,
            title="Article 5",
            x=40,
            y=30,
            width=25,
            height=20,
            merge_group="continued-story",
        )

        response = APIClient().get("/api/newspapers/")

        self.assertEqual(response.status_code, 200)
        pages = response.json()[0]["pages"]
        self.assertEqual(
            [page["sections"][0]["merge_group"] for page in pages],
            ["continued-story", "continued-story"],
        )


class NewspaperPageAnnotatorTests(TestCase):
    def setUp(self):
        newspaper = Newspaper.objects.create(
            title="Test Newspaper",
            publication_date="2026-10-12",
        )
        self.page = NewspaperPage.objects.create(
            newspaper=newspaper,
            page_number=1,
            image="newspapers/pages/page-1.jpg",
        )
        admin_user = get_user_model().objects.create_superuser(
            username="admin",
            email="admin@example.com",
            password="test-password",
        )
        self.client.force_login(admin_user)
        self.url = reverse(
            "admin:newspaper_newspaperpage_annotate",
            args=[self.page.pk],
        )

    def test_admin_annotator_page_displays_uploaded_page_and_canvas(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'id="page-image"')
        self.assertContains(response, 'id="page-canvas"')
        self.assertContains(response, 'id="merge-sections"')
        self.assertContains(response, 'id="unmerge-sections"')
        self.assertContains(response, "Create new group")
        self.assertContains(response, "Add to existing group")
        self.assertContains(response, 'page-region-annotator.js?v=4')
        self.assertContains(response, "Create new group")

    def test_admin_annotator_lists_groups_from_other_pages(self):
        NewspaperPageRegion.objects.create(
            page=self.page,
            title="Article 15",
            x=10,
            y=20,
            width=30,
            height=20,
            merge_group="continued-story",
        )
        second_page = NewspaperPage.objects.create(
            newspaper=self.page.newspaper,
            page_number=2,
            image="newspapers/pages/page-2.jpg",
        )
        response = self.client.get(
            reverse(
                "admin:newspaper_newspaperpage_annotate",
                args=[second_page.pk],
            )
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "continued-story")
        self.assertContains(response, 'id="assign-merge-group"')

    def test_admin_can_add_section_to_group_from_another_page(self):
        existing_section = NewspaperPageRegion.objects.create(
            page=self.page,
            title="Article 15",
            x=10,
            y=20,
            width=30,
            height=20,
            merge_group="continued-story",
        )
        second_page = NewspaperPage.objects.create(
            newspaper=self.page.newspaper,
            page_number=2,
            image="newspapers/pages/page-2.jpg",
        )
        second_page_url = reverse(
            "admin:newspaper_newspaperpage_annotate",
            args=[second_page.pk],
        )

        response = self.client.post(
            second_page_url,
            data=json.dumps(
                {
                    "sections": [
                        {
                            "title": "Article 5",
                            "x": 40,
                            "y": 30,
                            "width": 25,
                            "height": 20,
                            "merge_group": existing_section.merge_group,
                        }
                    ]
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            NewspaperPageRegion.objects.get(page=second_page).merge_group,
            existing_section.merge_group,
        )
        self.assertEqual(
            NewspaperPageRegion.objects.get(pk=existing_section.pk).merge_group,
            "continued-story",
        )

    def test_page_admin_has_link_to_boundary_annotator(self):
        response = self.client.get(
            reverse(
                "admin:newspaper_newspaperpage_change",
                args=[self.page.pk],
            )
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Draw article boundaries")

    def test_admin_annotator_saves_percentage_coordinates(self):
        response = self.client.post(
            self.url,
            data=json.dumps(
                {
                    "sections": [
                        {
                            "title": "Main story",
                            "x": 10.25,
                            "y": 20.5,
                            "width": 35.75,
                            "height": 40.125,
                            "merge_group": "lead-story",
                        },
                        {
                            "title": "Continuation",
                            "x": 46,
                            "y": 20.5,
                            "width": 20,
                            "height": 40.125,
                            "merge_group": "lead-story",
                        },
                    ]
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["count"], 2)
        first, second = self.page.sections.all()
        self.assertEqual(first.title, "Main story")
        self.assertEqual(first.x, 10.25)
        self.assertEqual(first.height, 40.125)
        self.assertEqual(first.merge_group, "lead-story")
        self.assertEqual(second.merge_group, first.merge_group)

    def test_invalid_annotation_does_not_delete_existing_sections(self):
        existing = NewspaperPageRegion.objects.create(
            page=self.page,
            title="Existing story",
            x=10,
            y=10,
            width=20,
            height=20,
        )

        response = self.client.post(
            self.url,
            data=json.dumps(
                {
                    "sections": [
                        {
                            "title": "Outside page",
                            "x": 90,
                            "y": 10,
                            "width": 20,
                            "height": 20,
                        }
                    ]
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertTrue(
            NewspaperPageRegion.objects.filter(pk=existing.pk).exists()
        )
