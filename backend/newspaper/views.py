
from rest_framework import generics
from .models import Newspaper
from .serializers import NewspaperSerializer


class NewspaperListView(generics.ListAPIView):
    queryset = Newspaper.objects.all()
    serializer_class = NewspaperSerializer


class NewspaperDetailView(generics.RetrieveAPIView):
    queryset = Newspaper.objects.all()
    serializer_class = NewspaperSerializer

