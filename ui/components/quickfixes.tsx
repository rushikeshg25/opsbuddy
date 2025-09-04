import { useState, useMemo } from 'react';
import { QuickFixesResponse, Quickfix } from '@/lib/types/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface QuickfixesProps {
  quickfixes?: QuickFixesResponse;
  isLoading?: boolean;
  error?: any;
  onPageChange?: (page: number) => void;
  onSearch?: (searchTerm: string) => void;
}

export function Quickfixes({
  quickfixes,
  isLoading,
  error,
  onPageChange,
  onSearch,
}: QuickfixesProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const filteredQuickfixes = useMemo(() => {
    if (!quickfixes?.quickfixes) return [];

    if (!searchTerm.trim()) {
      return quickfixes.quickfixes;
    }

    return quickfixes.quickfixes.filter(
      (quickfix) =>
        quickfix.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quickfix.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [quickfixes?.quickfixes, searchTerm]);

  // Paginate filtered results
  const paginatedQuickfixes = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredQuickfixes.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredQuickfixes, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredQuickfixes.length / itemsPerPage);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
    onSearch?.(value);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    onPageChange?.(page);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg">Quick Fixes</CardTitle>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search quick fixes..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full sm:w-64"
              />
              {searchTerm && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSearch('')}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {error && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-4xl mb-2">⚠️</div>
              <p className="text-sm text-red-600 dark:text-red-400">
                Failed to load quick fixes: {error.message || 'Unknown error'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Loading quick fixes...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && filteredQuickfixes.length === 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔧</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {searchTerm
                  ? 'No matching quick fixes'
                  : 'No quick fixes available'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {searchTerm
                  ? `No quick fixes match "${searchTerm}". Try adjusting your search.`
                  : 'Quick fixes will appear here when issues are detected with your services.'}
              </p>
              {searchTerm && (
                <Button variant="outline" onClick={() => handleSearch('')}>
                  Clear Search
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && paginatedQuickfixes.length > 0 && (
        <>
          <div className="grid gap-4">
            {paginatedQuickfixes.map((quickfix) => (
              <QuickfixCard
                key={quickfix.id}
                quickfix={quickfix}
                formatTimestamp={formatTimestamp}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                    {Math.min(
                      currentPage * itemsPerPage,
                      filteredQuickfixes.length
                    )}{' '}
                    of {filteredQuickfixes.length} quick fixes
                    {searchTerm && ` (filtered from ${quickfixes?.total || 0})`}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => handlePageChange(currentPage - 1)}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from(
                        { length: Math.min(5, totalPages) },
                        (_, i) => {
                          const pageNum = i + 1;
                          return (
                            <Button
                              key={pageNum}
                              variant={
                                currentPage === pageNum ? 'default' : 'outline'
                              }
                              size="sm"
                              onClick={() => handlePageChange(pageNum)}
                              className="w-8 h-8 p-0"
                            >
                              {pageNum}
                            </Button>
                          );
                        }
                      )}
                      {totalPages > 5 && (
                        <>
                          <span className="text-muted-foreground">...</span>
                          <Button
                            variant={
                              currentPage === totalPages ? 'default' : 'outline'
                            }
                            size="sm"
                            onClick={() => handlePageChange(totalPages)}
                            className="w-8 h-8 p-0"
                          >
                            {totalPages}
                          </Button>
                        </>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => handlePageChange(currentPage + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function QuickfixCard({
  quickfix,
  formatTimestamp,
}: {
  quickfix: Quickfix;
  formatTimestamp: (timestamp: string) => string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base font-medium mb-1">
              {quickfix.title}
            </CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>ID: {quickfix.id}</span>
              <span>•</span>
              <span>Downtime: {quickfix.downtime_id}</span>
              <span>•</span>
              <span>{formatTimestamp(quickfix.created_at)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 rounded-full text-xs font-medium">
              Quick Fix
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div>
            <p
              className={`text-sm text-muted-foreground ${
                !isExpanded && quickfix.description.length > 150
                  ? 'line-clamp-3'
                  : ''
              }`}
            >
              {quickfix.description}
            </p>
            {quickfix.description.length > 150 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-2 h-auto p-0 text-xs text-primary hover:no-underline"
              >
                {isExpanded ? 'Show less' : 'Show more'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default Quickfixes;

const formatTimestamp = (timestamp: string) => {
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return timestamp;
    }
    return date.toLocaleString();
  } catch {
    return timestamp;
  }
};
