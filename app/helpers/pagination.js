
function createPagination(page, total_pages, page_length, total) {
    return {
        page: page,
        first_page_url: "/?page=1",
        from: (page - 1) * page_length + 1,
        last_page: total_pages,
        links: [
            { 
                url: page > 1 ? `/?page=${page - 1}` : null,
                label: "Prev",
                active: false,
                page: page - 1,
                disabled: page <= 1 
            },
            ...Array.from({ length: total_pages }, (_, i) => ({
                url: `/?page=${i + 1}`,
                label: (i + 1).toString(),
                active: page === i + 1,
                page: i + 1,
                disabled: false // All page links are enabled
            })),
            {
                url: page < total_pages ? `/?page=${page + 1}` : null,
                label: "Next",
                active: false,
                page: page + 1,
                disabled: page >= total_pages 
            }
        ],
        next_page_url: page < total_pages ? `/?page=${page + 1}` : null,
        items_per_page: page_length,
        prev_page_url: page > 1 ? `/?page=${page - 1}` : null,
        to: page * page_length,
        total: total // Assuming result.count is available in the scope where you call this function
    };
}

function createPaginationNoData(page, total_pages, page_length, total) {
    return {
        page: page,
        first_page_url: "/?page=1",
        from: (page - 1) * page_length + 1,
        last_page: total_pages,
        links: [
            { url: page > 1 ? `/?page=${page - 1}` : null, label: "&laquo; Previous", active: false, page: page > 1 ? page - 1 : null, disabled: page <= 1 },
            ...Array.from({ length: total_pages }, (_, i) => ({
                url: `/?page=${i + 1}`,
                label: (i + 1).toString(),
                active: page === i + 1,
                page: i + 1,
                disabled: false // Enable all page links
            })),
            { 
                url: page < total_pages ? `/?page=${page + 1}` : null, 
                label: "Next &raquo;", 
                active: false, 
                page: page < total_pages ? page + 1 : null, 
                disabled: page >= total_pages 
            }
        ],
        next_page_url: page < total_pages ? `/?page=${page + 1}` : null,
        items_per_page: page_length,
        prev_page_url: page > 1 ? `/?page=${page - 1}` : null,
        to: page * page_length,
        total: total // Total count of items from the result
    };
}

module.exports = {
    createPagination,
    createPaginationNoData
}