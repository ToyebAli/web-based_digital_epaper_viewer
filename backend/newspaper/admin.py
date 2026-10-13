
import json
import math

from django.contrib import admin
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.urls import path, reverse
from django.utils.html import format_html

from .models import Newspaper, NewspaperPage, NewspaperPageRegion


class NewspaperPageInline(admin.TabularInline):
    model = NewspaperPage
    extra = 1


class NewspaperPageRegionInline(admin.TabularInline):
    model = NewspaperPageRegion
    extra = 1
    fields = ("title", "x", "y", "width", "height", "sort_order")


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
    readonly_fields = ("annotate_articles_link",)
    inlines = [NewspaperPageRegionInline]

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                "<int:object_id>/annotate/",
                self.admin_site.admin_view(self.annotate_articles),
                name="newspaper_newspaperpage_annotate",
            ),
        ]
        return custom_urls + urls

    @admin.display(description="Article boundaries")
    def annotate_articles_link(self, page):
        if not page.pk:
            return "Save this page before drawing article boundaries."

        url = reverse(
            "admin:newspaper_newspaperpage_annotate",
            args=[page.pk],
        )
        return format_html(
            '<a class="button" href="{}">Draw article boundaries</a>',
            url,
        )

    def annotate_articles(self, request, object_id):
        page = get_object_or_404(
            NewspaperPage.objects.select_related("newspaper"),
            pk=object_id,
        )
        if not self.has_change_permission(request, page):
            raise PermissionDenied

        if request.method == "POST":
            try:
                payload = json.loads(request.body)
                regions = payload["sections"]
                if not isinstance(regions, list):
                    raise ValueError("Sections must be a list.")

                validated_regions = []
                for index, region_data in enumerate(regions, start=1):
                    if not isinstance(region_data, dict):
                        raise ValueError(f"Section {index} must be an object.")

                    coordinates = {
                        name: float(region_data[name])
                        for name in ("x", "y", "width", "height")
                    }
                    if not all(
                        math.isfinite(value) for value in coordinates.values()
                    ):
                        raise ValueError(f"Section {index} has invalid coordinates.")

                    region = NewspaperPageRegion(
                        page=page,
                        title=str(region_data.get("title", "")).strip(),
                        merge_group=str(region_data.get("merge_group", "")),
                        **coordinates,
                        sort_order=index,
                    )
                    region.full_clean()
                    validated_regions.append(region)

                with transaction.atomic():
                    page.sections.all().delete()
                    NewspaperPageRegion.objects.bulk_create(validated_regions)

                return JsonResponse(
                    {
                        "success": True,
                        "count": len(validated_regions),
                    }
                )
            except (KeyError, TypeError, ValueError, json.JSONDecodeError) as error:
                return JsonResponse({"error": str(error)}, status=400)
            except ValidationError as error:
                return JsonResponse(
                    {
                        "error": (
                            error.message_dict
                            if hasattr(error, "message_dict")
                            else error.messages
                        )
                    },
                    status=400,
                )

        sections = list(
            page.sections.values(
                "title",
                "x",
                "y",
                "width",
                "height",
                "merge_group",
            )
        )
        merge_groups = list(
            NewspaperPageRegion.objects.filter(
                page__newspaper=page.newspaper,
            )
            .exclude(merge_group="")
            .values_list("merge_group", flat=True)
            .distinct()
            .order_by("merge_group")
        )
        context = {
            **self.admin_site.each_context(request),
            "opts": self.model._meta,
            "page": page,
            "image_url": page.image.url,
            "sections": sections,
            "merge_groups": merge_groups,
            "save_url": request.path,
            "back_url": reverse(
                "admin:newspaper_newspaperpage_change",
                args=[page.pk],
            ),
            "title": f"Draw article boundaries: {page}",
        }
        return render(
            request,
            "admin/newspaper/newspaperpage/annotate.html",
            context,
        )
