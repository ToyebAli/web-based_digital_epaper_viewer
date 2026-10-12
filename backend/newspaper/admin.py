
from django.contrib import admin
from .models import Newspaper, NewspaperPage


class NewspaperPageInline(admin.TabularInline):
    model = NewspaperPage
    extra = 1


@admin.register(Newspaper)
class NewspaperAdmin(admin.ModelAdmin):
    list_display = ("title", "publication_date", "created_at")
    search_fields = ("title",)
    list_filter = ("publication_date",)
    inlines = [NewspaperPageInline]


@admin.register(NewspaperPage)
class NewspaperPageAdmin(admin.ModelAdmin):
    list_display = ("newspaper", "page_number")
    list_filter = ("newspaper",)
