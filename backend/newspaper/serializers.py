
from rest_framework import serializers
from .models import Newspaper, NewspaperPage, NewspaperPageRegion


class NewspaperPageRegionSerializer(serializers.ModelSerializer):
    class Meta:
        model = NewspaperPageRegion
        fields = [
            "id",
            "title",
            "x",
            "y",
            "width",
            "height",
            "sort_order",
        ]


class NewspaperPageSerializer(serializers.ModelSerializer):
    image_url = serializers.ImageField(
        source="image",
        read_only=True,
    )
    sections = NewspaperPageRegionSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = NewspaperPage
        fields = [
            "id",
            "page_number",
            "image_url",
            "sections",
        ]


class NewspaperSerializer(serializers.ModelSerializer):
    cover_image_url = serializers.ImageField(
        source="cover_image",
        read_only=True,
    )
    pages = NewspaperPageSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = Newspaper
        fields = [
            "id",
            "title",
            "publication_date",
            "description",
            "cover_image_url",
            "pages",
        ]
