
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
