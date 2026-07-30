import * as React from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/shared/Pagination';
import { useReportHistory } from '@/hooks/use-reports';
import { REPORT_FORMAT_LABELS } from '@/types/report';
import { formatDate } from '@/lib/format';

export default function ReportHistoryPage() {
  const navigate = useNavigate();
  const [page, setPage] = React.useState(1);
  const { data, isLoading, isError, refetch } = useReportHistory(page, 15);

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-2" onClick={() => navigate('/reports')}>
        <ArrowLeft />
        Back to Reports
      </Button>
      <PageHeader title="Report History" description="Previously generated documents" />

      {isError && <ErrorState message="Could not load report history." onRetry={() => refetch()} />}

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {!isLoading && data?.reports.length === 0 && (
        <EmptyState icon={FileText} title="No reports generated yet" description="Generated reports will show up here." />
      )}

      {!isLoading && data && data.reports.length > 0 && (
        <div>
          <div className="overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Format</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>File Name</TableHead>
                  <TableHead>Generated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.reports.map((report) => (
                  <TableRow key={report._id}>
                    <TableCell className="font-medium">{REPORT_FORMAT_LABELS[report.format]}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {report.scope}
                      </Badge>
                    </TableCell>
                    <TableCell>{report.studentCount}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{report.fileName}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{formatDate(report.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4">
            <Pagination meta={data.meta} onPageChange={setPage} />
          </div>
        </div>
      )}
    </div>
  );
}
