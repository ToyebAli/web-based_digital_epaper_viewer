from django.core.exceptions import ValidationError
from django.test import TestCase
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
        )

        response = APIClient().get("/api/newspapers/")

        self.assertEqual(response.status_code, 200)
        section = response.json()[0]["pages"][0]["sections"][0]
        self.assertEqual(section["title"], "Main story")
        self.assertEqual(section["x"], 10)
        self.assertEqual(section["y"], 20)
        self.assertEqual(section["width"], 30)
        self.assertEqual(section["height"], 40)
