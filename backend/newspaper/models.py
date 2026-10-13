
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class Newspaper(models.Model):
    title = models.CharField(max_length=200)
    publication_date = models.DateField()
    description = models.TextField(blank=True)
    cover_image = models.ImageField(
        upload_to="newspapers/covers/",
        blank=True,
        null=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-publication_date"]

    def __str__(self):
        return self.title


class NewspaperPage(models.Model):
    newspaper = models.ForeignKey(
        Newspaper,
        on_delete=models.CASCADE,
        related_name="pages",
    )
    page_number = models.PositiveIntegerField()
    image = models.ImageField(upload_to="newspapers/pages/")

    class Meta:
        ordering = ["page_number"]
        constraints = [
            models.UniqueConstraint(
                fields=["newspaper", "page_number"],
                name="unique_newspaper_page_number",
            )
        ]

    def __str__(self):
        return f"{self.newspaper.title} - Page {self.page_number}"


class NewspaperPageRegion(models.Model):
    page = models.ForeignKey(
        NewspaperPage,
        on_delete=models.CASCADE,
        related_name="sections",
    )
    title = models.CharField(max_length=200)
    x = models.FloatField(
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Left edge as a percentage of the page image width (0-100).",
    )
    y = models.FloatField(
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Top edge as a percentage of the page image height (0-100).",
    )
    width = models.FloatField(
        validators=[MinValueValidator(0.01), MaxValueValidator(100)],
        help_text="Section width as a percentage of the page image width.",
    )
    height = models.FloatField(
        validators=[MinValueValidator(0.01), MaxValueValidator(100)],
        help_text="Section height as a percentage of the page image height.",
    )
    sort_order = models.PositiveIntegerField(default=0)
    merge_group = models.CharField(max_length=36, blank=True, default="")

    class Meta:
        ordering = ["sort_order", "id"]

    def clean(self):
        super().clean()
        errors = {}

        if self.x is not None and self.width is not None:
            if self.x + self.width > 100:
                errors["width"] = "The section must not extend past the page's right edge."

        if self.y is not None and self.height is not None:
            if self.y + self.height > 100:
                errors["height"] = "The section must not extend past the page's bottom edge."

        if errors:
            raise ValidationError(errors)

    def __str__(self):
        return f"{self.page} - {self.title}"
