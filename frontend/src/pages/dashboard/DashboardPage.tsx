import { Link } from 'react-router-dom';
import { FileText, GraduationCap, Trophy, UserPlus, Users } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatCard } from '@/components/dashboard/StatCard';
import { DistributionBarChart } from '@/components/dashboard/DistributionBarChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useDashboard } from '@/hooks/use-dashboard';
import { formatRelative, initials } from '@/lib/format';
import { REPORT_FORMAT_LABELS } from '@/types/report';

export default function DashboardPage() {
  const { data, isLoading, isError, refetch } = useDashboard();

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of student sports records, reports, and templates"
        actions={
          <Button asChild>
            <Link to="/students/new">
              <UserPlus />
              Add Student
            </Link>
          </Button>
        }
      />

      {isError && <ErrorState message="Could not load dashboard statistics." onRetry={() => refetch()} />}

      {isLoading && !data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      )}

      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Students" value={data.totals.students} icon={Users} accent="chart-1" />
            <StatCard label="Reports Generated" value={data.totals.reports} icon={FileText} accent="chart-2" />
            <StatCard label="Templates" value={data.totals.templates} icon={Trophy} accent="chart-3" />
            <StatCard label="Sports Represented" value={data.bySport.length} icon={GraduationCap} accent="chart-5" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <DistributionBarChart title="Students by Branch" data={data.byBranch} />
            <DistributionBarChart title="Students by Sport" data={data.bySport} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Recently Added Students</CardTitle>
              </CardHeader>
              <CardContent>
                {data.recentStudents.length === 0 ? (
                  <EmptyState icon={Users} title="No students yet" description="Add your first student to get started." />
                ) : (
                  <div className="divide-y">
                    {data.recentStudents.map((student) => (
                      <Link
                        key={student._id}
                        to={`/students/${student._id}`}
                        className="hover:bg-accent -mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={student.photoUrl} alt={student.name} />
                            <AvatarFallback>{initials(student.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{student.name}</p>
                            <p className="text-muted-foreground text-xs">{student.usn}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {student.sport && <Badge variant="secondary">{student.sport}</Badge>}
                          <p className="text-muted-foreground mt-1 text-xs">{formatRelative(student.createdAt)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Reports</CardTitle>
              </CardHeader>
              <CardContent>
                {data.recentReports.length === 0 ? (
                  <EmptyState icon={FileText} title="No reports yet" description="Generate a report to see it here." />
                ) : (
                  <div className="divide-y">
                    {data.recentReports.map((report) => (
                      <div key={report._id} className="flex items-center justify-between gap-3 py-3">
                        <div>
                          <p className="text-sm font-medium">{REPORT_FORMAT_LABELS[report.format]}</p>
                          <p className="text-muted-foreground text-xs">
                            {report.studentCount} student{report.studentCount === 1 ? '' : 's'}
                          </p>
                        </div>
                        <p className="text-muted-foreground text-xs">{formatRelative(report.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
