from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    #Стандартная пагинация для всех вьюсетов

    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100
